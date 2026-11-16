import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = path => readFileSync(resolve(root, path), "utf8");
const css = read("button-system.css");
const index = read("index.html");
const users = read("HTML/users.html");
const cuts = read("HTML/add_cortes.html");
const globalCss = read("style.css");

let passed = 0;
function test(name, fn) {
    fn();
    passed++;
    console.log("PASS " + name);
}

test("las tres vistas principales cargan una vez el sistema común después de sus estilos", () => {
    assert.equal((index.match(/href="button-system\.css"/g) || []).length, 1);
    assert.ok(index.indexOf('href="button-system.css"') > index.indexOf('href="style.css"'));
    assert.equal((users.match(/href="\.\.\/button-system\.css"/g) || []).length, 1);
    assert.ok(users.indexOf('href="../button-system.css"') > users.indexOf("</style>"));
    assert.equal((cuts.match(/href="\.\.\/button-system\.css"/g) || []).length, 1);
    assert.ok(cuts.indexOf('href="../button-system.css"') > cuts.indexOf("</style>"));
});

test("el sistema define tokens comunes de campos y los hereda del tema semántico", () => {
    for (const token of ["--gp-control-bg", "--gp-control-text", "--gp-control-border", "--gp-control-placeholder",
        "--gp-control-focus", "--gp-control-disabled-bg", "--gp-control-radius", "--gp-control-min-height"]) {
        assert.ok(css.includes(token), "Falta " + token);
    }
    assert.match(css, /--gp-control-bg:\s*var\(--gp-color-surface/);
    assert.match(css, /body\.dark-mode\s*\{[\s\S]*?--gp-control-focus-shadow/);
});

test("inputs de texto, selects y textareas usan el contrato común", () => {
    assert.match(css, /body input:not\(\[type="hidden"\]\)[\s\S]*?body select[\s\S]*?body textarea/);
    assert.match(css, /min-height:\s*var\(--gp-control-min-height\)/);
    assert.match(css, /padding:\s*var\(--gp-control-padding\)/);
    assert.match(css, /border-radius:\s*var\(--gp-control-radius\)/);
    assert.match(css, /body \.form-group input[\s\S]*?body \.info-modal-content input[\s\S]*?body #dev-tools-modal \.dev-input/);
});

test("checkboxes, radios, archivos, colores y controles de acción quedan excluidos", () => {
    const base = css.slice(css.indexOf("body input:not"), css.indexOf("/* Igualar controles"));
    for (const type of ["checkbox", "radio", "file", "range", "color", "submit", "button", "reset", "image"]) {
        assert.ok(base.includes(':not([type="' + type + '"])'), "Falta excluir " + type);
    }
    assert.match(css, /body \.rich-editor-toolbar select\s*\{/);
    assert.match(css, /body #dev-tools-modal #clear-logs-option-select\s*\{/);
});

test("foco, disabled, errores y placeholders tienen estados compartidos", () => {
    assert.match(css, /:focus-visible[\s\S]*?outline:\s*2px solid var\(--gp-control-focus\)/);
    assert.match(css, /:disabled[\s\S]*?background-color:\s*var\(--gp-control-disabled-bg\)/);
    assert.match(css, /\[aria-invalid="true"\]/);
    assert.match(css, /::placeholder[\s\S]*?var\(--gp-control-placeholder\)/);
});

test("los controles mantienen tamaño legible en móvil y reducen movimiento", () => {
    assert.match(css, /@media \(max-width: 600px\)[\s\S]*?font-size:\s*16px/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?body input[\s\S]*?transition:\s*none/);
});

test("el sistema conserva la clase semántica de botones y sus estados", () => {
    assert.match(css, /\.btn\s*\{[\s\S]*?min-height:\s*40px/);
    assert.match(css, /\.btn:focus-visible/);
    assert.match(css, /\.btn-loading/);
    assert.match(globalCss, /#login-modal button\.btn/);
});

console.log("GlobalControlSystem: " + passed + "/" + passed + " PASS");
