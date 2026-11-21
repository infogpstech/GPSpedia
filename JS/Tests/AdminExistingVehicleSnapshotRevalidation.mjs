import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = source.indexOf("function handleAddOrUpdateCut(payload, logMessage, developerContext)");
const end = source.indexOf("\nfunction sanitizeSupplementaryRichText_", start);
assert.ok(start >= 0 && end > start, "No se encontró handleAddOrUpdateCut");
const handler = source.slice(start, end);
const branchStart = handler.indexOf("if (vehicleId) { // --- Lógica para vehículo EXISTENTE ---");
const branchEnd = handler.indexOf("} else { // --- Lógica para vehículo NUEVO", branchStart);
assert.ok(branchStart >= 0 && branchEnd > branchStart, "No se encontró la rama de vehículo existente");
const branch = handler.slice(branchStart, branchEnd);
const rowRead = branch.indexOf("const snapshotWidth = Math.max(48, vinColumnIndex || 0);\n        const rowValues = sheet.getRange(rowIndex, 1, 1, snapshotWidth).getValues()[0];");
const idCheck = branch.indexOf("if (String(rowValues[COLS_CORTES.id - 1]) !== String(vehicleId))");
const objectMap = branch.indexOf("const vehicleInfo = mapRowToObject(rowValues, COLS_CORTES);");
assert.ok(rowRead >= 0 && rowRead < idCheck && idCheck < objectMap,
    "La fila debe leerse una vez, validar el ID desde ese snapshot y después mapearla");
assert.doesNotMatch(branch, /getRange\(rowIndex,\s*COLS_CORTES\.id\)\.getValue\(\)/,
    "No debe existir lectura individual de la celda ID");
const preDrive = branch.slice(0, branch.indexOf("runAdminDriveWorkOutsideScriptLock_"));
assert.ok(preDrive.length > 0, "No se encontró el inicio del trabajo Drive");
assert.equal((preDrive.match(/getRange\(rowIndex, 1, 1, snapshotWidth\)\.getValues\(\)\[0\]/g) || []).length, 1,
    "Antes de Drive debe existir una sola lectura acotada de fila para revalidar la identidad");
assert.doesNotMatch(preDrive, /getRange\(rowIndex, 1, 1, sheet\.getLastColumn\(\)\)/,
    "La lectura no debe transferir columnas auxiliares fuera del esquema ADMIN y VIN");
const snapshotWidth = requiredVinColumn => Math.max(48, requiredVinColumn || 0);
assert.equal(snapshotWidth(0), 48, "Debe cubrir todo el esquema ADMIN");
assert.equal(snapshotWidth(45), 48, "Debe conservar el ancho del esquema si VIN está dentro de él");
assert.equal(snapshotWidth(52), 52, "Debe incluir VIN si está después de las columnas ADMIN");
const validateSnapshotId = (rowValues, expectedId) =>
    String(rowValues[0]) === String(expectedId);
assert.equal(validateSnapshotId(["123", "Toyota"], 123), true, "Debe aceptar ID numérico/string equivalente");
assert.equal(validateSnapshotId(["124", "Toyota"], 123), false, "Debe rechazar un ID sustituido");
assert.equal(validateSnapshotId(["", "Toyota"], 123), false, "Debe rechazar una celda ID vacía");
console.log("AdminExistingVehicleSnapshotRevalidation: 7/7 PASS — una lectura de fila valida identidad sin getValue redundante");
