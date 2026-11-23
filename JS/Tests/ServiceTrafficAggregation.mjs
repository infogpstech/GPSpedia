import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const coordinator = readFileSync(resolve(root, "JS/Services/Coordinator.js"), "utf8");
const start = coordinator.indexOf("function mergeServiceTrafficSources_(source)");
const end = coordinator.indexOf("\n    function readServiceTraffic_", start);
assert.ok(start >= 0 && end > start, "No se encontró el normalizador de telemetría Coordinator.");
const source = "const SERVICE_TRAFFIC_SERVICES_ = Object.freeze([\"AUTH\", \"CATALOG\", \"WRITE\", \"FEEDBACK\", \"UTILITIES\", \"ADMIN\"]);\n" +
    coordinator.slice(start, end) + "\nreturn mergeServiceTrafficSources_;";
const merge = new Function(source)();
const services = ["AUTH", "CATALOG", "WRITE", "FEEDBACK", "UTILITIES", "ADMIN"];
const counts = { AUTH: 2, CATALOG: 4, WRITE: 3, FEEDBACK: 5, UTILITIES: 0, ADMIN: 6 };
const periods = ["lastHour", "last6Hours", "last24Hours"];
const fixture = () => ({
    status: "success", scope: "coordinator_legacy_protected_operations", services: services.slice(),
    buckets: [{ startAt: 1_800_000_000_000, counts: { ...counts } }],
    totals: Object.fromEntries(periods.map(period => [period, { ...counts }]))
});
let passed = 0;
function test(name, fn) { fn(); passed++; console.log("PASS " + name); }

test("Conserva los conteos Coordinator sin sumar fuentes directas", () => {
    const input = fixture();
    const original = JSON.stringify(input);
    const result = merge(input);
    assert.equal(result.scope, "global_service_traffic");
    assert.deepEqual(result.totals.last24Hours, counts);
    assert.equal(result.buckets[0].counts.CATALOG, 4);
    assert.equal(result.sources.CATALOG.directRequestsAvailable, false);
    assert.equal(result.sources.FEEDBACK.directRequestsAvailable, false);
    assert.equal(JSON.stringify(input), original);
});

test("Declara explícitamente cobertura y exclusiones de rutas directas", () => {
    const result = merge(fixture());
    assert.match(result.coverage.description, /No incluye rutas directas no coordinadas/);
    assert.ok(result.coverage.excludes.includes("sondeos de salud"));
    assert.ok(result.coverage.excludes.some(value => value.includes("AUTH, CATALOG, WRITE y FEEDBACK")));
});

test("Rechaza estructura o conteos Coordinator inválidos", () => {
    const invalidScope = fixture(); invalidScope.scope = "global_service_traffic";
    assert.throws(() => merge(invalidScope));
    const invalid = fixture(); invalid.totals.lastHour.AUTH = -1;
    assert.throws(() => merge(invalid));
});

console.log("ServiceTrafficAggregation: " + passed + "/3 PASS");
