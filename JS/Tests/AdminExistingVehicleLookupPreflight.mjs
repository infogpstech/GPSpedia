import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = source.indexOf("function handleAddOrUpdateCut(payload, logMessage, developerContext)");
const end = source.indexOf("\nfunction sanitizeSupplementaryRichText_", start);
assert.ok(start >= 0 && end > start, "No se encontró handleAddOrUpdateCut");
const handler = source.slice(start, end);
const lock = handler.indexOf("lock.tryLock(0)");
const lookup = handler.indexOf("const idsSnapshot = sheet.getRange(2, 1, lastRowForLookup, 1).getValues().flat();");
const rowResolution = handler.indexOf("existingVehicleRowIndex = existingIndex + 2;");
const existingBranch = handler.indexOf("if (vehicleId) { // --- Lógica para vehículo EXISTENTE ---");
const revalidation = handler.indexOf("const currentVehicleId = sheet.getRange(rowIndex, COLS_CORTES.id).getValue();");
const rowSnapshot = handler.indexOf("const rowValues = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];", existingBranch);

assert.ok(lookup >= 0 && lookup < lock,
    "La búsqueda completa de ID debe ejecutarse antes de adquirir ScriptLock");
assert.ok(rowResolution > lookup && rowResolution < lock,
    "La fila candidata debe resolverse antes del lock");
assert.ok(existingBranch > lock, "La escritura del vehículo existente debe permanecer protegida");
assert.ok(revalidation > existingBranch && revalidation < rowSnapshot,
    "El ID de la celda candidata debe revalidarse bajo lock antes de leer/escribir la fila");
assert.ok(handler.includes('if (existingVehicleRowIndex === null) throw new Error("El ID del vehículo no fue encontrado.");'),
    "La ruta debe rechazar IDs que no aparezcan en el snapshot previo");
assert.equal(handler.indexOf("const ids = sheet.getRange(2, 1, sheet.getLastRow(), 1).getValues().flat();", lock), -1,
    "No debe permanecer la búsqueda completa de IDs dentro de la sección crítica");

console.log("AdminExistingVehicleLookupPreflight: 7/7 PASS — búsqueda de ID fuera del lock y revalidación de celda dentro");
