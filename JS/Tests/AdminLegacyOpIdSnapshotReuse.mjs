import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const helperStart = source.indexOf("function findUniqueCortesVehicleRowFromSnapshot_(");
const helperEnd = source.indexOf("\nfunction ", helperStart + 10);
assert.ok(helperStart >= 0 && helperEnd > helperStart, "No se encontró el helper de reutilización de snapshot");
const helperCode = source.slice(helperStart, helperEnd);
const normalizeId = (value, context) => {
    const id = String(value == null ? "" : value).trim();
    if (!/^\d+$/.test(id)) throw new Error(context + " ID inválido");
    return id;
};
const isBlank = value => value === null || value === undefined || String(value).trim() === "";
const findUnique = new Function(
    "COLS_CORTES", "normalizeIdempotenciaVehicleId_", "isBlankIdempotenciaValue_",
    helperCode + "\nreturn findUniqueCortesVehicleRowFromSnapshot_;"
)({ id: 1 }, normalizeId, isBlank);

const header = ["id", "marca", "modelo"];
const first = ["10", "Toyota", "Hilux"];
const target = ["20", "Honda", "Civic"];
const rows = [header, first, target];
const found = findUnique(rows, "20", "OP-LEGACY-20");
assert.equal(found.rowIndex, 3, "Debe conservar el índice físico de la fila");
assert.equal(found.rowValues, target, "Debe devolver directamente la fila del snapshot sin volver a leer Sheets");

assert.throws(
    () => findUnique([header, target, ["20", "Ford", "Focus"]], "20", "OP-DUP"),
    /aparece en 2 filas/,
    "Debe rechazar vehicleId duplicados"
);
assert.throws(
    () => findUnique([header, ["no-id", "Toyota", "Hilux"], target], "20", "OP-BAD"),
    /ID inválido/,
    "Debe conservar la validación de todos los IDs no vacíos"
);
assert.throws(
    () => findUnique([header, first], "20", "OP-MISSING"),
    /aparece en 0 filas/,
    "Debe rechazar vehicleId ausente"
);

const lookupStart = source.indexOf("function findRowByOpId(sheet, opId, entriesSnapshot)");
const lookupEnd = source.indexOf("\nfunction ", lookupStart + 10);
assert.ok(lookupStart >= 0 && lookupEnd > lookupStart, "No se encontró findRowByOpId");
const lookupCode = source.slice(lookupStart, lookupEnd);
const legacyStart = lookupCode.indexOf("const data = cortesSheet.getDataRange().getValues()");
const snapshotLookup = lookupCode.indexOf("findUniqueCortesVehicleRowFromSnapshot_(data, vehicleId, cleanOpId)");
assert.ok(legacyStart >= 0 && snapshotLookup > legacyStart,
    "La ruta legacy debe validar unicidad desde la lectura integral ya obtenida");
assert.doesNotMatch(
    lookupCode.slice(0, legacyStart),
    /getLastRow\\(\\)/,
    "La lectura integral debe sustituir también la consulta previa de getLastRow"
);
assert.doesNotMatch(
    lookupCode.slice(snapshotLookup),
    /findUniqueCortesVehicleRow_\(cortesSheet/,
    "La ruta legacy no debe volver a consultar la columna ID ni la fila completa"
);

console.log("AdminLegacyOpIdSnapshotReuse: 8/8 PASS — recuperación legacy reutiliza snapshot y conserva unicidad/validación");
