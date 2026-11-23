import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const write = read("../Services/write.js");
const admin = read("../Services/admin.js");
const api = read("../Frontend/api-config.js");
const catalog = read("../Services/catalog.js");

function extract(name, nextName) {
    const start = write.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const end = nextName ? write.indexOf("\nfunction " + nextName + "(", start + 10) : write.indexOf("\nfunction ", start + 10);
    return write.slice(start, end > start ? end : write.length);
}

const versionHelper = extract("nextWriteCatalogSourceVersion_", "runWriteDriveWorkOutsideScriptLock_");
const version = new Function("Date", versionHelper + "\nreturn nextWriteCatalogSourceVersion_;")({ now: () => 1700000000123 });
assert.equal(version("42"), 1700000000123);
assert.equal(version("42"), 1700000000123);
assert.throws(() => version("0"), /ID de vehículo válido/);
assert.throws(() => version("42x"), /ID de vehículo válido/);
assert.doesNotMatch(versionHelper, /PropertiesService|WRITE_CATALOG_VERSION_PROPERTY_|LockService/);

const addCut = extract("handleAddOrUpdateCut");
const releaseIndex = addCut.indexOf("if (lock.hasLock()) lock.releaseLock()");
const versionIndex = addCut.indexOf("nextWriteCatalogSourceVersion_");
assert.ok(releaseIndex >= 0 && versionIndex > releaseIndex, "La versión local se calcula después de liberar el lock físico.");

assert.doesNotMatch(write, /publishSharedCatalogChange_|publishCortesCatalogChange_|buildCortesCatalogChange_/);
assert.doesNotMatch(write, /properties\.getProperty\("GPSpedia_COORDINATOR_(URL|SECRET)"\)/);
assert.doesNotMatch(write, /GPSpedia_COORDINATOR_URL|GPSpedia_COORDINATOR_SECRET|removeLegacyWriteCoordinatorSettings_/);

assert.doesNotMatch(admin, /publishSharedCatalogChange_|publishAdminCortesCatalogChange_/);
assert.match(admin, /response\.catalogResetRequired = true;/);
assert.match(api, /'publishCatalogReset': 'CATALOG'/);
assert.match(api, /'publishCatalogChange': 'CATALOG'/);
assert.match(api, /'getCatalogChanges': 'CATALOG'/);
assert.match(api, /SERVICE_COMPATIBILITY_ACTIONS = \{[\s\S]*?CATALOG: \['getSuggestion'\][\s\S]*?ADMIN: \[\]/);
assert.match(api, /routeActionInternal_\("publishCatalogReset"/);
assert.match(catalog, /function publishCatalogResetForActor_/);
assert.match(catalog, /function publishCatalogChangeForActor_/);
assert.match(catalog, /case 'publishCatalogReset':/);
assert.match(catalog, /case 'publishCatalogChange':/);
assert.match(catalog, /case 'getCatalogChanges':/);
assert.match(catalog, /catalogFeed/);
assert.doesNotMatch(api, /COORDINATOR|getServiceTraffic/);
console.log("CatalogPublicationIsolation: 27/27 PASS — WRITE y ADMIN delegan a CATALOG; sin dependencia de Coordinator");
