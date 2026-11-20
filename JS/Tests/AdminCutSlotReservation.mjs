import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = source.indexOf("function findNextAvailableCutSlot_(");
const end = source.indexOf("\nfunction ", start + 10);
assert.ok(start >= 0 && end > start, "No se encontró findNextAvailableCutSlot_");
const helper = source.slice(start, end);
const fn = new Function(
    "COLS_CORTES", "readIdempotenciaEntries_", "getIdempotenciaSheet",
    helper + "\nreturn findNextAvailableCutSlot_;"
);
const columns = { tipoCorte1: 2, tipoCorte2: 3, tipoCorte3: 4 };
const entries = [
    { vehicleId: "42", slotIndex: 1, status: "pending" },
    { vehicleId: "42", slotIndex: 2, status: "completed" },
    { vehicleId: "77", slotIndex: 3, status: "pending" }
];
const getEntries = () => ({ entries });
const getSheet = () => ({ name: "Idempotencia" });
const find = fn(columns, getEntries, getSheet);

assert.equal(find(["42", "", "", ""], "42"), 2,
    "Un slot pending debe reservarse aunque la celda todavía esté vacía");
assert.equal(find(["42", "", "", ""], "77"), 1,
    "La reserva de otro vehículo no debe bloquear este vehículo");
assert.equal(find(["42", "ocupado", "ocupado", ""], "42"), 3,
    "Los slots ocupados y reservados deben excluirse");
assert.equal(find(["42", "ocupado", "ocupado", "ocupado"], "42"), null,
    "No debe asignarse un slot cuando todos están ocupados o reservados");
assert.equal(find(["42", "", "", ""], null), 1,
    "La consulta sin vehicleId conserva el comportamiento compatible");
console.log("AdminCutSlotReservation: 5/5 PASS — slots pending reservados por vehículo sin interferencia entre vehículos");
