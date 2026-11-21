import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const ui = readFileSync(new URL('../Frontend/ui.js', import.meta.url), 'utf8');
const start = ui.indexOf('export function exportVehiclePrintSheet');
const end = ui.indexOf('\\nexport ', start + 20);
const source = ui.slice(start, end < 0 ? ui.length : end);
const tests = [];
const check = (name, fn) => { try { fn(); tests.push({name,ok:true}); } catch (error) { tests.push({name,ok:false,error:error.message}); } };
const cssStart = source.indexOf('/* Los modos explícitos prevalecen');
const cssEnd = source.indexOf('*/', cssStart) + 2;
const explicitCss = source.slice(cssStart, cssEnd + 1800);
check('Selector conserva los cuatro modos explícitos', () => {
  for (const mode of ['auto','horizontal','vertical','image-focus']) assert.match(source, new RegExp('option value="' + mode + '"'));
});
check('El selector actualiza el estado de layout del documento', () => {
  assert.match(source, /layoutSelector\.addEventListener\('change'/);
  assert.match(source, /dataset\.printLayout = layoutSelector\.value/);
  assert.match(source, /arrangeTechnicalCards\(\)/);
});
check('Automática conserva agrupación adaptativa single/pair/triple/mosaic', () => {
  for (const mode of ['layout-single','layout-pair-portrait','layout-pair-landscape','layout-triple-portrait','layout-mosaic']) assert.ok(source.includes(mode), mode);
  assert.doesNotMatch(explicitCss, /data-print-layout="auto"/);
});
check('Horizontal mantiene texto e imagen en columnas', () => {
  assert.match(source, /body\[data-print-layout="horizontal"\] \.sheet-page-wrapper \.tech-item-body \{\s*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1\.15fr\)/);
});
check('Vertical fuerza una sola columna tras las reglas generales del wrapper', () => {
  const rule = source.lastIndexOf('body[data-print-layout="vertical"] .sheet-page-wrapper .tech-item-body');
  const generic = source.indexOf('.sheet-page-wrapper .tech-item-body');
  assert.ok(rule > generic);
  assert.match(source.slice(rule, rule + 260), /grid-template-columns: minmax\(0, 1fr\)/);
});
check('Imagen ampliada usa una columna y conserva 620px de altura', () => {
  assert.match(source, /body\[data-print-layout="image-focus"\] \.sheet-page-wrapper \.adaptive-tech-grid \{\s*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(source, /body\[data-print-layout="image-focus"\] \.sheet-page-wrapper \.tech-detail-img \{\s*max-height: 620px/);
});
check('Los modos explícitos no alteran tamaño de papel ni paginación', () => {
  assert.match(source, /@page\s*\{[^}]*size: letter portrait;[^}]*margin: 10mm;/s);
  assert.match(source, /const pageOverflows = page =>/);
  assert.match(source, /orderedTechnicalCards\.forEach/);
});
check('No se introducen !important ni reglas globales sobre el resto de la aplicación', () => {
  assert.doesNotMatch(explicitCss, /!important|(^|\n)\s*(?:html|body)\s*\{/);
});
check('ui.js pasa node --check', () => {
  const result = spawnSync(process.execPath, ['--experimental-default-type=module','--check',new URL('../Frontend/ui.js',import.meta.url).pathname], {encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});
let failed=0;
for (const test of tests) { console.log((test.ok?'PASS ':'FAIL ')+test.name+(test.error?': '+test.error:'')); if(!test.ok)failed++; }
console.log('PrintSheetLayoutModes: '+(tests.length-failed)+'/'+tests.length+' PASS');
if(failed)process.exitCode=1;
