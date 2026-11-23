import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const coordinatorSource = read("../Services/Coordinator.js");
const apiSource = read("../Frontend/api-config.js");
const writeSource = read("../Services/write.js");

assert.equal(writeSource.includes("publishSharedCatalogChange_"), false);
assert.equal(writeSource.includes("publishCortesCatalogChange_"), false);
assert.ok(writeSource.includes('deleteProperty("GPSpedia_COORDINATOR_URL")'));
assert.ok(writeSource.includes('deleteProperty("GPSpedia_COORDINATOR_SECRET")'));
const cleanupStart = writeSource.indexOf("function removeLegacyWriteCoordinatorSettings_()");
const cleanupEnd = writeSource.indexOf("\nfunction ", cleanupStart + 10);
assert.ok(cleanupStart >= 0 && cleanupEnd > cleanupStart);
const deletedProperties = [];
const cleanup = new Function("PropertiesService", writeSource.slice(cleanupStart, cleanupEnd) + "\nreturn removeLegacyWriteCoordinatorSettings_;")({
    getScriptProperties: () => ({ deleteProperty: key => deletedProperties.push(key) })
});
cleanup();
assert.deepEqual(deletedProperties, ["GPSpedia_COORDINATOR_URL", "GPSpedia_COORDINATOR_SECRET"]);
assert.match(apiSource, /'publishWriteCatalogReset': 'COORDINATOR'/);
assert.match(apiSource, /WRITE_CATALOG_RESET_ACTIONS_/);
assert.match(apiSource, /publishWriteCatalogResetAfterMutation_/);
assert.match(coordinatorSource, /function publishWriteCatalogResetFromBrowser_/);
assert.match(coordinatorSource, /request\.action === "publishWriteCatalogReset"/);

const propertiesStore = {};
const properties = {
    getProperty: key => Object.prototype.hasOwnProperty.call(propertiesStore, key) ? propertiesStore[key] : null,
    setProperty: (key, value) => { propertiesStore[key] = String(value); },
    deleteProperty: key => { delete propertiesStore[key]; },
    getProperties: () => ({ ...propertiesStore }),
    setProperties: values => { Object.keys(values || {}).forEach(key => { propertiesStore[key] = String(values[key]); }); }
};
const lock = { tryLock: () => true, releaseLock: () => {}, hasLock: () => true };
const lockService = { getScriptLock: () => lock };
let clock = 1700000000000, sequence = 0;
const uuid = () => "00000000-0000-4000-8000-" + String(++sequence).padStart(12, "0");
const factory = new Function("properties", "lockService", "now", "uuid", "sleep",
    coordinatorSource + "\nreturn createSharedMutationCoordinator_;");
const createCoordinator = factory(properties, lockService, () => clock, uuid, ms => { clock += ms; });
const coordinator = createCoordinator({
    properties, lockService, now: () => clock, uuid, sleep: ms => { clock += ms; }
});

function registerSession(userId, role, token) {
    properties.setProperty("GPSpedia_AUTH_CONTEXT_V1_" + encodeURIComponent(userId), JSON.stringify({
        schemaVersion: 1, userId, epoch: 1, revokedBefore: 0,
        sessions: [{ token, role, fullName: "Usuario de prueba", createdAt: clock - 1000, lastActivityAt: clock }]
    }));
}

const userId = "USER-WRITE-BROWSER", token = "SESSION-WRITE-BROWSER-123456789";
registerSession(userId, "tecnico", token);
assert.equal(properties.getProperty("GPSpedia_COORDINATOR_SECRET_WRITE"), null,
    "La publicación del navegador no debe depender de un secreto WRITE.");

const payload = {
    userId, sessionToken: token, operation: "addOrUpdateCut",
    requestId: "write-addOrUpdateCut-OP-12345678"
};
const first = coordinator.publishWriteCatalogResetFromBrowser(payload);
assert.equal(first.status, "success");
assert.equal(first.resetRequired, false);
const retry = coordinator.publishWriteCatalogResetFromBrowser(payload);
assert.equal(retry.duplicate, true);
assert.equal(retry.revision, first.revision);
const page = coordinator.getPublicCatalogChanges({ cursor: first.revision - 1, limit: 1 });
assert.equal(page.changes.length, 1);
assert.equal(page.changes[0].operation, "reset");
assert.equal(page.changes[0].collection, "*");

assert.throws(() => coordinator.publishWriteCatalogResetFromBrowser({
    ...payload, operation: "unknownAction", requestId: "write-unknown-OP-12345678"
}), /no está autorizada/);
assert.throws(() => coordinator.publishWriteCatalogResetFromBrowser({
    ...payload, operation: "freezeCortesIds", requestId: "write-freeze-OP-12345678"
}), /Solo Desarrollador/);

const developerId = "USER-WRITE-DEVELOPER", developerToken = "SESSION-WRITE-DEVELOPER-123456";
registerSession(developerId, "desarrollador", developerToken);
const freeze = coordinator.publishWriteCatalogResetFromBrowser({
    userId: developerId, sessionToken: developerToken, operation: "freezeCortesIds",
    requestId: "write-freezeCortesIds-OP-12345678"
});
assert.equal(freeze.status, "success");
assert.equal(freeze.resetRequired, false);

console.log("WriteCatalogPublicationFrontend: 8/8 PASS — sesión/RBAC, reset seguro, idempotencia y ausencia de secreto compartido");
