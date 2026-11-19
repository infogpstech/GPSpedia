import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(fileURLToPath(new URL("../..", import.meta.url)));
const read=path=>readFileSync(resolve(root,path),"utf8");
const ui=read("JS/Frontend/ui.js");
const api=read("JS/Frontend/api-config.js");
const html=read("index.html");

assert.doesNotMatch(api,/createServiceMetricsStore|recordServiceMetric|getServiceMetricsSnapshot|subscribeServiceMetrics/);
assert.match(ui,/getBrowserServiceTrafficSnapshot/);
assert.match(ui,/const events = localTraffic/);
assert.match(ui,/renderLocalServiceTrafficChart_/);
assert.match(ui,/isValidGlobalServiceTrafficResponse_/);
assert.doesNotMatch(ui,/getServiceMetricsSnapshot|bucketServiceMetrics|subscribeServiceMetrics/);
assert.match(ui,/isGlobalServiceTrafficVisible_/);
assert.match(ui,/loadGlobalServiceTraffic_\(\)/);
assert.match(ui,/Operaciones globales \(1 h\)/);
assert.match(ui,/Operaciones globales \(6 h\)/);
assert.match(ui,/Operaciones globales \(24 h\)/);
assert.match(html,/Tráfico global coordinado/);
assert.doesNotMatch(html,/Actividad de este navegador|id="service-traffic-chart"/);

console.log("ServiceMetricsTelemetry: 1/1 PASS");
