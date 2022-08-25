/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import App from '../core/app';
import config from '../core/config';
import { isAMO } from '../core/platform';

const CLIQZ = {};

function triggerOnboardingOffers(onInstall) {
  // calls the offers action only if the module is present
  const offersModule = CLIQZ.app.modules['offers-v2'];
  if (offersModule) {
    offersModule.action('triggerOnboardingOffers', onInstall);
  }
}

async function onboarding(details) {
  if (details.reason === 'install' && config.settings.channel !== '99') {
    await CLIQZ.app.ready();

    if (config.settings.SHOW_ONBOARDING_OVERLAY) {
      chrome.tabs.create({});
    }

    triggerOnboardingOffers(true);
  }
}

CLIQZ.app = new App({
  version: chrome.runtime.getManifest().version,
});
window.CLIQZ = CLIQZ;

CLIQZ.app
  .start()
  .then(() => {
    if (isAMO) {
      const prefs = CLIQZ.app.prefs;

      if (prefs.get('humanWebOptOut') === undefined) {
        // default state for HumanWeb should be off
        // for all the users which did not interact with
        // the consent dialog in the past
        prefs.set('humanWebOptOut', true);
      } else {
        // we do not re-ask for consent for users which
        // already stated their desire
        prefs.set('consentDialogShown', true);
      }
    }

    triggerOnboardingOffers(false);
  });

window.addEventListener('pagehide', () => {
  CLIQZ.app.stop();
  chrome.runtime.onInstalled.removeListener(onboarding);
});

const offboardingUrls = config.settings.offboardingURLs;

if (offboardingUrls && offboardingUrls.en) {
  const locale = chrome.i18n.getUILanguage();
  // Use English as default
  const offboardingUrl = offboardingUrls[locale] || offboardingUrls.en;
  chrome.runtime.setUninstallURL(offboardingUrl);
}

chrome.runtime.onInstalled.addListener(onboarding);
