import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const write = read("../Services/write.js");
const admin = read("../Services/admin.js");
const api = read("../Frontend/api-config.js");
const coordinator = read("../Services/Coordinator.js");

function extract(name, nextName) {
    const start = write.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const end = nextName
        ? write.indexOf("\nfunction " + nextName + "(", start + 10)
        : write.indexOf("\nfunction ", start + 10);
    return write.slice(start, end > start ? end : write.length);
}

const versionHelper = extract("nextWriteCatalogSourceVersion_", "runWriteDriveWorkOutsideScriptLock_");
const version = new Function("Date", versionHelper + "\nreturn nextWriteCatalogSourceVersion_;")({
    now: () => 1700000000123
});
assert.equal(version("42"), 1700000000123);
assert.equal(version("42"), 1700000000123);
assert.throws(() => version("0"), /ID de vehículo válido/);
assert.throws(() => version("42x"), /ID de vehículo válido/);
assert.doesNotMatch(versionHelper, /PropertiesService|WRITE_CATALOG_VERSION_PROPERTY_|LockService/);

const addCut = extract("handleAddOrUpdateCut");
const releaseIndex = addCut.indexOf("if (lock.hasLock()) lock.releaseLock()");
const versionIndex = addCut.indexOf("nextWriteCatalogSourceVersion_");
assert.ok(releaseIndex >= 0 && versionIndex > releaseIndex,
    "La versión local se calcula después de liberar el lock físico.");

assert.equal(write.includes("publishSharedCatalogChange_"), false);
assert.equal(write.includes("publishCortesCatalogChange_"), false);
assert.equal(write.includes("buildCortesCatalogChange_"), false);
assert.equal(write.includes('properties.getProperty("GPSpedia_COORDINATOR_URL")'), false);
assert.equal(write.includes('properties.getProperty("GPSpedia_COORDINATOR_SECRET")'), false);
assert.ok(write.includes('deleteProperty("GPSpedia_COORDINATOR_URL")'));
assert.ok(write.includes('deleteProperty("GPSpedia_COORDINATOR_SECRET")'));
assert.ok(write.includes("removeLegacyWriteCoordinatorSettings_();"));
const cleanupSource = extract("removeLegacyWriteCoordinatorSettings_", "doPost");
const deletedProperties = [];
const cleanup = new Function("PropertiesService", cleanupSource + "\nreturn removeLegacyWriteCoordinatorSettings_;")({
    getScriptProperties: () => ({ deleteProperty: key => deletedProperties.push(key) })
});
cleanup();
assert.deepEqual(deletedProperties, ["GPSpedia_COORDINATOR_URL", "GPSpedia_COORDINATOR_SECRET"]);

assert.equal(admin.includes("publishSharedCatalogChange_"), false);
assert.equal(admin.includes("publishAdminCortesCatalogChange_"), false);
assert.ok(admin.includes("response.catalogResetRequired = true;"));
assert.ok(admin.includes('"resolveVehicleContributionCandidate"]'));
assert.match(api, /'publishCatalogReset': 'CATALOG'/);
assert.match(api, /'publishCatalogChange': 'CATALOG'/);
assert.match(api, /SERVICE_COMPATIBILITY_ACTIONS = \{[\s\S]*?COORDINATOR: \['publishCatalogReset', 'getCatalogChanges'\\]/);
assert.match(api, /const WRITE_CATALOG_RESET_ACTIONS_/);
assert.match(api, /const ADMIN_CATALOG_RESET_ACTIONS_/);
assert.match(api, /service === "WRITE"[\s\S]*?WRITE_CATALOG_RESET_ACTIONS_\.has\(action\)[\s\S]*?publishCatalogResetAfterMutation_/);
assert.match(api, /service === "ADMIN" && ADMIN_CATALOG_RESET_ACTIONS_\.has\(action\)[\s\S]*?publishCatalogResetAfterMutation_/);
assert.match(api, /routeActionInternal_\("publishCatalogReset"/);
assert.match(api, /userId: String\(payload && payload\.userId/);
assert.match(api, /sessionToken: String\(payload && payload\.sessionToken/);
assert.match(coordinator, /function publishCatalogResetFromBrowser_\(/);
assert.match(coordinator, /request\.action === "publishCatalogReset"/);
assert.match(coordinator, /authorizeSession_\([\s\S]*?publishCatalogChange_\(service, operation/);
assert.match(coordinator, /change:\s*\{\s*operation:\s*"reset"\s*\}/);
assert.match(coordinator, /ADMIN: new Set\([\s\S]*?resolveVehicleContributionCandidate/);
assert.match(coordinator, /service === "ADMIN" \|\| operation === "freezeCortesIds"/);
console.log("CatalogPublicationIsolation: 34/34 PASS — WRITE y ADMIN delegan el reset a CATALOG desde frontend con sesión autenticada");
