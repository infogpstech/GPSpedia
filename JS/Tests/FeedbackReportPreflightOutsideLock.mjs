import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function handleReportProblem(payload)");
const end = source.indexOf("\nfunction enforceFeedbackRateLimit_(", start);
assert.ok(start >= 0 && end > start, "No se encontró handleReportProblem");
const handler = source.slice(start, end);
let passed = 0;
function test(name, fn) { fn(); passed++; }

test("el reporte se consulta antes de Drive y las nuevas escrituras no adquieren ScriptLock", () => {
    const preflight = handler.indexOf("findReportByReportId_(feedbackSheet, reportContext.reportId, existingMetadataColumn)");
    const upload = handler.indexOf("saveReportImageAttachment_(imageAttachment, reportContext.reportId)");
    const append = handler.indexOf("feedbackSheet.appendRow(reportRow)");
    assert.ok(preflight >= 0 && preflight < upload && upload < append);
    assert.equal(handler.indexOf("LockService.getScriptLock()"), -1);
    assert.equal(handler.indexOf("acquireFeedbackScriptLock_"), -1);
});
test("el esquema se asegura sin lock y antes de construir la fila append-only", () => {
    const ensure = handler.indexOf("ensureReportMetadataColumn(feedbackSheet)");
    const row = handler.indexOf("const reportRow = new Array(lastColumn).fill("")");
    assert.ok(ensure >= 0 && row > ensure);
    assert.equal(handler.indexOf("ensureReportMetadataColumn(sheet)"), -1);
});
test("el reporte se anexa completo y la confirmación busca el ID reservado", () => {
    const append = handler.indexOf("feedbackSheet.appendRow(reportRow)");
    const lookup = handler.indexOf("findFeedbackRowById_(feedbackSheet, reservedId, lastColumn)");
    assert.ok(append >= 0 && lookup > append);
    assert.match(handler, /reportRow\[COLS_FEEDBACKS\.ID - 1\] = reservedId/);
    assert.match(handler, /reportRow\[COLS_FEEDBACKS\.Problema - 1\] = normalizedProblemText/);
    assert.doesNotMatch(handler, /getRange\([^\n]*\)\.setValue|\.setValues\(/);
});
test("los adjuntos se registran en un ledger append-only separado", () => {
    const rowAppend = handler.indexOf("feedbackSheet.appendRow(reportRow)");
    const imageEvent = handler.indexOf("appendFeedbackReportImageEvent_(reportContext.reportId, userId, uploadedImage)");
    assert.ok(rowAppend >= 0 && imageEvent > rowAppend);
    assert.match(handler, /isFeedbackReportImageFileReferenced_\(uploadedImage\.metadata\.imageFileId\)/);
    assert.doesNotMatch(handler, /reportMetadata\)\.setValue|pendingExistingMetadata/);
});
test("replay con imagen idéntica evita una nueva carga a Drive", () => {
    const oldImage = handler.indexOf("const oldImage = normalizeReportImageMetadata_(existing.metadata)");
    const hashCheck = handler.indexOf("oldImage.imageSha256 !== imageAttachment.sha256", oldImage);
    const earlyReturn = handler.indexOf("alreadyReported: true", hashCheck);
    const upload = handler.indexOf("saveReportImageAttachment_(imageAttachment, reportContext.reportId)");
    assert.ok(oldImage >= 0 && hashCheck > oldImage && earlyReturn > hashCheck && earlyReturn < upload);
});
test("una carrera posterior al preflight se reconcilia por reportId y first-write-wins", () => {
    const append = handler.indexOf("feedbackSheet.appendRow(reportRow)");
    const canonical = handler.indexOf("findReportByReportId_(feedbackSheet, reportContext.reportId, metadataColumn)", append);
    assert.ok(canonical > append);
    assert.match(handler, /duplicateReport = Number\(canonicalReport\.rowIndex\) !== Number\(persistedRow\.rowIndex\)/);
    assert.equal(handler.indexOf("LockService.getScriptLock()"), -1);
});
console.log("FeedbackReportPreflightOutsideLock: " + passed + "/" + passed + " PASS — append-only sin lock y adjuntos por eventos");
