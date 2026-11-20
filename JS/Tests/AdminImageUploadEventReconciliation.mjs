import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = source.indexOf("const IMAGE_UPLOAD_EVENTS_SHEET_NAME_");
const end = source.indexOf("const IMAGE_UPLOAD_MAX_BYTES", start);
assert.ok(start >= 0 && end > start, "No se encontró el lector ADMIN de ImageUploadEvents");
const code = source.slice(start, end);
let uuid = 0;
const runtime = new Function("Utilities", "SpreadsheetApp", code +
    "\nreturn { project: projectImageUploadEventsForAdmin_, append: appendImageUploadEventForAdmin_, read: readImageUploadEventsForAdmin_ };"
)({ getUuid: () => "00000000-0000-4000-8000-" + String(++uuid).padStart(12, "0") }, { flush() {} });

function event(overrides = {}) {
    return [
        "IE-" + (++uuid), "tok-1", "OP-1|10|imgCorte1", "folder-1", "image/png", 3,
        "a".repeat(64), "file-a", "https://drive.google.com/uc?export=view&id=file-a",
        "pending", "[]", "cut.png", "2026-11-20T00:00:00.000Z", "", ...[]
    ].map((value, index) => overrides[index] === undefined ? value : overrides[index]);
}
{
    const rows = [["eventId", "token", "operationKey", "folderId", "mimeType", "sizeBytes", "contentHash",
        "fileId", "fileUrl", "state", "referencesJson", "fileName", "createdAt", "lastError"], event()];
    const sheet = {
        getLastRow: () => rows.length,
        getRange(row, column, rowCount = 1, columnCount = 1) {
            return { getValues: () => rows.slice(row - 1, row - 1 + rowCount).map(line => line.slice(column - 1, column - 1 + columnCount)) };
        }
    };
    const entries = runtime.read(sheet);
    const projected = runtime.project(entries);
    assert.equal(projected.token, "tok-1");
    assert.equal(projected.state, "pending");
    assert.equal(projected.fileId, "file-a");
    assert.equal(projected.eventCount, 1);
}
{
    const first = event();
    const second = first.slice();
    second[0] = "IE-2";
    second[7] = "file-b";
    second[9] = "linked";
    const projected = runtime.project([{ values: first }, { values: second }]);
    assert.equal(projected.state, "requires_review");
    assert.equal(projected.fileId, "");
    assert.deepEqual(projected.fileIds.sort(), ["file-a", "file-b"]);
}
{
    const first = event();
    const second = first.slice();
    second[0] = "IE-2";
    second[6] = "b".repeat(64);
    const projected = runtime.project([{ values: first }, { values: second }]);
    assert.equal(projected.state, "requires_review");
}
{
    const rows = [["eventId", "token", "operationKey", "folderId", "mimeType", "sizeBytes", "contentHash", "fileId", "fileUrl", "state", "referencesJson", "fileName", "createdAt", "lastError"]];
    const sheet = {
        appendRow(row) { rows.push(row.slice()); },
        getLastRow: () => rows.length,
        getRange(row, column, rowCount, columnCount) {
            return { createTextFinder(value) {
                return { matchCase() { return this; }, matchEntireCell() { return this; },
                    findAll() { return rows.slice(row - 1, row - 1 + rowCount)
                        .map((line, offset) => String(line[column - 1]) === String(value) ? { getRow: () => row + offset } : null).filter(Boolean); } };
            } };
        }
    };
    const id = runtime.append(sheet, {
        token: "tok-2", operationKey: "OP-2|11|imgApertura", folderId: "folder-1",
        mimeType: "image/png", sizeBytes: 3, contentHash: "c".repeat(64),
        fileId: "file-c", state: "linked"
    });
    assert.ok(id.startsWith("IE-"));
    assert.equal(rows.length, 2);
    assert.equal(rows[1][9], "linked");
}
console.log("AdminImageUploadEventReconciliation: 4/4 PASS — lectura, proyección, conflictos y append");
