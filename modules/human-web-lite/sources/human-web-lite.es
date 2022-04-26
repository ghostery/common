/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Patterns from './patterns';
import PatternsUpdater from './patterns-updater';
import Sanitizer from './sanitizer';
import UrlAnalyzer from './url-analyzer';
import MessageSender from './message-sender';
import DuplicateDetector from './duplicate-detector';
import SearchExtractor from './search-extractor';
import JobScheduler from './job-scheduler';
import PersistedHashes from '../hpn-lite/persisted-hashes';
import logger from './logger';

export default class HumanWebLite {
  constructor({ config, storage, hpn }) {
    // Defines whether Human Web is fully initialized and has permission
    // to collect data.
    this.isActive = false;

    this.patterns = new Patterns();
    this.patternsUpdater = new PatternsUpdater({
      config,
      patterns: this.patterns,
      storage,
      storageKey: 'patterns',
    });

    this.sanitizer = new Sanitizer(config);
    this.urlAnalyzer = new UrlAnalyzer(this.patterns);
    this.persistedHashes = new PersistedHashes({
      storage,
      storageKey: 'deduplication_hashes',
    });
    this.duplicateDetector = new DuplicateDetector(this.persistedHashes);

    this.messageSender = new MessageSender(this.duplicateDetector, hpn);
    this.searchExtractor = new SearchExtractor({
      config,
      patterns: this.patterns,
      sanitizer: this.sanitizer,
      persistedHashes: this.persistedHashes,
    });
    this.jobScheduler = new JobScheduler(this.messageSender, this.searchExtractor);
  }

  async init() {
    await this.patternsUpdater.init();
    this.isActive = true;
  }

  unload() {
    this.isActive = false;
    this.duplicateDetector.unload();

    // Attempt to finish all pending changes, though it would not
    // be critical if we loose them. Important operations should
    // already trigger a write operation.
    this.persistedHashes.flush();
  }

  /**
   * Should be called when the user navigates to a new page.
   *
   * Calling this function alone should not have a noticable
   * performance impact (both in terms of CPU or network).
   *
   * @return true iff new jobs were registered
   */
  async analyzeUrl(url) {
    if (!this.isActive) {
      return false;
    }

    const { found, ...doublefetchJob } = this.urlAnalyzer.parseSearchLinks(url);
    if (!found) {
      return false;
    }

    logger.debug('Potential Human Web content found on URL:', url);
    await this.jobScheduler.registerJob(doublefetchJob);
    return true;
  }

  async processPendingJobs() {
    await this._ensurePatternsAreUpToDate();
    return this.jobScheduler.processPendingJobs();
  }

  async _ensurePatternsAreUpToDate() {
    // Currently, the PatternsUpdater needs to be externally triggered.
    // This implementation detail could be avoided, if the PatternsUpdater
    // could use a browser API like timers in persistent background pages
    // or the Alert API (Manifest V3).
    // The "update" function is a quick operation unless for the rare
    // situation that the patterns are outdated and need to be fetched.
    // Thus, there should be no harm in calling it here.
    await this.patternsUpdater.update();
  }
}
