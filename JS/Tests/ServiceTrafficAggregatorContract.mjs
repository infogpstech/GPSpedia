import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const admin = readFileSync(resolve(root, "JS/Services/admin.js"), "utf8");
const normalizerMatch = admin.match(/function normalizeCoordinatorServiceTraffic_\([\s\S]*?\n\}/);
const mergerMatch = admin.match(/function mergeDirectServiceTraffic_\(coordinatorResult, directResults\) \{[\s\S]*?\n\}/);
assert.ok(normalizerMatch, "Falta normalizador del contrato Coordinator.");
assert.ok(mergerMatch, "Falta agregador global.");
const build = new Function(normalizerMatch[0] + "\n" + mergerMatch[0] +
    "\nreturn { normalizeCoordinatorServiceTraffic_, mergeDirectServiceTraffic_ };");
const { normalizeCoordinatorServiceTraffic_, mergeDirectServiceTraffic_ } = build();
const services = ["AUTH", "CATALOG", "WRITE", "USERS", "FEEDBACK", "UTILITIES", "ADMIN"];
const startAt = 1_800_000_000_000;
const counts = Object.fromEntries(services.map(service => [service, 0]));
const zeroTotals = () => Object.fromEntries(services.map(service => [service, 0]));
const coordinator = {
    status: "success",
    scope: "coordinator_protected_operations",
    services: services.slice(),
    buckets: [{ startAt, counts: { ...counts } }],
    totals: { lastHour: zeroTotals(), last6Hours: zeroTotals(), last24Hours: zeroTotals() }
};
const direct = {
    AUTH: {
        status: "success", service: "AUTH", scope: "direct_post_requests",
        accuracy: "best_effort_nonblocking",
        buckets: [{ startAt, count: 3 }],
        totals: { lastHour: 3, last6Hours: 3, last24Hours: 3 }
    },
    CATALOG: {
        status: "success", service: "CATALOG", scope: "catalog_post_requests",
        accuracy: "best_effort_nonblocking",
        buckets: [{ startAt, count: 4 }],
        totals: { lastHour: 4, last6Hours: 4, last24Hours: 4 }
    }
};
let passed = 0;
function check(name, fn) { fn(); passed++; console.log("PASS " + name); }

check("Normaliza los siete servicios activos y los tres periodos", () => {
    const normalized = normalizeCoordinatorServiceTraffic_(coordinator);
    assert.deepEqual(normalized.services, services);
    assert.deepEqual(normalized.totals.last24Hours, zeroTotals());
});
check("Combina fuentes directas sin perder el agregado Coordinator", () => {
    const result = mergeDirectServiceTraffic_(coordinator, direct);
    assert.equal(result.status, "success");
    assert.equal(result.scope, "global_service_traffic");
    assert.deepEqual(result.services, services);
    assert.equal(result.totals.lastHour.AUTH, 3);
    assert.equal(result.totals.lastHour.CATALOG, 4);
    assert.equal(result.totals.lastHour.USERS, 0);
    assert.equal(result.buckets[0].counts.AUTH, 3);
    assert.equal(result.buckets[0].counts.CATALOG, 4);
    assert.equal(result.sources.ADMIN.coordinatorAvailable, true);
    assert.equal(result.sources.UTILITIES.accuracy, "coordinator_only");
});
check("No acepta agregados sin identidad/scope o sin los siete servicios", () => {
    assert.throws(() => normalizeCoordinatorServiceTraffic_(Object.assign({}, coordinator, { scope: "other" })));
    assert.throws(() => normalizeCoordinatorServiceTraffic_(Object.assign({}, coordinator, { services: services.slice(1) })));
});
check("No acepta conteos o buckets corruptos", () => {
    const invalidTotals = structuredClone(coordinator);
    invalidTotals.totals.lastHour.AUTH = -1;
    assert.throws(() => normalizeCoordinatorServiceTraffic_(invalidTotals));
    const invalidBucket = structuredClone(coordinator);
    invalidBucket.buckets[0].counts.ADMIN = "not-a-number";
    assert.throws(() => normalizeCoordinatorServiceTraffic_(invalidBucket));
});
check("No mezcla una respuesta directa con scope o conteos inválidos", () => {
    const invalid = {
        AUTH: Object.assign({}, direct.AUTH, { scope: "wrong" })
    };
    const result = mergeDirectServiceTraffic_(coordinator, invalid);
    assert.equal(result.totals.lastHour.AUTH, 0);
    assert.equal(result.sources.AUTH.directRequestsAvailable, false);
    const malformed = {
        AUTH: Object.assign({}, direct.AUTH, { buckets: [{ startAt, count: -2 }] })
    };
    assert.throws(() => mergeDirectServiceTraffic_(coordinator, malformed));
});
console.log("ServiceTrafficAggregatorContract: " + passed + "/" + passed + " PASS");
