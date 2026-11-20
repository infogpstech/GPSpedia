import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const write = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");

function extract(source, name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    if (name === "handleUpdateVehicleField") {
        const end = source.indexOf("const ADMIN_IMAGE_UPLOAD_SHEET_NAME", start);
        assert.ok(end > start, "No se encontró el cierre de " + name);
        return source.slice(start, end);
    }
    const end = source.indexOf("\nfunction ", start + 10);
    return source.slice(start, end > start ? end : source.length);
}
function makeLock() {
    return {
        held: false, waits: [],
        waitLock(ms) { this.waits.push(ms); if (this.held) throw new Error("lock ocupado"); this.held = true; },
        tryLock(ms) { assert.equal(ms, 0); if (this.held) return false; this.held = true; return true; },
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
const adminDriveCore = extract(admin, "runAdminDriveWorkOutsideScriptLock_");
const adminDrive = extract(admin, "runAdminContributionDriveWorkOutsideScriptLock_");

assert.match(writeEntry, /lock\.tryLock\(0\)/);
assert.match(extract(write, "getWriteContributionLock_"), /LockService\.getUserLock\(\)/, "Las escrituras de vehículos existentes deben aislarse por usuario");
assert.doesNotMatch(writeEntry, /waitLock\(/);
assert.match(writeAllocate, /lock\.tryLock\(0\)/);
assert.doesNotMatch(writeAllocate, /waitLock\(/);
assert.match(writeDrive, /lock\.tryLock\(0\)/);
assert.match(adminEntry, /lock\.tryLock\(0\)/);
assert.doesNotMatch(adminEntry, /waitLock\(/);
assert.match(adminUpload, /findUniqueAdminVehicleRow_\(sheet, cleanVehicleId\)/,
    "El reemplazo debe rechazar vehículos inexistentes o duplicados antes de subir la imagen.");
assert.match(adminUpload, /uploadImageToDrive\(fileData, canonicalBaseName, folder, operationKey\)/,
    "La carga ADMIN debe reservar y recuperar el archivo mediante la clave idempotente del journal.");
assert.match(adminUpload, /appendAdminVehicleFieldUpdate_\(/,
    "El reemplazo debe anexar la versión de campo, no escribir directamente Cortes.");
assert.doesNotMatch(adminUpload, /LockService\.getScriptLock\(\)|lock\.tryLock\(|lock\.waitLock\(/,
    "El reemplazo append-only no debe depender del ScriptLock global.");
assert.doesNotMatch(adminUpload, /AdminImageUploads|saveAdminImageUploadOperation|activeCell\.setValue/,
    "El reemplazo no debe depender del ledger mutable ni escribir directamente la proyección.");
assert.doesNotMatch(adminField, /LockService\.getScriptLock\(\)|lock\.tryLock\(|lock\.waitLock\(/,
    "La edición in-modal versionada debe anexar eventos sin lock global.");
assert.match(adminField, /appendAdminVehicleFieldUpdate_\(/,
    "La edición de campo debe delegar al journal append-only, no escribir directamente el ledger mutable.");
const adminFieldAppend = extract(admin, "appendAdminVehicleFieldUpdate_");
assert.match(adminFieldAppend, /ledgerSheet\.appendRow\(/,
    "La nueva versión se registra mediante append en AportesVehiculo.");
const adminVin = extract(admin, "handleUpdateVehicleVinCollection_");
assert.match(adminVin, /appendAdminVehicleFieldUpdate_\(/);
assert.doesNotMatch(adminVin, /LockService\.getScriptLock\(\)|lock\.tryLock\(|lock\.waitLock\(/);
assert.match(adminDrive, /runAdminDriveWorkOutsideScriptLock_\(lock, opId, operation, revalidate, operationHash, 0\)/);
assert.match(adminDriveCore, /lock\.tryLock\(0\)/);
assert.doesNotMatch(extract(write, "handleAddSupplementaryInfo"), /tryLock\(|waitLock\(|getWriteContributionLock_\(/, "La información suplementaria no debe retener locks durante la operación");

const writeHelper = new Function(writeDrive + "\nreturn runWriteDriveWorkOutsideScriptLock_;")();
const adminHelper = new Function(adminDriveCore + "\n" + adminDrive + "\nreturn runAdminContributionDriveWorkOutsideScriptLock_;")();

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
    assert.deepEqual(lock.waits, [2000, 2000]);
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
console.log("MutationLockContention: 1/1 PASS — escrituras de aporte sin espera global y Drive concurrente fuera del lock");
