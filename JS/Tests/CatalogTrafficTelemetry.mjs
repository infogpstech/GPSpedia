import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const catalogSource = readFileSync(resolve(root, "JS/Services/catalog.js"), "utf8");
const routerStart = catalogSource.indexOf("const CATALOG_TRAFFIC_BUCKET_PREFIX_");
const routerEnd = catalogSource.indexOf("// ============================================================================\n// ROUTER PRINCIPAL", routerStart);
assert.ok(routerStart >= 0 && routerEnd > routerStart, "No se encontró el bloque de telemetría CATALOG.");
const telemetrySource = catalogSource.slice(routerStart, routerEnd);
const factory = new Function("LockService", "PropertiesService",
    telemetrySource + "\nreturn { recordCatalogTraffic_, readCatalogTraffic_ };"
);

function createHarness(options = {}) {
    const store = new Map();
    const calls = { tryLock: [], releases: 0, writes: 0, deletes: 0 };
    const properties = {
        getProperty: key => store.has(key) ? store.get(key) : null,
        setProperty: (key, value) => {
            calls.writes++;
            if (options.writeError) throw new Error("properties unavailable");
            store.set(String(key), String(value));
        },
        deleteProperty: key => { calls.deletes++; store.delete(key); },
        getProperties: () => {
            if (options.readError) throw new Error("properties unavailable");
            return Object.fromEntries(store.entries());
        }
    };
    const lock = {
        tryLock: timeout => {
            calls.tryLock.push(timeout);
            if (options.lockError) throw new Error("lock unavailable");
            return options.lockAvailable !== false;
        },
        releaseLock: () => { calls.releases++; }
    };
    const api = factory({ getScriptLock: () => lock }, { getScriptProperties: () => properties });
    return { ...api, store, calls, properties };
}

const base = 1_800_000_000_000;
const bucketMs = 60 * 60 * 1000;
const secret = "catalog-traffic-secret-".padEnd(48, "x");
let passed = 0;
function test(name, run) {
    run();
    passed++;
    console.log("PASS " + name);
}

test("el contador intenta el lock con timeout cero, incrementa y libera", () => {
    const h = createHarness();
    h.store.set("GPSpedia_CATALOG_TRAFFIC_SECRET", secret);
    assert.equal(h.recordCatalogTraffic_(base), true);
    assert.deepEqual(h.calls.tryLock, [0]);
    assert.equal(h.calls.releases, 1);
    assert.equal(h.calls.writes, 1);
    const result = h.readCatalogTraffic_(secret, base);
    assert.equal(result.status, "success");
    assert.equal(result.totals.lastHour, 1);
    assert.equal(result.totals.last24Hours, 1);
});

test("el lock ocupado omite solo la métrica y no espera ni escribe", () => {
    const h = createHarness({ lockAvailable: false });
    assert.equal(h.recordCatalogTraffic_(base), false);
    assert.deepEqual(h.calls.tryLock, [0]);
    assert.equal(h.calls.releases, 0);
    assert.equal(h.calls.writes, 0);
    assert.equal(h.store.size, 0);
});

test("la retención conserva 24 buckets horarios y elimina los vencidos al abrir hora", () => {
    const h = createHarness();
    h.store.set("GPSpedia_CATALOG_TRAFFIC_SECRET", secret);
    assert.equal(h.recordCatalogTraffic_(base - 25 * bucketMs), true);
    assert.equal(h.recordCatalogTraffic_(base), true);
    const result = h.readCatalogTraffic_(secret, base);
    assert.equal(result.buckets.length, 24);
    assert.equal(result.totals.last24Hours, 1);
    assert.equal(h.calls.deletes, 1);
});

test("las ventanas de una hora, seis horas y veinticuatro horas se calculan por bucket", () => {
    const h = createHarness();
    h.store.set("GPSpedia_CATALOG_TRAFFIC_SECRET", secret);
    h.recordCatalogTraffic_(base - 2 * bucketMs);
    h.recordCatalogTraffic_(base);
    const result = h.readCatalogTraffic_(secret, base);
    assert.equal(result.totals.lastHour, 1);
    assert.equal(result.totals.last6Hours, 2);
    assert.equal(result.totals.last24Hours, 2);
});

test("CATALOG acepta secreto Coordinator y conserva fallback legacy", () => {
    const h = createHarness();
    h.properties.setProperty("GPSpedia_COORDINATOR_SECRET", secret);
    assert.equal(h.readCatalogTraffic_(secret, base).status, "success");
    h.properties.deleteProperty("GPSpedia_COORDINATOR_SECRET");
    h.properties.setProperty("GPSpedia_CATALOG_TRAFFIC_SECRET", secret);
    assert.equal(h.readCatalogTraffic_(secret, base).status, "success");
    h.properties.setProperty("GPSpedia_COORDINATOR_SECRET", "wrong-coordinator-secret".padEnd(48, "x"));
    assert.equal(h.readCatalogTraffic_(secret, base).status, "error");
});
test("un secreto ausente, corto o incorrecto no permite leer métricas", () => {
    const h = createHarness();
    h.properties.setProperty("GPSpedia_CATALOG_TRAFFIC_SECRET", secret);
    assert.equal(h.readCatalogTraffic_("", base).status, "error");
    assert.equal(h.readCatalogTraffic_("wrong-secret".padEnd(48, "x"), base).status, "error");
    assert.equal(h.readCatalogTraffic_(secret, base).status, "success");
});

test("los fallos de PropertiesService no bloquean la acción CATALOG", () => {
    const h = createHarness({ writeError: true });
    assert.equal(h.recordCatalogTraffic_(base), false);
    assert.equal(h.calls.releases, 1);
});

test("la respuesta identifica el alcance best-effort y no incluye identidad ni sesión", () => {
    const h = createHarness();
    h.properties.setProperty("GPSpedia_CATALOG_TRAFFIC_SECRET", secret);
    h.recordCatalogTraffic_(base);
    const result = h.readCatalogTraffic_(secret, base);
    assert.equal(result.scope, "catalog_post_requests");
    assert.equal(result.accuracy, "best_effort_nonblocking");
    assert.equal(result.mayUndercount, true);
    assert.equal(Object.prototype.hasOwnProperty.call(result, "userId"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(result, "sessionToken"), false);
    assert.equal(JSON.stringify(result).includes(secret), false);
});

test("el router excluye su endpoint de telemetría y cuenta solo acciones CATALOG reconocidas", () => {
    const doPost = catalogSource.slice(catalogSource.indexOf("function doPost(e)"), catalogSource.indexOf("// ============================================================================\n// MANEJADORES DE ACCIONES"));
    assert.ok(doPost.indexOf('if (action === "getServiceTraffic")') < doPost.indexOf("recordCatalogTraffic_()"));
    assert.match(catalogSource, /new Set\(\[\s*"getCatalogData", "getDropdownData", "getSuggestion", "getNavigationData"/);
    assert.doesNotMatch(telemetrySource, /UrlFetchApp|LockService\.waitLock/);
});

console.log("CatalogTrafficTelemetry: " + passed + "/9 PASS");
