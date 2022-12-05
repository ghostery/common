/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable no-continue */

import parseHtml from './html-parser';
import logger from './logger';
import { truncatedHash } from '../core/helpers/md5';
import random from '../core/crypto/random';
import { anonymousHttpGet } from './http';
import { getTimeAsYYYYMMDD } from '../hpn-lite/timestamps';
import { lookupBuiltinTransform } from './patterns';

function doublefetchQueryHash(query, type) {
  // defines a cooldown to avoid performing unnecessary
  // doublefetch requests in short order
  return truncatedHash(`dfq:${type}:${query.trim()}`);
}

const HOUR = 60 * 60 * 1000;

/**
 * Minimum delay before repeating doublefetch attempts
 * for queries (only counting successful attempts).
 * Waiting for next start of day (in UTC time) is recommended,
 * as trying to send messages earlier is a waste of resources.
 *
 * In addition, enforce a minimum cooldown, intended for people
 * living in timezones like US west coast where UTC midnight
 * happens during the day. Without a minimum cooldown, there is
 * the risk of introducing bias in the collected data, as we
 * would include repeated searches with higher likelihood than
 * in other parts of the world (e.g. Europe).
 */
function chooseExpiration() {
  const minCooldown = 8 * HOUR;
  const tillNextUtcDay = new Date().setUTCHours(23, 59, 59, 999) + 1;
  const tillCooldown = Date.now() + minCooldown;
  const randomNoise = Math.ceil(random() * 2 * HOUR);

  return Math.max(tillCooldown, tillNextUtcDay) + randomNoise;
}

function runSelector(item, selector, attr, baseURI) {
  const elem = selector ? item.querySelector(selector) : item;
  if (elem) {
    if (attr === 'textContent') {
      return elem.textContent;
    }
    if (attr === 'href') {
      // Going throw the attribute "href" avoids some of the problems of using
      // directly "elem.href". For relative links the DOMParser cannot
      // accidentally fill in the extension ID as the base. Another advantage
      // (also for absolute links) is that it avoids a double-encoding problem
      // in certain DOM parser (doesn't seem to affect Firefox, but linkedom).
      //
      // Since this part may dependent on the DOMParse implementation, two
      // notes about the intended semantic:
      // * links should be as close to the original page as possible
      // * extensions IDs must not leak into the output
      const rawLink = elem.getAttribute('href');
      return rawLink ? new URL(rawLink, baseURI).href : null;
    }
    if (elem.hasAttribute(attr)) {
      return elem.getAttribute(attr);
    }
  }
  return null;
}

function runTransforms(value, transformSteps = []) {
  if (!Array.isArray(transformSteps)) {
    throw new Error('Transform definitions must be array.');
  }
  if (value === undefined || value === null) {
    return null;
  }
  let tmpValue = value;
  for (const step of transformSteps) {
    const [name, ...args] = step;
    const transform = lookupBuiltinTransform(name);
    tmpValue = transform(tmpValue, ...args);
  }
  return tmpValue ?? null;
}

function findFirstMatch(rootItem, selectorDef, baseURI) {
  // special case: allows to define multiple rules (first matching rule wins)
  if (selectorDef.firstMatch) {
    for (const { select, attr, transform = [] } of selectorDef.firstMatch) {
      const match = runSelector(rootItem, select, attr, baseURI) ?? null;
      if (match !== null) {
        return runTransforms(match, transform);
      }
    }
    return null;
  }

  // default case: only one rule
  return runSelector(rootItem, selectorDef.select, selectorDef.attr, baseURI) ?? null;
}

export default class SearchExtractor {
  constructor({ config, patterns, sanitizer, persistedHashes }) {
    this.patterns = patterns;
    this.sanitizer = sanitizer;
    this.persistedHashes = persistedHashes;
    this.channel = config.HW_CHANNEL;
    if (!this.channel) {
      throw new Error('config.HW_CHANNEL not configured');
    }
  }

  async runJob({ type, query, doublefetchRequest }) {
    function discard(reason = '') {
      logger.debug('No messages found for query:', query, 'Reason:', reason);
      return {
        messages: [],
        reason,
      };
    }

    const queryCheck = this.sanitizer.isSuspiciousQuery(query);
    if (!queryCheck.accept) {
      return discard(`Dropping suspicious query before double-fetch (${queryCheck.reason})`);
    }

    const queryHash = doublefetchQueryHash(query, type);
    const expireAt = chooseExpiration();
    const wasAdded = await this.persistedHashes.add(queryHash, expireAt);
    if (!wasAdded) {
      return discard('Query has been recently seen.');
    }

    let doc;
    try {
      const html = await anonymousHttpGet(doublefetchRequest.url, {
        headers: doublefetchRequest.headers,
        redirect: doublefetchRequest.redirect,
      });
      doc = await parseHtml(html);
    } catch (e) {
      // unblock the hash to allow retries later
      // (at this point, the error could be caused by a network error,
      // so it is still possible that a retry later could work.)
      logger.info('Failed to fetch query:', doublefetchRequest.url, e);
      await this.persistedHashes.delete(queryHash).catch(() => {});
      throw e;
    }
    const messages = this.extractMessages({ doc, type, query, doublefetchRequest });
    if (messages.length === 0) {
      return discard('No content found.');
    }

    logger.info(messages.length, 'messages found for query:', query);
    return { messages };
  }

  extractMessages({ doc, type, query, doublefetchRequest }) {
    const rules = this.patterns.getRulesSnapshot();
    if (!rules[type]) {
      return [];
    }

    const found = {};
    const baseURI = doublefetchRequest.url;

    const { input = {}, output = {} } = rules[type];
    for (const [selector, selectorDef] of Object.entries(input)) {
      found[selector] = found[selector] || {};
      if (selectorDef.first) {
        const item = doc.querySelector(selector);
        if (item) {
          for (const [key, def] of Object.entries(selectorDef.first)) {
            const value = findFirstMatch(item, def, baseURI);
            found[selector][key] = runTransforms(value, def.transform);
          }
        }
      } else if (selectorDef.all) {
        const rootItems = doc.querySelectorAll(selector);
        if (rootItems) {
          found[selector] = found[selector] || {};
          for (const [key, def] of Object.entries(selectorDef.all)) {
            found[selector][key] = [];
            for (const rootItem of rootItems) {
              const item = findFirstMatch(rootItem, def, baseURI);
              found[selector][key].push(runTransforms(item, def.transform));
            }
          }
        }
      } else {
        throw new Error('Internal error: bad selector (expected "first" or "all")');
      }
    }

    // meta fields, which are provided instead of being extracted
    const context = {
      q: query ?? null,
      qurl: doublefetchRequest.url,
      ctry: this.sanitizer.getSafeCountryCode(),
    };
    const isPresent = x => x !== null && x !== undefined && x !== '';

    // Now combine the results to build the messages as specified
    // in the "output" section of the patterns.
    //
    // Message payload
    // ---------------
    // There are three origins of the data:
    // 1) a single keys
    //    (extracted from an input with a "first" section)
    // 2) array entries that need to be merged
    //    (extracted from an input with an "all" section)
    // 3) special entries provided in the context
    //
    // Filtering:
    // ----------
    // By default, all keys of a message have to be present (where empty arrays
    // and empty strings are considered to absent). The default behaviour can be
    // overwritten by setting the "optional" property of a field. Also, the merging
    // of arrays can allow entries with missing values by overwriting the
    // "requiredKeys" property. If not specified, all keys of the array entry need
    // to be present; otherwise, the entry will be skipped.
    const messages = [];
    nextaction: // eslint-disable-line no-labels, no-restricted-syntax
    for (const [action, schema] of Object.entries(output)) {
      const payload = {};
      for (const { key, source, requiredKeys, optional = false } of schema.fields) {
        if (source) {
          if (!input[source]) {
            throw new Error(`Output rule for action=${action} references invalid input source=${source}`);
          }
          if (input[source].first) {
            // case 1: single extracted value
            if (!optional && !isPresent(found[source][key])) {
              continue nextaction; // eslint-disable-line no-labels
            }
            payload[key] = found[source][key] ?? null;
          } else if (input[source].all) {
            // case 2: merge the fields from an array of previously extracted values
            const results = [];
            const innerKeys = Object.keys(input[source].all);
            for (const innerKey of innerKeys) {
              found[source][innerKey].forEach((value, idx) => {
                results[idx] = results[idx] || {};
                results[idx][innerKey] = value ?? null;
              });
            }

            // check if all required data was found
            // (by default, all keys in the fields need to be present)
            const required = requiredKeys || innerKeys;
            const allFieldsPresent = entry => required.every(x => isPresent(entry[x]));
            const cleanedResults = results.filter(allFieldsPresent);
            if (cleanedResults.length === 0 && !optional) {
              continue nextaction; // eslint-disable-line no-labels
            }
            payload[key] = { ...cleanedResults };
          } else {
            throw new Error(`Output rule for action=${action} does not match input key=${key}`);
          }
        } else {
          // case 3: access special keys from the context
          if (!optional && !isPresent(context[key])) {
            continue;
          }
          payload[key] = context[key] ?? null;
        }
      }

      const { deduplicateBy } = schema;
      const body = {
        type: 'humanweb',
        action,
        payload,
        ver: '2.9',
        channel: this.channel,
        ts: getTimeAsYYYYMMDD(),
        'anti-duplicates': Math.floor(random() * 10000000),
      };
      messages.push({ body, deduplicateBy });
    }
    logger.debug('Found the following messages:', messages);
    return messages;
  }
}
