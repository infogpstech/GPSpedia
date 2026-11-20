import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function handleReportProblem(payload)");
const end = source.indexOf("\nfunction enforceFeedbackRateLimit_", start);
assert.ok(start >= 0 && end > start, "No se encontró handleReportProblem");
const handler = source.slice(start, end);

let passed = 0;
function test(name, fn) { fn(); passed++; }

test("el reporte se consulta antes de Drive y del ScriptLock", () => {
    const preflight = handler.indexOf("findReportByReportId_(feedbackSheet,reportContext.reportId,preflightMetadataColumn)");
    const upload = handler.indexOf("saveReportImageAttachment_(imageAttachment,reportContext.reportId)");
    const acquire = handler.indexOf("acquireFeedbackScriptLock_(lock)");
    const recheck = handler.indexOf("findReportByReportId_(sheet,reportContext.reportId,metadataColumn)");
    assert.ok(preflight >= 0 && preflight < upload && upload < acquire);
    assert.ok(recheck > acquire, "Debe revalidar dentro del lock si el reporte se creó después del preflight");
});
test("el preflight solo usa metadata existente y no crea columnas fuera del lock", () => {
    const readOnlyLookup = handler.indexOf("getReportMetadataColumn(feedbackSheet)");
    const schemaEnsure = handler.indexOf("ensureReportMetadataColumn(sheet)");
    const acquire = handler.indexOf("acquireFeedbackScriptLock_(lock)");
    assert.ok(readOnlyLookup >= 0 && readOnlyLookup < acquire);
    assert.ok(schemaEnsure > acquire);
});
test("replay con imagen idéntica evita una nueva carga a Drive", () => {
    const oldImage = handler.indexOf("const oldImage=normalizeReportImageMetadata_(preflightExisting.metadata)");
    const hashCheck = handler.indexOf("oldImage.imageSha256!==imageAttachment.sha256", oldImage);
    const earlyReturn = handler.indexOf("alreadyReported:true", hashCheck);
    const upload = handler.indexOf("saveReportImageAttachment_(imageAttachment,reportContext.reportId)");
    assert.ok(oldImage >= 0 && hashCheck > oldImage && earlyReturn > hashCheck && earlyReturn < upload);
});
test("replay sin adjunto devuelve el reporte existente antes del lock", () => {
    const noImage = handler.indexOf("if(!imageAttachment)", handler.indexOf("preflightExisting"));
    const response = handler.indexOf("alreadyReported:true", noImage);
    const lock = handler.indexOf("LockService.getScriptLock()");
    assert.ok(noImage >= 0 && response > noImage && response < lock);
});
test("una carrera posterior al preflight se revalida bajo lock y conserva limpieza segura", () => {
    const lock = handler.indexOf("acquireFeedbackScriptLock_(lock)");
    const recheck = handler.indexOf("findReportByReportId_(sheet,reportContext.reportId,metadataColumn)");
    const imageCleanup = handler.indexOf("trashReportImageUpload_(uploadedImage)", recheck);
    assert.ok(lock >= 0 && recheck > lock && imageCleanup > recheck);
    assert.match(handler, /if\(lockAcquired\) lock\.releaseLock\(\)/);
});
console.log("FeedbackReportPreflightOutsideLock: " + passed + "/" + passed + " PASS — replay antes de Drive/lock y revalidación crítica");
