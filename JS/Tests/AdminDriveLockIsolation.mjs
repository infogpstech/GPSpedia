import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = source.indexOf("function runAdminDriveWorkOutsideScriptLock_(");
const end = source.indexOf("\nfunction handleAddOrUpdateCut(", start);
assert.ok(start >= 0 && end > start, "No se encontró runAdminDriveWorkOutsideScriptLock_");
const helper = source.slice(start, end);
const build = new Function(helper + "\nreturn runAdminDriveWorkOutsideScriptLock_;")();
function makeLock() {
    let held = true;
    return { hasLock: () => held, releaseLock: () => { assert.equal(held, true); held = false; },
        tryLock: wait => { assert.equal(wait, 0); if (makeLock.busy) return false; held = true; return true; } };
}
makeLock.busy = false;
let lock = makeLock(), order = [];
const value = build(lock, "OP-1", () => { assert.equal(lock.hasLock(), false); order.push("drive"); return 7; },
    result => { assert.equal(lock.hasLock(), true); order.push("revalidate"); return result + 1; });
assert.deepEqual(order, ["drive", "revalidate"]); assert.equal(value, 8); assert.equal(lock.hasLock(), true);
lock = makeLock();
assert.throws(() => build(lock, "OP-2", () => { throw new Error("drive failed"); }), /drive failed/);
assert.equal(lock.hasLock(), true);
lock = makeLock(); makeLock.busy = true;
assert.throws(() => build(lock, "OP-3", () => 1), error => error.code === "ADMIN_LOCK_REACQUIRE_PENDING");
assert.equal(lock.hasLock(), false); makeLock.busy = false;
lock = makeLock();
assert.equal(build(lock, "", () => { assert.equal(lock.hasLock(), true); return 9; }), 9);
console.log("AdminDriveLockIsolation: 9/9 PASS — Drive fuera del ScriptLock, revalidación y recuperación no bloqueante");
