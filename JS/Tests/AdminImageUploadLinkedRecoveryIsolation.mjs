import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = source.indexOf("function handleUploadAdminImage(payload, logMessage)");
const end = source.indexOf("\n// ============================================================================\n// MICROSERVICIO REGISTRO DE CORTES", start);
assert.ok(start >= 0 && end > start, "No se encontró handleUploadAdminImage");
const handler = source.slice(start, end);
const linked = handler.indexOf('if (status === "linked")');
const driveCheck = handler.indexOf("const linkedDriveCheck = runAdminContributionDriveWorkOutsideScriptLock_(lock, operationId", linked);
const history = handler.indexOf("historyRecord = recordReplacedImage(", linked);
const finalState = handler.indexOf('updateAdminImageUploadFileState_(newFile, operationId, contentHash, "linked", false)', linked);
assert.ok(linked >= 0 && driveCheck > linked, "La recuperación linked debe liberar el ScriptLock para verificar Drive");
assert.ok(history > driveCheck && finalState > history, "La historia se conserva en la sección Spreadsheet y la metadata Drive se confirma después");
assert.ok(handler.includes('String(latestOperation.values[9]) !== "linked"') &&
    handler.includes('String(latestOperation.values[4] || "") !== newImageUrl'),
    "La recuperación debe revalidar ledger y URL antes de confirmar");
assert.ok(handler.includes('if (descriptionError && descriptionError.code === "ADMIN_LOCK_REACQUIRE_PENDING") throw descriptionError'),
    "Si no se recupera el lock, el error pendiente debe llegar al handler exterior sin escribir fuera de la sección crítica");
console.log("AdminImageUploadLinkedRecoveryIsolation: 5/5 PASS — recuperación linked sin retener el ScriptLock durante Drive");
