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
const routeSource = "async " + extractFunction(api, "routeAction");
const calls = [];
let failRefresh = false, approvalStatus = "success";
const events = [];
const routeActionInternal_ = async (action, payload, serviceOverride) => {
    calls.push({ action, payload, serviceOverride });
    if (action === "approveVideo") return { status: approvalStatus, message: "Vídeo aprobado." };
    if (action === "rejectVideo") return { status: "success", message: "Vídeo rechazado." };
    if (action === "getCatalogData") {
        if (failRefresh) throw new Error("CATALOG unavailable");
        return { status: "success", data: [] };
    }
    return { status: "success" };
};
const routeAction = new Function(
    "ACTION_TO_SERVICE_MAP", "routeActionInternal_", "recordBrowserServiceTraffic",
    "invalidateSessionActorCaches", "routeActionWithRetry", "notifySessionCacheInvalidationPending_",
    "sessionCacheKeysFromError_", "window", "CustomEvent",
    routeSource + "\nreturn routeAction;"
)(
    { approveVideo: "FEEDBACK", rejectVideo: "FEEDBACK", getCatalogData: "CATALOG" },
    routeActionInternal_,
    () => {},
    async () => ({ status: "success" }),
    async () => ({ status: "success" }),
    () => {},
    () => null,
    { dispatchEvent: event => events.push(event) },
    class CustomEvent { constructor(type, options) { this.type = type; this.detail = options && options.detail; } }
);
let passed = 0;
async function test(name, fn) { await fn(); passed++; }
await test("aprobación confirmada coordina actualización CATALOG desde el navegador", async () => {
    calls.length = 0;
    const result = await routeAction("approveVideo", { itemId: "video-1" });
    assert.equal(result.status, "success");
    assert.equal(result.catalogRefreshStatus, "success");
    assert.deepEqual(calls.map(call => call.action), ["approveVideo", "getCatalogData"]);
    assert.equal(calls[1].payload.forceRefresh, true);
});
await test("rechazo no fuerza una actualización del catálogo", async () => {
    calls.length = 0;
    const result = await routeAction("rejectVideo", { itemId: "video-1" });
    assert.equal(result.status, "success");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].action, "rejectVideo");
});
await test("fallo de CATALOG no revierte ni oculta la aprobación confirmada", async () => {
    calls.length = 0; failRefresh = true;
    const result = await routeAction("approveVideo", { itemId: "video-2" });
    failRefresh = false;
    assert.equal(result.status, "success");
    assert.equal(result.catalogRefreshPending, true);
    assert.match(result.message, /no pudo actualizarse automáticamente/);
    assert.ok(events.some(event => event.type === "gpsepedia:catalog-refresh-pending"));
});
await test("una aprobación rechazada por FEEDBACK no llama a CATALOG", async () => {
    calls.length = 0; approvalStatus = "error";
    const result = await routeAction("approveVideo", { itemId: "video-3" });
    approvalStatus = "success";
    assert.equal(result.status, "error");
    assert.equal(calls.length, 1);
});
await test("FEEDBACK no publica cambios de vídeo hacia Coordinator desde Apps Script", async () => {
    assert.doesNotMatch(feedback, /publishFeedbackCortesCatalogChange_\\(action, referenceId\\)/);
    assert.doesNotMatch(feedback, /publishPysCatalogChange_\\(action, referenceId\\)/);
    assert.doesNotMatch(feedback, /publishTutorialCatalogChange_\\(action, referenceId\\)/);
});
console.log("VideoApprovalCatalogRefreshFrontend: " + passed + "/" + passed + " PASS — aprobación coordina CATALOG desde frontend; FEEDBACK no usa Coordinator para decisiones de vídeo.");