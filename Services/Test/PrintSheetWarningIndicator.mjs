import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../ui.js', import.meta.url), 'utf8');
const start = source.indexOf('export function exportVehiclePrintSheet');
const end = source.indexOf('\nexport ', start + 20);
assert.ok(start >= 0, 'Debe existir la función de ficha imprimible');
const print = source.slice(start, end < 0 ? source.length : end);
const checks = [];
const check = (name, fn) => {
  try { fn(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', message: error.message }); }
};

check('El estado activo se basa en el campo normalizado activaTestigo', () => {
  assert.match(print, /testigoHtml:\s*c\.activaTestigo\s*===\s*true/);
  assert.doesNotMatch(print, /testigoHtml:\s*c\.activaTestigo\s*\?/);
});
check('El recurso Check Engine es SVG local sin dependencia externa', () => {
  assert.match(print, /<svg class="testigo-engine-icon" viewBox="0 0 64 48"/);
  assert.match(print, /aria-label="Indicador Check Engine"/);
  assert.doesNotMatch(print, /fa-solid fa-(?:triangle-exclamation|engine)/);
  assert.doesNotMatch(print, /https?:[^"'\s]*check.?engine/i);
});
check('El SVG conserva proporción mediante viewBox y relación de aspecto', () => {
  assert.match(print, /viewBox="0 0 64 48"/);
  assert.match(print, /\.testigo-engine-icon\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*3;/s);
  assert.match(print, /object-fit:\s*contain/);
});
check('El aviso aparece después de la imagen técnica y fuera de la información textual', () => {
  const bodyStart = print.indexOf('<div class="tech-item-body">');
  const bodyEnd = print.indexOf('</div>\n        </div>', bodyStart);
  const body = print.slice(bodyStart, bodyEnd);
  assert.ok(bodyStart >= 0 && bodyEnd > bodyStart, 'Debe existir el cuerpo de la tarjeta');
  assert.ok(body.indexOf('tech-item-img-wrapper') < body.indexOf('entry.testigoHtml'));
  assert.ok(body.indexOf('entry.infoHtml') < body.indexOf('entry.testigoHtml'));
});
check('Los cortes sin imagen conservan el aviso', () => {
  assert.match(print, /tech-item-img-wrapper[\s\S]*?entry\.testigoHtml \|\| ''/);
});
check('El indicador se evita dividir entre páginas', () => {
  assert.match(print, /\.testigo-indicator\s*\{[^}]*break-inside:\s*avoid;[^}]*page-break-inside:\s*avoid;/s);
});
check('El estado inactivo/no especificado no genera aviso', () => {
  assert.match(print, /c\.activaTestigo\s*===\s*true/);
  assert.doesNotMatch(print, /activaTestigo\s*!==\s*false/);
});
check('Las tarjetas auxiliares inicializan testigoHtml vacío', () => {
  assert.ok((print.match(/testigoHtml:\s*''/g) || []).length >= 2);
});
check('El aviso no utiliza Font Awesome en el documento independiente', () => {
  assert.doesNotMatch(print, /fa-solid|fontawesome|font-awesome/i);
});

const passed = checks.filter(x => x.status === 'PASS').length;
for (const item of checks) console.log((item.status === 'PASS' ? 'PASS ' : 'FAIL ') + item.name + (item.message ? ': ' + item.message : ''));
console.log('PrintSheetWarningIndicator: ' + passed + '/' + checks.length + ' PASS');
if (passed !== checks.length) process.exitCode = 1;