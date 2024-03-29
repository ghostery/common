/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

const expect = chai.expect;
const fc = require('fast-check');

function searchGoDoublefetch(url) {
  return {
    url,
    redirect: 'follow',
    headers: {
      Cookie: 'SOME_DUMMY_VALUE',
    },
  };
}

function fakePatterns() {
  return {
    createDoublefetchRequest(msgType, url) {
      if (msgType === 'search-go') {
        return searchGoDoublefetch(url);
      }
      throw new Error(`Unexpected msgType: ${msgType}`);
    }
  };
}

export default describeModule('human-web-lite/url-analyzer',
  () => ({
    'platform/globals': {
      default: {}
    },
  }),
  () => {
    describe('#UrlAnalyzer', function () {
      let UrlAnalyzer;
      let uut;

      beforeEach(function () {
        UrlAnalyzer = this.module().default;
        const patterns = fakePatterns();
        uut = new UrlAnalyzer(patterns);
      });

      it('should detect the query "trump alaska"', function () {
        const url = 'https://www.google.de/search?source=hp&ei=c1tmXYGgDsXGkwXak4z4BQ&q=trump+alaska&oq=trump+alaska&gs_l=psy-ab.3..0i324j0i3j0i22i30l8.4708.6506..6817...0.0..0.476.1834.2j5j1j1j1......0....1..gws-wiz.......0i131j0.tK4mGhzYgHg&ved=0ahUKEwjBpazHsaXkAhVF46QKHdoJA18Q4dUDCAc&uact=5';
        expect(uut.parseSearchLinks(url)).to.eql({
          found: true,
          type: 'search-go',
          query: 'trump alaska',
          doublefetchRequest: searchGoDoublefetch('https://www.google.de/search?q=trump+alaska'),
        });
      });

      it('should detect query with "+" sign: "a+b"', function () {
        const url = 'https://www.google.com/search?q=a%2Bb&oq=a%2Bb&aqs=chrome..69i57j0l5.9078j0j8&sourceid=chrome&ie=UTF-8#sbfbu=1&pi=a%2Bb';
        expect(uut.parseSearchLinks(url)).to.eql({
          found: true,
          type: 'search-go',
          query: 'a+b',
          doublefetchRequest: searchGoDoublefetch('https://www.google.com/search?q=a%2Bb'),
        });
      });

      it('should detect query with "#" sign: "c# how to read a file"', function () {
        const url = 'https://www.google.com/search?q=c%23+how+to+read+a+file&oq=c%23+how+to+read+a+file&aqs=chrome..69i57j69i58.7270j0j7&sourceid=chrome&ie=UTF-8';
        expect(uut.parseSearchLinks(url)).to.eql({
          found: true,
          type: 'search-go',
          query: 'c# how to read a file',
          doublefetchRequest: searchGoDoublefetch('https://www.google.com/search?q=c%23+how+to+read+a+file'),
        });
      });

      it('should detect query with more special characters', function () {
        const url = 'https://www.google.com/search?q=a%2Bb&oq=a%2Bb&aqs=chrome..69i57j0l5.9078j0j8&sourceid=chrome&ie=UTF-8#sbfbu=1&pi=a%2Bb';
        expect(uut.parseSearchLinks(url)).to.eql({
          found: true,
          type: 'search-go',
          query: 'a+b',
          doublefetchRequest: searchGoDoublefetch('https://www.google.com/search?q=a%2Bb'),
        });
      });

      it('should support queries from auto-completion ("magnus ca" -> "magnus carlsen")', function () {
        const url = 'https://www.google.com/search?q=magnus+carlsen&source=hp&oq=magnus+ca&gs_l=mobile-heirloom-hp.1.1.41j0i512i433i131l2j0i3l2.3398.7907.0.12670.10.8.0.2.2.0.250.1118.1j6j1.8.0....0...1c.1.34.mobile-heirloom-hp..0.10.1209.82wOg7b9tFw';
        expect(uut.parseSearchLinks(url)).to.eql({
          found: true,
          type: 'search-go',
          query: 'magnus carlsen',
          doublefetchRequest: searchGoDoublefetch('https://www.google.com/search?q=magnus+carlsen'),
        });
      });

      it('should not find term queries on non-search pages (no false-positives)', function () {
        const urls = [
          'https://cliqz.com/',
          'about:config',
          'http://127.0.0.1:8080/foo/bar',
          'https://www.google.de/',
          'https://www.google.com/intl/de/gmail/about/',
        ];

        for (const url of urls) {
          expect(uut.parseSearchLinks(url)).to.eql({ found: false });
        }
      });

      it('should support special characters (ascii)', function () {
        fc.assert(fc.property(fc.string(), (text) => {
          fc.pre(text.length > 0 && text === text.trim());
          const encodedText = encodeURIComponent(text);
          const url = `https://www.google.com/search?q=${encodedText}`;

          const { query } = uut.parseSearchLinks(url);
          return query === text;
        }), { numRuns: 100 });
      });

      it('should support special characters (unicode)', function () {
        fc.assert(fc.property(fc.fullUnicodeString(), (text) => {
          fc.pre(text.length > 0 && text === text.trim());
          const encodedText = encodeURIComponent(text);
          const url = `https://www.google.com/search?q=${encodedText}`;

          const { query } = uut.parseSearchLinks(url);
          return query === text;
        }));
      });

      it('should handle all kinds of URLs without throwing exceptions', function () {
        fc.assert(fc.property(fc.webUrl(), (url) => {
          // should not throw
          uut.parseSearchLinks(url);
        }));
      });
    });
  });
