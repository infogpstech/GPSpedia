import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { setState, waitForCatalogReadiness } from '../Frontend/state.js';
import { runCatalogRequestWithRetry } from '../Frontend/catalogRequest.js';
import { isCompleteCatalogSnapshot } from '../Frontend/offline.js';

const serviceWorkerSource = fs.readFileSync(new URL('../../service-worker.js', import.meta.url), 'utf8');
const mainSource = fs.readFileSync(new URL('../Frontend/main.js', import.meta.url), 'utf8');
let passed = 0;

async function run(name, test) {
    await test();
    passed += 1;
    console.log('PASS: ' + name);
}

function createWorkerHarness(options = {}) {
    const listeners = {};
    const cacheData = new Map();
    const logs = [];
    let skipWaitingCalls = 0;
    let claimCalls = 0;
    const cacheFor = name => {
        if (!cacheData.has(name)) cacheData.set(name, new Map());
        const entries = cacheData.get(name);
        return {
            async addAll(assets) {
                if (options.addAllError) throw options.addAllError;
                assets.forEach(asset => entries.set(asset, { cachedAsset: asset }));
            },
            async add(asset) {
                if (options.optionalError) throw options.optionalError;
                entries.set(asset, { cachedAsset: asset });
            },
            async put(request, response) {
                if (options.putError) throw options.putError;
                entries.set(request.url || request, response);
            }
        };
    };
    const context = {
        self: {
            addEventListener: (name, callback) => { listeners[name] = callback; },
            skipWaiting: async () => { skipWaitingCalls += 1; },
            clients: { claim: async () => { claimCalls += 1; } }
        },
        caches: {
            open: async name => cacheFor(name),
            keys: async () => [...cacheData.keys()],
            delete: async name => cacheData.delete(name),
            match: async request => {
                const key = request && request.url ? request.url : request;
                for (const entries of cacheData.values()) {
                    if (entries.has(key)) return entries.get(key);
                }
                return null;
            }
        },
        fetch: async request => {
            if (options.networkError) throw options.networkError;
            return { status: 200, clone: () => ({ cloned: true }), url: request.url };
        },
        console: {
            log() {},
            warn: (...args) => logs.push(['warn', ...args]),
            error: (...args) => logs.push(['error', ...args])
        },
        Promise,
        Boolean
    };
    vm.runInNewContext(serviceWorkerSource, context);
    return {
        listeners,
        cacheData,
        logs,
        get skipWaitingCalls() { return skipWaitingCalls; },
        get claimCalls() { return claimCalls; }
    };
}

function makeEvent(request = { method: 'GET', mode: 'cors', url: '/main.js' }) {
    return {
        request,
        waits: [],
        response: null,
        waitUntil(promise) { this.waits.push(Promise.resolve(promise)); },
        respondWith(promise) { this.response = Promise.resolve(promise); }
    };
}

function snapshot(size) {
    return {
        cortes: Array.from({ length: size }, (_, index) => ({ id: 'CUT-' + index, marca: 'Marca ' + (index % 30), modelo: 'Modelo ' + index })),
        tutoriales: [],
        relay: [],
        logos: []
    };
}

await run('primera instalación precarga el App Shell y el grafo de módulos', async () => {
    const worker = createWorkerHarness();
    const event = makeEvent();
    worker.listeners.install(event);
    await Promise.all(event.waits);
    const assets = worker.cacheData.get('gpsepedia-cache-v21');
    assert.ok(assets, 'debe crear el caché de la versión actual');
    for (const asset of ['./index.html', './JS/Frontend/main.js', './JS/Frontend/auth.js', './JS/Frontend/offline.js', './JS/Frontend/VinDifferentialEngine.js', './JS/Frontend/catalogRequest.js', './JS/Frontend/share-utils.js', './Images/Logo_TemaOscuro.png', './Images/tracklink_logo.png']) {
        assert.ok(assets.has(asset), 'falta ' + asset);
    }
    assert.equal(worker.skipWaitingCalls, 1);
});

await run('actualización activa v20, elimina solo el caché anterior de GPSpedia y conserva otros', async () => {
    const worker = createWorkerHarness();
    worker.cacheData.set('gpsepedia-cache-v19', new Map([['./index.html', { old: true }]]));
    worker.cacheData.set('another-app-cache', new Map([['/other', { preserved: true }]]));
    const installEvent = makeEvent();
    worker.listeners.install(installEvent);
    await Promise.all(installEvent.waits);
    const activateEvent = makeEvent();
    worker.listeners.activate(activateEvent);
    await Promise.all(activateEvent.waits);
    assert.equal(worker.cacheData.has('gpsepedia-cache-v19'), false);
    assert.equal(worker.cacheData.has('another-app-cache'), true);
    assert.equal(worker.cacheData.has('gpsepedia-cache-v21'), true);
    assert.equal(worker.claimCalls, 1);
});

await run('fallo de precarga esencial no activa una instalación incompleta ni elimina v19', async () => {
    const quota = Object.assign(new Error('Storage quota exceeded'), { name: 'QuotaExceededError' });
    const worker = createWorkerHarness({ addAllError: quota });
    worker.cacheData.set('gpsepedia-cache-v19', new Map([['./index.html', { old: true }]]));
    const event = makeEvent();
    worker.listeners.install(event);
    await assert.rejects(Promise.all(event.waits), /Storage quota exceeded/);
    assert.equal(worker.cacheData.has('gpsepedia-cache-v19'), true);
    assert.equal(worker.skipWaitingCalls, 0);
});

await run('arranque offline desde un deep link recupera index.html precargado', async () => {
    const worker = createWorkerHarness({ networkError: new TypeError('offline') });
    const installEvent = makeEvent();
    worker.listeners.install(installEvent);
    await Promise.all(installEvent.waits);
    const event = makeEvent({ method: 'GET', mode: 'navigate', url: 'https://gpsepedia.test/buscar?q=Hilux' });
    worker.listeners.fetch(event);
    const response = await event.response;
    await Promise.all(event.waits);
    assert.equal(response.cachedAsset, './index.html');
});

await run('deep link sin sesión espera el login y no intenta filtrar con catálogo idle', async () => {
    assert.ok(mainSource.includes('if (waitStarted || !currentState.currentUser) return;'));
    assert.ok(mainSource.includes('if (!latestState.currentUser || latestState.catalogLoadStatus === \'idle\')'));
    assert.ok(mainSource.includes('state.waitForCatalogReadiness(27000)'));
    assert.ok(mainSource.includes("result.status === 'ready' || result.status === 'stale'"));
    setState({ currentUser: null, catalogLoadStatus: 'idle', catalogData: { cortes: [] } });
    const result = await waitForCatalogReadiness(5);
    assert.equal(result.status, 'timeout');
});

await run('deep link sin catálogo recibe el estado terminal de error', async () => {
    setState({ currentUser: { ID: 'USR-TEST' }, catalogLoadStatus: 'error', catalogLoadError: 'API no disponible.', catalogData: { cortes: [] } });
    const result = await waitForCatalogReadiness(50);
    assert.equal(result.status, 'error');
    assert.equal(result.error, 'API no disponible.');
});

await run('catálogo guardado permite continuar con estado stale durante una caída de API', async () => {
    setState({ currentUser: { ID: 'USR-TEST' }, catalogLoadStatus: 'stale', catalogData: { cortes: [{ id: 'CUT-1' }] } });
    const result = await waitForCatalogReadiness(50);
    assert.equal(result.status, 'stale');
    assert.equal(result.catalogData.cortes[0].id, 'CUT-1');
});

await run('API lenta agota los timeouts y respeta el máximo de tres intentos', async () => {
    let attempts = 0;
    let aborts = 0;
    await assert.rejects(
        runCatalogRequestWithRetry(signal => {
            attempts += 1;
            return new Promise((resolve, reject) => {
                signal.addEventListener('abort', () => {
                    aborts += 1;
                    const error = new Error('aborted');
                    error.name = 'AbortError';
                    reject(error);
                }, { once: true });
            });
        }, { timeoutMs: 5, retries: 2, baseDelayMs: 0 }),
        error => error.name === 'CatalogRequestTimeoutError'
    );
    assert.equal(attempts, 3);
    assert.equal(aborts, 3);
});

await run('API caída agota reintentos transitorios sin dejar la espera abierta', async () => {
    let attempts = 0;
    await assert.rejects(
        runCatalogRequestWithRetry(async () => {
            attempts += 1;
            throw new TypeError('Failed to fetch');
        }, { timeoutMs: 50, retries: 2, baseDelayMs: 0 }),
        /Failed to fetch/
    );
    assert.equal(attempts, 3);
});

await run('snapshots representativos de 0 a 10,000 Cortes conservan el contrato completo', async () => {
    for (const size of [0, 250, 2500, 10000]) {
        assert.equal(isCompleteCatalogSnapshot(snapshot(size)), true, 'tamaño ' + size);
    }
    const duplicate = snapshot(10000);
    duplicate.cortes[9999].id = duplicate.cortes[0].id;
    assert.equal(isCompleteCatalogSnapshot(duplicate), false);
});

console.log('PWAStartupScenarios: ' + passed + '/10 PASS');
