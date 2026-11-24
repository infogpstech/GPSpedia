import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
function extract(name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const end = source.indexOf("\nfunction ", start + 10);
    return source.slice(start, end > start ? end : source.length);
}
const highWater = extract("getCortesVehicleIdHighWaterMark_");
const baseline = extract("ensureCortesIdReservationBaseline_");
const finder = extract("findCortesIdBaseline_");
const ledgerRead = extract("getLastCortesIdReservation_");
const reserve = extract("reserveCortesVehicleIdForOperation_");
const freeze = extract("handleFreezeCortesIds");

let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }

test("la lectura normal del high-water no depende de ScriptProperties", () => {
    assert.doesNotMatch(highWater, /PropertiesService|CORTES_ID_COUNTER_PROPERTY/);
    assert.match(highWater, /maxSheetId/);
    assert.match(highWater, /minimumReservedId/);
});

test("el baseline es determinista, único y acepta cero sin consumir un ID", () => {
    assert.match(source, /CORTES_ID_BASELINE_OP_ID = "OP-BASELINE-CORTES-LAST-ID-V1"/);
    assert.match(source, /CORTES_ID_BASELINE_OPERATION_HASH = "[a-f0-9]{64}"/);
    assert.match(finder, /matches\.length !== 1/);
    assert.match(finder, /Number\.isSafeInteger\(vehicleId\) \|\| vehicleId < 0/);
    assert.match(ledgerRead, /opId === CORTES_ID_BASELINE_OP_ID/);
    assert.match(ledgerRead, /vehicleId < 0/);
});

test("la migración consulta primero el marcador y solo lee la propiedad legacy si falta", () => {
    const markerCheck = baseline.indexOf("findCortesIdBaseline_(ledger)");
    const legacyRead = baseline.indexOf("getProperty(CORTES_ID_COUNTER_PROPERTY)");
    const append = baseline.indexOf("ledger.appendRow(");
    const readBack = baseline.indexOf("findCortesIdBaseline_(ledger)", markerCheck + 1);
    assert.ok(markerCheck >= 0 && legacyRead > markerCheck && append > legacyRead && readBack > append);
    assert.match(baseline, /lock\.tryLock\(0\)/);
    assert.match(baseline, /SpreadsheetApp\.flush\(\)/);
    assert.match(baseline, /verified\.vehicleId !== highWaterMark/);
});

test("la reserva moderna garantiza baseline antes de asignar y mantiene idempotencia", () => {
    assert.ok(reserve.indexOf("ensureCortesIdReservationBaseline_(cortesSheet, ledger)") <
        reserve.indexOf("findCortesIdReservation_(ledger, request.opId)"));
    assert.match(reserve, /existing\.operationHash !== request\.operationHash/);
    assert.match(reserve, /buildCortesIdReservationFormula_\(highWaterMark\)/);
});

test("freeze conserva dry-run y confirma baseline sin reescribir ScriptProperties", () => {
    assert.match(freeze, /if \(!payload \|\| payload\.confirm !== true\)/);
    assert.match(freeze, /ensureCortesIdReservationBaseline_\(sheet\)/);
    assert.doesNotMatch(freeze, /setProperty\(|getProperty\(CORTES_ID_COUNTER_PROPERTY\)/);
});

console.log("WriteCortesIdLedgerBaseline: " + passed + "/" + passed + " PASS");
