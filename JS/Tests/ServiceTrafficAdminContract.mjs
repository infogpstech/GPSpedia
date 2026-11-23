import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const read = path => readFileSync(resolve(root, path), "utf8");
const admin = read("JS/Services/admin.js");
const coordinator = read("JS/Services/Coordinator.js");
const shared = read("JS/Services/SharedMutationClient.js");
const api = read("JS/Frontend/api-config.js");
const ui = read("JS/Frontend/ui.js");
const html = read("index.html");
const auth = read("JS/Services/Auth.js");
const write = read("JS/Services/write.js");
const feedback = read("JS/Services/feedback.js");
const catalog = read("JS/Services/catalog.js");

assert.match(api, /'getServiceTraffic': 'COORDINATOR'/);
assert.equal(admin.includes("handleGetServiceTraffic_"), false);
assert.equal(admin.includes("getSharedServiceTraffic_"), false);
assert.equal(admin.includes("normalizeCoordinatorServiceTraffic_"), false);
assert.equal(admin.includes("validateGlobalServiceTrafficResult_"), false);
assert.ok(admin.includes('deleteProperty("GPSpedia_COORDINATOR_URL")'));
assert.ok(admin.includes('deleteProperty("GPSpedia_COORDINATOR_SECRET")'));
assert.ok(admin.includes("removeLegacyAdminCoordinatorSettings_();"));
assert.equal(admin.includes('properties.getProperty("GPSpedia_COORDINATOR_URL")'), false);
assert.equal(admin.includes('properties.getProperty("GPSpedia_COORDINATOR_SECRET")'), false);

assert.match(coordinator, /function getServiceTrafficFromBrowser_\(/);
assert.match(coordinator, /authorizeSession_\(userId, sessionToken, now\(\)\)/);
assert.match(coordinator, /role !== "desarrollador"/);
assert.match(coordinator, /readServiceTraffic_\("ADMIN", "getServiceTraffic"\)/);
assert.match(coordinator, /request\.action === "getServiceTraffic"/);
assert.match(coordinator, /telemetría global está reservada a Desarrollador/);
const trafficStart = coordinator.indexOf("function readServiceTraffic_");
const trafficEnd = coordinator.indexOf("\n    function authorizeSession_", trafficStart);
assert.ok(trafficStart >= 0 && trafficEnd > trafficStart);
const trafficReader = coordinator.slice(trafficStart, trafficEnd);
assert.doesNotMatch(trafficReader, /fetchAll|UrlFetchApp|GPSpedia_SERVICE_URL_/);
assert.match(trafficReader, /mergeServiceTrafficSources_\(coordinatorResult\)/);
assert.match(coordinator, /function mergeServiceTrafficSources_\(source\)/);
assert.match(coordinator, /function incrementServiceTrafficBucketState_\(service, capturedAt, operation\)/);
assert.match(coordinator, /function saveLeases_\(leases, trafficEvent\)/);
assert.doesNotMatch(coordinator, /function recordServiceTrafficEvent_/);
const validationStart = coordinator.indexOf("function validateSessionContext_");
const validationEnd = coordinator.indexOf("\\n    function ", validationStart + 10);
assert.ok(validationStart >= 0 && validationEnd > validationStart);
assert.doesNotMatch(coordinator.slice(validationStart, validationEnd), /recordServiceTrafficEvent_|incrementServiceTrafficBucketState_/);
const feedStart = coordinator.indexOf("function getCatalogChanges_");
const feedEnd = coordinator.indexOf("\\n    function ", feedStart + 10);
assert.ok(feedStart >= 0 && feedEnd > feedStart);
assert.doesNotMatch(coordinator.slice(feedStart, feedEnd), /recordServiceTrafficEvent_|incrementServiceTrafficBucketState_/);

assert.match(shared, /function getServiceTraffic\(\)/);
assert.match(shared, /send_\("getServiceTraffic"/);
for (const [name, source] of [["AUTH", auth], ["WRITE", write], ["FEEDBACK", feedback], ["CATALOG", catalog]]) {
    assert.doesNotMatch(source, /recordDirectServiceTraffic_|readDirectServiceTraffic_|recordUsersDirectTraffic_|readUsersDirectTraffic_|recordCatalogTraffic_|readCatalogTraffic_/,
        name + " no debe persistir ni exponer contadores directos.");
    assert.doesNotMatch(source, /DIRECT_SERVICE_TRAFFIC_CONFIG_|USERS_DIRECT_TRAFFIC_PREFIX_|CATALOG_TRAFFIC_BUCKET_PREFIX_/,
        name + " no debe conservar configuración de contadores directos.");
}
assert.doesNotMatch(catalog, /CATALOG_TRAFFIC_SECRET_PROPERTY_|catalogTrafficSecretEquals_/,
    "CATALOG no debe conservar el secreto compartido del endpoint interno retirado por MIG-010.");
assert.doesNotMatch(admin, /CATALOG_SERVICE_URL|CATALOG_TRAFFIC_SECRET_PROPERTY_|getAdminProjectedVehicleFieldSnapshot_/,
    "ADMIN no debe conservar URLs, secretos ni clientes backend→CATALOG.");
assert.match(feedback, /getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken, \{ service: "FEEDBACK" \}\)/);
assert.match(feedback, /FEEDBACK_PUBLIC_ACTIONS/);

assert.match(html, /Tráfico global coordinado/);
assert.match(html, /No se recopilan contadores directos de rutas ordinarias/);
assert.match(ui, /Solo eventos registrados por Coordinator/);
assert.match(ui, /getBrowserServiceTrafficSnapshot/);
assert.match(ui, /Solicitudes de este navegador/);
assert.match(ui, /lastGlobalServiceTrafficFetchAt < 60000/);
assert.match(ui, /renderGlobalServiceTrafficChart_/);
assert.match(ui, /isValidGlobalServiceTrafficResponse_/);
assert.match(html, /Un cero no significa necesariamente que el servicio no recibió solicitudes/);

console.log("ServiceTrafficAdminContract: 43/43 PASS");
