import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { normalizePrintableYouTubeUrl, createPrintableQrDataUrl } from '../../printQr.js';
const ui = readFileSync(new URL('../../ui.js', import.meta.url), 'utf8');
const qr = readFileSync(new URL('../../printQr.js', import.meta.url), 'utf8');
const vendor = readFileSync(new URL('../../qrcode-generator.mjs', import.meta.url), 'utf8');
const license = readFileSync(new URL('../../ThirdPartyLicenses/qrcode-generator-MIT.txt', import.meta.url), 'utf8');
const start = ui.indexOf('export function exportVehiclePrintSheet');
const end = ui.indexOf('\nexport ', start + 20);
const print = ui.slice(start, end < 0 ? ui.length : end);
const validId = 'dQw4w9WgXcQ';
const checks = [];
const check = (name, fn) => { try { fn(); checks.push({name,status:'PASS'}); } catch (e) { checks.push({name,status:'FAIL',message:e.message}); } };
check('La URL watch se canonicaliza por ID', () => {
  assert.equal(normalizePrintableYouTubeUrl('https://www.youtube.com/watch?v=' + validId + '&list=private-list'), 'https://www.youtube.com/watch?v=' + validId);
});
check('Se admiten formatos youtu.be, embed, shorts y live', () => {
  for (const url of ['https://youtu.be/' + validId, 'https://youtube.com/embed/' + validId, 'https://www.youtube.com/shorts/' + validId, 'https://m.youtube.com/live/' + validId]) assert.equal(normalizePrintableYouTubeUrl(url), 'https://www.youtube.com/watch?v=' + validId);
});
check('Se rechazan protocolos y hosts no autorizados', () => {
  for (const url of ['http://youtube.com/watch?v=' + validId, 'javascript:alert(1)', 'https://youtube.com.example.org/watch?v=' + validId, 'https://example.com/watch?v=' + validId]) assert.equal(normalizePrintableYouTubeUrl(url), null);
});
check('Se rechazan IDs ausentes o con formato incorrecto', () => {
  for (const url of ['https://youtube.com/watch', 'https://youtu.be/short', 'https://youtube.com/watch?v=123456789012', '', null, 'x'.repeat(2049)]) assert.equal(normalizePrintableYouTubeUrl(url), null);
});
check('Se rechazan credenciales y puertos no estándar', () => {
  assert.equal(normalizePrintableYouTubeUrl('https://user:pass@youtube.com/watch?v=' + validId), null);
  assert.equal(normalizePrintableYouTubeUrl('https://youtube.com:8443/watch?v=' + validId), null);
});
check('El QR se genera como data URL local sin exponer la URL completa', () => {
  const privateUrl = 'https://www.youtube.com/watch?v=' + validId + '&feature=private';
  const dataUrl = createPrintableQrDataUrl(privateUrl);
  assert.match(dataUrl, /^data:image\/gif;base64,/);
  assert.ok(dataUrl.length > 500);
  assert.ok(!dataUrl.includes(privateUrl));
  assert.ok(!print.includes('api.qrserver.com'));
  assert.ok(!print.includes('encodeURIComponent(directVideoUrl)'));
});
check('El QR permanece condicional y no muestra URL como texto', () => {
  assert.match(print, /if \(rawVideoUrl && typeof rawVideoUrl === 'string'/);
  assert.match(print, /createPrintableQrDataUrl\(rawVideoUrl\)/);
  assert.match(print, /qr-unavailable/);
  assert.doesNotMatch(print, /directVideoUrl|qrApiUrl/);
});
check('El QR local participa en la espera de recursos', () => {
  assert.match(print, /src="\$\{qrDataUrl\}"[^>]*data-print-resource="optional"/);
  assert.match(print, /class="qr-code-img"/);
});
check('El generador se importa localmente y no hace solicitudes de red', () => {
  assert.match(ui, /import \{ createPrintableQrDataUrl \} from '\.\/printQr\.js'/);
  assert.match(qr, /import \{ qrcode \} from '\.\/qrcode-generator\.mjs'/);
  assert.doesNotMatch(qr, /fetch\(|XMLHttpRequest|api\.qrserver|googleapis\.com/);
});
check('Se conserva licencia MIT y atribución del generador', () => {
  assert.match(vendor, /Copyright \(c\) 2009 Kazuhiko Arase/);
  assert.match(license, /MIT License/);
  assert.match(license, /Copyright \(c\) 2009 Kazuhiko Arase/);
});
check('Los módulos modificados pasan node --check', () => {
  for (const path of ['../../ui.js','../../printQr.js','../../qrcode-generator.mjs']) {
    const result = spawnSync(process.execPath, ['--experimental-default-type=module','--check',new URL(path,import.meta.url).pathname], {encoding:'utf8'});
    assert.equal(result.status,0,path + ': ' + (result.stderr || 'node --check falló'));
  }
});
const passed=checks.filter(x=>x.status==='PASS').length;
for(const x of checks) console.log((x.status==='PASS'?'PASS ':'FAIL ')+x.name+(x.message?': '+x.message:''));
console.log('PrintQrPrivacy: '+passed+'/'+checks.length+' PASS');
if(passed!==checks.length) process.exitCode=1;