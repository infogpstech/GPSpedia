import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const css = readFileSync(resolve(root, "style.css"), "utf8");
let passed = 0;
function testCase(name, fn) { fn(); passed++; console.log("PASS " + name); }

testCase("el encabezado Inbox tiene un único bloque con sus variantes responsive", () => {
    const marker = "BLOQUE CONSOLIDADO — encabezado del modal Inbox";
    assert.equal(css.split(marker).length - 1, 1);
    const index = css.indexOf(marker);
    const before = css.slice(0, index);
    const consolidated = css.slice(index);
    assert.doesNotMatch(before, /^\s*#inbox-modal-content\s+\.(?:inbox-modal-header|inbox-heading-block|inbox-header-actions)\s*\{/m);
    assert.match(consolidated, /#inbox-modal-content \.inbox-modal-header \{/);
    assert.match(consolidated, /#inbox-modal-content \.inbox-heading-block \{/);
    assert.match(consolidated, /#inbox-modal-content \.inbox-header-actions/);
    assert.match(consolidated, /@media[\s\S]*?#inbox-modal-content \.inbox-modal-header/);
    assert.match(consolidated, /padding:0 48px 10px 0/);
});

testCase("el título de Developer Tools conserva sus reglas en un único bloque", () => {
    const marker = "BLOQUE CONSOLIDADO — título del modal Developer Tools";
    assert.equal(css.split(marker).length - 1, 1);
    const index = css.indexOf(marker);
    const before = css.slice(0, index);
    const consolidated = css.slice(index);
    assert.doesNotMatch(before, /^\s*#dev-tools-modal \.dev-tools-title\s*\{/m);
    assert.match(consolidated, /#dev-tools-modal \.dev-tools-title\s*\{[\s\S]*?padding-right:\s*34px/);
    assert.match(consolidated, /border-bottom:\s*1px solid var\(--border-color\)/);
    assert.match(consolidated, /animation:\s*dev-tools-title-expand/);
    assert.match(consolidated, /white-space:\s*normal/);
    assert.match(consolidated, /overflow-wrap:\s*anywhere/);
});

console.log("ModalHeaderCascade: " + passed + "/" + passed + " PASS");
