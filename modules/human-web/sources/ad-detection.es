/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable import/prefer-default-export */

/**
 * Google pagead aclk look like this:
 * https://www.googleadservices.com/pagead/aclk?sa=L&ai=DChcSEwjNi5bcsbPWAhUW4BsKHUePBAwYABARGgJ3bA&ohost=www.google.de&cid=CAASEuRo7v8yDlI1j5_Xe3oAtyANqQ&sig=AOD64_0I3As2z06whZRtfqOC3PGdhk9SIQ&ctype=5&q=&ved=0ahUKEwjc7JLcsbPWAhVLuhQKHQWpCRcQ9aACCKIB&adurl=
 *
 * This function takes such an url and returns a normalized string
 * (which is no longer an url). Links to identical ads should be
 * normalized to the same string while links to different ads
 * should be mapped to different keys.
 */
export function normalizeAclkUrl(url) {
  // Note: Any base URL could be used here. It is only needed as we want to support
  // also relative URLs.
  const parsed = new URL(url, 'https://www.googleadservices.com');
  if (parsed.pathname !== '/pagead/aclk' && parsed.pathname !== '/aclk') {
    throw new Error(`Expected Google pagead "aclk" URL. Instead got: ${url}`);
  }

  // Ignore the "ved" code, as it seems to change between clicks.
  //
  // For background information about the "ved" code, see
  // https://deedpolloffice.com/blog/articles/decoding-ved-parameter
  //
  // "dct" can also be ignored for the matching.
  const isRelevant = entry => !['ved', 'dct'].includes(entry[0]);
  const relevantParams = [...parsed.searchParams].filter(isRelevant);

  // Combine it into one string. The function itself does not matter as long as it is
  // injective and is agnoistic of the ordering. Here, we will make it look like a query
  // ("key1=val1&key2=val2...").
  return relevantParams.sort().map(x => x.join('=')).join('&');
}
