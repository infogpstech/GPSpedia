import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const source = readFileSync(resolve(root, "JS/Frontend/offline.js"), "utf8");
assert.ok(!source.includes("purgeExpiredThumbnailEntries"), "la purga global por imagen debe retirarse");
const thumbnailTransaction = source.match(/async function runThumbnailStoreTransaction\([\s\S]*?\n\}/);
assert.ok(thumbnailTransaction, "debe existir la transacción de miniaturas");
assert.match(thumbnailTransaction[0], /initDB\(\{\s*silent:\s*true\s*\}\)/,
    "el fallo del almacén opcional de miniaturas no debe emitir avisos globales");

const getThumbnail = source.match(/export async function getThumbnail\([\s\S]*?\n\}/);
const compress = source.match(/async function compressAndStoreThumbnailOnce_\([\s\S]*?\n\}/);
assert.ok(getThumbnail && compress, "deben existir los lectores y compresores esperados");
assert.ok(!getThumbnail[0].includes("getAll()"), "la lectura individual no debe recorrer toda la caché");
assert.ok(!compress[0].includes("getAll()"), "la compresión individual no debe recorrer toda la caché");
assert.ok(!compress[0].includes("rawFileId"), "el helper interno debe recibir el ID ya normalizado");

const wrapper = source.match(/export async function compressAndStoreThumbnail\([\s\S]*?\n\}/);
assert.ok(wrapper, "debe existir el wrapper público de compresión");
let started = 0;
const inFlight = new Map();
const run = new Function(
    "normalizeId", "normalizeThumbnailSize", "buildThumbnailCacheKey",
    "compressAndStoreThumbnailOnce_", "thumbnailCompressionInFlight_",
    wrapper[0].replace("export async function", "async function") + "\nreturn compressAndStoreThumbnail;"
)(
    value => String(value || "").replace(/^id:/, ""),
    value => Number(value) || 400,
    (id, width) => id + "::w" + width,
    async (url, id, width) => { started += 1; await Promise.resolve(); return { id, width }; },
    inFlight
);
const [first, second] = await Promise.all([
    run("https://image.test/a", "id:vehicle-a", 300),
    run("https://image.test/b", "vehicle-a", 300)
]);
assert.equal(started, 1, "solicitudes concurrentes de la misma variante comparten una sola compresión");
assert.deepEqual(first, second);
assert.equal(inFlight.size, 0, "el registro single-flight se limpia al terminar");

const lru = source.match(/async function evictLeastRecentlyUsedThumbnails\(\) \{[\s\S]*?\n\}/);
assert.ok(lru, "debe existir la evicción LRU");
const removed = [];
const entries = [
    { key: "expired::w300", expired: true, blob: { size: 1 }, cachedAt: 1 },
    { key: "old::w300", expired: false, blob: { size: 1 }, cachedAt: 2, lastAccessedAt: 2 },
    { key: "new::w300", expired: false, blob: { size: 1 }, cachedAt: 3, lastAccessedAt: 3 }
];
const store = { getAll: () => entries, delete: key => removed.push(key) };
const lruFn = new Function(
    "runThumbnailStoreTransaction", "isThumbnailExpired", "MAX_THUMBNAIL_ENTRIES",
    lru[0] + "\nreturn evictLeastRecentlyUsedThumbnails;"
)(
    async (mode, callback) => callback(store, entries),
    entry => entry.expired,
    1
);
const evicted = await lruFn();
assert.deepEqual(removed, ["expired::w300", "old::w300"]);
assert.equal(evicted, 1);
console.log("ThumbnailCacheDeduplication: 3/3 PASS — single-flight, lookup acotado y limpieza LRU");
