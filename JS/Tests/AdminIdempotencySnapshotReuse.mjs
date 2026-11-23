import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const admin=readFileSync(new URL("../Services/admin.js",import.meta.url),"utf8");
const write=readFileSync(new URL("../Services/write.js",import.meta.url),"utf8");
const api=readFileSync(new URL("../Frontend/api-config.js",import.meta.url),"utf8");
const start=admin.indexOf("function handleAddOrUpdateCut(payload, logMessage, developerContext)");
const end=admin.indexOf("\nfunction sanitizeSupplementaryRichText_",start);
assert.ok(start>=0&&end>start);
const legacy=admin.slice(start,end);
assert.ok(legacy.includes("ACTION_MOVED_TO_WRITE"));
for(const token of ["readIdempotenciaEntries_(","recordOpId(","findRowByOpId(","runAdminContributionDriveWorkOutsideScriptLock_","setValue(","setValues("]){
 assert.equal(legacy.includes(token),false,"ADMIN legacy no debe conservar "+token);
}
assert.ok(api.includes("'addOrUpdateCut': 'WRITE'"));
assert.ok(api.includes("'allocateVehicleId': 'WRITE'"));
assert.ok(write.includes("function handleAddOrUpdateCutLocked("));
assert.ok(write.includes("function handleAddOrUpdateCutLockedUnsafe_"));
assert.ok(write.includes("function findRowByOpId("));
console.log("AdminIdempotencySnapshotReuse: 1/1 PASS — ADMIN no conserva idempotencia de altas; WRITE es propietario");
