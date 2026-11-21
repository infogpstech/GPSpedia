import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const html = readFileSync(resolve(root, 'HTML/add_cortes.html'), 'utf8');
const match = html.match(/        function fileToBase64\(file\) \{[\s\S]*?\n        \}/);
assert.ok(match, 'No se encontró fileToBase64.');
let reads = 0;
class FakeFileReader {
    readAsDataURL(file) {
        reads++;
        this.result = 'data:image/jpeg;base64,AA==';
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
    await assert.rejects(fileToBase64({size:10*1024*1024+1}), error => error && error.name === 'ImageSizeError');
    assert.equal(reads, before);
});
await run('permite un archivo exactamente de 10 MB', async () => {
    const result = await fileToBase64({size:10*1024*1024});
    assert.equal(result, 'data:image/jpeg;base64,AA==');
    assert.equal(reads, 1);
});
await run('mantiene el rechazo de archivos vacíos', async () => {
    await assert.rejects(fileToBase64({size:0}), error => error && error.name === 'FileReadError');
    assert.equal(reads, 1);
});
const failed = results.filter(item => item.status !== 'PASS');
for (const item of results) console.log(item.status + ' ' + item.name + (item.message ? ': ' + item.message : ''));
console.log(results.length - failed.length + '/' + results.length + ' PASS');
if (failed.length) process.exitCode = 1;
