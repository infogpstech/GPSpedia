import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync("button-system.css", "utf8");
const index = readFileSync("index.html", "utf8");
const users = readFileSync("users.html", "utf8");
const cortes = readFileSync("add_cortes.html", "utf8");
const globalCss = readFileSync("style.css", "utf8");
const main = readFileSync("main.js", "utf8");
const ui = readFileSync("ui.js", "utf8");
const serviceWorker = readFileSync("service-worker.js", "utf8");
const testDocs = readFileSync("Services/Test/README.md", "utf8");

let passed = 0;
function test(name, callback) {
    callback();
    passed++;
    console.log("PASS", name);
}

function getToken(source, selector, token) {
    const start = source.indexOf(selector + " {");
    assert.ok(start >= 0, "No se encontró " + selector);
    const end = source.indexOf("}", start);
    const line = source.slice(start, end).split("\n").find(item => item.trim().startsWith(token + ":"));
    assert.ok(line, "No se encontró " + token + " en " + selector);
    return line.slice(line.indexOf(":") + 1).replace(";", "").trim();
}

function luminance(hex) {
    const value = hex.replace("#", "");
    const rgb = [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16) / 255);
    const linear = rgb.map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(background, foreground) {
    const values = [luminance(background), luminance(foreground)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
}

test("el sistema define base, variantes, tamaños e iconos", () => {
    for (const selector of [".btn {", ".btn-primary {", ".btn-secondary {", ".btn-danger {", ".btn-warning {", ".btn-success {", ".btn-info {", ".btn-icon {", ".btn-compact,", ".btn-sm {", ".btn-block {"]) {
        assert.ok(css.includes(selector), selector);
    }
});

test("los botones tienen foco visible, hover, active y estado disabled", () => {
    assert.match(css, /\.btn:focus-visible\s*\{/);
    assert.match(css, /\.btn:hover:not\(:disabled\)/);
    assert.match(css, /\.btn:active:not\(:disabled\)/);
    assert.match(css, /\.btn:disabled,[\s\S]*?\.btn\[disabled\]/);
    assert.match(css, /cursor:\s*not-allowed/);
});

test("el estado loading y movimiento reducido son compartidos", () => {
    assert.match(css, /\.btn-loading::after\s*\{/);
    assert.match(css, /@keyframes spin-button/);
    assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test("el stylesheet no aplica reglas genéricas a inputs, selects ni textareas", () => {
    const selectors = css.split("}").map(rule => rule.split("{")[0]);
    assert.equal(selectors.some(selector => /\b(input|select|textarea)\b/i.test(selector)), false);
});

test("las variantes principales mantienen contraste mínimo AA", () => {
    const checks = [
        ["--btn-primary-bg", "#ffffff"],
        ["--btn-secondary-bg", "#ffffff"],
        ["--btn-danger-bg", "#ffffff"],
        ["--btn-warning-bg", "--btn-warning-text"],
        ["--btn-success-bg", "#ffffff"],
        ["--btn-info-bg", "#ffffff"]
    ];
    for (const [backgroundToken, foreground] of checks) {
        const background = getToken(css, ":root", backgroundToken);
        const textColor = foreground.startsWith("--") ? getToken(css, ":root", foreground) : foreground;
        assert.ok(contrast(background, textColor) >= 4.5, backgroundToken + " contrast");
    }
});

test("index carga el sistema después de style.css y usa variantes estándar", () => {
    assert.ok(index.indexOf('href="button-system.css"') > index.indexOf('href="style.css"'));
    assert.match(index, /id="side-menu-logout-button" class="btn btn-danger btn-block"/);
    assert.match(index, /id="install-button" class="btn btn-success btn-compact"/);
    assert.match(index, /id="logout-button" class="btn btn-danger btn-compact"/);
    assert.match(index, /id="btn-accept-terms" class="btn btn-primary btn-block"/);
    assert.match(index, /id="ios-install-btn-ok" class="btn btn-primary btn-block"/);
    assert.match(index, /type="submit" class="btn btn-primary btn-block"/);
});

test("users.html carga el sistema compartido y no duplica variantes base", () => {
    assert.ok(users.indexOf('href="button-system.css"') > users.indexOf("</style>"));
    assert.doesNotMatch(users, /\.btn\s*\{|\.btn-primary\s*\{|\.btn-warning\s*\{|\.btn-danger\s*\{/);
    assert.doesNotMatch(users, /\.btn-loading\s*\{/);
    assert.match(users, /id="edit-name-btn" class="btn btn-warning btn-sm"/);
});

test("add_cortes.html carga el sistema compartido y elimina variantes duplicadas", () => {
    assert.ok(cortes.indexOf('href="button-system.css"') > cortes.indexOf("</style>"));
    assert.doesNotMatch(cortes, /\.btn\s*\{|\.btn-primary\s*\{|\.btn-secondary\s*\{/);
    assert.doesNotMatch(cortes, /\.btn-loading\s*\{/);
    assert.match(cortes, /id="btn-addcorte-upload-video" class="btn btn-danger btn-compact"/);
});

test("style.css delega loading y variantes estándar al sistema compartido", () => {
    assert.doesNotMatch(globalCss, /\.btn-loading\s*\{|@keyframes spin-button/);
    assert.match(globalCss, /#login-modal button\.btn/);
    assert.match(globalCss, /\.terms-footer button\.btn/);
    assert.match(globalCss, /\.dev-tools-card button:not\(\.btn\)/);
});

test("las acciones dinámicas estándar también usan las clases compartidas", () => {
    assert.match(main, /retryButton\.className = 'btn btn-secondary btn-compact'/);
    assert.match(ui, /className = "btn btn-primary"/);
    assert.match(ui, /className = "btn btn-secondary"/);
});

test("el Service Worker precarga el CSS compartido y renueva el cache", () => {
    assert.match(serviceWorker, /gpsepedia-cache-v19/);
    assert.match(serviceWorker, /'\.\/button-system\.css'/);
});

test("las excepciones especializadas están documentadas", () => {
    for (const name of ["validation-btn", "share-modal-btn", "info-close-btn", "accordion-btn", "carousel-btn", "cable-carousel-btn", "feedback-btn-overlay", "btn-link", "btn-expand-plus", "lightbox-nav-btn"]) {
        assert.ok(testDocs.includes(name), "Falta documentar " + name);
    }
});

console.log("ButtonSystemStyles:", passed + "/12 PASS");
