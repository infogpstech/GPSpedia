import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = path => readFileSync(resolve(root, path), "utf8");
const api = read("JS/Frontend/api-config.js");
const auth = read("JS/Services/Auth.js");
const write = read("JS/Services/write.js");
const feedback = read("JS/Services/feedback.js");
const catalog = read("JS/Services/catalog.js");
const users = read("JS/Services/users.js");
const utilities = read("JS/Services/Utilities.js");
const admin = read("JS/Services/admin.js");
const addCortes = read("HTML/add_cortes.html");
let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }

test("rutas directas actuales coinciden con ACTION_TO_SERVICE_MAP", () => {
    assert.match(api, /'validateSession': 'AUTH'/);
    assert.match(api, /'checkVehicle': 'WRITE'/);
    assert.match(api, /'getSuggestion': 'WRITE'/);
    assert.match(api, /'checkOperation': 'WRITE'/);
    assert.match(api, /'getPysData': 'FEEDBACK'/);
    assert.match(api, /'getCatalogChanges': 'FEEDBACK'/);
    assert.match(api, /'getNavigationData': 'CATALOG'.*'getCatalogData': 'CATALOG'.*'getDropdownData': 'CATALOG'/);
});

test("add_cortes procesa aportes y consultas de cortes directamente en WRITE", () => {
    assert.match(addCortes, /const serviceOverride = null/);
    assert.match(api, /'addOrUpdateCut': 'WRITE'/);
    assert.match(api, /'addSupplementaryInfo': 'WRITE'/);
    assert.match(api, /'checkOperation': 'WRITE'/);
    assert.match(write, /getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken, \{ service: "WRITE" \}\)/);
    assert.doesNotMatch(write, /withSharedMutationLease_\("WRITE", action/);
    assert.match(admin, /"ACTION_MOVED_TO_WRITE"/);
});

test("FEEDBACK cuenta todas las acciones con telemetría directa y usa actor cacheado", () => {
    assert.match(feedback, /actions: new Set\(\["recordLike","reportProblem"/);
    assert.match(feedback, /const FEEDBACK_PUBLIC_ACTIONS = new Set\(\["getPysData", "sendContactForm", "getCatalogChanges"\]\)/);
    const start=feedback.indexOf("function doPost(e)"),end=feedback.indexOf("\nconst RICH_TEXT_MODE_PROPERTY_",start),router=feedback.slice(start,end);
    assert.ok(start>=0&&end>start);
    assert.match(router,/DIRECT_SERVICE_TRAFFIC_CONFIG_\.actions\.has\(action\)/);
    assert.match(router,/getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken, \{ service: "FEEDBACK" \}\)/);
    assert.doesNotMatch(router,/withSharedMutationLease_/);
    assert.doesNotMatch(feedback,/function isSharedMutationAction_\(action\)/);
});

test("USERS contabiliza getUsers sin lease adicional; UTILITIES conserva Coordinator y ADMIN usa actor cacheado", () => {
    assert.match(utilities, /withSharedMutationLease_\("UTILITIES","migrateTimestamps"/);
    assert.doesNotMatch(utilities, /DIRECT_SERVICE_TRAFFIC_CONFIG_/);
    assert.match(users, /withSharedMutationLease_\("USERS", action/);
    assert.match(users, /getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken, \{ service: "USERS" \}\)/);
    assert.doesNotMatch(users, /withSharedMutationLease_\("USERS", "sessionActivity"/);
    assert.match(users, /USERS_DIRECT_TRAFFIC_PREFIX_/);
    assert.match(users, /if \(action === "getUsers"\) recordUsersDirectTraffic_\(\)/);
    assert.match(users, /if \(action === "getServiceTraffic"\)[\s\S]*?readUsersDirectTraffic_/);
    assert.match(admin, /getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken, \{ service: "ADMIN" \}\)/);
    const auditStart = admin.indexOf("function handleAuditDriveImagesInCortes(");
    const auditEnd = admin.indexOf("\nfunction handleAuditDriveImagesInCortesCore_", auditStart);
    assert.ok(auditStart >= 0 && auditEnd > auditStart);
    const auditHandler = admin.slice(auditStart, auditEnd);
    assert.match(auditHandler, /withSharedMutationLease_\("ADMIN", "auditDriveImagesInCortes"/);
    const adminLeaseOperations = [...admin.matchAll(/withSharedMutationLease_\("ADMIN", "([^"]+)"/g)].map(match => match[1]).sort();
    assert.deepEqual(adminLeaseOperations, ["auditDriveImagesInCortes", "createCortesImageFolder", "saveUnusedImagesInventory"].sort(),
        "ADMIN conserva leases solo para auditoría, creación de carpeta e inventario; el log de actividad usa appendRow sin lease.");
    assert.doesNotMatch(admin, /withSharedMutationLease_\("ADMIN", "recordAdminImageActivity"/);
    assert.doesNotMatch(admin, /DIRECT_SERVICE_TRAFFIC_CONFIG_/);
});

test("CATALOG y rutas directas AUTH/WRITE quedan contabilizadas; consultas internas excluidas", () => {
    const trafficStart = catalog.indexOf("const CATALOG_TRAFFIC_ACTIONS_ = new Set([");
    const trafficEnd = catalog.indexOf("]);", trafficStart);
    assert.ok(trafficStart >= 0 && trafficEnd > trafficStart, "CATALOG debe declarar el conjunto de acciones contabilizadas");
    const catalogTrafficActions = catalog.slice(trafficStart, trafficEnd);
    ["getCatalogData", "getDropdownData", "getSuggestion", "getNavigationData", "getVehicleProjection", "getContributionCandidates"]
        .forEach(action => assert.ok(catalogTrafficActions.includes('"'+action+'"'), "falta telemetría para "+action));
    assert.match(catalog, /if \(action === "getServiceTraffic"\)[\s\S]*?return ContentService/);
    assert.match(auth, /actions: new Set\(\["validateSession"\]\)/);
    assert.match(write, /actions: new Set\(\["checkVehicle","getSuggestion","checkVinDuplicate"\]\)/);
    assert.match(write, /if \(!isSharedMutationAction_\(action\)\) \{[\s\S]*?doPostInternal_\(withSharedSessionActor_\(e, null\)\)/);
    assert.doesNotMatch(write, /if \(action !== "checkOperation"\)/);
});

test("sondeos health quedan fuera de la telemetría de tráfico de usuario", () => {
    assert.match(admin, /if \(action === "ping"\) return doPostInternal_\(withSharedSessionActor_\(e, null\)\)/);
    assert.doesNotMatch(admin, /"ping"[^\]]*DIRECT_SERVICE_TRAFFIC/);
    assert.match(api, /SERVICE_COMPATIBILITY_ACTIONS = \{[\s\S]*?CATALOG: \['getSuggestion'\][\s\S]*?ADMIN: \[\]/);
});

console.log("DirectTrafficRoutingCoverage: " + passed + "/6 PASS");
