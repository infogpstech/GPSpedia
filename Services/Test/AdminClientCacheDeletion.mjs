import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const uiSource = readFileSync(new URL("../../ui.js", import.meta.url), "utf8");
const offlineSource = readFileSync(new URL("../../offline.js", import.meta.url), "utf8");
const serviceWorkerSource = readFileSync(new URL("../../service-worker.js", import.meta.url), "utf8");

const cacheHelperStart = uiSource.indexOf("async function clearServiceWorkerRuntimeCache_(");
const cacheHelperEnd = uiSource.indexOf("\nexport { createRichTextToolbar", cacheHelperStart);
assert.ok(cacheHelperStart >= 0 && cacheHelperEnd > cacheHelperStart, "No se encontró clearServiceWorkerRuntimeCache_.");
const clearServiceWorkerRuntimeCache_ = new Function(
    uiSource.slice(cacheHelperStart, cacheHelperEnd) + "\nreturn clearServiceWorkerRuntimeCache_;"
)();

const clearStoresMatch = offlineSource.match(/const REBUILDABLE_CLIENT_CACHE_STORES = Object\.freeze\([\s\S]*?\);\s*\/\*\*[\s\S]*?export async function clearRebuildableClientCache\(\) \{[\s\S]*?\n\}/);
assert.ok(clearStoresMatch, "No se encontró clearRebuildableClientCache.");
const clearRebuildableClientCache = new Function("initDB",
    clearStoresMatch[0].replace("export async function", "async function") +
    "\nreturn clearRebuildableClientCache;"
);

let passed = 0;
async function check(name, fn) {
    await fn();
    passed++;
    console.log("PASS " + name);
}
function createDatabase(options = {}) {
    const calls = { transactions: [], cleared: [] };
    const available = options.stores || ["catalog","searchHistory","viewedItems","thumbnails","validationCache","adminLocalState"];
    const database = {
        objectStoreNames: { contains: name => available.includes(name) },
        transaction(names, mode) {
            calls.transactions.push({ names: names.slice(), mode });
            const tx = {
                error: options.error ? { message: options.error } : null,
                objectStore(name) {
                    return { clear() {
                        if (options.throwOnClear === name) throw new Error("clear failed: " + name);
                        calls.cleared.push(name);
                    }};
                },
                abort() { this.aborted = true; }
            };
            Promise.resolve().then(() => {
                if (options.error) { if (tx.onerror) tx.onerror(); }
                else if (tx.oncomplete) tx.oncomplete();
            });
            return tx;
        }
    };
    return { database, calls };
}
class FakeMessageChannel {
    constructor() {
        this.port1 = { close() {} };
        this.port2 = { close() {}, peer: this.port1 };
    }
}

await check("IndexedDB limpia solo almacenes reconstruibles y espera transaction.oncomplete", async () => {
    const h = createDatabase();
    const clear = clearRebuildableClientCache(async () => h.database);
    const promise = clear();
    assert.deepEqual(await promise, {
        status: "success",
        stores: ["catalog","searchHistory","viewedItems","thumbnails","validationCache"]
    });
    assert.deepEqual(h.calls.transactions, [{
        names: ["catalog","searchHistory","viewedItems","thumbnails","validationCache"], mode: "readwrite"
    }]);
    assert.deepEqual(h.calls.cleared, ["catalog","searchHistory","viewedItems","thumbnails","validationCache"]);
    assert.equal(h.calls.cleared.includes("adminLocalState"), false);
});

await check("Un fallo transaccional no se presenta como limpieza confirmada", async () => {
    const h = createDatabase({ error: "simulated transaction failure" });
    const clear = clearRebuildableClientCache(async () => h.database);
    const result = await clear();
    assert.equal(result.status, "error");
    assert.match(result.message, /simulated transaction failure/);
    assert.deepEqual(result.stores, []);
});

await check("Un almacén ausente se omite sin borrar ni recrear estado administrativo", async () => {
    const h = createDatabase({ stores: ["adminLocalState"] });
    const clear = clearRebuildableClientCache(async () => h.database);
    assert.deepEqual(await clear(), { status: "success", stores: [] });
    assert.equal(h.calls.transactions.length, 0);
    assert.equal(h.calls.cleared.length, 0);
});

await check("La limpieza de Cache Storage solicita confirmación al Service Worker activo", async () => {
    let sent = null;
    const worker = { postMessage(message, ports) {
        sent = message;
        Promise.resolve().then(() => ports[0].peer.onmessage({ data: { status: "success", removedCount: 4, preservedCount: 12 } }));
    }};
    const windowRef = {
        navigator: { serviceWorker: { controller: worker, getRegistration: async () => ({ active: worker }) } },
        MessageChannel: FakeMessageChannel,
        setTimeout, clearTimeout
    };
    const result = await clearServiceWorkerRuntimeCache_(windowRef);
    assert.deepEqual(sent, { type: "GPSEPEDIA_CLEAR_RUNTIME_CACHE" });
    assert.deepEqual(result, { status: "success", removedCount: 4, preservedCount: 12 });
});

await check("Sin Service Worker activo no se afirma que Cache Storage fue limpiado", async () => {
    const result = await clearServiceWorkerRuntimeCache_({
        navigator: { serviceWorker: { controller: null, getRegistration: async () => null } },
        MessageChannel: FakeMessageChannel,
        setTimeout, clearTimeout
    });
    assert.equal(result.status, "unavailable");
});

await check("El handler limpia solo cachés conocidas y preserva sesión y operaciones pendientes", async () => {
    const start = uiSource.indexOf("// Limpiar únicamente cachés reconstruibles del cliente");
    const end = uiSource.indexOf("// Ejecutar únicamente las limpiezas seleccionadas", start);
    assert.ok(start >= 0 && end > start);
    const handler = uiSource.slice(start, end);
    assert.ok(handler.includes("await offline.clearRebuildableClientCache()"));
    for (const key of ["gpsepedia_catalog_cache","gpsepedia_pys_cache","gpsepedia_pys_cache_updated_at"]) {
        assert.ok(handler.includes('"' + key + '"'), "Falta caché reconstruible " + key);
    }
    for (const protectedKey of ["gpsepedia_session","gpsepedia_pending_operation","gpsepedia_edit_backup","adminImageUploadPending"]) {
        assert.equal(handler.includes(protectedKey), false, "No debe borrar " + protectedKey);
    }
    assert.ok(handler.includes("thumbnailObjectUrls.dispose()"));
    assert.ok(handler.includes("indexedDbSucceeded && storageSucceeded && cacheStorageResult.status === \"success\""));
    assert.ok(handler.indexOf("cacheStorageResult.status === \"success\"") < handler.indexOf("window.location.reload()"));
    assert.ok(handler.includes("adminLocalState conservado"));
    assert.equal(uiSource.includes("deleteIndexedDatabase_"), false);
});

await check("El Service Worker conserva el shell offline y elimina solo respuestas temporales GPSpedia", async () => {
    assert.ok(serviceWorkerSource.includes("GPSEPEDIA_CLEAR_RUNTIME_CACHE"));
    assert.ok(serviceWorkerSource.includes("[...CORE_ASSETS,...OPTIONAL_ASSETS]"));
    assert.ok(serviceWorkerSource.includes("name.startsWith('gpsepedia-cache-')"));
    assert.ok(serviceWorkerSource.includes("if(keep.has(request.url)){preservedCount++;continue;}"));
    assert.ok(serviceWorkerSource.includes("await cache.delete(request)"));
    assert.ok(serviceWorkerSource.includes("reply.postMessage({status:'success',removedCount,preservedCount})"));
});

console.log("AdminClientCacheDeletion: " + passed + "/" + passed + " PASS");
