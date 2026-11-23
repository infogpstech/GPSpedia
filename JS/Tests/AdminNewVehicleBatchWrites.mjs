import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const write = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
const api = readFileSync(new URL("../Frontend/api-config.js", import.meta.url), "utf8");

const legacyStart = admin.indexOf("function handleAddOrUpdateCut(payload, logMessage, developerContext)");
const legacyEnd = admin.indexOf("\\nfunction sanitizeSupplementaryRichText_", legacyStart);
assert.ok(legacyStart >= 0 && legacyEnd > legacyStart, "No se encontró la ruta de compatibilidad ADMIN.");
const legacy = admin.slice(legacyStart, legacyEnd);
assert.match(legacy, /ACTION_MOVED_TO_WRITE/);
assert.doesNotMatch(legacy, /setValues\(|setValue\(|UrlFetchApp|requestNextVehicleIdFromWriteService/,
    "ADMIN debe rechazar la ruta antigua sin conservar escrituras ni llamadas backend→backend.");

assert.match(api, /'addOrUpdateCut': 'WRITE'/);
assert.match(api, /'allocateVehicleId': 'WRITE'/);

const handlerStart = write.indexOf("function handleAddOrUpdateCut(payload)");
const handlerEnd = write.indexOf("\\nconst CORTES_ID_COUNTER_PROPERTY", handlerStart);
assert.ok(handlerStart >= 0 && handlerEnd > handlerStart, "WRITE debe conservar el handler canónico de alta.");
const handler = write.slice(handlerStart, handlerEnd);
assert.ok(handler.includes("recordOpId"), "WRITE debe conservar el registro idempotente de operación.");
assert.ok(handler.includes("SpreadsheetApp.flush()"), "WRITE debe confirmar las escrituras antes de completar la operación.");
assert.ok(handler.includes("runWriteContributionDriveWorkOutsideScriptLock_") ||
    handler.includes("runAdminContributionDriveWorkOutsideScriptLock_") ||
    handler.includes("DriveApp"),
    "El flujo WRITE debe conservar el procesamiento de recursos de Drive.");
assert.ok(handler.includes("getRange") && handler.includes("setValues"),
    "Las escrituras del vehículo nuevo deben pertenecer al servicio WRITE.");
console.log("AdminNewVehicleBatchWrites: PASS — alta y escrituras agrupadas pertenecen a WRITE; ADMIN legacy no coordina ni escribe");
