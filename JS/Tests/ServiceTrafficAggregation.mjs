import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const admin = readFileSync(resolve(root, "JS/Services/admin.js"), "utf8");
const start = admin.indexOf("function normalizeCoordinatorServiceTraffic_(source)");
const end = admin.indexOf("\nfunction handleGetServiceTraffic_", start);
assert.ok(start >= 0 && end > start, "No se encontró la función de agregación CATALOG/Coordinator.");
const mergeSource = admin.slice(start, end);
const mergeFns = new Function(mergeSource + "\nreturn { mergeDirectServiceTraffic_, mergeCatalogServiceTraffic_ };")();
const { mergeDirectServiceTraffic_, mergeCatalogServiceTraffic_ } = mergeFns;

const periods = ["lastHour", "last6Hours", "last24Hours"];
function coordinatorFixture() {
    const counts = { AUTH: 2, CATALOG: 4, WRITE: 3, USERS: 1, FEEDBACK: 5, UTILITIES: 0, ADMIN: 6 };
    return {
        status: "success",
        scope: "coordinator_protected_operations",
        services: ["AUTH", "CATALOG", "WRITE", "USERS", "FEEDBACK", "UTILITIES", "ADMIN"],
        buckets: [{ startAt: 1_800_000_000_000, counts: { ...counts } }],
        totals: Object.fromEntries(periods.map(period => [period, { ...counts }]))
    };
}
function catalogFixture(count = 7) {
    return {
        status: "success",
        service: "CATALOG",
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

test("combina contadores directos de AUTH, WRITE y FEEDBACK con operaciones Coordinator", () => {
    const coordinator = coordinatorFixture();
    const directResults = {};
    for (const service of ["AUTH", "WRITE", "FEEDBACK"]) {
        directResults[service] = {
            status: "success", service, scope: "direct_post_requests",
            accuracy: "best_effort_nonblocking", mayUndercount: true,
            buckets: [{ startAt: 1_800_000_000_000, count: 9 }],
            totals: Object.fromEntries(periods.map(period => [period, 9]))
        };
    }
    const result = mergeDirectServiceTraffic_(coordinator, directResults);
    for (const service of ["AUTH", "WRITE", "FEEDBACK"]) {
        assert.equal(result.totals.last24Hours[service], coordinator.totals.last24Hours[service] + 9);
        assert.equal(result.buckets[0].counts[service], coordinator.buckets[0].counts[service] + 9);
        assert.equal(result.sources[service].directRequestsAvailable, true);
        assert.equal(result.sources[service].accuracy, "best_effort_nonblocking");
    }
    assert.equal(result.totals.last24Hours.UTILITIES, coordinator.totals.last24Hours.UTILITIES, "UTILITIES no debe sumarse dos veces: migrateTimestamps ya obtiene lease Coordinator.");
    assert.equal(result.sources.UTILITIES, undefined);
    assert.equal(result.totals.last24Hours.USERS, 1, "USERS conserva solo su fuente Coordinator porque sus acciones conocidas ya pasan por lease.");
    assert.equal(result.sources.coordinator.available, true);
});

test("conserva buckets directos que cruzan el límite de hora respecto a Coordinator", () => {
    const coordinator = coordinatorFixture();
    const nextHour = coordinator.buckets[0].startAt + 60 * 60 * 1000;
    const directResults = {};
    for (const service of ["AUTH", "WRITE", "FEEDBACK"]) {
        directResults[service] = {
            status: "success", service, scope: "direct_post_requests",
            accuracy: "best_effort_nonblocking", mayUndercount: true,
            buckets: [{ startAt: nextHour, count: 3 }],
            totals: Object.fromEntries(periods.map(period => [period, 3]))
        };
    }
    const result = mergeDirectServiceTraffic_(coordinator, directResults);
    assert.equal(result.buckets.length, 2);
    assert.equal(result.buckets[0].startAt, coordinator.buckets[0].startAt);
    assert.equal(result.buckets[1].startAt, nextHour);
    for (const service of ["AUTH", "WRITE", "FEEDBACK"]) {
        assert.equal(result.buckets[1].counts[service], 3);
        assert.equal(result.buckets[0].counts[service], coordinator.buckets[0].counts[service]);
    }
});

test("la falta de configuración de cada fuente directa conserva su agregado Coordinator y declara cobertura parcial", () => {
    const coordinator = coordinatorFixture();
    const unavailable = Object.fromEntries(["CATALOG", "AUTH", "WRITE", "FEEDBACK"]
        .map(service => [service, { status: "unavailable", reason: "not_configured" }]));
    const result = mergeDirectServiceTraffic_(coordinator, unavailable);
    for (const service of Object.keys(unavailable)) {
        assert.equal(result.totals.last24Hours[service], coordinator.totals.last24Hours[service]);
        assert.equal(result.sources[service].directRequestsAvailable, false);
        assert.equal(result.sources[service].accuracy, "partial");
        assert.equal(result.sources[service].reason, "not_configured");
    }
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

console.log("ServiceTrafficAggregation: " + passed + "/6 PASS");
