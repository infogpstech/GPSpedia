import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const write = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");

const legacyStart = admin.indexOf("function handleAddOrUpdateCut(payload, logMessage, developerContext)");
const legacyEnd = admin.indexOf("\nfunction sanitizeSupplementaryRichText_", legacyStart);
assert.ok(legacyStart >= 0 && legacyEnd > legacyStart, "No se encontró la ruta ADMIN de compatibilidad.");
const legacy = admin.slice(legacyStart, legacyEnd);
assert.match(legacy, /ACTION_MOVED_TO_WRITE/);
assert.doesNotMatch(legacy, /setValues\(|setValue\(|UrlFetchApp/,
    "ADMIN no debe conservar escrituras ni reparación de altas trasladadas a WRITE.");

const writeEntryStart = write.indexOf("function handleAddOrUpdateCut(payload)");
const writeEntryEnd = write.indexOf("\nconst CORTES_ID_COUNTER_PROPERTY", writeEntryStart);
assert.ok(writeEntryStart >= 0 && writeEntryEnd > writeEntryStart);
const writeEntry = write.slice(writeEntryStart, writeEntryEnd);
assert.ok(writeEntry.includes("handleAppendExistingVehicleCut_(preparedRequest)"),
    "Los vehículos existentes deben usar el propietario WRITE append-only.");

const recoveryStart = write.indexOf("function handleAddOrUpdateCutLockedUnsafe_");
const recoveryEnd = write.indexOf("\nfunction ", recoveryStart + 10);
assert.ok(recoveryStart >= 0 && recoveryEnd > recoveryStart, "No se encontró la recuperación idempotente WRITE.");
const recovery = write.slice(recoveryStart, recoveryEnd);
assert.match(recovery, /findRowByOpId\(sheet, opId, idempotencyEntriesSnapshot\)/);
assert.match(recovery, /match\.operationHash !== operationHash/);
assert.match(recovery, /runWriteDriveWorkOutsideScriptLock_/);
assert.match(recovery, /recordOpId\(opId, rowObj\.id, slotIndex, match\.timestamp \|\| rowObj\.timestamp, "completed"/);
assert.match(recovery, /recoveredVinCollection/);

console.log("AdminRecoveryRepairBatchWrites: 1/1 PASS — recuperación idempotente transferida a WRITE; ADMIN legacy sin escrituras");
