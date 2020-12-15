const fetch = require('node-fetch');
const path = require('path');
const { writeFile } = require('fs').promises;

const config = require('../../configs/ghostery.js')
const { ANTITRACKING_BASE_URL } = config.settings;

async function bundleCDNResource(url, path) {
  console.log(`Fetching ${url}`);
  const resp = await fetch(url);
  console.log(`Writing data to ${path}`);
  const responseData = await resp.arrayBuffer();
  await writeFile(path, Buffer.from(responseData));
  return responseData;
}

(async function () {
  await bundleCDNResource(`${ANTITRACKING_BASE_URL}/config.json`, path.resolve(__dirname, 'dist', 'config.json'));
  const update = await bundleCDNResource(`${ANTITRACKING_BASE_URL}/whitelist/2/update.json.gz`, path.resolve(__dirname, 'dist', 'update.json'));
  const { version } = JSON.parse(Buffer.from(update).toString('utf-8'));
  await bundleCDNResource(`${ANTITRACKING_BASE_URL}/whitelist/2/${version}/bloom_filter.gz`, path.resolve(__dirname, 'dist', 'bloom_filter.bin'));
})();
