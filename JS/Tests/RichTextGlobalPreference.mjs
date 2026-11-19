import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = path => readFileSync(resolve(root, path), "utf8");
const apiSource = read("JS/Frontend/api-config.js");
const ui = read("JS/Frontend/ui.js");
const auth = read("JS/Frontend/auth.js");
const html = read("index.html");
const feedback = read("JS/Services/feedback.js");
const coordinator = read("JS/Services/Coordinator.js");

function extract(source, start, end) {
    const i = source.indexOf(start);
    const j = source.indexOf(end, i + start.length);
    assert.ok(i >= 0 && j > i, "No se encontró el bloque: " + start);
    return source.slice(i, j);
}
function createStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return { values, getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); } };
}
const apiBlock = extract(apiSource, "export const RICH_TEXT_MODE_KEY", "export const API_ENDPOINTS").replace(/^export /gm, "");
function createApi(storage, handler, retryHandler = async (action, payload, options) => handler(action, payload, options)) {
    return new Function("localStorage", "routeAction", "routeActionWithRetry", apiBlock +
        "\nreturn { RICH_TEXT_MODE_KEY, RICH_TEXT_MODES, getRichTextMode, loadRichTextMode, setRichTextMode };")(storage, handler, retryHandler);
}
const results = [];
let passed = 0;
function testCase(name, fn) { fn(); passed++; results.push({ name, status: "PASS" }); }

testCase("el formato cacheado predeterminado es estricto", () => {
    const api = createApi(createStorage(), async () => { throw new Error("No debe consultar"); });
    assert.equal(api.getRichTextMode(), "strict");
});

testCase("la carga global requiere sesión y usa getRichTextMode", async () => {
    let call = null, retryOptions = null;
    const storage = createStorage();
    const api = createApi(storage, async (action, payload) => {
        call = { action, payload };
        return { status: "success", mode: "advanced" };
    }, async (action, payload, options) => {
        retryOptions = options;
        call = { action, payload };
        return { status: "success", mode: "advanced" };
    });
    await assert.rejects(() => api.loadRichTextMode({ userId: "u1" }), /sesión activa/);
    assert.equal(await api.loadRichTextMode({ userId: "u1", sessionToken: "t1" }), "advanced");
    assert.deepEqual(call, { action: "getRichTextMode", payload: { userId: "u1", sessionToken: "t1" } });
    assert.deepEqual(retryOptions, { timeoutMs: 6000, maxAttempts: 2, retryDelayMs: 250 });
    assert.equal(api.getRichTextMode(), "advanced");
});

testCase("una respuesta global inválida no reemplaza la última configuración cacheada", async () => {
    const storage = createStorage({ gpsepedia_rich_text_mode_cache: "advanced" });
    const api = createApi(storage, async () => ({ status: "success", mode: "unsafe" }));
    await assert.rejects(() => api.loadRichTextMode({ userId: "u1", sessionToken: "t1" }), /configuración global/);
    assert.equal(api.getRichTextMode(), "advanced");
});

testCase("solo Desarrollador puede solicitar cambios y el servidor confirma el valor", async () => {
    const calls = [];
    const api = createApi(createStorage(), async (action, payload) => {
        calls.push({ action, payload });
        return { status: "success", mode: payload.mode };
    });
    await assert.rejects(() => api.setRichTextMode("advanced", "Técnico", { userId: "u1", sessionToken: "t1" }), /Solo un Desarrollador/);
    assert.equal(calls.length, 0);
    assert.equal(await api.setRichTextMode("advanced", "Desarrollador", { userId: "d1", sessionToken: "td" }), "advanced");
    assert.deepEqual(calls[0], { action: "setRichTextMode", payload: { userId: "d1", sessionToken: "td", mode: "advanced" } });
    assert.equal(api.getRichTextMode(), "advanced");
});

testCase("el backend mantiene la preferencia global en ScriptProperties y valida el rol", () => {
    const start = feedback.indexOf("const RICH_TEXT_MODE_PROPERTY_");
    const end = feedback.indexOf("const FEEDBACK_ACTION_PERMISSIONS", start);
    assert.ok(start >= 0 && end > start);
    const values = new Map();
    const properties = { getProperty(key) { return values.has(key) ? values.get(key) : null; },
        setProperty(key, value) { values.set(key, String(value)); } };
    const normalizerSource = extract(feedback, "function normalizeFeedbackRole(role)", "function getFeedbackActor_");
    const normalizeRole = new Function(normalizerSource + "\nreturn normalizeFeedbackRole;")();
    const runtime = new Function("PropertiesService", "normalizeFeedbackRole",
        feedback.slice(start, end) + "\nreturn { handleGetRichTextMode, handleSetRichTextMode, RICH_TEXT_MODE_PROPERTY_ };")(
        { getScriptProperties: () => properties }, normalizeRole
    );
    assert.equal(runtime.handleGetRichTextMode({ __feedbackActor: { userId: "u1", role: "Técnico" } }).mode, "strict");
    assert.throws(() => runtime.handleGetRichTextMode({}), /sesión activa/);
    assert.throws(() => runtime.handleSetRichTextMode({ mode: "advanced", __feedbackActor: { userId: "u1", role: "Técnico" } }), /solo un Desarrollador/);
    assert.throws(() => runtime.handleSetRichTextMode({ mode: "unsafe", __feedbackActor: { userId: "d1", role: "Desarrollador" } }), /no válido/);
    assert.equal(runtime.handleSetRichTextMode({ mode: "advanced", __feedbackActor: { userId: "d1", role: "Desarrollador" } }).mode, "advanced");
    assert.equal(runtime.handleGetRichTextMode({ __feedbackActor: { userId: "u2", role: "Técnico" } }).mode, "advanced");
    assert.equal(values.get(runtime.RICH_TEXT_MODE_PROPERTY_), "advanced");
});

testCase("FEEDBACK declara permisos y despacho para lectura de todos los roles y escritura Developer", () => {
    assert.match(feedback, /getRichTextMode:\s*null,\s*setRichTextMode:\s*\["Desarrollador"\]/);
    assert.match(feedback, /case 'getRichTextMode':[\s\S]*?handleGetRichTextMode\(payload\)/);
    assert.match(feedback, /case 'setRichTextMode':[\s\S]*?handleSetRichTextMode\(payload\)/);
    const router=feedback.slice(feedback.indexOf("function doPost(e)"),feedback.indexOf("\nconst RICH_TEXT_MODE_PROPERTY_"));
    assert.match(feedback,/actions: new Set\([\s\S]*?"setRichTextMode"/);
    assert.match(router,/getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken,\s*\{\s*service:\s*"FEEDBACK"\s*\}\)/);
    assert.doesNotMatch(router,/withSharedMutationLease_/);
});

testCase("Coordinator protege el recurso de configuración global con actor autenticado", () => {
    assert.match(coordinator, /getRichTextMode:\s*\{\s*read:\s*feedbackRead\s*\}/);
    assert.match(apiSource, /routeActionWithRetry\("getRichTextMode"[\s\S]*?timeoutMs: 6000[\s\S]*?maxAttempts: 2/);
    assert.match(coordinator, /setRichTextMode:\s*\{\s*read:\s*feedbackRead,\s*write:\s*\["RICH_TEXT_CONFIG"\]\s*\}/);
});

testCase("la plataforma carga la preferencia global al iniciar sesión y refresca las barras", () => {
    assert.match(auth, /loadRichTextModePreference\(user\)/);
    assert.match(ui, /export async function loadRichTextModePreference/);
    assert.match(ui, /await loadRichTextMode\(context\)/);
    assert.match(ui, /await setRichTextMode\(requestedMode, activeContext && activeContext\.role, activeContext\)/);
    assert.match(ui, /refreshRichTextToolbars\(\)/);
    assert.match(html, /Formato de texto/);
    assert.doesNotMatch(html, /preferencia se guarda en este navegador/);
});

testCase("las dos acciones se enrutan al servicio FEEDBACK", () => {
    assert.match(apiSource, /'getRichTextMode': 'FEEDBACK'/);
    assert.match(apiSource, /'setRichTextMode': 'FEEDBACK'/);
});

console.log("RichTextGlobalPreference: " + passed + "/" + passed + " PASS");
