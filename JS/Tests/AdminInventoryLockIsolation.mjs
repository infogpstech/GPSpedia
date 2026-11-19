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
assert.match(fn("recordImageAdministrationActivity"), /withSharedMutationLease_\("ADMIN", "recordAdminImageActivity"/);
assert.doesNotMatch(fn("getNextAdminFormulaBasedId_"), /LockService|waitLock|tryLock/,
    "El asignador de ID de ActividadUsuario se ejecuta bajo la lease ACTIVITY.");
const router = admin.slice(admin.indexOf("function doPostInternal_(e)"));
assert.match(router, /case 'saveUnusedImagesInventory':[\s\S]*?withSharedMutationLease_\("ADMIN", "saveUnusedImagesInventory"/);
assert.match(coordinator, /saveUnusedImagesInventory: \{ write: \["IMAGE_INVENTORY"\] \}/);
assert.match(coordinator, /recordAdminImageActivity: \{ write: \["ACTIVITY"\] \}/);
console.log("AdminInventoryLockIsolation: 7/7 PASS — inventario sin ScriptLock global y actividad con lease puntual");
