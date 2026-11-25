import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const admin = read("Services/admin.js");
const auth = read("Services/Auth.js");
const write = read("Services/write.js");
const feedback = read("Services/feedback.js");
const utilities = read("Services/Utilities.js");
const catalog = read("Services/catalog.js");
const sharedActor = read("Services/SharedSessionActor.js");
const api = read("Frontend/api-config.js");
const ui = read("Frontend/ui.js");
const invalidation = read("Frontend/sessionCacheInvalidation.js");
const inventory = readFileSync(new URL("../../INVENTARIO_LLAMADAS_SERVICIOS.md", import.meta.url), "utf8");

let passed = 0;
function check(name, run) {
    run();
    passed++;
    console.log("PASS " + name);
}

const services = [admin, auth, write, feedback, utilities, catalog];
check("Los seis servicios no conservan URLs, secretos compartidos, leases ni esperas bloqueantes", () => {
    for (const source of services) {
        assert.doesNotMatch(source, /GPSpedia_COORDINATOR_URL|GPSpedia_COORDINATOR_SECRET|GPSpedia_SERVICE_URL_|[A-Z]+_SERVICE_URL|withSharedMutationLease_|\.waitLock\(/);
    }
    assert.doesNotMatch(sharedActor, /GPSpedia_COORDINATOR_URL|GPSpedia_COORDINATOR_SECRET|UrlFetchApp/);
});

check("El frontend es el router y coordinador de secuencias multi-servicio", () => {
    assert.match(api, /async function getConfiguredServiceEndpoint_\(service\)/);
    assert.match(api, /const targetUrl = await getConfiguredServiceEndpoint_\(service\)/);
    assert.match(api, /response = await fetch\(targetUrl/);
    assert.match(api, /async function publishCatalogResetAfterMutation_/);
    assert.match(api, /routeActionInternal_\("publishCatalogReset"/);
    assert.match(ui, /routeAction\("getVehicleProjection"/);
    assert.match(ui, /getContributionCandidates/);
});

check("El mapa vigente conserva 125 acciones y seis servicios", () => {
    const match = api.match(/export\s+const\s+ACTION_TO_SERVICE_MAP\s*=\s*\{([\s\S]*?)\n\};/);
    assert.ok(match);
    const entries = [...match[1].matchAll(/['"]([^'"]+)['"]\s*:\s*['"]([A-Z]+)['"]/g)];
    assert.equal(entries.length, 125);
    const counts = {};
    entries.forEach(([, action, service]) => { counts[service] = (counts[service] || 0) + 1; });
    assert.deepEqual(counts, { AUTH: 19, CATALOG: 9, WRITE: 9, FEEDBACK: 42, UTILITIES: 1, ADMIN: 45 });
});

check("La invalidación de cachés se coordina en paralelo desde el frontend sin transmitir tokens", () => {
    assert.match(invalidation, /SESSION_CACHE_SERVICES = Object\.freeze\(\[/);
    for (const service of ["AUTH", "WRITE", "CATALOG", "FEEDBACK", "ADMIN", "UTILITIES"]) assert.ok(invalidation.includes('"' + service + '"'));
    assert.match(invalidation, /Promise\.all\(SESSION_CACHE_SERVICES\.map/);
    assert.match(invalidation, /retry\("__invalidateSessionActorCache"/);
    assert.match(invalidation, /const payload = \{ userId, cacheKeys \}/);
    assert.doesNotMatch(invalidation, /sessionToken|UrlFetchApp|GPSpedia_COORDINATOR_SECRET/);
});

check("SharedSessionActor exige proveedor Spreadsheet explícito y no tiene fallback global", () => {
    assert.match(sharedActor, /function loadSharedSessionActorFromSpreadsheet_/);
    assert.match(sharedActor, /deps\.loadSpreadsheet/);
    assert.match(sharedActor, /typeof deps\.loadSpreadsheet === "function"/);
    assert.doesNotMatch(sharedActor, /SPREADSHEET_ID|openById\(/);
    for (const source of [auth, write, admin, utilities]) assert.match(source, /loadSpreadsheet:/);
});

check("CATALOG conserva autorización local y caché de actor propia", () => {
    assert.match(catalog, /function getCatalogSessionActor_\(/);
    assert.match(catalog, /function verifyCatalogDeveloperSession_\(/);
    assert.match(catalog, /CacheService\.getScriptCache\(\)/);
    assert.match(catalog, /case 'getVehicleContributionCandidates'/);
    assert.doesNotMatch(catalog, /CATALOG_TRAFFIC_SECRET_PROPERTY_|GPSpedia_COORDINATOR_SECRET|withSharedMutationLease_/);
});

check("ADMIN no conserva llamadas funcionales backend→backend", () => {
    for (const value of ["WRITE_SERVICE_URL", "CATALOG_SERVICE_URL", "AUTH_SERVICE_URL",
        "CATALOG_TRAFFIC_SECRET_PROPERTY_", "callWriteServiceAction", "requestCortesIdFreezeFromWriteService"]) {
        assert.equal(admin.includes(value), false, value);
    }
    assert.doesNotMatch(admin, /script\.google\.com\/macros\/s\//);
    assert.ok(ui.includes("freezeCortesIds"));
    assert.match(api, /'allocateVehicleId'\s*:\s*'WRITE'/);
});

check("Las llamadas HTTP externas a Drive, YouTube e imágenes no se confunden con microservicios", () => {
    assert.match(feedback, /UrlFetchApp\.fetch\(youtubeEndpoint/);
    assert.match(admin, /drive\/v3\/about\?fields=storageQuota/);
    assert.match(admin, /UrlFetchApp\.fetch\(String\(imageData\)/);
    assert.match(write, /UrlFetchApp\.fetch\(String\(imageData\)/);
});

check("El inventario refleja la arquitectura actual y la secuencia MIG-026", () => {
    assert.match(inventory, /No se conservan COORDINATOR ni SharedMutation/);
    assert.match(inventory, /125 acciones canónicas \(AUTH 19, CATALOG 9, WRITE 9, FEEDBACK 42, UTILITIES 1 y ADMIN 45\)/);
    assert.match(inventory, /## 3\.9 MIG-025/);
    assert.match(inventory, /## 3\.10 MIG-026/);
    assert.match(inventory, /la siguiente pendiente por orden es.*GPSpedia_CORTES_ORGANIZER_OP_V1/);
    assert.match(inventory, /## 3[.]11 MIG-026 ADMIN-01/);
});

console.log("ServiceCallGraphContract: " + passed + "/" + passed + " PASS");
