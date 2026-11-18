import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ui = readFileSync(resolve(root, "JS/Frontend/ui.js"), "utf8");
const auth = readFileSync(resolve(root, "JS/Frontend/auth.js"), "utf8");
const offline = readFileSync(resolve(root, "JS/Frontend/offline.js"), "utf8");

const detailStart = ui.indexOf("export function mostrarDetalleModal(");
const detailEnd = ui.indexOf("\n    const { relay: datosRelay }", detailStart);
const detail = ui.slice(detailStart, detailEnd);
assert.match(detail, /setState\(\{ viewedItems: nextViewed \}\)/);
assert.match(detail, /offline\.saveViewedItem\(activeItem, ownerId\)\.catch/);
assert.doesNotMatch(detail, /offline\.getViewedItems/);

const loadStart = auth.indexOf("function loadUserLocalActivity(user)");
const loadEnd = auth.indexOf("\nfunction handleSessionStorageChange", loadStart);
const load = auth.slice(loadStart, loadEnd);
assert.match(load, /offline\.getSearchHistory\(ownerId\)\.then/);
assert.match(load, /offline\.getViewedItemsResult\(ownerId\)\.then/);
assert.match(load, /result\.available !== true/);
assert.match(load, /retryDelays = \[1500, 5000, 15000\]/);
assert.match(load, /isOwnerCurrent\(\)/);
assert.doesNotMatch(load, /Promise\.all/);

assert.match(auth, /previousOwnerId && previousOwnerId !== nextOwnerId[\s\S]*?searchHistory: \[\], viewedItems: \[\]/);
assert.match(offline, /const DB_VERSION = 5/);
assert.match(offline, /createIndex\('ownerId', 'ownerId'/);
assert.match(offline, /store\.index\('ownerId'\)\.getAll\(owner\)/);
assert.match(offline, /if \(all === null\) return \{ available: false, items: \[\] \}/);
assert.match(offline, /pruneViewedItems_\(owner, records\)/);
assert.match(ui, /viewedSignature/);
assert.match(ui, /lastViewedSignature/);

console.log("RecentlyViewedCarousel: 13/13 PASS");
