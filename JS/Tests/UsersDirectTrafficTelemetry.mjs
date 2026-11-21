import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const users = readFileSync(resolve(root, "JS/Services/users.js"), "utf8");
const start = users.indexOf("const USERS_DIRECT_TRAFFIC_PREFIX_");
const end = users.indexOf("\nfunction isSharedMutationAction_", start);
assert.ok(start >= 0 && end > start, "No se encontró el módulo de telemetría USERS.");
const source = users.slice(start, end);
let now = 1_800_000_000_000;
const properties = new Map([["GPSpedia_USERS_TRAFFIC_SECRET", "users-telemetry-secret-012345678901234567890123"]]);
const propertiesApi = {
    getProperty: key => properties.has(key) ? properties.get(key) : null,
    setProperty: (key, value) => { if (failMetricWrite && key.startsWith("GPSpedia_USERS_DIRECT_TRAFFIC_HOUR_V1_")) throw new Error("quota simulada"); properties.set(key, value); },
    getProperties: () => Object.fromEntries(properties),
    deleteProperty: key => properties.delete(key)
};
let lockCalls = 0, failMetricWrite = false;
const PropertiesService = { getScriptProperties: () => propertiesApi };
const LockService = { getScriptLock: () => { lockCalls++; throw new Error("La telemetría no debe adquirir ScriptLock."); } };
const Clock = { now: () => now };
const { recordUsersDirectTraffic_, readUsersDirectTraffic_ } = new Function(
    "PropertiesService", "LockService", "Date",
    source + "\nreturn { recordUsersDirectTraffic_, readUsersDirectTraffic_ };"
)(PropertiesService, LockService, Clock);

let passed = 0;
function check(name, fn) { fn(); passed++; console.log("PASS " + name); }

check("La consulta directa getUsers se registra sin esperar por el lock", () => {
    assert.equal(recordUsersDirectTraffic_(), true);
    assert.equal(lockCalls, 0);
    const bucketKey = [...properties.keys()].find(key => key.startsWith("GPSpedia_USERS_DIRECT_TRAFFIC_HOUR_V1_"));
    assert.ok(bucketKey);
    assert.equal(JSON.parse(properties.get(bucketKey)).count, 1);
});
check("La lectura protegida devuelve 24 buckets y totales correctos", () => {
    recordUsersDirectTraffic_();
    const result = readUsersDirectTraffic_("users-telemetry-secret-012345678901234567890123");
    assert.equal(result.status, "success");
    assert.equal(result.service, "USERS");
    assert.equal(result.scope, "direct_post_requests");
    assert.equal(result.buckets.length, 24);
    assert.equal(result.totals.lastHour, 2);
    assert.equal(result.totals.last6Hours, 2);
    assert.equal(result.totals.last24Hours, 2);
    assert.equal(result.accuracy, "best_effort_nonblocking");
});
check("USERS acepta el secreto Coordinator y conserva fallback legacy", () => {
    properties.set("GPSpedia_COORDINATOR_SECRET", "users-telemetry-secret-012345678901234567890123");
    assert.equal(readUsersDirectTraffic_("users-telemetry-secret-012345678901234567890123").status, "success");
    properties.delete("GPSpedia_COORDINATOR_SECRET");
    assert.equal(readUsersDirectTraffic_("users-telemetry-secret-012345678901234567890123").status, "success");
    properties.set("GPSpedia_COORDINATOR_SECRET", "wrong-coordinator-secret");
    assert.equal(readUsersDirectTraffic_("users-telemetry-secret-012345678901234567890123").status, "error");
});
check("La consulta interna rechaza secretos incorrectos y no devuelve conteos", () => {
    const result = readUsersDirectTraffic_("incorrect-secret");
    assert.equal(result.status, "error");
    assert.doesNotMatch(JSON.stringify(result), /users-telemetry-secret/);
});
check("La métrica concurrente es best-effort y no serializa getUsers", () => {
    const key = [...properties.keys()].find(item => item.startsWith("GPSpedia_USERS_DIRECT_TRAFFIC_HOUR_V1_"));
    const before = Number(JSON.parse(properties.get(key)).count);
    const originalGet = propertiesApi.getProperty;
    let nested = false;
    propertiesApi.getProperty = requestedKey => {
        const value = originalGet(requestedKey);
        if (!nested && requestedKey === key) {
            nested = true;
            recordUsersDirectTraffic_();
        }
        return value;
    };
    assert.equal(recordUsersDirectTraffic_(), true);
    propertiesApi.getProperty = originalGet;
    const after = Number(JSON.parse(properties.get(key)).count);
    assert.equal(after, before + 1, "Una carrera puede subcontar, pero no debe bloquear la lectura ni alterar su respuesta.");
    assert.equal(lockCalls, 0);
});
check("Un fallo de PropertiesService solo omite telemetría y no adquiere lock", () => {
    const before = [...properties.entries()].filter(([key]) => key.startsWith("GPSpedia_USERS_DIRECT_TRAFFIC_HOUR_V1_"));
    failMetricWrite = true;
    assert.equal(recordUsersDirectTraffic_(), false);
    failMetricWrite = false;
    const after = [...properties.entries()].filter(([key]) => key.startsWith("GPSpedia_USERS_DIRECT_TRAFFIC_HOUR_V1_"));
    assert.deepEqual(after, before);
    assert.equal(lockCalls, 0);
});
check("El router cuenta getUsers y excluye el endpoint interno de lectura", () => {
    const router = users.slice(users.indexOf("function doPost(e)"), users.indexOf("\nfunction doPostInternal_", users.indexOf("function doPost(e)")));
    assert.match(router, /if \(action === "getServiceTraffic"\)[\s\S]*?readUsersDirectTraffic_/);
    assert.match(router, /if \(action === "getUsers"\) recordUsersDirectTraffic_\(\)/);
    assert.ok(router.indexOf('action === "getServiceTraffic"') < router.indexOf('action === "getUsers"'));
});
console.log("UsersDirectTrafficTelemetry: " + passed + "/" + passed + " PASS");
