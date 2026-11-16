import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = path => readFileSync(resolve(root, path), "utf8");
const ui = read("JS/Frontend/ui.js");
const css = read("style.css");
const start = ui.indexOf("function mostrarDetalleModal");
const end = ui.indexOf("\nfunction ", start + 1);
const detail = ui.slice(start, end > start ? end : undefined);

let passed = 0;
function testCase(name, fn) { fn(); passed++; console.log("PASS " + name); }

testCase("la cabecera y acciones del modal se agrupan en una barra flexible", () => {
    assert.match(detail, /headerDiv\.className = "detail-modal-toolbar"/);
    for (const label of ["Compartir vehículo", "Imprimir ficha técnica", "Activar modo edición", "Guardar cambios", "Descartar cambios"]) {
        assert.ok(detail.includes('setAttribute("aria-label", "' + label + '")'), label);
    }
    assert.match(css, /\.detail-modal-toolbar \{[\s\S]*?display: flex;[\s\S]*?flex-wrap: wrap/);
});

testCase("el título y metadatos se separan del área de edición", () => {
    assert.match(detail, /titleContainer\.className = "detail-modal-title"/);
    assert.match(detail, /subHeaderDiv\.className = "detail-modal-meta"/);
    assert.match(detail, /subHeaderText\.className = "detail-modal-meta-text"/);
    assert.match(detail, /const subHeaderText = document\.createElement\('div'\)/);
    assert.match(css, /\.detail-modal-title-text \{[\s\S]*?overflow-wrap: anywhere/);
});

testCase("los cinco campos de edición se agrupan en una rejilla con asociaciones accesibles", () => {
    assert.match(detail, /editHeaderWrapper\.className = "detail-edit-grid"/);
    assert.match(detail, /appendEditField\(versLabel, versInput\)/);
    assert.match(detail, /appendEditField\(encLabel, encSelect\)/);
    assert.match(detail, /appendEditField\(yearLabel, yearsWrapper\)/);
    assert.match(detail, /appendEditField\(catLabel, catSelect\)/);
    assert.match(detail, /appendEditField\(vinLabel, vinInput, true\)/);
    assert.match(detail, /versLabel\.htmlFor = versInput\.id/);
    assert.match(detail, /encLabel\.htmlFor = encSelect\.id/);
    assert.match(detail, /yearLabel\.htmlFor = inputDesde\.id/);
    assert.match(detail, /catLabel\.htmlFor = catSelect\.id/);
    assert.match(detail, /vinLabel\.htmlFor = vinInput\.id/);
    assert.match(css, /\.detail-edit-grid \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

testCase("la nota y la imagen tienen espacios y límites propios", () => {
    assert.match(detail, /detail-edit-note-field/);
    assert.match(detail, /notaLabel\.htmlFor = notaInput\.id/);
    assert.match(detail, /detail-vehicle-image/);
    assert.match(css, /\.detail-edit-note-field \.rich-editor-toolbar/);
    assert.match(css, /\.detail-vehicle-image \{[\s\S]*?max-height: 200px/);
});

testCase("corte recomendado y acordeones tienen agrupación visual", () => {
    assert.match(detail, /recommendedSection\.className = "detail-recommended-cut"/);
    assert.match(detail, /title\.className = "detail-section-heading"/);
    assert.match(detail, /accordionContainer\.className = "detail-accordion-stack"/);
    assert.match(css, /\.detail-recommended-cut \{[\s\S]*?border-radius: 10px/);
    assert.match(css, /\.detail-accordion-stack \{[\s\S]*?gap: 8px/);
});

testCase("el modal se adapta a móvil y respeta movimiento reducido", () => {
    assert.match(css, /#detalleCompleto \{[\s\S]*?width: min\(94vw, 920px\)/);
    assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.detail-edit-grid \{\s*grid-template-columns: minmax\(0, 1fr\)/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?#modalDetalle/);
});

testCase("se preservan permisos y operaciones y no se añaden ayudas al detalle del vehículo", () => {
    assert.match(detail, /const canPrintOrEditVehicle = \["desarrollador", "jefe", "supervisor"\]\.includes\(userRole\)/);
    assert.match(detail, /saveFieldSilently\(activeItem\.id/);
    assert.match(detail, /exitModalEditMode\(true, activeItem\.id/);
    assert.doesNotMatch(detail, /gp-help-trigger|gp-help-popover|fa-circle-info/);
});

console.log("CutDetailModalLayout: " + passed + "/" + passed + " PASS");
