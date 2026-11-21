import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const css = readFileSync(resolve(root, "style.css"), "utf8");
let passed = 0;
function testCase(name, fn) { fn(); passed++; console.log("PASS " + name); }

testCase("la base de .info-modal-content está definida una sola vez", () => {
    assert.equal((css.match(/^\.info-modal-content\s*\{/gm) || []).length, 1);
    const start = css.indexOf(".info-modal-content {");
    const end = css.indexOf("\n}", start);
    assert.ok(start >= 0 && end > start);
    const base = css.slice(start, end);
    assert.match(base, /box-sizing:\s*border-box\s*!important/);
    assert.match(base, /overflow-x:\s*hidden\s*!important/);
    assert.match(base, /padding:\s*25px/);
    assert.match(base, /border-radius:\s*12px/);
    assert.match(base, /width:\s*90%/);
    assert.match(base, /max-width:\s*650px/);
    assert.match(base, /max-height:\s*calc\(var\(--app-height, 100%\) \* 0\.9\)/);
    assert.match(base, /overflow-y:\s*auto/);
    assert.match(base, /position:\s*relative/);
});

testCase("los temas y variantes de modal mantienen su especificidad", () => {
    assert.match(css, /\.dark-mode \.info-modal-content\s*\{[\s\S]*?background-color:\s*var\(--modal-bg\)/);
    assert.match(css, /#about-us-modal \.info-modal-content\s*\{[\s\S]*?text-align:\s*left/);
    assert.match(css, /#terms-agreement-modal \.info-modal-content\s*\{[\s\S]*?text-align:\s*left/);
    assert.match(css, /#dashboard-modal \.info-modal-content\s*\{[^}]*max-width:\s*1100px\s*!important/);
});

testCase("el botón de cierre conserva una sola base y variantes de foco", () => {
    assert.equal((css.match(/^\.info-close-btn\s*\{/gm) || []).length, 1);
    const start = css.indexOf(".info-close-btn {");
    const end = css.indexOf("\n}", start);
    const base = css.slice(start, end);
    assert.match(base, /position:\s*absolute/);
    assert.match(base, /width:\s*40px/);
    assert.match(base, /height:\s*40px/);
    assert.match(css, /\.info-close-btn:focus-visible\s*\{[^}]*outline:/);
});

console.log("InfoModalStyleCascade: " + passed + "/" + passed + " PASS");
