import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const read = path => readFileSync(resolve(root, path), "utf8");
const html = read("index.html");
const css = read("style.css");
const ui = read("JS/Frontend/ui.js");
const auth = read("JS/Services/Auth.js");
const feedback = read("JS/Services/feedback.js");

assert.match(html, /id="clear-logs-option-select"[^>]*aria-label="Retención de registros"/);
assert.match(html, /<option value="week">Últimos 7 días<\/option>/);
assert.match(html, /<option value="all">Todos \(conservar encabezados\)<\/option>/);
assert.match(css, /\.dev-maintenance-retention\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(64px, auto\) minmax\(0, 1fr\)/);
assert.match(css, /\.dev-maintenance-retention \.dev-input\s*\{[^}]*width:\s*100%;[^}]*min-width:\s*0;[^}]*max-width:\s*100%/);
assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*?\.dev-maintenance-retention\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
assert.match(css, /\.detail-recommended-cut\s*\{[^}]*padding:\s*8px;/);
assert.match(auth, /const resultMessage = deletedCount > 0[\s\S]*?no se encontraron datos confidenciales[\s\S]*?No hay registros en la hoja Logs/);
assert.match(feedback, /const resultMessage = deletedCount > 0[\s\S]*?No se encontraron registros con más de 7 días para eliminar/);
assert.match(ui, /const message = result && result\.message \? result\.message : "Operación finalizada\."/);
console.log("AdminLogsMaintenanceContract: 10/10 PASS");
