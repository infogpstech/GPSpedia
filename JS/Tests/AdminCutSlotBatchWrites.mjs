import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const columnsMatch = source.match(/const COLS_CORTES = \{([\s\S]*?)\n\};/);
assert.ok(columnsMatch, "No se encontró el mapa de columnas Cortes");
const columns = new Function("return ({" + columnsMatch[1] + "});")();

for (const slot of [1, 2, 3]) {
    const first = columns["tipoCorte" + slot];
    assert.equal(columns["ubicacionCorte" + slot], first + 1);
    assert.equal(columns["colorCableCorte" + slot], first + 2);
    assert.equal(columns["configRelay" + slot], first + 3);
    assert.equal(columns["imgCorte" + slot], first + 4);
}

const start = source.indexOf("function handleAddOrUpdateCut(payload, logMessage, developerContext)");
const end = source.indexOf("\nfunction sanitizeSupplementaryRichText_", start);
assert.ok(start >= 0 && end > start, "No se encontró handleAddOrUpdateCut");
const handler = source.slice(start, end);
const existingStart = handler.indexOf("if (vehicleId) { // --- Lógica para vehículo EXISTENTE ---");
const existingEnd = handler.indexOf("} else { // --- Lógica para vehículo NUEVO", existingStart);
assert.ok(existingStart >= 0 && existingEnd > existingStart, "No se encontró la rama de vehículo existente");
const existing = handler.slice(existingStart, existingEnd);

assert.match(existing, /const slotCoreValues = \[\s*cutData\.tipoCorte1, cutData\.ubicacionCorte1, cutData\.colorCableCorte1,\s*cutData\.configRelay1, imageUrl\s*\]/);
assert.match(existing, /getRange\(rowIndex, COLS_CORTES\[`tipoCorte\$\{cutSlotIndex\}`\], 1, slotCoreValues\.length\)\s*\.setValues\(\[slotCoreValues\]\)/);
assert.match(existing, /COLS_CORTES\[`activaTestigo\$\{cutSlotIndex\}`\]\)\.setValue\(cutData\.activaTestigo1 === true\)/);
assert.match(existing, /COLS_CORTES\[`colaboradorCorte\$\{cutSlotIndex\}`\]\)\.setValue\(colaboradorName\)/);
for (const field of ["tipoCorte", "ubicacionCorte", "colorCableCorte", "configRelay", "imgCorte"]) {
    assert.doesNotMatch(existing, new RegExp("COLS_CORTES\\[\`" + field + "\\\$\\{cutSlotIndex\\}\`\\]\\)\\.setValue"));
}
assert.match(existing, /recordOpId\(opId, vehicleId, cutSlotIndex, formattedDate, "pending"/);
assert.ok(existing.indexOf("recordOpId(opId, vehicleId, cutSlotIndex, formattedDate, \"pending\"") <
    existing.indexOf("runAdminDriveWorkOutsideScriptLock_"), "La reserva idempotente debe mantenerse antes de Drive");
assert.match(existing, /SpreadsheetApp\.flush\(\)/);
assert.match(existing, /recordOpId\(opId, vehicleId, cutSlotIndex, formattedDate, "completed"/);
console.log("AdminCutSlotBatchWrites: 1/1 PASS — cinco campos contiguos en una escritura por lote; testigo, colaborador e idempotencia preservados");
