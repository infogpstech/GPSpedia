import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = source.indexOf("function handleAddOrUpdateCut(payload, logMessage, developerContext)");
const end = source.indexOf("\nfunction sanitizeSupplementaryRichText_", start);
assert.ok(start >= 0 && end > start, "No se encontró handleAddOrUpdateCut");
const handler = source.slice(start, end);
const branchStart = handler.indexOf("} else { // --- Lógica para vehículo NUEVO");
const branch = handler.slice(branchStart);
const copy = branch.indexOf("copyAdminRowPresentationOnly_(sheet, lastRow, rowIndex, lastColumn)");
const clear = branch.indexOf("sheet.getRange(rowIndex, 1, 1, lastColumn).clearContent()");
const flush = branch.indexOf("SpreadsheetApp.flush()", clear);
const assign = branch.indexOf("sheet.getRange(rowIndex, COLS_CORTES.id).setValue(newId)");
const confirm = branch.indexOf("sheet.getRange(rowIndex, COLS_CORTES.id).getValue()");
assert.ok(copy >= 0 && copy < clear && clear < flush && flush < assign && assign < confirm,
    "Debe copiar plantilla, limpiar una fila completa, hacer flush y luego asignar/confirmar ID");
assert.equal((branch.match(/\.clearContent\(\)/g) || []).length, 1,
    "La limpieza inicial debe realizar una sola llamada clearContent");
assert.doesNotMatch(branch, /getRange\(rowIndex,\s*2,\s*1,\s*lastColumn\s*-\s*1\)/,
    "No debe mantenerse la limpieza separada de las columnas de datos");
assert.match(branch, /recordOpId\(opId, newId, 1, formattedDate, "pending"/,
    "La reserva idempotente pending debe mantenerse");
assert.ok(branch.indexOf('recordOpId(opId, newId, 1, formattedDate, "pending"') <
    branch.indexOf("runAdminContributionDriveWorkOutsideScriptLock_"),
    "La reserva pending debe preceder a Drive");
assert.ok(branch.indexOf('recordOpId(opId, newId, 1, formattedDate, "completed"') >
    branch.indexOf("SpreadsheetApp.flush()", branch.indexOf("runAdminContributionDriveWorkOutsideScriptLock_")),
    "La operación solo debe completarse después de escribir y hacer flush");
console.log("AdminNewVehicleSingleRowClear: 7/7 PASS — una limpieza de fila, ID central y reserva idempotente preservados");
