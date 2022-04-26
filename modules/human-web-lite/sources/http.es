/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
/* eslint-disable import/prefer-default-export */

const SECOND = 1000;

/**
 * Performs a HTTP Get.
 *
 * Optional:
 * - headers: allows to overwrite headers
 * - redirect: 'follow' or 'manual' (default; i.e. redirects are errors)
 */
export async function anonymousHttpGet(url, {
  headers = null,
  redirect = null,
  timeout = 15 * SECOND,
} = {}) {
  const options = {
    credentials: 'omit',
    mode: 'no-cors',
    redirect: redirect || 'manual',

    // TODO: Or maybe this does work? It is not part of the fetch standard,
    // but I have seen it in some react-native examples.
    // If it works, it could be used if AbortController is not available.
    timeout,
  };

  // The following code overwrite the headers of the request.
  // Note that "fetch" allows to overwrite headers in a simple declarative way,
  // but unfortunately it is limited. For example, it is not possible to
  // overwrite the cookie headers. The following code will work for all
  // type of headers.
  //
  // The matching logic is not perfect but should be fairly accurate.
  // Ideally, we would want to run the handler only for the request that we
  // are about to trigger, but not for any other requests to avoid unintended
  // side-effects. To mitigate the risk, uninstall the handler at the first
  // opportunity: either if it is called or if the request finished
  // (and we know the handle will never be called).
  let webRequestHandler;
  const uninstallHandler = () => {
    if (webRequestHandler) {
      chrome.webRequest.onBeforeSendHeaders.removeListener(webRequestHandler);
      webRequestHandler = null;
    }
  };
  const headerNames = Object.keys(headers || {});
  if (headerNames.length > 0) {
    webRequestHandler = (details) => {
      if (details.url !== url || details.type !== 'xmlhttprequest' || details.method !== 'GET') {
        // does that match the request that we intended to trigger
        return {};
      }

      // match: now we can already deregister the listener
      // (it should not be executed multiple times)
      uninstallHandler();
      const normalizedHeaders = headerNames.map(x => x.toLowerCase());

      /* eslint-disable no-param-reassign */
      details.requestHeaders = details.requestHeaders.filter(
        header => !normalizedHeaders.includes(header.name.toLowerCase())
      );

      headerNames.forEach((name) => {
        details.requestHeaders.push({
          name,
          value: headers[name],
        });
      });

      return {
        requestHeaders: details.requestHeaders
      };
    };
    chrome.webRequest.onBeforeSendHeaders.addListener(webRequestHandler, {
      urls: [url]
    }, ['blocking', 'requestHeaders']);
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Failed to fetch url ${url}: ${response.statusText}`);
    }
    uninstallHandler();
    return response.text();
  } finally {
    uninstallHandler();
  }
}
