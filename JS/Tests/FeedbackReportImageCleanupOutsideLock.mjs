import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function handleReportProblem(payload) {");
const end = source.indexOf("\nfunction ", start + 10);
assert.ok(start >= 0 && end > start, "No se encontró handleReportProblem");
const handler = source.slice(start, end);
assert.match(handler, /const releaseLockForDriveWork = \(\) => \{ if \(lockAcquired\) \{ lock\.releaseLock\(\); lockAcquired = false; \} \};/);

const duplicateStart = handler.indexOf("if(imageAttachment) {");
const duplicateEnd = handler.indexOf("if(!duplicateReport)", duplicateStart);
const duplicateBranch = handler.slice(duplicateStart, duplicateEnd);
assert.ok(duplicateBranch.indexOf("releaseLockForDriveWork();") < duplicateBranch.indexOf("trashReportImageUpload_(uploadedImage)"),
    "La imagen duplicada debe enviarse a papelera después de liberar ScriptLock");

const catchStart = handler.indexOf("} catch(error) {");
const rollback = handler.slice(catchStart);
const cleanupStart = rollback.indexOf("if(uploadedImage &&");
assert.ok(cleanupStart >= 0);
const cleanup = rollback.slice(cleanupStart);
assert.ok(cleanup.indexOf("releaseLockForDriveWork();") < cleanup.indexOf("trashReportImageUpload_(uploadedImage)"),
    "El rollback confirmado debe limpiar Drive después de liberar ScriptLock");
assert.match(cleanup, /else if\(uploadedImage\)\s*\{\s*console\.error/,
    "Si no se confirma rollback, el archivo debe conservarse y no enviarse a papelera");
assert.match(handler, /finally \{ if\(lockAcquired\) lock\.releaseLock\(\); \}/);
console.log("FeedbackReportImageCleanupOutsideLock: 5/5 PASS");
