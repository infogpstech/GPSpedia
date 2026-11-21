import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";

const feedback = fs.readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
function extract(name) {
    const start = feedback.indexOf("function " + name + "(");
    assert.ok(start >= 0, "Missing " + name);
    const next = feedback.indexOf("\nfunction ", start + 10);
    return feedback.slice(start, next < 0 ? feedback.length : next);
}
const headers = ["eventId", "opId", "vehicleId", "operationHash", "kind", "payloadJson",
    "actorId", "actorName", "createdAt", "status", "supersedesEventId"];
function makeSheet(rows = []) {
    return {
        rows: [headers.slice(), ...rows.map(row => row.slice())],
        getLastRow() { return this.rows.length; },
        getLastColumn() { return headers.length; },
        getRange(row, col, count = 1, width = 1) {
            const self = this;
            return {
                getDisplayValues() {
                    return Array.from({ length: count }, (_, i) =>
                        Array.from({ length: width }, (_, j) => String(self.rows[row - 1 + i]?.[col - 1 + j] ?? "")));
                },
                getValues() {
                    return Array.from({ length: count }, (_, i) =>
                        Array.from({ length: width }, (_, j) => self.rows[row - 1 + i]?.[col - 1 + j] ?? ""));
                }
            };
        },
        appendRow(row) { this.rows.push(row.slice()); }
    };
}
function makeUtilities() {
    let uuid = 0;
    return {
        DigestAlgorithm: { SHA_256: "SHA_256" },
        Charset: { UTF_8: "UTF-8" },
        computeDigest(_algorithm, value) {
            return Array.from(crypto.createHash("sha256").update(String(value), "utf8").digest());
        },
        getUuid() { uuid++; return "uuid-" + String(uuid).padStart(8, "0"); }
    };
}
let passed = 0;
function test(name, fn) { fn(); passed++; console.log("PASS " + name); }

test("el snapshot de años aplica eventos versionados en orden durable y conserva sus fuentes", () => {
    const ledger = makeSheet([
        ["EV-TO-00000001", "OP-YEAR-YSA-12345678901234567890123456789012-anoHasta", "101", "a".repeat(64),
            "vehicle_update", JSON.stringify({ fieldName: "anoHasta", value: 2020, expectedCurrentValue: "" }),
            "SYSTEM:FEEDBACK_YEAR", "Sistema", "2026-11-20T12:00:00.000Z", "accepted", ""],
        ["EV-FROM-0000001", "OP-YEAR-YSA-12345678901234567890123456789012-anoDesde", "101", "b".repeat(64),
            "vehicle_update", JSON.stringify({ fieldName: "anoDesde", value: 2018, expectedCurrentValue: 2020 }),
            "SYSTEM:FEEDBACK_YEAR", "Sistema", "2026-11-20T12:00:01.000Z", "accepted", ""]
    ]);
    const snapshot = new Function("COLS_CORTES", "getSpreadsheet", extract("getFeedbackProjectedVehicleYearSnapshot_") +
        "\nreturn getFeedbackProjectedVehicleYearSnapshot_;")(
        { anoDesde: 1, anoHasta: 2 }, () => ({ getSheetByName: () => ledger })
    )("101", [2020, ""]);
    assert.equal(snapshot.anoDesde, "2018");
    assert.equal(snapshot.anoHasta, "2020");
    assert.equal(snapshot.sourceFrom, "EV-FROM-0000001");
    assert.equal(snapshot.sourceTo, "EV-TO-00000001");
});

test("un evento con versión esperada distinta no desplaza el rango proyectado", () => {
    const ledger = makeSheet([
        ["EV-CONFLICT-1", "OP-ADMIN-FIELD-YEAR-1", "101", "a".repeat(64), "vehicle_update",
            JSON.stringify({ fieldName: "anoDesde", value: 2017, expectedCurrentValue: 2019 }),
            "DEV-1", "Admin", "2026-11-20T12:00:00.000Z", "accepted", ""]
    ]);
    const snapshot = new Function("COLS_CORTES", "getSpreadsheet", extract("getFeedbackProjectedVehicleYearSnapshot_") +
        "\nreturn getFeedbackProjectedVehicleYearSnapshot_;")(
        { anoDesde: 1, anoHasta: 2 }, () => ({ getSheetByName: () => ledger })
    )("101", [2020, 2022]);
    assert.equal(snapshot.anoDesde, "2020");
    assert.equal(snapshot.anoHasta, "2022");
});

test("un ledger malformado o un opId conflictivo no se interpreta como rango vigente", () => {
    const malformed = makeSheet([
        ["EV-BAD", "OP-BAD", "101", "invalid-hash", "vehicle_update",
            JSON.stringify({ fieldName: "anoDesde", value: 2017, expectedCurrentValue: 2018 }),
            "DEV-1", "Admin", "2026-11-20T12:00:00.000Z", "accepted", ""]
    ]);
    const readMalformed = new Function("COLS_CORTES", "getSpreadsheet", extract("getFeedbackProjectedVehicleYearSnapshot_") +
        "\nreturn getFeedbackProjectedVehicleYearSnapshot_;")(
        { anoDesde: 1, anoHasta: 2 }, () => ({ getSheetByName: () => malformed })
    );
    assert.throws(() => readMalformed("101", [2018, 2020]), /evento inválido/);

    const conflict = makeSheet([
        ["EV-A", "OP-ADMIN-SHARED", "101", "a".repeat(64), "vehicle_update",
            JSON.stringify({ fieldName: "anoDesde", value: 2017, expectedCurrentValue: 2018 }),
            "DEV-1", "Admin", "2026-11-20T12:00:00.000Z", "accepted", ""],
        ["EV-B", "OP-ADMIN-SHARED", "202", "b".repeat(64), "vehicle_update",
            JSON.stringify({ fieldName: "anoDesde", value: 2016, expectedCurrentValue: 2018 }),
            "DEV-2", "Admin", "2026-11-20T12:00:01.000Z", "accepted", ""]
    ]);
    const readConflict = new Function("COLS_CORTES", "getSpreadsheet", extract("getFeedbackProjectedVehicleYearSnapshot_") +
        "\nreturn getFeedbackProjectedVehicleYearSnapshot_;")(
        { anoDesde: 1, anoHasta: 2 }, () => ({ getSheetByName: () => conflict })
    );
    assert.equal(readConflict("101", [2018, 2020]).anoDesde, "2018");
});

test("append de ampliación es idempotente y rechaza reutilizar opId con otro contenido", () => {
    const ledger = makeSheet();
    const utilities = makeUtilities();
    const append = new Function("Utilities", "getSpreadsheet", "SpreadsheetApp",
        extract("appendFeedbackYearVehicleUpdateEvent_") + "\nreturn appendFeedbackYearVehicleUpdateEvent_;")(
        utilities, () => ({ getSheetByName: () => ledger }), { flush() {} }
    );
    const application = { row: ["YSA-12345678901234567890123456789012"] };
    const first = append(application, "101", "anoDesde", 2018, 2020, "");
    assert.equal(first.duplicate, false);
    assert.equal(ledger.rows.length, 2);
    assert.equal(ledger.rows[1][4], "vehicle_update");
    assert.equal(ledger.rows[1][6], "SYSTEM:FEEDBACK_YEAR");
    const replay = append(application, "101", "anoDesde", 2018, 2020, "");
    assert.equal(replay.duplicate, true);
    assert.equal(replay.eventId, first.eventId);
    assert.equal(ledger.rows.length, 2);
    assert.throws(() => append(application, "101", "anoDesde", 2017, 2020, ""), /contenido distinto/);
});

test("cada voto de año se anexa como una fila completa y no usa escrituras por celdas", () => {
    const handlerStart = feedback.indexOf("function handleSuggestYearLocked(");
    const handlerEnd = feedback.indexOf("\nfunction ", handlerStart + 10);
    const handler = feedback.slice(handlerStart, handlerEnd);
    const voteStart = handler.indexOf("if (!alreadyReported) {");
    const voteEnd = handler.indexOf("const allData = sheet.getDataRange()", voteStart);
    const voteWrite = handler.slice(voteStart, voteEnd);
    assert.match(voteWrite, /const voteRow = new Array\(lastCol\)\.fill\(""\)/);
    assert.match(voteWrite, /sheet\.appendRow\(voteRow\)/);
    assert.match(voteWrite, /getNextFormulaBasedId_\(sheet, COLS_FEEDBACKS\.ID\)/);
    assert.doesNotMatch(voteWrite, /getLastRow\(\) \+ 1/);
    assert.doesNotMatch(voteWrite, /getRange\([^\n]*\)\.setValue/);
    assert.doesNotMatch(voteWrite, /getRange\([^\n]*\)\.setValues/);
});
test("la identidad de una aplicación es determinista para el mismo rango y versión fuente", () => {
    const buildId = new Function("Utilities", extract("buildFeedbackYearApplicationId_") +
        "\nreturn buildFeedbackYearApplicationId_;")(makeUtilities());
    const proposal = {
        vehicleId: "101", year: 2018, previousFrom: 2020, previousTo: 2024,
        targetFrom: 2018, targetTo: 2024, previousRawFrom: 2020,
        previousSourceFromEventId: "EV-SOURCE-00000001",
        previousRawTo: 2024, previousSourceToEventId: ""
    };
    const first = buildId(proposal);
    assert.match(first, /^YSA-[a-f0-9]{64}$/);
    assert.equal(buildId({ ...proposal }), first);
    assert.notEqual(buildId({ ...proposal, targetFrom: 2017 }), first);
    assert.notEqual(buildId({ ...proposal, previousSourceFromEventId: "EV-SOURCE-00000002" }), first);
    assert.throws(() => buildId({ ...proposal, vehicleId: "invalid" }), /identidad estable/);
});
test("la recuperación agrupa duplicados idénticos y rechaza propuestas distintas", () => {
    const pending = extract("findPendingFeedbackYearApplication_");
    assert.match(pending, /const byOperation = new Map\(\)/);
    assert.match(pending, /sameProposal/);
    assert.match(pending, /rowIndexes: duplicateEntries\.map/);
    assert.match(pending, /byOperation\.size > 1/);
    const completion = extract("completeFeedbackYearApplication_");
    assert.match(completion, /application\.rowIndexes/);
    assert.match(completion, /updateApplicationRows\(9, "completed"\)/);
    assert.match(completion, /applicationRowIndexes\.some/);
});
test("el registro de aplicación de año se anexa como una fila completa", () => {
    const handlerStart = feedback.indexOf("function handleSuggestYearLocked(");
    const handlerEnd = feedback.indexOf("\nfunction ", handlerStart + 10);
    const handler = feedback.slice(handlerStart, handlerEnd);
    const applicationStart = handler.indexOf("const operationId = buildFeedbackYearApplicationId_(");
    const applicationEnd = handler.indexOf("return completeFeedbackYearApplication_", applicationStart);
    const applicationWrite = handler.slice(applicationStart, applicationEnd);
    assert.match(applicationWrite, /ledger\.appendRow\(applicationValues\)/);
    assert.match(applicationWrite, /savedApplications\.length !== 1/);
    assert.doesNotMatch(applicationWrite, /getLastRow\(\) \+ 1/);
    assert.doesNotMatch(applicationWrite, /getRange\([^\n]*\)\.setValues/);
});
test("la aplicación de año ya no escribe directamente en Cortes", () => {
    const completion = extract("completeFeedbackYearApplication_");
    assert.match(completion, /appendFeedbackYearVehicleUpdateEvent_/);
    assert.doesNotMatch(completion, /cortesSheet\.getRange\([^\n]*\)\.setValue/);
    assert.doesNotMatch(completion, /targetColumn/);
    const handlerStart = feedback.indexOf("function handleSuggestYearLocked(");
    const handlerEnd = feedback.indexOf("\nfunction ", handlerStart + 10);
    const handler = feedback.slice(handlerStart, handlerEnd);
    assert.match(handler, /getFeedbackProjectedVehicleYearSnapshot_\(/);
    assert.doesNotMatch(handler, /cortesSheet\.getRange\([^\n]*\)\.setValue/);
    assert.match(handler, /buildFeedbackYearApplicationId_\(/);
    assert.doesNotMatch(handler, /Utilities\.getUuid\(\)/);
    assert.doesNotMatch(handler, /Math\.random/);
});

console.log("FeedbackYearApplicationAppendOnly: " + passed + "/" + passed + " PASS");
