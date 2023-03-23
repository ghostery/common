/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const urls = require('../common/urls-ghostery');
const ciUrl = require('./common/urls');

module.exports = {
  platform: 'webextension',
  specific: 'browser',
  baseURL: '/modules/',
  testsBasePath: './build/modules',
  settings: { ...urls,
    channel: '99',
    ALLOWED_COUNTRY_CODES: ['de', 'at', 'ch', 'es', 'us', 'fr', 'nl', 'gb', 'it', 'se'],
    HW_CHANNEL: 'test',
    INSIGHTS_INTERNAL: true,
    ...ciUrl },
  default_prefs: { },
  modules: [
    'core',
    'webextension-specific',
    'geolocation',
    'human-web',
    'antitracking',
    'webrequest-pipeline',
    'hpnv2',
    'adblocker',
    'search',
    'insights',
    'integration-tests',
    'content-script-tests',
  ],
  bundles: [
    'hpnv2/worker.wasm.bundle.js',
    'hpnv2/worker.asmjs.bundle.js',
    'core/content-script.bundle.js',
    'webextension-specific/app.bundle.js',
    'human-web/page.bundle.js',
    'human-web/rusha.bundle.js',
    'anti-phishing/phishing-warning.bundle.js',
    'core/content-tests.bundle.js',
    'integration-tests/run.bundle.js',
    'integration-tests/experimental-apis/test-helpers/api.bundle.js',
  ],
  builderDefault: {
    externals: ['@cliqz-oss/dexie'],
    globalDeps: {
      '@cliqz-oss/dexie': 'Dexie',
      chai: 'chai',
    },
  },
};
