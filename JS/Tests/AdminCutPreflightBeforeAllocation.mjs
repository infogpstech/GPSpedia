import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = source.indexOf("function handleAddOrUpdateCut(payload, logMessage, developerContext)");
const end = source.indexOf("\nfunction sanitizeSupplementaryRichText_", start);
assert.ok(start >= 0 && end > start, "No se encontró handleAddOrUpdateCut");
const handler = source.slice(start, end);

const validation = handler.indexOf("normalizeIdempotenciaOperationHash_(payload.operationHash");
const allocation = handler.indexOf("requestNextVehicleIdFromWriteService(payload)");
const lock = handler.indexOf("lock.tryLock(0)");
const duplicateValidation = handler.indexOf("normalizeIdempotenciaOperationHash_(payload.operationHash", validation + 1);

assert.ok(validation >= 0 && allocation > validation,
    "El contrato operationHash debe validarse antes de solicitar un ID remoto");
assert.ok(lock > allocation,
    "La asignación central WRITE debe continuar fuera del ScriptLock ADMIN");
assert.equal(duplicateValidation, -1,
    "La huella no debe recalcularse ni validarse otra vez dentro del ScriptLock");
assert.ok(handler.indexOf("findRowByOpId(sheet, opId)") > lock,
    "La recuperación idempotente debe seguir revalidándose dentro del lock");
assert.ok(handler.includes("newId = Number(preallocatedVehicleId)"),
    "La fila nueva debe utilizar el ID preasignado");

console.log("AdminCutPreflightBeforeAllocation: 5/5 PASS — hash validado antes de WRITE y lock, revalidación idempotente conservada");
