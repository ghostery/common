/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const { JSDOM } = require('jsdom');
const linkedom = require('linkedom');

/**
 * Different implementations of the DOM API.
 *
 * In most cases, all should be close to the browser API, but in edge
 * cases like broken HTML, the results may differ. If possible, we
 * should write with code that works well in all environments.
 */
const mockDocumentWith = {

  // https://github.com/jsdom/jsdom
  jsdom(html) {
    const { window } = new JSDOM('<!DOCTYPE html><p>Test DOM</p>');
    const { document } = window;

    document.open();
    document.write(html);
    document.close();

    return { window, document };
  },

  // https://github.com/WebReflection/linkedom
  linkedom(html) {
    const { window, document } = linkedom.parseHTML(html);
    const noop = () => {};
    window.close = window.close || noop;
    return { window, document };
  },
};

const allAvailableParsers = Object.keys(mockDocumentWith);

module.exports = {
  mockDocumentWith,
  allAvailableParsers,
  allSupportedParsers: allAvailableParsers,
};
