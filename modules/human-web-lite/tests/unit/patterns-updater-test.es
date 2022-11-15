/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

/* eslint-disable no-await-in-loop */

const expect = chai.expect;

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

// Some big value which should be large enough to
// make sure all cooldowns have expired.
const SKIP_ALL_COOLDOWNS = WEEK;

function generateTestRules(msgName) {
  return {
    [msgName]: {
      input: {
        'div.someCssSelector': {
          first: {
            test: {
              attr: 'textContent',
            },
          }
        },
        output: {
          'some-output-msg': {
            fields: [],
          },
        },
      },
    },
  };
}

// Some patterns that can be used to simulate pattern released.
// The actual content does not matter, as the PatternUpdater is not
// aware of the DSL and is thus agnostic to the content of the rules.
//
// But what is important is that the Pattern class, which holds the
// the currently active rules, will always start with an empty rule set
// when the extension is loaded.
const EMPTY_PATTERN = JSON.stringify({});
const SOME_NON_EMPTY_PATTERN = JSON.stringify(generateTestRules('some-test-message'));
const ANOTHER_NON_EMPTY_PATTERN = JSON.stringify(generateTestRules('another-test-message'));

function mockFetch(patternsUrl, serverPatterns) {
  expect(patternsUrl).to.exist;
  expect(serverPatterns).to.exist;

  const expectedFetchArgs = {
    url: patternsUrl,
    options: {
      method: 'GET',
      cache: 'no-cache',
      credentials: 'omit',
    },
  };

  const mock = {
    stats: {
      attemptedRequests: 0,
    },
    fetchImpl: async (url, options = {}) => {
      mock.stats.attemptedRequests += 1;
      expect({ url, options }).to.deep.equal(expectedFetchArgs);

      if (serverPatterns.simulateNetworkError) {
        throw new Error('Stub server has been configured to fail with a network error');
      }

      if (serverPatterns.simulateBadResponse) {
        return {
          ok: false,
          statusText: 'Stub server has been configured to fail (this is expected).',
        };
      }

      return {
        ok: true,
        text: async () => serverPatterns.value,
      };
    },
  };
  return mock;
}

function mockStorage(storageKey) {
  return {
    async get(key) {
      expect(key).to.equal(storageKey);
      return this._content;
    },
    async set(key, obj) {
      expect(key).to.equal(storageKey);
      this._content = obj;
    }
  };
}

// stub implementation of the "Patterns" class
function mockPatterns() {
  return {
    _rules: {},
    _updateHistory: [],

    updatePatterns(rules) {
      this._rules = rules;
      this._updateHistory.push(rules);
    },

    getRulesSnapshot() {
      return this._rules;
    },
  };
}

export default describeModule('human-web-lite/patterns-updater',
  () => ({
    'platform/globals': {
      default: {},
    },
  }),
  () => {
    describe('#PatternsUpdater', function () {
      const storageKey = 'some-storage-key';
      let PatternsUpdater;
      let uut;
      let config;
      let storage;
      let fetchMock;

      // These stubs allow the tests to simulate that the server releases
      // new rules and allows to check what rules would be active in the client.
      let clientPatterns;
      let serverPatterns;

      function releasePatterns(pattern) {
        if (typeof pattern === 'string') {
          serverPatterns.value = pattern;
        } else {
          serverPatterns.value = JSON.stringfy(pattern);
        }
      }

      function networkIsDown() {
        serverPatterns.simulateNetworkError = true;
      }

      function networkIsUp() {
        serverPatterns.simulateNetworkError = false;
      }

      function serverRespondsWithNon2xx() {
        serverPatterns.simulateBadResponse = true;
      }

      function serverRespondsWith2xx() {
        serverPatterns.simulateBadResponse = false;
      }

      function expectLoadedPatternsToBe(pattern) {
        const expectedRules = (typeof pattern === 'string') ? JSON.parse(pattern) : pattern;
        expect(clientPatterns.getRulesSnapshot()).to.deep.equal(expectedRules);
      }

      function newPatternsUpdater() {
        return new PatternsUpdater({
          config,
          patterns: clientPatterns,
          storage,
          storageKey,
          _fetchImpl: (...args) => fetchMock.fetchImpl(...args),
        });
      }

      // Helper that simulate an event like a restart of the service worker/background script:
      // it keeps the storage but purges/ everything that was in memory.
      async function simulateRestart() {
        uut = newPatternsUpdater();
      }

      beforeEach(function () {
        PatternsUpdater = this.module().default;
        clientPatterns = mockPatterns();
        serverPatterns = {
          value: EMPTY_PATTERN,
        };

        config = {
          HUMAN_WEB_LITE_PATTERNS: 'https://patterns-location.test',
        };
        storage = mockStorage(storageKey);
        fetchMock = mockFetch(config.HUMAN_WEB_LITE_PATTERNS, serverPatterns);
        uut = newPatternsUpdater();
      });

      describe('on a fresh extension installation', function () {
        it('should update to the latest patterns', async () => {
          expectLoadedPatternsToBe(EMPTY_PATTERN);
          releasePatterns(SOME_NON_EMPTY_PATTERN);
          expectLoadedPatternsToBe(EMPTY_PATTERN);

          await uut.init();

          expectLoadedPatternsToBe(SOME_NON_EMPTY_PATTERN);
        });

        describe('should handle error cases during startup gracefully', function () {
          beforeEach(function () {
            releasePatterns(SOME_NON_EMPTY_PATTERN);
          });

          it('network is down', async () => {
            networkIsDown();

            await uut.init();

            expectLoadedPatternsToBe(EMPTY_PATTERN);
          });

          it('server responds with non-2xx', async () => {
            serverRespondsWithNon2xx();

            await uut.init();

            expectLoadedPatternsToBe(EMPTY_PATTERN);
          });

          it('server responds with something that is not well-formed', async () => {
            releasePatterns('some text that is not JSON');

            await uut.init();

            expectLoadedPatternsToBe(EMPTY_PATTERN);
          });

          it('server first fails but then responds', async () => {
            releasePatterns(SOME_NON_EMPTY_PATTERN);
            serverRespondsWithNon2xx();

            const ts = Date.now();
            await uut.init({ now: ts });
            expectLoadedPatternsToBe(EMPTY_PATTERN);

            serverRespondsWith2xx();
            await uut.update({ now: ts + SKIP_ALL_COOLDOWNS });
            expectLoadedPatternsToBe(SOME_NON_EMPTY_PATTERN);
          });
        });

        describe('should retry if it is unable fetch patterns on startup', function () {
          beforeEach(function () {
            releasePatterns(SOME_NON_EMPTY_PATTERN);
            networkIsDown();
          });

          it('update patterns if the network is responding again later', async () => {
            const ts = Date.now();

            const outageDuration = 5;
            await uut.init({ now: ts });
            for (let i = 1; i <= outageDuration; i += 1) {
              await uut.update({ now: ts + i * MINUTE });
              expectLoadedPatternsToBe(EMPTY_PATTERN);
            }

            networkIsUp();
            for (let i = outageDuration; i <= 10 * outageDuration; i += 1) {
              await uut.update({ now: ts + i * MINUTE });
            }
            expectLoadedPatternsToBe(SOME_NON_EMPTY_PATTERN);
          });
        });

        describe('[error handling]', function () {
          let ts;

          beforeEach(async () => {
            // setup: the client has already loaded some pattern ...
            ts = Date.now();
            releasePatterns(SOME_NON_EMPTY_PATTERN);
            await uut.init({ now: ts });
            expectLoadedPatternsToBe(SOME_NON_EMPTY_PATTERN);

            // ... but then the nextwork is down and updates are failing
            releasePatterns(ANOTHER_NON_EMPTY_PATTERN);
            ts += SKIP_ALL_COOLDOWNS;
            networkIsDown();
          });

          function assertClientHasNotUpdatedYet() {
            expectLoadedPatternsToBe(SOME_NON_EMPTY_PATTERN);
          }

          it('cooldown as failures (ignoreErrors: false)', async () => {
            for (let i = 0; i < 10; i += 1) {
              // detect failure to update
              let detected = false;
              try {
                await uut.update({ now: ts, ignoreErrors: false });
              } catch (e) {
                detected = true;
              }
              expect(detected).to.equal(true);
              assertClientHasNotUpdatedYet();

              // suppress error
              await uut.update({ now: ts, ignoreErrors: true });
              assertClientHasNotUpdatedYet();

              // by default, it should be suppressed
              await uut.update({ now: ts });
              assertClientHasNotUpdatedYet();
            }
          });
        });

        describe('[parallel updates]', function () {
          it('should handle concurrent updates', async () => {
            let ts = Date.now();
            releasePatterns(SOME_NON_EMPTY_PATTERN);
            await uut.init({ now: ts });
            expectLoadedPatternsToBe(SOME_NON_EMPTY_PATTERN);

            // new release is out
            ts += SKIP_ALL_COOLDOWNS;
            releasePatterns(ANOTHER_NON_EMPTY_PATTERN);

            // When doing multiple parallel fetch requests, only one
            // HTTP request should be make and all update operations
            // have to block until the update is completed.
            expect(fetchMock.stats.attemptedRequests).to.equal(1);
            const parallelUpdates = [];
            for (let i = 0; i < 100; i += 1) {
              parallelUpdates.push((async (uut_, fetchMock_) => {
                expectLoadedPatternsToBe(SOME_NON_EMPTY_PATTERN);
                await uut_.update({ now: ts, ignoreErrors: false });
                expect(fetchMock_.stats.attemptedRequests).to.equal(2);
                expectLoadedPatternsToBe(ANOTHER_NON_EMPTY_PATTERN);
              })(uut, fetchMock));
            }
            await Promise.all(parallelUpdates);
            expectLoadedPatternsToBe(ANOTHER_NON_EMPTY_PATTERN);
            expect(fetchMock.stats.attemptedRequests).to.equal(2);
          });
        });

        describe('[after a restart]', function () {
          it('should not immediately fetch patterns again', async () => {
            // first make sure the patterns are loaded
            const now = Date.now();
            releasePatterns(SOME_NON_EMPTY_PATTERN);
            await uut.init({ now });
            expectLoadedPatternsToBe(SOME_NON_EMPTY_PATTERN);
            expect(fetchMock.stats.attemptedRequests).to.equal(1);

            // If we restart now without letting much time pass, it should
            // trust the persisted value and save the network calls.
            await simulateRestart();
            expect(fetchMock.stats.attemptedRequests).to.equal(1);
            await uut.init({ now: now + 10 * SECOND });
            expect(fetchMock.stats.attemptedRequests).to.equal(1);
          });

          it('should eventually fetch patterns if enough time passed', async () => {
            // first make sure the patterns are loaded
            const now = Date.now();
            releasePatterns(SOME_NON_EMPTY_PATTERN);
            await uut.init({ now });
            expectLoadedPatternsToBe(SOME_NON_EMPTY_PATTERN);
            expect(fetchMock.stats.attemptedRequests).to.equal(1);

            // If we restart now after a longer time, it should not
            // trust the cached patterns but fetch them from the server.
            await simulateRestart();
            expect(fetchMock.stats.attemptedRequests).to.equal(1);
            await uut.init({ now: now + 4 * WEEK });
            expect(fetchMock.stats.attemptedRequests).to.equal(2);
          });
        });
      });
    });
  });
