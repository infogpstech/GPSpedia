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
const users = read("JS/Services/users.js");
const write = read("JS/Services/write.js");
const feedback = read("JS/Services/feedback.js");
const catalog = read("JS/Services/catalog.js");

assert.match(api, /'getServiceTraffic': 'ADMIN'/);
assert.match(admin, /function handleGetServiceTraffic_\(payload, logMessage, developerContext\)/);
assert.match(admin, /function normalizeCoordinatorServiceTraffic_\(source\)/);
assert.match(admin, /function validateGlobalServiceTrafficResult_\(source\)/);
assert.doesNotMatch(admin, /function getDirectServiceTrafficBatch_/);
assert.doesNotMatch(admin, /function mergeDirectServiceTraffic_/);
assert.match(admin, /developerContext\.role[^\n]*desarrollador/);
assert.match(admin, /normalizeCoordinatorServiceTraffic_\(coordinatorResult\)/);
assert.match(coordinator, /function mergeServiceTrafficSources_\(source\)/);
assert.doesNotMatch(coordinator, /function readDirectServiceTrafficBatch_/);
const trafficReader = coordinator.slice(coordinator.indexOf("function readServiceTraffic_"), coordinator.indexOf("function authorizeSession_", coordinator.indexOf("function readServiceTraffic_")));
assert.doesNotMatch(trafficReader, /fetchAll|UrlFetchApp|GPSpedia_SERVICE_URL_/);
assert.match(trafficReader, /mergeServiceTrafficSources_\(coordinatorResult\)/);
assert.match(coordinator, /SHARED_MUTATION_COORDINATOR_VERSION = "1\.4\.7"/);
assert.match(coordinator, /recordServiceTrafficEvent_\(service, result\.trafficCapturedAt, "validateSessionContext"\)/);
assert.match(coordinator, /recordServiceTrafficEvent_\(trafficService, capturedAt, operation\)/);
assert.match(shared, /function getServiceTraffic\(\)/);
assert.match(shared, /send_\("getServiceTraffic"/);

for (const [name, source] of [["AUTH", auth], ["USERS", users], ["WRITE", write], ["FEEDBACK", feedback], ["CATALOG", catalog]]) {
    assert.doesNotMatch(source, /recordDirectServiceTraffic_|readDirectServiceTraffic_|recordUsersDirectTraffic_|readUsersDirectTraffic_|recordCatalogTraffic_|readCatalogTraffic_/,
        name + " no debe persistir ni exponer contadores directos.");
    assert.doesNotMatch(source, /DIRECT_SERVICE_TRAFFIC_CONFIG_|USERS_DIRECT_TRAFFIC_PREFIX_|CATALOG_TRAFFIC_BUCKET_PREFIX_/,
        name + " no debe conservar configuración de contadores directos.");
    const start = source.indexOf("function doPost(e)");
    const end = source.indexOf("\nfunction ", start + 15);
    const router = source.slice(start, end > start ? end : source.length);
    assert.doesNotMatch(router, /getServiceTraffic|record[A-Za-z]*Traffic_/,
        name + " no debe registrar métricas en su ruta ordinaria ni exponer endpoint interno.");
}
assert.match(catalog, /const CATALOG_TRAFFIC_SECRET_PROPERTY_/);
assert.match(catalog, /properties\.getProperty\(CATALOG_TRAFFIC_SECRET_PROPERTY_\)/,
    "El secreto CATALOG sigue protegiendo metadatos internos de inventario de imágenes.");
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
assert.match(admin, /telemetría global está reservada a Desarrollador/);

console.log("ServiceTrafficAdminContract: 46/46 PASS");
