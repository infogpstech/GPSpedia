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
    "compressAndStoreThumbnailOnce_", "thumbnailCompressionInFlight_", "thumbnailCompressionQueue",
    wrapper[0].replace("export async function", "async function") + "\nreturn compressAndStoreThumbnail;"
)(
    value => String(value || "").replace(/^id:/, ""),
    value => Number(value) || 400,
    (id, width) => id + "::w" + width,
    async (url, id, width) => { started += 1; await Promise.resolve(); return { id, width }; },
    inFlight,
    { clearPromotion() {}, promote() {}, run(task) { return task(); } }
);
const [first, second] = await Promise.all([
    run("https://image.test/a", "id:vehicle-a", 300),
    run("https://image.test/b", "vehicle-a", 300)
]);
assert.equal(started, 1, "solicitudes concurrentes de la misma variante comparten una sola compresión");
assert.deepEqual(first, second);
assert.equal(inFlight.size, 0, "el registro single-flight se limpia al terminar");

assert.match(source, /const THUMBNAIL_FAILURE_BACKOFF_MS = 5 \* 60 \* 1000/);
assert.match(compress[0], /if\(retryAfter>Date\.now\(\)\)return null/);
assert.match(compress[0], /thumbnailCompressionFailures_\.set\(cacheKey,Date\.now\(\)\+THUMBNAIL_FAILURE_BACKOFF_MS\)/);
assert.match(compress[0], /const queuedCached=await readFreshThumbnail\(cacheKey\)/);
assert.match(wrapper[0], /thumbnailCompressionInFlight_\.set\(cacheKey, operation\)/);
assert.match(wrapper[0], /thumbnailCompressionInFlight_\.delete\(cacheKey\)/);

const lru = source.match(/async function evictLeastRecentlyUsedThumbnails\(\) \{[\s\S]*?\n\}/);
assert.ok(lru, "debe existir la evicción LRU");
const removed = [];
const entries = [
    { key: "expired::w300", expired: true, blob: { size: 1 }, cachedAt: 1 },
    { key: "old::w300", expired: false, blob: { size: 1 }, cachedAt: 2, lastAccessedAt: 2 },
    { key: "new::w300", expired: false, blob: { size: 1 }, cachedAt: 3, lastAccessedAt: 3 }
];
const store = {
    count: () => entries.length,
    getAll: () => {
        const request = {};
        Object.defineProperty(request, "onsuccess", { set(callback) { request.result = entries; callback(); } });
        return request;
    },
    delete: key => removed.push(key)
};
const lruFn = new Function(
    "runThumbnailStoreTransaction", "isThumbnailExpired", "MAX_THUMBNAIL_ENTRIES",
    lru[0] + "\nreturn evictLeastRecentlyUsedThumbnails;"
)(
    async (requestFactory, callback) => callback(store, requestFactory(store)),
    entry => entry.expired,
    1
);
const evicted = await lruFn();
assert.deepEqual(removed, ["expired::w300", "old::w300"]);
assert.equal(evicted.removed, 1);

let fullScans = 0;
const underLimitStore = { count: () => 1, getAll: () => { fullScans++; throw new Error("no debe llamar getAll bajo el límite"); }, delete() {} };
const underLimit = new Function(
    "runThumbnailStoreTransaction", "isThumbnailExpired", "MAX_THUMBNAIL_ENTRIES",
    lru[0] + "\nreturn evictLeastRecentlyUsedThumbnails;"
)(
    async (requestFactory, callback) => callback(underLimitStore, requestFactory(underLimitStore)),
    entry => false,
    1
);
const skippedScan = await underLimit();
assert.equal(skippedScan.removed, 0);
assert.equal(fullScans, 0, "El almacén bajo el límite no debe descargar todas las miniaturas.");
console.log("ThumbnailCacheDeduplication: 22/22 PASS — single-flight, backoff, lookup acotado y LRU condicionado por count");
