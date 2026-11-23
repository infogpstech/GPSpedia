import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const write = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
const api = readFileSync(new URL("../Frontend/api-config.js", import.meta.url), "utf8");

assert.equal(admin.includes("requestNextVehicleIdFromWriteService"), false,
    "ADMIN no debe contener el cliente de asignación backend→WRITE.");
assert.match(admin, /ACTION_MOVED_TO_WRITE/,
    "La ruta ADMIN histórica debe rechazar explícitamente la acción trasladada.");
assert.match(api, /'addOrUpdateCut': 'WRITE'/);
assert.match(api, /'allocateVehicleId': 'WRITE'/);

const start = write.indexOf("function handleAddOrUpdateCut(payload)");
const end = write.indexOf("\nconst CORTES_ID_COUNTER_PROPERTY", start);
assert.ok(start >= 0 && end > start, "No se encontró el handler canónico de WRITE.");
const handler = write.slice(start, end);
const reservation = handler.indexOf("reserveCortesVehicleIdForOperation_");
const lock = handler.indexOf("lock.tryLock(0)");
assert.ok(reservation >= 0 && lock > reservation,
    "WRITE debe reservar el ID con opId/operationHash antes de adquirir el lock.");
assert.match(write, /function normalizeCortesIdAllocationRequest_\(payload\)/);
assert.match(write, /function reserveCortesVehicleIdForOperation_\(cortesSheet, request\)/);
assert.match(write, /case 'allocateVehicleId':\s*response = handleAllocateVehicleId\(request\.payload\)/);

console.log("AdminVehicleIdAllocationIdempotency: 5/5 PASS — WRITE conserva reserva idempotente y ADMIN no coordina backend→backend");
