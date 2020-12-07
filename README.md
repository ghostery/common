# Ghostery common

Shared Javascript modules for the [Ghostery browser extension](https://github.com/ghostery/ghostery-extension/)
and [Ghostery iOS browser](https://github.com/ghostery/user-agent-ios). This is a subset of Cliqz'
[browser-core](https://github.com/cliqz-oss/browser-core) project.

## Build

For use in webextensions:
```bash
./fern.js build configs/ghostery.js
```

For iOS:
```bash
./fern.js build configs/user-agent-ios.js
```

## Test

Unit tests:
```bash
./fern.js test configs/ci/unit-tests.js -l unit-node
```

Browser integration tests:
```bash
./fern.js test configs/ci/integration-tests.js -l firefox-web-ext --firefox /path/to/firefox
```

## License

MPL 2.0.
