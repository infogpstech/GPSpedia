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

test("compatibilidad de add_cortes con ADMIN mantiene lease compartida", () => {
    assert.match(addCortes, /import \{ routeAction \} from '\.\.\/JS\/Frontend\/api-config\.js'/);
    assert.match(addCortes, /const serviceOverride = silentVal \? 'ADMIN' : null/);
    assert.match(admin, /function isSharedReadAction_\(action\)[\s\S]*?"checkOperation"/);
    assert.match(admin, /function isSharedMutationAction_\(action\)[\s\S]*?"addOrUpdateCut","addSupplementaryInfo"/);
    assert.match(admin, /withSharedMutationLease_\("ADMIN", operation/);
    assert.match(admin, /withSharedMutationLease_\("ADMIN", action/);
});

test("FEEDBACK cuenta sus lecturas públicas directas sin duplicar mutaciones coordinadas", () => {
    assert.match(feedback, /actions: new Set\(\["getPysData", "getCatalogChanges"\]\)/);
    assert.match(feedback, /const FEEDBACK_PUBLIC_ACTIONS = new Set\(\["getPysData", "sendContactForm", "getCatalogChanges"\]\)/);
    assert.match(feedback, /if \(action === "suggestYear" && String\(payload\.userId \|\| ""\)\.trim\(\) === "0"\) \{\s*recordDirectServiceTraffic_\(\);/);
    assert.match(feedback, /"sendContactForm"/);
    assert.match(feedback, /function isSharedMutationAction_\(action\)[\s\S]*?"sendContactForm"/);
});

test("UTILITIES, USERS y ADMIN no crean contadores locales redundantes", () => {
    assert.match(utilities, /withSharedMutationLease_\("UTILITIES","migrateTimestamps"/);
    assert.doesNotMatch(utilities, /DIRECT_SERVICE_TRAFFIC_CONFIG_/);
    assert.match(users, /withSharedMutationLease_\("USERS", action/);
    assert.match(users, /withSharedMutationLease_\("USERS", "sessionActivity"/);
    assert.doesNotMatch(users, /DIRECT_SERVICE_TRAFFIC_CONFIG_/);
    assert.match(admin, /withSharedMutationLease_\("ADMIN", action/);
    assert.doesNotMatch(admin, /DIRECT_SERVICE_TRAFFIC_CONFIG_/);
});

test("CATALOG y rutas directas AUTH/WRITE quedan contabilizadas; consultas internas excluidas", () => {
    assert.match(catalog, /CATALOG_TRAFFIC_ACTIONS_ = new Set\(\[[\s\S]*?"getNavigationData"\s*\]\)/);
    assert.match(catalog, /if \(action === "getServiceTraffic"\)[\s\S]*?return ContentService/);
    assert.match(auth, /actions: new Set\(\["validateSession"\]\)/);
    assert.match(write, /actions: new Set\(\["checkVehicle","getSuggestion","checkVinDuplicate"\]\)/);
    assert.match(write, /if \(action !== "checkOperation"\) return doPostInternal_/);
});

test("sondeos health quedan fuera de la telemetría de tráfico de usuario", () => {
    assert.match(admin, /if \(action === "ping"\) return doPostInternal_\(withSharedSessionActor_\(e, null\)\)/);
    assert.doesNotMatch(admin, /"ping"[^\]]*DIRECT_SERVICE_TRAFFIC/);
    assert.match(api, /SERVICE_COMPATIBILITY_ACTIONS = \{[\s\S]*?CATALOG: \['getSuggestion'\][\s\S]*?ADMIN: \['checkOperation', 'addOrUpdateCut', 'addSupplementaryInfo'\]/);
});

console.log("DirectTrafficRoutingCoverage: " + passed + "/6 PASS");
