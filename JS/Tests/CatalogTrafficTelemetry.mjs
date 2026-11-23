import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const catalog = readFileSync(resolve(root, "JS/Services/catalog.js"), "utf8");
const start = catalog.indexOf("function doPost(e)");
const end = catalog.indexOf("// ================================\n//", start);
const router = catalog.slice(start, end > start ? end : catalog.length);
let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }

test("CATALOG no mantiene contador directo ni endpoint de telemetría", () => {
    assert.doesNotMatch(catalog, /CATALOG_TRAFFIC_BUCKET_PREFIX_|CATALOG_TRAFFIC_ACTIONS_|recordCatalogTraffic_|readCatalogTraffic_/);
    assert.doesNotMatch(router, /getServiceTraffic|recordCatalogTraffic_/);
});

test("CATALOG expone inventario mínimo bajo sesión propia, sin secreto interservicio", () => {
    assert.doesNotMatch(catalog, /CATALOG_TRAFFIC_SECRET_PROPERTY_|catalogTrafficSecretEquals_/);
    assert.match(catalog, /includeImageInventoryCandidates/);
    assert.match(catalog, /verifyCatalogDeveloperSession_\(payload\)/);
    assert.match(catalog, /case 'getContributionCandidates'/);
});

test("Las lecturas de catálogo mantienen sus rutas funcionales", () => {
    for (const action of ["getCatalogData", "getDropdownData", "getNavigationData", "getVehicleProjection", "getContributionCandidates"]) {
        assert.ok(catalog.includes("case '" + action + "'"), "Falta acción " + action);
    }
});

console.log("CatalogTrafficTelemetry: " + passed + "/3 PASS");
