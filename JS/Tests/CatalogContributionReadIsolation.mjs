import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const catalog = readFileSync(new URL("../Services/catalog.js", import.meta.url), "utf8");
const start = catalog.indexOf("function mapCatalogVehicleRowForProjection_");
const end = catalog.indexOf("\nfunction handleGetCatalogData", start);
assert.ok(start >= 0 && end > start, "el helper debe estar antes del catálogo completo");
const source = catalog.slice(start, end);
const sheetCalls = [];
const events = [{ eventId: "EV-1" }];
const rows = [
    ["ID", "Categoria", "Marca", "Modelo", "Util1", "Util2", "Util3", "Tipo1", "Tipo2", "Tipo3", "Video"],
    ["3", "Autos", "Nissan", "Frontier", 1, 4, 2, "Corte A", "Corte B", "Corte C", "video-id"]
];
const cortesSheet = { getDataRange() { return { getValues: () => rows.map(row => row.slice()) }; } };
const spreadsheet = { getSheetByName(name) { sheetCalls.push(name); return name === "Cortes" ? cortesSheet : {}; } };
let projectedInput = null;
const read = new Function(
    "SHEET_NAMES", "IMAGE_FIELDS_CORTES", "getSpreadsheet", "getCortesColumnMap",
    "readFeedbackLikeEventCounts_", "mapRowToObject", "normalizeYouTubeUrl",
    "projectVehicleContributionEvents_", "readVehicleContributionEvents_",
    source + "\nreturn readCatalogContributionProjectionVehicles_;"
)(
    { CORTES: "Cortes" }, new Set(), () => spreadsheet, () => ({}),
    ss => { ss.getSheetByName("FeedbackLikes"); return new Map([["3|1", 2]]); },
    row => ({
        id: row[0], categoria: row[1], marca: row[2], modelo: row[3],
        utilCorte1: row[4], utilCorte2: row[5], utilCorte3: row[6],
        tipoCorte1: row[7], tipoCorte2: row[8], tipoCorte3: row[9],
        videoGuiaDesarmeUrl: row[10]
    }),
    value => "normalized:" + value,
    (vehicles, sourceEvents) => { projectedInput = { vehicles, sourceEvents }; return vehicles; },
    ss => { ss.getSheetByName("AportesVehiculo"); return events; }
);
const result = read(spreadsheet);
assert.deepEqual(sheetCalls, ["Cortes", "FeedbackLikes", "AportesVehiculo"]);
assert.equal(result.length, 1);
assert.deepEqual(projectedInput.sourceEvents, events);
assert.equal(projectedInput.vehicles[0].Video, "normalized:video-id");
assert.equal(projectedInput.vehicles[0].tipoCorte1, "Corte B", "mantiene orden de cortes por utilidad + likes");
assert.equal(projectedInput.vehicles[0].tipoCorte2, "Corte A");
assert.equal(projectedInput.vehicles[0].utilCorte2, 3);
console.log("CatalogContributionReadIsolation: 1/1 PASS — solo Cortes, FeedbackLikes y AportesVehiculo");

const inventoryProjection = read(spreadsheet, true);
assert.ok(Array.isArray(inventoryProjection.vehicles));
assert.deepEqual(inventoryProjection.sourceEvents, events);
console.log("CatalogContributionReadIsolation: source events reuse the parsed contribution ledger");
