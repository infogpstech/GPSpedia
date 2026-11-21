import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function handleSuggestCutChange(payload) {");
const end = source.indexOf("\nfunction ", start + 10);
assert.ok(start >= 0 && end > start, "No se encontró handleSuggestCutChange");
const handler = source.slice(start, end);
assert.match(handler, /const releaseLockForDriveWork = \(\) => \{ if \(lockAcquired\) \{ lock\.releaseLock\(\); lockAcquired = false; \} \};/);

const preflight = handler.indexOf("findExistingCutSuggestionForRequest_(feedbackSheet, replayRequest)");
const driveUpload = handler.indexOf("saveSuggestionImageAttachment_(normalizedImage");
const lockAcquire = handler.indexOf("acquireFeedbackScriptLock_(lock)");
const recheck = handler.indexOf("findExistingCutSuggestionForRequest_(sheet, replayRequest)");
assert.ok(preflight >= 0 && preflight < driveUpload && driveUpload < lockAcquire,
    "El replay previo debe resolverse antes de Drive y del lock");
assert.ok(recheck > lockAcquire, "La operación debe revalidarse bajo lock después de Drive");
const replayStart = handler.indexOf("if (existing) {");
const replayEnd = handler.indexOf("\n        }", replayStart);
const replayBranch = handler.slice(replayStart, replayEnd);
assert.ok(replayBranch.indexOf("releaseLockForDriveWork();") < replayBranch.indexOf("trashReportImageUpload_(uploadedImage)"),
    "El duplicado descubierto bajo lock debe limpiarse después de liberar ScriptLock");

const catchStart = handler.indexOf("} catch (error) {");
const cleanupStart = handler.indexOf("if (!rowCommitted && uploadedImage && !appendAttempted)", catchStart);
const cleanup = handler.slice(cleanupStart);
assert.ok(cleanupStart > catchStart);
assert.ok(cleanup.indexOf("releaseLockForDriveWork();") < cleanup.indexOf("trashReportImageUpload_(uploadedImage)"),
    "Si appendRow no se intentó, se libera el lock antes de eliminar la imagen.");
assert.match(handler, /appendAttempted = true;/);
assert.match(cleanup, /else if \\(!rowCommitted && uploadedImage\\)\\s*\\{[\\s\\S]*?appendRow pudo persistir/);
assert.doesNotMatch(cleanup, /clearContent\\(\\)|rollbackConfirmed/);
assert.match(handler, /finally \\{ if \\(lockAcquired\\) lock\\.releaseLock\\(\\); \\}/);
console.log("FeedbackSuggestionImageCleanupOutsideLock: 5/5 PASS");
