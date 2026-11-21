import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
const start = source.indexOf("function getExistingEntities(sheet)");
const end = source.indexOf("\n}", start) + 2;
assert.ok(start >= 0 && end > start, "No se encontró getExistingEntities");
const code = source.slice(start, end);
assert.doesNotMatch(code, /getLastColumn\(\)/, "No debe consultar el ancho completo de Cortes");
assert.match(code, /new Set\(\)/, "Debe deduplicar mediante Set");
assert.doesNotMatch(code, /\.indexOf\(/, "No debe hacer búsquedas lineales repetidas para deduplicar");

const fn = new Function("COLS_CORTES", code + "\nreturn getExistingEntities;")({
  marca: 3, modelo: 4, versionesAplicables: 5
});
let requested = null;
let lastColumnReads = 0;
const rows = [
  ["Toyota", "Hilux", "2020-2024"],
  [" Toyota ", "Hilux", "2018"],
  ["Nissan", "Frontier", "2022"],
  ["TOYOTA", "Hilux", "2022"]
];
const sheet = {
  getLastRow: () => rows.length + 1,
  getLastColumn: () => { lastColumnReads++; throw new Error("No debe consultar getLastColumn"); },
  getRange: (...args) => {
    requested = args;
    return { getValues: () => rows };
  }
};
assert.deepEqual(fn(sheet), {
  brands: ["Toyota", "Nissan", "TOYOTA"],
  models: ["Hilux", "Frontier"],
  versions: ["2020-2024", "2018", "2022"]
});
assert.deepEqual(requested, [2, 3, 4, 3], "Debe leer solo marca, modelo y versiones aplicables");
assert.equal(lastColumnReads, 0, "No debe consultar el ancho completo de Cortes");

let emptyRangeReads = 0;
assert.deepEqual(fn({
  getLastRow: () => 1,
  getRange: () => { emptyRangeReads++; throw new Error("No debe leer rangos vacíos"); }
}), { brands: [], models: [], versions: [] });
assert.equal(emptyRangeReads, 0, "La hoja sin registros no debe leer rangos");

const offsetFn = new Function("COLS_CORTES", code + "\nreturn getExistingEntities;")({
  marca: 2, modelo: 3, versionesAplicables: 4
});
let offsetRange = null;
assert.deepEqual(offsetFn({
  getLastRow: () => 2,
  getRange: (...args) => {
    offsetRange = args;
    return { getValues: () => [["Ford", "Ranger", "2019-2023"]] };
  }
}), { brands: ["Ford"], models: ["Ranger"], versions: ["2019-2023"] });
assert.deepEqual(offsetRange, [2, 2, 1, 3], "Los offsets deben derivarse de COLS_CORTES");

console.log("WriteEntityLookupBoundedRead: 8/8 PASS — rango contiguo, deduplicación estable y hoja vacía");
