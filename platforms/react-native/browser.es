/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NativeModules } from 'react-native';

const nativeWebRequest = NativeModules.WebRequest;
const LocaleConstants = NativeModules.LocaleConstants;
const defaultLocale = 'en';

const formattedLocale = () => {
  const deviceLocale = (NativeModules.I18nManager
    && NativeModules.I18nManager.localeIdentifier
    && typeof NativeModules.I18nManager.localeIdentifier === 'string')
    ? NativeModules.I18nManager.localeIdentifier
    : defaultLocale;
  return deviceLocale.split('_')[0];
};

export function currentURI() {}

export function contextFromEvent() {
  return null;
}

export function isWindowActive() {
  return true;
}

export function checkIsWindowActive(windowID) {
  return nativeWebRequest.isWindowActive(parseInt(windowID, 10));
}

export function addSessionRestoreObserver() {
}

export function removeSessionRestoreObserver() {
}

export function addMigrationObserver() {
}

export function removeMigrationObserver() {
}

export function getLocale() {
  return LocaleConstants ? LocaleConstants.lang : formattedLocale();
}

export function getWindow() {}

export function isTabURL() {
  return false;
}

export function getBrowserMajorVersion() {
  return 100;
}

export function getCookies() {
  return Promise.reject(new Error('Not implemented'));
}

export function isDefaultBrowser() {
  return null;
}

export function openLink() {
}
