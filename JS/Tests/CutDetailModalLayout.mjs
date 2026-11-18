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

testCase("la línea azul conserva márgenes laterales simétricos y no desborda el viewport", () => {
    const cutDivider = css.slice(css.indexOf('#modalDetalle[data-modal-type="corte"] .detail-modal-divider {'));
    assert.match(cutDivider, /width:auto !important;[\s\S]*?justify-self:stretch;[\s\S]*?margin:1px 6px 2px !important/);
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
    assert.match(css, /#modalDetalle\[data-modal-type="corte"\] \.detail-modal-title \{[\s\S]*?grid-column:1;[\s\S]*?grid-row:1 \/ span 2;[\s\S]*?align-self:end;/);
    assert.match(css, /\.detail-modal-header-actions \{[\s\S]*?grid-column: 2;[\s\S]*?grid-row: 1/);
    assert.match(css, /#modalDetalle\[data-modal-type="corte"\] \.detail-modal-title-text \{[\s\S]*?grid-column:2;[\s\S]*?grid-row:2;/);
    assert.ok(detail.includes("headerActions.appendChild(closeBtn)"));
    assert.match(detail, /headerDiv\.insertBefore\(titleContainer, savingIndicator\)[\s\S]*?headerDiv\.insertBefore\(titleNode, savingIndicator\)/);
});

testCase("el encabezado de corte no hereda sangría derecha y fija el cierre al extremo del modal", () => {
    assert.match(css, /#modalDetalle\[data-modal-type="corte"\] \.detail-modal-toolbar \{[\s\S]*?padding-right:0 !important/);
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

testCase("el contenedor del logo ocupa dos filas y se alinea abajo junto al nombre del modelo", () => {
    assert.ok(detail.includes("headerDiv.insertBefore(titleContainer, savingIndicator)"));
    assert.ok(detail.includes("headerDiv.insertBefore(titleNode, savingIndicator)"));
    assert.ok(!detail.includes("titleContainer.appendChild(title)") && !detail.includes("titleContainer.appendChild(input)"));
    const logoStart = css.indexOf('#modalDetalle[data-modal-type="corte"] .detail-modal-title {');
    const logoEnd = css.indexOf("}", logoStart);
    const logoRule = css.slice(logoStart, logoEnd);
    assert.ok(logoRule.includes("grid-row:1 / span 2;"));
    assert.ok(logoRule.includes("align-self:end;"));
    const modelStart = css.indexOf('#modalDetalle[data-modal-type="corte"] .detail-modal-title-text {');
    const modelEnd = css.indexOf("}", modelStart);
    const modelRule = css.slice(modelStart, modelEnd);
    assert.ok(modelRule.includes("grid-column:2;"));
    assert.ok(modelRule.includes("grid-row:2;"));
    const mobileStart = css.indexOf("GP-UX-DETAIL-LOGO-MOBILE-02");
    const mobileRuleStart = css.indexOf('#modalDetalle[data-modal-type="corte"] .detail-modal-title {', mobileStart);
    const mobileRuleEnd = css.indexOf("}", mobileRuleStart);
    const mobileRule = css.slice(mobileRuleStart, mobileRuleEnd);
    assert.ok(mobileRule.includes("grid-row:1 / span 2;"));
    assert.ok(mobileRule.includes("align-self:end;"));
    assert.ok(css.includes("grid-column:2;") && css.includes("grid-row:1;"));
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

testCase("el tamaño del logo se conserva y móvil usa ancho natural con gap de 6px", () => {
    assert.match(css, /\.detail-modal-title \.brand-logo-modal \{[\s\S]*?height: 120px !important;[\s\S]*?max-height: 120px !important/);
    const mobileLogoRules = css.slice(css.indexOf("GP-UX-DETAIL-LOGO-MOBILE-02"));
    assert.match(mobileLogoRules, /grid-template-columns:max-content minmax\(0,1fr\)/);
    assert.match(mobileLogoRules, /column-gap:6px/);
    assert.match(mobileLogoRules, /#modalDetalle\[data-modal-type="corte"\] \.detail-modal-title \.brand-logo-modal \{[\s\S]*?width:auto !important;[\s\S]*?height:60px !important;[\s\S]*?min-height:60px !important;[\s\S]*?max-height:60px !important;[\s\S]*?max-width:none !important;[\s\S]*?object-fit:contain/);
    const cutHeader = css.slice(css.indexOf("GP-UX-MODAL-HEADER-TIGHTEN-03"));
    assert.match(cutHeader, /\.detail-modal-title \{[\s\S]*?height:60px;[\s\S]*?min-height:60px;/);
    assert.match(mobileLogoRules, /justify-content:flex-start/);
    const mobileLogoContainerStart = mobileLogoRules.indexOf('#modalDetalle[data-modal-type="corte"] .detail-modal-title {');
    const mobileLogoContainerEnd = mobileLogoRules.indexOf("}", mobileLogoContainerStart);
    const mobileLogoContainer = mobileLogoRules.slice(mobileLogoContainerStart, mobileLogoContainerEnd);
    assert.ok(mobileLogoContainer.includes("grid-row:1 / span 2;") && mobileLogoContainer.includes("align-self:end;"));
    assert.match(cutHeader, /\.detail-modal-title \{[\s\S]*?grid-row:1 \/ span 2;[\s\S]*?align-self:end;[\s\S]*?align-items:flex-start/);
    assert.match(mobileLogoRules, /object-position:left top/);
    assert.match(mobileLogoRules, /\.detail-modal-title-text \{[\s\S]*?height:auto;[\s\S]*?min-height:0;[\s\S]*?display:flex;[\s\S]*?align-items:flex-start;[\s\S]*?align-self:flex-start;[\s\S]*?margin:6px 0 0 !important;[\s\S]*?transform:none !important/);
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


testCase("en móvil/PWA las acciones permanecen arriba a la derecha y el modelo debajo del logo", () => {
    assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*?grid-template-columns:max-content minmax\(0,1fr\)/);
    assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*?\.detail-modal-header-actions \.share-modal-btn \{[\s\S]*?width:\s*28px;[\s\S]*?height:\s*28px/);
    assert.ok(css.includes("#modalDetalle[data-modal-type=\"corte\"] .detail-modal-header-actions > .info-close-btn") && css.includes("position:static !important"));
    assert.match(css, /#modalDetalle\[data-modal-type="corte"\] \.detail-modal-title-text \{[\s\S]*?grid-column:2;[\s\S]*?grid-row:1 \/ span 2;/);
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
    assert.match(css, /#modalDetalle\[data-modal-type="corte"\] \.detail-modal-title-text \{[\s\S]*?grid-column:2;[\s\S]*?grid-row:2;[\s\S]*?align-self:flex-start;[\s\S]*?margin-top:6px;[\s\S]*?transform:none/);
    assert.match(css, /#modalDetalle\[data-modal-type="corte"\] \.detail-modal-title-input \{[\s\S]*?grid-column:2;[\s\S]*?grid-row:2;[\s\S]*?align-self:flex-start;[\s\S]*?margin-top:6px/);
    const mobileCutHeader = css.slice(css.indexOf("GP-UX-DETAIL-LOGO-MOBILE-02"));
    assert.match(mobileCutHeader, /\.detail-modal-title-input \{[\s\S]*?grid-column:2;[\s\S]*?grid-row:2;[\s\S]*?align-self:flex-start;[\s\S]*?margin-top:6px/);
    assert.match(css, /#modalDetalle\[data-modal-type="corte"\] \.detail-modal-divider \{[\s\S]*?grid-row:3;[\s\S]*?width:auto !important;[\s\S]*?margin:1px 6px 2px !important/);
});




testCase("el divisor azul ocupa el ancho del encabezado y la sombra del logo no se recorta", () => {
    assert.match(detail, /headerDivider\.className = "detail-modal-divider"/);
    assert.match(detail, /headerDiv\.insertBefore\(headerDivider, savingIndicator\)/);
    assert.match(css, /#modalDetalle\[data-modal-type="corte"\] \.detail-modal-divider \{[\s\S]*?grid-row:3;[\s\S]*?width:auto !important;[\s\S]*?margin:1px 6px 2px !important/);
    assert.match(css, /#modalDetalle\[data-modal-type="corte"\] \.detail-modal-title \{[\s\S]*?height:120px;[\s\S]*?min-height:120px;[\s\S]*?padding:0 !important/);
    assert.match(css, /\.detail-modal-title \.brand-logo-modal \{[\s\S]*?object-fit: contain/);
    const desktopLogoStart = css.indexOf('#modalDetalle[data-modal-type="corte"] .detail-modal-title .brand-logo-modal {');
    const desktopLogoRule = css.slice(desktopLogoStart, css.indexOf("}", desktopLogoStart));
    assert.ok(desktopLogoStart >= 0 && desktopLogoRule.includes("object-position:left top;"));
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

testCase("el logo ocupa dos filas y su contenedor se alinea abajo junto al modelo", () => {
    const cutHeader = css.slice(css.indexOf("GP-UX-MODAL-HEADER-TIGHTEN-03"));
    assert.match(cutHeader, /\.detail-modal-toolbar \{[\s\S]*?grid-template-columns:max-content minmax\(0,1fr\);[\s\S]*?grid-template-rows:auto auto auto auto/);
    assert.match(cutHeader, /\.detail-modal-title \{[\s\S]*?grid-column:1;[\s\S]*?grid-row:1 \/ span 2;[\s\S]*?width:max-content;[\s\S]*?height:120px;[\s\S]*?align-items:flex-start/);
    assert.match(cutHeader, /\.detail-modal-title-text \{[\s\S]*?grid-column:2;[\s\S]*?grid-row:2/);
    assert.match(cutHeader, /\.detail-modal-header-actions \{[\s\S]*?justify-content:flex-end/);
    assert.match(cutHeader, /\.detail-modal-divider \{[\s\S]*?grid-column:1 \/ -1;[\s\S]*?grid-row:3;[\s\S]*?width:auto !important;[\s\S]*?margin:1px 6px 2px !important/);
    assert.match(cutHeader, /\.detail-modal-saving-indicator \{[\s\S]*?grid-column:1 \/ -1;[\s\S]*?grid-row:4;/);
    assert.match(cutHeader, /height:60px;[\s\S]*?min-height:60px;[\s\S]*?align-items:flex-start/);
    assert.match(cutHeader, /grid-template-rows:auto auto auto auto;[\s\S]*?margin-bottom:6px/);
    assert.ok(css.includes("#detalleCompleto {") && css.includes("gap: 12px;"));
    assert.ok(css.includes("#modalDetalle[data-modal-type=\"corte\"] .detail-modal-toolbar { margin-bottom:7px; }"));
    assert.ok(css.includes("#modalDetalle[data-modal-type=\"corte\"] .detail-modal-meta { margin-top:-6px; }"));
});
testCase("el detalle de corte no permite desplazamiento horizontal y el logo conserva ancho automático", () => {
    assert.match(css, /#modalDetalle\[data-modal-type="corte"\] \{[\s\S]*?overflow-x:hidden/);
    assert.match(css, /#modalDetalle\[data-modal-type="corte"\] #detalleCompleto \{[\s\S]*?overflow-x:hidden/);
    assert.match(css, /#modalDetalle\[data-modal-type="corte"\] \.detail-modal-toolbar \{[\s\S]*?grid-template-columns:max-content minmax\(0,1fr\)/);
    assert.match(css, /#modalDetalle\[data-modal-type="corte"\] \.detail-modal-title \{[\s\S]*?width:max-content/);
    assert.match(css, /#modalDetalle\[data-modal-type="corte"\] \.detail-modal-title \.brand-logo-modal \{[\s\S]*?width:auto !important/);
    assert.match(css, /@media \(max-width:560px\)[\s\S]*?grid-template-columns:max-content minmax\(0,1fr\)/);
    assert.match(css, /@media \(max-width:560px\)[\s\S]*?max-width:none !important;[\s\S]*?object-fit:contain/);
});


testCase("el modelo conserva su posición superior junto al logo y los botones reducen su relleno horizontal", () => {
    const cutHeader = css.slice(css.indexOf("GP-UX-MODAL-HEADER-TIGHTEN-03"));
    assert.match(cutHeader, /\.detail-modal-title-text \{[\s\S]*?align-self:flex-start;[\s\S]*?margin-top:6px;[\s\S]*?transform:none/);
    assert.match(cutHeader, /\.detail-modal-header-actions \.share-modal-btn \{\s*padding:3px 2px;/);
    const mobileHeader = css.slice(css.indexOf("GP-UX-DETAIL-LOGO-MOBILE-02"));
    assert.match(mobileHeader, /\.detail-modal-title-text \{[\s\S]*?margin:6px 0 0 !important/);
    assert.match(mobileHeader, /\.detail-modal-header-actions \.share-modal-btn \{\s*padding:2px 1px;/);
    assert.match(cutHeader, /\.detail-modal-title \.brand-logo-modal \{[\s\S]*?width:auto !important;[\s\S]*?height:120px !important/);
    assert.match(mobileHeader, /\.detail-modal-title \.brand-logo-modal \{[\s\S]*?width:auto !important;[\s\S]*?height:60px !important/);
});

console.log("CutDetailModalLayout: " + passed + "/" + passed + " PASS");
