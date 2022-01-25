/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import UAParser from 'ua-parser-js';
import logger from './logger';

/**
 * Responsible for generating information to be included in the "alive" message.
 * The purpose of the additional information in the alive message is to detect
 * unusual traffic, for instance, if a new browser version introduced a regression.
 *
 * The information will only be included if it has been seen by multiple users.
 * The data itself should not be sensitive, still there is no point in including it
 * as only "big hitters" are interesting. For instance, should there be a problem in
 * an obscure setup, it is less interesting then if a recent Firefox or Chrome release
 * breaks something on Windows.
 */
export default class AliveMessageGenerator {
  constructor(quorumChecker, aliveConfigStorage) {
    this.quorumChecker = quorumChecker;
    this.aliveConfigStorage = aliveConfigStorage;
  }

  async generateMessage(countryCode, hour) {
    const parser = UAParser();
    parser.browser = parser.browser || {};
    parser.os = parser.os || {};

    const browser = parser.browser.name || '';
    const os = parser.os.name || '';

    // extracts only the major version (e.g. "96.0.1" -> 96)
    let version = parseInt(parser.browser.version, 10);
    if (isNaN(version)) {
      version = '';
    }

    const config = {
      browser,
      version, // major version
      os,
      ctry: countryCode, // sanitized country ('--' for countries with a small population)
    };
    try {
      const reachedQuorum = await this._reachedQuorum(config);
      if (reachedQuorum) {
        config.t = hour;
        logger.debug('Found the following configuration safe to share:', config);
        return config;
      }
    } catch (e) {
      logger.warn('Failed to confirm that the configuration is popular enough:', e);
    }

    logger.debug('Omitting the config, as it is not popular enough:', config);
    return {
      browser: '',
      version: '',
      os: '',
      ctry: '--',
      t: hour,
    };
  }

  /**
   * Checks that the additional configuration is popular enough to be shared.
   * As long as the configuration does not change, keep the initial result of the
   * quorum check. Otherwise, it might happen that it reaches quorum over time
   * by itself (provided that we keep sharing it and it never changes).
   *
   * If there is a false positive (a popular config being not detected), it will
   * eventually recover as the configuration will changed over time (e.g. after each
   * browser update).
   */
  async _reachedQuorum(config) {
    const newConfig = this._deterministicStringify(config);
    let reachedQuorum = null;

    try {
      const oldValue = await this.aliveConfigStorage.load();
      if (oldValue && newConfig === oldValue.config) {
        reachedQuorum = oldValue.reachedQuorum;
      }
    } catch (e) {
      logger.warn('Ignore errors when reading the old state, but check the quorum again', e);
    }

    if (reachedQuorum === null) {
      reachedQuorum = await this.quorumChecker(newConfig);
      await this.aliveConfigStorage.store({
        config: newConfig,
        reachedQuorum,
      });
    }
    return reachedQuorum;
  }

  _deterministicStringify(config) {
    return JSON.stringify(Object.keys(config).sort().map(x => config[x]));
  }
}
