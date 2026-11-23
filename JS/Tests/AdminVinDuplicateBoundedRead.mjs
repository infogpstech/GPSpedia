import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
const start = source.indexOf("function checkVinDuplicateInSheet(");
const end = source.indexOf("\\nfunction ", start + 20);
assert.ok(start >= 0 && end > start, "No se encontró el validador VIN canónico de WRITE.");
const code = source.slice(start, end);
assert.match(code, /vinColumnIndexOverride/);
assert.match(code, /Number\\.isInteger\\(vinColumnIndexOverride\\)/);
assert.match(code, /: getVinColumnIndex\\(sheet\\)/);

let headerReads = 0;
const parse = value => String(value || "").split(",").map(item => item.trim()).filter(Boolean);
const build = new Function("COLS_CORTES", "getVinColumnIndex", "parseVinCollection", code + "\\nreturn checkVinDuplicateInSheet;");
const fn = build(
    { id: 1, marca: 3, modelo: 4, anoDesde: 6, anoHasta: 7 },
    () => { headerReads++; return 9; },
    parse
);
const rows = [
    ["11", "", "Toyota", "", "", 2018, 2020, "", "VIN-A"],
    ["12", "", "Nissan", "", "", 2021, 2023, "", "VIN-B"],
    ["13", "", "Ford", "", "", 2019, 2022, "", "VIN-A"]
];
const sheet = { getLastRow: () => 4, getLastColumn: () => 9, getRange: () => ({ getValues: () => [["id"]] }) };

const duplicate = fn(sheet, "VIN-A", null, rows, 9);
assert.equal(duplicate.vehicleId, "11");
assert.equal(duplicate.modelName, "Toyota Hilux (2018-2020)".replace(" Hilux", ""));
assert.equal(duplicate.vinPrefix, "VIN-A");
assert.equal(headerReads, 0, "La ruta de alta debe reutilizar el índice VIN ya validado.");
assert.equal(fn(sheet, "VIN-A", "11", rows, 9).vehicleId, "13", "Debe excluir el vehículo actual.");
assert.equal(fn(sheet, "VIN-Z", null, rows, 9), null);
assert.equal(headerReads, 0);

const fallback = fn(sheet, "VIN-B", null, rows);
assert.equal(fallback.vehicleId, "12");
assert.equal(headerReads, 1, "Las llamadas sin índice conservan la resolución compatible.");

const handlerStart = source.indexOf("function handleAddOrUpdateCutLockedUnsafe_(");
const handlerEnd = source.indexOf("\\nfunction ", handlerStart + 20);
const handler = source.slice(handlerStart, handlerEnd);
assert.ok(handler.includes("const vinColumnIndex = testigoSchema.vinColumnIndex;"));
assert.equal((handler.match(/checkVinDuplicateInSheet\\(sheet, vinPrefix, [^\\n]+, null, vinColumnIndex\\)/g) || []).length, 3,
    "Recuperación, edición y alta nueva deben reutilizar el índice validado.");

console.log("AdminVinDuplicateBoundedRead: 11/11 PASS — WRITE reutiliza el índice VIN y conserva fallback compatible");
