import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ui = readFileSync("ui.js", "utf8");
const offline = readFileSync("offline.js", "utf8");

function extract(source, start, end) {
    const i = source.indexOf(start);
    const j = source.indexOf(end, i + start.length);
    assert.ok(i >= 0 && j > i, `No se encontró el bloque: ${start}`);
    return source.slice(i, j);
}

const updateSlide = extract(ui, "function updateSlide(index) {", "function adjustPanelHeight()");
const singleView = extract(ui, "const activeContent =", "if (activeImg) {");
const pysDetail = extract(ui, "const createPysSectionBlock =", "// 3. Descripción del problema");
const printContent = extract(ui, "const techItems = [];", "// 8. Código QR exclusivo");
const results = [];
let passed = 0;
let failed = 0;

function test(name, callback) {
    try {
        callback();
        passed++;
        results.push({ name, status: "PASS" });
    } catch (error) {
        failed++;
        results.push({ name, status: "FAIL", message: String(error.message || error) });
    }
}

test("el carrusel trata el rótulo como texto plano", () => {
    assert.match(updateSlide, /slideLabel\.textContent\s*=\s*String\(activeCable\.label\s*\|\|\s*"Cable"\)/);
    assert.match(updateSlide, /slideText\.appendChild\(slideLabel\)/);
    assert.doesNotMatch(updateSlide, /sanitizeHtmlContent\(activeCable\.label/);
    assert.doesNotMatch(updateSlide, /slideText\.innerHTML\s*=/);
});

test("el contenido enriquecido del carrusel pasa por el sanitizador", () => {
    assert.match(updateSlide, /slideContent\.innerHTML\s*=\s*sanitizeHtmlContent\(activeCable\.content\s*\|\|\s*"Sin descripción"\)/);
});

test("la vista sin carrusel sanitiza el contenido descriptivo", () => {
    assert.match(singleView, /contentP\.innerHTML\s*=\s*sanitizeHtmlContent\(activeContent\)/);
});

test("el detalle PyS sanitiza descripción, solución y prevención", () => {
    assert.match(pysDetail, /secContent\.innerHTML\s*=\s*sanitizeHtmlContent\(textContent\)/);
    assert.match(ui, /createPysSectionBlock\("Descripción",\s*item\.Descripcion\)/);
    assert.match(ui, /createPysSectionBlock\("Solución",\s*item\.Solucion\)/);
    assert.match(ui, /createPysSectionBlock\("Cómo evitarlo",\s*item\.Prevenir\)/);
});

test("la impresión sanitiza los campos enriquecidos de cortes", () => {
    for (const field of ["c.ub", "c.color", "c.relay"]) {
        assert.ok(printContent.includes(`sanitizeHtmlContent(${field}`), `Falta sanitización para ${field}`);
    }
});

test("la impresión sanitiza alimentación, apertura y nota técnica", () => {
    assert.match(printContent, /sanitizeHtmlContent\(f\.desc/);
    assert.match(printContent, /sanitizeHtmlContent\(aperturaItem\.desc/);
    assert.match(ui, /sanitizeHtmlContent\(item\.notaImportante\)/);
});

test("los consumidores de inbox mantienen sanitización del contenido y respuesta", () => {
    assert.match(ui, /messageBody\.innerHTML\s*=\s*sanitizeHtmlContent\(String\(item\.content/);
    assert.match(ui, /replyBody\.innerHTML\s*=\s*sanitizeHtmlContent\(String\(item\.reply/);
});

test("offline.js no introduce sinks HTML para contenido descriptivo", () => {
    assert.doesNotMatch(offline, /\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML\s*\(/);
});

test("la UI importa el sanitizador compartido", () => {
    assert.match(ui, /import\s*\{[^}]*sanitizeHtmlContent[^}]*\}\s*from\s*['"]\.\/rich-text\.js['"]/);
});

console.log(JSON.stringify({ suite: "DescriptiveContentRendering", status: failed ? "FAIL" : "PASS", passed, failed, results }, null, 2));
if (failed) process.exitCode = 1;
