import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
    BROWSER_SERVICE_TRAFFIC_SERVICES,
    getBrowserDeviceType,
    getBrowserServiceTrafficSnapshot,
    recordBrowserServiceTraffic
} from "../Frontend/serviceTelemetry.js";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const read = path => readFileSync(resolve(root, path), "utf8");
let passed = 0;
function check(name, fn) {
    fn();
    passed++;
    console.log("PASS " + name);
}

const base = 1_800_000_000_000;
check("El inventario local contiene exactamente los siete servicios activos", () => {
    assert.deepEqual(BROWSER_SERVICE_TRAFFIC_SERVICES, [
        "AUTH", "CATALOG", "WRITE", "FEEDBACK", "UTILITIES", "ADMIN", "COORDINATOR"
    ]);
});
check("El navegador móvil se identifica mediante userAgentData", () => {
    assert.equal(getBrowserDeviceType({ userAgentData: { mobile: true } }), "mobile");
    assert.equal(getBrowserDeviceType({ userAgentData: { mobile: false } }), "desktop");
});
check("El fallback identifica móviles y tabletas sin APIs modernas", () => {
    assert.equal(getBrowserDeviceType({ userAgent: "Mozilla/5.0 (Linux; Android 14; Mobile)" }), "mobile");
    assert.equal(getBrowserDeviceType({ userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)" }), "tablet");
});
check("Las solicitudes se agrupan por servicio y hora sin mezclar servicios", () => {
    recordBrowserServiceTraffic({ service: "AUTH", action: "login", timestamp: base, durationMs: 120, outcome: "success", deviceType: "mobile", requestBytes: 120, responseBytes: 240 });
    recordBrowserServiceTraffic({ service: "AUTH", action: "validateSession", timestamp: base + 1000, durationMs: 40, outcome: "success", deviceType: "mobile", requestBytes: 80, responseBytes: 160 });
    recordBrowserServiceTraffic({ service: "WRITE", action: "checkVehicle", timestamp: base + 2000, durationMs: 80, outcome: "error", deviceType: "mobile" });
    const auth = getBrowserServiceTrafficSnapshot("AUTH", { now: base + 3000, deviceType: "mobile" });
    const write = getBrowserServiceTrafficSnapshot("WRITE", { now: base + 3000, deviceType: "mobile" });
    assert.equal(auth.metrics.requests, 2);
    assert.equal(auth.metrics.successes, 2);
    assert.equal(auth.metrics.errors, 0);
    assert.equal(auth.metrics.averageDurationMs, 80);
    assert.equal(auth.metrics.percentileSampleCount, 2);
    assert.equal(auth.metrics.durationP50Ms, 80);
    assert.equal(auth.metrics.durationP95Ms, 116);
    assert.equal(auth.metrics.requestBytesP50, 100);
    assert.equal(auth.metrics.requestBytesP95, 118);
    assert.equal(auth.metrics.responseBytesP50, 200);
    assert.equal(auth.metrics.responseBytesP95, 236);
    assert.equal(auth.metrics.requestBytesTotal, 200);
    assert.equal(auth.metrics.responseBytesTotal, 400);
    assert.equal(auth.metrics.averageRequestBytes, 100);
    assert.equal(auth.metrics.averageResponseBytes, 200);
    assert.equal(write.metrics.requests, 1);
    assert.equal(write.metrics.errors, 1);
    assert.equal(auth.clientType, "mobile");
    assert.equal(auth.scope, "browser_local_service_traffic");
    assert.equal(auth.events.at(-1).action, "validateSession");
});
check("Los percentiles ignoran muestras de otros servicios y devuelven null sin datos", () => {
    const empty = getBrowserServiceTrafficSnapshot("ADMIN", { now: base + 3000 });
    assert.equal(empty.metrics.percentileSampleCount, 0);
    assert.equal(empty.metrics.durationP50Ms, null);
    assert.equal(empty.metrics.durationP95Ms, null);
    assert.equal(empty.metrics.requestBytesP95, null);
    assert.equal(empty.metrics.responseBytesP95, null);
});
check("El snapshot local contiene buckets de 24 horas y totales por periodo", () => {
    const snapshot = getBrowserServiceTrafficSnapshot("AUTH", { now: base + 3000, deviceType: "mobile" });
    assert.equal(snapshot.buckets.length, 24);
    assert.equal(snapshot.totals.lastHour, 2);
    assert.equal(snapshot.totals.last6Hours, 2);
    assert.equal(snapshot.totals.last24Hours, 2);
    assert.equal(snapshot.buckets.reduce((sum, bucket) => sum + bucket.count, 0), 2);
});
check("USERS retirado y servicios desconocidos no generan métricas; COORDINATOR sí", () => {
    assert.equal(recordBrowserServiceTraffic({ service: "USERS", action: "old", timestamp: base }), null);
    assert.equal(recordBrowserServiceTraffic({ service: "LEGACY", action: "old", timestamp: base }), null);
    assert.equal(getBrowserServiceTrafficSnapshot("USERS", { now: base }), null);
    assert.equal(getBrowserServiceTrafficSnapshot("LEGACY", { now: base }), null);
    assert.equal(getBrowserServiceTrafficSnapshot("UNKNOWN", { now: base }), null);
    assert.equal(recordBrowserServiceTraffic({ service: "COORDINATOR", action: "getServiceTraffic", timestamp: base }).service, "COORDINATOR");
});
check("Las métricas no almacenan payloads, tokens ni datos de usuario", () => {
    const serialized = JSON.stringify(getBrowserServiceTrafficSnapshot("AUTH", { now: base + 3000 }));
    assert.doesNotMatch(serialized, /sessionToken|password|payload|userId|secret/i);
});
check("La instrumentación del router es no bloqueante y registra éxito/error", () => {
    const api = read("JS/Frontend/api-config.js");
    assert.match(api, /recordBrowserServiceTraffic/);
    assert.match(api, /async function routeActionInternal_/);
    assert.match(api, /export async function routeAction\(/);
    assert.match(api, /outcome: "success"/);
    assert.match(api, /outcome: "error"/);
    assert.match(api, /requestBytes: trafficMetrics.requestBytes/);
    assert.match(api, /responseBytes: trafficMetrics.responseBytes/);
    assert.match(api, /new TextEncoder\(\)/);
    assert.match(api, /action: "getCatalogChanges"/);
    assert.match(api, /service: "FEEDBACK"/);
});
check("ADMIN declara las métricas locales, corrige events y muestra las dos gráficas", () => {
    const ui = read("JS/Frontend/ui.js");
    const html = read("index.html");
    assert.match(ui, /const events = localTraffic/);
    assert.match(ui, /const lastEvent = localTraffic/);
    assert.match(ui, /renderLocalServiceTrafficChart_/);
    assert.match(ui, /isValidGlobalServiceTrafficResponse_/);
    assert.match(ui, /filter\(key => key !== "LEGACY"\)/);
    assert.match(ui, /services.length !== expectedServices.length/);
    assert.match(html, /id="global-service-traffic-chart"/);
});
console.log("ServiceBrowserTrafficContract: " + passed + "/" + passed + " PASS");
