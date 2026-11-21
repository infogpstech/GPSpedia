import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function handleSuggestCutChange(payload) {");
const end = source.indexOf("\nfunction parseModelosAsociados(", start);
assert.ok(start >= 0 && end > start, "No se encontró handleSuggestCutChange");
const handler = source.slice(start, end);

const preflight = handler.indexOf("findExistingCutSuggestionForRequest_(feedbackSheet, replayRequest)");
const driveUpload = handler.indexOf("saveSuggestionImageAttachment_(normalizedImage");
const append = handler.indexOf("sheet.appendRow(suggestionRow)");
const rowLookup = handler.indexOf("findFeedbackRowById_(sheet, reservedId, lastCol)");
const canonical = handler.indexOf("findExistingCutSuggestionForRequest_(sheet, replayRequest)", append);
assert.ok(preflight >= 0 && preflight < driveUpload && driveUpload < append);
assert.ok(rowLookup > append && canonical > rowLookup);
assert.equal(handler.indexOf("LockService.getScriptLock()"), -1);
assert.equal(handler.indexOf("acquireFeedbackScriptLock_"), -1);
assert.match(handler, /canonical\.rowNumber\) !== Number\(persistedRow\.rowIndex/);
assert.ok(handler.indexOf("trashReportImageUpload_(uploadedImage)") > canonical,
    "La carga de una fila perdedora se limpia solo después de resolver la fila canónica.");

const catchStart = handler.indexOf("} catch (error) {");
const cleanupStart = handler.indexOf("if (!rowCommitted && uploadedImage && !appendAttempted)", catchStart);
const cleanup = handler.slice(cleanupStart);
assert.ok(cleanupStart > catchStart);
assert.match(cleanup, /if \(!rowCommitted && uploadedImage && !appendAttempted\)\s*\{\s*trashReportImageUpload_\(uploadedImage\)/);
assert.match(cleanup, /else if \(!rowCommitted && uploadedImage\)\s*\{[\s\S]*?appendRow pudo persistir/);
assert.doesNotMatch(cleanup, /clearContent\(\)|releaseLock|rollbackConfirmed/);
assert.match(handler, /appendAttempted = true;/);
console.log("FeedbackSuggestionImageCleanupOutsideLock: 5/5 PASS — sin lock; limpieza solo tras reconciliar append");
