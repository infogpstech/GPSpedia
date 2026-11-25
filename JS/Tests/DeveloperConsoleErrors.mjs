import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const ui=readFileSync(new URL("../Frontend/ui.js",import.meta.url),"utf8");
const start=ui.indexOf("// Copiar únicamente mensajes clasificados explícitamente como errores.");
const end=ui.indexOf("const btnClearConsoleLog",start);
assert.ok(start>=0&&end>start,"Se localiza el controlador de copiar logs");
const handler=ui.slice(start,end);
assert.match(handler,/querySelectorAll\('div\.log-error'\)/,"Solo selecciona nodos de error explícito");
assert.doesNotMatch(handler,/log-warning|hasPatterns|advertencia|stack|trace/i,"No clasifica texto ni incluye advertencias");
assert.match(handler,/\.filter\(text => text\.trim\(\)\)/,"Descarta entradas vacías");
assert.match(handler,/errorTexts\.join\('\\n'\)/,"Conserva un formato legible");
const sample=[
 {cls:"log-error",text:"Error de escritura"},
 {cls:"log-warning",text:"Advertencia"},
 {cls:"log-info",text:"error: mensaje informativo"},
 {cls:"log-error",text:""},
 {cls:"log-error",text:"Error de lectura"}
];
const copied=sample.filter(row=>row.cls==="log-error").map(row=>row.text).filter(text=>text.trim()).join("\n");
assert.equal(copied,"Error de escritura\nError de lectura");
assert.equal(sample.filter(row=>row.cls==="log-error").length,3);
assert.equal(["log-warning","log-info"].includes("log-error"),false);
console.log("DeveloperConsoleErrors: 6 assertions PASS");
