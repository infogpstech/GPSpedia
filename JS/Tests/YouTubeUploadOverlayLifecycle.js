import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("JS/Frontend/youtubeUpload.js", "utf8");
const start = source.indexOf("export function openYouTubeUploadModal");
const end = source.indexOf("\n}\n", start);
assert.notEqual(start, -1, "Debe existir el constructor del modal YouTube");
assert.notEqual(end, -1, "Debe poder delimitarse el constructor");
const modalSource = source.slice(start, end + 2);

let passed = 0;
function test(name, callback) {
    callback();
    passed++;
    console.log("PASS", name);
}

test("no elimina directamente una instancia existente", () => {
    assert.match(modalSource, /const existing = document\.getElementById\("youtube-upload-modal"\);/);
    assert.doesNotMatch(modalSource, /existing\.remove\(\)/);
});

test("conserva una transferencia activa al intentar abrir otra instancia", () => {
    assert.match(modalSource, /existingIsUploading[\s\S]*?if \(existingIsUploading\) return existing;/);
});

test("no sustituye un modal que está debajo de otro overlay", () => {
    assert.match(modalSource, /existingIsRegistered[\s\S]*?existingStack\[existingStack\.length - 1\] !== existingOverlayId[\s\S]*?return existing;/);
});

test("respeta la cancelación del callback de cierre anterior", () => {
    assert.match(modalSource, /existingClose\(\) === false/);
});

test("la instancia conserva su ID y callback de cierre", () => {
    assert.match(modalSource, /modal\.__youtubeUploadOverlayId = overlayHistoryId;/);
    assert.match(modalSource, /modal\.__youtubeUploadClose = closeModal;/);
});

test("reemplaza la entrada superior en lugar de dejar una entrada huérfana", () => {
    assert.match(modalSource, /overlayHistory\.replaceTop\(overlayHistoryId, closeModal\)/);
});

test("registra normalmente cuando no existe una entrada anterior reemplazable", () => {
    assert.match(modalSource, /overlayHistory\.register\(overlayHistoryId, closeModal\)/);
});

test("la instancia expone el estado de transferencia para proteger el XHR", () => {
    assert.match(modalSource, /modal\.__youtubeUploadIsUploading = \(\) => isUploading;/);
});

console.log("YouTubeUploadOverlayLifecycle:", passed + "/8 PASS");
