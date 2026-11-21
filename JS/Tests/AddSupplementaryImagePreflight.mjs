import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const source = readFileSync(resolve(root, 'JS/Frontend/ui.js'), 'utf8');
const match = source.match(/async function readSupplementaryImageDataUrl_\(file\) \{[\s\S]*?\n\}/);
assert.ok(match, 'No se encontró readSupplementaryImageDataUrl_.');
let reads = 0, failRead = false;
class FakeFileReader {
    readAsDataURL() {
        reads++;
        if (failRead) { this.onerror(); return; }
        this.result = 'data:image/jpeg;base64,AA==';
        this.onload();
    }
}
const readImage = new Function('FileReader', match[0] + '; return readSupplementaryImageDataUrl_;')(FakeFileReader);
const results = [];
async function run(name, fn) {
    try { await fn(); results.push({name,status:'PASS'}); }
    catch (error) { results.push({name,status:'FAIL',message:String(error.message || error)}); }
}
await run('rechaza imagen mayor de 10 MB antes de FileReader', async () => {
    const before = reads;
    await assert.rejects(readImage({size:10*1024*1024+1}), error => error && error.name === 'ImageSizeError');
    assert.equal(reads, before);
});
await run('acepta imagen en el límite exacto', async () => {
    assert.equal(await readImage({size:10*1024*1024}), 'data:image/jpeg;base64,AA==');
    assert.equal(reads, 1);
});
await run('rechaza archivo vacío antes de lectura', async () => {
    await assert.rejects(readImage({size:0}), error => error && error.name === 'ImageReadError');
    assert.equal(reads, 1);
});
await run('propaga el fallo de lectura sin dejar promesa pendiente', async () => {
    failRead = true;
    await assert.rejects(readImage({size:10}), error => error && error.name === 'ImageReadError');
    assert.equal(reads, 2);
});
const failed = results.filter(item => item.status !== 'PASS');
for (const item of results) console.log(item.status + ' ' + item.name + (item.message ? ': ' + item.message : ''));
console.log(results.length - failed.length + '/' + results.length + ' PASS');
if (failed.length) process.exitCode = 1;
