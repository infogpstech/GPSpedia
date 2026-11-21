import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const ui = readFileSync(new URL('../Frontend/ui.js', import.meta.url), 'utf8');
const start = ui.indexOf('export function exportVehiclePrintSheet');
const end = ui.indexOf('\nexport ', start + 20);
assert.ok(start >= 0, 'Debe existir la ficha imprimible');
const print = ui.slice(start, end < 0 ? ui.length : end);
const checks = [];
const check = (name, fn) => { try { fn(); checks.push({name,status:'PASS'}); } catch (e) { checks.push({name,status:'FAIL',message:e.message}); } };
check('La paginación ya no separa tarjetas con imagen y tarjetas solo texto', () => {
  assert.doesNotMatch(print, /const imageCards = orderedTechnicalCards\.filter/);
  assert.doesNotMatch(print, /const textCards = orderedTechnicalCards\.filter/);
  assert.match(print, /orderedTechnicalCards\.forEach\(card => \{\s*appendCard\(current, card\)/);
});
check('La secuencia original se conserva y la prioridad queda primera', () => {
  assert.match(print, /\.sort\(\(a, b\) => originalOrder\(a\) - originalOrder\(b\)\)/);
  assert.match(print, /priorityCard && orderedCards\[0\] !== priorityCard/);
  assert.match(print, /data-original-order="\$\{index\}"/);
});
check('La paginación mide overflow vertical y horizontal real', () => {
  assert.match(print, /main\.scrollHeight > main\.clientHeight \+ 1/);
  assert.match(print, /main\.scrollWidth > main\.clientWidth \+ 1/);
});
check('La tarjeta que produce overflow pasa completa a la página siguiente', () => {
  assert.match(print, /if \(pageOverflows\(current\.page\) && current\.cards\.length > 1\)/);
  assert.match(print, /current\.grid\.removeChild\(card\)/);
  assert.match(print, /current = createPage\(pages\.length\)/);
  assert.match(print, /appendCard\(current, card\)/);
});
check('Una tarjeta individual demasiado alta se identifica sin recortarla', () => {
  assert.match(print, /current\.page\.dataset\.contentOverflow = 'true'/);
  assert.match(print, /pageState\.page\.dataset\.contentOverflow = 'true'/);
  assert.match(print, /overflow: visible/);
});
check('El algoritmo conserva tarjetas sin imagen en su posición original', () => {
  assert.match(print, /orderedTechnicalCards\.forEach\(card => \{/);
  assert.doesNotMatch(print, /pageIndex === pageCount - 1\) textCards/);
});
check('La altura de página corresponde al área útil Carta', () => {
  const pageRules = [...print.matchAll(/\.sheet-page-wrapper\s*\{([^}]+)\}/g)];
  assert.equal(pageRules.length, 2);
  for (const rule of pageRules) {
    assert.match(rule[1], /(?:^|\s)height: 259\.4mm;/);
    assert.match(rule[1], /min-height: 259\.4mm;/);
  }
});
check('No se fuerza altura mínima de imagen de 80 px', () => {
  assert.doesNotMatch(print, /Math\.max\(80,/);
  assert.match(print, /measuredImageHeight > 0 \? measuredImageHeight : modeMaxHeight/);
  assert.doesNotMatch(print, /Math\.max\(80,/);
});
check('La altura de imagen se calcula con el espacio de contenido real', () => {
  assert.match(print, /main\.clientHeight - contentHeight/);
  assert.match(print, /fitImagesToAvailablePageSpace\(pageState\.page\)/);
});
check('La distribución de página se recalcula al cambiar modo y antes de imprimir', () => {
  assert.match(print, /if \(printResourcesReady\) arrangeTechnicalCards\(\)/);
  assert.match(print, /if \(!printResourcesReady\) \{[\s\S]*?return;[\s\S]*?\}\s*arrangeTechnicalCards\(\)/);
});
check('No queda el comentario obsoleto de cuatro imágenes por hoja', () => {
  assert.doesNotMatch(print, /hasta cuatro imágenes técnicas/);
});
check('ui.js pasa node --check en modo ES module', () => {
  const result = spawnSync(process.execPath, ['--experimental-default-type=module','--check',new URL('../Frontend/ui.js',import.meta.url).pathname], {encoding:'utf8'});
  assert.equal(result.status,0,result.stderr || 'node --check falló');
});
const passed=checks.filter(x=>x.status==='PASS').length;
for(const x of checks) console.log((x.status==='PASS'?'PASS ':'FAIL ')+x.name+(x.message?': '+x.message:''));
console.log('PrintSheetPaginationIntegrity: '+passed+'/'+checks.length+' PASS');
if(passed!==checks.length) process.exitCode=1;