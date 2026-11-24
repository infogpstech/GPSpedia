import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");
const api = read("JS/Frontend/api-config.js");
const auth = read("JS/Services/Auth.js");
const catalog = read("JS/Services/catalog.js");
const write = read("JS/Services/write.js");
const feedback = read("JS/Services/feedback.js") + "\n" + read("JS/Services/InboxConversations.js");
const admin = read("JS/Services/admin.js");
const utilities = read("JS/Services/Utilities.js");
const centralCache = read("JS/Frontend/centralConfigurationCache.js");
const matrix = read("MATRIZ_MIGRACION_SERVICIOS.md");
const roleMatrix = read("MATRIZ_CAPACIDADES_ROLES.md");
const inventory = read("INVENTARIO_PANTALLAS_CAPACIDADES.md");
const runner = read("JS/Tests/RunServiceTests.mjs");
const uiSources = [
  read("index.html"), read("HTML/add_cortes.html"), read("HTML/users.html"),
  read("JS/Frontend/ui.js"), read("JS/Frontend/youtubeUpload.js")
].join("\n");

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log("PASS", name);
}
function parseActionMap(source) {
  const match = source.match(/export\s+const\s+ACTION_TO_SERVICE_MAP\s*=\s*\{([\s\S]*?)\n\};/);
  assert.ok(match, "No se encontró ACTION_TO_SERVICE_MAP");
  const entries = [...match[1].matchAll(/['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/g)];
  const map = new Map();
  for (const [, action, service] of entries) {
    assert.ok(!map.has(action), "Acción duplicada: " + action);
    map.set(action, service);
  }
  return map;
}

const actionMap = parseActionMap(api);
test("mapa canónico conserva 121 acciones y seis servicios", () => {
  assert.equal(actionMap.size, 121, "El número de acciones cambió; actualizar inventario con evidencia");
  assert.deepEqual([...new Set(actionMap.values())].sort(), ["ADMIN","AUTH","CATALOG","FEEDBACK","UTILITIES","WRITE"]);
});
test("las 121 acciones están trazadas en la matriz de migración", () => {
  const missing = [...actionMap.keys()].filter(action => !matrix.includes("`" + action + "`"));
  assert.deepEqual(missing, [], "Acciones sin trazabilidad documental: " + missing.join(", "));
});
test("contrato integral mapa-router-handler-consumidor permanece válido", () => {
  const contractSource = read("JS/Tests/ActionDispatchContract.js");
  const run = new Function(contractSource + "\nreturn runActionDispatchContractTests;")();
  const result = run({
    apiConfig: api, AUTH: auth, CATALOG: catalog, WRITE: write, FEEDBACK: feedback,
    ADMIN: admin, UTILITIES: utilities, centralConfigurationCache: centralCache,
    usersHtml: read("HTML/users.html"),
    consumerSources: {
      apiConfig: api, addCortes: read("HTML/add_cortes.html"), auth: read("JS/Frontend/auth.js"),
      main: read("JS/Frontend/main.js"), pysData: read("JS/Frontend/pys-data.js"),
      ui: read("JS/Frontend/ui.js"), usersHtml: read("HTML/users.html"),
      youtubeUpload: read("JS/Frontend/youtubeUpload.js")
    }
  });
  assert.equal(result.status, "PASS", JSON.stringify(result.results.filter(x => x.status === "FAIL")));
  assert.equal(result.failed, 0);
  assert.ok(result.passed >= 12);
});
test("matriz RBAC conserva cinco roles y separación de permisos frontend/backend", () => {
  for (const role of ["Desarrollador","Jefe","Supervisor","Tecnico","Tecnico_exterior"])
    assert.ok(roleMatrix.includes(role), "Falta rol " + role);
  assert.match(admin, /function assertDeveloperSession\s*\(/);
  assert.match(admin, /function assertModalEditSession\s*\(/);
  assert.match(admin, /ADMIN_MODAL_EDIT_ACTIONS/);
  assert.match(feedback, /FEEDBACK_ACTION_PERMISSIONS/);
  assert.match(feedback, /authorizeFeedbackAction_/);
  assert.match(feedback, /INBOX_ACTIVE_ROLES_/);
});
test("controles heredados tienen sustitución documentada y presente en las superficies activas", () => {
  const replacements = {
    "debug-console": "dev-tools-modal",
    "debug-header": "dev-tools-title",
    "debug-clear": "dev-panel-diagnostics",
    "debug-close": "dev-tools-modal",
    "debug-log": "dev-panel-diagnostics",
    "debug-resize-handle": "dev-panel-diagnostics",
    "backup-results-panel": "backup-management-panel",
    "dev-ss-backup-id": "backup-resource-input",
    "copy-ss-backup-btn": "btn-copy-backup-resource-link",
    "link-ss-backup-btn": "btn-open-backup-resource-link",
    "dev-drive-backup-id": "backup-resource-input",
    "copy-drive-backup-btn": "btn-copy-backup-resource-link",
    "link-drive-backup-btn": "btn-open-backup-resource-link",
    "restore-backup-id-input": "backup-resource-input",
    "btn-recalculate-vin-signatures": "btn-admin-run-vin-actions",
    "btn-view-vin-signatures": "btn-admin-run-vin-actions",
    "btn-admin-reorganize-drive": "btn-audit-drive-organizer-preview",
    "btn-admin-clear-activity-logs": "btn-admin-clear-selected-logs"
  };
  for (const [oldId, replacement] of Object.entries(replacements)) {
    assert.ok(!uiSources.includes('id="' + oldId + '"'), "Control antiguo sigue duplicado: " + oldId);
    assert.ok(uiSources.includes('id="' + replacement + '"') || uiSources.includes(replacement),
      "No se localizó el control sustituto de " + oldId + ": " + replacement);
  }
  assert.equal(Object.keys(replacements).length, 18);
});
test("inventario de pantallas mantiene las superficies críticas y controles administrativos", () => {
  for (const token of [
    "UI-02", "UI-03", "UI-04", "UI-05", "UI-08", "UI-09", "UI-10", "UI-11",
    "UI-12", "UI-13", "UI-14", "UI-15", "backup-management-panel",
    "btn-admin-run-vin-actions", "btn-admin-clear-selected-logs",
    "btn-audit-drive-organizer-preview"
  ]) assert.ok(inventory.includes(token), "Inventario no documenta " + token);
});
test("runner conecta cobertura de MIG-015 a MIG-023 y los casos críticos de vídeo", () => {
  for (const group of [
    "runGroup('39','MIG015'", "runGroup('41','MIG017'", "runGroup('42','MIG018'",
    "runGroup('43','MIG019'", "runGroup('44','MIG020'", "runGroup('45','MIG021'",
    "runGroup('48','MIG027'"
  ]) assert.ok(runner.includes(group), "Grupo de regresión ausente: " + group);
  for (const file of [
    "MIG015ImageConfigurationContract.mjs", "YouTubeUploadClientNode.mjs",
    "VideoApprovalClientContract.mjs", "YouTubeInitIdempotencyBoundary.mjs",
    "YouTubeUploadXssIntegrityCli.mjs", "VideoApprovalCatalogRefreshFrontend.mjs",
    "AdminSheetActionsContract.mjs", "CatalogChangeFeed.mjs", "CatalogBrowserReset.mjs",
    "CatalogStartupIntegrity.mjs", "PrintSheetPageContract.mjs"
  ]) assert.ok(runner.includes(file), "Suite de preservación no integrada al runner: " + file);
});
test("MIG-016 a MIG-023 conserva los contratos y funciones de alto impacto", () => {
  for (const token of [
    "YouTubeUploadReservations", "opVideoId",     "backupDatabase", "backupDrive", "restoreDatabase", "restoreDrive",
    "migrateTimestamps", "getCatalogChanges", "publishCatalogReset",
    "getInboxConversations", "sendInboxMessage",     "getDriveStorage", "getVehicleProjection"
  ]) assert.ok(api.includes(token) || auth.includes(token) || admin.includes(token) ||
    feedback.includes(token) || utilities.includes(token) || read("JS/Frontend/youtubeUpload.js").includes(token),
    "No se encontró contrato/acción crítica: " + token);
});

console.log("MIG027FunctionalParity: " + passed + "/8 PASS");
