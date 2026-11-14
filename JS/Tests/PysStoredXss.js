import fs from "node:fs";
import assert from "node:assert/strict";

function section(source, start, end) {
    const i = source.indexOf(start);
    const j = source.indexOf(end, i + start.length);
    if (i < 0 || j < 0) throw new Error("No se encontró el bloque " + start);
    return source.slice(i, j);
}

export function runPysStoredXssTests({ ui }) {
    const results = [];
    let passed = 0, failed = 0;
    const test = (name, fn) => {
        try { fn(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    };

    const helperBlock = section(ui, "export function getValidatedYouTubeVideoId(", "function getYouTubeEmbedUrl(");
    const helpers = new Function("URL", helperBlock + "\nreturn { getValidatedYouTubeVideoId, getValidatedYouTubeVideoEmbedUrl };")(URL);

    test("acepta un ID de YouTube exacto de 11 caracteres", () => {
        assert.equal(helpers.getValidatedYouTubeVideoId("dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    });
    test("normaliza URLs HTTPS watch, youtu.be, embed, shorts y live", () => {
        for (const value of [
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "https://youtu.be/dQw4w9WgXcQ?t=12",
            "https://youtube.com/embed/dQw4w9WgXcQ",
            "https://m.youtube.com/shorts/dQw4w9WgXcQ",
            "https://www.youtube-nocookie.com/live/dQw4w9WgXcQ"
        ]) assert.equal(helpers.getValidatedYouTubeVideoId(value), "dQw4w9WgXcQ", value);
    });
    test("construye el iframe únicamente con un ID validado y un origen canónico", () => {
        assert.equal(
            helpers.getValidatedYouTubeVideoEmbedUrl("https://youtu.be/dQw4w9WgXcQ"),
            "https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1"
        );
        assert.equal(helpers.getValidatedYouTubeVideoEmbedUrl("javascript:alert(1)"), null);
    });
    test("rechaza esquemas no HTTPS, data y javascript", () => {
        for (const value of [
            "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "javascript:alert(1)",
            "data:text/html,<svg onload=alert(1)>"
        ]) assert.equal(helpers.getValidatedYouTubeVideoId(value), null, value);
    });
    test("rechaza hosts falsos, subdominios arbitrarios y credenciales", () => {
        for (const value of [
            "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
            "https://www.youtube.com.evil.test/embed/dQw4w9WgXcQ",
            "https://youtube.com@evil.test/watch?v=dQw4w9WgXcQ",
            "https://evil.test@www.youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
            "https://evil.test/watch?v=dQw4w9WgXcQ"
        ]) assert.equal(helpers.getValidatedYouTubeVideoId(value), null, value);
    });
    test("rechaza rutas, IDs y parámetros de vídeo ambiguos o manipulados", () => {
        for (const value of [
            "https://www.youtube.com.evil.test/embed/dQw4w9WgXcQ",
            "https://www.youtube.com/redirect/dQw4w9WgXcQ",
            "https://www.youtube.com/embed/dQw4w9WgXcQ/extra",
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ&v=aaaaaaaaaaa",
            "https://youtu.be/not-a-valid-id",
            "https://www.youtube.com/embed/short"
        ]) assert.equal(helpers.getValidatedYouTubeVideoId(value), null, value);
    });
    test("la tarjeta PyS asigna el título almacenado mediante textContent", () => {
        const card = section(ui, "function createPysCard(", "\nexport function renderPosiblesProblemasAccordion");
        assert.match(card, /title\.textContent\s*=\s*item\.Problema/);
        assert.doesNotMatch(card, /overlay\.innerHTML\s*=|card\.innerHTML\s*=|title\.innerHTML\s*=/);
    });
    test("el título y colaborador del modal PyS se insertan como texto", () => {
        const modal = section(ui, "export function openPysDetailModal(", "/* TAREA 12 (6.1): TARJETA DE CREACIÓN Y FORMULARIO DE TUTORIALES */");
        assert.match(modal, /title\.textContent\s*=\s*item\.Problema/);
        assert.match(modal, /collaborator\.textContent\s*=\s*cleanColaboradorName\(item\.Colaborador\)/);
        assert.doesNotMatch(modal, /colDiv\.innerHTML\s*=|cleanColaboradorName\(item\.Colaborador\).*innerHTML/);
    });
    test("el modal conserva el sanitizador solo para contenido enriquecido", () => {
        const modal = section(ui, "export function openPysDetailModal(", "/* TAREA 12 (6.1): TARJETA DE CREACIÓN Y FORMULARIO DE TUTORIALES */");
        assert.match(modal, /secContent\.innerHTML\s*=\s*sanitizeHtmlContent\(textContent\)/);
        assert.match(modal, /item\.Descripcion/);
        assert.match(modal, /item\.Solucion/);
        assert.match(modal, /item\.Prevenir/);
    });
    test("el iframe PyS se crea con DOM y src canónico, sin fallback embed arbitrario", () => {
        const modal = section(ui, "export function openPysDetailModal(", "/* TAREA 12 (6.1): TARJETA DE CREACIÓN Y FORMULARIO DE TUTORIALES */");
        const video = section(modal, "// 6. Video del problema", "/* TAREA 11 (12.4): CARRUSEL DE MODELOS");
        assert.match(video, /getValidatedYouTubeVideoEmbedUrl\(item\.Video\)/);
        assert.match(video, /document\.createElement\(["']iframe["']\)/);
        assert.match(video, /iframe\.src\s*=\s*videoEmbedUrl/);
        assert.doesNotMatch(video, /innerHTML\s*=|item\.Video\.includes|href\s*=.*item\.Video/);
    });

    return { status: failed ? "FAIL" : "PASS", passed, failed, results };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const ui = fs.readFileSync("ui.js", "utf8");
    const result = runPysStoredXssTests({ ui });
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "PASS") process.exitCode = 1;
}
