import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = source.indexOf("function handleAddOrUpdateCut(payload, logMessage, developerContext)");
const end = source.indexOf("\nfunction sanitizeSupplementaryRichText_", start);
assert.ok(start >= 0 && end > start, "No se encontró handleAddOrUpdateCut");
const handler = source.slice(start, end);

assert.ok(handler.includes('const legacyRequest = !opId;'),
    "Debe identificar solicitudes legacy sin opId");
assert.ok(handler.includes('opId = "OP-LEGACY-" + Utilities.getUuid().replace(/-/g, "");'),
    "Debe crear una clave interna única y compatible con el ledger");
assert.ok(handler.includes("const operationHash = computeCutOperationFingerprint_(payload);"),
    "Debe generar una huella estable para la operación legacy");
assert.ok(handler.includes('recordOpId(opId, vehicleId, cutSlotIndex, formattedDate, "pending", operationHash)'),
    "Debe reservar el slot antes de liberar el lock para Drive en vehículos existentes");
assert.ok(handler.includes('recordOpId(opId, newId, 1, formattedDate, "pending", operationHash)'),
    "Debe reservar el ID/fila nueva antes de liberar el lock para Drive");
assert.ok(handler.includes("opId: opId, operationHash: operationHash"),
    "Debe devolver las credenciales internas para que un reintento pueda ser idempotente");

const helperStart = source.indexOf("function runAdminDriveWorkOutsideScriptLock_");
const helperEnd = source.indexOf("\nfunction ", helperStart + 10);
const helper = source.slice(helperStart, helperEnd);
assert.ok(helper.includes('pendingError.opId = cleanOpId;') &&
    helper.includes('pendingError.operationHash = operationHash || "";'),
    "Los errores de reacquisición deben exponer la clave necesaria para recuperar la reserva");
assert.ok(helper.includes('" Reintenta con opId " + cleanOpId'),
    "Los errores de Drive deben indicar el opId de recuperación");

console.log("AdminLegacyCutReservation: 9/9 PASS — solicitudes legacy reservan slot/ID y liberan lock con clave recuperable");
