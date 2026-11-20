import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = source.indexOf("function handleUploadAdminImage(payload, logMessage)");
const end = source.indexOf("\n// ============================================================================\n// MICROSERVICIO REGISTRO DE CORTES", start);
assert.ok(start >= 0 && end > start, "No se encontró handleUploadAdminImage");
const handler = source.slice(start, end);
assert.ok(handler.includes("lock.waitLock(2000)") && !handler.includes("lock.waitLock(30000)"),
    "El reemplazo debe adquirir el lock sin espera prolongada");
assert.ok(handler.includes("runAdminContributionDriveWorkOutsideScriptLock_(lock, operationId"),
    "La preparación del archivo debe liberar el ScriptLock durante Drive");
assert.ok(handler.includes("genFolder.createFile(blob)") && handler.includes("DriveApp.getFileById(storedFileId)"),
    "La creación y recuperación del archivo deben estar dentro del trabajo Drive aislado");
assert.ok(handler.includes("latestUrl !== originalUrl") && handler.includes("latestFilename !== newFilename"),
    "La operación debe revalidar referencia activa y metadatos antes de persistir");
assert.ok(handler.includes("findAdminImageUploadOperation(operationSheet, operationId)"),
    "La operación debe revalidar el ledger por opId");
assert.ok(handler.includes('updateAdminImageUploadFileState_(newFile, operationId, contentHash, "linked", false)'),
    "La confirmación de metadata Drive también debe ejecutarse fuera del lock");
assert.ok(handler.includes('error.code === "ADMIN_LOCK_REACQUIRE_PENDING"'),
    "Si no puede readquirir, debe dejar la operación pendiente para reintentar el mismo opId");
assert.ok(handler.includes("if (lock.hasLock()) lock.releaseLock()"),
    "El finally no debe liberar un lock que ya no posee");
console.log("AdminImageUploadDriveIsolation: 9/9 PASS — Drive fuera del lock, revalidación y recuperación idempotente");
