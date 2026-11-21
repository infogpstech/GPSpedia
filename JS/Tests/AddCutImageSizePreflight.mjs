import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const html = readFileSync(resolve(root, 'HTML/add_cortes.html'), 'utf8');
const match = html.match(/        function fileToBase64\\(file\\) \\{[\\s\\S]*?\\n        \\}/);
assert.ok(match, 'No se encontró fileToBase64.');
let reads = 0, nextResult = 'data:image/jpeg;base64,AA==';
class FakeFileReader {
    readAsDataURL(file) {
        reads++;
        this.result = nextResult;
        this.onload();
    }
}
const fileToBase64 = new Function('FileReader', match[0] + '; return fileToBase64;')(FakeFileReader);
const results = [];
async function run(name, fn) {
    try { await fn(); results.push({name,status:'PASS'}); }
    catch (error) { results.push({name,status:'FAIL',message:String(error.message || error)}); }
}
await run('rechaza archivos mayores de 10 MB antes de FileReader', async () => {
    const before = reads;
    await assert.rejects(fileToBase64({size:10*1024*1024+1,type:'image/jpeg'}), error => error && error.name === 'ImageSizeError');
    assert.equal(reads, before);
});
await run('rechaza MIME vacío o no soportado antes de FileReader', async () => {
    const before = reads;
    await assert.rejects(fileToBase64({size:100,type:''}), error => error && error.name === 'ImageMimeError');
    await assert.rejects(fileToBase64({size:100,type:'application/pdf'}), error => error && error.name === 'ImageMimeError');
    assert.equal(reads, before);
});
await run('permite un archivo exactamente de 10 MB con MIME admitido', async () => {
    nextResult = 'data:image/jpeg;base64,AA==';
    const result = await fileToBase64({size:10*1024*1024,type:'image/jpeg'});
    assert.equal(result, nextResult);
    assert.equal(reads, 1);
});
await run('rechaza discrepancia entre MIME del archivo y Data URL', async () => {
    const before = reads;
    nextResult = 'data:image/png;base64,AA==';
    await assert.rejects(fileToBase64({size:100,type:'image/jpeg'}), error => error && error.name === 'ImageMimeError');
    assert.equal(reads, before + 1);
});
await run('mantiene el rechazo de archivos vacíos antes de FileReader', async () => {
    const before = reads;
    await assert.rejects(fileToBase64({size:0,type:'image/jpeg'}), error => error && error.name === 'FileReadError');
    assert.equal(reads, before);
});
const failed = results.filter(item => item.status !== 'PASS');
for (const item of results) console.log(item.status + ' ' + item.name + (item.message ? ': ' + item.message : ''));
console.log(results.length - failed.length + '/' + results.length + ' PASS');
if (failed.length) process.exitCode = 1;
