import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const read=path=>readFileSync(resolve(root,path),"utf8");
const admin=read("JS/Services/admin.js");
const coordinator=read("JS/Services/Coordinator.js");
const shared=read("JS/Services/SharedMutationClient.js");
const api=read("JS/Frontend/api-config.js");
const ui=read("JS/Frontend/ui.js");
const html=read("index.html");
const localMetrics=read("JS/Frontend/serviceMetrics.js");
const healthDoc=read("Services/SERVICE_HEALTH.md");
const setupDoc=read("Services/COORDINATOR_SETUP.md");

assert.match(api,/'getServiceTraffic': 'ADMIN'/);
assert.match(admin,/getServiceTraffic/);
assert.match(admin,/function handleGetServiceTraffic_\(payload, logMessage, developerContext\)/);
assert.match(admin,/getSharedServiceTraffic_\(\)/);
assert.match(admin,/getServiceTraffic.*includes\(action\)/);
assert.match(coordinator,/getServiceTraffic: \{ read: \["SERVICE_TRAFFIC"\] \}/);
assert.match(coordinator,/service !== "ADMIN" \|\| operation !== "getServiceTraffic"/);
assert.match(coordinator,/scope: "coordinator_protected_operations"/);
assert.match(coordinator,/SERVICE_TRAFFIC_BUCKET_MS_ = 60 \* 60 \* 1000/);
assert.match(coordinator,/SERVICE_TRAFFIC_WINDOW_MS_ = 24 \* 60 \* 60 \* 1000/);
assert.match(coordinator,/recordServiceTrafficEvent_\(service, currentTime, operation\)/);
assert.match(coordinator,/operation === "getServiceTraffic"/);
assert.match(shared,/function getServiceTraffic\(\)/);
assert.match(shared,/send_\("getServiceTraffic", "ADMIN", "getServiceTraffic", \{\}\)/);
assert.match(shared,/function getSharedServiceTraffic_\(\)/);

assert.match(html,/id="global-service-traffic-chart"/);
assert.match(html,/Tráfico global coordinado/);
assert.match(html,/id="service-traffic-chart"/);
assert.match(html,/Actividad de este navegador/);
assert.match(html,/No representa todas las solicitudes HTTP/);
assert.match(ui,/routeActionWithRetry\("getServiceTraffic"/);
assert.match(ui,/lastGlobalServiceTrafficFetchAt < 60000/);
assert.match(ui,/renderGlobalServiceTrafficChart_/);
assert.match(ui,/getServiceMetricsSnapshot\(\)/);
assert.match(localMetrics,/export function createServiceMetricsStore/);
assert.match(html,/operaciones protegidas/);
assert.match(setupDoc,/telemetría global|SERVICE_TRAFFIC/i);
assert.doesNotMatch(ui,/globalServiceTrafficData\s*=\s*getServiceMetricsSnapshot/);

console.log("ServiceTrafficAdminContract: 20/20 PASS");
