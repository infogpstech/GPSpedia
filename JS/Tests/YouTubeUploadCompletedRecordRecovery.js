import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("JS/Frontend/youtubeUpload.js", "utf8");
function extractFunction(name) {
    const marker = `function ${name}(`;
    const start = source.indexOf(marker);
    assert.notEqual(start, -1, `No se encontró ${name}`);
    const open = source.indexOf("{", start);
    let depth = 0;
    for (let i = open; i < source.length; i++) {
        if (source[i] === "{") depth++;
        if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
    }
    assert.fail(`Función ${name} sin cerrar`);
}
const helper = new Function(extractFunction("hasCompletedYouTubeUpload_") + "\nreturn hasCompletedYouTubeUpload_;")();

let passed = 0;
function test(name, callback) {
    callback();
    passed++;
    console.log("PASS", name);
}

test("permite recuperar un vídeo completo aunque File no esté disponible", () => {
    assert.equal(helper({
        videoId: "AbCdEfGhI12", fileSize: 1000, bytesUploaded: 1000,
        status: "uploaded", file: undefined
    }), true);
});

test("permite reintentar aprobación si el catch marcó interrupted después de completar", () => {
    assert.equal(helper({
        videoId: "AbCdEfGhI12", fileSize: 1000, bytesUploaded: 1000,
        status: "interrupted", file: null
    }), true);
});

test("no permite omitir File si falta el ID final", () => {
    assert.equal(helper({ fileSize: 1000, bytesUploaded: 1000, status: "uploaded" }), false);
});

test("no permite omitir File si faltan bytes confirmados", () => {
    assert.equal(helper({
        videoId: "AbCdEfGhI12", fileSize: 1000, bytesUploaded: 999, status: "uploaded"
    }), false);
});

test("no permite tamaños vacíos, inválidos o negativos", () => {
    for (const fileSize of [0, -1, NaN, Infinity]) {
        assert.equal(helper({
            videoId: "AbCdEfGhI12", fileSize, bytesUploaded: 1000, status: "uploaded"
        }), false);
    }
});

test("el formulario y la comprobación de identidad aceptan ausencia de File solo con transferencia completa", () => {
    const form = source.slice(source.indexOf("form.onsubmit = async event =>"));
    assert.match(form, /if \(!file && !recoveredAlreadyUploaded\)/);
    assert.match(form, /\(!uploadRecord\.file && !recoveredAlreadyUploaded\)/);
    assert.match(form, /let finalVideoId = String\(uploadRecord\.videoId \|\| ""\)/);
});

console.log("YouTubeUploadCompletedRecordRecovery:", passed + "/6 PASS");
