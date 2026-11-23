import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";

const writeSource = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
const apiSource = readFileSync(new URL("../Frontend/api-config.js", import.meta.url), "utf8");
const writeStart = writeSource.indexOf("const CORTES_ID_COUNTER_PROPERTY =");
const writeEnd = writeSource.indexOf("\nfunction assertDeveloperForIdMaintenance", writeStart);
assert.ok(writeStart >= 0 && writeEnd > writeStart, "No se encontró el asignador WRITE");
const writeCode = writeSource.slice(writeStart, writeEnd);
function createSheet(initialRows) {
    const rows = initialRows.map(row => row.slice()), formulas = new Map();
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
                    rows[row - 1][column - 1] = value;
                    formulas.delete((row - 1) + ":" + (column - 1));
                },
                setValues(values) {
                    values.forEach((line, r) => line.forEach((value, c) => {
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
            if (typeof values[2] === "string" && values[2].startsWith("=")) formulas.set((rowIndex - 1) + ":2", values[2]);
        },
        recalculate() {
            for (let rowIndex = 2; rowIndex <= rows.length; rowIndex++) {
                const formula = formulas.get((rowIndex - 1) + ":2");
                if (!formula) continue;
                const match = formula.match(/,\s*(\d+)\)\+1$/);
                assert.ok(match, "La fórmula de reserva no es verificable");
                const previous = rows.slice(1, rowIndex - 1).map(row => Number(row[2])).filter(Number.isSafeInteger);
                rows[rowIndex - 1][2] = Math.max(Number(match[1]), ...previous) + 1;
            }
        }
    };
    return sheet;
}

const cortes = createSheet([["id", "marca", "modelo"], [1, "Toyota", "Hilux"], [2, "Toyota", "RAV4"], [3, "Honda", "Civic"]]);
let ledger = null;
const properties = { value: "3", getProperty() { return this.value; } };
const spreadsheet = {
    getSheetByName(name) { if (name === "Cortes") return cortes; if (name === "CortesIdReservations") return ledger; return null; },
    insertSheet(name) {
        assert.equal(name, "CortesIdReservations");
        ledger = createSheet([["", "", "", ""]]);
        return ledger;
    }
};
const Utilities = {
    getUuid: () => crypto.randomUUID(),
    DigestAlgorithm: { SHA_256: "SHA_256" },
    computeDigest: (algorithm, value) => Array.from(crypto.createHash("sha256").update(String(value)).digest())
};
const allocateInWrite = new Function(
    "COLS_CORTES", "SHEET_NAMES", "PropertiesService", "LockService", "SpreadsheetApp",
    "Utilities", "getSpreadsheet", "assertDeveloperForIdMaintenance",
    writeCode + "\nreturn handleAllocateVehicleId;"
)(
    { id: 1 }, { CORTES: "Cortes" },
    { getScriptProperties: () => properties },
    { getScriptLock: () => { throw new Error("WRITE ID allocator must not acquire ScriptLock"); } },
    { flush() { if (ledger) ledger.recalculate(); } },
    Utilities, () => spreadsheet,
    payload => {
        assert.ok(payload.userId && payload.sessionToken, "WRITE debe recibir la sesión autenticada");
        return { role: "desarrollador" };
    }
);

assert.match(apiSource, /'allocateVehicleId': 'WRITE'/);
assert.match(apiSource, /'addOrUpdateCut': 'WRITE'/);
let loseNextResponse = true;
const requestFromFrontend = (payload, opId, operationHash) => {
    const result = allocateInWrite({ ...payload, opId, operationHash });
    if (loseNextResponse) {
        loseNextResponse = false;
        throw new Error("simulated response loss after WRITE commit");
    }
    return result;
};

const payload = { userId: "USR-1", sessionToken: "SESSION-1" };
const hashA = "a".repeat(64), hashB = "b".repeat(64);
assert.throws(() => requestFromFrontend(payload, "OP-E2E-1", hashA), /simulated response loss/);
assert.deepEqual(requestFromFrontend(payload, "OP-E2E-1", hashA), { status: "success", vehicleId: 4 }, "El reintento debe recuperar el ID persistido por WRITE con el contrato de respuesta actual.");
assert.deepEqual(requestFromFrontend(payload, "OP-E2E-2", hashB), { status: "success", vehicleId: 5 }, "Una operación distinta debe recibir un ID nuevo con el contrato de respuesta actual.");
assert.throws(() => requestFromFrontend(payload, "OP-E2E-1", hashB), /otro contenido/);
assert.equal(ledger.rows.length, 3, "Debe existir una reserva canónica por operación");
assert.deepEqual(ledger.rows.slice(1).map(row => row[2]), [4, 5]);
console.log("VehicleIdAllocationEndToEnd: 1/1 PASS — frontend→WRITE, asignación sin lock, respuesta perdida y recuperación por opId");
