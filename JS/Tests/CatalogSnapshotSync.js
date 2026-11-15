import assert from 'node:assert/strict';
import {
    areCatalogCollectionsEqual,
    applyCatalogChangesToSnapshot,
    compareCatalogSnapshots,
    getCatalog,
    getCatalogSyncState,
    indexCatalogItemsById,
    isCompleteCatalogSnapshot,
    saveCatalog,
    saveCatalogCursor,
    saveCatalogWithCursor
} from '../Frontend/offline.js';

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
        logos: [{ id: 'L-1', nombreMarca: 'Toyota', urlLogo: 'logo-a' }],
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
            const transaction = { oncomplete: null, onerror: null, onabort: null, pending: 0, scheduled: false };
            const completeIfReady = () => {
                if (transaction.scheduled && transaction.pending === 0 && typeof transaction.oncomplete === 'function') {
                    queueMicrotask(() => { if (transaction.pending === 0 && transaction.oncomplete) transaction.oncomplete(); });
                }
            };
            transaction.objectStore = name => {
                const store = stores.get(name);
                const schedule = callback => {
                    transaction.pending++;
                    transaction.scheduled = true;
                    const request = {};
                    queueMicrotask(() => {
                        try { callback(request); if (request.onsuccess) request.onsuccess(); }
                        catch (error) { request.error = error; if (request.onerror) request.onerror(); transaction.onabort && transaction.onabort(); }
                        transaction.pending--;
                        completeIfReady();
                    });
                    return request;
                };
                return {
                    put(value, key) { return schedule(request => { store.set(key, structuredClone(value)); request.result = key; }); },
                    get(key) { return schedule(request => { request.result = structuredClone(store.get(key)); }); }
                };
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
    test('acepta una instantánea vacía completa como catálogo válido', () => {
        assert.equal(isCompleteCatalogSnapshot({ cortes: [], tutoriales: [], relay: [], logos: [] }), true);
    });
    test('rechaza elementos nulos, primitivos o arrays en cualquier colección', () => {
        assert.equal(isCompleteCatalogSnapshot(snapshot({ tutoriales: [null] })), false);
        assert.equal(isCompleteCatalogSnapshot(snapshot({ relay: ['inválido'] })), false);
        assert.equal(isCompleteCatalogSnapshot(snapshot({ logos: [[]] })), false);
        const arrayWithId = []; arrayWithId.id = 'C-1';
        assert.equal(isCompleteCatalogSnapshot(snapshot({ cortes: [arrayWithId] })), false);
    });
    test('rechaza una raíz array aunque exponga propiedades de colecciones', () => {
        const rootArray = [];
        rootArray.cortes = []; rootArray.tutoriales = []; rootArray.relay = []; rootArray.logos = [];
        assert.equal(isCompleteCatalogSnapshot(rootArray), false);
    });
    test('rechaza snapshots cuyas propiedades lanzan durante la validación', () => {
        const malformed = snapshot();
        Object.defineProperty(malformed, 'tutoriales', { get() { throw new Error('propiedad dañada'); } });
        assert.equal(isCompleteCatalogSnapshot(malformed), false);
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
    test('aplica upsert y delete de Cortes por ID sin alterar otras colecciones', () => {
        const before = snapshot();
        const result = applyCatalogChangesToSnapshot(before, [
            { revision: 1, collection: 'cortes', recordId: 'C-1', operation: 'upsert', snapshot: { id: 'C-1', marca: 'Toyota actualizado' } },
            { revision: 2, collection: 'cortes', recordId: 'C-2', operation: 'delete' },
            { revision: 3, collection: 'cortes', recordId: 'C-3', operation: 'upsert', snapshot: { id: 'C-3', marca: 'Nissan' } }
        ]);
        assert.equal(result.resetRequired, false);
        assert.deepEqual(result.snapshot.cortes, [{ id: 'C-1', marca: 'Toyota actualizado' }, { id: 'C-3', marca: 'Nissan' }]);
        assert.deepEqual(result.snapshot.tutoriales, before.tutoriales);
    });
    test('reserva reset seguro para reset global y colecciones desconocidas', () => {
        assert.equal(applyCatalogChangesToSnapshot(snapshot(), [{ revision: 1, collection: '*', operation: 'reset' }]).resetRequired, true);
        assert.equal(applyCatalogChangesToSnapshot(snapshot(), [{ revision: 1, collection: 'unknown', recordId: 'X-1', operation: 'upsert', snapshot: { id: 'X-1' } }]).resetRequired, true);
    });
    test('recalcula categoryCounts y sortedCategories al aplicar upsert/delete de Cortes', () => {
        const before = snapshot({
            cortes: [{ id: 'C-1', categoria: 'Pickup' }, { id: 'C-2', categoria: 'Sedan' }],
            categoryCounts: { Pickup: 1, Sedan: 1 },
            sortedCategories: ['Pickup', 'Sedan']
        });
        const result = applyCatalogChangesToSnapshot(before, [
            { revision: 1, collection: 'cortes', recordId: 'C-1', operation: 'upsert', snapshot: { id: 'C-1', categoria: 'Sedan' } },
            { revision: 2, collection: 'cortes', recordId: 'C-2', operation: 'delete' }
        ]);
        assert.equal(result.resetRequired, false);
        assert.deepEqual(result.snapshot.categoryCounts, { Sedan: 1 });
        assert.deepEqual(result.snapshot.sortedCategories, ['Sedan']);
    });
    test('ignora eventos PyS en el snapshot principal sin solicitar descarga completa', () => {
        const before = snapshot();
        const result = applyCatalogChangesToSnapshot(before, [
            { revision: 1, collection: 'pys', recordId: 'isue-001', operation: 'upsert', snapshot: { id_problem: 'isue-001', Problema: 'Nuevo' } }
        ]);
        assert.equal(result.resetRequired, false);
        assert.deepEqual(result.snapshot, before);
    });
    test('aplica deltas por ID estable en Tutoriales, Relay y Logos', () => {
        const before = snapshot();
        const result = applyCatalogChangesToSnapshot(before, [
            { revision: 1, collection: 'tutoriales', recordId: 'T-1', operation: 'upsert', snapshot: { ID: 'T-1', Tema: 'Instalación actualizada' } },
            { revision: 2, collection: 'relay', recordId: 'R-1', operation: 'delete' },
            { revision: 3, collection: 'relay', recordId: 'R-2', operation: 'upsert', snapshot: { ID: 'R-2', configuracion: '4 pines' } },
            { revision: 4, collection: 'logos', recordId: 'L-1', operation: 'upsert', snapshot: { id: 'L-1', nombreMarca: 'Toyota', urlLogo: 'logo-b' } }
        ]);
        assert.equal(result.resetRequired, false);
        assert.deepEqual(result.snapshot.tutoriales, [{ ID: 'T-1', Tema: 'Instalación actualizada' }]);
        assert.deepEqual(result.snapshot.relay, [{ ID: 'R-2', configuracion: '4 pines' }]);
        assert.deepEqual(result.snapshot.logos, [{ id: 'L-1', nombreMarca: 'Toyota', urlLogo: 'logo-b' }]);
        assert.deepEqual(result.snapshot.cortes, before.cortes);
    });
    test('usa reset seguro si una colección afectada contiene IDs ausentes o duplicados', () => {
        const legacy = snapshot({ tutoriales: [{ Tema: 'Sin ID' }] });
        const result = applyCatalogChangesToSnapshot(legacy, [
            { revision: 1, collection: 'tutoriales', recordId: 'T-2', operation: 'upsert', snapshot: { ID: 'T-2' } }
        ]);
        assert.equal(result.resetRequired, true);
        assert.equal(result.snapshot, null);
    });
    test('rechaza upsert de Corte con ID distinto al ID del evento', () => {
        assert.throws(() => applyCatalogChangesToSnapshot(snapshot(), [
            { revision: 1, collection: 'cortes', recordId: 'C-1', operation: 'upsert', snapshot: { id: 'C-2' } }
        ]), /upsert inválido en cortes/);
    });
    await testAsync('snapshot y cursor se guardan y leen como estado sincronizado', async () => {
        const current = snapshot();
        await saveCatalogWithCursor(current, 12);
        const saved = await getCatalogSyncState();
        assert.deepEqual(saved.snapshot, current);
        assert.equal(saved.cursor, 12);
    });
    await testAsync('actualizar cursor no sustituye la instantánea y rechaza valores inválidos', async () => {
        const before = await getCatalog();
        await saveCatalogCursor(13);
        assert.deepEqual((await getCatalogSyncState()).snapshot, before);
        assert.equal((await getCatalogSyncState()).cursor, 13);
        await assert.rejects(() => saveCatalogCursor(-1), /cursor/);
    });
    await testAsync('guardar snapshot sin revisión invalida un cursor anterior', async () => {
        await saveCatalogWithCursor(snapshot(), 21);
        await saveCatalog(snapshot({ cortes: [{ id: 'C-9', marca: 'Nissan' }] }));
        const saved = await getCatalogSyncState();
        assert.equal(saved.snapshot.cortes[0].id, 'C-9');
        assert.equal(saved.cursor, null);
    });

    console.log(`CatalogSnapshotSync: ${passed}/29 PASS`);
    return { passed, total: 29 };
}

try {
    await runCatalogSnapshotSyncTests();
} catch (error) {
    console.error(error);
    process.exitCode = 1;
}
