import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function handleAddProblem(source) {");
const end = source.indexOf("\nfunction ", start + 10);
assert.ok(start >= 0 && end > start, "No se encontró handleAddProblem");
const handler = source.slice(start, end);
const lockIndex = handler.indexOf("const lock = LockService.getScriptLock()");
const verifyIndex = handler.indexOf("verifyPendingPysImageFile_(preflightOp, image, folder)");
assert.ok(verifyIndex >= 0 && verifyIndex < lockIndex,
    "El archivo pending debe verificarse con Drive antes de adquirir el ScriptLock");
assert.doesNotMatch(handler.slice(lockIndex), /verifyPendingPysImageFile_\(/,
    "No debe quedar ninguna llamada Drive de verificación pending dentro del lock");
assert.match(handler, /const preflightMatchesPending = preflightOp &&[\s\S]*?String\(preflightOp\.imageFileId\) === String\(op\.imageFileId\)/,
    "El snapshot prevalidado debe compararse con la reserva actual bajo lock");
assert.match(handler, /if \(pendingVerificationError\)[\s\S]*?status: "RECOVERY_REQUIRED"/,
    "Una verificación previa fallida debe conservar la marca de recuperación bajo lock");
const verifyStart = source.indexOf("function verifyPendingPysImageFile_");
const verifyEnd = source.indexOf("\nfunction ", verifyStart + 10);
const verifyHelper = source.slice(verifyStart, verifyEnd);
for (const contract of ["DriveApp.getFileById", "getMimeType()", "getSize()", "getDescription()", "getParents()", "assertPysImageFolderPermissions_"]) {
    assert.ok(verifyHelper.includes(contract), "Se perdió la comprobación de archivo: " + contract);
}
console.log("FeedbackPysPendingImageVerificationOutsideLock: 5/5 PASS");
