import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const admin = readFileSync(resolve(root, "JS/Services/admin.js"), "utf8");
const coordinator = readFileSync(resolve(root, "JS/Services/Coordinator.js"), "utf8");
const start = coordinator.indexOf("function readServiceTraffic_");
const end = coordinator.indexOf("\n    function authorizeSession_", start);
assert.ok(start >= 0 && end > start, "Falta el lector local de telemetría en Coordinator.");
const reader = coordinator.slice(start, end);

assert.equal(admin.includes("normalizeCoordinatorServiceTraffic_"), false);
assert.equal(admin.includes("validateGlobalServiceTrafficResult_"), false);
assert.equal(admin.includes("handleGetServiceTraffic_"), false);
assert.match(reader, /scope: "coordinator_protected_operations"/);
assert.match(reader, /mergeServiceTrafficSources_\(coordinatorResult\)/);
assert.match(reader, /properties\.getProperties\(\)/);
assert.doesNotMatch(reader, /fetchAll|UrlFetchApp|GPSpedia_SERVICE_URL_/);
assert.match(coordinator, /function mergeServiceTrafficSources_\(source\)/);
assert.match(coordinator, /function getServiceTrafficFromBrowser_\(/);
console.log("ServiceTrafficAggregatorContract: 9/9 PASS — lectura y agregación locales en Coordinator");
