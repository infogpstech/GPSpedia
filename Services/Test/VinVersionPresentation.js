import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const uiSource = readFileSync(new URL('../../ui.js', import.meta.url), 'utf8');
const start = uiSource.indexOf('export function parseEquipmentVersions(');
const end = uiSource.indexOf('/**\n * Establece una imagen optimizada', start);
if (start < 0 || end <= start) throw new Error('No se encontró el bloque de helpers VIN de ui.js.');
const helperSource = uiSource.slice(start, end).replace(/^export function /gm, 'function ');
const helpers = runInNewContext(`${helperSource}\n;({ parseVinCollection, mapVersionsWithVins })`);

let passed = 0;
function test(name, callback) { callback(); passed++; console.log('PASS', name); }
function plain(value) { return JSON.parse(JSON.stringify(value)); }

test('preserva slots vacíos en JSON canónico', () => {
    assert.deepEqual(plain(helpers.parseVinCollection('["ABC123","","DEF456"]')), ['ABC123', '', 'DEF456']);
});
test('preserva slot intermedio vacío en datos heredados', () => {
    assert.deepEqual(plain(helpers.parseVinCollection('ABC123,,DEF456')), ['ABC123', '', 'DEF456']);
});
test('preserva slot final vacío heredado', () => {
    assert.deepEqual(plain(helpers.parseVinCollection('ABC123,DEF456,')), ['ABC123', 'DEF456', '']);
});
test('rechaza más de tres posiciones heredadas', () => {
    assert.throws(() => helpers.parseVinCollection('ABC123,,,DEF456'), /máximo|tres/);
});
test('asocia prefijos almacenados a su índice sin desplazar versiones', () => {
    assert.deepEqual(plain(helpers.mapVersionsWithVins('LE,XLE,TRD', 'ABCDEF123456,,ABCXYZ123456')),
        [{ version: 'LE', vin: 'DEF1' }, { version: 'XLE', vin: null }, { version: 'TRD', vin: 'XYZ1' }]);
});
test('no recorta cinco caracteres de prefijos ya normalizados', () => {
    assert.deepEqual(plain(helpers.mapVersionsWithVins('LE,XLE', 'ABCDEF123456,ABCXYZ123456')),
        [{ version: 'LE', vin: 'DEF1' }, { version: 'XLE', vin: 'XYZ1' }]);
});
test('recorta serial solo de VIN completos heredados', () => {
    assert.deepEqual(plain(helpers.mapVersionsWithVins('LE,XLE', 'ABCDEF12345698765,ABCXYZ12345698765')),
        [{ version: 'LE', vin: 'DEF1' }, { version: 'XLE', vin: 'XYZ1' }]);
});
test('conserva posición inicial vacía', () => {
    assert.deepEqual(plain(helpers.mapVersionsWithVins('LE,XLE,TRD', ',ABCDEF123456,ABCXYZ123456')),
        [{ version: 'LE', vin: null }, { version: 'XLE', vin: 'DEF1' }, { version: 'TRD', vin: 'XYZ1' }]);
});
test('no muestra VIN distintivo para una sola versión', () => {
    assert.deepEqual(plain(helpers.mapVersionsWithVins('LE', 'ABCDEF123456')), [{ version: 'LE', vin: null }]);
});
test('acepta delimitadores heredados de barra, barra inversa y punto y coma', () => {
    assert.deepEqual(plain(helpers.parseVinCollection('ABC123/DEF456')), ['ABC123', 'DEF456']);
    assert.deepEqual(plain(helpers.parseVinCollection(String.raw`ABC123\GHI789`)), ['ABC123', 'GHI789']);
    assert.deepEqual(plain(helpers.parseVinCollection('ABC123;DEF456')), ['ABC123', 'DEF456']);
});
test('rechaza JSON mal formado y duplicados', () => {
    assert.throws(() => helpers.parseVinCollection('["ABC123"'), /JSON mal formado/);
    assert.throws(() => helpers.parseVinCollection('["ABC123","ABC123"]'), /duplicado/);
});

console.log('VIN version presentation:', passed, '/ 10');
