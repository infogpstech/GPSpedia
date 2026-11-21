import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
function block(name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const next = source.indexOf("\nfunction ", start + 1);
    return source.slice(start, next < 0 ? source.length : next);
}

const append = block("handleAppendExistingVehicleCut_");
const recovery = block("handleCheckOperation");
const slot = block("getVehicleContributionCutSlotIndex_");
const conflict = block("findVehicleContributionVinConflict_");
const read = block("readVehicleContributionLedgerRows_");

assert.equal((append.match(/readVehicleContributionLedgerRows_\(/g) || []).length, 1,
    "El append debe leer una sola vez el ledger para calcular slot y conflicto VIN posteriores.");
assert.match(append, /getVehicleContributionCutSlotIndex_\(spreadsheet, snapshot, event\.eventId, postAppendLedgerRows\)/);
assert.match(append, /findVehicleContributionVinConflict_\(spreadsheet, acceptedVinPrefix, vehicleId, postAppendLedgerRows\)/);
assert.equal((recovery.match(/readVehicleContributionLedgerRows_\(/g) || []).length, 1,
    "La recuperación debe reutilizar una sola lectura para slot y conflicto VIN.");
assert.match(recovery, /getVehicleContributionCutSlotIndex_\(spreadsheet, snapshot, String\(values\[0\] \|\| ""\), postAppendLedgerRows\)/);
assert.match(recovery, /findVehicleContributionVinConflict_\(spreadsheet, vinPrefix, eventVehicleId, postAppendLedgerRows\)/);
assert.match(slot, /Array\.isArray\(rowsSnapshot\) \? rowsSnapshot : readVehicleContributionLedgerRows_\(ledger\)/);
assert.match(conflict, /Array\.isArray\(rowsSnapshot\) \? rowsSnapshot : readVehicleContributionLedgerRows_\(sheet\)/);

const helpers = read + "\n" + slot + "\n" + conflict;
const sheet = {
    getLastRow() { throw new Error("No debe consultar metadata con snapshot compartido"); },
    getRange() { throw new Error("No debe releer el ledger con snapshot compartido"); }
};
const COLS_CORTES = { id: 1, tipoCorte1: 12, ubicacionCorte1: 13, imgCorte1: 16,
    tipoCorte2: 19, ubicacionCorte2: 20, imgCorte2: 23,
    tipoCorte3: 26, ubicacionCorte3: 27, imgCorte3: 30 };
const WRITE_VEHICLE_CONTRIBUTIONS_HEADERS_ = Array(11).fill("");
const runtime = new Function("getVehicleContributionLedgerSheet_", "WRITE_VEHICLE_CONTRIBUTIONS_HEADERS_",
    "COLS_CORTES", helpers + "\nreturn { readVehicleContributionLedgerRows_, getVehicleContributionCutSlotIndex_, findVehicleContributionVinConflict_ };"
)(() => sheet, WRITE_VEHICLE_CONTRIBUTIONS_HEADERS_, COLS_CORTES);

const rows = [[
    "EV-NEW", "OP-NEW", "101", "a".repeat(64), "cut",
    JSON.stringify({ vinPrefix: "1HGCM82633A" }), "U1", "Tester", "2026-11-21", "accepted", ""
], [
    "EV-OTHER", "OP-OTHER", "202", "b".repeat(64), "cut",
    JSON.stringify({ vinPrefix: "1HGCM82633A" }), "U2", "Tester", "2026-11-21", "accepted", ""
]];
const base = Array(48).fill("");
base[11] = "Ignición";
const snapshot = { vehicle: { id: "101" }, rowValues: base };
assert.equal(runtime.getVehicleContributionCutSlotIndex_(null, snapshot, "EV-NEW", rows), 2);
assert.equal(runtime.findVehicleContributionVinConflict_(null, "1HGCM82633A", "101", rows).vehicleId, "202");

let rangeReads = 0;
const sourceSheet = {
    getLastRow: () => 3,
    getRange(row, col, count, width) {
        rangeReads++;
        assert.deepEqual([row, col, count, width], [2, 1, 2, 11]);
        return { getValues: () => rows };
    }
};
const readRuntime = new Function("getVehicleContributionLedgerSheet_", "WRITE_VEHICLE_CONTRIBUTIONS_HEADERS_",
    read + "\nreturn readVehicleContributionLedgerRows_;"
)(() => sourceSheet, WRITE_VEHICLE_CONTRIBUTIONS_HEADERS_);
assert.deepEqual(readRuntime(sourceSheet), rows);
assert.equal(rangeReads, 1);

console.log("WriteContributionPostAppendSnapshot: 10/10 PASS — slot y conflicto VIN comparten una lectura del ledger");
