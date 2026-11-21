import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
function block(name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const end = source.indexOf("\nfunction ", start + 10);
    return source.slice(start, end < 0 ? source.length : end);
}
const indexCode = block("readFeedbackReportImageEventsIndex_");
const metadataCode = block("getFeedbackReportImageMetadata_");
const headers = ["eventId", "reportId", "userId", "imageFileId", "imageUrl",
    "imageName", "imageMimeType", "imageSize", "imageSha256", "createdAt"];
function makeIndex(rows) {
    const calls = [];
    const sheet = {
        getLastRow: () => rows.length + 1,
        getRange(...args) {
            calls.push(args);
            return { getValues: () => rows.map(row => row.slice()) };
        }
    };
    const read = new Function("getSpreadsheet", "FEEDBACK_REPORT_IMAGE_EVENTS_SHEET",
        "FEEDBACK_REPORT_IMAGE_EVENT_HEADERS", indexCode + "\nreturn readFeedbackReportImageEventsIndex_;")(
        () => ({ getSheetByName: () => sheet }), "FeedbackReportImageEvents", headers
    );
    return { index: read(), calls };
}
let passed = 0;
function test(name, fn) { fn(); passed++; console.log("PASS " + name); }

test("construye índice por reportId con primer evento y cuenta duplicados equivalentes", () => {
    const rows = [
        ["EV-1", "REP-1", "U1", "FILE-1", "url-1", "a.png", "image/png", 100, "sha-1", "t1"],
        ["EV-2", "REP-1", "U1", "FILE-2", "url-2", "a.png", "image/png", 100, "sha-1", "t2"],
        ["EV-3", "REP-2", "U2", "FILE-3", "url-3", "b.png", "image/png", 200, "sha-2", "t3"]
    ];
    const h = makeIndex(rows);
    assert.equal(h.index.size, 2);
    assert.equal(h.index.get("REP-1").metadata.imageFileId, "FILE-1");
    assert.equal(h.index.get("REP-1").duplicateCount, 1);
    assert.equal(h.index.get("REP-2").metadata.imageFileId, "FILE-3");
    assert.equal(h.calls.length, 1, "El ledger se lee una sola vez.");
});

test("marca conflictos por reportId sin bloquear reportes no relacionados", () => {
    const rows = [
        ["EV-1", "REP-BAD", "U1", "FILE-1", "url-1", "a.png", "image/png", 100, "sha-1", "t1"],
        ["EV-2", "REP-BAD", "U1", "FILE-2", "url-2", "b.png", "image/png", 200, "sha-2", "t2"],
        ["EV-3", "REP-GOOD", "U2", "FILE-3", "url-3", "c.png", "image/png", 300, "sha-3", "t3"]
    ];
    const h = makeIndex(rows);
    assert.equal(h.index.get("REP-BAD").conflict, true);
    assert.equal(h.index.get("REP-GOOD").conflict, false);
    const resolve = new Function("normalizeReportImageMetadata_", "findFeedbackReportImageEventByReportId_",
        metadataCode + "\nreturn getFeedbackReportImageMetadata_;")(
        () => null, () => { throw new Error("No debe buscar un evento individual con índice disponible"); }
    );
    assert.throws(() => resolve("REP-BAD", null, h.index), /contradictorios/);
    assert.equal(resolve("REP-GOOD", null, h.index).imageFileId, "FILE-3");
});

test("el índice vacío evita búsquedas repetidas cuando no existe ledger de eventos", () => {
    const read = new Function("getSpreadsheet", "FEEDBACK_REPORT_IMAGE_EVENTS_SHEET",
        "FEEDBACK_REPORT_IMAGE_EVENT_HEADERS", indexCode + "\nreturn readFeedbackReportImageEventsIndex_;")(
        () => ({ getSheetByName: () => null }), "FeedbackReportImageEvents", headers
    );
    const index = read();
    assert.ok(index instanceof Map);
    assert.equal(index.size, 0);
});

test("la metadata usa el índice sin consultar el evento individual", () => {
    const metadata = { imageFileId: "FILE-1", imageUrl: "url-1", imageName: "a.png",
        imageMimeType: "image/png", imageSize: 100, imageSha256: "sha-1" };
    const map = new Map([["REP-1", { metadata }]]);
    const resolve = new Function("normalizeReportImageMetadata_", "findFeedbackReportImageEventByReportId_",
        metadataCode + "\nreturn getFeedbackReportImageMetadata_;")(
        () => null, () => { throw new Error("No debe buscar un evento individual con índice disponible"); }
    );
    assert.equal(resolve("REP-1", null, map), metadata);
});

test("la bandeja de reportes propios agrupa eventos antes de mapear las filas", () => {
    const handler = block("handleGetMyProblemReports");
    assert.match(handler, /const imageEventsIndex = needsImageEventIndex \? readFeedbackReportImageEventsIndex_\(\) : null/);
    assert.match(handler, /mapInboxFeedbackRow_\(entry\.row, metadataColumn, imageEventsIndex\)/);
    assert.ok(handler.indexOf("const imageEventsIndex") < handler.indexOf("const ownedReports = ownedEntries.map"));
    const mapper = block("mapInboxFeedbackRow_");
    assert.match(mapper, /getFeedbackReportImageMetadata_\(reportMetadata\.reportId,reportMetadata,imageEventsIndex\)/);
});

console.log("FeedbackInboxImageEventBatchRead: " + passed + "/" + passed + " PASS — un read-back de eventos para la bandeja de reportes");
