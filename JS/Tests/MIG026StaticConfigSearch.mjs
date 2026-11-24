import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = path => readFileSync(join(root, path), "utf8");
const serviceDir = join(root, "JS", "Services");
const frontendDir = join(root, "JS", "Frontend");
const serviceFiles = readdirSync(serviceDir).filter(name => name.endsWith(".js")).sort();
const frontendFiles = readdirSync(frontendDir).filter(name => /\.m?js$/i.test(name)).sort();
const services = serviceFiles.map(name => ({ name, source: read("JS/Services/" + name) }));
const frontend = frontendFiles.map(name => ({ name, source: read("JS/Frontend/" + name) }));
const backendText = services.map(item => item.source).join("\n");
const frontendText = frontend.map(item => item.source).join("\n");
const htmlFiles = ["index.html", ...readdirSync(join(root, "HTML")).filter(name => name.endsWith(".html")).map(name => "HTML/" + name)];
const htmlText = htmlFiles.map(read).join("\n");
const manifest = read("manifest.json");
const serviceWorker = read("service-worker.js");
let passed = 0;
function test(name, fn) { fn(); passed++; console.log("PASS " + name); }
function ownerAt(source, offset) {
    const matches = [...source.slice(0, offset).matchAll(/function\s+([A-Za-z0-9_$]+)\s*\(/g)];
    return matches.length ? matches[matches.length - 1][1] : "(top-level)";
}

test("ningún servicio Apps Script contiene URLs de deployments GPSpedia", () => {
    assert.doesNotMatch(backendText, /https:\/\/script\.google\.com\/macros\/s\//i);
    assert.doesNotMatch(backendText, /\b(?:AUTH|CATALOG|WRITE|FEEDBACK|UTILITIES|ADMIN)_SERVICE_URL\b/);
    assert.doesNotMatch(backendText, /GPSpedia_COORDINATOR_URL|GPSpedia_COORDINATOR_SECRET|GPSpedia_CATALOG_TRAFFIC_SECRET/);
});
test("la única URL bootstrap está en frontend y no hay mapa/fallback local", () => {
    const api = read("JS/Frontend/api-config.js");
    const urls = frontendText.match(/https:\/\/script\.google\.com\/macros\/s\//g) || [];
    assert.equal(urls.length, 1);
    assert.equal((api.match(/CENTRAL_CONFIGURATION_BOOTSTRAP_URL\s*=/g) || []).length, 1);
    assert.match(api, /resolveCentralServiceEndpoint/);
    assert.doesNotMatch(api, /API_ENDPOINTS/);
    assert.doesNotMatch(backendText, /CENTRAL_CONFIGURATION_BOOTSTRAP_URL/);
});
test("el registro central operativo solo contiene los seis servicios vigentes", () => {
    const api = read("JS/Frontend/api-config.js");
    assert.match(api, /CENTRAL_SERVICE_KEYS\s*=\s*Object\.freeze\(\[\s*"AUTH",\s*"CATALOG",\s*"WRITE",\s*"FEEDBACK",\s*"UTILITIES",\s*"ADMIN"/);
    const telemetry = read("JS/Frontend/serviceTelemetry.js");
    assert.match(telemetry, /SERVICE_KEYS\s*=\s*Object\.freeze\(\["AUTH", "CATALOG", "WRITE", "FEEDBACK", "UTILITIES", "ADMIN"\]\)/);
    assert.doesNotMatch(telemetry, /COORDINATOR|USERS/);
    assert.match(read("JS/Services/CentralConfigurationReader.js"), /GP_CONFIG_RETIRED_SERVICE_KEYS_\s*=\s*\["USERS",\s*"COORDINATOR"\]/);
});
test("AUTH, CATALOG y UTILITIES resuelven Spreadsheet activa sin IDs locales", () => {
    const holders = services.filter(item => /\bSPREADSHEET_ID\b/.test(item.source)).map(item => item.name).sort();
    assert.deepEqual(holders, []);
    const auth = read("JS/Services/Auth.js");
    const catalog = read("JS/Services/catalog.js");
    const utilities = read("JS/Services/Utilities.js");
    assert.match(auth, /function getAuthUsersSpreadsheet_\(\)[\s\S]*?SpreadsheetApp\.getActiveSpreadsheet\(\)[\s\S]*?if \(!authSpreadsheet\)/);
    assert.match(catalog, /function getSpreadsheet\(\)[\s\S]*?SpreadsheetApp\.getActiveSpreadsheet\(\)[\s\S]*?if \(!spreadsheet\)/);
    assert.match(utilities, /function getUtilitiesSpreadsheet_\(\)[\s\S]*?SpreadsheetApp\.getActiveSpreadsheet\(\)[\s\S]*?if \(!spreadsheet\)/);
    for (const source of [auth, catalog, utilities]) assert.doesNotMatch(source, /SpreadsheetApp\.openById\s*\(/);
});
test("PropertiesService solo se consulta desde los baselines legacy identificados", () => {
    const allowed = new Set([
        "ensureLoginRequestsSheet_",
        "migrateLegacyRoleRevocationMarkersToSharedStateUnderLock_",
        "ensureAdminAuditBaseline_",
        "ensureCortesOrganizerLedgerBaseline_",
        "ensureLogoIdReservationBaselineUnderLock_",
        "withAdminLocalOperationGuard_",
        "ensureDriveAuditStateBaseline_",
        "ensureDriveAuditLatestBaseline_",
        "ensureCortesIdReservationBaseline_"
    ]);
    const uses = [];
    for (const item of services) {
        for (const match of item.source.matchAll(/PropertiesService\.getScriptProperties\s*\(/g)) {
            const owner = ownerAt(item.source, match.index);
            uses.push({ file: item.name, owner });
            assert.ok(allowed.has(owner), item.name + " usa PropertiesService fuera de baseline: " + owner);
        }
    }
    assert.equal(uses.length, 9);
});
test("los servicios no escriben ni eliminan propiedades Apps Script", () => {
    assert.doesNotMatch(backendText, /\.(?:setProperty|deleteProperty)\s*\(/);
});
test("WRITE no acepta el campo/token legacy de SharedMutation", () => {
    const write = read("JS/Services/write.js");
    assert.doesNotMatch(write, /__sharedMutationToken/);
    assert.doesNotMatch(backendText, /withSharedMutationLease_|SharedMutationClient/);
});
test("HTML, manifest y service worker no contienen URLs de servicios Apps Script", () => {
    const all = htmlText + "\n" + manifest + "\n" + serviceWorker;
    assert.doesNotMatch(all, /https:\/\/script\.google\.com\/macros\/s\//i);
    assert.doesNotMatch(all, /GPSpedia_COORDINATOR_URL|GPSpedia_COORDINATOR_SECRET/);
});
test("la fuente frontend no contiene secretos manuales ni endpoints de interconexión paralelos", () => {
    assert.doesNotMatch(frontendText, /GPSpedia_COORDINATOR_SECRET|GPSpedia_CATALOG_TRAFFIC_SECRET|(?:AUTH|CATALOG|WRITE|FEEDBACK|UTILITIES|ADMIN)_SERVICE_URL/);
});
test("el código conserva llamadas externas separadas de la comunicación entre servicios", () => {
    assert.doesNotMatch(backendText, /UrlFetchApp\.fetch\s*\(\s*["']https:\/\/script\.google\.com\/macros\/s\//i);
    assert.match(backendText, /UrlFetchApp\.fetch/);
});
console.log("MIG026StaticConfigSearch: " + passed + "/" + passed + " PASS");
