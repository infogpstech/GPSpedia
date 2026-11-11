import assert from 'node:assert/strict';

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

function createIndexedDBHarness(options = {}) {
    const stores = new Map();
    const connections = [];
    let openCount = 0;
    let transactionCount = 0;

    const database = {
        objectStoreNames: { contains: name => stores.has(name) },
        createObjectStore(name, config = {}) {
            stores.set(name, { values: new Map(), keyPath: config.keyPath || null });
            return {};
        },
        close() { this.closed = true; },
        transaction(names, mode) {
            transactionCount += 1;
            const behavior = options.transactions && options.transactions[transactionCount - 1] || 'complete';
            let aborted = false;
            const tx = {
                error: behavior === 'quota' ? new DOMException('Quota exceeded', 'QuotaExceededError') : null,
                objectStore(name) {
                    const record = stores.get(name);
                    return {
                        put(value, key) {
                            const request = {};
                            queueMicrotask(() => {
                                if (behavior === 'quota') {
                                    request.error = tx.error;
                                    if (request.onerror) request.onerror();
                                    if (tx.onerror) tx.onerror();
                                    if (tx.onabort) tx.onabort();
                                    return;
                                }
                                const resolvedKey = key === undefined ? value[record.keyPath] : key;
                                record.values.set(resolvedKey, structuredClone(value));
                                request.result = resolvedKey;
                                if (request.onsuccess) request.onsuccess();
                                queueMicrotask(() => {
                                    if (behavior === 'abort') {
                                        aborted = true;
                                        tx.error = new DOMException('Aborted', 'AbortError');
                                        if (tx.onabort) tx.onabort();
                                    } else if (!aborted && tx.oncomplete) {
                                        tx.oncomplete();
                                    }
                                });
                            });
                            return request;
                        },
                        get(key) {
                            const request = {};
                            queueMicrotask(() => {
                                request.result = record.values.get(key);
                                if (request.onsuccess) request.onsuccess();
                                queueMicrotask(() => {
                                    if (tx.oncomplete) tx.oncomplete();
                                });
                            });
                            return request;
                        },
                        getAll() {
                            const request = {};
                            queueMicrotask(() => {
                                request.result = [...record.values.values()];
                                if (request.onsuccess) request.onsuccess();
                                queueMicrotask(() => {
                                    if (tx.oncomplete) tx.oncomplete();
                                });
                            });
                            return request;
                        }
                    };
                },
                abort() {
                    aborted = true;
                    if (tx.onabort) queueMicrotask(() => tx.onabort());
                }
            };
            return tx;
        }
    };

    const indexedDB = {
        open() {
            openCount += 1;
            const request = {};
            connections.push(database);
            queueMicrotask(() => {
                if (options.blocked) {
                    if (request.onblocked) request.onblocked();
                    return;
                }
                if (openCount === 1 && request.onupgradeneeded) {
                    request.onupgradeneeded({ target: { result: database } });
                }
                request.result = database;
                if (request.onsuccess) request.onsuccess({ target: { result: database } });
            });
            return request;
        }
    };
    return { indexedDB, database, connections, get openCount() { return openCount; } };
}

async function freshOffline(harness, label) {
    globalThis.indexedDB = harness.indexedDB;
    return import(`../../offline.js?indexeddb-${label}-${Date.now()}-${Math.random()}`);
}

async function runIndexedDBTransactionTests() {
    const successHarness = createIndexedDBHarness();
    const offline = await freshOffline(successHarness, 'success');
    const snapshot = {
        cortes: [{ id: 'C-1', marca: 'Toyota' }],
        tutoriales: [],
        relay: [],
        logos: []
    };

    await testAsync('saveCatalog solo resuelve después del commit de la transacción', async () => {
        await offline.saveCatalog(snapshot);
        const stored = await offline.getCatalog();
        assert.deepEqual(stored, snapshot);
    });

    test('la conexión se cierra ante onversionchange y permite reabrir', async () => {
        const first = await offline.initDB();
        assert.equal(typeof first.onversionchange, 'function');
        first.onversionchange();
        assert.equal(first.closed, true);
        const reopened = await offline.initDB();
        assert.ok(reopened);
        assert.equal(successHarness.openCount, 2);
    });

    const abortHarness = createIndexedDBHarness({ transactions: ['abort'] });
    const abortOffline = await freshOffline(abortHarness, 'abort');
    await testAsync('un request exitoso seguido de transaction.onabort no se confirma', async () => {
        await assert.rejects(abortOffline.saveCatalog(snapshot), /IndexedDB|transacción|transaction/i);
    });

    const quotaHarness = createIndexedDBHarness({ transactions: ['quota'] });
    const quotaOffline = await freshOffline(quotaHarness, 'quota');
    await testAsync('un error de cuota rechaza la escritura y no se presenta como guardada', async () => {
        await assert.rejects(quotaOffline.saveCatalog(snapshot), /IndexedDB|transacción|transaction/i);
    });

    const blockedHarness = createIndexedDBHarness({ blocked: true });
    const blockedOffline = await freshOffline(blockedHarness, 'blocked');
    await testAsync('onblocked falla de forma explícita y no deja la apertura pendiente', async () => {
        await assert.rejects(blockedOffline.initDB(), /bloqueada/);
    });

    const scopedHarness = createIndexedDBHarness();
    const scopedOffline = await freshOffline(scopedHarness, 'account-scope');
    await testAsync('historial aislado por cuenta y consultas potencialmente VIN excluidas', async () => {
        await scopedOffline.saveSearch('Lancer', 'user-a');
        await scopedOffline.saveSearch('Civic', 'user-b');
        assert.equal(await scopedOffline.saveSearch('1HGCM82633A004352', 'user-a'), null);
        assert.deepEqual((await scopedOffline.getSearchHistory('user-a')).map(entry => entry.term), ['lancer']);
        assert.deepEqual((await scopedOffline.getSearchHistory('user-b')).map(entry => entry.term), ['civic']);
        assert.equal(await scopedOffline.saveSearch('Corolla', ''), null);
        assert.deepEqual(await scopedOffline.getSearchHistory(''), []);
    });
    await testAsync('vistos aislados entre cuentas', async () => {
        await scopedOffline.saveViewedItem({ id: 'V-1', marca: 'Toyota' }, 'user-a');
        await scopedOffline.saveViewedItem({ id: 'V-1', marca: 'Honda' }, 'user-b');
        const viewedA = await scopedOffline.getViewedItems('user-a'), viewedB = await scopedOffline.getViewedItems('user-b');
        assert.equal(viewedA.length, 1); assert.equal(viewedA[0].id, 'V-1'); assert.equal(viewedA[0].data.marca, 'Toyota');
        assert.equal(viewedB.length, 1); assert.equal(viewedB[0].data.marca, 'Honda');
        assert.deepEqual(await scopedOffline.getViewedItems(''), []);
    });
    await testAsync('validationCache aislado por cuenta', async () => {
        await scopedOffline.saveValidationResponse('V-2', 'correct', 'user-a');
        assert.ok(await scopedOffline.getValidationResponse('V-2', 'user-a'));
        assert.equal(await scopedOffline.getValidationResponse('V-2', 'user-b'), null);
        assert.equal(await scopedOffline.saveValidationResponse('V-2', 'incorrect', ''), null);
    });
    console.log(`\nIndexedDB transaction tests: ${passed}/8 PASS`);
}

runIndexedDBTransactionTests().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
