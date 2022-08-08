/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import window from '../core/globals-window';

// TODO: consider using linkedom here as well
// (Note: we need something that works in react-native)
export default function parseHtml(html) {
  if (!parseHtml.domParser) {
    parseHtml.domParser = new window.DOMParser();
  }

  return parseHtml.domParser.parseFromString(html, 'text/html');
}
