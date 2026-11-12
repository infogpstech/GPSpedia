import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const feedback = fs.readFileSync("Services/feedback.js", "utf8");
const write = fs.readFileSync("Services/write.js", "utf8");
const richText = fs.readFileSync("rich-text.js", "utf8");

function extract(source, start, end) {
    const i = source.indexOf(start);
    const j = source.indexOf(end, i + start.length);
    if (i < 0 || j < 0) throw new Error("No se encontró el bloque " + start);
    return source.slice(i, j);
}

function load(source, code, names) {
    const context = { console, String, Number, Boolean, Object, Array, RegExp, Set, Map, Error, Math, JSON };
    vm.runInNewContext(code + "\nthis.api={" + names.map(name => name + ":" + name).join(",") + "};", context);
    return context.api;
}

const pysCode = extract(feedback, "function sanitizePysRichText_(value) {", "function getPysYouTubeVideoId_") +
    extract(feedback, "function normalizePysField_(value,label,maxLength,required,richText){", "function getPysYouTubeVideoId_");
const pys = load(feedback, pysCode, ["sanitizePysRichText_", "normalizePysField_"]);

const supplementaryCode =
    extract(write, "function sanitizeSupplementaryRichText_(value) {", "function createSupplementaryInfoError_") +
    extract(write, "function createSupplementaryInfoError_", "function persistSupplementaryInfoValues_");
const supplementary = load(write, supplementaryCode, [
    "sanitizeSupplementaryRichText_", "buildSupplementaryInfoPlan_", "createSupplementaryInfoError_"
]);

const results = [];
let passed = 0;
let failed = 0;
function test(name, callback) {
    try { callback(); passed++; results.push({ name, status: "PASS" }); }
    catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
}

const attack = '<p onclick="alert(1)" style="color:red;background:url(javascript:alert(1));position:fixed;font-size:1.2em">Texto <strong>válido</strong><script>alert(1)</script><iframe src="javascript:alert(2)">contenido activo</iframe><img src="javascript:alert(3)" onerror="alert(4)" alt="foto"><a href="javascript:alert(5)" target="_blank">enlace inseguro</a><a href="https://example.com/manual" target="_blank">enlace seguro</a></p>';

test("los dos servicios mantienen idéntica allow-list y reglas de sanitización", () => {
    const a = extract(feedback, "function sanitizePysRichText_(value) {", "function normalizePysField_")
        .replace("sanitizePysRichText_", "SANITIZER");
    const b = extract(write, "function sanitizeSupplementaryRichText_(value) {", "function createSupplementaryInfoError_")
        .replace("sanitizeSupplementaryRichText_", "SANITIZER");
    assert.equal(a, b, "FEEDBACK y WRITE deben compartir el mismo contrato de sanitización.");
});

test("la allow-list backend coincide con los elementos admitidos por rich-text.js", () => {
    const frontend = richText.match(/const allowedTags = new Set\(\[([^\]]+)\]\)/);
    const backend = feedback.match(/allowed=new Set\(\[([^\]]+)\]\)/);
    assert.ok(frontend && backend, "No se encontró la allow-list en el editor o backend.");
    const parse = value => Array.from(value.matchAll(/"([a-z]+)"/g), match => match[1]).sort();
    assert.deepEqual(parse(backend[1]), parse(frontend[1]));
});

test("elimina scripts, iframes, eventos, URLs peligrosas y CSS no permitido", () => {
    const clean = pys.sanitizePysRichText_(attack);
    assert.ok(clean.includes("<p style=\"color:red;font-size:1.2em\">"));
    assert.ok(clean.includes("<strong>válido</strong>"));
    assert.ok(clean.includes('alt="foto"'));
    assert.ok(clean.includes('href="https://example.com/manual"'));
    assert.ok(clean.includes('rel="noopener noreferrer"'));
    for (const forbidden of ["<script", "alert(1)", "alert(2)", "contenido activo", "onclick", "onerror", "javascript:", "background:", "position:fixed", 'href="javascript']) {
        assert.ok(!clean.includes(forbidden), "Persistió contenido no permitido: " + forbidden);
    }
});

test("elimina atributos activos y conserva únicamente URLs http(s), mailto y tel autorizadas", () => {
    const clean = pys.sanitizePysRichText_('<a href="mailto:soporte@example.com">correo</a><a href="tel:+50322220000">teléfono</a><a href="//evil.test">relativo</a><img src="https://example.com/a.png" alt="A" width="120" height="80" onload="x()">');
    assert.ok(clean.includes('href="mailto:soporte@example.com"'));
    assert.ok(clean.includes('href="tel:+50322220000"'));
    assert.ok(!clean.includes("//evil.test"));
    assert.ok(clean.includes('src="https://example.com/a.png"'));
    assert.ok(!clean.includes("onload"));
});

test("el texto plano conserva entidades válidas y convierte saltos de línea en BR", () => {
    assert.equal(pys.sanitizePysRichText_("A < B & C\nD &amp; E"), "A &lt; B &amp; C<br>D &amp; E");
});

test("normaliza etiquetas mal cerradas sin dejar estructuras abiertas", () => {
    const clean = pys.sanitizePysRichText_("<p><strong>Correcto</p><script>contenido sin cierre");
    assert.equal(clean, "<p><strong>Correcto</strong></p>");
});

test("normalizaPysField valida tipo, longitud y contenido visible después de sanitizar", () => {
    assert.throws(() => pys.normalizePysField_(42, "Descripción", 200, true, true), /debe ser texto/);
    assert.throws(() => pys.normalizePysField_("x".repeat(201), "Descripción", 200, true, true), /200 caracteres/);
    assert.throws(() => pys.normalizePysField_("<script>alert(1)</script>", "Descripción", 200, true, true), /obligatorio/);
    assert.equal(pys.normalizePysField_("<p><b>Texto seguro</b></p>", "Descripción", 200, true, true), "<p><b>Texto seguro</b></p>");
});

test("el plan WRITE sanitiza apertura, alimentación y nota antes de producir actualizaciones", () => {
    const plan = supplementary.buildSupplementaryInfoPlan_({
        apertura: attack,
        cableAlimen: "<p onmouseover='x()'>Cable <em>principal</em><script>evil()</script></p>",
        notaImportante: "<div style='background:url(javascript:x);color:blue'>Nota</div>"
    }, {});
    assert.ok(plan.updates.apertura.includes("<strong>válido</strong>"));
    assert.ok(!plan.updates.apertura.includes("javascript:"));
    assert.ok(!plan.updates.apertura.includes("onclick"));
    assert.ok(plan.updates.cableAlimen.includes("<em>principal</em>"));
    assert.ok(!plan.updates.cableAlimen.includes("evil()"));
    assert.equal(plan.updates.notaImportante, '<div style="color:blue">Nota</div>');
});

test("el plan WRITE rechaza campos no textuales y longitudes superiores al límite", () => {
    assert.throws(() => supplementary.buildSupplementaryInfoPlan_({ notaImportante: 123 }, {}), /debe contener texto/);
    assert.throws(() => supplementary.buildSupplementaryInfoPlan_({ apertura: "x".repeat(5001) }, {}), /5000 caracteres/);
});

test("el plan WRITE no persiste una solicitud compuesta solo por markup activo", () => {
    assert.throws(() => supplementary.buildSupplementaryInfoPlan_({ notaImportante: "<script>alert(1)</script>" }, {}), /información suplementaria válida/);
});

const result = { status: failed ? "FAIL" : "PASS", passed, failed, results };
console.log(JSON.stringify(result, null, 2));
if (failed) process.exitCode = 1;
