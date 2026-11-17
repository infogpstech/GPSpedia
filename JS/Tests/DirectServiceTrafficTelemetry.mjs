import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const services = [
    { name: "AUTH", path: "JS/Services/Auth.js", actions: ["validateSession"], end: "function doGet(e)" },
    { name: "WRITE", path: "JS/Services/write.js", actions: ["checkVehicle", "getSuggestion", "checkVinDuplicate"], end: "function doGet(e)" },
    { name: "FEEDBACK", path: "JS/Services/feedback.js", actions: ["getPysData"], end: "function doGet(e)" },
];
const base = 1_800_000_000_000;
const secret = "direct-service-secret-".padEnd(48, "x");
let passed = 0;
function test(name, run) {
    run();
    passed++;
    console.log("PASS " + name);
}
function createHarness(factory, options = {}) {
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
        getProperties: () => Object.fromEntries(store.entries())
    };
    const lock = {
        tryLock: timeout => {
            calls.tryLock.push(timeout);
            return options.lockAvailable !== false;
        },
        releaseLock: () => { calls.releases++; }
    };
    const api = factory({ getScriptLock: () => lock }, { getScriptProperties: () => properties });
    return { ...api, store, calls, properties };
}

for (const service of services) {
    const source = readFileSync(resolve(root, service.path), "utf8");
    const start = source.indexOf("const DIRECT_SERVICE_TRAFFIC_CONFIG_");
    const end = source.indexOf(service.end, start);
    assert.ok(start >= 0 && end > start, service.name + " helper block not found");
    const factorySource = source.slice(start, end);
    const factory = new Function("LockService", "PropertiesService",
        factorySource + "\nreturn { recordDirectServiceTraffic_, readDirectServiceTraffic_, DIRECT_SERVICE_TRAFFIC_CONFIG_ };"
    );
    const expectedSecretProperty = "GPSpedia_" + service.name + "_TRAFFIC_SECRET";

    test(service.name + " registra solo las rutas directas auditadas", () => {
        const h = createHarness(factory);
        assert.equal(h.DIRECT_SERVICE_TRAFFIC_CONFIG_.service, service.name);
        assert.deepEqual([...h.DIRECT_SERVICE_TRAFFIC_CONFIG_.actions], service.actions);
        assert.equal(h.DIRECT_SERVICE_TRAFFIC_CONFIG_.secretProperty, expectedSecretProperty);
    });

    test(service.name + " registra en bucket horario y devuelve totales 1/6/24 h", () => {
        const h = createHarness(factory);
        h.store.set(expectedSecretProperty, secret);
        assert.equal(h.recordDirectServiceTraffic_(base), true);
        assert.deepEqual(h.calls.tryLock, [0]);
        assert.equal(h.calls.releases, 1);
        const result = h.readDirectServiceTraffic_(secret, base);
        assert.equal(result.status, "success");
        assert.equal(result.service, service.name);
        assert.equal(result.scope, "direct_post_requests");
        assert.equal(result.totals.lastHour, 1);
        assert.equal(result.totals.last6Hours, 1);
        assert.equal(result.totals.last24Hours, 1);
        assert.equal(JSON.stringify(result).includes(secret), false);
    });

    test(service.name + " omite telemetría cuando el lock está ocupado sin liberar ni escribir", () => {
        const h = createHarness(factory, { lockAvailable: false });
        assert.equal(h.recordDirectServiceTraffic_(base), false);
        assert.deepEqual(h.calls.tryLock, [0]);
        assert.equal(h.calls.releases, 0);
        assert.equal(h.calls.writes, 0);
        assert.equal(h.store.size, 0);
    });

    test(service.name + " falla de forma best-effort si PropertiesService no puede escribir", () => {
        const h = createHarness(factory, { writeError: true });
        assert.equal(h.recordDirectServiceTraffic_(base), false);
        assert.equal(h.calls.releases, 1);
    });

    test(service.name + " rechaza secreto ausente o incorrecto", () => {
        const h = createHarness(factory);
        h.store.set(expectedSecretProperty, secret);
        assert.equal(h.readDirectServiceTraffic_("", base).status, "error");
        assert.equal(h.readDirectServiceTraffic_("wrong-secret".padEnd(48, "x"), base).status, "error");
    });

    test(service.name + " expone endpoint interno y cuenta solo la ruta directa configurada", () => {
        const doPostStart = source.indexOf("function doPost(e)");
        const doPostEnd = source.indexOf("\nfunction ", doPostStart + 15);
        const doPost = source.slice(doPostStart, doPostEnd > doPostStart ? doPostEnd : source.length);
        assert.ok(doPost.includes('action === "getServiceTraffic"'));
        assert.ok(doPost.includes("recordDirectServiceTraffic_()"));
        assert.ok(doPost.includes("DIRECT_SERVICE_TRAFFIC_CONFIG_.actions.has"));
    });
}

const feedback = readFileSync(resolve(root, "JS/Services/feedback.js"), "utf8");
const anonymousStart = feedback.indexOf('if (action === "suggestYear" && String(payload.userId || "").trim() === "0")');
const anonymousEnd = feedback.indexOf("\n    }", anonymousStart);
assert.ok(anonymousStart >= 0 && anonymousEnd > anonymousStart);
assert.ok(feedback.slice(anonymousStart, anonymousEnd).includes("recordDirectServiceTraffic_()"),
    "FEEDBACK debe contar suggestYear anónimo, que no obtiene lease Coordinator.");
assert.ok(!services.find(item => item.name === "FEEDBACK").actions.includes("suggestYear"),
    "suggestYear autenticado ya se cuenta en Coordinator y no debe duplicarse.");

console.log("DirectServiceTrafficTelemetry: " + passed + "/" + passed + " PASS");
