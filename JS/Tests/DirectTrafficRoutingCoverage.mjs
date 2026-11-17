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
    assert.match(write, /getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken\)/);
    assert.doesNotMatch(write, /withSharedMutationLease_\("WRITE", action/);
    assert.match(admin, /"ACTION_MOVED_TO_WRITE"/);
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
    assert.match(write, /if \(!isSharedMutationAction_\(action\)\) \{[\s\S]*?doPostInternal_\(withSharedSessionActor_\(e, null\)\)/);
    assert.doesNotMatch(write, /if \(action !== "checkOperation"\)/);
});

test("sondeos health quedan fuera de la telemetría de tráfico de usuario", () => {
    assert.match(admin, /if \(action === "ping"\) return doPostInternal_\(withSharedSessionActor_\(e, null\)\)/);
    assert.doesNotMatch(admin, /"ping"[^\]]*DIRECT_SERVICE_TRAFFIC/);
    assert.match(api, /SERVICE_COMPATIBILITY_ACTIONS = \{[\s\S]*?CATALOG: \['getSuggestion'\][\s\S]*?ADMIN: \[\]/);
});

console.log("DirectTrafficRoutingCoverage: " + passed + "/6 PASS");
