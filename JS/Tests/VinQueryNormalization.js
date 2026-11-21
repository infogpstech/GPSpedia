import assert from 'node:assert/strict';
import { VinDifferentialEngine } from '../../VinDifferentialEngine.js';

let passed = 0;
function test(name, fn) {
    fn();
    passed++;
    console.log('PASS', name);
}
function signature(classKey, vinLength, positions, values, extra = {}) {
    return {
        classKey, vinLength, positions, values, confidence: 100,
        status: 'validada', marca: 'Honda', modelo: 'Civic',
        anoDesde: 2020, anoHasta: 2024, version: classKey,
        ...extra
    };
}
const fullVin = '12345678901234567';
const prefixVin = fullVin.slice(0, 12);

test('VIN completo de 17 caracteres consulta el prefijo exacto de 12', () => {
    const engine = new VinDifferentialEngine();
    engine.signatures.set('P12', signature('P12', 12, [0, 11], ['1', '2']));
    const result = engine.queryVehicle({ vin: fullVin });
    assert.equal(result.identificationType, 'completa');
    assert.equal(result.match.classKey, 'P12');
});

test('la consulta que ya es un prefijo de 12 caracteres no se recorta', () => {
    const engine = new VinDifferentialEngine();
    engine.signatures.set('P12', signature('P12', 12, [0, 11], ['1', '2']));
    const result = engine.queryVehicle({ vin: prefixVin });
    assert.equal(result.identificationType, 'completa');
    assert.equal(result.match.classKey, 'P12');
});

test('se conserva la coincidencia exacta de una firma de 17 caracteres', () => {
    const engine = new VinDifferentialEngine();
    engine.signatures.set('FULL', signature('FULL', 17, [0, 16], ['1', '7']));
    const result = engine.queryVehicle({ vin: fullVin });
    assert.equal(result.identificationType, 'completa');
    assert.equal(result.match.classKey, 'FULL');
});

test('la coincidencia completa tiene prioridad sobre una firma de prefijo', () => {
    const engine = new VinDifferentialEngine();
    engine.signatures.set('P12', signature('P12', 12, [0], ['1']));
    engine.signatures.set('FULL', signature('FULL', 17, [0], ['1']));
    const result = engine.queryVehicle({ vin: fullVin });
    assert.equal(result.identificationType, 'completa');
    assert.equal(result.match.classKey, 'FULL');
});

test('el prefijo solo se usa cuando no hay coincidencia completa', () => {
    const engine = new VinDifferentialEngine();
    engine.signatures.set('FULL-NO', signature('FULL-NO', 17, [0], ['9']));
    engine.signatures.set('P12', signature('P12', 12, [0, 11], ['1', '2']));
    const result = engine.queryVehicle({ vin: fullVin });
    assert.equal(result.identificationType, 'completa');
    assert.equal(result.match.classKey, 'P12');
});

test('un prefijo incompatible no produce coincidencia por subcadena', () => {
    const engine = new VinDifferentialEngine();
    engine.signatures.set('WRONG', signature('WRONG', 12, [0], ['9']));
    const result = engine.queryVehicle({ vin: fullVin });
    assert.equal(result.identificationType, 'sin_coincidencias');
});

test('una longitud distinta de 17 no se recorta arbitrariamente', () => {
    const engine = new VinDifferentialEngine();
    engine.signatures.set('SHORT', signature('SHORT', 11, [0], ['1']));
    const result = engine.queryVehicle({ vin: '1234567890123456' });
    assert.equal(result.identificationType, 'sin_coincidencias');
});

test('el prefijo ambiguo conserva todas las configuraciones compatibles', () => {
    const engine = new VinDifferentialEngine();
    engine.signatures.set('A', signature('A', 12, [0], ['1'], { version: 'LX' }));
    engine.signatures.set('B', signature('B', 12, [0], ['1'], { version: 'EX' }));
    const result = engine.queryVehicle({ vin: fullVin });
    assert.equal(result.identificationType, 'ambigua');
    assert.equal(result.matches.length, 2);
});

test('el contexto se aplica a las coincidencias obtenidas desde el prefijo', () => {
    const engine = new VinDifferentialEngine();
    engine.signatures.set('LX', signature('LX', 12, [0], ['1'], { version: 'LX' }));
    engine.signatures.set('EX', signature('EX', 12, [0], ['1'], { version: 'EX' }));
    const result = engine.queryVehicle({ vin: fullVin, context: { version: 'EX' } });
    assert.equal(result.identificationType, 'completa');
    assert.equal(result.match.classKey, 'EX');
});

console.log('VIN query normalization:', passed, '/ 9');
