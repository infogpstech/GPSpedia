import assert from 'node:assert/strict';
import { VinDifferentialEngine } from '../../VinDifferentialEngine.js';

function makeRecords({ samplesPerVersion = 2, overlappingYears = true } = {}) {
    const records = [];
    const versions = [
        ['LE', 'A', 2018, overlappingYears ? 2022 : 2020],
        ['XLE', 'B', overlappingYears ? 2018 : 2021, overlappingYears ? 2022 : 2023]
    ];

    for (const [version, marker, start, end] of versions) {
        for (let i = 1; i <= samplesPerVersion; i++) {
            records.push({
                id: version + i,
                marca: 'Toyota',
                modelo: 'Corolla',
                anoDesde: start,
                anoHasta: end,
                versionesAplicables: version,
                vin: `JT2${marker}${i}BCDEFGH0000${i}`
            });
        }
    }
    return records;
}

let passed = 0;
function test(name, fn) {
    fn();
    passed++;
    console.log('PASS', name);
}

test('usa dos muestras como umbral predeterminado', () => {
    assert.equal(new VinDifferentialEngine().minSamplesThreshold, 2);
});

test('acepta un umbral positivo configurado', () => {
    assert.equal(new VinDifferentialEngine({ minSamplesThreshold: 3 }).minSamplesThreshold, 3);
});

test('rechaza umbrales no positivos o no enteros', () => {
    assert.equal(new VinDifferentialEngine({ minSamplesThreshold: 0 }).minSamplesThreshold, 2);
    assert.equal(new VinDifferentialEngine({ minSamplesThreshold: 1.5 }).minSamplesThreshold, 2);
});

test('genera firmas al alcanzar el umbral con competidores', () => {
    const engine = new VinDifferentialEngine();
    const stats = engine.calculateSignatures(makeRecords());

    assert.equal(stats.validatedCount, 2);
    assert.equal(stats.insufficientCount, 0);
    assert.ok([...engine.signatures.values()].every(signature => signature.status === 'validada'));
});

test('marca insuficientes las clases por debajo del umbral', () => {
    const engine = new VinDifferentialEngine();
    const stats = engine.calculateSignatures(makeRecords({ samplesPerVersion: 1 }));

    assert.equal(stats.insufficientCount, 2);
    assert.equal(stats.pendingCount, 0);
    assert.ok([...engine.signatures.values()].every(signature =>
        signature.status === 'insuficiente' &&
        !signature.positions &&
        /al menos 2 muestras/.test(signature.reason)
    ));
});

test('aplica el umbral personalizado', () => {
    const engine = new VinDifferentialEngine({ minSamplesThreshold: 3 });
    const stats = engine.calculateSignatures(makeRecords());

    assert.equal(stats.insufficientCount, 2);
    assert.ok([...engine.signatures.values()].every(signature => signature.status === 'insuficiente'));
});

test('permite estado calculada con umbral uno', () => {
    const engine = new VinDifferentialEngine({ minSamplesThreshold: 1 });
    engine.calculateSignatures(makeRecords({ samplesPerVersion: 1 }));

    assert.ok([...engine.signatures.values()].every(signature =>
        signature.status === 'calculada' && signature.confidence === 75
    ));
});

test('no genera firmas sin competidores aplicables por rango de años', () => {
    const engine = new VinDifferentialEngine();
    const stats = engine.calculateSignatures(makeRecords({ overlappingYears: false }));

    assert.equal(stats.insufficientCount, 2);
    assert.equal(stats.pendingCount, 0);
    assert.equal(stats.conflictsCount, 0);
    assert.ok([...engine.signatures.values()].every(signature =>
        signature.status === 'insuficiente' &&
        /No existen configuraciones competidoras/.test(signature.reason)
    ));
});

test('queryVehicle excluye firmas insuficientes', () => {
    const engine = new VinDifferentialEngine();
    const records = makeRecords({ samplesPerVersion: 1 });
    engine.calculateSignatures(records);

    assert.equal(engine.queryVehicle({ vin: records[0].vin }).identificationType, 'sin_coincidencias');
});

console.log('VIN sample threshold tests passed:', passed, '/ 9');
