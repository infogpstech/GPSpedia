import assert from 'node:assert/strict';
import {
    buildGlobalSearchResults,
    classifySearchResults,
    createSharedPromise,
    decodeSearchHash,
    normalizeSearchText,
    shouldAutoOpenVehicleDetail
} from '../../search-utils.js';

let passed = 0;
function testCase(name, fn) {
    fn();
    passed += 1;
    console.log('PASS', name);
}
async function testAsync(name, fn) {
    await fn();
    passed += 1;
    console.log('PASS', name);
}
const baseCut = {
    id: 'CUT-1', marca: 'Toyota', modelo: 'Corolla', versionesAplicables: 'LE',
    anoDesde: 2018, anoHasta: 2022, tipoEncendido: 'Llave', categoria: 'Automóvil',
    tipoCorte1: 'Bomba', ubicacionCorte1: 'Debajo del asiento', colorCableCorte1: 'Rojo',
    configRelay1: '5 pines', tipoCorte2: 'Ignición', ubicacionCorte2: 'Columna',
    colorCableCorte2: 'Azul', configRelay2: '4 pines',
    tipoCorte3: 'Puertas', ubicacionCorte3: 'Panel lateral', colorCableCorte3: 'Verde',
    configRelay3: 'Doble', notaImportante: '<strong>Revisar conexión</strong>'
};
const relay = [{ ID: 'R-1', configuracion: 'Relay 5 pines', funcion: 'Bomba auxiliar', vehiculoDondeSeUtiliza: 'Toyota', observacion: 'Conexión protegida' }];
const tutoriales = [{ ID: 'T-1', Tema: 'Instalación de GPS', Descripcion: 'Guía práctica', comoIdentificarlo: 'Cableado', dondeEncontrarlo: 'Columna', Detalles: 'Pasos de instalación' }];
const pys = [{ id: 'P-1', Problema: 'GPS sin señal', Descripcion: 'Antena desconectada', Solucion: 'Revisar antena', Prevenir: 'Asegurar conector' }];

testCase('normaliza mayúsculas, acentos y espacios repetidos', () => {
    assert.equal(normalizeSearchText('  INSTALACIÓN   Eléctrica  '), 'instalacion electrica');
});
testCase('normaliza términos con etiquetas HTML y entidades', () => {
    assert.equal(normalizeSearchText('<b>Falla</b> &amp; señal'), 'falla senal');
});
testCase('busca los tres slots de tipo, ubicación, color y relay', () => {
    for (const term of ['Ignición', 'Columna', 'Azul', '4 pines', 'Puertas', 'Panel lateral', 'Verde', 'Doble']) {
        assert.equal(buildGlobalSearchResults({ query: term, cortes: [baseCut] }).some(item => item.id === 'CUT-1'), true, term);
    }
});
testCase('busca campos de detalles HTML de Cortes', () => {
    assert.equal(buildGlobalSearchResults({ query: 'revisar conexión', cortes: [baseCut] }).length, 1);
});
testCase('prioriza título exacto sobre título parcial y campos descriptivos', () => {
    const cuts = [
        { ...baseCut, id: 'DESC', marca: 'Ford', modelo: 'Focus', notaImportante: 'Toyota Corolla' },
        { ...baseCut, id: 'PART', marca: 'Toyota', modelo: 'Corolla Cross' },
        { ...baseCut, id: 'EXACT', marca: 'Toyota', modelo: 'Corolla' }
    ];
    const results = buildGlobalSearchResults({ query: 'Toyota Corolla', cortes: cuts });
    assert.deepEqual(results.map(item => item.id), ['EXACT', 'PART', 'DESC']);
    assert.deepEqual(results.map(item => item._searchPriority), [0, 1, 2]);
});
testCase('conserva los campos textuales de Relay, Tutoriales y PyS', () => {
    assert.equal(buildGlobalSearchResults({ query: 'conexión protegida', relay }).length, 1);
    assert.equal(buildGlobalSearchResults({ query: 'guía práctica', tutoriales }).length, 1);
    assert.equal(buildGlobalSearchResults({ query: 'antena desconectada', pys }).length, 1);
});
testCase('usa nombre como título exacto alternativo de Relay', () => {
    const item = { ID: 'R-2', nombre: 'Relay auxiliar', funcion: 'Control de bomba' };
    const result = buildGlobalSearchResults({ query: 'Relay auxiliar', relay: [item] });
    assert.equal(result.length, 1);
    assert.equal(result[0]._searchPriority, 0);
    assert.equal(result[0]._sectionType, 'relay');
});
testCase('encuentra títulos literales en cada sección sin convertirlos en marcas', () => {
    assert.equal(buildGlobalSearchResults({ query: 'Relay 5 pines', relay })[0]._sectionType, 'relay');
    assert.equal(buildGlobalSearchResults({ query: 'Instalación de GPS', tutoriales })[0]._sectionType, 'tutorial');
    assert.equal(buildGlobalSearchResults({ query: 'GPS sin señal', pys })[0]._sectionType, 'pys');
});
testCase('no asigna marcas sintéticas a resultados Relay, Tutorial o PyS', () => {
    for (const result of [
        ...buildGlobalSearchResults({ query: 'Relay 5 pines', relay }),
        ...buildGlobalSearchResults({ query: 'Instalación de GPS', tutoriales }),
        ...buildGlobalSearchResults({ query: 'GPS sin señal', pys })
    ]) {
        assert.equal(Object.hasOwn(result, 'marca'), false);
    }
});
testCase('normaliza una consulta HTML contra contenido HTML real', () => {
    assert.equal(buildGlobalSearchResults({ query: '<b>revisar</b> conexión', cortes: [baseCut] }).length, 1);
});
testCase('no filtra un modelo numérico literal por un rango de años diferente', () => {
    const numericModel = { ...baseCut, modelo: '1900', anoDesde: 2020, anoHasta: 2022 };
    assert.equal(buildGlobalSearchResults({ query: '1900', cortes: [numericModel] }).length, 1);
});
testCase('usa el rango cuando el año consultado no aparece literalmente como modelo', () => {
    assert.equal(buildGlobalSearchResults({ query: '2019', cortes: [baseCut] }).length, 1);
    assert.equal(buildGlobalSearchResults({ query: '2010', cortes: [baseCut] }).length, 0);
});
testCase('no usa un año válido para justificar otro número de cuatro dígitos', () => {
    assert.equal(buildGlobalSearchResults({ query: '2019 2025', cortes: [baseCut] }).length, 0);
});
testCase('ordena resultados exactos de secciones antes de coincidencias descriptivas', () => {
    const results = buildGlobalSearchResults({
        query: 'instalación gps',
        tutoriales: [{ Tema: 'Instalación GPS' }],
        relay: [{ configuracion: 'Relay universal', funcion: 'Instalación GPS' }]
    });
    assert.deepEqual(results.map(item => item._sectionType), ['tutorial', 'relay']);
});
testCase('clasifica por marca solo cuando todos los resultados son Cortes', () => {
    assert.equal(classifySearchResults([{ _sectionType: 'corte', marca: 'Toyota', modelo: 'Corolla' }], 'Toyota'), 'marca');
    assert.equal(classifySearchResults([{ _sectionType: 'relay', marca: 'Relay', modelo: '5 pines' }], 'Relay'), 'modelo');
    assert.equal(classifySearchResults([{ _sectionType: 'tutorial', marca: 'Tutorial', modelo: 'GPS' }], 'Tutorial'), 'modelo');
    assert.equal(classifySearchResults([{ _sectionType: 'pys', marca: 'Problema', modelo: 'GPS' }], 'Problema'), 'modelo');

    const exactModelResults = buildGlobalSearchResults({ query: 'Corolla', cortes: [baseCut] });
    assert.equal(classifySearchResults(exactModelResults, 'Corolla'), 'modelo');
    const actualBrandResults = buildGlobalSearchResults({ query: 'Toyota', cortes: [baseCut] });
    assert.equal(classifySearchResults(actualBrandResults, 'Toyota'), 'marca');
});
testCase('mantiene la clasificación de sección en títulos exactos de Relay, Tutorial y PyS', () => {
    const cases = [
        [buildGlobalSearchResults({ query: 'Relay 5 pines', relay }), 'Relay 5 pines'],
        [buildGlobalSearchResults({ query: 'Instalación de GPS', tutoriales }), 'Instalación de GPS'],
        [buildGlobalSearchResults({ query: 'GPS sin señal', pys }), 'GPS sin señal']
    ];
    for (const [results, query] of cases) {
        assert.equal(results.length, 1, query);
        assert.equal(classifySearchResults(results, query), 'modelo', query);
    }
});
testCase('no clasifica como marca las coincidencias mixtas de Cortes y otras secciones', () => {
    const results = buildGlobalSearchResults({
        query: 'Toyota',
        cortes: [baseCut],
        relay: [{ ID: 'R-3', configuracion: 'Relay auxiliar', vehiculoDondeSeUtiliza: 'Toyota' }],
        tutoriales: [{ ID: 'T-3', Tema: 'Toyota instalación' }],
        pys: [{ id: 'P-3', Problema: 'Toyota GPS' }]
    });
    assert.deepEqual(
        [...new Set(results.map(item => item._sectionType))].sort(),
        ['corte', 'pys', 'relay', 'tutorial']
    );
    assert.equal(classifySearchResults(results, 'Toyota'), 'modelo');
});
testCase('mantiene el destino específico de cada sección en los resultados', () => {
    const results = buildGlobalSearchResults({ query: 'guía práctica', tutoriales });
    assert.equal(results[0]._sectionType, 'tutorial');
    assert.equal(results[0].Tema, 'Instalación de GPS');
});
testCase('autoabre únicamente una coincidencia de Corte', () => {
    assert.equal(shouldAutoOpenVehicleDetail([{ _sectionType: 'corte', id: 'CUT-1' }]), true);
    for (const section of ['relay', 'tutorial', 'pys']) {
        assert.equal(shouldAutoOpenVehicleDetail([{ _sectionType: section, id: 'X-1' }]), false);
    }
    assert.equal(shouldAutoOpenVehicleDetail([{ _sectionType: 'corte' }, { _sectionType: 'corte' }]), false);
});
testCase('decodifica deep links y tolera secuencias porcentuales inválidas', () => {
    assert.equal(decodeSearchHash('#search=Toyota%20Corolla'), 'Toyota Corolla');
    assert.equal(decodeSearchHash('#search=%3Cb%3EGPS%3C%2Fb%3E'), '<b>GPS</b>');
    assert.equal(decodeSearchHash('#search=%E0%A4%A'), '%E0%A4%A');
    assert.equal(decodeSearchHash('#tutoriales'), null);
});
await testAsync('comparte una sola promesa entre llamadas simultáneas', async () => {
    let calls = 0;
    let resolveLoader;
    const loader = createSharedPromise(() => {
        calls += 1;
        return new Promise(resolve => { resolveLoader = resolve; });
    });
    const first = loader();
    const second = loader();
    assert.equal(first, second);
    await Promise.resolve();
    assert.equal(calls, 1);
    resolveLoader(['PYS']);
    assert.deepEqual(await first, ['PYS']);
});
await testAsync('permite reintentar la carga compartida después de un error', async () => {
    let calls = 0;
    const loader = createSharedPromise(async () => {
        calls += 1;
        if (calls === 1) throw new Error('fallo temporal');
        return ['OK'];
    });
    await assert.rejects(loader(), /fallo temporal/);
    assert.deepEqual(await loader(), ['OK']);
    assert.equal(calls, 2);
});
testCase('devuelve cero resultados cuando ningún campo coincide', () => {
    assert.deepEqual(buildGlobalSearchResults({ query: 'término inexistente', cortes: [baseCut], relay, tutoriales, pys }), []);
});

console.log(`GlobalSearch: ${passed}/23 PASS`);
