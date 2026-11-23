import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const api = readFileSync("JS/Frontend/api-config.js", "utf8");
const feedback = readFileSync("JS/Services/feedback.js", "utf8");
const ui = readFileSync("JS/Frontend/ui.js", "utf8");
const start = api.indexOf("async function refreshCatalogAfterVideoApproval_(");
const end = api.indexOf("\nexport async function routeAction(", start);
assert.ok(start >= 0 && end > start, "No se encontró la función de refresco de vídeo.");
const helperSource = api.slice(start, end).trim();
const calls = [], events = [];
let failRefresh = false;
const routeAction = async (action, payload) => {
    calls.push({ action, payload });
    if (action !== "getCatalogData") return { status: "success" };
    if (failRefresh) throw new Error("CATALOG unavailable");
    return { status: "success", data: { cortes: [], tutoriales: [], logos: [] } };
};
const refresh = new Function("routeAction", "window", "CustomEvent",
    helperSource + "\nreturn refreshCatalogAfterVideoApproval_;")(
    routeAction,
    { dispatchEvent: event => events.push(event) },
    class CustomEvent { constructor(type, options) { this.type = type; this.detail = options && options.detail; } }
);
let passed = 0;
async function test(name, fn) { await fn(); passed++; }
await test("aprobación Corte/Tutorial refresca CATALOG desde el navegador", async () => {
    calls.length = 0;
    const result = await refresh("approveVideo", { status: "success", contentType: "corte", message: "Vídeo aprobado." });
    assert.equal(result.status, "success");
    assert.equal(result.catalogRefreshStatus, "success");
    assert.deepEqual(result.catalogRefreshData, { cortes: [], tutoriales: [], logos: [] });
    assert.deepEqual(calls.map(call => call.action), ["getCatalogData"]);
    assert.equal(calls[0].payload.forceRefresh, true);
});
await test("aprobación PyS aplica upsert verificado sin descarga completa de la colección", async () => {
    calls.length = 0;
    const change = { collection: "pys", recordId: "isue-10", operation: "upsert", snapshot: { id_problem: "isue-10", Video: "https://youtube.test/video" } };
    const result = await refresh("approveVideo", { status: "success", contentType: "pys", referenceId: "isue-10", catalogChange: change });
    assert.equal(result.status, "success");
    assert.equal(result.catalogRefreshStatus, "success");
    assert.deepEqual(result.pysCatalogChange, change);
    assert.equal(calls.length, 0);
    assert.ok(events.some(event => event.type === "gpsepedia:pys-catalog-change" && event.detail.change === change));
    assert.match(ui, /applyPysCatalogChanges\(change \? \[change\] : \[\]\)/);
    assert.doesNotMatch(ui, /loadPysData\(\{\s*refresh:\s*true\s*\}\)/);
});
await test("rechazo no fuerza una actualización del catálogo", async () => {
    calls.length = 0;
    const result = await refresh("rejectVideo", { status: "success", message: "Vídeo rechazado." });
    assert.equal(result.status, "success");
    assert.equal(calls.length, 0);
});
await test("fallo de CATALOG no revierte ni oculta la aprobación confirmada", async () => {
    calls.length = 0; failRefresh = true;
    const result = await refresh("approveVideo", { status: "success", contentType: "corte", message: "Vídeo aprobado." });
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
    assert.doesNotMatch(feedback, /publishFeedbackCortesCatalogChange_\(action, referenceId\)/);
    assert.doesNotMatch(feedback, /publishPysCatalogChange_\(action, referenceId\)/);
    assert.doesNotMatch(feedback, /publishTutorialCatalogChange_\(action, referenceId\)/);
    assert.match(api, /refreshCatalogAfterVideoApproval_\(action, finalResult\)/);
    assert.match(feedback, /catalogChange: savedPayload\.contentType === "pys" \? buildPysCatalogChange_\(savedPayload\.referenceId\) : null/);
});
console.log("VideoApprovalCatalogRefreshFrontend: " + passed + "/" + passed + " PASS — CATALOG se refresca desde frontend; PyS aplica upsert incremental sin descarga completa.");
