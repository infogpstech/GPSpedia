import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const write = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
const api = readFileSync(new URL("../Frontend/api-config.js", import.meta.url), "utf8");

assert.equal(admin.includes("requestNextVehicleIdFromWriteService"), false,
    "ADMIN no debe coordinar la asignación de IDs mediante una llamada backend→backend.");
const legacyStart = admin.indexOf("function handleAddOrUpdateCut(payload, logMessage, developerContext)");
const legacyEnd = admin.indexOf("\\nfunction sanitizeSupplementaryRichText_", legacyStart);
assert.ok(legacyStart >= 0 && legacyEnd > legacyStart, "La ruta de compatibilidad ADMIN debe permanecer identificable.");
const legacyHandler = admin.slice(legacyStart, legacyEnd);
assert.match(legacyHandler, /ACTION_MOVED_TO_WRITE/);
assert.doesNotMatch(legacyHandler, /UrlFetchApp|requestNextVehicleIdFromWriteService|lock\\.tryLock/,
    "El handler legacy debe rechazar la acción sin ejecutar coordinación ni escrituras.");
assert.match(api, /'addOrUpdateCut': 'WRITE'/,
    "El frontend debe resolver la acción de alta directamente hacia WRITE.");

const start = write.indexOf("function handleAddOrUpdateCut(payload)");
const end = write.indexOf("\nconst CORTES_ID_COUNTER_PROPERTY", start);
assert.ok(start >= 0 && end > start, "No se encontró el handler canónico de WRITE.");
const handler = write.slice(start, end);
const allocation = handler.indexOf("reserveCortesVehicleIdForOperation_");
const lock = handler.indexOf("lock.tryLock(0)");
assert.ok(allocation >= 0 && lock > allocation,
    "WRITE debe reservar el ID idempotente antes de adquirir su ScriptLock.");
assert.ok(handler.includes("preparedRequest.preallocatedVehicleId"),
    "La fila nueva debe consumir el ID preasignado dentro de WRITE.");
assert.ok(!handler.includes("waitLock(30000)"),
    "WRITE no debe esperar 30 segundos para adquirir la sección crítica.");

console.log("AdminVehicleIdOutsideLock: 5/5 PASS — asignación local en WRITE, frontend directo y reserva previa al lock");
