import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isCompleteCatalogSnapshot } from '../Frontend/offline.js';

const authSource = readFileSync(new URL('../Frontend/auth.js', import.meta.url), 'utf8');
const uiSource = readFileSync(new URL('../Frontend/ui.js', import.meta.url), 'utf8');
function extract(name) {
    let start = authSource.indexOf('function ' + name + '(');
    if (start < 0) throw new Error('No se encontró ' + name);
    if (authSource.slice(start - 6, start) === 'async ') start -= 6;
    const candidates = [
        authSource.indexOf('\nfunction ', start + 12),
        authSource.indexOf('\nasync function ', start + 12),
        authSource.indexOf('\nexport function ', start + 12),
        authSource.indexOf('\nexport async function ', start + 12),
        authSource.indexOf('\nconst SESSION_KEY =', start + 12)
    ].filter(index => index >= 0);
    const end = candidates.length ? Math.min(...candidates) : authSource.length;
    return authSource.slice(start, end);
}
function snapshot(cortes = [{ id: 'C-1', marca: 'toyota', modelo: 'hilux', categoria: 'pickup' }, { id: 'C-2', marca: 'Toyota', modelo: 'Hilux', categoria: 'pickup' }]) {
    return { cortes, tutoriales: [], relay: [], logos: [] };
}
function createHarness(options = {}) {
    const state = {
        catalogLoadStatus: 'idle',
        catalogLoadError: null,
        currentUser: { ID: 'USER-1', SessionToken: 'session-token' },
        catalogData: { cortes: [], tutoriales: [], relay: [], logos: [], sortedCategories: [] }
    };
    const errors = [], warnings = [], patches = [];
    let cacheIndex = 0, saveCalls = 0, pysCalls = 0, fetchCalls = 0, savedCursor = null, cursorWrites = 0;
    let releaseCatalogPersistence = null;
    const delayedCatalogPersistence = options.delayCatalogPersistence
        ? new Promise(resolve => { releaseCatalogPersistence = resolve; }) : null;
    let failCatalogWrites = Number(options.failCatalogWrites || 0);
    const cacheReads = options.cacheReads || [null];
    const offline = {
        isCompleteCatalogSnapshot,
        compareCatalogSnapshots(previous, next) { return { hasChanges: JSON.stringify(previous) !== JSON.stringify(next) }; },
        async getCatalog() {
            const value = cacheReads[Math.min(cacheIndex++, cacheReads.length - 1)];
            if (value instanceof Error) throw value;
            return value === undefined ? null : value;
        },
        async getCatalogSyncState() {
            if (options.pendingIndexedDbRead) return new Promise(() => {});
            return { snapshot: await this.getCatalog(), cursor: options.cacheCursor === undefined ? null : options.cacheCursor };
        },
        async getCatalogFallbackCache() { return options.fallbackCache || null; },
        async saveCatalogFallbackCache(snapshot, cursor) { this.fallbackSaved = { snapshot, cursor }; return true; },
        async saveCatalog(value) {
            saveCalls++; savedCursor = null;
            if (options.failCatalogPersistence) throw new Error('IndexedDB initialization timed out');
            if (delayedCatalogPersistence) return delayedCatalogPersistence.then(() => value);
            return value;
        },
        async saveCatalogWithCursor(value, cursor) {
            saveCalls++; savedCursor = cursor;
            if (options.failCatalogPersistence) throw new Error('IndexedDB initialization timed out');
            if (delayedCatalogPersistence) return delayedCatalogPersistence.then(() => ({ saved: true, cursor }));
            return { saved: true, cursor };
        },
        async saveCatalogCursor(cursor) { cursorWrites++; savedCursor = cursor; return { saved: true, cursor }; },
        applyCatalogChangesToSnapshot(previous, changes) {
            const cortes = previous.cortes.slice();
            changes.forEach(change => {
                const index = cortes.findIndex(item => String(item.id) === String(change.recordId));
                if (change.operation === 'delete') { if (index >= 0) cortes.splice(index, 1); }
                else if (change.operation === 'upsert') {
                    if (index >= 0) cortes[index] = change.snapshot;
                    else cortes.push(change.snapshot);
                }
            });
            return { resetRequired: false, snapshot: { ...previous, cortes } };
        }
    };
    const getCatalogChanges = options.getCatalogChanges || (async cursor => ({
        status: 'success', currentRevision: 0, nextCursor: cursor, hasMore: false, resetRequired: false, changes: []
    }));
    const setState = patch => {
        patches.push(patch);
        if (Object.prototype.hasOwnProperty.call(patch, 'catalogData') && failCatalogWrites > 0) {
            failCatalogWrites--;
            throw new Error('fallo simulado al actualizar catalogData');
        }
        Object.assign(state, patch);
    };
    const fetchCatalogDataImpl = options.fetchCatalogData || (async () => {
        if (options.networkError) throw options.networkError;
        return { data: options.networkData === undefined ? snapshot() : options.networkData };
    });
    const fetchCatalogData = async requestOptions => { fetchCalls++; return fetchCatalogDataImpl(requestOptions); };
    const factorySource = `
        let catalogLoadController_ = null;
        function hasFreshCatalogSync_() { return false; }
        function markCatalogSync_() {}
        function scheduleCatalogPoll_() {}
        function ensureCatalogSyncChannel_() {}
        function broadcastCatalogSync_() {}
        ${extract('cancelCatalogLoad_')}
        ${extract('requestCatalogFeedPage_')}
        ${extract('getCatalogFeedHead_')}
        ${extract('fetchCatalogDelta_')}
        ${extract('normalizeCatalogData')}
        ${extract('processCatalogData')}
        ${extract('createPysRefreshTask_')}
        ${extract('refreshPysAndSyncCursor_')}
        ${extract('loadInitialData')}
        return { loadInitialData, cancelCatalogLoad_, fetchCatalogDelta_ };
    `;
    const app = new Function(
        'offline', 'fetchCatalogData', 'getCatalogChanges', 'getState', 'setState', 'showGlobalError', 'loadPysData',
        'applyPysCatalogChanges', 'getPysDataCursor', 'setPysDataCursor', 'getPysDataFreshness',
        'performSilentSync', 'console', 'AbortController', 'setTimeout', factorySource
    )(
        offline,
        fetchCatalogData,
        getCatalogChanges,
        () => state,
        setState,
        message => errors.push(message),
        async () => { pysCalls++; },
        () => ({ changed: false, needsRefresh: false }),
        () => options.pysCursor === undefined ? options.cacheCursor : options.pysCursor,
        () => true,
        () => ({ hasCache: options.pysCacheAvailable !== false, updatedAt: options.pysUpdatedAt === undefined ? 1 : options.pysUpdatedAt, stale: false, error: null }),
        async data => { setState({ catalogData: data }); return true; },
        { log() {}, warn: (...args) => warnings.push(args), error() {} },
        AbortController,
        (callback, delay) => {
            if (options.forceLocalCacheTimeout && delay === 3000) { queueMicrotask(callback); return 1; }
            return 0;
        }
    );
    return {
        state, errors, warnings, patches,
        load: app.loadInitialData,
        cancel: app.cancelCatalogLoad_,
        fetchDelta: app.fetchCatalogDelta_,
        get saveCalls() { return saveCalls; },
        get fetchCalls() { return fetchCalls; },
        get savedCursor() { return savedCursor; },
        get cursorWrites() { return cursorWrites; },
        get pysCalls() { return pysCalls; },
        get cacheReads() { return cacheIndex; },
        get offlineFallbackSaved() { return offline.fallbackSaved; },
        releaseCatalogPersistence() { if (releaseCatalogPersistence) releaseCatalogPersistence(); }
    };
}

let passed = 0;
async function test(name, callback) {
    await callback();
    passed++;
    console.log('PASS ' + name);
}

await test('procesa respuesta de red válida y confirma ready después de actualizar estado', async () => {
    const h = createHarness({ networkData: snapshot() });
    await h.load();
    assert.equal(h.state.catalogLoadStatus, 'ready', JSON.stringify({ warnings: h.warnings, errors: h.errors, patches: h.patches }));
    assert.equal(h.state.catalogData.cortes[0].marca, 'Toyota');
    assert.deepEqual(h.state.catalogData.sortedCategories, ['pickup']);
    assert.equal(h.saveCalls, 1);
    assert.equal(h.errors.length, 0);
});
await test('recupera el catálogo desde CacheStorage cuando IndexedDB no responde', async () => {
    const fallback = { snapshot: snapshot([{ id: 'C-FALLBACK', marca: 'Honda', categoria: 'pickup' }]), cursor: 9 };
    const h = createHarness({ cacheReads: [new Error('IndexedDB initialization timed out')], fallbackCache: fallback,
        getCatalogChanges: async cursor => ({ status: 'success', currentRevision: 9, nextCursor: cursor, hasMore: false, resetRequired: false, changes: [] })
    });
    await h.load();
    assert.equal(h.state.catalogLoadStatus, 'ready');
    assert.equal(h.state.catalogData.cortes[0].id, 'C-FALLBACK');
    assert.equal(h.fetchCalls, 0);
});
await test('muestra el snapshot remoto antes de esperar la persistencia local', async () => {
    const h = createHarness({ delayCatalogPersistence: true });
    const pending = h.load();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.state.catalogLoadStatus, 'ready');
    assert.equal(h.state.catalogData.cortes.length > 0, true);
    h.releaseCatalogPersistence();
    await pending;
});
await test('guarda una copia alternativa del snapshot aunque falle IndexedDB', async () => {
    const remote = snapshot([{ id: 'C-FALLBACK-SAVE', marca: 'Mazda', categoria: 'pickup' }]);
    const h = createHarness({ networkData: remote, failCatalogPersistence: true });
    await h.load();
    assert.equal(h.state.catalogData.cortes[0].id, 'C-FALLBACK-SAVE');
    assert.equal(h.state.catalogLoadStatus, 'ready');
    assert.equal(h.offlineFallbackSaved.snapshot.cortes[0].id, 'C-FALLBACK-SAVE');
});
await test('no muestra estado de carga cuando existe una caché local válida', async () => {
    const cached = snapshot([{ id: 'C-CACHE-FIRST', marca: 'Toyota', categoria: 'pickup' }]);
    const h = createHarness({ cacheReads: [cached], cacheCursor: 5,
        getCatalogChanges: async cursor => ({ status: 'success', currentRevision: 5, nextCursor: cursor, hasMore: false, resetRequired: false, changes: [] })
    });
    await h.load();
    assert.equal(h.state.catalogLoadStatus, 'ready');
    assert.equal(h.patches.some(patch => patch.catalogLoadStatus === 'loading'), false);
    assert.equal(h.fetchCalls, 0);
});
await test('mantiene visible el catálogo remoto cuando IndexedDB falla al persistirlo', async () => {
    const valid = snapshot([{ id: 'C-LOCAL-FAIL', marca: 'Honda', categoria: 'pickup' }]);
    const h = createHarness({ networkData: valid, failCatalogPersistence: true });
    const result = await h.load();
    assert.equal(result, true);
    assert.equal(h.state.catalogLoadStatus, 'ready');
    assert.equal(h.state.catalogData.cortes[0].id, 'C-LOCAL-FAIL');
    assert.equal(h.errors.length, 0);
    assert.equal(h.warnings.some(entry => String(entry[0]).includes('no pudo persistirse en IndexedDB')), true);
});
await test('acepta catálogo vacío válido desde red como ready, no como error', async () => {
    const h = createHarness({ networkData: snapshot([]) });
    await h.load();
    assert.equal(h.state.catalogLoadStatus, 'ready');
    assert.deepEqual(h.state.catalogData.cortes, []);
    assert.equal(h.errors.length, 0);
    assert.equal(h.saveCalls, 1);
});
await test('rechaza respuesta parcial y termina en error coherente', async () => {
    const h = createHarness({ networkData: { cortes: [], tutoriales: [], logos: [] }, networkError: null, cacheReads: [null, null] });
    await h.load();
    assert.equal(h.state.catalogLoadStatus, 'error');
    assert.equal(h.state.catalogLoadError.includes('completa'), true);
    assert.deepEqual(h.state.catalogData.logos, []);
    assert.equal(h.errors.length, 1);
    assert.equal(h.saveCalls, 0);
});
await test('rechaza elementos nulos en colecciones aunque el resto del payload sea válido', async () => {
    const h = createHarness({ networkData: snapshot([{ id: 'C-1' }]), cacheReads: [null, null] });
    h.state.catalogData.cortes = [];
    const malformed = { cortes: [{ id: 'C-1' }], tutoriales: [null], relay: [], logos: [] };
    const bad = createHarness({ networkData: malformed, cacheReads: [null, null] });
    await bad.load();
    assert.equal(bad.state.catalogLoadStatus, 'error');
    assert.equal(bad.saveCalls, 0);
});
await test('rechaza una caché corrupta y no la trata como fuente disponible tras fallo de red', async () => {
    const corrupt = { cortes: [{ id: 'C-1' }], tutoriales: [], relay: {}, logos: [] };
    const h = createHarness({ cacheReads: [corrupt, corrupt], networkError: new Error('red caída') });
    await h.load();
    assert.equal(h.state.catalogLoadStatus, 'error');
    assert.equal(h.errors.length, 1);
    assert.equal(h.saveCalls, 0);
});
await test('recupera una caché vacía válida después de fallo inicial de lectura y red', async () => {
    const empty = snapshot([]);
    const h = createHarness({ cacheReads: [new Error('IndexedDB temporalmente inaccesible'), empty], networkError: new Error('offline') });
    await h.load();
    assert.equal(h.state.catalogLoadStatus, 'stale');
    assert.deepEqual(h.state.catalogData.cortes, []);
    assert.equal(h.errors.length, 0);
});
await test('un error de normalización no marca la caché como cargada y termina con error si no hay fuente válida', async () => {
    const bad = { cortes: [{ id: 'C-1', get marca() { throw new Error('normalización fallida'); } }], tutoriales: [], relay: [], logos: [] };
    const h = createHarness({ cacheReads: [bad, bad], networkError: new Error('red caída') });
    await h.load();
    assert.equal(h.state.catalogLoadStatus, 'error');
    assert.equal(h.errors.length, 1);
    assert.equal(h.saveCalls, 0);
});
await test('un fallo al actualizar estado permite recuperar la misma instantánea desde caché', async () => {
    const valid = snapshot([{ id: 'C-2', marca: 'Honda', categoria: 'pickup' }]);
    const h = createHarness({ cacheReads: [valid, valid], networkError: new Error('red caída'), failCatalogWrites: 1 });
    await h.load();
    assert.equal(h.state.catalogLoadStatus, 'stale');
    assert.equal(h.state.catalogData.cortes[0].id, 'C-2');
    assert.equal(h.errors.length, 0);
});
await test('una carga cancelada no aplica una respuesta tardía ni guarda el catálogo', async () => {
    let resolveNetwork, started = false;
    const pending = new Promise(resolve => { resolveNetwork = resolve; });
    const h = createHarness({
        cacheReads: [null],
        fetchCatalogData: () => { started = true; return pending; }
    });
    const load = h.load();
    for (let i = 0; i < 12 && !started; i++) await Promise.resolve();
    assert.equal(started, true);
    h.cancel();
    resolveNetwork({ data: snapshot([{ id: 'LATE-1', marca: 'Mazda' }]) });
    await load;
    assert.equal(h.saveCalls, 0);
    assert.deepEqual(h.state.catalogData.cortes, []);
    assert.equal(h.errors.length, 0);
});
await test('la sincronización silenciosa propaga errores y confirma resultado explícito', async () => {
    const start = uiSource.indexOf('export async function performSilentSync(');
    const end = uiSource.indexOf('\nfunction updateFullState(', start);
    const source = uiSource.slice(start, end);
    assert.match(source, /return true;/);
    assert.match(source, /throw e;/);
    assert.match(uiSource.slice(end), /return true;[\s\S]*?throw e;/);
});


await test('una caché con cursor y feed vacío evita descargar el catálogo completo', async () => {
    const cached = snapshot();
    const h = createHarness({
        cacheReads: [cached], cacheCursor: 5,
        getCatalogChanges: async cursor => ({ status: 'success', currentRevision: 5, nextCursor: cursor, hasMore: false, resetRequired: false, changes: [] })
    });
    await h.load();
    assert.equal(h.fetchCalls, 0);
    assert.equal(h.state.catalogLoadStatus, 'ready');
    assert.equal(h.saveCalls, 0);
});
await test('un delta de Cortes actualiza la caché y persiste el cursor sin snapshot completo', async () => {
    const cached = snapshot();
    const h = createHarness({
        cacheReads: [cached], cacheCursor: 5,
        getCatalogChanges: async cursor => ({
            status: 'success', currentRevision: 6, nextCursor: 6, hasMore: false, resetRequired: false,
            changes: [{ revision: 6, collection: 'cortes', recordId: 'C-1', operation: 'upsert', snapshot: { id: 'C-1', marca: 'Toyota nuevo', categoria: 'pickup' } }]
        })
    });
    await h.load();
    assert.equal(h.fetchCalls, 0);
    assert.equal(h.state.catalogData.cortes[0].marca, 'Toyota nuevo');
    assert.equal(h.savedCursor, 6);
    assert.equal(h.saveCalls, 1);
});
await test('un reset del feed solicita snapshot completo y confirma la revisión recibida', async () => {
    const cached = snapshot();
    const h = createHarness({
        cacheReads: [cached], cacheCursor: 5,
        getCatalogChanges: async () => ({ status: 'success', currentRevision: 7, nextCursor: 7, hasMore: false, resetRequired: true, changes: [] }),
        networkData: snapshot([{ id: 'C-9', marca: 'Nissan', categoria: 'pickup' }])
    });
    await h.load();
    assert.equal(h.fetchCalls, 1);
    assert.equal(h.state.catalogData.cortes[0].id, 'C-9');
    assert.equal(h.savedCursor, 7);
    assert.equal(h.pysCalls, 1);
});
await test('el feed rechaza huecos de revisión y solicita reconciliación completa', async () => {
    const h = createHarness({
        getCatalogChanges: async () => ({
            status: 'success', currentRevision: 7, nextCursor: 7, hasMore: false, resetRequired: false,
            changes: [{ revision: 7, collection: 'cortes', recordId: 'C-7', operation: 'delete' }]
        })
    });
    const result = await h.fetchDelta(5, { ID: 'USER-1', SessionToken: 'session-token' }, null);
    assert.equal(result.resetRequired, true);
    assert.equal(result.cursor, 7);
});
await test('si el feed falla y se usa snapshot completo, el cursor anterior se invalida', async () => {
    const h = createHarness({
        cacheReads: [snapshot()], cacheCursor: 5,
        getCatalogChanges: async () => { throw new Error('feed offline'); },
        networkData: snapshot([{ id: 'C-9', marca: 'Nissan', categoria: 'pickup' }])
    });
    const result = await h.load(true);
    assert.equal(result, true);
    assert.equal(h.fetchCalls, 1);
    assert.equal(h.savedCursor, null);
});


await test('la sincronización silenciosa no cambia el estado de carga ni descarga el snapshot si no hay novedades', async () => {
    const cached = snapshot();
    const h = createHarness({
        cacheReads: [cached], cacheCursor: 5,
        getCatalogChanges: async cursor => ({ status: 'success', currentRevision: 5, nextCursor: cursor, hasMore: false, resetRequired: false, changes: [] })
    });
    const result = await h.load(true, { silent: true, fromPoll: true });
    assert.equal(result, true);
    assert.equal(h.fetchCalls, 0);
    assert.equal(h.state.catalogLoadStatus, 'idle');
    assert.equal(h.patches.some(patch => Object.prototype.hasOwnProperty.call(patch, 'catalogLoadStatus')), false);
});

await test('la reconciliación silenciosa actualiza tarjetas, modales y vistas activas sin reconstruir todo el catálogo', async () => {
    const start = uiSource.indexOf('export async function performSilentSync(');
    const end = uiSource.indexOf('function updateFullState(', start);
    assert.ok(start >= 0 && end > start);
    const sync = uiSource.slice(start, end);
    assert.match(sync, /offline\.compareCatalogSnapshots\(oldCatalogData, newCatalogData\)/);
    assert.match(sync, /updateCardInPlace\(change\.newItem\)/);
    assert.match(sync, /updateOpenModalIfActive\(change\.newItem\)/);
    assert.match(sync, /insertNewVehicleFluently\(change\.item\)/);
    assert.match(sync, /removeVehicleSilently\(change\.id\)/);
    const fullStart = uiSource.indexOf('function updateFullState(');
    const fullEnd = uiSource.indexOf('async function updateCardInPlace(', fullStart);
    const full = uiSource.slice(fullStart, fullEnd);
    assert.match(full, /mostrarTutorialesGrid\(\)/);
    assert.match(full, /mostrarRelayGrid\(\)/);
    assert.match(full, /options\.logosChanged === true/);
    assert.match(authSource, /performSilentSync\(snapshotToApply\)/);
    assert.match(authSource, /broadcastCatalogSync_\(currentUser, requiresFullSnapshot \|\| pysDeltaChanges\.length > 0\)/);
});
await test('la entrada de nuevas tarjetas respeta prefers-reduced-motion', async () => {
    const start = uiSource.indexOf('async function insertNewVehicleFluently(');
    const end = uiSource.indexOf('function createPysCard(', start);
    assert.ok(start >= 0 && end > start);
    const insertion = uiSource.slice(start, end);
    assert.match(insertion, /prefers-reduced-motion: reduce/);
    assert.match(insertion, /if \(!prefersReducedMotion\)/);
    assert.match(insertion, /newCard\.style\.transition = prefersReducedMotion \? 'none'/);
});
await test('una apertura IndexedDB lenta no crea un falso error local ni bloquea el snapshot remoto', async () => {
    const h = createHarness({ pendingIndexedDbRead: true, forceLocalCacheTimeout: true });
    const result = await h.load(true);
    assert.equal(result, true);
    assert.equal(h.fetchCalls, 1);
    assert.equal(h.state.catalogLoadStatus, 'ready');
    assert.equal(h.warnings.some(args => String(args[0] || '').includes('Timeout local')), false);
    assert.equal(authSource.includes('new Error("Timeout local")'), false);
    assert.match(authSource, /source: "timeout", state: null/);
});
console.log('CatalogStartupIntegrity: ' + passed + '/' + passed + ' PASS');

const catalogFeedAuthSource = readFileSync(new URL("../Frontend/auth.js", import.meta.url), "utf8");
assert.match(catalogFeedAuthSource, /transientFeedFailure/);
assert.match(catalogFeedAuthSource, /offline\.isCompleteCatalogSnapshot\(cachedCatalog\) && Number\.isSafeInteger\(cachedCursor\)/);
console.log("CatalogTransientFeedFallback: 2/2 PASS");
