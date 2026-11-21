import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const coordinator = readFileSync(new URL("../Services/Coordinator.js", import.meta.url), "utf8");
function fn(name) {
    const start = admin.indexOf("function " + name + "(");
    const end = admin.indexOf("\nfunction ", start + 10);
    assert.ok(start >= 0 && end > start, "No se encontró " + name);
    return admin.slice(start, end);
}
for (const name of ["handleSaveUnusedImagesInventory", "handleOrganizeUnusedImagesBatch"]) {
    assert.doesNotMatch(fn(name), /LockService\.getScriptLock|waitLock\(/, name + " no debe adquirir ScriptLock global");
}
const activity = fn("recordImageAdministrationActivity");
assert.match(activity, /getAdminFormulaBasedIdPattern_\(sheet, 1\)/);
assert.match(activity, /sheet\.appendRow\(\[/);
assert.match(activity, /SpreadsheetApp\.flush\(\)/);
assert.doesNotMatch(activity, /withSharedMutationLease_|recordAdminImageActivity|getNextAdminFormulaBasedId_|LockService/);
const router = admin.slice(admin.indexOf("function doPostInternal_(e)"));
assert.match(router, /case 'saveUnusedImagesInventory':[\s\S]*?withSharedMutationLease_\("ADMIN", "saveUnusedImagesInventory"/);
assert.match(coordinator, /saveUnusedImagesInventory: \{ write: \["IMAGE_INVENTORY"\] \}/);
assert.doesNotMatch(coordinator, /recordAdminImageActivity:\s*\{/);
console.log("AdminInventoryLockIsolation: 1/1 PASS — inventario con lease puntual y actividad appendRow sin lease");
