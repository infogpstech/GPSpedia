import assert from "node:assert/strict";
import fs from "node:fs";
const source = fs.readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function handleSendContactForm(payload) {");
const end = source.indexOf("\nfunction ", start + 10);
assert.ok(start >= 0 && end > start, "No se encontró handleSendContactForm");
const handler = source.slice(start, end);
function harness() {
    const events = [], rows = [["Contacto_ID", "User_ID", "Asunto", "Mensaje", "Respuesta", "Responde"]];
    const sheet = {
        getLastRow: () => rows.length,
        getLastColumn: () => 6,
        appendRow(row) { events.push("append"); rows.push(row.slice()); },
        getRange(row, col, count = 1, width = 1) {
            return {
                createTextFinder(value) {
                    return {
                        matchCase() { return this; },
                        matchEntireCell() { return this; },
                        findAll() {
                            const found = [];
                            for (let i = row - 1; i < Math.min(rows.length, row - 1 + count); i++) {
                                if (String(rows[i]?.[col - 1] || "") === String(value)) found.push({ getRow: () => i + 1 });
                            }
                            return found;
                        }
                    };
                }
            };
        }
    };
    const api = new Function("COLS_CONTACTANOS", "SHEET_NAMES", "getSafeSheet", "enforceFeedbackRateLimit_",
        "getNextFormulaBasedId_", "SpreadsheetApp", "copyRowPresentationOnly_", handler + "\nreturn handleSendContactForm;")(
        { Contacto_ID: 1, User_ID: 2, Asunto: 3, Mensaje: 4, ID_usuario_responde: 6 },
        { CONTACTANOS: "Contactanos" }, () => sheet,
        () => events.push("rate-limit"),
        () => { events.push("reserve-id"); return "C-001"; },
        { flush: () => events.push("flush") },
        (_sheet, sourceRow, targetRow) => events.push("format:" + targetRow)
    );
    return { api, rows, events };
}
const h = harness();
const result = h.api({ name: "Ana", email: "ana@example.com", message: "Consulta" });
assert.equal(result.status, "success");
assert.deepEqual(h.events, ["rate-limit", "reserve-id", "append", "flush", "format:2"]);
assert.equal(h.rows[1][0], "C-001");
assert.equal(h.rows[1][1], "N/A");
assert.equal(h.rows[1][2], "Contacto de Ana");
assert.equal(h.rows[1][3], "De: ana@example.com\n\nConsulta");
assert.doesNotMatch(handler, /LockService\.getScriptLock\(\)|acquireFeedbackScriptLock_\(/);
const invalid = harness();
assert.throws(() => invalid.api({ name: "Ana", email: "invalid", message: "Consulta" }), /formato válido/);
assert.equal(invalid.events.includes("reserve-id"), false);
console.log("FeedbackContactWriteNoGlobalLock: 2/2 PASS");
