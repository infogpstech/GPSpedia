import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function withFeedbackLikeLock_(");
const end = source.indexOf("\nfunction ", start + 10);
assert.ok(start >= 0 && end > start, "No se encontró withFeedbackLikeLock_.");
const implementation = source.slice(start, end);

let operationExecuted = false;
let released = 0;
const busyLock = { tryLock(timeout) { assert.equal(timeout, 0); return false; }, releaseLock() { released++; } };
const withBusyLock = new Function("LockService", implementation + "\nreturn withFeedbackLikeLock_;")({
    getScriptLock: () => busyLock
});
assert.throws(
    () => withBusyLock(() => { operationExecuted = true; }),
    error => error && error.code === "LIKE_LOCK_BUSY" && /en curso/.test(error.message)
);
assert.equal(operationExecuted, false, "La operación no debe ejecutarse si el lock sigue ocupado.");
assert.equal(released, 0, "No se libera un lock que no se obtuvo.");

const acquiredLock = { tryLock(timeout) { assert.equal(timeout, 0); return true; }, releaseLock() { released++; } };
const withAcquiredLock = new Function("LockService", implementation + "\nreturn withFeedbackLikeLock_;")({
    getScriptLock: () => acquiredLock
});
assert.equal(withAcquiredLock(() => "committed"), "committed");
assert.equal(released, 1, "El lock adquirido se libera al completar la operación.");

assert.throws(() => withAcquiredLock(() => { throw new Error("append failed"); }), /append failed/);
assert.equal(released, 2, "El lock se libera incluso si la escritura falla.");
console.log("FeedbackLikeLockContention: 3/3 PASS — rechazo inmediato ante contención y liberación segura");