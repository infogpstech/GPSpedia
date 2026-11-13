import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createOverlayHistoryManager, overlayHistoryStateKey } from "../Frontend/overlayHistory.js";
const source = readFileSync("HTML/add_cortes.html", "utf8");
assert.match(source, /import \{ createOverlayHistoryManager, overlayHistoryStateKey \} from ['"]\.\/overlayHistory\.js['"]/);
assert.match(source, /const overlayHistory = createOverlayHistoryManager\(window\.history\);\s*window\.overlayHistory = overlayHistory;/);
function extractPopstateHandler() {
    const marker = "window.addEventListener('popstate', (event) => {";
    const start = source.indexOf(marker);
    assert.notEqual(start, -1, "No se encontró el listener popstate de add_cortes.html");
    const expressionStart = source.indexOf("(event) =>", start);
    const open = source.indexOf("{", expressionStart);
    let depth = 0;
    for (let i = open; i < source.length; i++) {
        if (source[i] === "{") depth++;
        if (source[i] === "}" && --depth === 0) return source.slice(expressionStart, i + 1);
    }
    assert.fail("El listener popstate no está cerrado");
}
function createFakeHistory() {
    const entries = [{ state: { page: "add-cortes" } }];
    let index = 0;
    let popstateHandler = null;
    return {
        get state() { return entries[index].state; },
        setPopstateHandler(handler) { popstateHandler = handler; },
        pushState(state) { entries.splice(index + 1); entries.push({ state }); index++; },
        replaceState(state) { entries[index] = { state }; },
        back() { this.go(-1); },
        go(delta) {
            const next = Math.max(0, Math.min(entries.length - 1, index + delta));
            if (next === index) return;
            index = next;
            if (popstateHandler) popstateHandler({ state: this.state });
        }
    };
}
function createScenario() {
    const history = createFakeHistory();
    const overlayHistory = createOverlayHistoryManager(history);
    let lightboxVisible = false;
    let lightboxCloseCalls = 0;
    let youtubeCloseCalls = 0;
    const window = {
        cerrarLightbox(fromPopState) {
            assert.equal(fromPopState, true);
            lightboxCloseCalls++;
            lightboxVisible = false;
        }
    };
    const document = {
        getElementById(id) {
            if (id !== "lightbox") return null;
            return { classList: { contains: name => name === "visible" && lightboxVisible } };
        }
    };
    const handler = new Function(
        "overlayHistory", "overlayHistoryStateKey", "window", "document",
        "return " + extractPopstateHandler() + ";"
    )(overlayHistory, overlayHistoryStateKey, window, document);
    history.setPopstateHandler(handler);
    overlayHistory.register("youtube-upload-test", () => { youtubeCloseCalls++; return true; });
    return {
        history, overlayHistory,
        openLightbox() { lightboxVisible = true; history.pushState({ lightboxOpen: true }, ""); },
        back() { history.back(); },
        get lightboxCloseCalls() { return lightboxCloseCalls; },
        get youtubeCloseCalls() { return youtubeCloseCalls; },
        get lightboxVisible() { return lightboxVisible; }
    };
}
let passed = 0;
function test(name, callback) { callback(); passed++; console.log("PASS", name); }
test("Atrás durante carga YouTube en add_cortes cierra el overlay y no abandona la vista", () => {
    const scenario = createScenario();
    scenario.back();
    assert.deepEqual(scenario.overlayHistory.getStack(), []);
    assert.equal(scenario.youtubeCloseCalls, 1);
    assert.equal(scenario.history.state.page, "add-cortes");
});
test("si hay lightbox sobre YouTube, Atrás cierra primero el lightbox y luego YouTube", () => {
    const scenario = createScenario();
    scenario.openLightbox();
    scenario.back();
    assert.equal(scenario.lightboxCloseCalls, 1);
    assert.equal(scenario.lightboxVisible, false);
    assert.deepEqual(scenario.overlayHistory.getStack(), ["youtube-upload-test"]);
    assert.equal(scenario.youtubeCloseCalls, 0);
    scenario.back();
    assert.deepEqual(scenario.overlayHistory.getStack(), []);
    assert.equal(scenario.youtubeCloseCalls, 1);
    assert.equal(scenario.lightboxCloseCalls, 1);
});
console.log("AddCortesYouTubeOverlayHistory:", passed + "/2 PASS");
