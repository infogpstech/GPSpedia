import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const admin = readFileSync(resolve(root, "JS/Services/admin.js"), "utf8");
const start = admin.indexOf("function mergeCatalogServiceTraffic_(");
const end = admin.indexOf("\nfunction handleGetServiceTraffic_", start);
assert.ok(start >= 0 && end > start, "No se encontró la función de agregación CATALOG/Coordinator.");
const mergeSource = admin.slice(start, end);
const mergeCatalogServiceTraffic_ = new Function(mergeSource + "\nreturn mergeCatalogServiceTraffic_;")();

const periods = ["lastHour", "last6Hours", "last24Hours"];
function coordinatorFixture() {
    const counts = { AUTH: 2, CATALOG: 4, WRITE: 3, USERS: 1, FEEDBACK: 5, UTILITIES: 0, ADMIN: 6 };
    return {
        status: "success",
        scope: "coordinator_protected_operations",
        buckets: [{ startAt: 1_800_000_000_000, counts: { ...counts } }],
        totals: Object.fromEntries(periods.map(period => [period, { ...counts }]))
    };
}
function catalogFixture(count = 7) {
    return {
        status: "success",
        scope: "catalog_post_requests",
        accuracy: "best_effort_nonblocking",
        mayUndercount: true,
        buckets: [{ startAt: 1_800_000_000_000, count }],
        totals: Object.fromEntries(periods.map(period => [period, count]))
    };
}

let passed = 0;
function test(name, run) {
    run();
    passed++;
    console.log("PASS " + name);
}

test("combina CATALOG directo con el feed contado por Coordinator sin alterar otros servicios", () => {
    const coordinator = coordinatorFixture();
    const original = JSON.stringify(coordinator);
    const result = mergeCatalogServiceTraffic_(coordinator, catalogFixture(7));
    assert.equal(result.totals.lastHour.CATALOG, 11);
    assert.equal(result.totals.last6Hours.CATALOG, 11);
    assert.equal(result.totals.last24Hours.CATALOG, 11);
    assert.equal(result.buckets[0].counts.CATALOG, 11);
    assert.equal(result.totals.last24Hours.AUTH, 2);
    assert.equal(result.totals.last24Hours.ADMIN, 6);
    assert.equal(JSON.stringify(coordinator), original, "La agregación no debe mutar la respuesta original de Coordinator.");
    assert.equal(result.sources.CATALOG.directRequestsAvailable, true);
    assert.equal(result.sources.CATALOG.feedRequests, "coordinator");
    assert.equal(result.sources.CATALOG.accuracy, "best_effort_nonblocking");
});

test("si el contador directo CATALOG no está configurado conserva Coordinator y declara cobertura parcial", () => {
    const coordinator = coordinatorFixture();
    const result = mergeCatalogServiceTraffic_(coordinator, { status: "unavailable", reason: "not_configured" });
    assert.equal(result.totals.last24Hours.CATALOG, 4);
    assert.equal(result.buckets[0].counts.CATALOG, 4);
    assert.equal(result.sources.CATALOG.directRequestsAvailable, false);
    assert.equal(result.sources.CATALOG.accuracy, "partial");
    assert.equal(result.sources.CATALOG.mayUndercount, true);
    assert.equal(result.sources.CATALOG.reason, "not_configured");
    assert.ok(result.coverage.description.includes("solicitudes directas de lectura CATALOG"));
});

test("ignora buckets CATALOG inválidos sin contaminar conteos y mantiene explícita la exclusión de health probes", () => {
    const catalog = catalogFixture(0);
    catalog.buckets = [
        { startAt: "not-a-timestamp", count: 99 },
        { startAt: 1_800_000_000_000, count: -4 }
    ];
    const result = mergeCatalogServiceTraffic_(coordinatorFixture(), catalog);
    assert.equal(result.buckets[0].counts.CATALOG, 4);
    assert.ok(result.coverage.excludes.includes("sondeos de salud"));
    assert.ok(result.coverage.excludes.includes("solicitudes HTTP que no atraviesan las rutas instrumentadas"));
});

console.log("ServiceTrafficAggregation: " + passed + "/3 PASS");
