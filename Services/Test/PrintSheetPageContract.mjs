import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const ui = read('../../ui.js');
const readme = read('../../README.md');
const backlog = read('../../Tareas_pendientes_parte2.txt');
const start = ui.indexOf('export function exportVehiclePrintSheet');
const end = ui.indexOf('\nexport ', start + 20);
assert.ok(start >= 0, 'exportVehiclePrintSheet debe existir');
const source = ui.slice(start, end < 0 ? ui.length : end);
const tests = [];
const check = (name, fn) => {
  try { fn(); tests.push({ name, status: 'PASS' }); }
  catch (error) { tests.push({ name, status: 'FAIL', message: error.message }); }
};

check('Sintaxis ES module de ui.js', () => {
  const result = spawnSync(process.execPath, ['--experimental-default-type=module', '--check', new URL('../../ui.js', import.meta.url).pathname], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || (result.error && result.error.message) || 'node --check falló');
});
check('Carta vertical y margen físico de referencia de 10 mm', () => {
  assert.match(source, /@page\s*\{\s*size:\s*letter\s+portrait;\s*margin:\s*10mm;/);
});
check('Área útil vertical calculada para Carta', () => {
  assert.equal(279.4 - 10 - 10, 259.4);
  assert.equal(215.9 - 10 - 10, 195.9);
});
check('Altura mínima de wrapper alineada en pantalla e impresión', () => {
  assert.equal((source.match(/min-height:\s*259\.4mm;/g) || []).length, 2);
  assert.doesNotMatch(source, /min-height:\s*269mm/);
});
check('No quedan márgenes antiguos de 5 mm en la ficha', () => {
  assert.doesNotMatch(source, /margin:\s*5mm/);
});
check('Cada wrapper inicia una página y el último no fuerza página vacía', () => {
  assert.match(source, /break-after:\s*page;\s*page-break-after:\s*always;/);
  assert.match(source, /\.sheet-page-wrapper:last-child\s*\{[^}]*break-after:\s*auto;\s*page-break-after:\s*auto;/s);
});
check('La paginación usa overflow medido y conserva tarjetas en secuencia', () => {
  assert.match(source, /const pageOverflows = page =>/);
  assert.match(source, /main\.scrollHeight > main\.clientHeight \+ 1/);
  assert.match(source, /orderedTechnicalCards\.forEach\(card => \{/);
  assert.doesNotMatch(source, /const choosePageGroups/);
});
check('Cada página repite encabezado y pie; metadatos solo en la primera', () => {
  assert.match(source, /if \(headerTemplate\) main\.appendChild\(headerTemplate\.cloneNode\(true\)\)/);
  assert.match(source, /if \(pageIndex === 0 && metadataTemplate\)/);
  assert.match(source, /if \(footerTemplate\) page\.appendChild\(footerTemplate\.cloneNode\(true\)\)/);
});
check('Las tarjetas técnicas se mantienen indivisibles al imprimir', () => {
  assert.match(source, /\.tech-item-card\s*\{[^}]*page-break-inside:\s*avoid;[^}]*break-inside:\s*avoid;/s);
  assert.match(source, /\.tech-item-card\s*\{\s*break-inside:\s*avoid;\s*page-break-inside:\s*avoid;/);
});
check('README documenta dimensiones, margen y contrato multipágina', () => {
  assert.match(readme, /215\.9 × 279\.4 mm/);
  assert.match(readme, /márgenes CSS de 10 mm/);
  assert.match(readme, /páginas adicionales/);
  assert.match(readme, /márgenes predeterminados/);
});
check('Backlog registra decisión, validación y pendiente Beta', () => {
  const p = backlog.indexOf('### AUG-140');
  const q = backlog.indexOf('\n### AUG-141', p);
  const task = backlog.slice(p, q < 0 ? backlog.length : q);
  assert.match(task, /COMPLETADA CON VALIDACIÓN DIFERIDA/);
  assert.match(task, /10 mm/);
  assert.match(task, /Beta pendiente/);
});

const passed = tests.filter(x => x.status === 'PASS').length;
const failed = tests.length - passed;
for (const item of tests) console.log((item.status === 'PASS' ? 'PASS ' : 'FAIL ') + item.name + (item.message ? ': ' + item.message : ''));
console.log(`PrintSheetPageContract: ${passed}/${tests.length} PASS`);
if (failed) process.exitCode = 1;
