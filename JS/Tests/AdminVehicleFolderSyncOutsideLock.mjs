import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = source.indexOf("function handleUpdateVehicleField(payload, logMessage)");
const end = source.indexOf("\nconst ADMIN_IMAGE_UPLOAD_SHEET_NAME", start);
assert.ok(start >= 0 && end > start, "No se encontró handleUpdateVehicleField");
const handler = source.slice(start, end);
const acquire = handler.indexOf("lock.tryLock(0)");
const release = handler.indexOf("if (lock.hasLock()) lock.releaseLock()");
const driveSync = handler.indexOf("movePrimaryVehicleImageToCanonicalFolder(");
assert.ok(acquire >= 0, "La sección crítica debe adquirir el lock sin espera prolongada");
assert.ok(release > acquire && driveSync > release,
    "La sincronización Drive debe ejecutarse después de liberar el ScriptLock");
assert.ok(!handler.includes("waitLock("), "La edición no debe esperar 30 segundos para entrar");
assert.ok(handler.includes("folderSyncVehicleInfo = { sheet, row: actualRow, vehicle: mapRowToObject(updatedValues, COLS_CORTES) }"),
    "Debe conservar la instantánea de metadatos confirmados antes de salir del lock");
assert.ok(handler.includes("response.folderSyncWarning = true"),
    "Un fallo de Drive debe advertirse sin revertir el metadato ya guardado");
assert.ok(handler.includes("lock.hasLock()"), "El finally solo debe liberar un lock que siga en posesión de la ejecución");
console.log("AdminVehicleFolderSyncOutsideLock: 7/7 PASS — escritura breve y sincronización Drive fuera del ScriptLock");
