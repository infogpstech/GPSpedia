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
const locked = extract("handleAddOrUpdateCutLocked");
const unsafe = extract("handleAddOrUpdateCutLockedUnsafe_");

let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }

test("las altas modernas reservan el ID append-only antes de adquirir el lock físico", () => {
    const reservation = entry.indexOf("reserveCortesVehicleIdForOperation_(");
    const lock = entry.indexOf("lock.tryLock(0)");
    assert.ok(reservation >= 0 && lock > reservation);
    assert.match(entry, /if \(validated\.opId\)/);
    assert.match(entry, /preparedRequest\.preallocatedVehicleId/);
});

test("el ID preasignado se transporta hasta la transacción física", () => {
    assert.match(locked, /preparedRequest\.preallocatedVehicleId/);
    assert.match(unsafe, /preallocatedVehicleId\)\s*\{/);
    assert.match(unsafe, /Number\.isSafeInteger\(preallocatedVehicleId\) && preallocatedVehicleId > 0/);
    assert.match(unsafe, /newId = preallocatedVehicleId/);
});

test("el ledger de reserva no se vuelve a consultar dentro del lock para solicitudes modernas", () => {
    const modern = unsafe.indexOf("if (Number.isSafeInteger(preallocatedVehicleId)");
    const legacy = unsafe.indexOf("newId = reserveCortesVehicleIdForOperation_(sheet, reservationRequest)");
    assert.ok(modern >= 0 && legacy > modern);
    assert.match(unsafe.slice(modern, legacy), /newId = preallocatedVehicleId/);
    assert.match(unsafe.slice(modern, legacy), /Compatibilidad legacy/);
});

test("se conserva el lock fail-fast para fila física e Idempotencia", () => {
    assert.match(entry, /LockService\.getScriptLock\(\)/);
    assert.match(entry, /lock\.tryLock\(0\)/);
    assert.doesNotMatch(entry, /waitLock\(/);
    assert.match(locked, /recordOpId|handleAddOrUpdateCutLockedUnsafe_/);
});

console.log("WriteVehicleIdReservationOutsidePhysicalLock: " + passed + "/" + passed + " PASS");
