import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const handlerStart = source.indexOf("function handleAddOrUpdateCut(payload, logMessage, developerContext)");
const handlerEnd = source.indexOf("\nfunction sanitizeSupplementaryRichText_", handlerStart);
assert.ok(handlerStart >= 0 && handlerEnd > handlerStart, "No se encontró handleAddOrUpdateCut");
const handler = source.slice(handlerStart, handlerEnd);
const existingStart = handler.indexOf("if (vehicleId) { // --- Lógica para vehículo EXISTENTE ---");
const existingEnd = handler.indexOf("} else { // --- Lógica para vehículo NUEVO", existingStart);
assert.ok(existingStart >= 0 && existingEnd > existingStart, "No se encontró rama de vehículo existente");
const branch = handler.slice(existingStart, existingEnd);
const callbackStart = branch.indexOf("const imageUrl = runAdminDriveWorkOutsideScriptLock_");
const callbackEnd = branch.indexOf("}, operationHash);", callbackStart);
assert.ok(callbackStart >= 0 && callbackEnd > callbackStart, "No se encontró callback post-Drive");
const callback = branch.slice(callbackStart, callbackEnd);

const verify = callback.indexOf("const verified = findRowByOpId(sheet, opId, idempotencyEntriesSnapshot);");
const assign = callback.indexOf("verifiedRowValues = verified.rowValues;");
const current = callback.indexOf("const currentValues = verifiedRowValues ||");
const prepare = callback.indexOf("prepareVinCollectionForAdmin(sheet, currentValues");
assert.ok(verify >= 0 && verify < assign && assign < current && current < prepare,
    "El snapshot debe obtenerse tras Drive, validarse y reutilizarse al preparar VIN");
assert.doesNotMatch(callback, /getRange\(rowIndex,\s*1,\s*1,\s*sheet\.getLastColumn\(\)\)\.getValues\(\)/,
    "No debe repetirse la lectura integral de fila dentro del callback cuando findRowByOpId ya la devuelve");
assert.match(callback, /verified\.rowIndex !== rowIndex/);
assert.match(callback, /verified\.slotIndex !== cutSlotIndex/);
assert.match(callback, /verified\.vehicleId !== String\(vehicleId\)/);
assert.match(callback, /verified\.operationHash !== operationHash/);
assert.match(callback, /verified\.rowValues\[COLS_CORTES\["tipoCorte" \+ cutSlotIndex\] - 1\]/);

const helperStart = source.indexOf("function findUniqueCortesVehicleRow_");
const helperEnd = source.indexOf("\nfunction ", helperStart + 10);
const helper = source.slice(helperStart, helperEnd);
const idScan = helper.indexOf("sheet.getRange(2, COLS_CORTES.id, lastRow - 1, 1).getValues()");
const rowRead = helper.indexOf("sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0]");
assert.ok(idScan >= 0 && rowRead > idScan, "La búsqueda de unicidad debe preceder a la lectura de la fila actual");
assert.match(helper, /return \{ rowIndex: rowIndex, rowValues: rowValues \}/,
    "La función de unicidad debe entregar el snapshot completo recién leído");
console.log("AdminExistingVehiclePostDriveSnapshotReuse: 9/9 PASS — reutiliza la fila post-Drive sin repetir getValues; unicidad y revalidación preservadas");
