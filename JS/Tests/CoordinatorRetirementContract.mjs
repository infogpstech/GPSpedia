import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const read = path => readFileSync(resolve(root, path), "utf8");
const coordinatorPath = resolve(root, "JS/Services/Coordinator.js");
const api = read("JS/Frontend/api-config.js");
const cache = read("JS/Frontend/centralConfigurationCache.js");
const reader = read("JS/Services/CentralConfigurationReader.js");
const telemetry = read("JS/Frontend/serviceTelemetry.js");
const invalidation = read("JS/Frontend/sessionCacheInvalidation.js");
const ui = read("JS/Frontend/ui.js");
const activeServices = ["Auth.js","catalog.js","write.js","feedback.js","admin.js","utilities.js","InboxConversations.js"]
    .map(name => read("JS/Services/" + name));
assert.equal(existsSync(coordinatorPath), false, "Coordinator.js debe estar retirado.");
assert.doesNotMatch(api, /COORDINATOR|getServiceTraffic/);
assert.match(api, /CENTRAL_SERVICE_KEYS = Object\.freeze\(\[\s*"AUTH", "CATALOG", "WRITE", "FEEDBACK", "UTILITIES", "ADMIN"/);
assert.doesNotMatch(cache, /OPTIONAL_SERVICES|COORDINATOR/);
assert.match(reader, /GP_CONFIG_RETIRED_SERVICE_KEYS_ = \["USERS", "COORDINATOR"\]/);
assert.doesNotMatch(telemetry, /COORDINATOR/);
assert.doesNotMatch(invalidation, /COORDINATOR|UrlFetchApp|GPSpedia_COORDINATOR_SECRET/);
assert.doesNotMatch(ui, /Coordinator|globalServiceTraffic|getServiceTraffic/);
for (const source of activeServices) {
    assert.doesNotMatch(source, /GPSpedia_COORDINATOR_(?:URL|SECRET)|withSharedMutationLease_|createSharedMutationClient_/);
}
console.log("CoordinatorRetirementContract: 10/10 PASS — fuente retirada, seis servicios y sustitutos locales");
