/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const Plugin = require('broccoli-plugin');
const path = require('path');
const glob = require('glob');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

const cliqzEnv = require('../cliqz-env');

module.exports = class BroccoliWebpack extends Plugin {
  constructor(inputNode, options = {}) {
    super([inputNode], {
      annotation: options.annotation,
    });

    this.builderConfig = options.builderConfig || {
      globalDeps: {}
    };
  }

  build() {
    const inputPath = this.inputPaths[0];
    const outputPath = this.outputPath;

    console.log('*********************** Bundling Process Started *******************************');
    const bundles = glob.sync('**/*.bundle.js', {
      cwd: inputPath,
      follow: true,
    });
    const bundleBuildCounter = bundles.length;
    const entries = {};

    if (bundleBuildCounter === 0) {
      return Promise.resolve();
    }

    bundles.forEach((bundle) => {
      entries[bundle] = path.join(inputPath, bundle);
    });

    return new Promise((resolve, reject) => {
      const t1 = new Date().getTime();

      webpack({
        mode: cliqzEnv.DEVELOPMENT ? 'development' : 'production',
        entry: entries,
        output: {
          filename: '[name]',
          path: outputPath
        },
        ...(cliqzEnv.SOURCE_MAPS ? { devtool: 'source-map' } : ({})),
        resolve: {
          symlinks: false,
          modules: [
            path.resolve(process.cwd(), 'node_modules'),
          ],
          alias: {
            '@cliqz-oss/dexie': '@cliqz-oss/dexie/dist/dexie.min.js',
            '@cliqz/url-parser': '@cliqz/url-parser/dist/url-parser.esm.min.js',
            chai: 'chai/chai.js',
            'chai-dom': 'chai-dom/chai-dom.js',
            'math-expression-evaluator': 'math-expression-evaluator/dist/browser/math-expression-evaluator.min.js',
            pako: 'pako/dist/pako.js',
            'plugin-json': 'systemjs-plugin-json/json.js',
            'rxjs/operators': 'rxjs/operators/index',
          },
          fallback: {
            fs: 'empty',
          },
        },
        externals: this.builderConfig.globalDeps,
        optimization: {
          minimizer: [
            new TerserPlugin({
              sourceMap: cliqzEnv.SOURCE_MAPS,
            }),
          ],
          // For production build webpack normally combines all dependencies
          // within a single function.
          // Also it tries to optimize the code in a way of the less variables the better.
          // In our case with RxJs that has resulted into a runtime error which was also impossible
          // to catch while running tests (since history search is covered with mocked data).
          // Disabling module concatenation is telling webpack to put every module dependency in a
          // separate function which in turn is called whenever it needs.
          // This results almost the same size of a final bundle but without fancy combined sources.
          concatenateModules: false,
          // Some npm packages might be marked as having sideEffects (in a package.json).
          // This is telling webpack that some unpredictable (come'n, npm is open source!) behaviour
          // could happen so that webpack could avoid including that module in its' bundle.
          sideEffects: false,
        }
      }, (error) => {
        if (error) {
          console.log(error);
          return reject(error);
        }

        const t2 = new Date().getTime();
        console.dir(`Built: took ${(t2 - t1) / 1000} seconds`, { colors: true });

        console.log(Object.keys(entries).join('\n'));
        console.dir(`${bundleBuildCounter} bundle(s) has(have) been created`, { colors: true });
        console.log('*********************** Bundling Process Finished *******************************');
        return resolve();
      });
    });
  }
};
