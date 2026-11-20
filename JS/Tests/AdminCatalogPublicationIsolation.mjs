import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = source.indexOf("const ADMIN_CATALOG_SOURCE_VERSION_PROPERTY_");
const end = source.indexOf("\nfunction buildLogoCatalogChange_", start);
assert.ok(start >= 0 && end > start, "No se encontró el publicador versionado ADMIN");
const block = source.slice(start, end);

const store = new Map();
const calls = { tryLock: [], releases: 0, single: [], batches: [] };
let lockHeld = false;
let lockAvailable = true;
let failBatchNumber = 0;
let buildErrorFor = null;
const lock = {
    tryLock(timeout) { calls.tryLock.push(timeout); if (!lockAvailable) return false; lockHeld = true; return true; },
    releaseLock() { calls.releases++; lockHeld = false; }
};
const build = id => {
    assert.equal(lockHeld, true, "Los snapshots deben construirse bajo lock");
    if (id === buildErrorFor) throw new Error("snapshot unavailable");
    return { collection: "cortes", recordId: id, operation: "upsert", snapshot: { id } };
};
const publishOne = (service, action, change) => {
    assert.equal(lockHeld, false, "La publicación HTTP debe ejecutarse fuera del lock");
    calls.single.push({ service, action, change });
    return { status: "success" };
};
const publishMany = (service, action, changes) => {
    assert.equal(lockHeld, false, "La publicación batch debe ejecutarse fuera del lock");
    calls.batches.push({ service, action, changes });
    if (failBatchNumber && calls.batches.length === failBatchNumber) throw new Error("Coordinator unavailable");
    return { status: "success" };
};
const api = new Function("LockService", "PropertiesService", "buildAdminCortesCatalogChange_",
    "publishSharedCatalogChange_", "publishSharedCatalogChanges_",
    block + "\nreturn { publishAdminCortesCatalogChange_, publishAdminCortesCatalogChanges_ };")(
    { getScriptLock: () => lock },
    { getScriptProperties: () => ({
        getProperty: key => store.has(key) ? store.get(key) : null,
        setProperty: (key, value) => store.set(key, String(value))
    }) },
    build,
    publishOne,
    publishMany
);
let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }

test("snapshot individual se construye bajo lock y se publica después con versión", () => {
    api.publishAdminCortesCatalogChange_("updateVehicleField", "V-1");
    assert.equal(calls.single.at(-1).change.sourceVersion, 1);
    assert.equal(calls.single.at(-1).service, "ADMIN");
    assert.equal(lockHeld, false);
});

test("batch reserva versiones monotónicas y publica en chunks fuera del lock", () => {
    const ids = Array.from({ length: 60 }, (_, i) => "V-" + (i + 2));
    api.publishAdminCortesCatalogChanges_("applyCortesImageReconciliation", ids);
    assert.deepEqual(calls.batches.slice(-2).map(x => x.changes.length), [50, 10]);
    assert.equal(calls.batches.at(-2).changes[0].sourceVersion, 2);
    assert.equal(calls.batches.at(-1).changes.at(-1).sourceVersion, 61);
    assert.equal(store.get("GPSpedia_ADMIN_CATALOG_SOURCE_VERSION_V1"), "61");
});

test("IDs duplicados del batch se normalizan antes de reservar versiones", () => {
    api.publishAdminCortesCatalogChanges_("applyCortesImageReconciliation", ["V-62", "V-62", "V-63"]);
    const batch = calls.batches.at(-1).changes;
    assert.deepEqual(batch.map(x => x.recordId), ["V-62", "V-63"]);
    assert.deepEqual(batch.map(x => x.sourceVersion), [62, 63]);
});

test("si ADMIN está ocupado publica reset fuera del lock sin esperar", () => {
    lockAvailable = false;
    const before = calls.single.length;
    api.publishAdminCortesCatalogChange_("updateVehicleField", "V-BUSY");
    lockAvailable = true;
    assert.equal(calls.single.length, before + 1);
    assert.deepEqual(calls.single.at(-1).change, { operation: "reset" });
    assert.equal(lockHeld, false);
});

test("si falla la lectura del snapshot publica reset fuera del lock", () => {
    buildErrorFor = "V-ERR";
    const before = calls.single.length;
    api.publishAdminCortesCatalogChange_("updateVehicleField", "V-ERR");
    buildErrorFor = null;
    assert.equal(calls.single.length, before + 1);
    assert.deepEqual(calls.single.at(-1).change, { operation: "reset" });
    assert.equal(lockHeld, false);
});

test("si falla un chunk HTTP el batch termina con reset de recuperación", () => {
    failBatchNumber = calls.batches.length + 2;
    const before = calls.single.length;
    api.publishAdminCortesCatalogChanges_("applyCortesImageReconciliation", ["V-64", "V-65", "V-66"]);
    failBatchNumber = 0;
    assert.equal(calls.single.length, before + 1);
    assert.deepEqual(calls.single.at(-1).change, { operation: "reset" });
    assert.equal(lockHeld, false);
});

console.log("AdminCatalogPublicationIsolation: " + passed + "/" + passed + " PASS");
