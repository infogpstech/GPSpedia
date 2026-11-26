import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ui = readFileSync("JS/Frontend/ui.js", "utf8");
const start = ui.indexOf("export function getValidatedYouTubeVideoId(");
const end = ui.indexOf("\nexport function getValidatedYouTubeVideoEmbedUrl(", start);
assert.ok(start >= 0 && end > start, "No se encontró el validador de IDs YouTube.");
const parser = ui.slice(start, end).replace("export function", "function");
const embedStart = ui.indexOf("export function getValidatedYouTubeVideoEmbedUrl(", end);
const embedEnd = ui.indexOf("\nfunction getYouTubeEmbedUrl(", embedStart);
assert.ok(embedStart >= 0 && embedEnd > embedStart, "No se encontró el constructor de embed validado.");
const embed = ui.slice(embedStart, embedEnd).replace("export function", "function");
const helpers = new Function("URL", parser + "\n" + embed + "\nreturn { getValidatedYouTubeVideoId, getValidatedYouTubeVideoEmbedUrl };")(URL);
const id = "A1b2C3d4E5_";
let passed = 0;
function test(name, fn) { fn(); passed++; console.log("PASS " + name); }

test("acepta URL watch con parámetro v único y parámetros adicionales", () => {
    assert.equal(helpers.getValidatedYouTubeVideoId("https://www.youtube.com/watch?v=" + id + "&t=30"), id);
});
test("acepta enlace corto y URL shorts", () => {
    assert.equal(helpers.getValidatedYouTubeVideoId("https://youtu.be/" + id), id);
    assert.equal(helpers.getValidatedYouTubeVideoId("https://www.youtube.com/shorts/" + id + "?feature=share"), id);
});
test("acepta embed, live, móvil y youtube-nocookie oficiales", () => {
    assert.equal(helpers.getValidatedYouTubeVideoId("https://www.youtube.com/embed/" + id), id);
    assert.equal(helpers.getValidatedYouTubeVideoId("https://youtube.com/live/" + id), id);
    assert.equal(helpers.getValidatedYouTubeVideoId("https://m.youtube.com/watch?v=" + id), id);
    assert.equal(helpers.getValidatedYouTubeVideoId("https://www.youtube-nocookie.com/embed/" + id), id);
});
test("acepta ID puro exacto de once caracteres", () => {
    assert.equal(helpers.getValidatedYouTubeVideoId(id), id);
    assert.equal(helpers.getValidatedYouTubeVideoId(id.slice(1)), null);
});
test("rechaza watch con parámetros v duplicados o ID inválido", () => {
    assert.equal(helpers.getValidatedYouTubeVideoId("https://www.youtube.com/watch?v=" + id + "&v=" + id), null);
    assert.equal(helpers.getValidatedYouTubeVideoId("https://www.youtube.com/watch?v=short"), null);
});
test("rechaza protocolo inseguro, credenciales y puerto explícito", () => {
    assert.equal(helpers.getValidatedYouTubeVideoId("http://www.youtube.com/watch?v=" + id), null);
    assert.equal(helpers.getValidatedYouTubeVideoId("https://user:pass@www.youtube.com/watch?v=" + id), null);
    assert.equal(helpers.getValidatedYouTubeVideoId("https://www.youtube.com:8443/watch?v=" + id), null);
});
test("rechaza dominios parecidos y rutas no autorizadas", () => {
    assert.equal(helpers.getValidatedYouTubeVideoId("https://youtube.com.evil.example/watch?v=" + id), null);
    assert.equal(helpers.getValidatedYouTubeVideoId("https://www.youtube.com/channel/" + id), null);
});
test("normaliza watch, youtu.be y shorts a un único embed canónico", () => {
    const expected = "https://www.youtube.com/embed/" + id + "?enablejsapi=1";
    for (const url of [
        "https://www.youtube.com/watch?v=" + id,
        "https://youtu.be/" + id,
        "https://www.youtube.com/shorts/" + id
    ]) assert.equal(helpers.getValidatedYouTubeVideoEmbedUrl(url), expected);
});

console.log("TutorialYouTubeUrlFormats: " + passed + "/8 PASS");
