import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
const start = source.indexOf("function handleAllocateVehicleId(payload)");
const end = source.indexOf("\nfunction assertDeveloperForIdMaintenance", start);
assert.ok(start >= 0 && end > start, "No se encontró handleAllocateVehicleId");
const handler = source.slice(start, end);
assert.match(handler, /lock\.waitLock\(2000\)/, "La asignación debe esperar solo la ventana breve de contención");
assert.doesNotMatch(handler, /waitLock\(30000\)/, "La asignación no debe mantener una espera prolongada");
assert.match(handler, /busyError\.code\s*=\s*"WRITE_BUSY"/, "Debe devolver un error reintentable cuando WRITE está ocupado");
assert.match(handler, /if\s*\(lockAcquired\)\s*lock\.releaseLock\(\)/, "Solo debe liberar el lock si fue adquirido");
assert.ok(handler.indexOf("lock.waitLock(2000)") < handler.indexOf("assertDeveloperForIdMaintenance"),
    "La sección crítica debe comenzar antes de validar y asignar el ID");
console.log("WriteIdAllocatorNonBlocking: 5/5 PASS — asignador tolera contención breve sin retener el lock durante otras tareas");
