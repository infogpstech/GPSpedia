import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
const start = source.indexOf("const IMAGE_UPLOAD_EVENTS_SHEET_NAME_");
const end = source.indexOf("const IMAGE_UPLOAD_MAX_BYTES", start);
assert.ok(start >= 0 && end > start, "No se encontró el diario append-only de imágenes");
const code = source.slice(start, end);

let uuid = 0;
const Utilities = { getUuid: () => "00000000-0000-4000-8000-" + String(++uuid).padStart(12, "0") };
const SpreadsheetApp = { flush() {} };
let activeSheet = null;
const spreadsheet = {
    getSheetByName: name => name === "ImageUploadEvents" ? activeSheet : null,
    insertSheet: () => (activeSheet = fakeSheet())
};
const runtime = new Function("Utilities", "SpreadsheetApp", "getSpreadsheet", "Logger", code +
    "\nreturn { headers: IMAGE_UPLOAD_EVENTS_HEADERS_, create: getOrCreateImageUploadEventsSheet_, append: appendImageUploadEvent_, read: readImageUploadEventsByToken_, project: projectImageUploadEvents_, transition: appendImageUploadEventTransition_, findByOperationKey: findImageUploadEventsByOperationKey_ };"
)(Utilities, SpreadsheetApp, () => spreadsheet, { log() {} });

function fakeSheet() {
    const rows = [];
    const sheet = {
        rows,
        onAppend: null,
        getLastRow() { return rows.length; },
        getLastColumn() { return Math.max(0, ...rows.map(row => row.length)); },
        setFrozenRows() {},
        getRange(row, column, rowCount = 1, columnCount = 1) {
            const range = {
                setValues(values) {
                    values.forEach((line, r) => {
                        rows[row - 1 + r] = rows[row - 1 + r] || [];
                        line.forEach((value, c) => { rows[row - 1 + r][column - 1 + c] = value; });
                    });
                },
                getValues() {
                    return Array.from({ length: rowCount }, (_, r) =>
                        Array.from({ length: columnCount }, (_, c) => rows[row - 1 + r]?.[column - 1 + c] ?? ""));
                },
                getDisplayValues() {
                    return this.getValues().map(line => line.map(value => String(value ?? "")));
                },
                createTextFinder(needle) {
                    return {
                        matchCase() { return this; },
                        matchEntireCell() { return this; },
                        findAll() {
                            const found = [];
                            rows.slice(row - 1, row - 1 + rowCount).forEach((line, offset) => {
                                if (String(line[column - 1] ?? "") === String(needle)) found.push({ getRow: () => row + offset });
                            });
                            return found;
                        }
                    };
                }
            };
            return range;
        },
        appendRow(row) {
            if (this.onAppend) this.onAppend(row);
            rows.push(row.slice());
        }
    };
    return sheet;
}
function event(overrides = {}) {
    return {
        token: "tok-1", operationKey: "OP-1|20|imgCorte", folderId: "folder-1",
        mimeType: "image/png", sizeBytes: 3, contentHash: "a".repeat(64),
        fileName: "cut.png", state: "pending", ...overrides
    };
}
{
    const sheet = fakeSheet();
    const spreadsheet = { getSheetByName: () => null, insertSheet: () => sheet };
    assert.equal(runtime.create(spreadsheet), sheet);
    assert.deepEqual(sheet.rows[0], runtime.headers);
}
{
    const sheet = fakeSheet();
    sheet.rows.push(runtime.headers.slice());
    const result = runtime.append(sheet, event({ fileId: "file-a", state: "linked", referencesJson: '[{"field":"imgCorte1"}]' }));
    assert.equal(result.rowIndex, 2);
    const events = runtime.read(sheet, "tok-1");
    const state = runtime.project(events);
    assert.equal(state.state, "linked");
    assert.equal(state.fileId, "file-a");
    assert.equal(state.eventCount, 1);
}
{
    const sheet = fakeSheet();
    sheet.rows.push(runtime.headers.slice());
    let nested = false;
    let nestedResult;
    sheet.onAppend = () => {
        if (nested) return;
        nested = true;
        nestedResult = runtime.append(sheet, event({ token: "tok-other", operationKey: "OP-2|21|imgCorte", fileId: "file-b" }));
    };
    const first = runtime.append(sheet, event({ fileId: "file-a" }));
    assert.ok(first.eventId && nestedResult.eventId);
    assert.equal(runtime.read(sheet, "tok-1").length, 1);
    assert.equal(runtime.read(sheet, "tok-other").length, 1);
}
{
    const sheet = fakeSheet();
    sheet.rows.push(runtime.headers.slice());
    runtime.append(sheet, event({ fileId: "file-a", state: "pending" }));
    runtime.append(sheet, event({ fileId: "file-b", state: "linked" }));
    const state = runtime.project(runtime.read(sheet, "tok-1"));
    assert.equal(state.state, "requires_review", "No se elige arbitrariamente entre dos archivos de la misma operación");
    assert.equal(state.fileId, "");
    assert.deepEqual(state.fileIds.sort(), ["file-a", "file-b"]);
}
{
    const sheet = fakeSheet();
    sheet.rows.push(runtime.headers.slice());
    runtime.append(sheet, event({ contentHash: "a".repeat(64), fileId: "file-a" }));
    runtime.append(sheet, event({ contentHash: "b".repeat(64), fileId: "file-a" }));
    const state = runtime.project(runtime.read(sheet, "tok-1"));
    assert.equal(state.state, "requires_review", "Metadatos divergentes del mismo token quedan en revisión");
}
{
    const sheet = fakeSheet();
    sheet.rows.push(runtime.headers.slice());
    assert.throws(() => runtime.append(sheet, event({ mimeType: "text/plain" })), /integridad/);
    assert.equal(sheet.rows.length, 1);
}

{
    const sheet = fakeSheet();
    sheet.rows.push(runtime.headers.slice());
    runtime.append(sheet, event({ operationKey: "OP-UNIQUE|10|imgCorte1" }));
    const matches = runtime.findByOperationKey(sheet, "OP-UNIQUE|10|imgCorte1");
    assert.equal(matches.length, 1);
    assert.equal(matches[0].values[1], "tok-1");
}
{
    const sheet = fakeSheet();
    sheet.rows.push(runtime.headers.slice());
    runtime.append(sheet, event({ state: "reserved" }));
    runtime.append(sheet, event({ fileId: "file-a", state: "pending" }));
    runtime.append(sheet, event({ fileId: "file-a", state: "linked" }));
    assert.equal(runtime.project(runtime.read(sheet, "tok-1")).state, "linked");
    runtime.append(sheet, event({ fileId: "file-a", state: "file_missing" }));
    assert.equal(runtime.project(runtime.read(sheet, "tok-1")).state, "file_missing");
}

{
    activeSheet = null;
    const expected = {
        token: "tok-transition", operationKey: "OP-3|22|imgApertura", folderId: "folder-1",
        mimeType: "image/png", sizeBytes: 3, contentHash: "c".repeat(64)
    };
    assert.equal(runtime.transition(expected, "reserved", "", [], "opening.png", ""), true);
    assert.equal(runtime.transition(expected, "pending", "file-opening", [], "opening.png", ""), true);
    const projected = runtime.project(runtime.read(activeSheet, "tok-transition"));
    assert.equal(projected.state, "pending");
    assert.equal(projected.fileId, "file-opening");
    assert.equal(projected.eventCount, 2);
}
console.log("ImageUploadEventJournal: 9/9 PASS — esquema, append, transiciones, búsqueda por operación, proyección temporal y conflictos");
