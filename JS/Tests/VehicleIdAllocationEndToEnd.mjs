import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const writeSource = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
const adminSource = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const writeStart = writeSource.indexOf("const CORTES_ID_COUNTER_PROPERTY =");
const writeEnd = writeSource.indexOf("\nfunction assertDeveloperForIdMaintenance", writeStart);
assert.ok(writeStart >= 0 && writeEnd > writeStart, "No se encontró el asignador WRITE");
const writeCode = writeSource.slice(writeStart, writeEnd);
const adminStart = adminSource.indexOf("function requestNextVehicleIdFromWriteService(");
const adminEnd = adminSource.indexOf("\nfunction requestCortesIdFreezeFromWriteService", adminStart);
assert.ok(adminStart >= 0 && adminEnd > adminStart, "No se encontró el cliente ADMIN");
const adminCode = adminSource.slice(adminStart, adminEnd);

function createSheet(initialRows) {
    const rows = initialRows.map(row => row.slice());
    return {
        rows,
        getLastRow: () => rows.length,
        getLastColumn: () => Math.max(1, ...rows.map(row => row.length)),
        getRange(row, column, numRows = 1, numColumns = 1) {
            return {
                getValues: () => Array.from({ length: numRows }, (_, r) =>
                    Array.from({ length: numColumns }, (_, c) => (rows[row - 1 + r] || [])[column - 1 + c] ?? "")),
                getValue: () => (rows[row - 1] || [])[column - 1] ?? "",
                getFormulas: () => Array.from({ length: numRows }, () => Array.from({ length: numColumns }, () => "")),
                setValues(values) {
                    values.forEach((valuesRow, r) => {
                        while (rows.length < row + r) rows.push([]);
                        valuesRow.forEach((value, c) => { rows[row - 1 + r][column - 1 + c] = value; });
                    });
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
        appendRow(values) { rows.push(values.slice()); }
    };
}

const cortes = createSheet([["id", "marca", "modelo"], [1, "Toyota", "Hilux"], [2, "Toyota", "RAV4"], [3, "Honda", "Civic"]]);
let ledger = null;
const properties = {
    value: "3",
    getProperty() { return this.value; },
    setProperty(key, value) { this.value = String(value); }
};
const spreadsheet = {
    getSheetByName(name) { if (name === "Cortes") return cortes; if (name === "CortesIdReservations") return ledger; return null; },
    insertSheet(name) {
        assert.equal(name, "CortesIdReservations");
        ledger = createSheet([["opId", "operationHash", "vehicleId", "createdAt"]]);
        return ledger;
    }
};
let held = false;
const lock = {
    tryLock(wait) { assert.equal(wait, 0); if (held) return false; held = true; return true; },
    releaseLock() { assert.equal(held, true); held = false; }
};
const allocateInWrite = new Function(
    "COLS_CORTES", "SHEET_NAMES", "PropertiesService", "LockService", "SpreadsheetApp",
    "getSpreadsheet", "assertDeveloperForIdMaintenance",
    writeCode + "\nreturn handleAllocateVehicleId;"
)(
    { id: 1 }, { CORTES: "Cortes" },
    { getScriptProperties: () => properties },
    { getScriptLock: () => lock },
    { flush() {} },
    () => spreadsheet,
    payload => {
        assert.ok(payload.userId && payload.sessionToken, "WRITE debe recibir la sesión autenticada");
        return { role: "desarrollador" };
    }
);

let loseNextResponse = true;
const requestFromAdmin = new Function("callWriteServiceAction", adminCode + "\nreturn requestNextVehicleIdFromWriteService;")(
    (action, payload) => {
        assert.equal(action, "allocateVehicleId");
        const result = allocateInWrite(payload);
        if (loseNextResponse) {
            loseNextResponse = false;
            throw new Error("simulated response loss after WRITE commit");
        }
        return result;
    }
);

const payload = { userId: "USR-1", sessionToken: "SESSION-1" };
const hashA = "a".repeat(64), hashB = "b".repeat(64);
assert.throws(() => requestFromAdmin(payload, "OP-E2E-1", hashA), /simulated response loss/);
assert.equal(requestFromAdmin(payload, "OP-E2E-1", hashA), 4, "El reintento debe recuperar el ID persistido por WRITE");
assert.equal(requestFromAdmin(payload, "OP-E2E-2", hashB), 5, "Una operación distinta debe recibir un ID nuevo");
assert.throws(() => requestFromAdmin(payload, "OP-E2E-1", hashB), /otro contenido/, "La misma clave no puede cambiar de huella");
assert.equal(ledger.rows.length, 3, "Debe existir una sola reserva por operación");
console.log("VehicleIdAllocationEndToEnd: 4/4 PASS — ADMIN→WRITE, respuesta perdida, reintento y rechazo de huella distinta");
