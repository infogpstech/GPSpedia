import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
const start = source.indexOf("function handleAddOrUpdateCutLockedUnsafe_(");
const end = source.indexOf("\nfunction ", start + 20);
assert.ok(start >= 0 && end > start, "No se encontró la mutación canónica WRITE.");
const handler = source.slice(start, end);
const driveCalls = [...handler.matchAll(/markImageUploadLinked\(/g)];
assert.equal(driveCalls.length, 5, "Recuperación, vehículo existente y vehículo nuevo deben vincular las imágenes.");
for (const call of driveCalls) {
    const prefix = handler.slice(Math.max(0, call.index - 150), call.index);
    assert.ok(prefix.includes("runWriteDriveWorkOutsideScriptLock_(lock, lockState, opId, () =>"),
        "Toda vinculación de imágenes debe ejecutarse dentro del wrapper WRITE fuera del lock.");
}
assert.ok(!handler.includes("markAdminCutImagesLinkedOutsideLock_"),
    "WRITE no debe depender del wrapper ADMIN retirado.");

const helperStart = source.indexOf("function runWriteDriveWorkOutsideScriptLock_(");
const helperEnd = source.indexOf("\nfunction ", helperStart + 20);
assert.ok(helperStart >= 0 && helperEnd > helperStart, "No se encontró el wrapper de Drive de WRITE.");
const helper = source.slice(helperStart, helperEnd);
const build = new Function(helper + "\nreturn runWriteDriveWorkOutsideScriptLock_;");
const runOutside = build();
let held = true, released = 0, reacquired = 0, ran = false;
const lock = {
    hasLock: () => held,
    releaseLock() { assert.equal(held, true); held = false; released++; },
    tryLock(timeout) { assert.equal(timeout, 0); assert.equal(held, false); held = true; reacquired++; return true; }
};
const state = { releasedForDrive: false };
const result = runOutside(lock, state, "OP-1", () => {
    assert.equal(held, false, "Drive debe ejecutarse sin el ScriptLock global.");
    ran = true;
    return "linked";
});
assert.equal(result, "linked");
assert.equal(ran, true);
assert.equal(held, true);
assert.equal(released, 1);
assert.equal(reacquired, 1);
assert.equal(state.releasedForDrive, true);

assert.throws(() => runOutside(lock, state, "OP-2", () => { throw new Error("drive failure"); }), /drive failure/);
assert.equal(held, true, "El lock debe recuperarse incluso cuando Drive falla.");
assert.equal(released, 2);
assert.equal(reacquired, 2);

const noLockResult = runOutside({ hasLock: () => false }, {}, "OP-3", () => "without-lock");
assert.equal(noLockResult, "without-lock");

const failedLock = {
    hasLock: () => true,
    releaseLock() { held = false; },
    tryLock() { return false; }
};
assert.throws(() => runOutside(failedLock, {}, "OP-4", () => true), error => error.code === "WRITE_LOCK_REACQUIRE_PENDING");
console.log("AdminCutImageLinkOutsideLock: PASS — WRITE ejecuta cinco vínculos Drive fuera del lock y gestiona recuperación/contención");
