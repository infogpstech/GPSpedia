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
const coordinator = read("JS/Services/Coordinator.js");
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
    assert.match(api, /'getCatalogChanges': 'CATALOG'/);
    assert.match(api, /'publishCatalogChange': 'CATALOG'/);
    assert.match(api, /'publishCatalogReset': 'CATALOG'/);
    assert.match(api, /'getNavigationData': 'CATALOG'.*'getCatalogData': 'CATALOG'.*'getDropdownData': 'CATALOG'/);
    assert.doesNotMatch(coordinator, /publishCatalogResetFromBrowser_|getPublicCatalogChanges|catalogFeed/);
    assert.doesNotMatch(coordinator, /request\\.action === "publishCatalogReset"/);
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

test("FEEDBACK mantiene rutas y actor cacheado sin contadores directos", () => {
    assert.doesNotMatch(feedback, /DIRECT_SERVICE_TRAFFIC_CONFIG_|recordDirectServiceTraffic_|readDirectServiceTraffic_/);
    assert.match(feedback, /const FEEDBACK_PUBLIC_ACTIONS = new Set\(\["getPysData", "sendContactForm"\]\)/);
    const start=feedback.indexOf("function doPost(e)"),end=feedback.indexOf("\nconst RICH_TEXT_MODE_PROPERTY_",start),router=feedback.slice(start,end);
    assert.ok(start>=0&&end>start);
    assert.doesNotMatch(router,/DIRECT_SERVICE_TRAFFIC_CONFIG_|recordDirectServiceTraffic_/);
    assert.doesNotMatch(router,/getCatalogChanges/);
    assert.match(router,/getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken, \{ service: "FEEDBACK" \}\)/);
    assert.doesNotMatch(router,/withSharedMutationLease_/);
    assert.doesNotMatch(feedback,/function isSharedMutationAction_\(action\)/);
});

test("AUTH es propietario de gestión de usuarios; UTILITIES y ADMIN conservan sus contratos", () => {
    assert.match(api, /'getUsers': 'AUTH'/);
    assert.match(api, /'createUser': 'AUTH'/);
    assert.match(api, /'updateProfile': 'AUTH'/);
    assert.match(auth, /function handleGetUsers\(/);
    assert.match(auth, /function handleCreateUser\(/);
    assert.match(auth, /function handleUpdateProfile\(/);
    assert.match(auth, /getCachedSharedSessionActor_\(/);
    assert.doesNotMatch(auth, /DIRECT_SERVICE_TRAFFIC_CONFIG_|recordDirectServiceTraffic_|readDirectServiceTraffic_/);
    assert.match(utilities, /getCachedSharedSessionActor_\(payload&&payload\.userId,payload&&payload\.sessionToken,\{service:"UTILITIES"\}\)/);
    assert.match(utilities, /const lock=LockService\.getScriptLock\(\)/);
    assert.doesNotMatch(utilities, /withSharedMutationLease_/);
    assert.doesNotMatch(utilities, /DIRECT_SERVICE_TRAFFIC_CONFIG_/);
    assert.match(admin, /getCachedSharedSessionActor_\(/);
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

test("CATALOG, AUTH y WRITE conservan rutas sin contadores directos", () => {
    assert.doesNotMatch(catalog, /CATALOG_TRAFFIC_ACTIONS_|recordCatalogTraffic_|readCatalogTraffic_|getServiceTraffic/);
    assert.doesNotMatch(catalog, /CATALOG_TRAFFIC_SECRET_PROPERTY_|catalogTrafficSecretEquals_/);
    assert.doesNotMatch(admin, /CATALOG_SERVICE_URL|CATALOG_TRAFFIC_SECRET_PROPERTY_|getAdminProjectedVehicleFieldSnapshot_/);
    assert.match(catalog, /case 'getVehicleProjection'/);
    assert.match(catalog, /case 'getContributionCandidates'/);
    assert.doesNotMatch(auth, /DIRECT_SERVICE_TRAFFIC_CONFIG_|recordDirectServiceTraffic_|readDirectServiceTraffic_|getServiceTraffic/);
    assert.doesNotMatch(write, /DIRECT_SERVICE_TRAFFIC_CONFIG_|recordDirectServiceTraffic_|readDirectServiceTraffic_|getServiceTraffic/);
    assert.match(write, /if \(!isSharedMutationAction_\(action\)\) \{[\s\S]*?doPostInternal_\(withSharedSessionActor_\(e, null\)\)/);
    assert.doesNotMatch(write, /if \(action !== "checkOperation"\)/);
});

test("sondeos health quedan fuera de la telemetría de tráfico de usuario", () => {
    assert.match(admin, /if \(action === "ping"\) return doPostInternal_\(withSharedSessionActor_\(e, null\)\)/);
    assert.doesNotMatch(admin, /"ping"[^\]]*DIRECT_SERVICE_TRAFFIC/);
    assert.match(api, /SERVICE_COMPATIBILITY_ACTIONS = \{[\s\S]*?CATALOG: \['getSuggestion'\][\s\S]*?ADMIN: \[\]/);
});

console.log("DirectTrafficRoutingCoverage: " + passed + "/6 PASS");
