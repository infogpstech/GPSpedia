import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = source.indexOf("function publishAdminCatalogChange_(action, buildChange)");
const end = source.indexOf("\nfunction publishAdminCortesCatalogChange_", start);
assert.ok(start >= 0 && end > start, "No se encontraron los publicadores ADMIN");
const block = source.slice(start, end);

const calls = { single: [], batches: [] };
let clock = 1700000000000;
let failBatchNumber = 0;
let buildErrorFor = null;
const build = id => {
    if (id === buildErrorFor) throw new Error("snapshot unavailable");
    return { collection: "cortes", recordId: id, operation: "upsert", snapshot: { id } };
};
const publishOne = (service, action, change) => {
    calls.single.push({ service, action, change });
    return { status: "success" };
};
const publishMany = (service, action, changes) => {
    calls.batches.push({ service, action, changes });
    if (failBatchNumber && calls.batches.length === failBatchNumber) throw new Error("Coordinator unavailable");
    return { status: "success" };
};
const fakeDate = { now: () => clock++ };
const api = new Function("publishSharedCatalogChange_", "publishSharedCatalogChanges_", "Date",
    block + "\nreturn { publishAdminCatalogChange_, publishAdminCatalogChanges_ };")(
    publishOne, publishMany, fakeDate
);
let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }

test("construye y publica snapshot individual sin ScriptLock ni PropertiesService", () => {
    api.publishAdminCatalogChange_("updateVehicleField", () => build("V-1"));
    assert.equal(calls.single.at(-1).service, "ADMIN");
    assert.equal(calls.single.at(-1).change.sourceVersion, 1700000000000);
    assert.doesNotMatch(block, /LockService|PropertiesService|tryLock|waitLock|reserveAdminCatalogSourceVersionsLocked_/);
});

test("publicación batch usa versiones temporales crecientes y chunks máximos de 50", () => {
    const ids = Array.from({ length: 60 }, (_, i) => "V-" + (i + 2));
    const result = api.publishAdminCatalogChanges_("applyCortesImageReconciliation", () => ids.map(build));
    assert.deepEqual(calls.batches.slice(-2).map(x => x.changes.length), [50, 10]);
    assert.equal(calls.batches.at(-2).changes[0].sourceVersion, 1700000000001);
    assert.equal(calls.batches.at(-1).changes.at(-1).sourceVersion, 1700000000060);
    assert.deepEqual(result, { status: "success", published: 60 });
});

test("si falla la lectura del snapshot publica reset sin lock", () => {
    buildErrorFor = "V-ERR";
    const before = calls.single.length;
    api.publishAdminCatalogChange_("updateVehicleField", () => build("V-ERR"));
    buildErrorFor = null;
    assert.equal(calls.single.length, before + 1);
    assert.deepEqual(calls.single.at(-1).change, { operation: "reset" });
});

test("un reset explícito no agrega sourceVersion", () => {
    api.publishAdminCatalogChange_("updateVehicleField", () => ({ operation: "reset" }));
    assert.deepEqual(calls.single.at(-1).change, { operation: "reset" });
});

test("si el batch es inválido publica reset", () => {
    const before = calls.single.length;
    api.publishAdminCatalogChanges_("applyCortesImageReconciliation", () => []);
    assert.equal(calls.single.length, before + 1);
    assert.deepEqual(calls.single.at(-1).change, { operation: "reset" });
});

test("si falla un chunk HTTP el batch termina con reset de recuperación", () => {
    failBatchNumber = calls.batches.length + 2;
    const before = calls.single.length;
    api.publishAdminCatalogChanges_("applyCortesImageReconciliation",
        () => Array.from({ length: 51 }, (_, i) => build("V-ERR-" + i)));
    failBatchNumber = 0;
    assert.equal(calls.single.length, before + 1);
    assert.deepEqual(calls.single.at(-1).change, { operation: "reset" });
});

console.log("AdminCatalogPublicationIsolation: " + passed + "/" + passed + " PASS");
