import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = source.indexOf("function handleAddOrUpdateCut(payload, logMessage, developerContext)");
const end = source.indexOf("\nfunction sanitizeSupplementaryRichText_", start);
assert.ok(start >= 0 && end > start, "No se encontró handleAddOrUpdateCut");
const handler = source.slice(start, end);
const allocation = handler.indexOf("requestNextVehicleIdFromWriteService(payload)");
const lock = handler.indexOf("lock.tryLock(0)");
assert.ok(allocation >= 0 && lock > allocation,
    "La asignación central WRITE debe completarse antes de adquirir el ScriptLock ADMIN");
assert.ok(handler.includes("newId = Number(preallocatedVehicleId)"),
    "La fila nueva debe utilizar el ID preasignado, sin HTTP dentro de la sección crítica");
assert.ok(!handler.includes("waitLock(30000)"),
    "ADMIN no debe mantener una espera de 30 segundos para entrar en su sección crítica");
assert.ok(handler.includes('busyError.code = "ADMIN_BUSY"'),
    "La contención debe devolver un código de reintento inmediato");
console.log("AdminVehicleIdOutsideLock: 4/4 PASS — WRITE fuera del ScriptLock ADMIN y adquisición inmediata");
