import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = source.indexOf("function requestNextVehicleIdFromWriteService(");
const end = source.indexOf("\nfunction requestCortesIdFreezeFromWriteService", start);
assert.ok(start >= 0 && end > start, "No se encontró requestNextVehicleIdFromWriteService");
const helper = source.slice(start, end), calls = [];
const request = new Function("callWriteServiceAction", helper + "\nreturn requestNextVehicleIdFromWriteService;")(
    (action, payload) => { calls.push({ action, payload }); return { status: "success", vehicleId: 42 }; }
);
const hash = "a".repeat(64);
assert.equal(request({ userId: "user-1", sessionToken: "session-1" }, "OP-RETRY-1", hash), 42);
assert.deepEqual(calls[0], {
    action: "allocateVehicleId",
    payload: { userId: "user-1", sessionToken: "session-1", opId: "OP-RETRY-1", operationHash: hash }
});
request({ userId: "user-2", sessionToken: "session-2" });
assert.deepEqual(calls[1], {
    action: "allocateVehicleId",
    payload: { userId: "user-2", sessionToken: "session-2" }
});
const invalid = new Function("callWriteServiceAction", helper + "\nreturn requestNextVehicleIdFromWriteService;")(
    () => ({ status: "success", vehicleId: "not-an-id" })
);
assert.throws(() => invalid({}, "OP-RETRY-2", hash), /ID de vehículo inválido/);
console.log("AdminVehicleIdAllocationIdempotency: 3/3 PASS — ADMIN transmite opId/operationHash y conserva compatibilidad legacy");
