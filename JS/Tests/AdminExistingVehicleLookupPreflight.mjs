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
const rowSnapshot = handler.indexOf("const snapshotWidth = Math.max(48, vinColumnIndex || 0);\n        const rowValues = sheet.getRange(rowIndex, 1, 1, snapshotWidth).getValues()[0];", existingBranch);
const revalidation = handler.indexOf("if (String(rowValues[COLS_CORTES.id - 1]) !== String(vehicleId))", existingBranch);

assert.ok(lookup >= 0 && lookup < lock,
    "La búsqueda completa de ID debe ejecutarse antes de adquirir ScriptLock");
assert.ok(rowResolution > lookup && rowResolution < lock,
    "La fila candidata debe resolverse antes del lock");
assert.ok(existingBranch > lock, "La escritura del vehículo existente debe permanecer protegida");
assert.ok(rowSnapshot > existingBranch && rowSnapshot < revalidation,
    "La fila debe leerse una sola vez bajo lock antes de revalidar el ID desde el snapshot");
assert.equal(handler.indexOf("sheet.getRange(rowIndex, COLS_CORTES.id).getValue();", existingBranch), -1,
    "No debe realizarse una lectura individual adicional del ID");
assert.ok(handler.includes('if (existingVehicleRowIndex === null) throw new Error("El ID del vehículo no fue encontrado.");'),
    "La ruta debe rechazar IDs que no aparezcan en el snapshot previo");
assert.equal(handler.indexOf("const ids = sheet.getRange(2, 1, sheet.getLastRow(), 1).getValues().flat();", lock), -1,
    "No debe permanecer la búsqueda completa de IDs dentro de la sección crítica");

console.log("AdminExistingVehicleLookupPreflight: 8/8 PASS — búsqueda previa y revalidación del ID desde una única lectura de fila dentro del lock");
