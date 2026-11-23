import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const coordinatorSource = read("../Services/Coordinator.js");
const apiSource = read("../Frontend/api-config.js");
const writeSource = read("../Services/write.js");
const adminSource = read("../Services/admin.js");

assert.equal(writeSource.includes("publishSharedCatalogChange_"), false);
assert.equal(writeSource.includes("publishCortesCatalogChange_"), false);
assert.equal(adminSource.includes("publishSharedCatalogChange_"), false);
assert.equal(adminSource.includes("publishAdminCortesCatalogChange_"), false);
assert.ok(adminSource.includes("response.catalogResetRequired = true;"));
assert.ok(apiSource.includes("'publishCatalogReset': 'COORDINATOR'"));
assert.ok(apiSource.includes("WRITE_CATALOG_RESET_ACTIONS_"));
assert.ok(apiSource.includes("ADMIN_CATALOG_RESET_ACTIONS_"));
assert.ok(apiSource.includes("publishCatalogResetAfterMutation_"));
assert.ok(coordinatorSource.includes("function publishCatalogResetFromBrowser_"));
assert.ok(coordinatorSource.includes('request.action === "publishCatalogReset"'));
assert.ok(coordinatorSource.includes("function getServiceTrafficFromBrowser_"));
assert.ok(apiSource.includes("'getServiceTraffic': 'COORDINATOR'"));

const cleanupStart = writeSource.indexOf("function removeLegacyWriteCoordinatorSettings_()");
const cleanupEnd = writeSource.indexOf("\nfunction ", cleanupStart + 10);
assert.ok(cleanupStart >= 0 && cleanupEnd > cleanupStart);
const deletedProperties = [];
const cleanup = new Function("PropertiesService", writeSource.slice(cleanupStart, cleanupEnd) + "\nreturn removeLegacyWriteCoordinatorSettings_;")({
    getScriptProperties: () => ({ deleteProperty: key => deletedProperties.push(key) })
});
cleanup();
assert.deepEqual(deletedProperties, ["GPSpedia_COORDINATOR_URL", "GPSpedia_COORDINATOR_SECRET"]);

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
    userId, sessionToken: token, service: "WRITE", operation: "addOrUpdateCut",
    requestId: "catalog-WRITE-addOrUpdateCut-OP-12345678"
};
const first = coordinator.publishCatalogResetFromBrowser(payload);
assert.equal(first.status, "success");
assert.equal(first.resetRequired, false);
const retry = coordinator.publishCatalogResetFromBrowser(payload);
assert.equal(retry.duplicate, true);
assert.equal(retry.revision, first.revision);
const page = coordinator.getPublicCatalogChanges({ cursor: first.revision - 1, limit: 1 });
assert.equal(page.changes.length, 1);
assert.equal(page.changes[0].operation, "reset");
assert.equal(page.changes[0].collection, "*");

assert.throws(() => coordinator.publishCatalogResetFromBrowser({
    ...payload, operation: "unknownAction", requestId: "catalog-WRITE-unknown-OP-12345678"
}), /no está autorizada/);
assert.throws(() => coordinator.publishCatalogResetFromBrowser({
    ...payload, operation: "freezeCortesIds", requestId: "catalog-WRITE-freeze-OP-12345678"
}), /Solo Desarrollador/);
assert.throws(() => coordinator.publishCatalogResetFromBrowser({
    ...payload, service: "ADMIN", operation: "resolveVehicleContributionCandidate",
    requestId: "catalog-ADMIN-resolve-REQ-12345678"
}), /Solo Desarrollador/);

const developerId = "USER-WRITE-DEVELOPER", developerToken = "SESSION-WRITE-DEVELOPER-123456";
registerSession(developerId, "desarrollador", developerToken);
const freeze = coordinator.publishCatalogResetFromBrowser({
    userId: developerId, sessionToken: developerToken, service: "WRITE",
    operation: "freezeCortesIds", requestId: "catalog-WRITE-freezeCortesIds-OP-12345678"
});
assert.equal(freeze.status, "success");
assert.equal(freeze.resetRequired, false);
const adminReset = coordinator.publishCatalogResetFromBrowser({
    userId: developerId, sessionToken: developerToken, service: "ADMIN",
    operation: "resolveVehicleContributionCandidate", requestId: "catalog-ADMIN-resolveVehicle-REQ-12345678"
});
assert.equal(adminReset.status, "success");
assert.equal(adminReset.resetRequired, false);
const traffic = coordinator.getServiceTrafficFromBrowser({ userId: developerId, sessionToken: developerToken });
assert.equal(traffic.status, "success");
assert.equal(traffic.scope, "global_service_traffic");

console.log("CatalogPublicationFrontend: 10/10 PASS — sesión/RBAC, resets WRITE/ADMIN, idempotencia y limpieza de propiedades heredadas");
