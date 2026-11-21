import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ui = readFileSync(new URL("../Frontend/ui.js", import.meta.url), "utf8");
const auth = readFileSync(new URL("../Frontend/auth.js", import.meta.url), "utf8");
const main = readFileSync(new URL("../Frontend/main.js", import.meta.url), "utf8");
const offline = readFileSync(new URL("../Frontend/offline.js", import.meta.url), "utf8");

function block(source, name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const next = source.indexOf("\nfunction ", start + 10);
    return source.slice(start, next < 0 ? source.length : next);
}
const refresh = block(ui, "refreshCatalogAfterEdit_");
const exit = ui.slice(ui.indexOf("export async function exitModalEditMode"),
    ui.indexOf("\nfunction getAdminImageUploadOwnerVehicleKey"));
const load = block(auth, "loadInitialData");

assert.match(refresh, /window\.auth/);
assert.match(refresh, /authApi\.loadInitialData\(true, \{ silent: true \}\)/);
assert.match(refresh, /synced === true && offline\.isCompleteCatalogSnapshot\(currentCatalog\)/);
assert.match(refresh, /const catalogAtStart = getState\(\)\.catalogData/);
assert.match(refresh, /currentCatalog !== catalogAtStart/);
assert.match(refresh, /const catalogBeforeFallback = getState\(\)\.catalogData/);
assert.match(refresh, /getState\(\)\.catalogData !== catalogBeforeFallback/);
assert.doesNotMatch(refresh, /offline\.saveCatalog(?:WithCursor)?\(/,
    "El fallback de memoria no debe emparejar un snapshot posterior con un cursor anterior.");

const saveBranchStart = exit.indexOf("\n    } else {", exit.indexOf("if (!saveChanges && originalItemBackup)"));
assert.ok(saveBranchStart > 0, "No se encontró la rama de cierre normal.");
const saveBranch = exit.slice(saveBranchStart);
assert.equal((saveBranch.match(/refreshCatalogAfterEdit_\(editSession\)/g) || []).length, 2);
assert.doesNotMatch(saveBranch, /routeAction\(["']getCatalogData["']\)/,
    "El cierre normal debe consumir deltas y dejar el snapshot completo como fallback interno.");

const discardBranch = exit.slice(0, saveBranchStart);
assert.equal((discardBranch.match(/routeAction\(["']getCatalogData["']\)/g) || []).length, 2,
    "El descarte conserva lectura actual y read-back completo después de restaurar campos.");
assert.match(discardBranch, /getEditBackupFieldsToRestore/);
assert.match(discardBranch, /mismatches\.length/);

assert.match(load, /offline\.getCatalogSyncState\(\)/);
assert.match(load, /fetchCatalogDelta_\(cachedCursor/);
assert.match(load, /delta\.resetRequired/);
assert.match(load, /offline\.applyCatalogChangesToSnapshot\(cachedCatalog, delta\.changes\)/);
assert.match(load, /fetchCatalogData\(/);
assert.match(load, /offline\.saveCatalogWithCursor\(snapshotToApply, cursorToPersist\)/);
assert.match(main, /window\.auth = auth/);
assert.match(offline, /export async function saveCatalogWithCursor/);
assert.match(offline, /export function applyCatalogChangesToSnapshot/);

console.log("CatalogEditDeltaRefresh: 23/23 PASS — edición normal usa deltas; descarte mantiene verificación completa");
