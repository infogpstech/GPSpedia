import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const admin = read("Services/admin.js");
const auth = read("Services/Auth.js");
const users = read("Services/users.js");
const write = read("Services/write.js");
const feedback = read("Services/feedback.js");
const utilities = read("Services/Utilities.js");
const coordinator = read("Services/Coordinator.js");
const client = read("Services/SharedMutationClient.js");
const catalog = read("Services/catalog.js");
const api = read("Frontend/api-config.js");
const ui = read("Frontend/ui.js");
const inventory = readFileSync(new URL("../../INVENTARIO_LLAMADAS_SERVICIOS.md", import.meta.url), "utf8");

let passed = 0;
function check(name, run) {
    run();
    passed++;
    console.log("PASS " + name);
}

check("El inventario de MIG-004 existe y declara el grafo, reemplazos y pruebas", () => {
    assert.match(inventory, /## 2\. Arquitectura de comunicación actual/);
    assert.match(inventory, /## 3\. Llamadas directas de ADMIN a servicios/);
    assert.match(inventory, /## 4\. SharedMutationClient → COORDINATOR/);
    assert.match(inventory, /## 5\. COORDINATOR → servicios/);
    assert.match(inventory, /## 6\. Operaciones coordinables desde frontend/);
    assert.match(inventory, /## 8\. Pruebas y trazabilidad de paridad/);
});

check("ADMIN no contiene URLs, secretos ni llamadas backend→backend a WRITE/CATALOG", () => {
    for (const value of ["WRITE_SERVICE_URL","CATALOG_SERVICE_URL","AUTH_SERVICE_URL","CATALOG_TRAFFIC_SECRET_PROPERTY_","callWriteServiceAction","requestCortesIdFreezeFromWriteService","getAdminProjectedVehicleFieldSnapshot_","handleGetVehicleContributionCandidates_"]) assert.equal(admin.includes(value),false,value);
    assert.equal(admin.includes("script.google.com/macros/s/"),false);
    assert.ok(ui.includes("freezeCortesIds"));
    assert.ok(inventory.includes("MIG-010"));
});

check("CATALOG valida sesión propia y frontend coordina proyección/candidatos", () => {
    assert.ok(catalog.includes("verifyCatalogDeveloperSession_(payload)"));
    assert.ok(catalog.includes("case 'getVehicleContributionCandidates'"));
    assert.equal(catalog.includes("CATALOG_TRAFFIC_SECRET_PROPERTY_"),false);
    assert.ok(ui.includes('routeAction("getVehicleProjection"'));
    assert.ok(ui.includes("includeImageInventoryCandidates"));
    assert.ok(inventory.includes("sin secretos compartidos"));
});

check("El frontend enruta directamente los servicios y acciones de reemplazo", () => {
    for (const service of ["AUTH", "CATALOG", "WRITE", "USERS", "FEEDBACK", "UTILITIES", "ADMIN"]) {
        assert.match(api, new RegExp("\\b" + service + "\\s*:"));
    }
    for (const [action, service] of [
        ["getVehicleProjection", "CATALOG"],
        ["getContributionCandidates", "CATALOG"],
        ["getVehicleContributionCandidates", "CATALOG"],
        ["allocateVehicleId", "WRITE"],
        ["freezeCortesIds", "WRITE"],
        ["getCatalogChanges", "FEEDBACK"]
    ]) {
        assert.match(api, new RegExp("'" + action + "'\\s*:\\s*'" + service + "'"));
    }
    assert.match(api, /response = await fetch\(targetUrl/);
});

check("Las 13 operaciones internas están en cliente, dispatcher y documento", () => {
    const actions = [
        "acquire", "release", "validate", "publishCatalogChange", "publishCatalogChanges",
        "getCatalogChanges", "registerSession", "syncUserSessions", "revokeSession",
        "revokeUserSessions", "validateSessionContext", "invalidateSessionActorCaches",
        "getServiceTraffic"
    ];
    for (const action of actions) {
        assert.ok(coordinator.includes('action === "' + action + '"'), "Coordinator no despacha " + action);
        assert.ok(inventory.includes("`" + action + "`"), "Inventario no documenta " + action);
    }
    assert.match(client, /function withLease\(/);
    assert.match(client, /function syncUserSessions\(/);
    assert.match(client, /function revokeSession\(/);
    assert.match(client, /function getServiceTraffic\(/);
    assert.match(client, /catalogFeed=1/);
});

check("El fan-out de Coordinator solo apunta a los cuatro servicios con caché de actor", () => {
    assert.match(coordinator, /const targets = \["USERS", "WRITE", "FEEDBACK", "ADMIN"\]/);
    assert.match(coordinator, /action: "__invalidateSessionActorCache"/);
    assert.match(coordinator, /action: "__primeSessionActorCache"/);
    for (const source of [users, write, feedback, admin]) {
        assert.match(source, /handleSharedSessionActorCacheInvalidation_\(/);
        assert.match(source, /handleSharedSessionActorCachePriming_\(/);
    }
    assert.match(inventory, /lotes de hasta 25 tokens/);
    assert.match(inventory, /grupos de hasta cinco tokens/);
});

check("Los callsites de leases están diferenciados de wrappers/ayudantes sin consumidor", () => {
    assert.match(auth, /withSharedMutationLease_\("AUTH", action/);
    assert.match(auth, /function migrateLegacyRoleRevocationMarkersToSharedState_\(/);
    assert.match(users, /withSharedMutationLease_\("USERS", action/);
    assert.match(admin, /withSharedMutationLease_\("ADMIN", "saveUnusedImagesInventory"/);
    assert.match(admin, /withSharedMutationLease_\("ADMIN", "createCortesImageFolder"/);
    assert.match(admin, /withSharedMutationLease_\("ADMIN", "auditDriveImagesInCortes"/);
    assert.match(utilities, /withSharedMutationLease_\("UTILITIES","migrateTimestamps"/);
    assert.doesNotMatch(write.slice(write.indexOf("function doPost(e)"), write.indexOf("function doPostInternal_")), /withSharedMutationLease_/);
    assert.doesNotMatch(feedback.slice(feedback.indexOf("function doPost(e)"), feedback.indexOf("const RICH_TEXT_MODE_PROPERTY_")), /withSharedMutationLease_/);
    assert.match(inventory, /seis usos activos y un helper/);
});

check("Las llamadas externas a Drive, YouTube e imágenes no se clasifican como microservicios", () => {
    assert.match(feedback, /UrlFetchApp\.fetch\(youtubeEndpoint/);
    assert.match(admin, /drive\/v3\/about\?fields=storageQuota/);
    assert.match(admin, /UrlFetchApp\.fetch\(String\(imageData\)/);
    assert.match(write, /UrlFetchApp\.fetch\(String\(imageData\)/);
    assert.match(inventory, /## 7\. Llamadas HTTP que NO son dependencias entre microservicios/);
});

check("Los riesgos de propiedad compartida están explícitos antes de retirar leases", () => {
    assert.match(inventory, /Users \/ ActiveSessions/);
    assert.match(inventory, /Cortes/);
    assert.match(inventory, /Drive y referencias de archivos/);
    assert.match(inventory, /ScriptLock de un proyecto Apps Script no constituye un lock global/);
});

console.log("ServiceCallGraphContract: " + passed + "/" + passed + " PASS");
