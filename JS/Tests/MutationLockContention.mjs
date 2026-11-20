import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const write = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");

function extract(source, name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const end = source.indexOf("\nfunction ", start + 10);
    return source.slice(start, end > start ? end : source.length);
}
function makeLock() {
    return {
        held: false, waits: [],
        waitLock(ms) {
            this.waits.push(ms);
            if (this.held) throw new Error("lock ocupado");
            this.held = true;
        },
        tryLock() { throw new Error("No debe usarse tryLock(0) en estas rutas"); },
        releaseLock() { assert.equal(this.held, true); this.held = false; },
        hasLock() { return this.held; }
    };
}
const writeEntry = extract(write, "handleAddOrUpdateCut");
const writeAllocate = extract(write, "handleAllocateVehicleId");
const writeDrive = extract(write, "runWriteDriveWorkOutsideScriptLock_");
const adminEntry = extract(admin, "handleAddOrUpdateCut");
const adminUpload = extract(admin, "handleUploadAdminImage");
const adminField = extract(admin, "handleUpdateVehicleField");
const adminDrive = extract(admin, "runAdminDriveWorkOutsideScriptLock_");

assert.match(writeEntry, /lock\.waitLock\(2000\)/);
assert.doesNotMatch(writeEntry, /tryLock\(0\)/);
assert.match(writeAllocate, /lock\.waitLock\(2000\)/);
assert.match(writeDrive, /lock\.waitLock\(2000\)/);
assert.match(adminEntry, /lock\.waitLock\(2000\)/);
assert.match(adminUpload, /lock\.waitLock\(2000\)/);
assert.match(adminField, /lock\.waitLock\(2000\)/);
assert.match(adminDrive, /lock\.waitLock\(2000\)/);
assert.match(extract(write, "handleAddSupplementaryInfo"), /lock\.waitLock\(5000\)/);

const writeHelper = new Function(writeDrive + "\nreturn runWriteDriveWorkOutsideScriptLock_;")();
const adminHelper = new Function(adminDrive + "\nreturn runAdminDriveWorkOutsideScriptLock_;")();

{
    const lock = makeLock(), state = { releasedForDrive: false }, sequence = [];
    lock.waitLock(2000);
    const value = writeHelper(lock, state, "OP-WRITE-1", () => {
        assert.equal(lock.held, false, "Drive debe ejecutarse fuera del lock");
        lock.waitLock(2000);
        sequence.push("otra-escritura-durante-drive");
        lock.releaseLock();
        return "ok";
    });
    assert.equal(value, "ok");
    assert.deepEqual(sequence, ["otra-escritura-durante-drive"]);
    assert.equal(state.releasedForDrive, true);
    assert.equal(lock.held, true, "La operación original debe readquirir el lock antes de confirmar Sheets");
    assert.deepEqual(lock.waits, [2000, 2000, 2000]);
    lock.releaseLock();
}
{
    const lock = makeLock(), sequence = [];
    lock.waitLock(2000);
    const value = adminHelper(lock, "OP-ADMIN-1", () => {
        assert.equal(lock.held, false, "Drive ADMIN debe ejecutarse fuera del lock");
        lock.waitLock(2000);
        sequence.push("otra-edicion-durante-drive");
        lock.releaseLock();
        return 9;
    }, result => result);
    assert.equal(value, 9);
    assert.deepEqual(sequence, ["otra-edicion-durante-drive"]);
    assert.equal(lock.held, true, "ADMIN debe readquirir el lock antes de revalidar");
    lock.releaseLock();
}
console.log("MutationLockContention: 10/10 PASS — contención breve tolerada y Drive concurrente fuera del lock");
