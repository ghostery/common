# v1.2.34 (Wed Sep 28 2022)

#### 🐛 Bug Fix

- Fixed message sending in hwlite [#60](https://github.com/ghostery/common/pull/60) ([@philipp-classen](https://github.com/philipp-classen))

#### Authors: 1

- Philipp Claßen ([@philipp-classen](https://github.com/philipp-classen))

---

# v1.2.33 (Mon Sep 26 2022)

#### 🐛 Bug Fix

- Configure the fields for client-side message deduplication in the patterns [#59](https://github.com/ghostery/common/pull/59) ([@philipp-classen](https://github.com/philipp-classen))

#### Authors: 1

- Philipp Claßen ([@philipp-classen](https://github.com/philipp-classen))

---

# v1.2.32 (Mon Sep 26 2022)

#### 🐛 Bug Fix

- hwlite: always use the "q" parameter for doublefetch [#57](https://github.com/ghostery/common/pull/57) ([@philipp-classen](https://github.com/philipp-classen))

#### Authors: 1

- Philipp Claßen ([@philipp-classen](https://github.com/philipp-classen))

---

# v1.2.31 (Tue Aug 30 2022)

#### 🐛 Bug Fix

- Add support for the new "push injections" in the adblocker library [#52](https://github.com/ghostery/common/pull/52) ([@philipp-classen](https://github.com/philipp-classen))

#### Authors: 1

- Philipp Claßen ([@philipp-classen](https://github.com/philipp-classen))

---

# v1.2.30 (Tue Aug 30 2022)

#### 🐛 Bug Fix

- Upgrade .eslintrc (after moving from "babel-eslint" to "@babel/eslint-parser") [#56](https://github.com/ghostery/common/pull/56) ([@philipp-classen](https://github.com/philipp-classen))
- Upgrade to webpack 5 to avoid "NODE_OPTIONS=--openssl-legacy-provider". [#56](https://github.com/ghostery/common/pull/56) ([@philipp-classen](https://github.com/philipp-classen))
- Include Node 18 in CI [#56](https://github.com/ghostery/common/pull/56) ([@philipp-classen](https://github.com/philipp-classen))

#### Authors: 1

- Philipp Claßen ([@philipp-classen](https://github.com/philipp-classen))

---

# v1.2.29 (Fri Aug 26 2022)

#### 🐛 Bug Fix

- Update libraries (upgrade adblocker & fix "npm audit --production" warnings) [#55](https://github.com/ghostery/common/pull/55) ([@philipp-classen](https://github.com/philipp-classen))

#### Authors: 1

- Philipp Claßen ([@philipp-classen](https://github.com/philipp-classen))

---

# v1.2.28 (Fri Aug 26 2022)

#### 🐛 Bug Fix

- Reverting: it is in the context of the background page, while [#54](https://github.com/ghostery/common/pull/54) ([@philipp-classen](https://github.com/philipp-classen))

#### Authors: 1

- Philipp Claßen ([@philipp-classen](https://github.com/philipp-classen))

---

# v1.2.27 (Fri Aug 26 2022)

#### 🐛 Bug Fix

- Follows the recommendation to use "pagehide" instead of "unload": [#53](https://github.com/ghostery/common/pull/53) ([@philipp-classen](https://github.com/philipp-classen))

#### Authors: 1

- Philipp Claßen ([@philipp-classen](https://github.com/philipp-classen))

---

# v1.2.26 (Mon Aug 08 2022)

#### 🐛 Bug Fix

- Replaced hard-coded rules by a DSL [#49](https://github.com/ghostery/common/pull/49) ([@philipp-classen](https://github.com/philipp-classen))

#### Authors: 1

- Philipp Claßen ([@philipp-classen](https://github.com/philipp-classen))

---

# v1.2.25 (Mon Aug 08 2022)

#### 🐛 Bug Fix

- Fixing tests for node16 [#51](https://github.com/ghostery/common/pull/51) ([@philipp-classen](https://github.com/philipp-classen))

#### Authors: 1

- Philipp Claßen ([@philipp-classen](https://github.com/philipp-classen))

---

# v1.2.24 (Mon Aug 01 2022)

#### 🐛 Bug Fix

- workaround for "ghostery-extension": "common" currently must not contain [#48](https://github.com/ghostery/common/pull/48) ([@philipp-classen](https://github.com/philipp-classen))

#### Authors: 1

- Philipp Claßen ([@philipp-classen](https://github.com/philipp-classen))

---

# v1.2.23 (Fri May 06 2022)

#### 🐛 Bug Fix

- Updated patterns and improved the URL normalization (ad-ctr) [#46](https://github.com/ghostery/common/pull/46) ([@philipp-classen](https://github.com/philipp-classen))

#### 🧪 Tests

- Add support for different DOM Parsers in the tests (jsdom, linkedom) [#45](https://github.com/ghostery/common/pull/45) ([@philipp-classen](https://github.com/philipp-classen))
- Upgrade typescript-eslint packages to fix errors on the CI [#44](https://github.com/ghostery/common/pull/44) ([@philipp-classen](https://github.com/philipp-classen))
- Drop support for Node 12, but add support for Node 16 [#44](https://github.com/ghostery/common/pull/44) ([@philipp-classen](https://github.com/philipp-classen))
- Fixes for the tests: [#44](https://github.com/ghostery/common/pull/44) ([@philipp-classen](https://github.com/philipp-classen))
- Update tests [#43](https://github.com/ghostery/common/pull/43) ([@philipp-classen](https://github.com/philipp-classen))

#### Authors: 1

- Philipp Claßen ([@philipp-classen](https://github.com/philipp-classen))

---

# v1.2.22 (Fri Mar 18 2022)

#### 🐛 Bug Fix

- Do not require the history API to be present [#41](https://github.com/ghostery/common/pull/41) ([@philipp-classen](https://github.com/philipp-classen))

#### Authors: 1

- Philipp Claßen ([@philipp-classen](https://github.com/philipp-classen))

---

# v1.2.21 (Tue Mar 01 2022)

#### 🐛 Bug Fix

- Upgrade npm on the CI to avoid [#38](https://github.com/ghostery/common/pull/38) ([@philipp-classen](https://github.com/philipp-classen))
- Regenerate package-lock.json with newer npm version [#38](https://github.com/ghostery/common/pull/38) ([@philipp-classen](https://github.com/philipp-classen))
- Fixes warnings reported by "npm audit" as critical. [#38](https://github.com/ghostery/common/pull/38) ([@philipp-classen](https://github.com/philipp-classen))

#### 🧪 Tests

- Update test for "snippet" [#40](https://github.com/ghostery/common/pull/40) ([@philipp-classen](https://github.com/philipp-classen))
- Update hw tests [#39](https://github.com/ghostery/common/pull/39) ([@philipp-classen](https://github.com/philipp-classen))

#### Authors: 1

- Philipp Claßen ([@philipp-classen](https://github.com/philipp-classen))

---

# v1.2.20 (Wed Jan 26 2022)

#### 🐛 Bug Fix

- Improve monitoring ("alive" signal in HW & Edge browser detection in Antitracking) [#35](https://github.com/ghostery/common/pull/35) ([@philipp-classen](https://github.com/philipp-classen))

#### Authors: 1

- Philipp Claßen ([@philipp-classen](https://github.com/philipp-classen))

---

# v1.2.19 (Wed Dec 08 2021)

#### 🐛 Bug Fix

- Human Web: tests for action snippet [#34](https://github.com/ghostery/common/pull/34) ([@chrmod](https://github.com/chrmod) [@philipp-classen](https://github.com/philipp-classen))

#### Authors: 2

- Krzysztof Modras ([@chrmod](https://github.com/chrmod))
- Philipp Claßen ([@philipp-classen](https://github.com/philipp-classen))

---

# v1.2.18 (Wed Dec 08 2021)

#### 🐛 Bug Fix

- Update tests [#33](https://github.com/ghostery/common/pull/33) ([@philipp-classen](https://github.com/philipp-classen))

#### Authors: 1

- Philipp Claßen ([@philipp-classen](https://github.com/philipp-classen))

---

# v1.2.17 (Mon Nov 15 2021)

#### 🐛 Bug Fix

- Update tests [#32](https://github.com/ghostery/common/pull/32) ([@philipp-classen](https://github.com/philipp-classen))

#### Authors: 1

- Philipp Claßen ([@philipp-classen](https://github.com/philipp-classen))

---

# v1.2.16 (Tue Oct 26 2021)

#### 🐛 Bug Fix

- Human Web: rel-query remove urls [#31](https://github.com/ghostery/common/pull/31) ([@chrmod](https://github.com/chrmod))

#### Authors: 1

- Krzysztof Jan Modras ([@chrmod](https://github.com/chrmod))

---

# v1.2.15 (Thu Oct 21 2021)

#### 🐛 Bug Fix

- Human Web: new action 'bolded' [#30](https://github.com/ghostery/common/pull/30) ([@chrmod](https://github.com/chrmod))

#### Authors: 1

- Krzysztof Jan Modras ([@chrmod](https://github.com/chrmod))

---

# v1.2.14 (Wed Oct 13 2021)

#### 🐛 Bug Fix

- Human Web Lite: simplify the pattern [#29](https://github.com/ghostery/common/pull/29) ([@chrmod](https://github.com/chrmod))

#### Authors: 1

- Krzysztof Jan Modras ([@chrmod](https://github.com/chrmod))

---

# v1.2.13 (Wed Oct 13 2021)

#### 🐛 Bug Fix

- Human Web Lite: extract data from mobile website [#28](https://github.com/ghostery/common/pull/28) ([@chrmod](https://github.com/chrmod))

#### Authors: 1

- Krzysztof Jan Modras ([@chrmod](https://github.com/chrmod))

---

# v1.2.12 (Tue Oct 12 2021)

#### 🐛 Bug Fix

- Human Web Lite: update patterns [#27](https://github.com/ghostery/common/pull/27) ([@chrmod](https://github.com/chrmod))
- removed new test page [#26](https://github.com/ghostery/common/pull/26) ([@chrmod](https://github.com/chrmod))
- Human Web: remove ads_b action [#26](https://github.com/ghostery/common/pull/26) ([@chrmod](https://github.com/chrmod))

#### Authors: 1

- Krzysztof Jan Modras ([@chrmod](https://github.com/chrmod))

---

# v1.2.11 (Wed Oct 06 2021)

#### 🐛 Bug Fix

- Human Web: ads_D tests [#25](https://github.com/ghostery/common/pull/25) ([@chrmod](https://github.com/chrmod))
- Human Web: fix ads_A pattern [#25](https://github.com/ghostery/common/pull/25) ([@chrmod](https://github.com/chrmod))
- Human Web: add missing keyword to query action [#25](https://github.com/ghostery/common/pull/25) ([@chrmod](https://github.com/chrmod))
- Human Web: new action rel-query [#25](https://github.com/ghostery/common/pull/25) ([@chrmod](https://github.com/chrmod))

#### Authors: 1

- Krzysztof Jan Modras ([@chrmod](https://github.com/chrmod))

---

# v1.2.10 (Thu Sep 02 2021)

#### 🐛 Bug Fix

- HumanWeb: query-am pattern update [#24](https://github.com/ghostery/common/pull/24) ([@chrmod](https://github.com/chrmod))

#### Authors: 1

- Krzysztof Jan Modras ([@chrmod](https://github.com/chrmod))

---

# v1.2.9 (Wed Aug 11 2021)

#### 🐛 Bug Fix

- Human-web: update img-p pattern tests [#23](https://github.com/ghostery/common/pull/23) ([@chrmod](https://github.com/chrmod))

#### Authors: 1

- Krzysztof Jan Modras ([@chrmod](https://github.com/chrmod))

---

# v1.2.8 (Thu Aug 05 2021)

#### 🐛 Bug Fix

- Human Web: Fix 'age' pattern [#22](https://github.com/ghostery/common/pull/22) ([@chrmod](https://github.com/chrmod))

#### Authors: 1

- Krzysztof Jan Modras ([@chrmod](https://github.com/chrmod))

---

# v1.2.7 (Thu Jul 29 2021)

#### 🐛 Bug Fix

- Human Web: img action pattern fix [#21](https://github.com/ghostery/common/pull/21) ([@chrmod](https://github.com/chrmod))

#### Authors: 1

- Krzysztof Jan Modras ([@chrmod](https://github.com/chrmod))

---

# v1.2.6 (Thu Jul 29 2021)

#### 🐛 Bug Fix

- Human Web: update pattern for img action [#20](https://github.com/ghostery/common/pull/20) ([@chrmod](https://github.com/chrmod))

#### Authors: 1

- Krzysztof Jan Modras ([@chrmod](https://github.com/chrmod))

---

# v1.2.5 (Mon Jul 19 2021)

#### 🐛 Bug Fix

- HumanWeb: update videos-p pattern tests [#18](https://github.com/ghostery/common/pull/18) ([@chrmod](https://github.com/chrmod))

#### Authors: 1

- Krzysztof Jan Modras ([@chrmod](https://github.com/chrmod))

---

# v1.2.4 (Thu Apr 29 2021)

#### 🐛 Bug Fix

- Fix HW patterns [#17](https://github.com/ghostery/common/pull/17) ([@remusao](https://github.com/remusao))

#### Authors: 1

- Rémi ([@remusao](https://github.com/remusao))

---

# v1.2.3 (Tue Mar 16 2021)

#### 🐛 Bug Fix

- Update tests + fix title pattern [#16](https://github.com/ghostery/common/pull/16) ([@remusao](https://github.com/remusao))

#### 🧪 Tests

- Update Human Web tests [#15](https://github.com/ghostery/common/pull/15) ([@philipp-classen](https://github.com/philipp-classen))

#### Authors: 2

- Philipp Claßen ([@philipp-classen](https://github.com/philipp-classen))
- Rémi ([@remusao](https://github.com/remusao))

---

# v1.2.2 (Fri Feb 26 2021)

#### 🐛 Bug Fix

- Rename bloom_filter.bin to bloom_filter.dat [#13](https://github.com/ghostery/common/pull/13) ([@philipp-classen](https://github.com/philipp-classen))

#### Authors: 1

- Philipp Claßen ([@philipp-classen](https://github.com/philipp-classen))

---

# v1.2.1 (Tue Jan 26 2021)

### Release Notes

#### Update adblocker to v1.20 to bring initial procedural filters support ([#12](https://github.com/ghostery/common/pull/12))

Add initial support for extended CSS selectors (a.k.a. procedural filters) as well as the `:remove()` modifier for element hiding rules (note: the already supported `:style` modified now also works with extended CSS selectors). The following new pseudo-classes are implemented: `:has` (and its alias `:if`), `:has-text` (both string and RegExp literals), and `:not` (whenever its argument is also an extended selector, otherwise fallback to native implementation).

Caveats:
* Loading of extended css filters is disabled by default and needs to be toggled using the `loadExtendedSelectors` option while [initializing the blocker instance](https://github.com/cliqz-oss/adblocker/blob/3361723138f40c3cb96b4c6e611f2b030f75d891/packages/adblocker-webextension-example/background.ts#L61).
* These news selectors are currently only supported by `WebExtensionBlocker` (support for Puppeteer, Electron and Playwright is not planned at this time but help from the community would be greatly appreciated).

Miscellaneous changes:
* Removal of unused `injectCSSRule` helper.
* Replace Closure compiler by Terser.

---

#### 🐛 Bug Fix

- Update adblocker to v1.20 to bring initial procedural filters support [#12](https://github.com/ghostery/common/pull/12) ([@remusao](https://github.com/remusao))

#### Authors: 1

- Rémi ([@remusao](https://github.com/remusao))

---

# v1.2.0 (Fri Dec 18 2020)

#### 🚀 Enhancement

- Update antitracking resources [#11](https://github.com/ghostery/common/pull/11) ([@sammacbeth](https://github.com/sammacbeth))
- adblocker config pref to disable list update from CDN [#11](https://github.com/ghostery/common/pull/11) ([@sammacbeth](https://github.com/sammacbeth))
- Drop cliqz-config from antitracking services. [#11](https://github.com/ghostery/common/pull/11) ([@sammacbeth](https://github.com/sammacbeth))

#### Authors: 1

- Sam Macbeth ([@sammacbeth](https://github.com/sammacbeth))

---

# v1.1.0 (Thu Dec 17 2020)

#### 🚀 Enhancement

- Allow antitracking to work without fetching resources from the CDN [#7](https://github.com/ghostery/common/pull/7) ([@sammacbeth](https://github.com/sammacbeth))

#### 🐛 Bug Fix

- Publishing: Do not fetch resources before publish [#10](https://github.com/ghostery/common/pull/10) ([@sammacbeth](https://github.com/sammacbeth))
- Fetch git tags for auto publishing [#9](https://github.com/ghostery/common/pull/9) ([@sammacbeth](https://github.com/sammacbeth))

#### Authors: 1

- Sam Macbeth ([@sammacbeth](https://github.com/sammacbeth))

---

# v1.0.1 (Fri Dec 11 2020)

#### 🐛 Bug Fix

- Set auto base branch [#8](https://github.com/ghostery/common/pull/8) ([@sammacbeth](https://github.com/sammacbeth))

#### Authors: 1

- Sam Macbeth ([@sammacbeth](https://github.com/sammacbeth))
