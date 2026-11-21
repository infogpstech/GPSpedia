import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = source.indexOf("function handleMoveReplacedImage(payload, logMessage, developerContext) {");
const end = source.indexOf("\nfunction ", start + 10);
assert.ok(start >= 0 && end > start, "No se encontró handleMoveReplacedImage");
const handler = source.slice(start, end);

const releaseIndex = handler.indexOf("lock.releaseLock()");
const activityIndex = handler.indexOf("recordImageAdministrationActivity(postCommitActivity.developerContext");
const logIndex = handler.indexOf("logMessage && logMessage(");
const returnIndex = handler.lastIndexOf("return result;");
assert.ok(releaseIndex >= 0 && activityIndex > releaseIndex,
    "La actividad ADMIN debe ejecutarse después de liberar ScriptLock");
assert.ok(logIndex > releaseIndex, "El log de resultado debe ejecutarse después de liberar ScriptLock");
assert.ok(returnIndex > logIndex, "La respuesta debe devolverse después del trabajo post-commit best-effort");
assert.equal((handler.match(/recordImageAdministrationActivity\(/g) || []).length, 1,
    "Debe existir una única llamada de actividad en el handler");
assert.equal((handler.match(/logMessage && logMessage\(/g) || []).length, 1,
    "Debe existir una única llamada al logger en el handler");
assert.match(handler, /postCommitActivity = \{[\s\S]*?developerContext,[\s\S]*?idReemplazo,[\s\S]*?driveId,[\s\S]*?sourcePath,[\s\S]*?targetPath/);
assert.match(handler, /writeMetadata\(targetPath\)[\s\S]*?postCommitActivity =/);
assert.match(handler, /if \(sourceFolder\.getId\(\) === targetFolder\.getId\(\)\)\s*\{[\s\S]*?return \{ status: "success"/,
    "El camino de carpeta idéntica conserva su respuesta y no genera actividad de movimiento");

console.log("AdminMoveImageActivityOutsideLock: 7/7 PASS");
