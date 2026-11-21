import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
function section(startMarker, endMarker) {
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker, start + startMarker.length);
    assert.ok(start >= 0 && end > start, "No se encontró " + startMarker);
    return source.slice(start, end);
}

const handler = section("function handleAllocateVehicleId(payload)", "\nfunction assertDeveloperForIdMaintenance");
assert.doesNotMatch(handler, /LockService|tryLock|waitLock|releaseLock/,
    "El endpoint central de asignación no debe adquirir ni liberar locks");
assert.match(handler, /assertDeveloperForIdMaintenance\(payload\)/,
    "La autorización de Desarrollador debe mantenerse antes de reservar");
assert.match(handler, /reserveCortesVehicleIdForOperation_\(sheet, request\)/,
    "El endpoint debe usar el ledger append-only");

const allocator = section("function reserveCortesVehicleIdForOperation_(", "\nfunction handleAllocateVehicleId");
assert.doesNotMatch(allocator, /LockService|tryLock|waitLock|releaseLock/,
    "La reserva secuencial debe resolverse sin ScriptLock");
assert.match(allocator, /appendRow\(/, "La reserva debe anexarse al ledger");
assert.match(allocator, /SpreadsheetApp\.flush\(\)/, "La reserva debe esperar la persistencia antes del read-back");
assert.match(allocator, /findCortesIdReservation_\(ledger, request\.opId\)/,
    "La respuesta debe recuperarse por opId y verificar su huella");

const sequenceFormula = section("function buildCortesIdReservationFormula_(", "\nfunction reserveCortesVehicleIdForOperation_");
assert.match(sequenceFormula, /ROW\(\)/, "La secuencia debe derivarse de la posición física de cada append");
assert.match(sequenceFormula, /INDEX\(/, "La fórmula debe limitarse a las reservas anteriores");

const testigo = section("function ensureTestigoColumns(sheet)", "\nfunction ");
assert.doesNotMatch(testigo, /LockService|tryLock|waitLock|releaseLock/,
    "La inicialización de columnas Testigo no debe adquirir un lock anidado");

const createHandler = section("function handleAddOrUpdateCutLockedUnsafe_(", "\nfunction handleCheckVehicle");
assert.match(createHandler, /reserveCortesVehicleIdForOperation_\(/,
    "Las altas nuevas de WRITE deben reservar el ID mediante el mismo ledger");
assert.doesNotMatch(createHandler, /getNextCortesVehicleIdLocked\(/,
    "No debe quedar el asignador anterior de lectura+contador");

console.log("WriteIdAllocatorNonBlocking: 7/7 PASS — reserva append-only sin ScriptLock, autorización, read-back y Testigo sin lock anidado");
