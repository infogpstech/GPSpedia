// Contratos locales de caché e Inbox paginado — AUG-116.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createInboxPageCache } from "../../inboxPageCache.js";

function runInboxCacheTests() {
    const results = [];
    let passed = 0, failed = 0;
    const run = (name, fn) => {
        try { fn(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    };
    let now = 1000;
    const cache = createInboxPageCache({ ttlMs: 50, maxEntries: 3, now: () => now });
    const alice = { userId: "U1", role: "supervisor", sessionToken: "token-a" };
    const page = { data: [{ id: "1" }], nextCursor: "1", hasMore: true };
    run("Aísla entradas por usuario, rol y token de sesión", () => {
        assert.equal(cache.set(alice, null, page, 40), true);
        assert.equal(cache.get(alice, null, { pageSize: 40 }).value, page);
        assert.equal(cache.get({ ...alice, userId: "U2" }, null), null);
        assert.equal(cache.get({ ...alice, role: "gefe" }, null), null);
        assert.equal(cache.get({ ...alice, sessionToken: "token-b" }, null), null);
    });
    run("Expira por TTL y permite fallback stale solo si se solicita", () => {
        now += 51;
        assert.equal(cache.get(alice, null), null);
        assert.equal(cache.get(alice, null, { allowStale: true }).stale, true);
    });
    run("Invalida todas las páginas de una sesión sin afectar otras", () => {
        cache.clear();
        cache.set(alice, "40", page, 40);
        const other = { ...alice, userId: "U2" };
        cache.set(other, null, page, 40);
        assert.equal(cache.invalidate(alice), 1);
        assert.equal(cache.get(alice, "40"), null);
        assert.equal(cache.get(other, null).value, page);
    });
    run("Limita el número de páginas retenidas", () => {
        cache.clear();
        cache.set(alice, "0", page, 40);
        cache.set(alice, "40", page, 40);
        cache.set(alice, "80", page, 40);
        cache.set(alice, "120", page, 40);
        assert.equal(cache.getStats().entries, 3);
        assert.equal(cache.get(alice, "0"), null);
    });
    run("No admite identidades incompletas ni guarda respuestas inválidas", () => {
        assert.equal(cache.set({ userId: "U1", role: "supervisor" }, null, page), false);
        assert.equal(cache.set(alice, null, { data: "invalid" }), false);
        assert.equal(cache.get({ userId: "U1" }, null), null);
    });
    return { status: failed === 0 ? "PASS" : "FAIL", passed, failed, results };
}

function runInboxPaginationTests(feedbackSource) {
    const results = [];
    let passed = 0, failed = 0;
    const run = (name, fn) => {
        try { fn(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    };
    const start = feedbackSource.indexOf("function mapInboxFeedbackRow_(");
    const end = feedbackSource.indexOf("\nfunction handleReplyToFeedback(", start);
    assert.ok(start >= 0 && end > start, "No se encontró el bloque de paginación");
    const source = feedbackSource.slice(start, end);
    const rows = values => ({
        getLastRow: () => values.length,
        getLastColumn: () => values.reduce((max, row) => Math.max(max, row.length), 1),
        getRange: (row, col, count, width) => ({ getValues: () => values.slice(row - 1, row - 1 + count).map(value => value.slice(col - 1, col - 1 + width)) })
    });
    const feedbackRows = [["ID","Problema","Vehículo","Usuario","Respuesta","Responde","Resuelto"]];
    const contactRows = [["ID","Asunto","Mensaje","Respuesta","Responde"]];
    for (let i = 1; i <= 4; i++) feedbackRows.push(["F" + i, "Problema " + i, "V" + i, "Usuario " + i, "", "", false]);
    for (let i = 1; i <= 3; i++) contactRows.push(["C" + i, "Asunto " + i, "Mensaje " + i, "", ""]);
    const sheets = { feedback: rows(feedbackRows), contacts: rows(contactRows) };
    const api = new Function(
        "getSafeSheet","SHEET_NAMES","COLS_FEEDBACKS","COLS_CONTACTANOS","getReportMetadataColumn",
        "normalizeInboxStoredText_","parseReportMetadata","parseCutSuggestionRecord","normalizeInboxVideoUrl_",
        "normalizeInboxVideoMetadata_","INBOX_VIDEO_USER_MAX_LENGTH","INBOX_VIDEO_TITLE_MAX_LENGTH",
        "INBOX_VIDEO_DESCRIPTION_MAX_LENGTH",
        source + "\nreturn handleGetFeedbackItems;"
    )(
        name => name === "FEEDBACKS" ? sheets.feedback : sheets.contacts,
        { FEEDBACKS: "FEEDBACKS", CONTACTANOS: "CONTACTANOS" },
        { Problema: 2, ID_vehiculo: 3, Usuario: 4, ID: 1, Respuesta: 5, Responde: 6, "Se resolvio": 7 },
        { Contacto_ID: 1, Asunto: 2, Mensaje: 3, Respuesta_mensaje: 4, ID_usuario_responde: 5 },
        () => 0,
        value => value === null || value === undefined ? "" : String(value).slice(0, 5000),
        () => null, () => null, () => "", () => ({}), 100, 200, 1000
    );
    run("Página inicial devuelve límite y cursor para la continuación", () => {
        const result = api({ pageSize: 3 });
        assert.equal(result.data.length, 3);
        assert.equal(result.data[0].id, "F1");
        assert.equal(result.nextCursor, "3");
        assert.equal(result.hasMore, true);
        assert.equal(result.total, 7);
    });
    run("La página cruza de Feedbacks a Contactanos sin duplicar ni omitir", () => {
        const result = api({ cursor: "3", pageSize: 3 });
        assert.deepEqual(result.data.map(item => item.id), ["F4", "C1", "C2"]);
        assert.equal(result.nextCursor, "6");
    });
    run("La última página termina sin cursor", () => {
        const result = api({ cursor: "6", pageSize: 3 });
        assert.deepEqual(result.data.map(item => item.id), ["C3"]);
        assert.equal(result.nextCursor, null);
        assert.equal(result.hasMore, false);
    });
    run("Limita pageSize al máximo de 100 y rechaza cursor manipulado", () => {
        assert.equal(api({ pageSize: 500 }).data.length, 7);
        assert.throws(() => api({ cursor: "-1" }), /cursor/i);
        assert.throws(() => api({ cursor: "1x" }), /cursor/i);
    });
    return { status: failed === 0 ? "PASS" : "FAIL", passed, failed, results };
}

const root = process.cwd();
const feedback = fs.readFileSync(root + "/Services/feedback.js", "utf8");
const ui = fs.readFileSync(root + "/ui.js", "utf8");
const cacheResults = runInboxCacheTests();
const paginationResults = runInboxPaginationTests(feedback);
const checks = [
    ["El modal utiliza el loader paginado común", /loadAndRenderInbox\(\{ context, reset: true \}\)/.test(ui)],
    ["La caché no utiliza almacenamiento persistente", !/localStorage|sessionStorage|indexedDB/.test(fs.readFileSync(root + "/inboxPageCache.js", "utf8"))],
    ["La UI no conserva el caché global anterior", !/inboxCacheData/.test(ui)],
    ["La UI invalida la caché tras las cinco mutaciones", (ui.match(/invalidateInboxCache_\(/g) || []).length >= 6],
    ["La UI incorpora navegación de páginas", /inbox-page-next/.test(ui) && /inbox-page-previous/.test(ui)]
];
checks.forEach(([name, condition]) => {
    if (!condition) throw new Error("FAIL " + name);
});
console.log("Caché: " + cacheResults.passed + "/" + (cacheResults.passed + cacheResults.failed));
cacheResults.results.forEach(result => console.log(result.status + " " + result.name));
console.log("Paginación: " + paginationResults.passed + "/" + (paginationResults.passed + paginationResults.failed));
paginationResults.results.forEach(result => console.log(result.status + " " + result.name));
console.log("Contratos UI: " + checks.length + "/" + checks.length + " PASS");
if (cacheResults.failed || paginationResults.failed) process.exitCode = 1;
