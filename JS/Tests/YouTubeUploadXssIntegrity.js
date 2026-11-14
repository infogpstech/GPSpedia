import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function extract_(source, start, end) {
    const i = source.indexOf(start), j = source.indexOf(end, i + start.length);
    if (i < 0 || j < 0) throw new Error("No se encontró el bloque " + start);
    return source.slice(i, j);
}

export function runYouTubeUploadXssIntegrityTests({ upload, ui, cortes }) {
    const results = [];
    let passed = 0, failed = 0;
    const test = (name, fn) => {
        try { fn(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    };

    const modalStart = upload.indexOf("export function openYouTubeUploadModal");
    const markupStart = upload.indexOf("content.innerHTML = `", modalStart);
    const markupEnd = upload.indexOf("\n    `;", markupStart);
    const markup = markupStart >= 0 && markupEnd >= 0 ? upload.slice(markupStart, markupEnd) : "";

    test("el HTML estructural del modal no interpola datos de título o descripción", () => {
        assert.ok(markup, "No se encontró la plantilla HTML del modal.");
        assert.doesNotMatch(markup, /\$\{/);
        assert.doesNotMatch(markup, /initialTitle|initialDescription/);
        assert.match(markup, /<textarea[^>]*id="yt-video-desc"/);
        assert.match(markup, /<input[^>]*id="yt-video-title"/);
    });

    test("asigna contenido potencialmente hostil mediante value y conserva caracteres y saltos de línea", () => {
        const helper = extract_(upload, "function setYouTubeUploadInitialValues_", "function queryYouTubeUploadOffset_");
        const context = {};
        vm.runInNewContext(helper + "\nthis.apply = setYouTubeUploadInitialValues_;", context);
        const titleInput = { value: "" }, descriptionInput = { value: "" };
        const title = `"GPS" & <img src=x onerror=alert(1)> Técnico`;
        const description = `Primera línea: "detalle" & <b>texto</b>\n</textarea><script>alert("x")</script>\nUbicación: detrás del tablero.`;
        context.apply(titleInput, descriptionInput, title, description);
        assert.equal(titleInput.value, title);
        assert.equal(descriptionInput.value, description);
        assert.ok(descriptionInput.value.includes("</textarea>"));
        assert.ok(descriptionInput.value.includes("\n"));
        assert.ok(titleInput.value.includes("Técnico"));
        assert.ok(descriptionInput.value.includes("Ubicación"));
    });

    test("limita el tamaño sin convertir el contenido en HTML", () => {
        const helper = extract_(upload, "function setYouTubeUploadInitialValues_", "function queryYouTubeUploadOffset_");
        const context = {};
        vm.runInNewContext(helper + "\nthis.apply = setYouTubeUploadInitialValues_;", context);
        const titleInput = { value: "" }, descriptionInput = { value: "" };
        const title = "á".repeat(120), description = "<script>" + "x".repeat(5100);
        context.apply(titleInput, descriptionInput, title, description);
        assert.equal(titleInput.value, title.slice(0, 100));
        assert.equal(descriptionInput.value, description.slice(0, 5000));
    });

    test("modal, recuperación y descarte reutilizan la asignación segura", () => {
        assert.match(upload, /setYouTubeUploadInitialValues_\(titleInput, descInput, initialTitle, initialDescription\)/);
        assert.match(upload, /setYouTubeUploadInitialValues_\(titleInput, descInput, record\.title \|\| initialTitle, record\.description \|\| initialDescription\)/);
        assert.equal((upload.match(/setYouTubeUploadInitialValues_\(titleInput, descInput/g) || []).length, 3);
        assert.doesNotMatch(upload, /titleInput\.innerHTML|descInput\.innerHTML/);
    });

    test("los puntos de entrada de Corte, PyS y Tutorial pasan datos como opciones y no como HTML", () => {
        assert.match(ui, /initialTitle:\s*meta\.title,[\s\S]*?initialDescription:\s*meta\.description/);
        assert.match(ui, /initialTitle:\s*payload\.titulo,[\s\S]*?initialDescription:\s*payload\.descripcion/);
        assert.match(ui, /initialTitle:\s*item\.Tema[\s\S]*?initialDescription:\s*item\.Detalles/);
        assert.match(cortes, /initialTitle:\s*initTitle,[\s\S]*?initialDescription:\s*initDesc/);
        assert.doesNotMatch(ui, /innerHTML\s*=\s*`[^\`]*\$\{(?:meta\.title|payload\.descripcion|item\.Detalles)/);
    });

    return { status: failed ? "FAIL" : "PASS", passed, failed, results };
}

if (import.meta.url === "file://" + process.argv[1]) {
    const result = runYouTubeUploadXssIntegrityTests({
        upload: fs.readFileSync("JS/Frontend/youtubeUpload.js", "utf8"),
        ui: fs.readFileSync("JS/Frontend/ui.js", "utf8"),
        cortes: fs.readFileSync("HTML/add_cortes.html", "utf8")
    });
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "PASS") process.exitCode = 1;
}
