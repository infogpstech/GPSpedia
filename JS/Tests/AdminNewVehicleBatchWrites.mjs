import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const write = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
const api = readFileSync(new URL("../Frontend/api-config.js", import.meta.url), "utf8");

const start = admin.indexOf("function handleAddOrUpdateCut(payload, logMessage, developerContext)");
const end = admin.indexOf("\nfunction sanitizeSupplementaryRichText_", start);
assert.ok(start >= 0 && end > start);
const legacy = admin.slice(start, end);
assert.ok(legacy.includes("ACTION_MOVED_TO_WRITE"));
for (const token of ["setValues(", "setValue(", "UrlFetchApp", "requestNextVehicleIdFromWriteService"]) {
    assert.equal(legacy.includes(token), false, "ADMIN legacy no debe contener " + token);
}
assert.ok(api.includes("'addOrUpdateCut': 'WRITE'"));
assert.ok(api.includes("'allocateVehicleId': 'WRITE'"));

const writeStart = write.indexOf("function handleAddOrUpdateCut(payload)");
const writeEnd = write.indexOf("\nconst CORTES_ID_COUNTER_PROPERTY", writeStart);
assert.ok(writeStart >= 0 && writeEnd > writeStart);
const handler = write.slice(writeStart, writeEnd);
assert.ok(handler.includes("reserveCortesVehicleIdForOperation_"));
assert.ok(handler.includes("handleAppendExistingVehicleCut_(preparedRequest)"));
assert.ok(handler.includes("handleAddOrUpdateCutLocked(preparedRequest"));
assert.ok(write.includes("function handleAddOrUpdateCutLockedUnsafe_"));
assert.ok(write.includes("runWriteDriveWorkOutsideScriptLock_"));
console.log("AdminNewVehicleBatchWrites: 1/1 PASS — reserva, alta, escrituras agrupadas y recuperación pertenecen a WRITE");
