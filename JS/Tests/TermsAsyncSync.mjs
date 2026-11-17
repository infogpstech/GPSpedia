import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    getOrCreateTermsDeviceId,
    getDeviceTermsAcceptance,
    getDeviceTermsSyncStatus,
    saveDeviceTermsAcceptance
} from '../Frontend/termsDeviceAcceptance.js';

const uiSource = readFileSync(new URL('../Frontend/ui.js', import.meta.url), 'utf8');
const start = uiSource.indexOf('const termsAcceptanceSyncInFlight_ = new Map();');
const end = uiSource.indexOf('\nfunction renderTermsGate_(user)', start);
assert.ok(start >= 0 && end > start, 'No se encontró el sincronizador local de términos.');
const syncSource = uiSource.slice(start, end);
const VERSION = '2026-07';
const DEVICE = '11111111111141118111111111111111';
const ACCEPTED_AT = '2026-11-16T12:00:00.000Z';

function createStorage() {
    const values = new Map();
    return {
        getItem: key => values.has(key) ? values.get(key) : null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key)
    };
}
function createHarness(routeAction, initialUser = { ID: 'U-1', SessionToken: 'token-1', Privilegios: 'tecnico' }) {
    const localStorage = createStorage();
    const state = { currentUser: { ...initialUser } };
    localStorage.setItem('gpsepedia_session', JSON.stringify(initialUser));
    const onlineListeners = [];
    const windowRef = {
        crypto: { randomUUID: () => '11111111-1111-4111-8111-111111111111' },
        addEventListener: (name, callback) => { if (name === 'online') onlineListeners.push(callback); }
    };
    const factory = new Function(
        'getDeviceTermsSyncStatus', 'saveDeviceTermsAcceptance', 'getOrCreateTermsDeviceId',
        'routeAction', 'getState', 'setState', 'localStorage', 'console', 'window', 'TERMS_CURRENT_VERSION',
        syncSource + '\nreturn { syncPendingTermsAcceptance_, ensureTermsAcceptanceOnlineRetry_ };'
    );
    const sync = factory(
        getDeviceTermsSyncStatus, saveDeviceTermsAcceptance, getOrCreateTermsDeviceId,
        routeAction, () => state, patch => Object.assign(state, patch), localStorage,
        { warn() {} }, windowRef, VERSION
    );
    return { localStorage, state, onlineListeners, windowRef, ...sync };
}
function markPending(storage, userId = 'U-1', deviceId = DEVICE, version = VERSION) {
    saveDeviceTermsAcceptance(storage, userId, deviceId,
        { version, acceptedAt: ACCEPTED_AT, status: 'accepted' }, { syncStatus: 'pending' });
}
function confirmed() {
    return { status: 'success', accepted: true, alreadyAccepted: true,
        termsAcceptance: { version: VERSION, acceptedAt: '2026-11-16T12:00:05.000Z', status: 'accepted' } };
}
let passed = 0;
async function test(name, callback) {
    await callback();
    passed++;
    console.log('PASS ' + name);
}

await test('la aceptación pendiente se conserva por usuario, dispositivo y versión', async () => {
    const storage = createStorage();
    markPending(storage);
    assert.deepEqual(getDeviceTermsAcceptance(storage, 'U-1', DEVICE, VERSION),
        { version: VERSION, acceptedAt: ACCEPTED_AT, status: 'accepted' });
    assert.equal(getDeviceTermsSyncStatus(storage, 'U-1', DEVICE, VERSION), 'pending');
    assert.equal(getDeviceTermsAcceptance(storage, 'U-2', DEVICE, VERSION), null);
    assert.equal(getDeviceTermsAcceptance(storage, 'U-1', DEVICE, '2027-01'), null);
    assert.equal(getDeviceTermsSyncStatus(storage, 'U-2', DEVICE, VERSION), 'synced');
});

await test('un fallo de red conserva el consentimiento local y el reintento lo sincroniza', async () => {
    let calls = 0;
    const h = createHarness(async () => {
        calls++;
        if (calls === 1) throw new TypeError('offline');
        return confirmed();
    });
    markPending(h.localStorage);
    assert.equal(await h.syncPendingTermsAcceptance_({ ...h.state.currentUser }, DEVICE), false);
    assert.equal(getDeviceTermsSyncStatus(h.localStorage, 'U-1', DEVICE, VERSION), 'pending');
    assert.equal(await h.syncPendingTermsAcceptance_({ ...h.state.currentUser }, DEVICE), true);
    assert.equal(calls, 2);
    assert.equal(getDeviceTermsSyncStatus(h.localStorage, 'U-1', DEVICE, VERSION), 'synced');
    assert.equal(h.state.currentUser.TermsAcceptance.acceptedAt, confirmed().termsAcceptance.acceptedAt);
});

await test('solicitudes simultáneas comparten una sola operación AUTH', async () => {
    let calls = 0, release;
    const pendingResponse = new Promise(resolve => { release = resolve; });
    const h = createHarness(() => { calls++; return pendingResponse; });
    markPending(h.localStorage);
    const user = { ...h.state.currentUser };
    const first = h.syncPendingTermsAcceptance_(user, DEVICE);
    const second = h.syncPendingTermsAcceptance_(user, DEVICE);
    assert.equal(first, second);
    assert.equal(calls, 1);
    release(confirmed());
    assert.equal(await first, true);
    assert.equal(await second, true);
    assert.equal(getDeviceTermsSyncStatus(h.localStorage, 'U-1', DEVICE, VERSION), 'synced');
});

await test('una respuesta tardía de una sesión anterior no confirma ni altera la sesión nueva', async () => {
    let release, calls = 0;
    const pendingResponse = new Promise(resolve => { release = resolve; });
    const h = createHarness(() => { calls++; return calls === 1 ? pendingResponse : Promise.resolve(confirmed()); });
    markPending(h.localStorage);
    const oldUser = { ...h.state.currentUser };
    const oldRequest = h.syncPendingTermsAcceptance_(oldUser, DEVICE);
    await Promise.resolve();
    const newUser = { ID: 'U-1', SessionToken: 'token-2', Privilegios: 'tecnico' };
    h.localStorage.setItem('gpsepedia_session', JSON.stringify(newUser));
    h.state.currentUser = { ...newUser };
    release(confirmed());
    assert.equal(await oldRequest, false);
    assert.equal(getDeviceTermsSyncStatus(h.localStorage, 'U-1', DEVICE, VERSION), 'pending');
    assert.equal(h.state.currentUser.SessionToken, 'token-2');
    assert.equal(await h.syncPendingTermsAcceptance_(newUser, DEVICE), true);
    assert.equal(getDeviceTermsSyncStatus(h.localStorage, 'U-1', DEVICE, VERSION), 'synced');
});

await test('la reconexión reintenta silenciosamente y registra un solo listener online', async () => {
    let calls = 0;
    const h = createHarness(async () => { calls++; return confirmed(); });
    markPending(h.localStorage);
    h.ensureTermsAcceptanceOnlineRetry_();
    h.ensureTermsAcceptanceOnlineRetry_();
    assert.equal(h.onlineListeners.length, 1);
    h.onlineListeners[0]();
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(calls, 1);
    assert.equal(getDeviceTermsSyncStatus(h.localStorage, 'U-1', DEVICE, VERSION), 'synced');
});

console.log('TermsAsyncSync: ' + passed + '/' + passed + ' PASS');
