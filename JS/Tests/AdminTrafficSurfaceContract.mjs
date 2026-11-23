import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ui = readFileSync(new URL("../Frontend/ui.js", import.meta.url), "utf8");
const main = readFileSync(new URL("../Frontend/main.js", import.meta.url), "utf8");
const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const api = readFileSync(new URL("../Frontend/api-config.js", import.meta.url), "utf8");
const coordinator = readFileSync(new URL("../Services/Coordinator.js", import.meta.url), "utf8");

function block(source, name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const next = source.indexOf("\nfunction ", start + 10);
    return source.slice(start, next < 0 ? source.length : next);
}

const loadTraffic = block(ui, "loadGlobalServiceTraffic_");
const runHealth = block(ui, "runServicesHealthScan");
const visible = block(ui, "isGlobalServiceTrafficVisible_");
const mutation = block(admin, "isSharedMutationAction_");

assert.match(loadTraffic, /if \(globalServiceTrafficLoading \|\| !isAdminPanelCurrent_\(\)\) return/);
assert.match(loadTraffic, /routeActionWithRetry\("getServiceTraffic"/);
assert.match(loadTraffic, /Date\.now\(\) - lastGlobalServiceTrafficFetchAt < 60000/);
assert.match(runHealth, /await loadGlobalServiceTraffic_\(true\)/);
assert.match(visible, /getComputedStyle/);
assert.match(ui, /if \(!isAdminPanelCurrent_\(\) \|\| !isGlobalServiceTrafficVisible_\(\)\) return/);
assert.match(ui, /Date\.now\(\) - lastGlobalServiceTrafficFetchAt >= 60000\) loadGlobalServiceTraffic_/);
assert.doesNotMatch(main, /getServiceTraffic|getReplacedImages|getDriveStorage|getCortesImageFolders|auditDriveImagesInCortes/);
assert.doesNotMatch(admin, /handleGetServiceTraffic_|getSharedServiceTraffic_/);
assert.match(api, /'getServiceTraffic': 'COORDINATOR'/);
assert.match(coordinator, /function getServiceTrafficFromBrowser_\(/);
assert.match(coordinator, /request\.action === "getServiceTraffic"/);
assert.match(coordinator, /role !== "desarrollador"/);
assert.match(coordinator, /readServiceTraffic_\("ADMIN", "getServiceTraffic"\)/);
assert.doesNotMatch(mutation, /getServiceTraffic/);
assert.doesNotMatch(coordinator, /coordinatorPolicy_|getServiceTraffic:\s*\{/);

console.log("AdminTrafficSurfaceContract: 17/17 PASS — telemetría desde Coordinator con sesión, sin llamada ADMIN→Coordinator");
