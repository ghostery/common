/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { truncatedHash } from '../core/helpers/md5';
import logger from './logger';
import random from '../core/crypto/random';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Takes an object and returns a sorted representation. Specially,
 * it ensures that the ordering of object keys does not matter.
 *
 * { foo: 42, bar: 'baz' } <=> { bar: 'baz', foo: 42 }
 */
function objectToOrderedArray(x) {
  if (x === null || x === undefined) {
    // both are missing values in our context and therefore equal
    return null;
  }
  if (typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean') {
    return x;
  }
  if (Array.isArray(x)) {
    return x.map(objectToOrderedArray);
  }
  if (typeof x === 'object') {
    // With this simple implementation, these two objects will be mapped to
    // the same representation: { foo: 42 } and [["foo", 42]]
    //
    // For our purpose that is OK:
    // 1) the collision detection will accept false-positive, since later
    //    the value will be hashed (to introduce collisions!)
    // 2) the structure of objects with the same action should be the same;
    //    in other words, the example here should not happen
    return Object.keys(x).sort().map(key => [key, objectToOrderedArray(x[key])]);
  }
  throw new Error('Internal error: input contains unexpected types');
}

function extractPath(obj, path, pos = 0) {
  const nextKey = path[pos];
  if (nextKey === '[]') {
    if (Array.isArray(obj)) {
      const results = obj.map(x => extractPath(x, path, pos + 1)).filter(x => x.match);
      if (results.length > 0) {
        return { match: true, value: results };
      }
    }
    return { match: false };
  }

  if (!Object.prototype.hasOwnProperty.call(obj, nextKey)) {
    return { match: false };
  }

  const elem = obj[nextKey];
  if (pos === path.length - 1) {
    return { match: true, value: elem };
  }
  return extractPath(elem, path, pos + 1);
}

/**
 * Two messages are considered duplicates iff the following tuple is the same:
 * 1) action
 * 2) timestamp ("ts" field)
 * 3) key fields in payload
 *
 * By default, all fields in the payload are considered, but this can be
 * overwritten by the "deduplicateBy" parameter. It is a comma-separated
 * list of dot-separated paths.
 *
 * For instance, "k" would only extract the field named "k", so the following
 * two messages would be considered duplicates:
 *
 * msg1 = {
 *   "k": "key text",
 *   "x": "some text not part of the key"
 * }
 *
 * msg2 = {
 *   "k": "key text",
 *   "x": "another text not part of the key"
 * }
 *
 * Both messages would not be duplicates in the default (considering the
 * full payload), or it both keys were listed ("k,x").
 *
 * The path allows to extract inner fields:
 *
 * msg = {
 *   "a": 42,
 *   "b": {
 *     "c: "inner",
 *   },
 *   "d": "not extracted"
 * }
 *
 * 'a,b.c' will extract the values 42 and "inner", but not the value for field "d".
 *
 * Arrays can be either aggregated with [] or accessed by an index:
 *
 * msg = {
 *   a: [1,2,3],
 *   b: [{
 *     c: 4,
 *     d: "ignore"
 *   }, {
 *     c: 5,
 *     d: "ignore",
 *   }]
 * }
 *
 * by []:    'a,b.[].c' will extract the values [1,2,3], 4 and 5.
 * by index: 'a,b.0.c' will extract the values [1,2,3] and 4.
 * by index: 'a,b.1.c' will extract the values [1,2,3] and 5.
 */
export function computeDeduplicationKey({ body, deduplicateBy = '' }) {
  let keys = body.payload;
  if (!deduplicateBy) {
    keys = body.payload;
  } else {
    keys = deduplicateBy.split(',').map(path =>
      extractPath(body.payload, path.split('.'), 0).value);
  }

  const { action, ts } = body;
  return JSON.stringify([action, ts, objectToOrderedArray(keys)]);
}

/**
 * Well-behaving clients should not send the same message multiple times.
 * For example, if a user repeats a query, it should only be sent once.
 * (Note: Do not confuse it with duplicate detection on the server side!
 * That it a harder problem, as you cannot trust the clients.)
 *
 * The existance of false positives is acceptable (messages being dropped
 * even though they have not been sent). However, it should not have
 * a noticeable impact on the number of collected messages (on the server).
 */
export default class DuplicateDetector {
  constructor(persistedHashes) {
    this.persistedHashes = persistedHashes;
    this.unloaded = false;
  }

  unload() {
    if (!this.unloaded) {
      this.unloaded = true;
      this.persistedHashes.flush();
    }
  }

  /**
   * Checks whether a message should be sent.
   *
   * If you got permission to send but the actual send failed,
   * ensure to call the returned "rollback" callback. Otherwise, you
   * cannot retry, as all later attempts will be rejected as duplicates.
   */
  async trySend(message) {
    if (this.unloaded) {
      return {
        ok: false,
        rejectReason: 'Module is unloading'
      };
    }

    let key;
    try {
      key = computeDeduplicationKey(message);
    } catch (e) {
      return {
        ok: false,
        rejectReason: `Message must be well-formed (failed at: ${e})`,
      };
    }

    const hash = truncatedHash(key);
    const expireAt = this._chooseExpiration();
    const wasAdded = await this.persistedHashes.add(hash, expireAt);
    if (!wasAdded) {
      return {
        ok: false,
        rejectReason: `Hash for the deduplication key has been already seen (key: ${key}, hash: ${hash})`,
      };
    }
    return {
      ok: true,
      rollback: async () => {
        try {
          await this.persistedHashes.delete(hash);
        } catch (e) {
          logger.warn('Failed to rollback. Message cannot be resent.', e);
        }
      },
    };
  }

  _chooseExpiration() {
    // conservative approach: remove entries after one or two days
    // (faster expiration should not make a functional difference,
    // as messages include the timestamp in their hashes).
    // Adding noise is done to make it harder to guess at what
    // time the hash was added.
    return Date.now() + Math.ceil((1.0 + random()) * DAY);
  }
}
