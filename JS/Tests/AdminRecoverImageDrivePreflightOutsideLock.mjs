import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
function extract(name) {
    const start = source.indexOf("function " + name + "(");
    const end = source.indexOf("\nfunction ", start + 10);
    assert.ok(start >= 0 && end > start, "No se encontró " + name);
    return source.slice(start, end);
}
const handler = extract("handleRecoverReplacedImage");
const helper = extract("runAdminDriveWorkOutsideScriptLock_");
const release = handler.indexOf("lock.releaseLock()");
const drive = handler.indexOf("DriveApp.getFileById(driveId)");
const outsideLock = handler.indexOf("runAdminDriveWorkOutsideScriptLock_(");
const cortesRead = handler.indexOf("getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES)");
assert.ok(outsideLock > handler.indexOf("lock.waitLock(30000)") && drive > outsideLock,
    "La verificación Drive debe ejecutarse desde el trabajo aislado después de obtener el snapshot");
assert.ok(release > drive && cortesRead > outsideLock,
    "La sección crítica debe reanudarse antes de continuar con la mutación de Cortes");
assert.match(handler, /latestDriveId!==driveId/);
assert.match(handler, /latestStatus!==previousHistoryStatus/);
assert.match(handler, /String\(latestRow\[7\]\|\|""\)\.trim\(\)!==urlHistorica/);
assert.match(handler, /String\(latestRow\[3\]\|\|""\)\.trim\(\)!==registroId/);
assert.match(handler, /String\(latestRow\[4\]\|\|""\)\.trim\(\)!==campo/);
assert.match(handler, /finally\{if\(typeof lock\.hasLock!=="function"\|\|lock\.hasLock\(\)\)lock\.releaseLock\(\);\}/);

const makeHelper = new Function(helper + "\nreturn runAdminDriveWorkOutsideScriptLock_;")();
let locked = true, workRan = false, revalidated = false;
const lock = {
    hasLock: () => locked,
    releaseLock() { assert.equal(locked, true); locked = false; },
    tryLock(timeout) { assert.equal(timeout, 0); locked = true; return true; }
};
const value = makeHelper(lock, "ADMIN_RECOVER_IMG-1", () => {
    assert.equal(locked, false, "Drive debe ejecutarse sin ScriptLock");
    workRan = true;
    return { fileId: "drive-id" };
}, result => {
    assert.equal(locked, true, "La revalidación debe ejecutarse con el lock readquirido");
    assert.equal(result.fileId, "drive-id");
    revalidated = true;
    return "verified";
});
assert.equal(value, "verified");
assert.equal(workRan, true);
assert.equal(revalidated, true);
assert.equal(locked, true);

let failedLock = true, failedRevalidation = false;
const unavailableLock = {
    hasLock: () => failedLock,
    releaseLock() { failedLock = false; },
    tryLock: () => false
};
assert.throws(() => makeHelper(unavailableLock, "ADMIN_RECOVER_IMG-2", () => "done", () => {
    failedRevalidation = true;
}), error => error.code === "ADMIN_LOCK_REACQUIRE_PENDING");
assert.equal(failedRevalidation, false);
assert.equal(failedLock, false);

console.log("AdminRecoverImageDrivePreflightOutsideLock: 11/11 PASS");
