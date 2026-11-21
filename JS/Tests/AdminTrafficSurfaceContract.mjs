import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const ui = readFileSync(new URL("../Frontend/ui.js", import.meta.url), "utf8");
const main = readFileSync(new URL("../Frontend/main.js", import.meta.url), "utf8");
const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
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
const getTraffic = block(admin, "handleGetServiceTraffic_");
const mutation = block(admin, "isSharedMutationAction_");
const policy = block(coordinator, "coordinatorPolicy_");

assert.match(loadTraffic, /if \(globalServiceTrafficLoading \|\| !isAdminPanelCurrent_\(\)\) return/);
assert.match(loadTraffic, /routeActionWithRetry\("getServiceTraffic"/);
assert.match(loadTraffic, /Date\.now\(\) - lastGlobalServiceTrafficFetchAt < 60000/);
assert.match(runHealth, /await loadGlobalServiceTraffic_\(true\)/);
assert.match(visible, /getComputedStyle/);
assert.match(ui, /if \(!isAdminPanelCurrent_\(\) \|\| !isGlobalServiceTrafficVisible_\(\)\) return/);
assert.match(ui, /Date\.now\(\) - lastGlobalServiceTrafficFetchAt >= 60000\) loadGlobalServiceTraffic_/);
assert.doesNotMatch(main, /getServiceTraffic|getReplacedImages|getDriveStorage|getCortesImageFolders|auditDriveImagesInCortes/);
assert.match(getTraffic, /developerContext\.role[\s\S]*?desarrollador/);
assert.match(getTraffic, /getSharedServiceTraffic_\(\)/);
const internal = admin.slice(admin.indexOf("function doPostInternal_(e)"));
assert.match(internal, /assertDeveloperSession\(payload\)/);
assert.match(internal, /case 'getServiceTraffic':[\s\S]*?handleGetServiceTraffic_/);
assert.doesNotMatch(mutation, /getServiceTraffic/);
assert.match(policy, /getServiceTraffic: \{ read: \["SERVICE_TRAFFIC"\] \}/);

console.log("AdminTrafficSurfaceContract: 12/12 PASS — telemetría y consultas ADMIN solo desde panel visible");
