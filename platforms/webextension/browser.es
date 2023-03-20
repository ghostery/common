/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { window, chrome, browser } from './globals';

export * from './tabs';

export function isTabURL() {
  return false;
}

export function getLocale() {
  return window.navigator.language || window.navigator.userLanguage;
}

export function getBrowserMajorVersion() {
  let raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
  let majorVer = raw ? parseInt(raw[2], 10) : false;
  // Platform `chromium` is used for ghostery build,
  // but it can run in different browsers (chrome, firefox ...)
  if (!majorVer) {
    // try firefox
    raw = navigator.userAgent.match(/Firefox\/([0-9]+)\./);
    majorVer = raw ? parseInt(raw[1], 10) : false;
  }
  return majorVer;
}

export function addSessionRestoreObserver() {}
export function removeSessionRestoreObserver() {}

export function addMigrationObserver() {}
export function removeMigrationObserver() {}

export function getUrlForTab(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.get(Number(tabId), (result) => {
      if (chrome.runtime.lastError) {
        resolve(null);
      } else {
        resolve(result.url);
      }
    });
  });
}

export function getActiveTab() {
  return browser.tabs.query({ active: true, currentWindow: true })
    .then((result) => {
      if (result.length === 0) {
        throw new Error('Result of query for active tab is undefined');
      }

      const tab = result[0];
      return {
        id: tab.id,
        url: tab.url,
      };
    });
}

let firstPartyIsolationEnabled = false;

export function getCookies(url) {
  return new Promise((resolve) => {
    const query = { url };
    if (firstPartyIsolationEnabled) {
      query.firstPartyDomain = null;
    }
    chrome.cookies.getAll(query, (cookies) => {
      // check for firstPartyDomain error. This indicates that first party isolation is enabled.
      // we need to set a firstPartyDomain option on cookie api calls.
      if (chrome.runtime.lastError
          && chrome.runtime.lastError.message
          && chrome.runtime.lastError.message.indexOf('firstPartyDomain') > -1) {
        firstPartyIsolationEnabled = !firstPartyIsolationEnabled;
        resolve(getCookies(url));
      } else {
        resolve(cookies.map(c => c.value).join(';'));
      }
    });
  });
}

export function isDefaultBrowser() {
  if (chrome.cliqz && chrome.cliqz.isDefaultBrowser) {
    return chrome.cliqz.isDefaultBrowser();
  }

  return Promise.resolve(null);
}

export function openLink(win, url, newTab = false, active = true, isPrivate = false) {
  if (isPrivate) {
    chrome.windows.create({ url, incognito: true });
  } else if (newTab) {
    chrome.tabs.create({ url, active });
  } else {
    chrome.windows.getCurrent({ populate: true }, ({ tabs }) => {
      const activeTab = tabs.find(tab => tab.active);
      chrome.tabs.update(activeTab.id, {
        url
      });
    });
  }
}
