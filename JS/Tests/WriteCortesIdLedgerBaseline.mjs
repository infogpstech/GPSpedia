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
    const readBack = baseline.indexOf("findCortesIdBaseline_(ledger)", append + 1);
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
    assert.ok(freeze.includes("ensureCortesIdReservationBaseline_(sheet, null, { lockAlreadyHeld: true }"));
    assert.doesNotMatch(freeze, /setProperty\(|getProperty\(CORTES_ID_COUNTER_PROPERTY\)/);
});


function createBaselineHarness({ highWater = 0, legacy = null, lockAvailable = true, dropAppend = false, initialRows = null } = {}) {
    const rows = initialRows ? initialRows.map(row => row.slice()) : [["opId", "operationHash", "vehicleId", "createdAt"]];
    const ledger = {
        rows,
        getLastRow: () => rows.length,
        getRange(row, column, numRows = 1, numColumns = 1) {
            return {
                getValues: () => Array.from({ length: numRows }, (_, r) =>
                    Array.from({ length: numColumns }, (_, c) => (rows[row - 1 + r] || [])[column - 1 + c] ?? "")),
                createTextFinder(value) {
                    let exact = false;
                    return {
                        matchEntireCell(flag) { exact = flag === true; return this; },
                        findAll() {
                            const found = [];
                            for (let r = row - 1; r < row - 1 + numRows; r++) {
                                const cell = String((rows[r] || [])[column - 1] ?? "");
                                if (exact ? cell === value : cell.includes(value)) found.push({ getRow: () => r + 1 });
                            }
                            return found;
                        }
                    };
                }
            };
        },
        appendRow(values) { if (!dropAppend) rows.push(values.slice()); return ledger; }
    };
    let held = false, lockAttempts = 0, propertyReads = 0, flushes = 0;
    const lock = {
        tryLock(timeout) { assert.equal(timeout, 0); lockAttempts++; if (!lockAvailable || held) return false; held = true; return true; },
        hasLock() { return held; },
        releaseLock() { held = false; }
    };
    const ensure = new Function(
        "CORTES_ID_BASELINE_OP_ID", "CORTES_ID_BASELINE_OPERATION_HASH",
        "CORTES_ID_RESERVATIONS_HEADERS", "CORTES_ID_COUNTER_PROPERTY",
        "LockService", "PropertiesService", "SpreadsheetApp",
        "getCortesVehicleIdHighWaterMark_", "freezeCortesIdReservationFormulaRows_",
        finder + "\\n" + ledgerRead + "\\n" + baseline + "\\nreturn ensureCortesIdReservationBaseline_;"
    )(
        "OP-BASELINE-CORTES-LAST-ID-V1",
        "71e6dae8fc9c7cb8ac468ac7be5f4044a2db6166baf0794c0d962dc859d8576c",
        ["opId", "operationHash", "vehicleId", "createdAt"],
        "GPSpedia_CORTES_LAST_ID",
        { getScriptLock: () => lock },
        { getScriptProperties: () => ({ getProperty: () => { propertyReads++; return legacy; } }) },
        { flush: () => { flushes++; } },
        (sheet, options) => Math.max(highWater, Number(options.minimumReservedId || 0)),
        () => {}
    );
    return {
        ledger, ensure: sheet => ensure(sheet || {}, ledger),
        stats: () => ({ held, lockAttempts, propertyReads, flushes })
    };
}

test("siembra el máximo entre hoja, ledger y propiedad heredada, y verifica read-back", () => {
    const h = createBaselineHarness({
        highWater: 7, legacy: "10",
        initialRows: [
            ["opId", "operationHash", "vehicleId", "createdAt"],
            ["OP-OLD-1", "a".repeat(64), 8, "old"]
        ]
    });
    const result = h.ensure();
    assert.equal(result.baseline.vehicleId, 10);
    assert.equal(result.highWaterMark, 10);
    assert.equal(h.ledger.rows.length, 3);
    assert.equal(h.stats().propertyReads, 1);
    assert.equal(h.stats().flushes, 1);
    assert.equal(h.stats().held, false);
});

test("un baseline en cero no consume un ID y también queda marcado", () => {
    const h = createBaselineHarness({ highWater: 0, legacy: null });
    const result = h.ensure();
    assert.equal(result.baseline.vehicleId, 0);
    assert.equal(result.highWaterMark, 0);
    assert.equal(h.ledger.rows.length, 2);
});

test("el reintento encuentra el baseline y no vuelve a leer la propiedad legacy", () => {
    const h = createBaselineHarness({ highWater: 5, legacy: "9" });
    const first = h.ensure(), second = h.ensure();
    assert.equal(first.baseline.vehicleId, 9);
    assert.equal(second.baseline.vehicleId, 9);
    assert.equal(h.ledger.rows.length, 2);
    assert.equal(h.stats().propertyReads, 1);
    assert.equal(h.stats().lockAttempts, 1);
});

test("una propiedad legacy inválida falla cerrado y libera el lock", () => {
    const h = createBaselineHarness({ highWater: 5, legacy: "NaN" });
    assert.throws(() => h.ensure(), /contador histórico de IDs.*inválido/);
    assert.equal(h.ledger.rows.length, 1);
    assert.equal(h.stats().held, false);
});

test("si el lock de inicialización está ocupado, falla rápido sin leer ni anexar", () => {
    const h = createBaselineHarness({ highWater: 5, legacy: "9", lockAvailable: false });
    assert.throws(() => h.ensure(), error => error && error.code === "WRITE_BUSY");
    assert.equal(h.ledger.rows.length, 1);
    assert.equal(h.stats().propertyReads, 0);
    assert.equal(h.stats().held, false);
});

test("un append que no persiste no se acepta como baseline", () => {
    const h = createBaselineHarness({ highWater: 5, legacy: "9", dropAppend: true });
    assert.throws(() => h.ensure(), /No se pudo verificar el baseline histórico/);
    assert.equal(h.ledger.rows.length, 1);
    assert.equal(h.stats().held, false);
});

test("un baseline duplicado se rechaza antes de reservar", () => {
    const marker = ["OP-BASELINE-CORTES-LAST-ID-V1", "71e6dae8fc9c7cb8ac468ac7be5f4044a2db6166baf0794c0d962dc859d8576c", 5, "baseline"];
    const h = createBaselineHarness({ initialRows: [
        ["opId", "operationHash", "vehicleId", "createdAt"], marker, marker
    ]});
    assert.throws(() => h.ensure(), /más de un baseline/);
    assert.equal(h.stats().propertyReads, 0);
});

console.log("WriteCortesIdLedgerBaseline: " + passed + "/" + passed + " PASS");
