import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = path => readFileSync(resolve(root, path), "utf8");
const css = read("style.css");
const ui = read("JS/Frontend/ui.js");
const html = read("index.html");

let passed = 0;
function testCase(name, fn) { fn(); passed++; console.log("PASS " + name); }

testCase("títulos, etiquetas, botones y celdas permiten ajuste de texto", () => {
    assert.match(css, /h1, h2, h3, h4, h5, h6,[\s\S]*?label,[\s\S]*?button,[\s\S]*?td,[\s\S]*?overflow-wrap: anywhere/);
    assert.match(css, /h1, h2, h3, h4, h5, h6,[\s\S]*?white-space: normal;[\s\S]*?text-overflow: clip/);
    assert.match(css, /td, th \{\s*overflow-wrap: anywhere;/);
});

testCase("el Inbox muestra títulos completos y permite que la fila crezca", () => {
    assert.match(css, /\.inbox-item-content \{[\s\S]*?min-width: 0;[\s\S]*?overflow: visible;/);
    assert.match(css, /\.inbox-item-title \{[\s\S]*?white-space: normal;[\s\S]*?overflow: visible;[\s\S]*?text-overflow: clip/);
    assert.doesNotMatch(css, /\.inbox-item-title \{[^}]*text-overflow: ellipsis/);
});

testCase("los botones de acciones de imágenes permiten etiquetas multilínea", () => {
    assert.match(css, /\.replaced-image-action \{[\s\S]*?white-space: normal;[\s\S]*?overflow-wrap: anywhere/);
});

testCase("los nombres de problemas y archivos se conservan completos sin ellipsis", () => {
    assert.match(ui, /title\.style\.cssText = "font-size: 0\.85rem; font-weight: bold; min-width: 0; max-width: 100%; white-space: normal; overflow-wrap: anywhere;/);
    assert.match(ui, /name\.style\.cssText = "font-weight:600; min-width:0; max-width:100%; white-space:normal; overflow-wrap:anywhere;/);
    assert.match(ui, /name\.textContent = file\.fileName \|\| 'Archivo sin nombre'/);
    assert.match(ui, /name\.title = file\.fileName \|\| 'Archivo sin nombre'/);
});

testCase("la asociación de problemas usa textContent y no inserta el nombre como HTML", () => {
    const start = ui.indexOf("const problemName = document.createElement");
    const end = ui.indexOf("const addBtn =", start);
    const association = ui.slice(start, end);
    assert.ok(start >= 0 && end > start);
    assert.match(association, /problemName\.textContent = p\.Problema \|\| "Problema"/);
    assert.match(association, /textDiv\.append\(problemName, problemStatus\)/);
    assert.doesNotMatch(association, /innerHTML/);
});

testCase("las pestañas de Developer conservan el nombre completo accesible", () => {
    for (const label of ["Diagnóstico", "Base de datos", "Imágenes y Drive", "Sistema"]) {
        assert.ok(html.includes('title="' + label + '"'), label);
    }
    assert.match(css, /#dev-tools-modal \.dev-tab-link span[\s\S]*?white-space: nowrap/);
});

testCase("los valores de registros no se cortan ni se modifican para ajustarse al diseño", () => {
    assert.doesNotMatch(ui, /file\.fileName\.(slice|substring)\(/);
    assert.doesNotMatch(ui, /p\.Problema\.(slice|substring)\(/);
    assert.match(css, /\.vehicle-title,[\s\S]*?overflow-wrap: anywhere/);
});

console.log("LongNameLayout: " + passed + "/" + passed + " PASS");
