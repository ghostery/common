/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import injectCosmetics from '../platform/lib/adblocker-cosmetics';
import { registerContentScript } from '../core/content/register';

registerContentScript({
  module: 'adblocker',
  matches: [
    'http://*/*',
    'https://*/*',
  ],
  matchAboutBlank: true,
  allFrames: true,
  js: [(window, chrome, CLIQZ) => {
    /**
     * This function will immediatly query the background for cosmetics (scripts,
     * CSS) to inject in the page using its third argument function; then proceed
     * to the injection. It will also monitor the DOM using a MutationObserver to
     * know which cosmetics/scriptlets to inject.
     */
    injectCosmetics(
      window,
      true, /* enable mutation observer */
      async (payload) => {
        const result = await CLIQZ.app.modules.adblocker.action('getCosmeticsFilters', payload);
        return result || {};
      },
    );
  }],
});

/**
 * Temporary workaround for a problem with Twitter that we detected after publishing
 * the changes here (8th December 2022):
 * https://www.ghostery.com/blog/how-to-read-tweets-without-logging-in
 *
 * As an unintended side-effect, we are running in a situation now that the Twitter UI
 * sometimes doesn't refresh (e.g. if you are scrolling down quickly). This is a hack
 * to force a resize event every two seconds, which will sync the Twitter UI and make the
 * content appear.
 */
function fixTwitterLostUpdates() {
  setInterval(() => {
    window.dispatchEvent(new Event('resize'));
  }, 2000);
}

registerContentScript({
  module: 'human-web',
  matches: [
    'https://twitter.com/*',
  ],
  js: [fixTwitterLostUpdates],
  allFrames: false,
});
