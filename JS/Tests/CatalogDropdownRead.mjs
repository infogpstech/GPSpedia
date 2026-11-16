import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const catalog = readFileSync(resolve(root, "JS/Services/catalog.js"), "utf8");
const match = catalog.match(/^function handleGetDropdownData\(\) \{[\s\S]*?^\}/m);
assert.ok(match, "No se encontró handleGetDropdownData.");

function createSheet(columns, lastRow) {
    const reads = [];
    return {
        reads,
        getLastRow: () => lastRow,
        getDataRange() { throw new Error("No debe leer getDataRange completo."); },
        getRange(row, column, numRows, numColumns) {
            reads.push({ row, column, numRows, numColumns });
            return {
                getDataValidation() {
                    return { getCriteriaValues: () => [[["Moto", "Auto", "Camioneta"]]] };
                },
                getValues() {
                    return Array.from({ length: numRows }, (_, rowIndex) =>
                        Array.from({ length: numColumns }, (_, columnOffset) => {
                            const values = columns[column + columnOffset] || [];
                            return values[row - 2 + rowIndex] ?? "";
                        })
                    );
                }
            };
        }
    };
}

const cortes = createSheet({
    2: ["Toyota", "Toyota", "Honda"],
    3: ["Manual", "Automática", "Manual"],
    4: ["", "Automática", "CVT"],
    5: ["", "", "Doble embrague"],
    6: ["Llave", "Botón", "Llave"]
}, 4);
const relay = createSheet({ 2: ["GPS básico", "GPS avanzado", "GPS básico"] }, 4);
const spreadsheet = { getSheetByName: name => name === "Cortes" ? cortes : name === "Relay" ? relay : null };
const handler = new Function(
    "getSpreadsheet", "SHEET_NAMES", "COLS_CORTES", "COLS_RELAY",
    match[0] + "\nreturn handleGetDropdownData;"
)(
    () => spreadsheet,
    { CORTES: "Cortes", RELAY: "Relay" },
    { categoria: 1, marca: 2, tipoCorte1: 3, tipoCorte2: 4, tipoCorte3: 5, tipoEncendido: 6 },
    { configuracion: 2 }
);

const result = handler();
assert.equal(result.status, "success");
assert.deepEqual(result.dropdowns.categoria, ["Moto", "Auto", "Camioneta"]);
assert.deepEqual(result.dropdowns.marca, ["Honda", "Toyota"]);
assert.deepEqual(result.dropdowns.tipoDeCorte, ["Automática", "CVT", "Doble embrague", "Manual"]);
assert.deepEqual(result.dropdowns.tipoDeEncendido, ["Botón", "Llave"]);
assert.deepEqual(result.dropdowns.configRelay, ["GPS avanzado", "GPS básico"]);
assert.deepEqual(cortes.reads.map(read => [read.row, read.column, read.numRows, read.numColumns]), [[2, 1, undefined, undefined], [2, 2, 3, 5]]);
assert.deepEqual(relay.reads.map(read => [read.row, read.column, read.numRows, read.numColumns]), [[2, 2, 3, 1]]);
console.log("CatalogDropdownRead: 1/1 PASS");
