import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
const start = source.indexOf("const CORTES_ID_COUNTER_PROPERTY =");
const end = source.indexOf("\nfunction assertDeveloperForIdMaintenance", start);
assert.ok(start >= 0 && end > start, "No se encontró el bloque del asignador central");
const code = source.slice(start, end);
const HASH_A = "a".repeat(64), HASH_B = "b".repeat(64);
function createSheet(initialRows, formulasByRow = {}) {
    const rows = initialRows.map(row => row.slice());
    return {
        rows, getLastRow: () => rows.length, getLastColumn: () => Math.max(1, ...rows.map(row => row.length)),
        getRange(row, column, numRows = 1, numColumns = 1) {
            return {
                getValues: () => Array.from({ length: numRows }, (_, r) => Array.from({ length: numColumns }, (_, c) => {
                    const current = rows[row - 1 + r] || [];
                    return current[column - 1 + c] === undefined ? "" : current[column - 1 + c];
                })),
                getValue: () => (rows[row - 1] || [])[column - 1] ?? "",
                getFormulas: () => Array.from({ length: numRows }, (_, r) => Array.from({ length: numColumns }, (_, c) => (formulasByRow[row - 1 + r] || [])[column - 1 + c] || "")),
                setValues(values) { values.forEach((valuesRow, r) => { while (rows.length < row + r) rows.push([]); valuesRow.forEach((value, c) => { rows[row - 1 + r][column - 1 + c] = value; }); }); },
                createTextFinder(searchText) {
                    let exact = false;
                    return { matchEntireCell(value) { exact = value === true; return this; }, findAll() {
                        const matches = [];
                        for (let r = row - 1; r < row - 1 + numRows; r++) {
                            const value = String((rows[r] || [])[column - 1] ?? "");
                            if (exact ? value === searchText : value.includes(searchText)) matches.push({ getRow: () => r + 1 });
                        }
                        return matches;
                    }};
                }
            };
        },
        appendRow(values) { rows.push(values.slice()); }
    };
}
function harness(options = {}) {
    const cortes = createSheet([["id", "marca", "modelo"], [1, "Toyota", "Hilux"], [2, "Toyota", "RAV4"], [3, "Honda", "Civic"]]);
    let ledger = null;
    const properties = {
        value: options.counter === undefined ? "3" : String(options.counter), sets: [], failNextSet: options.failNextSet === true,
        getProperty() { return this.value; },
        setProperty(key, value) { this.sets.push([key, value]); if (this.failNextSet) { this.failNextSet = false; throw new Error("counter write failed"); } this.value = String(value); }
    };
    const ss = {
        getSheetByName(name) { if (name === "Cortes") return cortes; if (name === "CortesIdReservations") return ledger; return null; },
        insertSheet(name) { assert.equal(name, "CortesIdReservations"); ledger = createSheet([["opId", "operationHash", "vehicleId", "createdAt"]]); return ledger; }
    };
    let busy = options.busy === true, held = false;
    const lock = { tryLock(wait) { assert.equal(wait, 0); if (busy) return false; held = true; return true; }, releaseLock() { assert.equal(held, true); held = false; } };
    const run = new Function("COLS_CORTES", "SHEET_NAMES", "PropertiesService", "LockService", "SpreadsheetApp", "getSpreadsheet", "assertDeveloperForIdMaintenance",
        code + "\nreturn handleAllocateVehicleId;")(
        { id: 1 }, { CORTES: "Cortes" }, { getScriptProperties: () => properties }, { getScriptLock: () => lock },
        { flush() {} }, () => ss, () => ({ role: "desarrollador" })
    );
    return { allocate: payload => run(payload || {}), properties, get ledger() { return ledger; } };
}
let passed = 0; function test(name, fn) { fn(); passed++; }
test("reserva el ID una vez y el reintento idéntico devuelve el mismo ID", () => {
    const h = harness();
    assert.equal(h.allocate({ opId: "OP-RETRY-1", operationHash: HASH_A }).vehicleId, 4);
    assert.equal(h.allocate({ opId: "OP-RETRY-1", operationHash: HASH_A }).vehicleId, 4);
    assert.equal(h.ledger.rows.length, 2); assert.equal(h.properties.value, "4");
});
test("rechaza reutilizar opId con otra huella sin consumir otro ID", () => {
    const h = harness();
    assert.equal(h.allocate({ opId: "OP-RETRY-2", operationHash: HASH_A }).vehicleId, 4);
    assert.throws(() => h.allocate({ opId: "OP-RETRY-2", operationHash: HASH_B }), /otro contenido/);
    assert.equal(h.ledger.rows.length, 2); assert.equal(h.properties.value, "4");
});
test("operaciones distintas reciben IDs monotónicos", () => {
    const h = harness();
    assert.equal(h.allocate({ opId: "OP-A", operationHash: HASH_A }).vehicleId, 4);
    assert.equal(h.allocate({ opId: "OP-B", operationHash: HASH_B }).vehicleId, 5);
    assert.equal(h.properties.value, "5");
});
test("si falla guardar el contador, el ledger conserva el ID para el reintento", () => {
    const h = harness({ failNextSet: true });
    assert.throws(() => h.allocate({ opId: "OP-RECOVER", operationHash: HASH_A }), /counter write failed/);
    assert.equal(h.ledger.rows[1][2], 4);
    assert.equal(h.allocate({ opId: "OP-RECOVER", operationHash: HASH_A }).vehicleId, 4);
    assert.equal(h.allocate({ opId: "OP-NEXT", operationHash: HASH_B }).vehicleId, 5);
});
test("una reserva persistida evita reutilizar el ID en asignaciones legacy si falla el contador", () => {
    const h = harness({ failNextSet: true });
    assert.throws(() => h.allocate({ opId: "OP-COUNTER-FAIL", operationHash: HASH_A }), /counter write failed/);
    assert.equal(h.allocate({}).vehicleId, 5);
    assert.equal(h.ledger.rows[1][2], 4);
});
test("el contador conserva IDs consumidos por asignaciones legacy", () => {
    const h = harness();
    assert.equal(h.allocate({}).vehicleId, 4);
    assert.equal(h.allocate({ opId: "OP-AFTER-LEGACY", operationHash: HASH_A }).vehicleId, 5);
    assert.equal(h.ledger.rows.length, 2);
});
test("rechaza opId sin huella SHA-256 válida antes de crear reservas", () => {
    const h = harness();
    assert.throws(() => h.allocate({ opId: "OP-BAD", operationHash: "bad" }), /operationHash SHA-256/);
    assert.equal(h.ledger, null); assert.equal(h.properties.value, "3");
});
test("conserva respuesta WRITE_BUSY sin esperar por el lock", () => {
    const h = harness({ busy: true });
    assert.throws(() => h.allocate({ opId: "OP-BUSY", operationHash: HASH_A }), error => error.code === "WRITE_BUSY");
    assert.equal(h.ledger, null);
});
test("rechaza encabezados incompatibles en el ledger existente", () => {
    const h = harness();
    h.allocate({ opId: "OP-HEADER", operationHash: HASH_A });
    h.ledger.rows[0][0] = "incorrecto";
    assert.throws(() => h.allocate({ opId: "OP-OTHER", operationHash: HASH_B }), /encabezados incompatibles/);
});
console.log("WriteVehicleIdAllocationIdempotency: " + passed + "/" + passed + " PASS — reserva persistente, reintentos, huella, contador y compatibilidad legacy");
