import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const source = readFileSync(resolve(root, 'JS/Frontend/ui.js'), 'utf8');
const match = source.match(/function readLogoFileBase64_\(file\) \{[\s\S]*?\n\}/);
assert.ok(match, 'No se encontró readLogoFileBase64_.');
let mode = 'success', nextResult = 'data:image/png;base64,AAAA';
class FakeFileReader {
    readAsDataURL() {
        if (mode === 'error') { this.onerror(); return; }
        if (mode === 'abort') { this.onabort(); return; }
        this.result = mode === 'invalid' ? 'not-an-image' : nextResult;
        this.onload();
    }
}
const readLogo = new Function('FileReader', match[0] + '; return readLogoFileBase64_;')(FakeFileReader);
const results = [];
async function run(name, fn) {
    try { await fn(); results.push({name,status:'PASS'}); }
    catch (error) { results.push({name,status:'FAIL',message:String(error.message || error)}); }
}
await run('extrae Base64 de una Data URL de imagen', async () => {
    mode = 'success';
    assert.equal(await readLogo({name:'logo.png',type:'image/png'}), 'AAAA');
});
await run('rechaza MIME no admitido antes de FileReader', async () => {
    mode = 'success';
    await assert.rejects(readLogo({name:'logo.jpg',type:'image/jpeg'}), error => error && error.name === 'LogoFileReadError');
});
await run('rechaza discrepancia entre MIME del archivo y Data URL', async () => {
    mode = 'success';
    nextResult = 'data:image/webp;base64,AAAA';
    await assert.rejects(readLogo({name:'logo.png',type:'image/png'}), error => error && error.name === 'LogoFileReadError');
    nextResult = 'data:image/png;base64,AAAA';
});
await run('rechaza errores de FileReader', async () => {
    mode = 'error';
    await assert.rejects(readLogo({name:'logo.png',type:'image/png'}), error => error && error.name === 'LogoFileReadError');
});
await run('rechaza lectura cancelada', async () => {
    mode = 'abort';
    await assert.rejects(readLogo({name:'logo.png'}), error => error && error.name === 'LogoFileReadError');
});
await run('rechaza resultado que no es una imagen', async () => {
    mode = 'invalid';
    await assert.rejects(readLogo({name:'logo.png'}), error => error && error.name === 'LogoFileReadError');
});
const selectionStart = source.indexOf('let selectedLogoBase64 = null;', source.indexOf('logo-file-input'));
const selectionEnd = source.indexOf('// 7. Registrar Logotipo', selectionStart);
const selection = source.slice(selectionStart, selectionEnd);
assert.ok(selection.includes('const generation = ++logoReadGeneration;'), 'Falta el token de generación de lectura.');
assert.ok(selection.includes('selectedLogoBase64 = null;'), 'No se limpia el Base64 anterior.');
assert.ok(selection.includes('if (generation !== logoReadGeneration) return;'), 'No se ignoran lecturas obsoletas.');
assert.ok(selection.includes('reader.onerror') === false, 'La lectura sigue implementada directamente sin helper.');
assert.ok(selection.includes('registerLogoBtn.disabled = true;'), 'No se deshabilita el botón durante la lectura.');
const adminServer = readFileSync(resolve(root, 'JS/Services/admin.js'), 'utf8');
const validatorStart = adminServer.indexOf('function validateLogoImagePayload_');
const validatorEnd = adminServer.indexOf('function handleAddLogo', validatorStart);
assert.ok(validatorStart >= 0 && validatorEnd > validatorStart, 'Falta validador de firma del logotipo.');
const validatorSource = adminServer.slice(validatorStart, validatorEnd);
assert.ok(validatorSource.includes('image/png') && validatorSource.includes('image/svg+xml') && validatorSource.includes('image/webp'));
assert.ok(validatorSource.includes('signatureValid'), 'El servidor debe comprobar la firma real del archivo.');
assert.ok(adminServer.includes('validateLogoImagePayload_(fileData, mimeType)'), 'handleAddLogo debe usar el validador de firma.');
const validator = new Function("Utilities", validatorSource + String.fromCharCode(10) + "return validateLogoImagePayload_;")({
    base64Decode(value) { return Buffer.from(value, "base64"); },
    base64Encode(bytes) { return Buffer.from(bytes).toString("base64"); },
    newBlob(bytes) { return { getDataAsString() { return Buffer.from(bytes).toString("utf8"); } }; }
});
const pngBytes=Buffer.from([137,80,78,71,13,10,26,10,0]);
const webpBytes=Buffer.from("RIFF0000WEBP");
const svgBytes=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
assert.equal(validator(pngBytes.toString("base64"),"image/png").length,pngBytes.length);
assert.equal(validator(webpBytes.toString("base64"),"image/webp").length,webpBytes.length);
assert.equal(validator(svgBytes.toString("base64"),"image/svg+xml").length,svgBytes.length);
assert.throws(()=>validator(Buffer.from("GIF89a").toString("base64"),"image/png"),/firma real/);
assert.throws(()=>validator(pngBytes.toString("base64"),"image/jpeg"),/PNG, SVG o WEBP/);


const failed = results.filter(item => item.status !== 'PASS');
for (const item of results) console.log(item.status + ' ' + item.name + (item.message ? ': ' + item.message : ''));
console.log(results.length - failed.length + '/' + results.length + ' PASS');
if (failed.length) process.exitCode = 1;
