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

testCase("el modal Relay coloca título a la izquierda y cierre arriba a la derecha", () => {
    const relayStart = ui.indexOf("function mostrarDetalleRelayModal");
    const relayEnd = ui.indexOf("\n}", relayStart);
    const relay = ui.slice(relayStart, relayEnd > relayStart ? relayEnd : relayStart + 2200);
    assert.match(relay, /detail-modal-toolbar relay-detail-toolbar/);
    assert.match(relay, /relay-detail-title/);
    assert.match(relay, /position:absolute; top:0; right:0/);
    assert.match(css, /\.relay-detail-toolbar \{[\s\S]*?justify-content:flex-start/);
    assert.match(css, /\.relay-detail-toolbar > \.info-close-btn \{[\s\S]*?right:0/);
});

testCase("la cabecera y acciones del modal se agrupan en una barra flexible", () => {
    assert.match(detail, /headerDiv\.className = "detail-modal-toolbar"/);
    for (const label of ["Compartir vehículo", "Imprimir ficha técnica", "Activar modo edición", "Guardar cambios", "Descartar cambios"]) {
        assert.ok(detail.includes('setAttribute("aria-label", "' + label + '")'), label);
    }
    assert.match(css, /\.detail-modal-toolbar \{[\s\S]*?display: grid;[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto/);
    assert.match(css, /\.detail-modal-header-actions \{[\s\S]*?grid-column: 2;[\s\S]*?flex-wrap: nowrap/);
    assert.match(css, /\.detail-modal-header-actions \.share-modal-btn \{[\s\S]*?width: 34px;[\s\S]*?height: 34px/);
    assert.match(css, /\.detail-modal-toolbar > \.info-close-btn[\s\S]*?right:0/);
    assert.match(detail, /headerDiv\.appendChild\(headerActions\)[\s\S]*?headerDiv\.appendChild\(closeBtn\)/);
});

testCase("ninguna regla posterior puede sustituir la cuadrícula del encabezado por flex", () => {
    assert.doesNotMatch(css, /\.detail-modal-toolbar\s*\{[^}]*display\s*:\s*flex/);
    assert.doesNotMatch(css, /\.detail-modal-header-actions\s*\{[^}]*order\s*:\s*2/);
    assert.match(css, /\.detail-modal-toolbar\s*\{[^}]*display\s*:\s*grid/);
    assert.match(css, /\.detail-modal-header-actions\s*\{[^}]*grid-column\s*:\s*2/);
    assert.match(css, /\.detail-modal-header-actions\s*\{[^}]*grid-row\s*:\s*1/);
    assert.match(css, /\.detail-modal-toolbar\s*>\s*\.info-close-btn\s*\{[^}]*position:\s*absolute/);
});

testCase("el logo y el modelo ocupan la esquina superior izquierda sin desplazar las acciones", () => {
    assert.match(detail, /headerDiv\.insertBefore\(titleContainer, savingIndicator\)/);
    assert.doesNotMatch(detail, /cont\.appendChild\(titleContainer\)/);
    assert.match(css, /\.detail-modal-toolbar \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto/);
    assert.match(css, /\.detail-modal-title \{[\s\S]*?grid-column: 1;[\s\S]*?grid-row: 1/);
    assert.match(css, /\.detail-modal-header-actions \{[\s\S]*?grid-column: 2;[\s\S]*?grid-row: 1/);
    assert.match(css, /\.detail-modal-toolbar > \.info-close-btn \{[\s\S]*?right:0/);
});

testCase("el catálogo reduce 70% el margen de la navegación y uniforma carruseles", () => {
    assert.match(ui, /section\.className = 'home-carousel-section'/);
    assert.match(ui, /title\.style\.margin = '12px 0 10px'/);
    assert.match(css, /\.section-selector \{[\s\S]*?margin-bottom: 6px/);
    assert.match(css, /#contenido > \.home-carousel-section \{ margin:12px 0 16px; \}/);
});

testCase("el título y metadatos se separan del área de edición", () => {
    assert.match(detail, /titleContainer\.className = "detail-modal-title"/);
    assert.match(detail, /subHeaderDiv\.className = "detail-modal-meta"/);
    assert.match(detail, /subHeaderText\.className = "detail-modal-meta-text"/);
    assert.match(detail, /const subHeaderText = document\.createElement\('div'\)/);
    assert.match(css, /\.detail-modal-title-text \{[\s\S]*?overflow-wrap: anywhere/);
});

testCase("la imagen del logo aumenta 20% y el modelo permanece en una sola línea", () => {
    assert.match(css, /\.brand-logo-modal \{[\s\S]*?height: 69\.12px !important;[\s\S]*?max-height: 69\.12px !important/);
    assert.match(css, /@media \(max-width: 600px\)[\s\S]*?\.brand-logo-modal \{\s*height: 54\.72px !important;\s*max-height: 54\.72px !important/);
    assert.match(css, /\.detail-modal-title \{[\s\S]*?flex-wrap: nowrap;[\s\S]*?overflow: hidden/);
    assert.match(css, /\.detail-modal-title-text \{[\s\S]*?white-space: nowrap;[\s\S]*?text-overflow: ellipsis/);
    assert.doesNotMatch(css, /\.detail-modal-title--stacked \.detail-modal-title-text/);
    assert.doesNotMatch(detail, /detail-modal-title--stacked|new ResizeObserver\(updateTitleLayout\)/);
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

testCase("el editor abre sin esperar a la carga de opciones y actualiza los selectores después", () => {
    assert.doesNotMatch(detail, /await precargarDropdownOptions\(\)/);
    assert.match(detail, /const dropdownOptionsReady = precargarDropdownOptions\(\)/);
    assert.match(detail, /dropdownOptionsReady\.then\(\(\)\s*=>/);
    assert.match(ui, /function populateModalDropdown_\(/);
    assert.match(ui, /function refreshModalEditDropdownOptions_\(/);
    for (const key of ["tipoDeCorte", "configRelay", "tipoDeEncendido", "categoria"]) {
        assert.ok(ui.includes('dataset.dropdownKey = "' + key + '"'), key);
    }
});
testCase("se preservan permisos y operaciones y no se añaden ayudas al detalle del vehículo", () => {
    assert.match(detail, /const canPrintOrEditVehicle = \["desarrollador", "jefe", "supervisor"\]\.includes\(userRole\)/);
    assert.match(detail, /saveFieldSilently\(activeItem\.id/);
    assert.match(detail, /exitModalEditMode\(true, activeItem\.id/);
    assert.doesNotMatch(detail, /gp-help-trigger|gp-help-popover|fa-circle-info/);
});


testCase("en móvil/PWA las acciones permanecen en la misma fila, antes del cierre, sin quedar debajo del logo", () => {
    assert.match(css, /\.detail-modal-toolbar \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto/);
    assert.match(css, /\.detail-modal-header-actions \{[\s\S]*?flex-wrap: nowrap/);
    assert.match(css, /\.detail-modal-toolbar > \.info-close-btn \{[\s\S]*?right:0/);
    assert.doesNotMatch(css, /@media \(max-width:560px\) \{[\s\S]*?\.detail-modal-title \{\s*flex-basis:100%/);
    assert.match(css, /@media \(max-width:560px\)[\s\S]*?\.detail-modal-header-actions \.share-modal-btn \{[\s\S]*?width: 32px;[\s\S]*?height: 32px/);
});

console.log("CutDetailModalLayout: " + passed + "/" + passed + " PASS");
