import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
function extract(name, nextName) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const end = nextName ? source.indexOf("\nfunction " + nextName + "(", start + 10) : source.indexOf("\nfunction ", start + 10);
    return source.slice(start, end > start ? end : source.length);
}
const versionHelper = extract("nextWriteCatalogVersionLocked_", "publishCortesCatalogChange_");
const values = new Map();
const version = new Function("PropertiesService", "WRITE_CATALOG_VERSION_PROPERTY_", versionHelper + ";return nextWriteCatalogVersionLocked_;")(
    { getScriptProperties: () => ({
        getProperty: key => values.has(key) ? values.get(key) : null,
        setProperty: (key, value) => values.set(key, String(value))
    }) },
    "GPSpedia_WRITE_CATALOG_VERSION_V1"
);
assert.equal(version("42"), 1);
assert.equal(version("42"), 2);
assert.throws(() => version("0"), /ID de vehículo válido/);
assert.throws(() => version("42x"), /ID de vehículo válido/);

const publisherSource = extract("publishCortesCatalogChange_", "runWriteDriveWorkOutsideScriptLock_");
assert.doesNotMatch(publisherSource, /LockService|getScriptLock|waitLock|tryLock/);
let published = null;
const publish = new Function("buildCortesCatalogChange_", "publishSharedCatalogChange_", publisherSource + ";return publishCortesCatalogChange_;")(
    id => ({ collection: "cortes", recordId: String(id), operation: "upsert", snapshot: { id: String(id) } }),
    (service, action, change) => { published = { service, action, change }; }
);
publish("addOrUpdateCut", "42", 9);
assert.equal(published.service, "WRITE");
assert.equal(published.change.sourceVersion, 9);
assert.equal(published.change.recordId, "42");
assert.throws(() => publish("addOrUpdateCut", "42", null), /versión de catálogo verificable/);
console.log("WriteCatalogPublicationIsolation: 9/9 PASS — secuencia monotónica y HTTP a Coordinator sin ScriptLock local");
