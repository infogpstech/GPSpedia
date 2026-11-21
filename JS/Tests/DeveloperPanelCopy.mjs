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
    for (const phrase of ["No representa todas las solicitudes HTTP", "fórmula original", "lotes confirmados", "no mueve archivos", "no solo la carpeta Cortes", "no existan referencias activas", "carpeta principal Cortes"]) {
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

testCase("las ayudas del inventario y auditoría están asociadas a su modal correcto", () => {
    assert.match(html, /id="replaced-images-modal"[^>]*aria-labelledby="replaced-images-title"/);
    assert.match(html, /id="audit-drive-modal"[^>]*aria-labelledby="audit-drive-title"/);
    for (const id of ["dev-help-library", "dev-help-audit-scope", "dev-help-audit-categories"]) {
        assert.ok(html.includes('aria-controls="' + id + '"'), id);
        assert.ok(html.includes('id="' + id + '"'), id);
    }
});

console.log("DeveloperPanelCopy: " + passed + "/" + passed + " PASS");
