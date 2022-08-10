/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import injectCosmetics from '../platform/lib/adblocker-cosmetics';
import { registerContentScript } from '../core/content/register';
import { USE_PUSH_INJECTIONS_ON_NAVIGATION_EVENTS } from './config';

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
        if (USE_PUSH_INJECTIONS_ON_NAVIGATION_EVENTS && result) {
          // prevent double-injection of scripts (the adblocker is
          // configured to inject them via tabs.executeScript)
          result.scripts = [];
        }
        return result || {};
      },
    );
  }],
});
