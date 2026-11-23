import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const catalogSource = read("../Services/catalog.js");
const apiSource = read("../Frontend/api-config.js");
const writeSource = read("../Services/write.js");
const adminSource = read("../Services/admin.js");
const coordinatorSource = read("../Services/Coordinator.js");

assert.equal(writeSource.includes("publishSharedCatalogChange_"), false);
assert.equal(writeSource.includes("publishCortesCatalogChange_"), false);
assert.equal(adminSource.includes("publishSharedCatalogChange_"), false);
assert.equal(adminSource.includes("publishAdminCortesCatalogChange_"), false);
assert.ok(adminSource.includes("response.catalogResetRequired = true;"));
assert.ok(apiSource.includes("'publishCatalogReset': 'CATALOG'"));
assert.ok(apiSource.includes("WRITE_CATALOG_RESET_ACTIONS_"));
assert.ok(apiSource.includes("ADMIN_CATALOG_RESET_ACTIONS_"));
assert.ok(apiSource.includes("publishCatalogResetAfterMutation_"));
assert.ok(apiSource.includes('routeActionInternal_("publishCatalogReset"'));
assert.ok(apiSource.includes("COORDINATOR: ['publishCatalogReset', 'getCatalogChanges']"));
assert.ok(catalogSource.includes("function publishCatalogResetForActor_("));
assert.ok(catalogSource.includes("function handlePublishCatalogReset_("));
assert.ok(catalogSource.includes("const actor = getCatalogSessionActor_(userId, sessionToken)"));
assert.ok(catalogSource.includes("case 'publishCatalogReset':"));
assert.ok(coordinatorSource.includes("function getServiceTrafficFromBrowser_"));
assert.ok(apiSource.includes("'getServiceTraffic': 'COORDINATOR'"));

function extract(source, name, nextName) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const end = nextName ? source.indexOf("\nfunction " + nextName + "(", start + 10) : source.indexOf("\nfunction ", start + 10);
    return source.slice(start, end > start ? end : source.length);
}

const cleanupSource = extract(writeSource, "removeLegacyWriteCoordinatorSettings_", "doPost");
const deletedProperties = [];
const cleanup = new Function("PropertiesService", cleanupSource + "\nreturn removeLegacyWriteCoordinatorSettings_;")({
    getScriptProperties: () => ({ deleteProperty: key => deletedProperties.push(key) })
});
cleanup();
assert.deepEqual(deletedProperties, ["GPSpedia_COORDINATOR_URL", "GPSpedia_COORDINATOR_SECRET"]);

const store = Object.create(null);
const properties = {
    getProperty: key => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
    setProperty: (key, value) => { store[key] = String(value); },
    deleteProperty: key => { delete store[key]; },
    getProperties: () => Object.assign({}, store)
};
let held = false;
const lock = {
    tryLock: () => { if (held) return false; held = true; return true; },
    releaseLock: () => { held = false; }
};
let clock = 1700000000000;
const runtime = new Function(catalogSource + "\nreturn { createCatalogChangeFeed_, publishCatalogResetForActor_ };")();
const feed = runtime.createCatalogChangeFeed_({
    properties,
    lockService: { getScriptLock: () => lock },
    now: () => clock
});
const userId = "USER-WRITE-BROWSER", token = "SESSION-WRITE-BROWSER-123456789";
const payload = {
    userId, sessionToken: token, service: "WRITE", operation: "addOrUpdateCut",
    requestId: "catalog-WRITE-addOrUpdateCut-OP-12345678"
};
const first = runtime.publishCatalogResetForActor_(payload, { role: "tecnico" }, feed);
assert.equal(first.status, "success");
assert.equal(first.resetRequired, true);
const retry = runtime.publishCatalogResetForActor_(payload, { role: "tecnico" }, feed);
assert.equal(retry.duplicate, true);
assert.equal(retry.revision, first.revision);
const page = feed.getChanges({ cursor: first.revision - 1, limit: 1 });
assert.equal(page.changes.length, 1);
assert.equal(page.changes[0].operation, "reset");
assert.equal(page.changes[0].collection, "*");
assert.equal(page.changes[0].sourceService, "WRITE");
assert.equal(page.changes[0].sourceOperation, "addOrUpdateCut");
assert.equal(JSON.stringify(page).includes(token), false);
assert.equal(Object.prototype.hasOwnProperty.call(page.changes[0], "userId"), false);

assert.throws(() => runtime.publishCatalogResetForActor_({
    ...payload, operation: "unknownAction", requestId: "catalog-WRITE-unknown-OP-12345678"
}, { role: "tecnico" }, feed), /no está autorizada/);
assert.throws(() => runtime.publishCatalogResetForActor_({
    ...payload, operation: "freezeCortesIds", requestId: "catalog-WRITE-freeze-OP-12345678"
}, { role: "tecnico" }, feed), /Solo Desarrollador/);
assert.throws(() => runtime.publishCatalogResetForActor_({
    ...payload, service: "ADMIN", operation: "resolveVehicleContributionCandidate",
    requestId: "catalog-ADMIN-resolve-REQ-12345678"
}, { role: "jefe" }, feed), /Solo Desarrollador/);

const freeze = runtime.publishCatalogResetForActor_({
    userId, sessionToken: token, service: "WRITE", operation: "freezeCortesIds",
    requestId: "catalog-WRITE-freezeCortesIds-OP-12345678"
}, { role: "desarrollador" }, feed);
assert.equal(freeze.status, "success");
const adminReset = runtime.publishCatalogResetForActor_({
    userId, sessionToken: token, service: "ADMIN", operation: "resolveVehicleContributionCandidate",
    requestId: "catalog-ADMIN-resolveVehicle-REQ-12345678"
}, { role: "desarrollador" }, feed);
assert.equal(adminReset.status, "success");

console.log("WriteCatalogPublicationFrontend: 29/29 PASS — sesión local, RBAC, reset CATALOG, idempotencia y ausencia de secretos compartidos");
