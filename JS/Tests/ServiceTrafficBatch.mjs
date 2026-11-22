import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const coordinator = readFileSync(resolve(root, "JS/Services/Coordinator.js"), "utf8");
const admin = readFileSync(resolve(root, "JS/Services/admin.js"), "utf8");
const coordinatorReader = coordinator.slice(
    coordinator.indexOf("function readServiceTraffic_(service, operation)"),
    coordinator.indexOf("\n\n    function authorizeSession_", coordinator.indexOf("function readServiceTraffic_(service, operation)")
);
const adminHandler = admin.slice(
    admin.indexOf("function handleGetServiceTraffic_"),
    admin.indexOf("\nfunction handleGetDriveStorage", admin.indexOf("function handleGetServiceTraffic_"))
);
let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }

test("Coordinator no consulta contadores directos ni hace fan-out desde getServiceTraffic", () => {
    assert.doesNotMatch(coordinator, /function readDirectServiceTrafficBatch_/);
    assert.doesNotMatch(coordinatorReader, /fetchAll|UrlFetchApp|GPSpedia_SERVICE_URL_/);
    assert.match(coordinatorReader, /mergeServiceTrafficSources_\(coordinatorResult\)/);
});

test("ADMIN no mantiene el batch de cinco endpoints directos", () => {
    assert.doesNotMatch(admin, /function getDirectServiceTrafficBatch_/);
    assert.doesNotMatch(admin, /function mergeDirectServiceTraffic_/);
    assert.doesNotMatch(adminHandler, /getDirectServiceTrafficBatch_|UrlFetchApp\.fetchAll/);
    assert.match(adminHandler, /normalizeCoordinatorServiceTraffic_\(coordinatorResult\)/);
});

test("La telemetría conserva el fan-out de precarga de sesiones, no el de métricas", () => {
    assert.match(coordinator, /function primeSessionActorCaches_/);
    assert.match(coordinator, /fetchAll\(requests\)/);
    assert.doesNotMatch(coordinatorReader, /fetchAll/);
});

console.log("ServiceTrafficBatch: " + passed + "/3 PASS");
