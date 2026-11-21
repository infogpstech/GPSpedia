import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = path => readFileSync(resolve(root, path), "utf8");
const css = read("style.css");
const controls = read("button-system.css");
const index = read("index.html");
const users = read("HTML/users.html");

let passed = 0;
function testCase(name, fn) { fn(); passed++; console.log("PASS " + name); }

testCase("las acciones Developer no se expanden en escritorio sin necesidad", () => {
    assert.match(css, /#dev-tools-modal \.dev-action-row \{[\s\S]*?display: flex;[\s\S]*?flex-wrap: wrap/);
    assert.match(css, /#dev-tools-modal \.dev-action-row button \{\s*flex: 0 1 auto;\s*width: auto;\s*min-width: 0/);
    assert.match(css, /#dev-tools-modal \.dev-action-full \{[\s\S]*?width: auto/);
});

testCase("las acciones Developer conservan ancho completo en pantallas móviles", () => {
    const mobile = css.slice(css.lastIndexOf("@media (max-width: 520px)"));
    assert.match(mobile, /#dev-tools-modal \.dev-action-row \{\s*align-items: stretch;\s*flex-direction: column/);
    assert.match(mobile, /#dev-tools-modal \.dev-action-row button \{\s*flex: 0 0 auto;\s*width: 100%/);
});

testCase("la biblioteca mantiene campos flexibles y botones compactos", () => {
    assert.match(css, /\.replaced-images-toolbar > input[\s\S]*?flex: 1 1 100%;/);
    assert.match(css, /\.replaced-images-toolbar > button,[\s\S]*?width: auto;/);
    assert.match(css, /\.replaced-images-folder-toolbar button \{\s*flex: 0 0 auto;[\s\S]*?width: auto;/);
    assert.match(css, /\.replaced-images-selection-actions \.btn \{\s*flex: 0 1 auto;\s*width: auto/);
    assert.match(css, /#replaced-images-modal \.replaced-images-view-switch button \{\s*flex: 0 0 36px/);
});

testCase("la navegación Inbox distribuye las pestañas y evita botones de acción expansivos", () => {
    assert.match(css, /#inbox-modal-content \.inbox-folder-nav button \{\s*flex: 1 1 0;\s*width: auto/);
    assert.match(css, /#inbox-modal-content \.inbox-action-toolbar button \{\s*flex: 0 1 auto;\s*width: auto/);
    assert.match(css, /#inbox-modal-content \.inbox-view-tabs button/);
    assert.match(css, /#inbox-modal-content \.inbox-pagination button/);
});

testCase("el ancho completo queda reservado a .btn-block y las acciones de usuarios son compactas", () => {
    assert.match(controls, /\.btn-block \{\s*display: flex;\s*width: 100%/);
    assert.match(index, /id="side-menu-logout-button" class="btn btn-danger btn-block"/);
    assert.match(index, /id="btn-accept-terms" class="btn btn-primary btn-block"/);
    assert.match(css, /@media \(max-width: 600px\)[\s\S]*?\.modal-actions button,[\s\S]*?width: 100%/);
    assert.match(users, /\.actions-cell \.btn-sm, \.actions-cell \.user-icon-action, \.actions-cell \.user-session-action \{\s*flex:0 0 34px; width:34px/);
    assert.match(users, /@media \(max-width: 420px\)[\s\S]*?flex:0 0 28px; width:28px; min-width:28px; height:34px/);
});

console.log("ButtonWidthPolicy: " + passed + "/" + passed + " PASS");
