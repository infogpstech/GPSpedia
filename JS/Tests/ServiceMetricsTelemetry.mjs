import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServiceMetricsStore, bucketServiceMetrics, SERVICE_METRIC_WINDOW_MS, SERVICE_METRIC_MAX_EVENTS } from "../Frontend/serviceMetrics.js";

let now = 0;
const store = createServiceMetricsStore({ now: () => now });
let passed = 0;
function check(name, fn) {
    fn();
    passed++;
    console.log("PASS " + name);
}

check("La telemetría usa la hora de inicio aunque la solicitud termine tarde", () => {
    now = 20_000;
    store.record({ service:"AUTH", action:"login", timestamp:0, durationMs:20_000, outcome:"success" });
    const event = store.getSnapshot().events[0];
    assert.equal(event.timestamp,0);
    assert.equal(event.durationMs,20_000);
});

check("La ventana móvil conserva el límite inferior exacto y expira justo después", () => {
    now = SERVICE_METRIC_WINDOW_MS;
    const fresh = store.getSnapshot();
    assert.equal(fresh.events.length,1);
    now++;
    assert.equal(store.getSnapshot().events.length,0);
});

check("Solicitudes concurrentes que terminan fuera de orden quedan ordenadas por inicio", () => {
    now = 100_000;
    const concurrent = createServiceMetricsStore({ now: () => now });
    concurrent.record({service:"AUTH",timestamp:90_000,durationMs:20_000});
    concurrent.record({service:"CATALOG",timestamp:80_000,durationMs:30_000});
    assert.deepEqual(concurrent.getSnapshot().events.map(event=>event.timestamp),[80_000,90_000]);
});

check("La muestra informa truncamiento al superar 600 eventos y lo caduca con la ventana", () => {
    now = 100_000;
    const bounded = createServiceMetricsStore({ now: () => now });
    for(let i=0;i<SERVICE_METRIC_MAX_EVENTS+1;i++) {
        bounded.record({service:"AUTH",timestamp:1_000+i,durationMs:1});
    }
    const limited = bounded.getSnapshot();
    assert.equal(limited.events.length,600);
    assert.equal(limited.truncated,true);
    assert.equal(limited.eventLimit,600);
    now = 901_001;
    assert.equal(bounded.getSnapshot().truncated,false);
});

check("Los buckets cubren exactamente los quince minutos y ambos límites", () => {
    now = SERVICE_METRIC_WINDOW_MS;
    const boundary = createServiceMetricsStore({ now: () => now });
    [
        {service:"AUTH",timestamp:-1},
        {service:"AUTH",timestamp:0},
        {service:"AUTH",timestamp:59_999},
        {service:"AUTH",timestamp:60_000},
        {service:"AUTH",timestamp:899_999},
        {service:"AUTH",timestamp:900_000},
        {service:"AUTH",timestamp:900_001}
    ].forEach(event=>boundary.record(event));
    const snapshot = boundary.getSnapshot();
    const buckets = bucketServiceMetrics(snapshot,["AUTH"]);
    assert.equal(buckets.bucketCount,15);
    assert.equal(buckets.startAt,0);
    assert.deepEqual(buckets.series[0].counts,[2,1,0,0,0,0,0,0,0,0,0,0,0,0,2]);
    assert.equal(buckets.series[0].counts.reduce((sum,value)=>sum+value,0),5);
});

check("Los eventos se conservan por inicio, no por orden de finalización", () => {
    now = 1_000_000;
    const concurrent = createServiceMetricsStore({ now: () => now });
    concurrent.record({service:"WRITE",timestamp:990_000,durationMs:50_000});
    concurrent.record({service:"WRITE",timestamp:995_000,durationMs:1_000});
    const snapshot = concurrent.getSnapshot();
    const buckets = bucketServiceMetrics(snapshot,["WRITE"]);
    assert.equal(buckets.series[0].counts.reduce((sum,value)=>sum+value,0),2);
});

check("La suscripción se puede retirar y un error de listener no interrumpe la captura", () => {
    now = 2_000_000;
    const subscribed = createServiceMetricsStore({ now: () => now });
    let notifications = 0;
    const unsubscribe = subscribed.subscribe(()=>{ notifications++; });
    subscribed.subscribe(()=>{ throw new Error("listener failure"); });
    subscribed.record({service:"ADMIN",timestamp:now});
    unsubscribe();
    subscribed.record({service:"ADMIN",timestamp:now+1});
    assert.equal(notifications,1);
});

check("routeAction marca el inicio antes de fetch y conserva la duración final", () => {
    const api = readFileSync(new URL("../Frontend/api-config.js", import.meta.url),"utf8");
    const start = api.indexOf("export async function routeAction");
    const end = api.indexOf("\n// 3. FUNCIONES DE CONVENIENCIA",start);
    const route = api.slice(start,end);
    assert.ok(route.indexOf("const requestStartedAt = Date.now()") < route.indexOf("response = await fetch"));
    assert.ok(route.includes("timestamp: requestStartedAt"));
    assert.ok(route.includes("durationMs: Date.now() - requestStartedAt"));
});

check("El gráfico usa buckets de ventana móvil y advierte truncamiento", () => {
    const ui = readFileSync(new URL("../Frontend/ui.js", import.meta.url),"utf8");
    const start = ui.indexOf("function renderServiceTrafficChart()");
    const end = ui.indexOf("function renderServiceDashboard()",start);
    const chart = ui.slice(start,end);
    assert.ok(chart.includes("bucketServiceMetrics(snapshot, keys)"));
    assert.ok(chart.includes("snapshot.truncated"));
    assert.ok(chart.includes("ventana móvil exacta de quince minutos"));
});

check("Las actualizaciones DOM solo ocurren con diagnóstico visible y el refresco se limpia al cerrar", () => {
    const ui = readFileSync(new URL("../Frontend/ui.js", import.meta.url),"utf8");
    assert.ok(ui.includes("!isServiceDiagnosticsVisible_()"));
    assert.ok(ui.includes("window.adminServiceMetricsRefreshInterval = window.setInterval"));
    assert.ok(ui.includes("clearInterval(window.adminServiceMetricsRefreshInterval)"));
    assert.ok(ui.includes("container.getClientRects().length > 0"));
});

console.log("ServiceMetricsTelemetry: "+passed+"/"+passed+" PASS");
