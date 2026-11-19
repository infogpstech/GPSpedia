import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
const start = source.indexOf("function handleAllocateVehicleId(payload)");
const end = source.indexOf("\nfunction assertDeveloperForIdMaintenance", start);
assert.ok(start >= 0 && end > start, "No se encontró handleAllocateVehicleId");
const handler = source.slice(start, end);
assert.match(handler, /lock\.tryLock\(0\)/, "La asignación debe intentar el lock sin espera");
assert.doesNotMatch(handler, /waitLock\(/, "La asignación no debe esperar el ScriptLock global");
assert.match(handler, /busyError\.code\s*=\s*"WRITE_BUSY"/, "Debe devolver un error reintentable cuando WRITE está ocupado");
assert.match(handler, /if\s*\(lockAcquired\)\s*lock\.releaseLock\(\)/, "Solo debe liberar el lock si fue adquirido");
assert.ok(handler.indexOf("lock.tryLock(0)") < handler.indexOf("assertDeveloperForIdMaintenance"),
    "La sección crítica debe comenzar antes de validar y asignar el ID");
console.log("WriteIdAllocatorNonBlocking: 5/5 PASS — asignador no espera ni retiene el ScriptLock cuando WRITE está ocupado");
