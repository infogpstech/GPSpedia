import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = source.indexOf("function handleAddOrUpdateCut(payload, logMessage, developerContext)");
const end = source.indexOf("\nfunction sanitizeSupplementaryRichText_", start);
assert.ok(start >= 0 && end > start, "No se encontró handleAddOrUpdateCut");
const handler = source.slice(start, end);
const lock = handler.indexOf("lock.tryLock(0)");
const entityRead = handler.indexOf("getExistingEntities(sheet)");
const entityNormalization = handler.indexOf("resolveAndNormalizeEntity(preparedVehicleData.marca");
const yearPreparation = handler.indexOf("preparedVehicleYear = { anoDesde: anoDesde, anoHasta: anoHasta };");
const newVehicleBranch = handler.indexOf("} else { // --- Lógica para vehículo NUEVO");

assert.ok(lock > 0, "No se encontró la adquisición breve del lock");
assert.ok(entityRead >= 0 && entityRead < lock,
    "La lectura del catálogo de entidades debe ocurrir antes del ScriptLock");
assert.ok(entityNormalization > entityRead && entityNormalization < lock,
    "La normalización de marca/modelo/versiones debe ocurrir antes del ScriptLock");
assert.ok(yearPreparation > entityNormalization && yearPreparation < lock,
    "El parseo y normalización del año deben completarse antes del ScriptLock");
assert.ok(newVehicleBranch > lock, "La mutación de la fila nueva debe conservarse dentro de la sección protegida");
assert.equal(handler.indexOf("getExistingEntities(sheet)", lock), -1,
    "No debe repetirse la lectura completa del catálogo dentro del lock");
assert.ok(handler.includes("const newVehicleData = preparedVehicleData;") &&
    handler.includes("Object.assign({}, newVehicleData"),
    "La ruta de alta debe consumir el snapshot preparado sin mutar el payload original");

console.log("AdminCutEntityPreflight: 7/7 PASS — catálogo, normalización y año preparados fuera del ScriptLock");
