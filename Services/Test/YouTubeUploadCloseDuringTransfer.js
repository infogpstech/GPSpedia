import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createOverlayHistoryManager, overlayHistoryStateKey } from "../../overlayHistory.js";

const source = readFileSync("youtubeUpload.js", "utf8");

function extractArrow(name) {
    const marker = `const ${name} = () => {`;
    const markerIndex = source.indexOf(marker);
    assert.notEqual(markerIndex, -1, `No se encontró ${name}`);
    const open = source.indexOf("{", markerIndex);
    let depth = 0;
    for (let i = open; i < source.length; i++) {
        if (source[i] === "{") depth++;
        if (source[i] === "}") {
            depth--;
            if (depth === 0) {
                return source.slice(source.indexOf("=", markerIndex) + 1, i + 1).trim();
            }
        }
    }
    assert.fail(`Bloque ${name} sin cerrar`);
}

const closeModalExpression = extractArrow("closeModal");
const requestCloseExpression = extractArrow("requestOverlayClose");
assert.match(source, /closeBtn\.onclick = requestOverlayClose;/);
assert.match(source, /cancelBtn\.onclick = requestOverlayClose;/);
assert.doesNotMatch(source, /closeBtn\.style\.display\s*=\s*"none"/, "La X debe permanecer disponible durante la transferencia");

function createFakeHistory() {
    const entries = [{ state: { level: "catalogo", marker: "preserved" } }];
    let index = 0;
    let onPopState = null;
    return {
        get state() { return entries[index].state; },
        get length() { return entries.length; },
        setPopStateHandler(handler) { onPopState = handler; },
        pushState(state) {
            entries.splice(index + 1);
            entries.push({ state });
            index++;
        },
        replaceState(state) { entries[index] = { state }; },
        back() { this.go(-1); },
        go(delta) {
            const next = Math.max(0, Math.min(entries.length - 1, index + delta));
            if (next === index) return;
            index = next;
            if (onPopState) onPopState(entries[index].state);
        }
    };
}

function createScenario(confirmResult) {
    let confirmCalls = 0;
    let abortCalls = 0;
    const modal = { removed: false, remove() { this.removed = true; } };
    const activeXhr = { abort() { abortCalls++; } };
    const confirm = () => { confirmCalls++; return confirmResult; };
    const history = createFakeHistory();
    const manager = createOverlayHistoryManager(history);
    history.setPopStateHandler(state => manager.handlePopState(state));
    const runtimeFactory = new Function(
        "confirm", "modal", "overlayHistory", "overlayHistoryId", "activeXhr",
        `let isUploading = true;
         let uploadCancelled = false;
         let closeWithoutPrompt = false;
         const closeModal = ${closeModalExpression};
         const requestOverlayClose = ${requestCloseExpression};
         return {
             closeModal, requestOverlayClose,
             get uploadCancelled() { return uploadCancelled; }
         };`
    );
    const runtime = runtimeFactory(confirm, modal, manager, "youtube-upload-test", activeXhr);
    manager.register("youtube-upload-test", runtime.closeModal);
    return {
        history, manager, runtime, modal,
        get confirmCalls() { return confirmCalls; },
        get abortCalls() { return abortCalls; }
    };
}

let passed = 0;
function test(name, callback) {
    callback();
    passed++;
    console.log("PASS", name);
}

test("Atrás + rechazar pausa conserva modal, XHR y entrada histórica", () => {
    const s = createScenario(false);
    s.history.back();
    assert.deepEqual(s.manager.getStack(), ["youtube-upload-test"]);
    assert.deepEqual(s.history.state[overlayHistoryStateKey], ["youtube-upload-test"]);
    assert.equal(s.modal.removed, false);
    assert.equal(s.abortCalls, 0);
    assert.equal(s.runtime.uploadCancelled, false);
    assert.equal(s.confirmCalls, 1);
});

test("Atrás + confirmar pausa aborta XHR y cierra modal", () => {
    const s = createScenario(true);
    s.history.back();
    assert.deepEqual(s.manager.getStack(), []);
    assert.equal(s.history.state[overlayHistoryStateKey], undefined);
    assert.equal(s.modal.removed, true);
    assert.equal(s.abortCalls, 1);
    assert.equal(s.runtime.uploadCancelled, true);
    assert.equal(s.confirmCalls, 1);
});

test("X + rechazar pausa conserva modal y pila", () => {
    const s = createScenario(false);
    s.runtime.requestOverlayClose();
    assert.deepEqual(s.manager.getStack(), ["youtube-upload-test"]);
    assert.deepEqual(s.history.state[overlayHistoryStateKey], ["youtube-upload-test"]);
    assert.equal(s.modal.removed, false);
    assert.equal(s.abortCalls, 0);
    assert.equal(s.runtime.uploadCancelled, false);
});

test("Cancelar + confirmar pausa aborta XHR y cierra modal", () => {
    const s = createScenario(true);
    s.runtime.requestOverlayClose();
    assert.deepEqual(s.manager.getStack(), []);
    assert.equal(s.modal.removed, true);
    assert.equal(s.abortCalls, 1);
    assert.equal(s.runtime.uploadCancelled, true);
});

console.log("YouTubeUploadCloseDuringTransfer:", passed + "/4 PASS");
