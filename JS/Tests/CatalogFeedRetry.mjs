import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const api = readFileSync(resolve(root, 'JS/Frontend/api-config.js'), 'utf8');
const helper = readFileSync(resolve(root, 'JS/Frontend/catalogRequest.js'), 'utf8');
const fn = api.slice(api.indexOf('export async function getCatalogChanges('), api.indexOf('\n}', api.indexOf('export async function getCatalogChanges(')) + 2);
assert.match(api, /import \{ runCatalogRequestWithRetry \} from '\.\/catalogRequest\.js'/);
assert.match(fn, /runCatalogRequestWithRetry\(async signal =>/);
assert.match(fn, /timeoutMs:\s*5000/);
assert.match(fn, /retries:\s*2/);
assert.match(fn, /baseDelayMs:\s*200/);
assert.match(fn, /signal\s*[,}]/);
assert.match(helper, /status === 408 \|\| status === 429 \|\| status >= 500/);
assert.match(fn, /error\.status = status/);
assert.match(fn, /CATALOG_FEED_INVALID_JSON/);
console.log('CatalogFeedRetry: 9/9 PASS');
