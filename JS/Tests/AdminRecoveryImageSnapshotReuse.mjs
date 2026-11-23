import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const admin=readFileSync(new URL("../Services/admin.js",import.meta.url),"utf8");
const write=readFileSync(new URL("../Services/write.js",import.meta.url),"utf8");
const legacyStart=admin.indexOf("function handleAddOrUpdateCut(payload, logMessage, developerContext)");
const legacyEnd=admin.indexOf("\nfunction sanitizeSupplementaryRichText_",legacyStart);
assert.ok(legacyStart>=0&&legacyEnd>legacyStart);
assert.ok(admin.slice(legacyStart,legacyEnd).includes("ACTION_MOVED_TO_WRITE"));

const start=write.indexOf("function handleAddOrUpdateCutLockedUnsafe_");
const end=write.indexOf("\nfunction ",start+10);
assert.ok(start>=0&&end>start,"No se encontró el bloque de recuperación WRITE.");
const handler=write.slice(start,end);
const recoveryStart=handler.indexOf("const imageRepairNeeds");
const recoveryEnd=handler.indexOf("// 3. Complete missing/empty text fields",recoveryStart);
assert.ok(recoveryStart>=0&&recoveryEnd>recoveryStart);
const recovery=handler.slice(recoveryStart,recoveryEnd);
assert.match(recovery,/rowValues\[COLS_CORTES\.imagenVehiculo - 1\]\s*=\s*repairedImages\.vehicle/);
assert.match(recovery,/rowValues\[COLS_CORTES\[\x60imgCorte\$\{slotIndex\}\x60\] - 1\]\s*=\s*repairedImages\.cut/);
assert.match(recovery,/rowValues\[COLS_CORTES\.imagenVehiculo - 1\], \{ shortLedgerLock: true \}/);
assert.match(recovery,/rowValues\[COLS_CORTES\["imgCorte" \+ slotIndex\] - 1\], \{ shortLedgerLock: true \}/);
assert.doesNotMatch(recovery,/getRange\(rowIndex, COLS_CORTES\.imagenVehiculo\)\.getValue\(\)/);
assert.doesNotMatch(recovery,/getRange\(rowIndex, COLS_CORTES\["imgCorte" \+ slotIndex\]\)\.getValue\(\)/);

const helperStart=write.indexOf("function findRowByOpId(");
const helperEnd=write.indexOf("\nfunction ",helperStart+10);
const helper=write.slice(helperStart,helperEnd);
assert.match(helper,/rowValues: unique\.rowValues/);
console.log("AdminRecoveryImageSnapshotReuse: 1/1 PASS — WRITE actualiza y reutiliza rowValues sin lecturas redundantes");
