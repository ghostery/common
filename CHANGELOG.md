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
