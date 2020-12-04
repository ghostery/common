/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import {
  app,
  expect,
  prefs,
  testServer,
  waitFor,
} from '../../core/integration/helpers';

import getDexie from '../../../platform/lib/dexie';

async function mockAnolysisBackend(
  {
    collect = '{}',
  } = {},
  stagingUrl = testServer.getBaseUrl(),
) {
  const Anolysis = app.modules.anolysis.background;
  Anolysis.settings.ANOLYSIS_STAGING_BACKEND_URL = stagingUrl;
  await Promise.all([
    testServer.registerPathHandler('/collect', { result: collect }),
  ]);

  Anolysis.unload();
  await Anolysis.init(Anolysis.settings, Anolysis.browser);
}

async function unMockAnolysisBackend() {
  const Anolysis = app.modules.anolysis.background;
  Anolysis.unload();
  await Anolysis.init(Anolysis.settings, Anolysis.browser);
  await testServer.reset();
}

export default function () {
  const Anolysis = app.modules.anolysis.background;
  const reloadAnolysis = async () => {
    Anolysis.unload();
    await Anolysis.init(Anolysis.settings, Anolysis.browser);
  };

  context('health check', function () {
    context('config_ts is set', function () {
      it('anolysis starts', async () => {
        await reloadAnolysis();
        expect(Anolysis.isAnolysisInitialized()).to.be.true;
      });
    });

    context('config_ts is not set', function () {
      let configTs = null;

      beforeEach(async () => {
        // Remove config_ts
        configTs = prefs.get('config_ts');
        prefs.clear('config_ts');

        await reloadAnolysis();
      });

      afterEach(async () => {
        // Restore config_ts
        prefs.set('config_ts', configTs);
        await reloadAnolysis();
      });

      it('anolysis does not start', async () => {
        expect(Anolysis.isAnolysisInitialized()).to.be.false;
      });
    });

    context('storage is broken', function () {
      beforeEach(async () => {
        await mockAnolysisBackend();

        // Break Dexie (Yay!)
        const Dexie = await getDexie();
        await Dexie.delete('anolysis');
        const db = new Dexie('anolysis');
        db.version(1000000).stores({
          extra: '[foo+bar]',
        });
        await db.open();
        db.close();

        await reloadAnolysis();
      });

      afterEach(async () => {
        await unMockAnolysisBackend();

        // Fix storage
        const Dexie = await getDexie();
        await Dexie.delete('anolysis');

        await reloadAnolysis();
      });

      it('anolysis does not start', async () => {
        expect(Anolysis.isAnolysisInitialized()).to.be.false;

        await waitFor(async () => {
          const hasHits = await testServer.hasHit('/collect');
          if (hasHits) {
            const collectHits = (await testServer.getHits()).get('/collect');
            return (
              collectHits.some(({ body }) => (
                body.type === 'metrics.anolysis.health.exception'
                && body.behavior.autoPrivateMode !== undefined
                && body.meta.ephemerid !== undefined
                && Object.keys(body.meta.demographics).length === 5
              ))
              && collectHits.some(({ body }) => (
                body.type === 'metrics.anolysis.health.storage'
                && body.behavior.autoPrivateMode !== undefined
                && body.meta.ephemerid !== undefined
                && Object.keys(body.meta.demographics).length === 5
              ))
            );
          }
          return false;
        });
      });
    });
  });
}
