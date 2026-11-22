import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const admin = readFileSync(resolve(root, "JS/Services/admin.js"), "utf8");
const match = admin.match(/function normalizeCoordinatorServiceTraffic_\([\s\S]*?\n\}/);
assert.ok(match, "Falta normalizador del contrato Coordinator.");
const normalizeCoordinatorServiceTraffic_ = new Function(match[0] + "\nreturn normalizeCoordinatorServiceTraffic_;")();
const services = ["AUTH", "CATALOG", "WRITE", "USERS", "FEEDBACK", "UTILITIES", "ADMIN"];
const startAt = 1_800_000_000_000;
const counts = Object.fromEntries(services.map(service => [service, 0]));
const zeroTotals = () => Object.fromEntries(services.map(service => [service, 0]));
const coordinator = {
    status: "success", scope: "coordinator_protected_operations", services: services.slice(),
    buckets: [{ startAt, counts: { ...counts } }],
    totals: { lastHour: zeroTotals(), last6Hours: zeroTotals(), last24Hours: zeroTotals() }
};
let passed = 0;
function check(name, fn) { fn(); passed++; console.log("PASS " + name); }

check("Normaliza los siete servicios y declara el alcance Coordinator-only", () => {
    const normalized = normalizeCoordinatorServiceTraffic_(coordinator);
    assert.deepEqual(normalized.services, services);
    assert.equal(normalized.scope, "global_service_traffic");
    assert.equal(normalized.sources.coordinator.available, true);
    for (const service of ["AUTH", "CATALOG", "WRITE", "USERS", "FEEDBACK"]) {
        assert.equal(normalized.sources[service].directRequestsAvailable, false);
        assert.equal(normalized.sources[service].reason, "direct_requests_not_collected");
    }
    assert.match(normalized.coverage.description, /No incluye rutas directas/);
});

check("No muta el resultado de Coordinator ni crea contadores directos", () => {
    const original = JSON.stringify(coordinator);
    const normalized = normalizeCoordinatorServiceTraffic_(coordinator);
    assert.equal(JSON.stringify(coordinator), original);
    assert.equal(normalized.totals.last24Hours.AUTH, 0);
    assert.equal(normalized.buckets[0].counts.CATALOG, 0);
});

check("Rechaza scope, servicios, conteos y buckets corruptos", () => {
    assert.throws(() => normalizeCoordinatorServiceTraffic_(Object.assign({}, coordinator, { scope: "other" })));
    assert.throws(() => normalizeCoordinatorServiceTraffic_(Object.assign({}, coordinator, { services: services.slice(1) })));
    const badTotals = structuredClone(coordinator); badTotals.totals.lastHour.AUTH = -1;
    assert.throws(() => normalizeCoordinatorServiceTraffic_(badTotals));
    const badBucket = structuredClone(coordinator); badBucket.buckets[0].startAt = "bad";
    assert.throws(() => normalizeCoordinatorServiceTraffic_(badBucket));
});

console.log("ServiceTrafficAggregatorContract: " + passed + "/3 PASS");
