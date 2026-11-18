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

testCase("la línea azul llega al extremo del modal con márgenes simétricos y menos espacio vertical", () => {
    assert.ok(css.includes("width:calc(100% + 18px)"));
    assert.ok(css.includes("margin:1px 0 2px 6px"));
    assert.ok(css.includes(".detail-modal-divider { width:calc(100% + 22px); }"));
});

testCase("Problemas y Soluciones comparte el título azul y el cierre accesible de los demás modales", () => {
    const pysStart = ui.indexOf("export function openPysDetailModal");
    const pysEnd = ui.indexOf("/* TAREA 12", pysStart);
    const pys = ui.slice(pysStart, pysEnd > pysStart ? pysEnd : undefined);
    assert.ok(pys.includes('headerDiv.className = "tutorial-detail-toolbar pys-detail-toolbar"'));
    assert.ok(pys.includes('title.className = "tutorial-detail-title pys-detail-title"'));
    assert.ok(pys.includes('setAttribute("aria-labelledby", title.id)'));
    assert.ok(pys.includes('closeBtn.className = "info-close-btn tutorial-detail-close"'));
    assert.ok(css.includes(".tutorial-detail-title {") && css.includes("color: var(--gp-color-accent, #007bff)"));
    assert.ok(css.includes(".pys-detail-toolbar { margin:0 0 7px; padding-bottom:0; }"));
});

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

testCase("el encabezado separa logo, acciones superiores y modelo en la base derecha", () => {
    assert.match(detail, /headerDiv\.className = "detail-modal-toolbar"/);
    for (const label of ["Compartir vehículo", "Imprimir ficha técnica", "Activar modo edición", "Guardar cambios", "Descartar cambios"]) {
        assert.ok(detail.includes('setAttribute("aria-label", "' + label + '")'), label);
    }
    assert.match(css, /\.detail-modal-toolbar \{[\s\S]*?grid-template-columns: max-content minmax\(0, 1fr\);[\s\S]*?grid-template-rows: auto minmax\(0, 1fr\) auto/);
    assert.match(css, /\.detail-modal-title \{[\s\S]*?grid-column: 1;[\s\S]*?grid-row: 1 \/ span 2/);
    assert.match(css, /\.detail-modal-header-actions \{[\s\S]*?grid-column: 2;[\s\S]*?grid-row: 1/);
    assert.match(css, /\.detail-modal-title-text \{[\s\S]*?grid-column: 2;[\s\S]*?grid-row: 2;[\s\S]*?align-self: end/);
    assert.ok(detail.includes("headerActions.appendChild(closeBtn)"));
    assert.match(detail, /headerDiv\.insertBefore\(titleContainer, savingIndicator\)[\s\S]*?headerDiv\.insertBefore\(titleNode, savingIndicator\)/);
});

testCase("el encabezado de corte no hereda sangría derecha y fija el cierre al extremo del modal", () => {
    assert.ok(css.includes('#modalDetalle[data-modal-type="corte"] .detail-modal-toolbar {\n    padding-right:0 !important;'));
    assert.match(css, /#modalDetalle\[data-modal-type="corte"\] \.detail-modal-header-actions\s*\{[^}]*justify-content:flex-end/s);
    assert.match(css, /#modalDetalle\[data-modal-type="corte"\] \.detail-modal-header-actions\s*\{[^}]*width:100%/s);
    assert.ok(detail.includes("headerActions.appendChild(closeBtn)"));
});

testCase("ninguna regla posterior puede sustituir la cuadrícula del encabezado por flex", () => {
    assert.doesNotMatch(css, /\.detail-modal-toolbar\s*\{[^}]*display\s*:\s*flex/);
    assert.doesNotMatch(css, /\.detail-modal-header-actions\s*\{[^}]*order\s*:\s*2/);
    assert.match(css, /\.detail-modal-toolbar\s*\{[^}]*display\s*:\s*grid/);
    assert.match(css, /\.detail-modal-header-actions\s*\{[^}]*grid-column\s*:\s*2/);
    assert.match(css, /\.detail-modal-header-actions\s*\{[^}]*grid-row\s*:\s*1/);
    assert.ok(css.includes("#modalDetalle[data-modal-type=\"corte\"] .detail-modal-header-actions > .info-close-btn") && css.includes("position:static !important"));
});

testCase("la imagen queda a la izquierda y el modelo se alinea a su base debajo de las acciones", () => {
    assert.match(detail, /headerDiv\.insertBefore\(titleContainer, savingIndicator\)/);
    assert.match(detail, /headerDiv\.insertBefore\(titleNode, savingIndicator\)/);
    assert.doesNotMatch(detail, /titleContainer\.appendChild\(title\)|titleContainer\.appendChild\(input\)/);
    assert.match(css, /\.detail-modal-title \{[\s\S]*?grid-column: 1;[\s\S]*?grid-row: 1 \/ span 2/);
    assert.match(css, /\.detail-modal-title-text \{[\s\S]*?grid-column: 2;[\s\S]*?grid-row: 2;[\s\S]*?align-self: end/);
    assert.match(css, /\.detail-modal-header-actions \{[\s\S]*?grid-column: 2;[\s\S]*?grid-row: 1/);
});

testCase("el catálogo reduce 70% el margen de la navegación y uniforma carruseles", () => {
    assert.match(ui, /section\.className = 'home-carousel-section'/);
    assert.match(ui, /title\.style\.margin = '12px 0 10px'/);
    assert.match(css, /\.section-selector \{[\s\S]*?margin-bottom: 6px/);
    assert.match(css, /#contenido > \.home-carousel-section \{ margin:12px 0 16px; \}/);
});

testCase("el modelo y el campo de edición son nodos independientes del contenedor del logo", () => {
    assert.match(detail, /titleContainer\.className = "detail-modal-title"/);
    assert.match(detail, /let titleNode = title/);
    assert.match(detail, /titleNode = input/);
    assert.match(detail, /headerDiv\.insertBefore\(titleNode, savingIndicator\)/);
    assert.match(detail, /subHeaderDiv\.className = "detail-modal-meta"/);
    assert.match(detail, /subHeaderText\.className = "detail-modal-meta-text"/);
    assert.match(css, /\.detail-modal-title-text \{[\s\S]*?white-space: nowrap;[\s\S]*?text-overflow: ellipsis/);
});

testCase("el tamaño de logo de navegador se conserva y móvil usa 50px con gap uniforme de 6px", () => {
    assert.match(css, /\.detail-modal-title \.brand-logo-modal \{[\s\S]*?height: 120px !important;[\s\S]*?max-height: 120px !important/);
    const mobileLogoRules = css.slice(css.indexOf("GP-UX-DETAIL-LOGO-MOBILE-02"));
    assert.match(mobileLogoRules, /grid-template-columns:max-content minmax\(0,1fr\)/);
    assert.match(mobileLogoRules, /column-gap:6px/);
    assert.match(mobileLogoRules, /height:50px !important;[\s\S]*?max-height:50px !important;[\s\S]*?max-width:none !important;[\s\S]*?width:auto !important;[\s\S]*?object-fit:contain/);
    assert.match(mobileLogoRules, /justify-content:flex-start/);
    assert.match(mobileLogoRules, /align-items:flex-end/);
    assert.match(mobileLogoRules, /object-position:left bottom/);
    assert.match(mobileLogoRules, /\.detail-modal-title-text \{[\s\S]*?align-self:flex-end;[\s\S]*?transform:none !important/);
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


testCase("en móvil/PWA las acciones permanecen arriba a la derecha y el modelo abajo junto al logo", () => {
    assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*?grid-template-columns: minmax\(0, 36vw\) minmax\(0, 1fr\)/);
    assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*?\.detail-modal-header-actions \.share-modal-btn \{[\s\S]*?width:\s*28px;[\s\S]*?height:\s*28px/);
    assert.ok(css.includes("#modalDetalle[data-modal-type=\"corte\"] .detail-modal-header-actions > .info-close-btn") && css.includes("position:static !important"));
    assert.match(css, /\.detail-modal-title-text \{[\s\S]*?grid-row: 2;[\s\S]*?align-self: end/);
});


testCase("las acciones del corte conservan el orden imprimir, editar y compartir", () => {
    const printIndex = detail.indexOf('headerActions.appendChild(printBtn)');
    const editIndex = detail.indexOf('headerActions.appendChild(editBtn)');
    const shareIndex = detail.lastIndexOf('headerActions.appendChild(shareBtn)');
    assert.ok(printIndex >= 0 && editIndex > printIndex && shareIndex > editIndex);
});
testCase("Atrás cierra el detalle de corte sin restaurar una ficha anterior", () => {
    const main = read("JS/Frontend/main.js");
    assert.match(main, /const closeDetailOnBack = modalDetalle\.dataset\.modalType === 'corte'/);
    assert.match(main, /if \(!closeDetailOnBack\) \{\s*if \(ui\.restoreModalNavigationContext\(\)\) return;/);
    assert.match(ui, /modalNavStack\.length=0;\s*pendingModalViewRestore_=null;\s*if\(window\.history/);
});
testCase("el detalle de corte tiene nombre accesible y conserva el logo de marca", () => {
    assert.match(detail, /setAttribute\("aria-labelledby", title\.id\)/);
    assert.match(detail, /titleContainer\.appendChild\(logoImg\)/);
    assert.match(css, /\.detail-modal-title \.brand-logo-modal \{[\s\S]*?height: 120px !important;[\s\S]*?max-height: 120px !important/);
    assert.ok(css.includes("#modalDetalle[data-modal-type=\"corte\"] .detail-modal-title-text { transform:translateY(-6px); }"));
    assert.ok(css.includes("#modalDetalle[data-modal-type=\"corte\"] .detail-modal-divider { margin:1px 0 2px 6px; }"));
});

console.log("CutDetailModalLayout: " + passed + "/" + passed + " PASS");


testCase("el divisor azul ocupa el ancho del encabezado y la sombra del logo no se recorta", () => {
    assert.match(detail, /headerDivider\.className = "detail-modal-divider"/);
    assert.match(detail, /headerDiv\.insertBefore\(headerDivider, savingIndicator\)/);
    assert.ok(css.includes("#modalDetalle[data-modal-type=\"corte\"] .detail-modal-divider { margin:1px 0 2px 6px; }"));
    assert.ok(css.includes("#modalDetalle[data-modal-type=\"corte\"] .detail-modal-title {") && css.includes("height:129px; padding:0 !important;"));
    assert.match(css, /\.detail-modal-title \.brand-logo-modal \{[\s\S]*?object-fit: contain/);
});

testCase("el nombre del modelo recibe sombra sin modificar la imagen ni la jerarquía del encabezado", () => {
    assert.match(css, /\.detail-modal-title-text\s*\{[\s\S]*?text-shadow:\s*0 2px 4px rgba\(0,0,0,\.22\)/);
    assert.match(css, /\.detail-modal-title \.brand-logo-modal\s*\{[\s\S]*?object-fit: contain/);
});
testCase("modelo y acciones adoptan el tamaño reforzado del encabezado Relay", () => {
    assert.match(css, /\.detail-modal-title-text \{[\s\S]*?font-size: 2rem/);
    assert.match(css, /\.relay-detail-toolbar \.relay-detail-title \{[\s\S]*?font-size: 2rem/);
    assert.match(css, /\.detail-modal-header-actions \.share-modal-btn \{[\s\S]*?width: 40px;[\s\S]*?height: 40px/);
    assert.ok(css.includes("#modalDetalle[data-modal-type=\"corte\"] .detail-modal-header-actions > .info-close-btn") && css.includes("height:40px; min-height:40px"));
    assert.match(css, /@media \(max-width: 560px\)[\s\S]*?\.detail-modal-header-actions \.share-modal-btn \{[\s\S]*?width: 36px;[\s\S]*?height: 36px/);
});

testCase("el título tutorial se ajusta entre palabras y el cierre queda anclado a la esquina derecha", () => {
    const tutorialStart = ui.indexOf("export function mostrarDetalleTutorialModal");
    const tutorialEnd = ui.indexOf("\nfunction ", tutorialStart + 1);
    const tutorial = ui.slice(tutorialStart, tutorialEnd > tutorialStart ? tutorialEnd : undefined);
    assert.match(tutorial, /detail-modal-toolbar tutorial-detail-toolbar/);
    assert.match(tutorial, /title\.className = "tutorial-detail-title"/);
    assert.match(tutorial, /controlsContainer\.className = "tutorial-detail-header-actions"/);
    assert.match(tutorial, /tutorial-detail-close/);
    assert.doesNotMatch(tutorial, /closeBtn\.style\.cssText = "position:static/);
    assert.match(css, /\.tutorial-detail-title \{[\s\S]*?white-space: normal;[\s\S]*?overflow-wrap: normal;[\s\S]*?word-break: normal;[\s\S]*?hyphens: none/);
    assert.match(css, /\.tutorial-detail-toolbar > \.tutorial-detail-header-actions > \.tutorial-detail-close \{[\s\S]*?position: absolute !important;[\s\S]*?right: 0 !important/);
});
