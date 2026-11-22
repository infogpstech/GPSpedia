import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/catalog.js", import.meta.url), "utf8");
const start = source.indexOf("function handleGetCatalogData(payload = {})");
const end = source.indexOf("\nfunction handleGetDropdownData()", start + 1);
assert.ok(start >= 0 && end > start, "No se encontró handleGetCatalogData");
const handler = source.slice(start, end);
assert.equal([...handler.matchAll(/getSpreadsheet\(\)/g)].length, 1,
    "La lectura de catálogo debe abrir/resolver Spreadsheet una sola vez por petición.");
assert.match(handler, /const spreadsheet = getSpreadsheet\(\)/);
for (const sheetName of ["SHEET_NAMES.CORTES","SHEET_NAMES.LOGOS_MARCA","SHEET_NAMES.TUTORIALES","SHEET_NAMES.RELAY",'"TutorialEditEvents"','"TutorialRenameEvents"']) {
    assert.ok(handler.includes("spreadsheet.getSheetByName(" + sheetName + ")"),
        "La hoja " + sheetName + " debe reutilizar el mismo handle de Spreadsheet.");
}
assert.match(handler, /readFeedbackLikeEventCounts_\(spreadsheet\)/);
assert.match(handler, /readVehicleContributionEvents_\(spreadsheet\)/);
assert.doesNotMatch(handler, /getSpreadsheet\(\)\.getSheetByName/);

console.log("CatalogSpreadsheetHandleReuse: 9/9 PASS — una sola instancia de Spreadsheet por lectura de catálogo");
