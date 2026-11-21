import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
const start = source.indexOf("const CORTES_ID_COUNTER_PROPERTY =");
const end = source.indexOf("\nfunction assertDeveloperForIdMaintenance", start);
assert.ok(start >= 0 && end > start, "No se encontró el bloque del asignador central");
const code = source.slice(start, end);
const HASH_A = "a".repeat(64), HASH_B = "b".repeat(64);

function createSheet(initialRows, options = {}) {
    const rows = initialRows.map(row => row.slice());
    const formulas = new Map();
    const sheet = {
        rows,
        getLastRow: () => rows.length,
        getLastColumn: () => Math.max(1, ...rows.map(row => row.length)),
        getRange(row, column, numRows = 1, numColumns = 1) {
            return {
                getValues: () => Array.from({ length: numRows }, (_, r) =>
                    Array.from({ length: numColumns }, (_, c) => (rows[row - 1 + r] || [])[column - 1 + c] ?? "")),
                getValue: () => (rows[row - 1] || [])[column - 1] ?? "",
                getFormulas: () => Array.from({ length: numRows }, (_, r) =>
                    Array.from({ length: numColumns }, (_, c) => formulas.get((row - 1 + r) + ":" + (column - 1 + c)) || "")),
                setValue(value) {
                    while (rows.length < row) rows.push([]);
                    rows[row - 1][column - 1] = value;
                    formulas.delete((row - 1) + ":" + (column - 1));
                },
                setValues(values) {
                    values.forEach((line, r) => line.forEach((value, c) => {
                        while (rows.length < row + r) rows.push([]);
                        rows[row - 1 + r][column - 1 + c] = value;
                        formulas.delete((row - 1 + r) + ":" + (column - 1 + c));
                    }));
                },
                createTextFinder(searchText) {
                    let exact = false;
                    return {
                        matchEntireCell(value) { exact = value === true; return this; },
                        findAll() {
                            const matches = [];
                            for (let r = row - 1; r < row - 1 + numRows; r++) {
                                const value = String((rows[r] || [])[column - 1] ?? "");
                                if (exact ? value === searchText : value.includes(searchText)) matches.push({ getRow: () => r + 1 });
                            }
                            return matches;
                        }
                    };
                }
            };
        },
        appendRow(values) {
            const rowIndex = rows.length + 1;
            rows.push(values.slice());
            if (typeof values[2] === "string" && values[2].startsWith("=")) {
                formulas.set((rowIndex - 1) + ":2", values[2]);
            }
            if (options.afterAppend) options.afterAppend(rowIndex);
            return sheet;
        },
        recalculate() {
            for (let rowIndex = 2; rowIndex <= rows.length; rowIndex++) {
                const formula = formulas.get((rowIndex - 1) + ":2");
                if (!formula) continue;
                const match = formula.match(/,\s*(\d+)\)\+1$/);
                assert.ok(match, "La fórmula de reserva no contiene una base numérica verificable");
                const base = Number(match[1]);
                const previous = rows.slice(1, rowIndex - 1).map(row => Number(row[2])).filter(Number.isSafeInteger);
                rows[rowIndex - 1][2] = Math.max(base, ...previous) + 1;
            }
        },
        formulaAt(rowIndex) { return formulas.get((rowIndex - 1) + ":2") || ""; }
    };
    return sheet;
}

function harness(options = {}) {
    const cortes = createSheet([["id", "marca", "modelo"], [1, "Toyota", "Hilux"], [2, "Toyota", "RAV4"], [3, "Honda", "Civic"]]);
    let ledger = null, onFirstCounterRead = options.onFirstCounterRead || null, counterRead = false;
    const properties = {
        value: options.counter === undefined ? "3" : String(options.counter),
        getProperty() {
            if (!counterRead) {
                counterRead = true;
                if (onFirstCounterRead) {
                    const callback = onFirstCounterRead;
                    onFirstCounterRead = null;
                    callback();
                }
            }
            return this.value;
        }
    };
    const ss = {
        getSheetByName(name) { if (name === "Cortes") return cortes; if (name === "CortesIdReservations") return ledger; return null; },
        insertSheet(name) {
            assert.equal(name, "CortesIdReservations");
            if (ledger) throw new Error("Sheet already exists");
            ledger = createSheet([["", "", "", ""]]);
            return ledger;
        }
    };
    const Utilities = {
        getUuid: () => crypto.randomUUID(),
        DigestAlgorithm: { SHA_256: "SHA_256" },
        computeDigest: (algorithm, value) => Array.from(crypto.createHash("sha256").update(String(value)).digest())
    };
    const allocate = new Function(
        "COLS_CORTES", "SHEET_NAMES", "PropertiesService", "LockService", "SpreadsheetApp",
        "Utilities", "getSpreadsheet", "assertDeveloperForIdMaintenance",
        code + "\nreturn handleAllocateVehicleId;"
    )(
        { id: 1 }, { CORTES: "Cortes" },
        { getScriptProperties: () => properties },
        { getScriptLock: () => { throw new Error("El asignador no debe invocar LockService"); } },
        { flush: () => { if (ledger) ledger.recalculate(); } },
        Utilities, () => ss,
        payload => {
            assert.ok(payload && payload.userId === "USR-1", "La autorización debe recibirse antes de reservar");
            return { role: "desarrollador" };
        }
    );
    return { allocate: payload => allocate(Object.assign({ userId: "USR-1" }, payload || {})), properties, cortes, get ledger() { return ledger; } };
}

let passed = 0;
function test(name, fn) { fn(); passed++; }

test("reserva el ID una vez y el reintento idéntico devuelve el mismo ID", () => {
    const h = harness();
    assert.equal(h.allocate({ opId: "OP-RETRY-1", operationHash: HASH_A }).vehicleId, 4);
    assert.equal(h.allocate({ opId: "OP-RETRY-1", operationHash: HASH_A }).vehicleId, 4);
    assert.equal(h.ledger.rows.length, 2);
    assert.equal(h.ledger.formulaAt(2), "", "La reserva confirmada debe quedar congelada como valor");
});
test("rechaza reutilizar opId con otra huella sin consumir otro ID", () => {
    const h = harness();
    assert.equal(h.allocate({ opId: "OP-RETRY-2", operationHash: HASH_A }).vehicleId, 4);
    assert.throws(() => h.allocate({ opId: "OP-RETRY-2", operationHash: HASH_B }), /otra huella|otro contenido/);
    assert.equal(h.ledger.rows.length, 2);
});
test("operaciones distintas reciben IDs monotónicos y únicos", () => {
    const h = harness();
    assert.equal(h.allocate({ opId: "OP-A", operationHash: HASH_A }).vehicleId, 4);
    assert.equal(h.allocate({ opId: "OP-B", operationHash: HASH_B }).vehicleId, 5);
    assert.equal(new Set(h.ledger.rows.slice(1).map(row => row[2])).size, 2);
});
test("dos operaciones intercaladas anexan filas distintas y obtienen IDs consecutivos", () => {
    let secondResult;
    const h = harness({ onFirstCounterRead: () => {
        secondResult = h.allocate({ opId: "OP-CONCURRENT-B", operationHash: HASH_B });
    }});
    const firstResult = h.allocate({ opId: "OP-CONCURRENT-A", operationHash: HASH_A });
    assert.equal(secondResult.vehicleId, 4);
    assert.equal(firstResult.vehicleId, 5);
    assert.deepEqual(h.ledger.rows.slice(1).map(row => row[2]), [4, 5]);
});
test("dos altas simultáneas con el mismo opId y huella convergen a la primera reserva", () => {
    let secondResult;
    const h = harness({ onFirstCounterRead: () => {
        secondResult = h.allocate({ opId: "OP-SAME", operationHash: HASH_A });
    }});
    const firstResult = h.allocate({ opId: "OP-SAME", operationHash: HASH_A });
    assert.equal(secondResult.vehicleId, 4);
    assert.equal(firstResult.vehicleId, 4);
    assert.equal(h.ledger.rows.length, 3);
    assert.deepEqual(h.ledger.rows.slice(1).map(row => row[2]), [4, 5]);
});
test("dos altas simultáneas con huellas distintas conservan first-write-wins", () => {
    let winningResult;
    const h = harness({ onFirstCounterRead: () => {
        winningResult = h.allocate({ opId: "OP-CONFLICT", operationHash: HASH_B });
    }});
    assert.throws(() => h.allocate({ opId: "OP-CONFLICT", operationHash: HASH_A }), /otra huella/);
    assert.equal(winningResult.vehicleId, 4);
    assert.equal(h.ledger.rows.length, 3);
    assert.deepEqual(h.ledger.rows.slice(1).map(row => row[2]), [4, 5]);
});
test("una reserva posterior conserva el máximo de IDs aunque exista una fila duplicada consumida", () => {
    const h = harness();
    h.allocate({ opId: "OP-SAME-1", operationHash: HASH_A });
    h.allocate({ opId: "OP-SAME-1", operationHash: HASH_A });
    assert.equal(h.allocate({ opId: "OP-NEXT", operationHash: HASH_B }).vehicleId, 6);
});
test("una llamada legacy genera una reserva única y mantiene compatibilidad", () => {
    const h = harness();
    assert.equal(h.allocate({}).vehicleId, 4);
    assert.equal(h.allocate({}).vehicleId, 5);
    assert.equal(h.ledger.rows.length, 3);
});
test("rechaza opId sin huella SHA-256 válida antes de crear reservas", () => {
    const h = harness();
    assert.throws(() => h.allocate({ opId: "OP-BAD", operationHash: "bad" }), /operationHash SHA-256/);
    assert.equal(h.ledger, null);
});
test("rechaza encabezados incompatibles en el ledger existente", () => {
    const h = harness();
    h.allocate({ opId: "OP-HEADER", operationHash: HASH_A });
    h.ledger.rows[0][0] = "incorrecto";
    assert.throws(() => h.allocate({ opId: "OP-OTHER", operationHash: HASH_B }), /encabezados incompatibles/);
});
test("rechaza IDs corruptos o duplicados en el historial de Cortes", () => {
    const h = harness();
    h.cortes.rows.push([3, "Mazda", "3"]);
    assert.throws(() => h.allocate({ opId: "OP-CORRUPT", operationHash: HASH_A }), /ID duplicado 3/);
    assert.equal(h.ledger, null);
});
console.log("WriteVehicleIdAllocationIdempotency: " + passed + "/" + passed + " PASS — reserva append-only, reintentos, intercalado concurrente, first-write-wins y fail-closed");
