import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const admin=readFileSync(new URL("../Services/admin.js",import.meta.url),"utf8");
const write=readFileSync(new URL("../Services/write.js",import.meta.url),"utf8");
const adminStart=admin.indexOf("function handleAddOrUpdateCut(payload, logMessage, developerContext)");
const adminEnd=admin.indexOf("\nfunction sanitizeSupplementaryRichText_",adminStart);
assert.ok(adminStart>=0&&adminEnd>adminStart);
assert.ok(admin.slice(adminStart,adminEnd).includes("ACTION_MOVED_TO_WRITE"));

const start=write.indexOf("function handleAddOrUpdateCutLockedUnsafe_");
const end=write.indexOf("\nfunction ",start+10);
assert.ok(start>=0&&end>start,"No se encontró la transacción física de alta en WRITE.");
const handler=write.slice(start,end);
const drive=handler.indexOf("const preparedImages = runWriteDriveWorkOutsideScriptLock_");
const verify=handler.indexOf("const verified = findRowByOpId(sheet, opId, idempotencyEntriesSnapshot)",drive);
const row=handler.indexOf("const rowCoreValues = [",verify);
assert.ok(drive>=0&&verify>drive&&row>verify,"WRITE debe revalidar después de Drive y antes de escribir la fila.");
const checks=[
 "verified.rowIndex !== rowIndex",
 "String(verified.vehicleId) !== String(newId)",
 "verified.slotIndex !== 1",
 "verified.operationHash !== operationHash",
 "Number(verified.rowValues[COLS_CORTES.id - 1]) !== Number(newId)"
];
let previous=verify;
for(const check of checks){const at=handler.indexOf(check,previous);assert.ok(at>previous,"Falta revalidación ordenada: "+check);previous=at;}
assert.doesNotMatch(handler.slice(verify,row),/getRange\(rowIndex,\s*COLS_CORTES\.id\)\.getValue\(\)/,
 "La revalidación debe reutilizar el snapshot completo, sin lectura individual redundante.");

const helperStart=write.indexOf("function findUniqueCortesVehicleRow_");
const helperEnd=write.indexOf("\nfunction ",helperStart+10);
const helper=write.slice(helperStart,helperEnd);
assert.match(helper,/getRange\(rowIndex, 1, 1, cortesSheet\.getLastColumn\(\)\)\.getValues\(\)\[0\]/);
assert.match(helper,/return \{ rowIndex: rowIndex, rowValues: rowValues \}/);
console.log("AdminNewVehiclePostDriveIdSnapshotReuse: 1/1 PASS — WRITE revalida ID/reserva desde snapshot post-Drive");
