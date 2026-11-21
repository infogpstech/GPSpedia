import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const catalog = readFileSync(new URL("../Services/catalog.js", import.meta.url), "utf8");
const start = catalog.indexOf("function readCatalogVehicleProjection_(vehicleId, spreadsheetRef)");
const end = catalog.indexOf("\nfunction handleGetVehicleProjection_", start);
assert.ok(start >= 0 && end > start, "debe existir la lectura dirigida");
const source = catalog.slice(start, end);
const rangeCalls = [];
const sheetCalls = [];
const idRows = [["1"], ["3"], ["9"]];
const vinRows = [["VIN-A"], ["VIN-B"], ["VIN-C"]];
const rowData = ["3", "Autos", "Nissan", "Frontier", "VIN-B"];
const sheet = {
    getLastRow: () => 4,
    getLastColumn: () => 5,
    getRange(row, column, count, width) {
        rangeCalls.push([row, column, count, width]);
        if (row === 2 && column === 1 && count === 3 && width === 1) return { getValues: () => idRows };
        if (row === 2 && column === 5 && count === 3 && width === 1) return { getValues: () => vinRows };
        if (row === 3 && column === 1 && count === 1 && width === 5) return { getValues: () => [rowData] };
        throw new Error("Rango inesperado: " + [row, column, count, width].join(","));
    },
    getDataRange() { throw new Error("No debe leerse el rango completo de Cortes"); }
};
const spreadsheet = { getSheetByName(name) { sheetCalls.push(name); return name === "Cortes" ? sheet : {}; } };
let projectedInput;
const read = new Function(
    "SHEET_NAMES", "COLS_CORTES", "getSpreadsheet", "getCortesColumnMap",
    "readFeedbackLikeEventCounts_", "mapCatalogVehicleRowForProjection_",
    "projectVehicleContributionEvents_", "readVehicleContributionEvents_",
    source + "\nreturn readCatalogVehicleProjection_;"
)(
    { CORTES: "Cortes" }, { id: 1 }, () => spreadsheet, () => ({ id: 1, vin: 5 }),
    ss => { ss.getSheetByName("FeedbackLikes"); return new Map(); },
    row => ({ id: row[0], marca: row[2], modelo: row[3], vin: row[4], tipoCorte1: "Cut" }),
    (vehicles, events) => { projectedInput = { vehicles, events }; return vehicles; },
    ss => { ss.getSheetByName("AportesVehiculo"); return [{ eventId: "EV-GLOBAL" }]; }
);
const result = read("3", spreadsheet);
assert.deepEqual(sheetCalls, ["Cortes", "FeedbackLikes", "AportesVehiculo"]);
assert.deepEqual(rangeCalls, [[2, 1, 3, 1], [2, 5, 3, 1], [3, 1, 1, 5]]);
assert.equal(projectedInput.vehicles.length, 3);
assert.deepEqual(projectedInput.vehicles.map(vehicle => vehicle.id), ["1", "3", "9"]);
assert.equal(projectedInput.vehicles[0].vin, "VIN-A");
assert.equal(projectedInput.vehicles[1].marca, "Nissan", "solo la fila solicitada se lee completa");
assert.equal(projectedInput.vehicles[2].vin, "VIN-C");
assert.equal(result.marca, "Nissan");
assert.throws(() => read("../3", spreadsheet), /ID de vehículo válido/);
const duplicateSheet = { ...sheet, getRange(row, column, count, width) {
    if (row === 2 && column === 1) return { getValues: () => [["3"], ["3"], ["9"]] };
    if (row === 2 && column === 5) return { getValues: () => vinRows };
    throw new Error("No debe leer fila completa para IDs duplicados");
}};
const duplicateSpreadsheet = { getSheetByName: name => name === "Cortes" ? duplicateSheet : {} };
assert.throws(() => read("3", duplicateSpreadsheet), /duplicado/);
console.log("CatalogVehicleProjectionRead: 1/1 PASS — ID/VIN globales y una sola fila completa");
