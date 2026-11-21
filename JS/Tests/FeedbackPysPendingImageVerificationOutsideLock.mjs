import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../Services/feedback.js",import.meta.url),"utf8");
const start=source.indexOf("function handleAddProblem(source) {");
const end=source.indexOf("\\nfunction withPysMutationLock_",start);
assert.ok(start>=0&&end>start,"No se encontró handleAddProblem");
const handler=source.slice(start,end);
assert.doesNotMatch(handler,/LockService\\.getScriptLock\\(\\)|acquireFeedbackScriptLock_\\(/,
 "La creación PyS no debe adquirir ScriptLock.");
assert.match(handler,/verifyPendingPysImageFile_\\(op, image, folder\\)/,
 "Los reintentos verifican la imagen canónica fuera de cualquier lock.");
assert.match(handler,/writePysOperation_\\(opsSheet, 0,[\\s\\S]*?status: "UPLOAD_PENDING"/,
 "La reserva nueva debe anexarse completa con su imagen en un solo registro.");
assert.match(source,/function writePysOperation_\\(sheet, rowNumber, record\\) \\{[\\s\\S]*?if \\(rowNumber\\) throw new Error/,
 "PysOperations no permite mutaciones de estado in-place.");
const verifyStart=source.indexOf("function verifyPendingPysImageFile_");
const verifyEnd=source.indexOf("\\nfunction ",verifyStart+10);
const helper=source.slice(verifyStart,verifyEnd);
for(const contract of ["DriveApp.getFileById","getMimeType()","getSize()","getDescription()","getParents()","assertPysImageFolderPermissions_"])assert.ok(helper.includes(contract));
console.log("FeedbackPysPendingImageVerificationOutsideLock: 5/5 PASS");
