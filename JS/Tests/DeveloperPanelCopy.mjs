import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const css = readFileSync(resolve(root, "style.css"), "utf8");
const helpCss = readFileSync(resolve(root, "contextual-help.css"), "utf8");
const ui = readFileSync(resolve(root, "JS/Frontend/ui.js"), "utf8");
const start = html.indexOf('<!-- ========= MODAL DE DESARROLLADOR ========= -->');
const end = html.indexOf('<!-- ========= MODAL DE ACEPTACIÓN DE CONDICIONES ========= -->', start);
const developer = html.slice(start, end);
let passed = 0;
function testCase(name, fn) { fn(); passed++; console.log("PASS " + name); }

testCase("el modal usa títulos, secciones y acciones compactos", () => {
    for (const phrase of ["Desarrollador</h2>", "Consola</h4>", "Datos y respaldos", "Migración VIN", "Auditoría de IDs", "Migración de contraseñas", "Firmas de VIN", "Imágenes y Drive", "Logotipos de fabricante", "Formato de texto"]) {
        assert.ok(developer.includes(phrase), phrase);
    }
    for (const verbose of ["Opciones de desarrollador", "Estado y métricas de microservicios", "Motor de firmas diferenciales de VIN", "Registro de logotipo de fabricante", "Formato descriptivo global"]) {
        assert.equal(developer.includes(verbose), false, verbose);
    }
});

testCase("las explicaciones secundarias se ocultan en ayudas accesibles", () => {
    const triggers = [...developer.matchAll(/class="gp-help-trigger"[^>]*aria-controls="([^"]+)"[^>]*>/g)];
    assert.ok(triggers.length >= 10);
    for (const match of triggers) {
        const id = match[1];
        const panel = new RegExp('id="' + id + '"[^>]*class="gp-help-popover[^"]*"[^>]*role="tooltip"[^>]*hidden');
        assert.match(developer, panel, id);
    }
    assert.match(developer, /aria-expanded="false"/);
    assert.match(helpCss, /\.gp-help-trigger:focus-visible/);
    assert.match(css, /\.dev-heading-with-help/);
});

testCase("las explicaciones técnicas se conservan bajo demanda", () => {
    for (const phrase of ["fórmula original", "lotes confirmados", "no mueve archivos", "no solo la carpeta Cortes", "no existan referencias activas", "carpeta principal Cortes"]) {
        assert.ok(developer.includes(phrase), phrase);
    }
});

testCase("los estados operativos y advertencias esenciales permanecen visibles", () => {
    for (const id of ["vin-migration-status", "identifier-audit-status", "password-migration-status", "clear-selected-logs-status", "drive-storage-monitor-status"]) {
        assert.ok(developer.includes('id="' + id + '"'), id);
    }
    assert.ok(developer.includes("Requiere respaldo previo."));
    assert.ok(developer.includes("Borra IndexedDB y Storage; luego recarga."));
});

testCase("las ayudas estáticas funcionan con el controlador contextual y no invaden detalles de vehículos", () => {
    assert.match(ui, /element\.closest\("\.gp-help-trigger"\)/);
    assert.match(ui, /trigger\.setAttribute\("aria-describedby", panel\.id\)/);
    assert.match(ui, /event\.key !== "Escape"/);
    const detailStart = ui.indexOf("function mostrarDetalleModal");
    const detailEnd = ui.indexOf("\nfunction ", detailStart + 10);
    assert.ok(detailStart >= 0 && detailEnd > detailStart);
    assert.doesNotMatch(ui.slice(detailStart, detailEnd), /attachContextualHelp_|gp-help-trigger/);
});

testCase("el apartado de tráfico global retirado no aparece en la interfaz", () => {
    assert.doesNotMatch(developer, /Tráfico global coordinado|No representa todas las solicitudes HTTP|COORDINATOR/);
});

testCase("las pestañas conservan un único título visible y la consola usa controles compactos", () => {
    assert.equal((developer.match(/class="dev-panel-heading dev-panel-heading-visually-hidden"/g) || []).length, 4);
    assert.match(developer, /id="btn-clear-console-log"[^>]*aria-label="Limpiar consola"/);
    assert.match(developer, /id="btn-copy-console-log"[^>]*aria-label="Copiar registro"/);
    assert.match(developer, /class="dev-terminal-input-shell"[\s\S]*?class="dev-terminal-prompt"/);
    assert.match(developer, /id="btn-terminal-send"[^>]*aria-label="Ejecutar comando"[^>]*>&gt;_/);
});

testCase("la administración de URLs fue retirada y las demás ayudas siguen accesibles", () => {
    assert.doesNotMatch(developer, /Actualiza únicamente las URL de los cinco servicios secundarios|dev-help-central-service-urls|central-service-urls-card/);
    assert.doesNotMatch(ui, /initializeCentralServiceUrlsControl_|loadCentralServiceUrls|saveCentralServiceUrls/);
    assert.match(html, /aria-controls="dev-help-audit-organizer" aria-expanded="false"/);
    assert.match(html, /id="dev-help-audit-organizer"[^>]*class="gp-help-popover[^"]*"[^>]*hidden/);
    assert.match(html, /La simulación compara rutas, nombres, extensiones y referencias sin modificar Drive ni Spreadsheet/);
    assert.doesNotMatch(html, /<p class="text-muted">Las coincidencias por nombre, carpeta o alias son orientativas/);
    assert.doesNotMatch(html, /<p class="text-muted">La aplicación requiere aprobación explícita del Desarrollador/);
});
testCase("las ayudas del inventario y auditoría están asociadas a su modal correcto", () => {
    assert.match(html, /id="replaced-images-modal"[^>]*aria-labelledby="replaced-images-title"/);
    assert.match(html, /id="audit-drive-modal"[^>]*aria-labelledby="audit-drive-title"/);
    for (const id of ["dev-help-library", "dev-help-audit-scope", "dev-help-audit-categories"]) {
        assert.ok(html.includes('aria-controls="' + id + '"'), id);
        assert.ok(html.includes('id="' + id + '"'), id);
    }
});

console.log("DeveloperPanelCopy: " + passed + "/" + passed + " PASS");
