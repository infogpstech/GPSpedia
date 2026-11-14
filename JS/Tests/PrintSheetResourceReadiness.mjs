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
check('Todas las categorías de imágenes se registran como recursos', () => {
  for (const marker of ['vehicle-main-img','qr-code-img','header-project-logo','print-tracklink-logo','tech-detail-img']) assert.ok(print.includes('data-print-resource="optional"'), marker);
  assert.match(print, /class="tech-detail-img" data-print-resource="optional"/);
});
check('La espera incluye load, error y timeout acotado', () => {
  assert.match(print, /img\.addEventListener\('load', onLoad/);
  assert.match(print, /img\.addEventListener\('error', onError/);
  assert.match(print, /setTimeout\(\(\) => finish\('timeout'\), 8000\)/);
});
check('La decodificación se espera con límite', () => {
  assert.match(print, /typeof img\.decode === 'function'/);
  assert.match(print, /img\.decode\(\)/);
  assert.match(print, /setTimeout\(\(\) => done\(false\), 2000\)/);
});
check('La imagen rota u offline se oculta y recibe fallback visible', () => {
  assert.match(print, /const showResourceFallback = img =>/);
  assert.match(print, /fallback\.textContent = img\.alt \? img\.alt \+ ' no disponible' : 'Imagen no disponible'/);
  assert.match(print, /fallback\.hidden = false/);
});
check('La ausencia opcional no crea imágenes ficticias', () => {
  assert.match(print, /const vehiculoImgHtml = item\.imagenVehiculo \?/);
  assert.match(print, /if \(rawVideoUrl && typeof rawVideoUrl === 'string'/);
});
check('Las imágenes no disponibles no se usan para medir aspect ratio', () => {
  assert.match(print, /image\.dataset\.printResourceStatus === 'loaded' \? image : null/);
});
check('La paginación se calcula después de la primera espera de recursos', () => {
  const prepare = print.indexOf('const preparePrintResources');
  assert.ok(prepare >= 0);
  const firstWait = print.indexOf('await Promise.all(initialImages.map(waitForImage))', prepare);
  const arrange = print.indexOf('arrangeTechnicalCards();', firstWait);
  assert.ok(firstWait > prepare && arrange > firstWait);
});
check('También se esperan las imágenes de encabezado/pie clonadas', () => {
  assert.match(print, /allImagesAfterPagination = Array\.from\(printDocument\.querySelectorAll\('img\[data-print-resource\]'\)\)/);
  assert.match(print, /cloneResults = await Promise\.all\(allImagesAfterPagination\.map\(waitForImage\)\)/);
});
check('El botón de impresión permanece deshabilitado hasta estado listo', () => {
  assert.match(print, /id="print-action" type="button" disabled/);
  assert.match(print, /printButton\.disabled = false/);
  assert.match(print, /if \(printResourcesReady\) printWindow\.print\(\)/);
});
check('beforeprint no mide recursos antes de que estén listos', () => {
  assert.match(print, /beforeprint', \(\) => \{\s*if \(!printResourcesReady\) \{[\s\S]*?return;[\s\S]*?\}\s*arrangeTechnicalCards\(\);/);
});
check('El documento expone estado accesible de preparación', () => {
  assert.match(print, /id="print-resource-status" role="status" aria-live="polite"/);
  assert.match(print, /printDocument\.body\.dataset\.printReady = 'true'/);
});
check('ui.js pasa node --check en modo ES module', () => {
  const result = spawnSync(process.execPath, ['--experimental-default-type=module','--check',new URL('../Frontend/ui.js',import.meta.url).pathname], {encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr || 'node --check falló');
});
const passed = checks.filter(x=>x.status==='PASS').length;
for (const x of checks) console.log((x.status==='PASS'?'PASS ':'FAIL ')+x.name+(x.message?': '+x.message:''));
console.log('PrintSheetResourceReadiness: '+passed+'/'+checks.length+' PASS');
if (passed!==checks.length) process.exitCode=1;