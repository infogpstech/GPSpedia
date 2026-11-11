import assert from 'node:assert/strict';
import { VinDifferentialEngine, doYearRangesOverlap, isYearWithinRange } from '../../VinDifferentialEngine.js';

let passed = 0;
function test(name, fn) {
    fn();
    passed++;
    console.log('PASS', name);
}

test('detecta rangos cerrados que se superponen', () => {
    assert.equal(doYearRangesOverlap(2018, 2022, 2020, 2024, 2026), true);
});

test('rechaza rangos cerrados consecutivos sin superposición', () => {
    assert.equal(doYearRangesOverlap(2018, 2020, 2021, 2024, 2026), false);
});

test('interpreta anoHasta vacío como vigente hasta el año actual', () => {
    assert.equal(doYearRangesOverlap(2020, '', 2025, 2026, 2026), true);
    assert.equal(doYearRangesOverlap(2010, '', 2000, 2009, 2026), false);
});

test('no inventa una extensión de diez años para anoHasta vacío', () => {
    assert.equal(doYearRangesOverlap(2010, '', 2021, 2024, 2026), true);
});

test('rechaza rangos sin anoDesde porque no son verificables', () => {
    assert.equal(doYearRangesOverlap('', 2024, 2020, 2022, 2026), false);
    assert.equal(doYearRangesOverlap(null, null, 2020, 2026, 2026), false);
});

test('rechaza años malformados y rangos invertidos', () => {
    assert.equal(doYearRangesOverlap('2020x', 2024, 2021, 2023, 2026), false);
    assert.equal(doYearRangesOverlap(2025, 2020, 2021, 2026, 2026), false);
});

test('consulta por año dentro de un rango abierto vigente', () => {
    assert.equal(isYearWithinRange(2024, 2020, '', 2026), true);
    assert.equal(isYearWithinRange(2026, 2020, '', 2026), true);
});

test('consulta por año fuera del rango abierto vigente', () => {
    assert.equal(isYearWithinRange(2027, 2020, '', 2026), false);
    assert.equal(isYearWithinRange(2019, 2020, '', 2026), false);
});

test('consulta por año rechaza inicio ausente o datos inválidos', () => {
    assert.equal(isYearWithinRange(2022, '', 2024, 2026), false);
    assert.equal(isYearWithinRange('2022x', 2020, '', 2026), false);
});

test('queryVehicle usa la misma semántica para anoHasta vacío', () => {
    const engine = new VinDifferentialEngine();
    const common = { vinLength: 17, positions: [0], values: ['J'], confidence: 100, status: 'validada' };
    engine.signatures.set('OPEN', { ...common, classKey: 'OPEN', marca: 'Toyota', modelo: 'Corolla', anoDesde: 2020, anoHasta: '', version: 'LE' });
    engine.signatures.set('CLOSED', { ...common, classKey: 'CLOSED', marca: 'Toyota', modelo: 'Corolla', anoDesde: 2010, anoHasta: 2019, version: 'XLE' });
    const result = engine.queryVehicle({ vin: 'J1234567890123456', context: { ano: 2024 } });
    assert.equal(result.identificationType, 'completa');
    assert.equal(result.match.classKey, 'OPEN');
});

test('queryVehicle no selecciona rangos sin año inicial', () => {
    const engine = new VinDifferentialEngine();
    engine.signatures.set('UNKNOWN', { vinLength: 17, positions: [0], values: ['J'], confidence: 100, status: 'validada', classKey: 'UNKNOWN', anoDesde: '', anoHasta: 2024 });
    const result = engine.queryVehicle({ vin: 'J1234567890123456', context: { ano: 2022 } });
    assert.equal(result.identificationType, 'sin_coincidencias');
});

console.log('VIN year range semantics:', passed, '/ 11');
