import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const coordinator = read("../Services/Coordinator.js");
const sessionActor = read("../Services/SharedSessionActor.js");
const admin = read("../Services/admin.js");
const api = read("../Frontend/api-config.js");
const sessionInvalidation = read("../Frontend/sessionCacheInvalidation.js");
const services = [
    ["AUTH", read("../Services/Auth.js")],
    ["WRITE", read("../Services/write.js")],
    ["FEEDBACK", read("../Services/feedback.js")],
    ["ADMIN", admin],
    ["UTILITIES", read("../Services/Utilities.js")],
    ["CATALOG", read("../Services/catalog.js")]
];

let passed = 0;
function test(name, callback) {
    callback();
    passed++;
    console.log("PASS " + name);
}

test("SharedMutationClient se retira y el helper local de sesión permanece", () => {
    assert.equal(existsSync(new URL("../Services/SharedMutationClient.js", import.meta.url)), false);
    assert.match(sessionActor, /function withSharedSessionActor_\(/);
    assert.match(sessionActor, /function getCachedSharedSessionActor_\(/);
    assert.match(sessionActor, /function invalidateLocalSharedSessionActorCaches_\(/);
    assert.doesNotMatch(sessionActor, /createSharedMutationClient_|withSharedMutationLease_|UrlFetchApp|GPSpedia_COORDINATOR_URL|GPSpedia_COORDINATOR_SECRET/);
});

test("ningún servicio activo conserva cliente, lease, publicación compartida o URL Coordinator", () => {
    for (const [name, source] of services) {
        assert.doesNotMatch(source, /createSharedMutationClient_|withSharedMutationLease_|publishSharedCatalogChange_|publishSharedCatalogChanges_|getSharedCatalogChanges_|getSharedServiceTraffic_/,
            "SharedMutation sigue referenciado por " + name);
        assert.doesNotMatch(source, /getProperty\(["']GPSpedia_COORDINATOR_(?:URL|SECRET)["']\)|setProperty\(["']GPSpedia_COORDINATOR_(?:URL|SECRET)["']/,
            "El servicio " + name + " todavía lee/escribe configuración Coordinator.");
    }
});

test("ADMIN reemplaza las tres leases remotas por guardas locales", () => {
    assert.doesNotMatch(admin, /withSharedMutationLease_/);
    assert.match(admin, /withAdminLocalOperationGuard_/);
    assert.match(admin, /drive-inventory:/);
    assert.match(admin, /create-cortes-image-folder:/);
    assert.match(admin, /drive-audit:/);
});

test("Coordinator ya no implementa leases ni publicación/lectura del feed", () => {
    assert.doesNotMatch(coordinator, /coordinatorPolicy_|function acquire_\(|function release_\(|function validate_\(/);
    assert.doesNotMatch(coordinator, /publishCatalogChange_|publishCatalogChanges_|getCatalogChanges_|catalogFeed/);
    assert.doesNotMatch(coordinator, /SHARED_MUTATION_(?:COORDINATOR_VERSION|PROTOCOL_VERSION|LEASE_TTL|DRAIN|MAX_WAIT|MAX_ACTIVE|MAX_STATE)/);
    assert.doesNotMatch(coordinator, /UrlFetchApp|fetchAll\(|GPSpedia_SERVICE_URL_/);
    assert.doesNotMatch(coordinator, /function invalidateSessionActorCaches_|function primeSessionActorCaches_/);
    assert.doesNotMatch(coordinator, /properties\.setProperty\(LEGACY_COORDINATOR_TRAFFIC_STATE_PROPERTY_/);
});

test("el navegador coordina invalidación local directamente con cada servicio", () => {
    assert.match(sessionInvalidation, /SESSION_CACHE_SERVICES = Object\.freeze/);
    assert.match(sessionInvalidation, /retry\("__invalidateSessionActorCache", payload/);
    assert.doesNotMatch(sessionInvalidation, /COORDINATOR|UrlFetchApp|GPSpedia_COORDINATOR_SECRET|sessionToken/);
    for (const service of ["AUTH", "WRITE", "CATALOG", "FEEDBACK", "ADMIN", "UTILITIES"]) {
        assert.ok(sessionInvalidation.includes('"' + service + '"'), "Falta invalidación frontend para " + service);
    }
});

test("solo permanecen temporalmente telemetría y health de Coordinator para MIG-025", () => {
    assert.match(api, /'getServiceTraffic': 'COORDINATOR'/);
    assert.doesNotMatch(api, /'publishCatalogReset': 'COORDINATOR'|'publishCatalogChange': 'COORDINATOR'|'getCatalogChanges': 'COORDINATOR'/);
    assert.match(coordinator, /function getServiceTrafficFromBrowser_/);
    assert.match(coordinator, /function doGet\(e\)/);
    assert.match(coordinator, /service: "GPSpedia-Coordinator"/);
    assert.match(coordinator, /COORDINATOR_SESSION_PROTOCOL_VERSION_/);
});

console.log("SharedMutationRemovalContract: " + passed + "/6 PASS");
assert.equal(passed, 6);
