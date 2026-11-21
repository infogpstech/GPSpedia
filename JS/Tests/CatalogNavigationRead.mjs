import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const source = readFileSync(resolve(root, "JS/Services/catalog.js"), "utf8");
const match = source.match(/^function handleGetNavigationData\(\) \{[\s\S]*?^\}/m);
assert.ok(match, "No se encontró handleGetNavigationData.");

function createSheet(rows, lastRow) {
    const reads = [];
    return {
        reads,
        getLastRow: () => lastRow,
        getDataRange() { throw new Error("No debe leerse el rango completo."); },
        getRange(row, column, numRows, numColumns) {
            reads.push({ row, column, numRows, numColumns });
            return { getValues: () => rows.slice(0, numRows).map(values =>
                values.slice(column - 1, column - 1 + numColumns)) };
        }
    };
}

const cortes = createSheet([
    [101, "Moto", "Toyota"],
    [102, "Auto", "Honda"],
    ["", "Moto", "Marca sin ID"]
], 4);
const logos = createSheet([
    [1, "Toyota", "logo-toyota"],
    [2, "Honda", "logo-honda"]
], 3);
const spreadsheet = { getSheetByName: name => name === "Cortes" ? cortes : name === "LogosMarca" ? logos : null };
const handler = new Function(
    "getSpreadsheet", "SHEET_NAMES", "COLS_CORTES", "COLS_LOGOS_MARCA",
    "IMAGE_FIELDS_LOGOS", "mapRowToObject",
    match[0] + "\nreturn handleGetNavigationData;"
)(
    () => spreadsheet,
    { CORTES: "Cortes", LOGOS_MARCA: "LogosMarca" },
    { id: 1, categoria: 2, marca: 3 },
    { id: 1, nombreMarca: 2, urlLogo: 3 },
    new Set(["urlLogo"]),
    (row, columns) => Object.fromEntries(Object.entries(columns).map(([key, column]) => [key, row[column - 1] || null]))
);

const result = handler();
assert.equal(result.status, "success");
assert.deepEqual(result.data.categoryCounts, { Moto: 1, Auto: 1 });
assert.deepEqual(result.data.marcas, ["Honda", "Toyota"]);
assert.deepEqual(result.data.sortedCategories, ["Moto", "Auto"]);
assert.deepEqual(result.data.logos, [
    { id: 1, nombreMarca: "Toyota", urlLogo: "logo-toyota" },
    { id: 2, nombreMarca: "Honda", urlLogo: "logo-honda" }
]);
assert.deepEqual(cortes.reads, [{ row: 2, column: 1, numRows: 3, numColumns: 3 }]);
assert.deepEqual(logos.reads, [{ row: 2, column: 1, numRows: 2, numColumns: 3 }]);

const emptyCortes = createSheet([], 1), emptyLogos = createSheet([], 1);
const emptyHandler = new Function(
    "getSpreadsheet", "SHEET_NAMES", "COLS_CORTES", "COLS_LOGOS_MARCA",
    "IMAGE_FIELDS_LOGOS", "mapRowToObject",
    match[0] + "\nreturn handleGetNavigationData;"
)(
    () => ({ getSheetByName: name => name === "Cortes" ? emptyCortes : emptyLogos }),
    { CORTES: "Cortes", LOGOS_MARCA: "LogosMarca" },
    { id: 1, categoria: 2, marca: 3 }, { id: 1, nombreMarca: 2, urlLogo: 3 },
    new Set(["urlLogo"]), (row, columns) => row
);
const emptyResult = emptyHandler();
assert.deepEqual(emptyResult.data.categoryCounts, {});
assert.deepEqual(emptyResult.data.marcas, []);
assert.deepEqual(emptyResult.data.logos, []);
assert.equal(emptyCortes.reads.length + emptyLogos.reads.length, 0);
console.log("CatalogNavigationRead: 2/2 PASS — rangos mínimos, contrato y hojas vacías");
