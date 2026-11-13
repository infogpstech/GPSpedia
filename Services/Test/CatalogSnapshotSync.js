import assert from 'node:assert/strict';
import {
    areCatalogCollectionsEqual,
    compareCatalogSnapshots,
    getCatalog,
    indexCatalogItemsById,
    isCompleteCatalogSnapshot,
    saveCatalog
} from '../../offline.js';

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

function snapshot(overrides = {}) {
    return {
        cortes: [{ id: 'C-1', marca: 'Toyota' }, { id: 'C-2', marca: 'Honda' }],
        tutoriales: [{ ID: 'T-1', Tema: 'Instalación', Detalles: 'A' }],
        relay: [{ ID: 'R-1', configuracion: '5 pines', funcion: 'A' }],
        logos: [{ nombreMarca: 'Toyota', urlLogo: 'logo-a' }],
        ...overrides
    };
}

function installFakeIndexedDB() {
    const stores = new Map();
    let upgraded = false;
    const database = {
        objectStoreNames: { contains: name => stores.has(name) },
        createObjectStore(name) { stores.set(name, new Map()); return {}; },
        transaction() {
            const transaction = {
                oncomplete: null,
                onerror: null,
                onabort: null,
                objectStore(name) {
                    const store = stores.get(name);
                    return {
                        put(value, key) {
                            const request = {};
                            queueMicrotask(() => {
                                store.set(key, structuredClone(value));
                                request.result = key;
                                if (request.onsuccess) request.onsuccess();
                                if (typeof transaction.oncomplete === 'function') transaction.oncomplete();
                            });
                            return request;
                        },
                        get(key) {
                            const request = {};
                            queueMicrotask(() => {
                                request.result = store.get(key);
                                if (request.onsuccess) request.onsuccess();
                                if (typeof transaction.oncomplete === 'function') transaction.oncomplete();
                            });
                            return request;
                        }
                    };
                }
            };
            return transaction;
        }
    };
    globalThis.indexedDB = {
        open() {
            const request = {};
            queueMicrotask(() => {
                request.result = database;
                if (!upgraded) {
                    upgraded = true;
                    if (request.onupgradeneeded) request.onupgradeneeded({ target: { result: database } });
                }
                if (request.onsuccess) request.onsuccess({ target: { result: database } });
            });
            return request;
        }
    };
}

async function runCatalogSnapshotSyncTests() {
    test('acepta instantánea completa con IDs estables', () => {
        assert.equal(isCompleteCatalogSnapshot(snapshot()), true);
    });
    test('rechaza colecciones ausentes o no-array', () => {
        assert.equal(isCompleteCatalogSnapshot({ ...snapshot(), logos: undefined }), false);
        assert.equal(isCompleteCatalogSnapshot({ ...snapshot(), relay: {} }), false);
    });
    test('rechaza cortes sin ID y evita colisiones por IDs duplicados', () => {
        assert.equal(isCompleteCatalogSnapshot(snapshot({ cortes: [{ marca: 'Toyota' }] })), false);
        assert.equal(isCompleteCatalogSnapshot(snapshot({ cortes: [{ id: 'C-1' }, { id: 'C-1' }] })), false);
        assert.throws(() => indexCatalogItemsById([{ id: 'C-1' }, { id: 'C-1' }]), /duplicado/);
    });
    test('indexa Cortes por ID persistente sin depender del orden', () => {
        const index = indexCatalogItemsById([{ id: 'C-2' }, { id: 'C-1' }]);
        assert.deepEqual([...index.keys()], ['C-2', 'C-1']);
    });
    test('compara objetos ignorando el orden de sus propiedades', () => {
        assert.equal(areCatalogCollectionsEqual([{ a: 1, b: 2 }], [{ b: 2, a: 1 }]), true);
    });
    test('detecta cambios de Tutoriales con la misma cantidad de registros', () => {
        assert.equal(areCatalogCollectionsEqual([{ ID: 'T-1', Tema: 'A', Detalles: '1' }], [{ ID: 'T-1', Tema: 'A', Detalles: '2' }]), false);
    });
    test('detecta cambios de Relay con la misma cantidad de registros', () => {
        assert.equal(areCatalogCollectionsEqual([{ ID: 'R-1', configuracion: 'A', funcion: '1' }], [{ ID: 'R-1', configuracion: 'A', funcion: '2' }]), false);
    });
    test('detecta cambios de logos y metadatos con la misma cantidad', () => {
        assert.equal(areCatalogCollectionsEqual([{ nombreMarca: 'Toyota', urlLogo: 'a', categoria: 'Auto' }], [{ nombreMarca: 'Toyota', urlLogo: 'b', categoria: 'Auto' }]), false);
    });
    test('no colapsa registros distintos que comparten Tema o configuración', () => {
        const tutorials = [{ Tema: 'Diagnóstico', Detalles: 'A' }, { Tema: 'Diagnóstico', Detalles: 'B' }];
        const relays = [{ configuracion: '5 pines', funcion: 'A' }, { configuracion: '5 pines', funcion: 'B' }];
        assert.equal(areCatalogCollectionsEqual(tutorials, [...tutorials]), true);
        assert.equal(areCatalogCollectionsEqual(relays, [...relays]), true);
        assert.equal(areCatalogCollectionsEqual(tutorials, [tutorials[0]]), false);
        assert.equal(areCatalogCollectionsEqual(relays, [relays[0]]), false);
    });
    test('detecta cambios de orden en una colección', () => {
        assert.equal(areCatalogCollectionsEqual([{ ID: 1 }, { ID: 2 }], [{ ID: 2 }, { ID: 1 }]), false);
    });
    test('detecta altas, modificaciones y eliminaciones de Cortes por ID', () => {
        const previous = snapshot({ cortes: [{ id: 'C-1', marca: 'Toyota' }, { id: 'C-2', marca: 'Honda' }] });
        const next = snapshot({ cortes: [{ id: 'C-1', marca: 'Toyota actualizado' }, { id: 'C-3', marca: 'Nissan' }] });
        const diff = compareCatalogSnapshots(previous, next);
        assert.deepEqual(diff.cortes.added.map(item => item.id), ['C-3']);
        assert.deepEqual(diff.cortes.modified.map(item => item.id), ['C-1']);
        assert.deepEqual(diff.cortes.removed.map(item => item.id), ['C-2']);
        assert.equal(diff.hasChanges, true);
    });
    test('detecta cambios de contenido en Tutoriales, Relay y Logos aunque conserven cardinalidad', () => {
        const previous = snapshot();
        const next = snapshot({
            tutoriales: [{ ID: 'T-1', Tema: 'Instalación', Detalles: 'B' }],
            relay: [{ ID: 'R-1', configuracion: '5 pines', funcion: 'B' }],
            logos: [{ nombreMarca: 'Toyota', urlLogo: 'logo-b' }]
        });
        const diff = compareCatalogSnapshots(previous, next);
        assert.deepEqual(diff.collections, { tutoriales: true, relay: true, logos: true });
        assert.equal(diff.hasChanges, true);
    });
    test('no informa cambios cuando la instantánea conserva el contenido', () => {
        const data = snapshot();
        assert.equal(compareCatalogSnapshots(data, structuredClone(data)).hasChanges, false);
    });

    installFakeIndexedDB();
    await testAsync('saveCatalog reemplaza el snapshot completo y elimina registros retirados', async () => {
        const previous = snapshot();
        await saveCatalog(previous);
        const current = snapshot({
            cortes: [{ id: 'C-2', marca: 'Honda' }],
            tutoriales: [],
            relay: [],
            logos: []
        });
        await saveCatalog(current);
        assert.deepEqual(await getCatalog(), current);
    });
    await testAsync('saveCatalog rechaza snapshots incompletos sin sustituir la caché', async () => {
        const before = await getCatalog();
        await assert.rejects(() => saveCatalog({ ...snapshot(), logos: null }), /instantánea completa/);
        assert.deepEqual(await getCatalog(), before);
    });

    console.log(`CatalogSnapshotSync: ${passed}/15 PASS`);
    return { passed, total: 15 };
}

try {
    await runCatalogSnapshotSyncTests();
} catch (error) {
    console.error(error);
    process.exitCode = 1;
}
