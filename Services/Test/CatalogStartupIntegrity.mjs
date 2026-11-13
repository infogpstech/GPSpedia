import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isCompleteCatalogSnapshot } from '../../offline.js';

const authSource = readFileSync(new URL('../../auth.js', import.meta.url), 'utf8');
const uiSource = readFileSync(new URL('../../ui.js', import.meta.url), 'utf8');
function extract(name) {
    let start = authSource.indexOf('function ' + name + '(');
    if (start < 0) throw new Error('No se encontró ' + name);
    if (authSource.slice(start - 6, start) === 'async ') start -= 6;
    const candidates = [
        authSource.indexOf('\nfunction ', start + 12),
        authSource.indexOf('\nexport function ', start + 12),
        authSource.indexOf('\nexport async function ', start + 12)
    ].filter(index => index >= 0);
    const end = candidates.length ? Math.min(...candidates) : authSource.length;
    return authSource.slice(start, end);
}
function snapshot(cortes = [{ id: 'C-1', marca: 'toyota', modelo: 'hilux', categoria: 'pickup' }]) {
    return { cortes, tutoriales: [], relay: [], logos: [] };
}
function createHarness(options = {}) {
    const state = {
        catalogLoadStatus: 'idle',
        catalogLoadError: null,
        catalogData: { cortes: [], tutoriales: [], relay: [], logos: [], sortedCategories: [] }
    };
    const errors = [], warnings = [], patches = [];
    let cacheIndex = 0, saveCalls = 0, pysCalls = 0;
    let failCatalogWrites = Number(options.failCatalogWrites || 0);
    const cacheReads = options.cacheReads || [null];
    const offline = {
        isCompleteCatalogSnapshot,
        async getCatalog() {
            const value = cacheReads[Math.min(cacheIndex++, cacheReads.length - 1)];
            if (value instanceof Error) throw value;
            return value === undefined ? null : value;
        },
        async saveCatalog(value) { saveCalls++; return value; }
    };
    const setState = patch => {
        patches.push(patch);
        if (Object.prototype.hasOwnProperty.call(patch, 'catalogData') && failCatalogWrites > 0) {
            failCatalogWrites--;
            throw new Error('fallo simulado al actualizar catalogData');
        }
        Object.assign(state, patch);
    };
    const fetchCatalogData = options.fetchCatalogData || (async () => {
        if (options.networkError) throw options.networkError;
        return { data: options.networkData === undefined ? snapshot() : options.networkData };
    });
    const factorySource = `
        let catalogLoadController_ = null;
        ${extract('cancelCatalogLoad_')}
        ${extract('normalizeCatalogData')}
        ${extract('processCatalogData')}
        ${extract('loadInitialData')}
        return { loadInitialData, cancelCatalogLoad_ };
    `;
    const app = new Function(
        'offline', 'fetchCatalogData', 'setState', 'showGlobalError', 'loadPysData',
        'console', 'AbortController', 'setTimeout', factorySource
    )(
        offline,
        fetchCatalogData,
        setState,
        message => errors.push(message),
        async () => { pysCalls++; },
        { log() {}, warn: (...args) => warnings.push(args), error() {} },
        AbortController,
        () => 0
    );
    return {
        state, errors, warnings, patches,
        load: app.loadInitialData,
        cancel: app.cancelCatalogLoad_,
        get saveCalls() { return saveCalls; },
        get pysCalls() { return pysCalls; },
        get cacheReads() { return cacheIndex; }
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
    assert.equal(h.state.catalogLoadStatus, 'ready');
    assert.equal(h.state.catalogData.cortes[0].marca, 'Toyota');
    assert.deepEqual(h.state.catalogData.sortedCategories, ['pickup']);
    assert.equal(h.saveCalls, 1);
    assert.equal(h.errors.length, 0);
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
    await Promise.resolve();
    await Promise.resolve();
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

console.log('CatalogStartupIntegrity: ' + passed + '/' + passed + ' PASS');
