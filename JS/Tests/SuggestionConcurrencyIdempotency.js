import fs from "node:fs";
import assert from "node:assert/strict";
import crypto from "node:crypto";

function section(source, start, end) {
    const i = source.indexOf(start);
    const j = source.indexOf(end, i + start.length);
    if (i < 0 || j < 0) throw new Error("No se encontró el bloque " + start);
    return source.slice(i, j);
}

export function runSuggestionConcurrencyTests({ feedback, ui }) {
    const results = [];
    let passed = 0, failed = 0;
    const test = (name, fn) => {
        try { fn(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    };
    const uiBlock = section(ui, "function createSuggestionOperationId_()", "export function openSuggestCutModal(");
    const modalBlock = section(ui, "export function openSuggestCutModal(", "\nexport function openExpandMenuModal");
    const schemaBlock = section(feedback, "const FEEDBACK_REPORT_TEXT_MAX_LENGTH", "function parseCutSuggestionRecord(");
    const helperBlock = section(feedback, "function buildCutSuggestionRequestFingerprint_(", "function validateCutSuggestionReportContext_(");
    const handlerBlock = section(feedback, "function handleSuggestCutChange(", "\nfunction parseModelosAsociados(");
    const cols = { Usuario: 2, ID_vehiculo: 3, Problema: 4, "Se resolvio": 5 };
    const utilities = {
        DigestAlgorithm: { SHA_256: "SHA_256" },
        computeDigest(_algorithm, value) {
            return Array.from(crypto.createHash("sha256").update(String(value), "utf8").digest());
        }
    };
    const helperFactory = new Function("Utilities", "COLS_FEEDBACKS", helperBlock +
        "\nreturn { buildCutSuggestionRequestFingerprint_, buildLegacyCutSuggestionRequestFingerprint_, findCutSuggestionByOperation_, findCutSuggestionByRequest_, buildCutSuggestionReplayResponse_ };");
    const helpers = helperFactory(utilities, cols);
    const schemaFactory = new Function(schemaBlock + "\nreturn { normalizeFeedbackText_, normalizeSuggestionProposedValues, assertMeaningfulSuggestionChanges_ };");
    const schema = schemaFactory();

    test("UI genera el identificador con crypto seguro y rechaza fallback débil", () => {
        assert.ok(uiBlock.includes("cryptoApi.randomUUID"));
        assert.ok(uiBlock.includes("cryptoApi.getRandomValues"));
        assert.ok(uiBlock.includes("new Uint8Array(24)"));
        assert.ok(uiBlock.includes("throw new Error"));
        assert.ok(!/Math\.random/.test(uiBlock));
    });
    test("el formulario conserva el mismo identificador si el payload no cambia", () => {
        assert.ok(modalBlock.includes("lastSuggestionSubmissionSignature"));
        assert.ok(modalBlock.includes("submissionSignature !== lastSuggestionSubmissionSignature"));
        assert.ok(modalBlock.includes("payload.suggestionOperationId = suggestionOperationId"));
    });
    test("un cambio del payload rota el identificador de operación", () => {
        const i = modalBlock.indexOf("if (!suggestionOperationId || submissionSignature !== lastSuggestionSubmissionSignature)");
        assert.ok(i >= 0);
        assert.ok(modalBlock.indexOf("suggestionOperationId = createSuggestionOperationId_()", i) > i);
    });
    test("el backend valida el formato del identificador y conserva compatibilidad sin ID", () => {
        assert.ok(handlerBlock.includes("suggestionOperationId"));
        assert.ok(handlerBlock.includes("/^[A-Za-z0-9_-]{20,80}$/"));
        assert.ok(handlerBlock.includes("normalizedOperationId ||"));
        assert.ok(handlerBlock.includes("legacyRequestFingerprint"));
    });
    test("la huella SHA-256 incluye destino, actor, propuesta y hash de imagen", () => {
        const request = { reportId:"REP-1", vehicleId:"V1", corteIndex:2, userId:"U1",
            details:"detalle", proposedValues:{ tipo:"Ignición" }, imageSha256:"a".repeat(64) };
        const first = helpers.buildCutSuggestionRequestFingerprint_(request);
        assert.match(first, /^[a-f0-9]{64}$/);
        assert.equal(first, helpers.buildCutSuggestionRequestFingerprint_(request));
        assert.notEqual(first, helpers.buildCutSuggestionRequestFingerprint_({ ...request, details:"otro" }));
        assert.notEqual(first, helpers.buildCutSuggestionRequestFingerprint_({ ...request, imageSha256:"b".repeat(64) }));
        assert.notEqual(first, helpers.buildCutSuggestionRequestFingerprint_({ ...request, userId:"U2" }));
    });
    test("la búsqueda por operación devuelve el registro existente", () => {
        const record = { subType:"suggestion_cut", suggestionOperationId:"operation_12345678901234567890", requestFingerprint:"abc" };
        const sheet = makeSheet([["id","user","vehicle","problem"],["x","u","v",JSON.stringify(record)]]);
        const found = helpers.findCutSuggestionByOperation_(sheet, record.suggestionOperationId);
        assert.equal(found.rowNumber, 2);
        assert.equal(found.record.requestFingerprint, "abc");
    });
    test("una operación duplicada en filas distintas falla de forma cerrada", () => {
        const id = "operation_12345678901234567890";
        const record = { subType:"suggestion_cut", suggestionOperationId:id };
        const sheet = makeSheet([["h"],["", "", "", JSON.stringify(record)],["", "", "", JSON.stringify(record)]]);
        assert.throws(() => helpers.findCutSuggestionByOperation_(sheet, id), /duplicado/);
    });
    test("un registro parcial que contiene el ID no permite crear otro registro", () => {
        const id = "operation_12345678901234567890";
        const sheet = makeSheet([["h"],["", "", "", '{"suggestionOperationId":"' + id + '"']]);
        assert.throws(() => helpers.findCutSuggestionByOperation_(sheet, id), /incompleto/);
    });
    test("la respuesta idempotente conserva la fila y los metadatos de imagen", () => {
        const record = { suggestionOperationId:"operation_12345678901234567890", imageUrl:"https://drive.google.com/file/d/x/view" };
        const response = helpers.buildCutSuggestionReplayResponse_({ record }, "REP-1");
        assert.equal(response.status, "success");
        assert.equal(response.alreadyProcessed, true);
        assert.equal(response.imageAttached, true);
        assert.equal(response.suggestionData, record);
    });
    test("la huella legacy solo permite replay de registros históricos existentes", () => {
        const payload = { reportId:"REP-123", vehicleId:"VEH-1", corteIndex:1, userId:"USER-1",
            userName:"Técnico", details:"Corrección técnica", proposedValues:{ tipo:"Ignición" },
            suggestionOperationId:"operation_12345678901234567890" };
        const legacyFingerprint = helpers.buildLegacyCutSuggestionRequestFingerprint_(payload.details, payload.proposedValues, "");
        const legacyRecord = { subType:"suggestion_cut", reportId:payload.reportId, vehicleId:payload.vehicleId,
            corteIndex:payload.corteIndex, userId:payload.userId, requestFingerprint:legacyFingerprint, status:"pendiente_revision" };
        const sheet = makeSheet([["id","user","vehicle","problem","resolved"],
            ["legacy-id",payload.userName,payload.vehicleId,JSON.stringify(legacyRecord),false]]);
        const harness = makeHandler(sheet);
        const response = harness.handler(payload);
        assert.equal(response.alreadyProcessed, true);
        assert.equal(harness.uploadCount, 0);
        assert.equal(sheet.rows.filter(row => String(row[3] || "").includes('"subType":"suggestion_cut"')).length, 1);
    });
    test("el lock precede la lectura de fila, copia, escritura y flush y se libera en finally", () => {
        const lockAt = handlerBlock.indexOf("lock.waitLock(10000)");
        const tryAt = handlerBlock.indexOf("    try {", lockAt);
        const lastRowAt = handlerBlock.indexOf("sheet.getLastRow()", tryAt);
        const copyAt = handlerBlock.indexOf(".copyTo(", tryAt);
        const writeAt = handlerBlock.indexOf(".setValues(", tryAt);
        const flushAt = handlerBlock.indexOf("SpreadsheetApp.flush()", tryAt);
        const finallyAt = handlerBlock.indexOf("finally { lock.releaseLock(); }");
        assert.ok(lockAt >= 0 && tryAt > lockAt && lastRowAt > tryAt);
        assert.ok(copyAt > lastRowAt && writeAt > copyAt && flushAt > writeAt && finallyAt > flushAt);
    });
    test("el archivo se carga después de comprobar duplicados y bajo el mismo lock", () => {
        const lockAt = handlerBlock.indexOf("lock.waitLock(10000)");
        const duplicateAt = handlerBlock.indexOf("findCutSuggestionByOperation_");
        const uploadAt = handlerBlock.indexOf("saveSuggestionImageAttachment_");
        const finallyAt = handlerBlock.indexOf("finally { lock.releaseLock(); }");
        assert.ok(lockAt < duplicateAt && duplicateAt < uploadAt && uploadAt < finallyAt);
    });
    test("la reversión se confirma antes de enviar a papelera la imagen", () => {
        const rollbackAt = handlerBlock.indexOf("rollbackConfirmed = cleared && statusCleared");
        const trashAt = handlerBlock.indexOf("if (!rowCommitted && uploadedImage && rollbackConfirmed)");
        assert.ok(rollbackAt >= 0 && trashAt > rollbackAt);
        assert.ok(handlerBlock.includes("La imagen de sugerencia se conserva para reconciliación"));
    });
    test("el estado pendiente de revisión permanece explícito", () => {
        assert.ok(handlerBlock.includes('status: "pendiente_revision"'));
        assert.ok(handlerBlock.includes('setValue(false)'));
    });

    function makeSheet(initialRows) {
        const rows = initialRows.map(row => row.slice());
        let failSetValuesAt = 0, setValuesCalls = 0;
        const sheet = {
            rows,
            failNextSetValuesOnNextWrite(offset = 1) { failSetValuesAt = setValuesCalls + offset; },
            getLastRow() {
                let last = 0;
                rows.forEach((row, index) => { if (row.some(value => value !== "" && value !== null && value !== undefined)) last = index + 1; });
                return last;
            },
            getLastColumn() { return Math.max(8, ...rows.map(row => row.length)); },
            getDataRange() { return { getValues: () => rows.map(row => row.slice()) }; },
            getRange(row, column, rowCount = 1, columnCount = 1) {
                while (rows.length < row + rowCount - 1) rows.push([]);
                const range = {
                    getValues() {
                        return Array.from({ length: rowCount }, (_, r) =>
                            Array.from({ length: columnCount }, (_, c) => rows[row - 1 + r][column - 1 + c] ?? ""));
                    },
                    getValue() { return rows[row - 1][column - 1] ?? ""; },
                    setValues(values) {
                        setValuesCalls++; if (failSetValuesAt && setValuesCalls === failSetValuesAt) { failSetValuesAt = 0; throw new Error("write failure"); }
                        values.forEach((valuesRow, r) => valuesRow.forEach((value, c) => { rows[row - 1 + r][column - 1 + c] = value; }));
                    },
                    setValue(value) { rows[row - 1][column - 1] = value; },
                    clearContent() {
                        for (let r = 0; r < rowCount; r++) for (let c = 0; c < columnCount; c++) rows[row - 1 + r][column - 1 + c] = "";
                    },
                    copyTo(destination) {
                        const sourceRow = rows[row - 1].slice();
                        destination.setValues([Array.from({ length: destination.columnCount }, (_, c) => sourceRow[destination.column - 1 + c] ?? "")]);
                    }
                };
                return range;
            }
        };
        const originalGetRange = sheet.getRange;
        sheet.getRange = (row, column, rowCount = 1, columnCount = 1) => {
            const range = originalGetRange(row, column, rowCount, columnCount);
            range.column = column; range.columnCount = columnCount;
            return range;
        };
        return sheet;
    }

    function makeHandler(sheet, options = {}) {
        const events = [];
        let locked = false, uploadCount = 0, trashCount = 0;
        const lock = {
            waitLock() { if (locked) throw new Error("lock contention in synchronous harness"); locked = true; events.push("lock"); },
            releaseLock() { assert.equal(locked, true); locked = false; events.push("release"); }
        };
        const factory = new Function(
            "normalizeSuggestionProposedValues", "normalizeFeedbackText_", "assertMeaningfulSuggestionChanges_",
            "FEEDBACK_REPORT_TEXT_MAX_LENGTH", "normalizeSuggestionImageAttachment_", "validateCutSuggestionReportContext_",
            "LockService", "getSafeSheet", "SHEET_NAMES", "COLS_FEEDBACKS", "SpreadsheetApp",
            "saveSuggestionImageAttachment_", "trashReportImageUpload_", "logUserActivity", "console", "Utilities",
            helperBlock + "\n" + handlerBlock + "\nreturn handleSuggestCutChange;"
        );
        const handler = factory(
            schema.normalizeSuggestionProposedValues,
            schema.normalizeFeedbackText_,
            schema.assertMeaningfulSuggestionChanges_,
            2000,
            () => options.image ? { sha256:"a".repeat(64), bytes:[1], mimeType:"image/png", size:1 } : null,
            (reportId, vehicleId, corteIndex) => ({
                reportId, vehicleId, corteIndex,
                currentValues:{ tipo:"Bomba", ubicacion:"", colorCable:"", configRelay:"", activaTestigo:null }
            }),
            { getScriptLock: () => lock },
            () => sheet,
            { FEEDBACKS:"Feedbacks" }, cols,
            { flush() { events.push("flush"); } },
            () => { uploadCount++; return { file:{ id:"f" }, metadata:{ imageFileId:"file_1234567890", imageUrl:"https://drive.google.com/file/d/file_1234567890/view" } }; },
            () => { trashCount++; },
            () => {},
            { error() {} }, utilities
        );
        return { handler, events, get uploadCount(){return uploadCount;}, get trashCount(){return trashCount;}, isLocked:()=>locked };
    }
    const basePayload = () => ({
        reportId:"REP-123", vehicleId:"VEH-1", corteIndex:1, userId:"USER-1", userName:"Técnico",
        details:"Corrección técnica", proposedValues:{ tipo:"Ignición" },
        suggestionOperationId:"operation_12345678901234567890"
    });

    test("el primer envío guarda una sola fila con clave estable", () => {
        const sheet = makeSheet([["id","user","vehicle","problem","resolved"],["formula","","","",false]]);
        const harness = makeHandler(sheet);
        const response = harness.handler(basePayload());
        const stored = JSON.parse(sheet.rows.find(row => String(row[3] || "").includes('"suggestionOperationId"'))[3]);
        assert.equal(response.status, "success");
        assert.equal(stored.suggestionOperationId, basePayload().suggestionOperationId);
        assert.equal(stored.status, "pendiente_revision");
        assert.equal(harness.isLocked(), false);
    });
    test("reintento con la misma operación devuelve la fila previa sin duplicar imagen ni fila", () => {
        const sheet = makeSheet([["id","user","vehicle","problem","resolved"],["formula","","","",false]]);
        const harness = makeHandler(sheet, { image:true });
        const first = harness.handler(basePayload());
        const second = harness.handler(basePayload());
        const suggestions = sheet.rows.filter(row => String(row[3] || "").includes('"subType":"suggestion_cut"'));
        assert.equal(first.status, "success");
        assert.equal(second.alreadyProcessed, true);
        assert.equal(suggestions.length, 1);
        assert.equal(harness.uploadCount, 1);
    });
    test("el mismo identificador con contenido distinto se rechaza", () => {
        const sheet = makeSheet([["id","user","vehicle","problem","resolved"],["formula","","","",false]]);
        const harness = makeHandler(sheet);
        harness.handler(basePayload());
        assert.throws(() => harness.handler({ ...basePayload(), details:"contenido distinto" }), /solicitud distinta/);
        assert.equal(sheet.rows.filter(row => String(row[3] || "").includes('"subType":"suggestion_cut"')).length, 1);
    });
    test("dos envíos repetidos serializados no producen dos filas", () => {
        const sheet = makeSheet([["id","user","vehicle","problem","resolved"],["formula","","","",false]]);
        const harness = makeHandler(sheet);
        const p = basePayload();
        const first = harness.handler(p), second = harness.handler(p);
        assert.equal(first.status, "success");
        assert.equal(second.alreadyProcessed, true);
        assert.equal(sheet.rows.filter(row => String(row[3] || "").includes('"subType":"suggestion_cut"')).length, 1);
        assert.deepEqual(harness.events.filter(event => event === "lock" || event === "release"), ["lock","release","lock","release"]);
    });
    test("fallo de escritura libera el lock y permite reintento", () => {
        const sheet = makeSheet([["id","user","vehicle","problem","resolved"],["formula","","","",false]]);
        sheet.failNextSetValuesOnNextWrite(2);
        const harness = makeHandler(sheet);
        assert.throws(() => harness.handler(basePayload()), /write failure/);
        assert.equal(harness.isLocked(), false);
        const retry = harness.handler(basePayload());
        assert.equal(retry.status, "success");
    });
    test("fallo de escritura con estado de fila no verificable conserva imagen para reconciliación", () => {
        const sheet = makeSheet([["id","user","vehicle","problem","resolved"],["formula","","","",false]]);
        const original = sheet.getRange;
        sheet.getRange = (row, col, count, width) => {
            const range = original(row, col, count, width);
            if (row === 3 && col === cols.Usuario && count === 1 && width === 3) {
                range.clearContent = () => { throw new Error("rollback unavailable"); };
            }
            return range;
        };
        sheet.failNextSetValuesOnNextWrite(2);
        const harness = makeHandler(sheet, { image:true });
        assert.throws(() => harness.handler(basePayload()), /write failure/);
        assert.equal(harness.trashCount, 0);
        assert.equal(harness.isLocked(), false);
    });

    return { status: failed ? "FAIL" : "PASS", passed, failed, results };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const feedback = fs.readFileSync("Services/feedback.js", "utf8");
    const ui = fs.readFileSync("ui.js", "utf8");
    const result = runSuggestionConcurrencyTests({ feedback, ui });
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "PASS") process.exitCode = 1;
}
