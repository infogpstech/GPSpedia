import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function handleSuggestCutChange(payload) {");
const end = source.indexOf("\nfunction ", start + 10);
assert.ok(start >= 0 && end > start, "No se encontró handleSuggestCutChange");
const handler = source.slice(start, end);
assert.match(handler, /const releaseLockForDriveWork = \(\) => \{ if \(lockAcquired\) \{ lock\.releaseLock\(\); lockAcquired = false; \} \};/);

for (const branchName of ["if (existingByOperation)", "if (existingByRequest)"]) {
    const branchStart = handler.indexOf(branchName);
    const branchEnd = handler.indexOf("\n        }", branchStart);
    const branch = handler.slice(branchStart, branchEnd);
    assert.ok(branch.indexOf("releaseLockForDriveWork();") < branch.indexOf("trashReportImageUpload_(uploadedImage)"),
        branchName + " debe limpiar el duplicado después de liberar ScriptLock");
}

const catchStart = handler.indexOf("} catch (error) {");
const cleanupStart = handler.indexOf("if (!rowCommitted && uploadedImage &&", catchStart);
const cleanup = handler.slice(cleanupStart);
assert.ok(cleanup.indexOf("rollbackConfirmed") >= 0);
assert.ok(cleanup.indexOf("releaseLockForDriveWork();") < cleanup.indexOf("trashReportImageUpload_(uploadedImage)"),
    "La compensación solo debe eliminar el archivo después de confirmar rollback y liberar el lock");
assert.match(cleanup, /else if \(!rowCommitted && uploadedImage && !rollbackConfirmed\)\s*\{[\s\S]*?se conserva la imagen/);
assert.match(handler, /finally \{ if \(lockAcquired\) lock\.releaseLock\(\); \}/);
console.log("FeedbackSuggestionImageCleanupOutsideLock: 5/5 PASS");
