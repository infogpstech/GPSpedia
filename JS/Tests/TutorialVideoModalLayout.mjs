import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ui = readFileSync("JS/Frontend/ui.js", "utf8");
const css = readFileSync("style.css", "utf8");
const start = ui.indexOf("export function mostrarDetalleTutorialModal(");
const end = ui.indexOf("\nfunction mostrarDetalleRelayModal(", start);
assert.ok(start >= 0 && end > start, "No se encontró el renderizador del modal de tutoriales.");
const render = ui.slice(start, end);
assert.match(render, /videoContainer\.className\s*=\s*"tutorial-video-container"/);
assert.match(render, /flex:0 0 auto/);
assert.match(render, /aspect-ratio:16\/9/);
assert.match(render, /max-height:none/);
assert.doesNotMatch(render, /max-height:315px/);
assert.match(render, /iframe\.style\.cssText\s*=\s*"[^"]*width:100%;height:100%/);
assert.match(css, /#modalDetalle\[data-modal-type="tutorial"\]\s+#detalleCompleto\s+\.tutorial-video-container\s*\{[^}]*flex:\s*0 0 auto;[^}]*aspect-ratio:\s*16\s*\/\s*9;[^}]*max-height:\s*none;/s);
assert.match(css, /\.tutorial-video-container\s*>\s*\.tutorial-youtube-embed\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;/s);
console.log("TutorialVideoModalLayout: 8/8 PASS");
