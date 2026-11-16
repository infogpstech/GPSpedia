import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const index = read("../../index.html");
const ui = read("../Frontend/ui.js");
const style = read("../../style.css");
const users = read("../../HTML/users.html");

let passed = 0;
function check(name, fn) { fn(); passed++; console.log("PASS " + name); }

check("Los modales principales no usan spans como controles de cierre", () => {
    assert.doesNotMatch(index, /<span\b[^>]*class=["'][^"']*info-close-btn/);
    assert.doesNotMatch(ui, /<span\b[^>]*class=["'][^"']*info-close-btn/);
    assert.doesNotMatch(users, /<span\b[^>]*class=["'][^"']*close-btn/);
});
check("Los cierres estáticos tienen type button y nombre accesible", () => {
    const buttons = [...index.matchAll(/<button\b[^>]*class=["'][^"']*info-close-btn[^"']*["'][^>]*>/g)].map(x => x[0]);
    assert.ok(buttons.length >= 6);
    for (const button of buttons) {
        assert.match(button, /type=["']button["']/);
        assert.match(button, /aria-label=["'][^"']+["']/);
    }
});
check("Los cierres dinámicos se crean como botones no submit y tienen aria-label", () => {
    assert.match(ui, /document\.createElement\('button'\);\s*closeBtn\.type = 'button';\s*closeBtn\.className = 'info-close-btn';\s*closeBtn\.setAttribute\('aria-label'/);
    assert.match(ui, /closeBtn\.type = "button";\s*closeBtn\.setAttribute\("aria-label", "Cerrar ventana"\)/);
});
check("Los botones de cierre comparten dimensiones, contraste, hover y foco visible", () => {
    assert.match(style, /\.info-close-btn\s*\{[\s\S]*?width:\s*40px;[\s\S]*?height:\s*40px;/);
    assert.match(style, /\.info-close-btn:hover:not\(:disabled\)/);
    assert.match(style, /\.info-close-btn:focus-visible/);
    assert.match(style, /#inbox-modal-content \.inbox-close-button \{ top: 10px; right: 12px; \}/);
    assert.match(style, /#replaced-image-lightbox-close \{ top: -14px; right: -14px; \}/);
});
check("El panel de usuarios usa el mismo patrón de cierre accesible", () => {
    const buttons = [...users.matchAll(/<button\b[^>]*class=["'][^"']*close-btn[^"']*["'][^>]*>/g)].map(x => x[0]);
    assert.equal(buttons.length, 3);
    for (const button of buttons) {
        assert.match(button, /type=["']button["']/);
        assert.match(button, /aria-label=["'][^"']+["']/);
    }
    assert.match(users, /\.close-btn:focus-visible/);
});
check("La animación respeta preferencias de movimiento reducido", () => {
    assert.match(style, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.info-close-btn \{ transition: none; \}/);
    assert.match(users, /@media \(prefers-reduced-motion: reduce\)/);
});
console.log("ModalCloseButtonContract: " + passed + "/" + passed + " PASS");
