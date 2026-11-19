import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(fileURLToPath(new URL("../..", import.meta.url)));
const read=path=>readFileSync(resolve(root,path),"utf8");
const admin=read("JS/Services/admin.js");
const coordinator=read("JS/Services/Coordinator.js");
const shared=read("JS/Services/SharedMutationClient.js");
const api=read("JS/Frontend/api-config.js");
const ui=read("JS/Frontend/ui.js");
const html=read("index.html");
const healthDoc=read("Services/SERVICE_HEALTH.md");
const setupDoc=read("Services/COORDINATOR_SETUP.md");

assert.match(api,/'getServiceTraffic': 'ADMIN'/);
assert.match(admin,/function handleGetServiceTraffic_\(payload, logMessage, developerContext\)/);
assert.match(admin,/function getDirectServiceTrafficBatch_\(\)/);
assert.match(admin,/UrlFetchApp\.fetchAll\(requests\)/);
assert.match(admin,/function mergeDirectServiceTraffic_\(coordinatorResult, directResults\)/);
assert.match(admin,/function normalizeCoordinatorServiceTraffic_\(source\)/);
assert.match(admin,/exactamente los siete servicios activos/);
assert.match(admin, /\{ service: "AUTH", url: AUTH_SERVICE_URL, scope: "direct_post_requests" \}/);
assert.match(admin, /\{ service: "WRITE", url: WRITE_SERVICE_URL, scope: "direct_post_requests" \}/);
assert.match(admin, /\{ service: "FEEDBACK", url: FEEDBACK_SERVICE_URL, scope: "direct_post_requests" \}/);
assert.match(admin, /\{ service: "USERS", url: USERS_SERVICE_URL, scope: "direct_post_requests" \}/);
const authService = read("JS/Services/Auth.js");
const writeService = read("JS/Services/write.js");
const feedbackService = read("JS/Services/feedback.js");
const usersService = read("JS/Services/users.js");
const catalogService = read("JS/Services/catalog.js");
assert.match(authService,/actions: new Set\(\["validateSession"\]\)/);
assert.match(writeService,/actions: new Set\(\["checkVehicle","getSuggestion","checkVinDuplicate"\]\)/);
assert.match(feedbackService,/actions: new Set\(\["recordLike","reportProblem"/);
assert.match(usersService,/USERS_DIRECT_TRAFFIC_PREFIX_/);
assert.match(usersService,/if \(action === "getUsers"\) recordUsersDirectTraffic_\(\)/);
assert.match(authService,/properties\.getProperty\("GPSpedia_COORDINATOR_SECRET"\)/);
assert.match(writeService,/properties\.getProperty\("GPSpedia_COORDINATOR_SECRET"\)/);
assert.match(feedbackService,/properties\.getProperty\("GPSpedia_COORDINATOR_SECRET"\)/);
assert.match(usersService,/properties\.getProperty\("GPSpedia_COORDINATOR_SECRET"\)/);
assert.match(catalogService,/properties\.getProperty\("GPSpedia_COORDINATOR_SECRET"\)/);

assert.match(feedbackService,/getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken, \{ service: "FEEDBACK" \}\)/);
assert.doesNotMatch(feedbackService.slice(feedbackService.indexOf("function doPost(e)"),feedbackService.indexOf("\nconst RICH_TEXT_MODE_PROPERTY_")),/withSharedMutationLease_/);
assert.match(feedbackService,/anonymousSuggestion/);
assert.match(feedbackService,/actions: new Set\([\s\S]*?"suggestYear"[\s\S]*?"sendContactForm"/);
assert.doesNotMatch(admin,/UTILITIES_SERVICE_URL|service: "UTILITIES", url:/);
assert.match(coordinator,/UTILITIES:\s*\{\s*migrateTimestamps:\s*\{\s*read:\s*\["SESSION_CONTEXTS",\s*"CORTES",\s*"DRIVE"\],\s*write:\s*\["UTILITIES"\]\s*\}/);

assert.match(admin,/getSharedServiceTraffic_\(\)/);
assert.match(coordinator,/getServiceTraffic: \{ read: \["SERVICE_TRAFFIC"\] \}/);
assert.match(coordinator,/service !== "ADMIN" \|\| operation !== "getServiceTraffic"/);
assert.match(coordinator,/scope: "coordinator_protected_operations"/);
assert.match(coordinator,/function readDirectServiceTrafficBatch_\(\)/);
assert.match(coordinator,/function mergeServiceTrafficSources_\(source, directResults\)/);
assert.match(coordinator,/fetchAll\(requests\)/);
assert.match(coordinator,/GPSpedia_COORDINATOR_SECRET_" \+ spec\.service/);
assert.match(coordinator,/scope: "global_service_traffic"/);
assert.match(admin,/coordinatorResult\.scope === "global_service_traffic"/);
assert.match(admin,/coordinatorResult\.scope === "coordinator_protected_operations"/);

assert.match(coordinator,/SERVICE_TRAFFIC_BUCKET_MS_ = 60 \* 60 \* 1000/);
assert.match(coordinator,/SERVICE_TRAFFIC_WINDOW_MS_ = 24 \* 60 \* 60 \* 1000/);
assert.match(coordinator,/recordServiceTrafficEvent_\(service, currentTime, operation\)/);
assert.match(coordinator,/SHARED_MUTATION_COORDINATOR_VERSION = "1\.4\.4"/);
assert.match(coordinator,/function validateSessionContext_\(service, operation, payload\)/);
assert.match(coordinator,/SHARED_MUTATION_PROTOCOL_VERSION = 1/);
assert.match(coordinator,/request.protocolVersion === undefined/);
assert.match(shared,/SHARED_MUTATION_CLIENT_PROTOCOL_VERSION = 1/);
assert.match(shared,/protocolVersion: SHARED_MUTATION_CLIENT_PROTOCOL_VERSION/);
assert.match(coordinator,/function invalidateSessionActorCaches_\(service, operation, payload\)/);
assert.match(coordinator,/GPSpedia_SERVICE_URL_/);
assert.match(coordinator,/action: "__invalidateSessionActorCache"/);
assert.match(shared,/send_\("invalidateSessionActorCaches", "AUTH", "invalidateSessionActorCaches"/);
assert.doesNotMatch(shared,/GPSpedia_WRITE_URL|GPSpedia_FEEDBACK_URL/);

assert.match(coordinator,/!\["AUTH", "USERS", "WRITE", "ADMIN", "FEEDBACK", "UTILITIES"\]\.includes\(service\)/);
assert.match(shared,/function validateSessionContext\(userId, sessionToken, service\)/);
assert.match(shared,/deps\.service \|\| "AUTH"/);
for (const [path, service] of [
    ["JS/Services/Auth.js", "AUTH"], ["JS/Services/admin.js", "ADMIN"],
    ["JS/Services/feedback.js", "FEEDBACK"], ["JS/Services/users.js", "USERS"],
    ["JS/Services/write.js", "WRITE"]
]) {
    assert.match(read(path), new RegExp("getCachedSharedSessionActor_\\(payload\\.userId, payload\\.sessionToken, \\{ service: \"" + service + "\" \\}\\)"));
}
assert.match(shared,/function getServiceTraffic\(\)/);
assert.match(shared,/send_\("getServiceTraffic", "ADMIN", "getServiceTraffic", \{\}\)/);

assert.match(html,/id="global-service-traffic-chart"/);
assert.match(html,/Tráfico global coordinado/);
assert.doesNotMatch(html,/id="service-traffic-chart"|Actividad de este navegador/);
assert.match(html,/Un cero no significa necesariamente que el servicio no recibió solicitudes/);
assert.match(ui,/routeActionWithRetry\("getServiceTraffic",\s*getSessionPayload_\(\)/);
assert.match(ui,/lastGlobalServiceTrafficFetchAt < 60000/);
assert.match(ui,/renderGlobalServiceTrafficChart_/);
assert.match(ui,/Operaciones globales \(24 h\)/);
assert.match(ui,/globalServiceTrafficData\.totals/);
assert.match(ui,/getBrowserServiceTrafficSnapshot/);
assert.match(ui,/const events = localTraffic/);
assert.match(ui,/renderLocalServiceTrafficChart_/);
assert.match(ui,/isValidGlobalServiceTrafficResponse_/);
assert.match(ui,/filter\(key => key !== "LEGACY"\)/);
assert.doesNotMatch(ui,/getServiceMetricsSnapshot|bucketServiceMetrics|subscribeServiceMetrics/);
assert.doesNotMatch(api,/serviceMetrics|recordServiceMetric|getServiceMetricsSnapshot|bucketServiceMetrics/);
assert.match(html,/operaciones protegidas/);
assert.match(setupDoc,/telemetría global|SERVICE_TRAFFIC/i);
assert.match(healthDoc,/2,000 ms/);

console.log("ServiceTrafficAdminContract: 33/33 PASS");
