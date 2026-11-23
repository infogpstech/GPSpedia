import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const api = readFileSync("JS/Frontend/api-config.js", "utf8");
const feedback = readFileSync("JS/Services/feedback.js", "utf8");
function extractFunction(source, name) {
    const marker = new RegExp("function\\s+" + name + "\\s*\\(");
    const match = marker.exec(source);
    assert.ok(match, "No se encontró " + name);
    const start = match.index, brace = source.indexOf("{", start);
    let depth = 0;
    for (let i = brace; i < source.length; i++) {
        if (source[i] === "{") depth++;
        else if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
    }
    throw new Error("No se pudo extraer " + name);
}
const helperSource = "async " + extractFunction(api, "refreshCatalogAfterVideoApproval_");
const calls = [], events = [];
let failRefresh = false;
const routeAction = async (action, payload) => {
    calls.push({ action, payload });
    if (action !== "getCatalogData") return { status: "success" };
    if (failRefresh) throw new Error("CATALOG unavailable");
    return { status: "success", data: [] };
};
const refresh = new Function("routeAction", "window", "CustomEvent",
    helperSource + "\nreturn refreshCatalogAfterVideoApproval_;")(
    routeAction,
    { dispatchEvent: event => events.push(event) },
    class CustomEvent { constructor(type, options) { this.type = type; this.detail = options && options.detail; } }
);
let passed = 0;
async function test(name, fn) { await fn(); passed++; }
await test("aprobación confirmada coordina actualización CATALOG desde el navegador", async () => {
    calls.length = 0;
    const result = await refresh("approveVideo", { status: "success", message: "Vídeo aprobado." });
    assert.equal(result.status, "success");
    assert.equal(result.catalogRefreshStatus, "success");
    assert.deepEqual(result.catalogRefreshData, []);
    assert.deepEqual(calls.map(call => call.action), ["getCatalogData"]);
    assert.equal(calls[0].payload.forceRefresh, true);
});
await test("rechazo no fuerza una actualización del catálogo", async () => {
    calls.length = 0;
    const result = await refresh("rejectVideo", { status: "success", message: "Vídeo rechazado." });
    assert.equal(result.status, "success");
    assert.equal(calls.length, 0);
});
await test("fallo de CATALOG no revierte ni oculta la aprobación confirmada", async () => {
    calls.length = 0; failRefresh = true;
    const result = await refresh("approveVideo", { status: "success", message: "Vídeo aprobado." });
    failRefresh = false;
    assert.equal(result.status, "success");
    assert.equal(result.catalogRefreshPending, true);
    assert.match(result.message, /no pudo actualizarse automáticamente/);
    assert.ok(events.some(event => event.type === "gpsepedia:catalog-refresh-pending"));
});
await test("una aprobación rechazada por FEEDBACK no llama a CATALOG", async () => {
    calls.length = 0;
    const result = await refresh("approveVideo", { status: "error", message: "No autorizado." });
    assert.equal(result.status, "error");
    assert.equal(calls.length, 0);
});
await test("FEEDBACK no publica cambios de vídeo hacia Coordinator desde Apps Script", async () => {
    assert.doesNotMatch(feedback, /publishFeedbackCortesCatalogChange_\\(action, referenceId\\)/);
    assert.doesNotMatch(feedback, /publishPysCatalogChange_\\(action, referenceId\\)/);
    assert.doesNotMatch(feedback, /publishTutorialCatalogChange_\\(action, referenceId\\)/);
    assert.match(api, /refreshCatalogAfterVideoApproval_\\(action, finalResult\\)/);
});
console.log("VideoApprovalCatalogRefreshFrontend: " + passed + "/" + passed + " PASS — aprobación coordina CATALOG desde frontend; FEEDBACK no usa Coordinator para decisiones de vídeo.");