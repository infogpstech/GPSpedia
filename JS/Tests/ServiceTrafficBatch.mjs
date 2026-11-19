import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const admin = readFileSync(resolve(root, "JS/Services/admin.js"), "utf8");
const start = admin.indexOf("function getDirectServiceTrafficBatch_()");
const end = admin.indexOf("\nfunction mergeDirectServiceTraffic_", start);
assert.ok(start >= 0 && end > start, "No se encontró el colector de telemetría directa.");
const source = admin.slice(start, end);
const urls = {
    CATALOG: "https://catalog.example/exec",
    AUTH: "https://auth.example/exec",
    WRITE: "https://write.example/exec",
    FEEDBACK: "https://feedback.example/exec",
    USERS: "https://users.example/exec",
};
const services = Object.keys(urls);
const secrets = Object.fromEntries(services.map(service => ["GPSpedia_" + service + "_TRAFFIC_SECRET", (service + "-secret-").padEnd(48, "x")]));
function response(service, overrides = {}) {
    const result = Object.assign({
        status: "success",
        service,
        scope: service === "CATALOG" ? "catalog_post_requests" : "direct_post_requests",
        accuracy: "best_effort_nonblocking",
        mayUndercount: true,
        buckets: [{ startAt: 1_800_000_000_000, count: 2 }],
        totals: { lastHour: 2, last6Hours: 2, last24Hours: 2 }
    }, overrides);
    return { getResponseCode: () => overrides.httpStatus || 200, getContentText: () => JSON.stringify(result) };
}
function build(fetchAll, fetchOne, propertyOptions = {}) {
    const PropertiesService = {
        getScriptProperties: () => ({
            getProperty: key => {
                if (propertyOptions.throwOnRead) throw new Error("properties unavailable");
                return propertyOptions.missing && propertyOptions.missing.includes(key) ? null : secrets[key];
            }
        })
    };
    const UrlFetchApp = { fetchAll, fetch: fetchOne };
    const factory = new Function("PropertiesService", "UrlFetchApp",
        'const CATALOG_SERVICE_URL = "' + urls.CATALOG + '";' +
        'const AUTH_SERVICE_URL = "' + urls.AUTH + '";' +
        'const WRITE_SERVICE_URL = "' + urls.WRITE + '";' +
        'const FEEDBACK_SERVICE_URL = "' + urls.FEEDBACK + '";' +
        'const USERS_SERVICE_URL = "' + urls.USERS + '";' +
        source + "\nreturn getDirectServiceTrafficBatch_;"
    );
    return factory(PropertiesService, UrlFetchApp);
}
let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }

test("consulta cuatro fuentes directas en un único fetchAll y conserva sus contratos", () => {
    let batchCalls = 0;
    const fn = build(requests => {
        batchCalls++;
        assert.equal(requests.length, 5);
        return requests.map(request => {
            const service = services.find(name => request.url === urls[name]);
            const body = JSON.parse(request.payload);
            assert.equal(body.action, "getServiceTraffic");
            assert.equal(body.payload.secret, secrets["GPSpedia_" + service + "_TRAFFIC_SECRET"]);
            return response(service);
        });
    });
    const result = fn();
    assert.equal(batchCalls, 1);
    for (const service of services) {
        assert.equal(result[service].status, "success");
        assert.equal(result[service].service, service);
        assert.equal(result[service].totals.last24Hours, 2);
    }
});

test("una fuente sin secreto queda parcial sin impedir consultar las otras", () => {
    let requested = [];
    const fn = build(requests => {
        requested = requests.map(request => request.url);
        return requests.map(request => response(services.find(name => request.url === urls[name])));
    }, null, { missing: ["GPSpedia_WRITE_TRAFFIC_SECRET"] });
    const result = fn();
    assert.equal(requested.length, 4);
    assert.equal(result.WRITE.status, "unavailable");
    assert.equal(result.WRITE.reason, "not_configured");
    assert.equal(result.AUTH.status, "success");
});

test("si fetchAll falla, reintenta cada endpoint de forma aislada", () => {
    const calls = [];
    const fn = build(() => { throw new Error("fetchAll unavailable"); }, (url, options) => {
        calls.push(url);
        const service = services.find(name => url === urls[name]);
        assert.equal(options.method, "post");
        return response(service);
    });
    const result = fn();
    assert.equal(calls.length, 5);
    for (const service of services) assert.equal(result[service].status, "success");
});

test("una respuesta inválida de una fuente no invalida los otros servicios", () => {
    const fn = build(requests => requests.map(request => {
        const service = services.find(name => request.url === urls[name]);
        return service === "CATALOG"
            ? { getResponseCode: () => 500, getContentText: () => "{}" }
            : response(service);
    }));
    const result = fn();
    assert.equal(result.CATALOG.status, "unavailable");
    assert.equal(result.CATALOG.reason, "request_failed");
    assert.equal(result.AUTH.status, "success");
});

test("un fallo de lectura de ScriptProperties conserva una salida parcial por fuente", () => {
    const fn = build(() => { throw new Error("should not call"); }, null, { throwOnRead: true });
    const result = fn();
    for (const service of services) {
        assert.equal(result[service].status, "unavailable");
        assert.equal(result[service].reason, "properties_unavailable");
    }
});

console.log("ServiceTrafficBatch: " + passed + "/5 PASS");
