import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = source.indexOf("function handleAddOrUpdateCut(payload, logMessage, developerContext)");
const end = source.indexOf("\nfunction sanitizeSupplementaryRichText_", start);
assert.ok(start >= 0 && end > start, "No se encontró handleAddOrUpdateCut");
const handler = source.slice(start, end);
const newBranchStart = handler.indexOf("} else { // --- Lógica para vehículo NUEVO");
assert.ok(newBranchStart >= 0, "No se encontró rama de vehículo nuevo");
const branch = handler.slice(newBranchStart);
const driveStart = branch.indexOf("const uploaded = runAdminContributionDriveWorkOutsideScriptLock_");
const callbackEnd = branch.indexOf("}, operationHash);", driveStart);
assert.ok(driveStart >= 0 && callbackEnd > driveStart, "No se encontró callback post-Drive");
const callback = branch.slice(driveStart, callbackEnd);
const verified = callback.indexOf("const verified = findRowByOpId(sheet, opId, idempotencyEntriesSnapshot);");
const identity = callback.indexOf("verified.rowIndex !== rowIndex");
const vehicle = callback.indexOf("verified.vehicleId !== String(newId)");
const slot = callback.indexOf("verified.slotIndex !== 1");
const hash = callback.indexOf("verified.operationHash !== operationHash");
const idSnapshot = callback.indexOf("Number(verified.rowValues[COLS_CORTES.id - 1]) !== Number(newId)");
assert.ok(verified >= 0 && verified < identity && identity < vehicle && vehicle < slot && slot < hash && hash < idSnapshot,
    "La revalidación debe verificar reserva e ID usando el snapshot devuelto después de Drive");
assert.doesNotMatch(callback, /getRange\(rowIndex,\s*COLS_CORTES\.id\)\.getValue\(\)/,
    "No debe consultar individualmente el ID después de que findRowByOpId devuelve la fila completa");
assert.match(callback, /verified\.rowValues\[COLS_CORTES\.id - 1\]/);

const helperStart = source.indexOf("function findUniqueCortesVehicleRow_");
const helperEnd = source.indexOf("\nfunction ", helperStart + 10);
const helper = source.slice(helperStart, helperEnd);
assert.match(helper, /const rowValues = sheet\.getRange\(rowIndex, 1, 1, sheet\.getLastColumn\(\)\)\.getValues\(\)\[0\]/);
assert.match(helper, /return \{ rowIndex: rowIndex, rowValues: rowValues \}/);
console.log("AdminNewVehiclePostDriveIdSnapshotReuse: 7/7 PASS — ID revalidado desde la fila completa verificada; sin getValue redundante");
