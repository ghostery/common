/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

const expect = chai.expect;

function getUniqueId() {
  getUniqueId.uniqueId = (getUniqueId.uniqueId || 0) + 1;
  return getUniqueId.uniqueId;
}

/* eslint-disable no-param-reassign */
function mkMessage({ action = 'test-action', payload, deduplicateBy } = {}) {
  payload = payload || {
    testFieldWithSeq: `test-field-${getUniqueId()}`,
  };

  const body = {
    type: 'test-type',
    action,
    payload,
    ver: '2.9',
    channel: 'test-channel',
    ts: 20220101,
    'anti-duplicates': 1,
  };
  return { body, deduplicateBy };
}

export default describeModule('human-web-lite/duplicate-detector',
  () => ({
    'platform/globals': {
      default: {}
    },
    'core/crypto/random': {
      default: Math.random.bind(Math),
    },
  }),
  () => {
    describe('#DuplicateDetector', function () {
      let uut;
      let persistedHashes;

      beforeEach(async function () {
        // in-memory implementation of storage
        const MemoryPersistentMap = (await this.system.import('core/helpers/memory-map')).default;
        const storage = new MemoryPersistentMap();

        const PersistedHashes = (await this.system.import('hpn-lite/persisted-hashes')).default;
        persistedHashes = new PersistedHashes({ storage, storageKey: 'dummy-storage-key' });

        const DuplicateDetector = this.module().default;
        uut = new DuplicateDetector(persistedHashes);
      });

      afterEach(() => {
        uut.unload();
        uut = null;
      });

      async function expectSendOK(msg) {
        const result = await uut.trySend(msg);
        expect(result.ok).to.be.true;
        expect(result.rollback).to.be.a('function');
        return result;
      }

      async function expectSendNotOK(msg) {
        const result = await uut.trySend(msg);
        expect(result.ok).to.be.false;
        expect(result.rejectReason).to.be.a('string').that.is.not.empty;
        return result;
      }

      it('should accept a valid message', async function () {
        await expectSendOK(mkMessage());
      });

      it('should not accept the same message twice (one arriving after the other)', async function () {
        const msg = mkMessage();
        await expectSendOK(msg);
        await expectSendNotOK(msg);
        await expectSendNotOK(msg);
      });

      it('should not accept the same message twice (both arriving at the same time)', async function () {
        const msg = mkMessage();
        const result = await Promise.all([uut.trySend(msg), uut.trySend(msg), uut.trySend(msg)]);
        expect(result.map(x => x.ok).sort()).to.eql([false, false, true]); // exactly one succeeds
      });

      it('should allow to send it again after rolling back', async function () {
        const msg = mkMessage();
        const { rollback } = await expectSendOK(msg);

        await expectSendNotOK(msg); // duplicate
        rollback();
        await expectSendOK(msg);
      });

      it('should detect duplicated messages even keys differ, but ignore non-key fields', async function () {
        const q = 'some key shared in both messages';
        const deduplicateBy = 'q';

        await expectSendOK(mkMessage({
          payload: {
            q,
            nonKey: 'This is not part of the key',
          },
          deduplicateBy, // but ignore "nonKey"
        }));

        await expectSendNotOK(mkMessage({
          payload: {
            q,
            nonKey: 'This is a different text, but it is a duplicate nevertheless',
          },
          deduplicateBy,
        }));

        await expectSendOK(mkMessage({
          payload: {
            q: 'another key, so it no longer a duplicate',
            nonKey: 'This is not part of the key',
          },
          deduplicateBy,
        }));
      });
    });

    describe('#computeDeduplicationKey', function () {
      let computeDeduplicationKey;

      beforeEach(function () {
        computeDeduplicationKey = this.module().computeDeduplicationKey;
      });

      function computeKeysForPayload(payload1, payload2, by) {
        const action = 'action';
        const ts = '20220923';
        const deduplicateBy = by;
        const key1 = computeDeduplicationKey({
          body: {
            action,
            payload: payload1,
            ts,
          },
          deduplicateBy
        });
        expect(key1).to.be.a('string').that.is.not.empty;

        const key2 = computeDeduplicationKey({
          body: {
            action,
            payload: payload2,
            ts,
          },
          deduplicateBy
        });
        expect(key2).to.be.a('string').that.is.not.empty;

        return [key1, key2];
      }

      function duplicatedPayload(payload1, payload2, by) {
        const [key1, key2] = computeKeysForPayload(payload1, payload2, by);
        if (key1 !== key2) {
          chai.expect.fail([
            `The following two payloads should have been detected as duplicates (key fields=<${by}>):`,
            JSON.stringify(payload1, null, 2),
            JSON.stringify(payload2, null, 2),
            'but their computed keys differ:',
            key1,
            '!=',
            key2,
          ].join('\n'));
        }
      }

      function nonDuplicatedPayload(payload1, payload2, by) {
        const [key1, key2] = computeKeysForPayload(payload1, payload2, by);
        if (key1 === key2) {
          chai.expect.fail([
            `The following two payloads should not have been detected as duplicates (key fields=<${by}>):`,
            JSON.stringify(payload1, null, 2),
            JSON.stringify(payload2, null, 2),
            `but their computed key is the same: ${key1}`,
          ].join('\n'));
        }
      }

      it('should differ iff any part of the <action, timestamp, key fields> tuple differs', function () {
        const seen = new Set();
        for (const action of ['action1', 'action2']) {
          for (const ts of ['20010101', '20020202']) {
            for (const key of ['key1', 'key2']) {
              const dedupHash = computeDeduplicationKey({
                body: {
                  action,
                  payload: {
                    key,
                  },
                  ts,
                },
              });
              expect(seen.has(dedupHash)).to.be.false;
              seen.add(dedupHash);
            }
          }
        }
      });

      it('should extract the full payload by default', function () {
        for (const deduplicateBy of ['', undefined, null]) {
          expect(computeDeduplicationKey({
            body: {
              action: 'action',
              payload: {
                x: 'x42x',
                y: 'y42y',
              },
              ts: '20220923',
            },
            deduplicateBy,
          })).to.be.a('string').that.includes('x42x').and.includes('y42y');
        }
      });

      it('should detect consider only key fields', function () {
        duplicatedPayload({
          x: 'x',
          y: 'y',
          foo: 42,
        }, {
          x: 'x',
          y: 'y',
          bar: 42,
        }, 'x,y');

        for (const by of ['x,y,foo', 'x,y,bar', '']) {
          nonDuplicatedPayload({
            x: 'x',
            y: 'y',
            foo: 42,
          }, {
            x: 'x',
            y: 'y',
            bar: 42,
          }, by);
        }
      });

      it('should supported nested keys', function () {
        duplicatedPayload({
          x: 'x',
          y: {
            z: 'z',
          },
        }, {
          x: 'x',
          y: {
            z: 'z',
          },
          ignore: 'not part of key',
        }, 'x,y');

        duplicatedPayload({
          x: 'x',
          y: {
            z: 'z',
          },
        }, {
          x: 'x',
          y: {
            z: 'z',
          },
          ignore: 'not part of key',
        }, 'x,y.z');
      });

      it('should match whole objects if the path leads to an object or array', function () {
        nonDuplicatedPayload({
          x: 'x',
          y: {
            z: 'z',
          },
        }, {
          x: 'x',
          y: {
            z: 'z',
            inner: 'part of key',
          },
          ignore: 'not part of key',
        }, 'x,y');

        duplicatedPayload({
          x: 'x',
          y: {
            z: {
              bar: { baz: 42 },
              foo: [1, 2, 3],
            },
          },
        }, {
          x: 'x',
          y: {
            z: {
              bar: { baz: 42 },
              foo: [1, 2, 3],
            },
          },
          ignore: 'not part of key',
        }, 'x,y');
      });

      it('should handle arrays', function () {
        nonDuplicatedPayload({
          x: [1.23]
        }, {
          x: [0],
        }, 'x');

        duplicatedPayload({
          x: [1.23],
          y: {
            z: [false, true],
          },
        }, {
          x: [1.23],
          y: {
            z: [false, true],
          },
        }, 'y.z');

        duplicatedPayload({
          x: [1.23],
          y: {
            z: [false, true],
            ignore: 'some text',
          },
        }, {
          x: [1.23],
          y: {
            z: [false, true],
            ignore: 'another text',
          },
        }, 'x,y.z');

        nonDuplicatedPayload({
          y: {
            z: [false],
          },
        }, {
          y: {
            z: [true],
          },
        }, 'y.z');
      });

      it('should ignore the order of fields (non-nested)', function () {
        duplicatedPayload({
          x: 'x',
          y: 'y',
        }, {
          y: 'y',
          x: 'x',
        });
        duplicatedPayload({
          x: 'x',
          y: 'y',
        }, {
          y: 'y',
          x: 'x',
        }, 'x,y');
        duplicatedPayload({
          x: 'x',
          y: 'y',
        }, {
          y: 'y',
          x: 'x',
        }, 'y,x');
      });

      it('should ignore the order of fields (nested)', function () {
        duplicatedPayload({
          x: 'x',
          y: 'y',
          z: {
            arr: [
              {
                x: 42.1,
                y: [1, 2, 3],
                z: undefined,
              },
              {
                x: [1, 2, 3],
                y: 42,
                z: null,
              },
            ],
            foo: 42,
            bar: 'baz',
            yes: true,
            no: false,
          },
        }, {
          y: 'y',
          z: {
            bar: 'baz',
            no: false,
            yes: true,
            foo: 42,
            arr: [
              {
                z: undefined,
                y: [1, 2, 3],
                x: 42.1,
              },
              {
                y: [1, 2, 3],
                z: null,
                x: 42,
              },
            ],
          },
          x: 'x',
        }, 'y,x');
      });

      it('should expand arrays while matching', function () {
        duplicatedPayload({
          foo: [
            [{ x: 1, y: 2, z: 3 }],
          ],
        }, {
          foo: [
            [{ x: 1, y: 2, z: 3 }],
          ],
        }, 'foo.[].x,foo.[].y,foo.[].z');

        duplicatedPayload({
          foo: [
            [{ x: 1, y: 2 }],
          ],
        }, {
          foo: [
            [{ x: 1, y: 2, z: 3 }],
          ],
        }, 'foo.[].x,foo.[].y');

        nonDuplicatedPayload({
          foo: [
            [{ x: 1, y: 2, z: 3 }],
          ],
        }, {
          foo: [
            [{ x: 1, y: 2, z: 3 }],
            [{ x: 1, y: 2, z: 3 }],
          ],
        }, 'foo.[].[].x');

        duplicatedPayload({
          foo: [
            [{ x: 1, y: 1 }],
          ],
        }, {
          foo: [
            [{ x: 1, y: 2 }],
          ],
        }, 'foo.[].[].x');

        nonDuplicatedPayload({
          foo: [
            [{ x: 1, y: 1 }],
          ],
        }, {
          foo: [
            [{ x: 1, y: 2 }],
          ],
        }, 'foo.[].[].x,foo.[].[].y');
      });

      it('should only consider real matches when expanding arrays', function () {
        duplicatedPayload({
          x: [
            [{ y: [] }]
          ],
        }, {
          foo: [
          ],
        }, 'x.[].y.[].z');
      });

      it('should support matching array indices', function () {
        duplicatedPayload({
          x: [
            { y: 'part of key' },
            { y: 'some text not part of index' },
          ],
        }, {
          x: [
            { y: 'part of key' },
            { y: 'another text not part of index' },
          ],
        }, 'x.0.y');

        nonDuplicatedPayload({
          x: [
            { y: 'part of key' },
            { y: 'some text part of index' },
          ],
        }, {
          x: [
            { y: 'part of key' },
            { y: 'another text part of index' },
          ],
        }, 'x.[].y');

        duplicatedPayload({
          x: [
            [
              { y: 'part of key' },
              { y: 'some text not part of index' },
            ],
          ],
        }, {
          x: [
            [
              { y: 'part of key' },
              { y: 'another text not part of index' },
            ],
          ],
        }, 'x.0.0.y');
      });

      // (Mostly for documentation; we are not relying on the following semantic)
      //
      // JavaScripts's null and undefined will be both treated as missing values.
      // In our context, that is reasonable and avoiding it is hard anyway because
      // details of JSON (which is used in the communication layer) will shine through:
      // JSON.stringify([undefined]) === JSON.stringify([null])
      //
      // If changes of the implementation break this tests, feel free to change it.
      // It documents the status-quo of the implemenation, but everything here
      it('should treat null and undefined both as missing value', function () {
        duplicatedPayload({
          x: null,
          y: 'foo'
        }, {
          x: undefined,
          y: 'foo'
        }, 'x,y');
        duplicatedPayload({
          x: null,
          y: 'foo'
        }, {
          y: 'foo'
        }, 'x,y');
        duplicatedPayload({
          x: undefined,
          y: 'foo'
        }, {
          y: 'foo'
        }, 'x,y');
        duplicatedPayload({
          y: 'foo'
        }, {
          y: 'foo'
        }, 'x,y');

        // When matching without explicit keys, there are three case:
        // null, undefined and omitted. For technical reasons, we cannot
        // easily merge omitted with the other two. It should not be important,
        // so we can accept the following behavior:
        duplicatedPayload({
          x: null,
          y: 'foo'
        }, {
          x: undefined,
          y: 'foo'
        });
        nonDuplicatedPayload({
          x: null,
          y: 'foo'
        }, {
          y: 'foo'
        });
        nonDuplicatedPayload({
          x: undefined,
          y: 'foo'
        }, {
          y: 'foo'
        });
        duplicatedPayload({
          y: 'foo'
        }, {
          y: 'foo'
        });
      });
    });
  });
