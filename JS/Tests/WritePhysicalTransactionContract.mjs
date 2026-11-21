import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
function extract(name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const end = source.indexOf("\nfunction ", start + 10);
    return source.slice(start, end > start ? end : source.length);
}
const entry = extract("handleAddOrUpdateCut");
const transaction = extract("handleAddOrUpdateCutLocked");
const unsafe = extract("handleAddOrUpdateCutLockedUnsafe_");
const drive = extract("runWriteDriveWorkOutsideScriptLock_");
const removePending = extract("removeEmptyPendingCutRow");
const record = extract("recordOpId");

let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }

test("la alta física conserva ScriptLock fail-fast y no espera", () => {
    assert.match(entry, /LockService\.getScriptLock\(\)/);
    assert.match(entry, /lock\.tryLock\(0\)/);
    assert.doesNotMatch(entry, /waitLock\(/);
});

test("el rollback solo se ejecuta mientras el lock siga retenido", () => {
    assert.match(transaction, /lockState && lockState\.releasedForDrive\) \|\| \(lock && !lock\.hasLock\(\)/);
    assert.match(transaction, /sheet\.deleteRow\(lastRowBefore \+ 1\)/);
    assert.match(transaction, /idempotencySheet\.getRange\(opRowIndex, 1, 1, opRowValues\.length\)\.setValues\(\[opRowValues\]\)/);
});

test("el opId pending se registra antes de Drive y completed después de persistir", () => {
    const pending = unsafe.indexOf('recordOpId(opId, newId, 1, formattedDate, "pending"');
    const driveCall = unsafe.indexOf("runWriteDriveWorkOutsideScriptLock_(", pending);
    const completed = unsafe.lastIndexOf('recordOpId(opId, newId, 1, formattedDate, "completed"');
    assert.ok(pending >= 0 && driveCall > pending && completed > driveCall);
    assert.match(unsafe, /no se reutiliza si falla la fila/i);
});

test("Drive se ejecuta sin lock y luego readquiere fail-fast", () => {
    let held = true;
    const order = [];
    const state = { releasedForDrive: false };
    const fn = new Function(drive + "\nreturn runWriteDriveWorkOutsideScriptLock_;")();
    const result = fn({
        hasLock() { return held; },
        releaseLock() { order.push("release"); held = false; },
        tryLock(timeout) { assert.equal(timeout, 0); order.push("reacquire"); held = true; return true; }
    }, state, "OP-1", () => { order.push("drive"); assert.equal(held, false); return "uploaded"; });
    assert.equal(result, "uploaded");
    assert.deepEqual(order, ["release", "drive", "reacquire"]);
    assert.equal(state.releasedForDrive, true);
});

test("si no readquiere el lock conserva pending y devuelve WRITE_LOCK_REACQUIRE_PENDING", () => {
    let held = true;
    const state = { releasedForDrive: false };
    const fn = new Function(drive + "\nreturn runWriteDriveWorkOutsideScriptLock_;")();
    assert.throws(() => fn({
        hasLock() { return held; },
        releaseLock() { held = false; },
        tryLock(timeout) { assert.equal(timeout, 0); return false; }
    }, state, "OP-2", () => "uploaded"), error => error && error.code === "WRITE_LOCK_REACQUIRE_PENDING");
    assert.equal(state.releasedForDrive, true);
});

test("una fila pending solo se elimina si sigue siendo la última y está vacía", () => {
    const fn = new Function("Logger", removePending + "\nreturn removeEmptyPendingCutRow;")({ log() {} });
    let deleted = 0;
    const blankSheet = { getLastRow: () => 8, getRange: () => ({ getValues: () => [["", null]] }), deleteRow: () => { deleted++; } };
    assert.equal(fn(blankSheet, 8, 3), true);
    assert.equal(deleted, 1);
    assert.equal(fn({ ...blankSheet, getLastRow: () => 9 }, 8, 3), false);
    assert.equal(fn({ ...blankSheet, getRange: () => ({ getValues: () => [["data", ""]] }) }, 8, 3), false);
});

test("Idempotencia conserva appendRow y read-back focalizado", () => {
    assert.match(record, /sheet\.appendRow\(\[cleanOpId, cleanVehicleId, cleanSlotIndex, cleanTimestamp, targetStatus, cleanOperationHash\]\)/);
    assert.match(record, /readIdempotenciaEntryByOpId_\(sheet, cleanOpId\)/);
    assert.match(record, /verified\.operationHash !== cleanOperationHash/);
});

console.log("WritePhysicalTransactionContract: " + passed + "/" + passed + " PASS");
