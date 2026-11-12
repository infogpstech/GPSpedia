import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    buildVehicleShareUrl,
    decodeSharedVehicleHash,
    resolveSharedVehicleById,
    copyTextToClipboard,
    shareVehicleLink
} from '../../share-utils.js';

let passed = 0;
function test(name, fn) {
    fn();
    passed += 1;
    console.log('PASS', name);
}
async function testAsync(name, fn) {
    await fn();
    passed += 1;
    console.log('PASS', name);
}

test('construye un solo URL con ID estable y consulta codificada', () => {
    assert.equal(
        buildVehicleShareUrl('https://gp.example/index.html?lang=es#old', 'CUT/009', 'Toyota Corolla LE'),
        'https://gp.example/index.html?lang=es#vehicle=CUT%2F009&search=Toyota%20Corolla%20LE'
    );
});

test('usa el formato histórico #search= cuando no hay ID estable', () => {
    assert.equal(
        buildVehicleShareUrl('https://gp.example/index.html', '', 'Toyota Corolla'),
        'https://gp.example/index.html#search=Toyota%20Corolla'
    );
});

test('conserva compatibilidad con enlaces históricos #search=', () => {
    assert.deepEqual(decodeSharedVehicleHash('#search=Toyota%20Corolla%20LE'), {
        vehicleId: null,
        query: 'Toyota Corolla LE',
        legacy: true,
        ambiguousVehicleId: false
    });
});

test('decodifica ID y búsqueda del enlace compartido nuevo', () => {
    assert.deepEqual(decodeSharedVehicleHash('#vehicle=CUT%2F009&search=Toyota%20Corolla'), {
        vehicleId: 'CUT/009',
        query: 'Toyota Corolla',
        legacy: false,
        ambiguousVehicleId: false,
        ambiguousQuery: false
    });
});

test('si el hash contiene IDs contradictorios usa la búsqueda sin elegir uno al azar', () => {
    const decoded = decodeSharedVehicleHash('#vehicle=CUT-1&vehicle=CUT-2&search=Toyota');
    assert.equal(decoded.vehicleId, null);
    assert.equal(decoded.query, 'Toyota');
    assert.equal(decoded.ambiguousVehicleId, true);
});

test('varias apariciones idénticas del mismo ID no generan ambigüedad', () => {
    const decoded = decodeSharedVehicleHash('#vehicle=CUT-1&vehicle=CUT-1&search=Toyota');
    assert.equal(decoded.vehicleId, 'CUT-1');
    assert.equal(decoded.ambiguousVehicleId, false);
});

test('resuelve la identidad exacta de Cortes aunque existan metadatos duplicados', () => {
    const expected = { id: 'CUT-2', marca: 'Toyota', modelo: 'Corolla', versionesAplicables: 'LE / SE' };
    const catalog = {
        cortes: [
            { id: 'CUT-1', marca: 'Toyota', modelo: 'Corolla', versionesAplicables: 'LE' },
            expected
        ],
        relay: [{ id: 'CUT-2', modelo: 'Corolla' }],
        tutoriales: [{ ID: 'CUT-2', Tema: 'Corolla' }],
        pys: [{ id: 'CUT-2', Problema: 'Corolla' }]
    };
    assert.equal(resolveSharedVehicleById(catalog, 'CUT-2'), expected);
});

test('no abre un ID repetido dentro de Cortes; deja que actúe la búsqueda alternativa', () => {
    const catalog = { cortes: [{ id: 'DUP' }, { id: 'DUP' }] };
    assert.equal(resolveSharedVehicleById(catalog, 'DUP'), null);
});

test('no resuelve IDs que solo pertenecen a Relay, Tutoriales o PyS', () => {
    const catalog = {
        cortes: [],
        relay: [{ id: 'R-1' }],
        tutoriales: [{ ID: 'T-1' }],
        pys: [{ id: 'P-1' }]
    };
    assert.equal(resolveSharedVehicleById(catalog, 'R-1'), null);
    assert.equal(resolveSharedVehicleById(catalog, 'T-1'), null);
    assert.equal(resolveSharedVehicleById(catalog, 'P-1'), null);
});

await testAsync('Web Share exitoso no invoca Clipboard', async () => {
    let copied = false;
    const result = await shareVehicleLink({ url: 'https://gp.example/#vehicle=C1' }, {
        share: async () => {},
        clipboard: { writeText: async () => { copied = true; } }
    });
    assert.equal(result.status, 'shared');
    assert.equal(copied, false);
});

await testAsync('AbortError se reconoce como cancelación y no copia automáticamente', async () => {
    let copied = false;
    const result = await shareVehicleLink({ url: 'https://gp.example/#vehicle=C1' }, {
        share: async () => { const error = new Error('cancelled'); error.name = 'AbortError'; throw error; },
        clipboard: { writeText: async () => { copied = true; } }
    });
    assert.equal(result.status, 'cancelled');
    assert.equal(copied, false);
});

await testAsync('un rechazo recuperable de Web Share activa Clipboard con el mismo URL', async () => {
    let copiedUrl = '';
    const url = 'https://gp.example/#vehicle=C1&search=Toyota';
    const result = await shareVehicleLink({ url }, {
        share: async () => { throw new Error('NotAllowedError'); },
        clipboard: { writeText: async value => { copiedUrl = value; } }
    });
    assert.equal(result.status, 'copied');
    assert.equal(result.fallbackFromShare, true);
    assert.equal(copiedUrl, url);
});

await testAsync('un error síncrono de Web Share también intenta Clipboard', async () => {
    let copied = false;
    const result = await shareVehicleLink({ url: 'https://gp.example/#vehicle=C1' }, {
        share() { throw new Error('share sync failure'); },
        clipboard: { writeText: async () => { copied = true; } }
    });
    assert.equal(result.status, 'copied');
    assert.equal(copied, true);
});

await testAsync('sin Web Share usa Clipboard como fallback', async () => {
    let copied = '';
    const result = await shareVehicleLink({ url: 'https://gp.example/#search=Toyota' }, {
        clipboard: { writeText: async value => { copied = value; } }
    });
    assert.equal(result.status, 'copied');
    assert.equal(copied, 'https://gp.example/#search=Toyota');
});

await testAsync('Clipboard ausente devuelve un error recuperable', async () => {
    const result = await shareVehicleLink({ url: 'https://gp.example/#search=Toyota' }, {});
    assert.equal(result.status, 'failed');
    assert.ok(result.error instanceof Error);
});

await testAsync('writeText síncrono o asíncrono fallido se captura', async () => {
    const sync = await copyTextToClipboard('https://gp.example', {
        writeText() { throw new Error('sync clipboard failure'); }
    });
    const asyncResult = await copyTextToClipboard('https://gp.example', {
        writeText: async () => { throw new Error('async clipboard failure'); }
    });
    assert.equal(sync.status, 'failed');
    assert.equal(asyncResult.status, 'failed');
});

test('ui.js centraliza el URL y ofrece un campo manual accesible ante fallos', () => {
    const source = readFileSync(new URL('../../ui.js', import.meta.url), 'utf8');
    assert.match(source, /buildVehicleShareUrl\(window\.location\.href, activeItem\.id, shareQuery\)/);
    assert.match(source, /shareVehicleLink\(shareData, navigator\)/);
    assert.match(source, /share-manual-link-container/);
    assert.match(source, /Enlace copiado al portapapeles/);
    assert.match(source, /Compartir cancelado/);
});

test('main.js resuelve el ID solo contra Cortes y conserva fallback de búsqueda', () => {
    const source = readFileSync(new URL('../../main.js', import.meta.url), 'utf8');
    assert.match(source, /decodeSharedVehicleHash\(window\.location\.hash\)/);
    assert.match(source, /resolveSharedVehicleById\(latestState\.catalogData, sharedLink\.vehicleId\)/);
    assert.match(source, /navigation\.filtrarContenido\(query, true\)/);
    assert.match(source, /ui\.mostrarDetalleModal\(vehicle\)/);
    assert.match(source, /navigation\.filtrarContenido\(query\)/);
});

console.log('VehicleShareLinks:', passed + '/18 PASS');
