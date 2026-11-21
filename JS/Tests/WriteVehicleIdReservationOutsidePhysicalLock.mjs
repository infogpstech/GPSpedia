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


test("si el lock está ocupado, la reserva queda hecha y el mismo opId recupera el ID al reintentar", () => {
    let lockAvailable = false, held = false, reserved = new Map();
    const order = [];
    const wrapper = extract("handleAddOrUpdateCut");
    const api = new Function(
        "prepareAddOrUpdateCutRequest_", "reserveCortesVehicleIdForOperation_", "LockService",
        "handleAddOrUpdateCutLocked", "handleAppendExistingVehicleCut_",
        "nextWriteCatalogVersionLocked_", "Logger",
        wrapper + "\\nreturn handleAddOrUpdateCut;"
    )(
        () => ({ sheet: {}, validatedPayload: { opId: "OP-PRELOCK-1", operationHash: "a".repeat(64) } }),
        (sheet, request) => {
            order.push("reserve");
            if (!reserved.has(request.opId)) reserved.set(request.opId, 77);
            return reserved.get(request.opId);
        },
        { getScriptLock: () => ({
            tryLock(timeout) { assert.equal(timeout, 0); order.push("lock"); held = lockAvailable; return held; },
            hasLock() { return held; },
            releaseLock() { held = false; }
        }) },
        prepared => {
            order.push("physical");
            assert.equal(prepared.preallocatedVehicleId, 77);
            return { status: "success", vehicleId: 77 };
        },
        () => { throw new Error("La ruta existente no debe ejecutarse."); },
        () => 9,
        { log() {} }
    );
    assert.throws(() => api({}), error => error && error.code === "WRITE_BUSY");
    assert.deepEqual(order, ["reserve", "lock"]);
    lockAvailable = true;
    order.length = 0;
    const result = api({});
    assert.deepEqual(order, ["reserve", "lock", "physical"]);
    assert.equal(result.vehicleId, 77);
    assert.equal(result.catalogVersion, 9);
    assert.equal(held, false, "La sección crítica debe liberar el lock");
});

console.log("WriteVehicleIdReservationOutsidePhysicalLock: " + passed + "/" + passed + " PASS");
