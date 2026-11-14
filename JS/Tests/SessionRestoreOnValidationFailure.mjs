import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const client = readFileSync(resolve(root, 'JS/Frontend/auth.js'), 'utf8');
const api = readFileSync(resolve(root, 'JS/Frontend/api-config.js'), 'utf8');
const service = readFileSync(resolve(root, 'Services/Auth.js'), 'utf8');

function extract(source, start, end) {
    const i = source.indexOf(start);
    assert.notEqual(i, -1, 'No se encontró: ' + start);
    const j = source.indexOf(end, i + start.length);
    assert.ok(j > i, 'No se encontró el cierre: ' + end);
    return source.slice(i, j).trim().replace(/^export /, '');
}

function buildCheckSession(validation, options = {}) {
    const user = {
        ID: 'U-TEST', Nombre_Usuario: 'tester', Privilegios: 'Tecnico',
        SessionToken: 'token-test', SessionCreatedAt: '2026-11-01T00:00:00.000Z',
        SessionLastActivityAt: '2026-11-13T00:00:00.000Z',
        TermsAcceptance: { version: '2026-07', acceptedAt: '2026-07-18T12:00:00.000Z', status: 'accepted' }
    };
    let stored = options.noSession ? null : user;
    const calls = { restored: [], loggedOut: [], loginScreen: [], warnings: [], loaded: 0, removed: 0, validations: 0 };
    const localStorage = {
        getItem(key) {
            if (key === 'gpsepedia_session') return stored ? JSON.stringify(stored) : null;
            return null;
        },
        removeItem(key) { if (key === 'gpsepedia_session') { stored = null; calls.removed++; } }
    };
    const sameSession = (a, b) => Boolean(a && b && String(a.ID || a.id) === String(b.ID || b.id) && a.SessionToken === b.SessionToken);
    const helpers = extract(client, 'function restoreSessionAfterValidationUnavailable_(', '\nexport async function checkSession()');
    const check = extract(client, 'export async function checkSession()', '\nexport async function login(');
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const factory = new AsyncFunction(
        'SESSION_KEY','localStorage','setState','showLoginScreen','readStoredSession','sameSession',
        'getLocalSessionExpiry','isCurrentSession','window','validateSessionCoordinated',
        'persistSessionValidation','handleLoginSuccess','loadInitialData','showGlobalError',
        'logout','console', helpers + '\n' + check + '\nreturn checkSession;'
    );
    const fn = factory(
        'gpsepedia_session', localStorage, () => {},
        message => calls.loginScreen.push(message),
        () => stored, sameSession,
        () => options.expired ? 'absolute_expiration' : null,
        candidate => sameSession(stored, candidate),
        { navigator: { onLine: options.offline !== true } },
        async () => { calls.validations++; if (validation instanceof Error) throw validation; return validation; },
        (candidate, result) => ({ ...candidate, SessionValidatedAt: Date.now() }),
        (candidate, persist) => calls.restored.push({ candidate, persist }),
        async () => { calls.loaded++; },
        message => calls.warnings.push(message),
        (message, candidate) => calls.loggedOut.push({ message, candidate }),
        { warn() {}, error() {} }
    );
    return { run: fn, calls, user, getStored: () => stored };
}

let passed = 0;
async function test(name, fn) {
    await fn();
    passed++;
    console.log('PASS ' + name);
}

await test('un timeout de AUTH conserva y restaura la sesión local', async () => {
    const t = buildCheckSession({ timeout: true });
    await t.run();
    assert.equal(t.calls.restored.length, 1);
    assert.equal(t.calls.loggedOut.length, 0);
    assert.equal(t.calls.loaded, 1);
    assert.ok(t.getStored());
    assert.match(t.calls.warnings[0], /se conservó la sesión local/i);
});

await test('un resultado de verificación no disponible no se interpreta como revocación', async () => {
    const t = buildCheckSession({ valid: null, unavailable: true });
    await t.run();
    assert.equal(t.calls.restored.length, 1);
    assert.equal(t.calls.loggedOut.length, 0);
    assert.ok(t.getStored());
});

await test('un fallo de red conserva la sesión y permite reintentar después', async () => {
    const t = buildCheckSession(new Error('NETWORK_ERROR'));
    await t.run();
    assert.equal(t.calls.restored.length, 1);
    assert.equal(t.calls.loggedOut.length, 0);
    assert.equal(t.calls.removed, 0);
});

await test('sin conexión restaura la sesión local sin llamar a AUTH', async () => {
    const t = buildCheckSession(new Error('No debe consultar AUTH'), { offline: true });
    await t.run();
    assert.equal(t.calls.validations, 0);
    assert.equal(t.calls.restored.length, 1);
    assert.equal(t.calls.loggedOut.length, 0);
});

await test('una revocación confirmada por AUTH sí cierra la sesión', async () => {
    const t = buildCheckSession({ valid: false, reason: 'missing_session' });
    await t.run();
    assert.equal(t.calls.loggedOut.length, 1);
    assert.equal(t.calls.restored.length, 0);
});

await test('una expiración local confirmada conserva el cierre de sesión', async () => {
    const t = buildCheckSession({ valid: true }, { expired: true });
    await t.run();
    assert.equal(t.calls.loggedOut.length, 1);
    assert.equal(t.calls.restored.length, 0);
});

await test('AUTH devuelve no disponible ante excepción interna, no sesión revocada', () => {
    const handler = extract(service, 'function handleValidateSession(payload)', '\nfunction handleTouchSession(payload)');
    const fn = new Function('validateAndTouchSession_', 'logToSheet', handler + '\nreturn handleValidateSession;')(
        () => { throw new Error('Spreadsheet temporalmente no disponible'); },
        () => {}
    );
    const result = fn({ userId: 'U-TEST', sessionToken: 'token-test' });
    assert.equal(result.valid, null);
    assert.equal(result.unavailable, true);
    assert.equal(fn({ userId: 'U-TEST', sessionToken: 'token-test' }).valid, null);
});

await test('una respuesta legacy valid:false con error se normaliza como indisponibilidad', async () => {
    const fnSource = extract(client, 'async function validateSessionCoordinated(user, force = false)', '\\nfunction loadUserLocalActivity');
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const factory = new AsyncFunction(
        'isCurrentSession','getRecentValidation','apiValidateSession','navigator','AbortController',
        'VALIDATION_TIMEOUT_MS','VALIDATION_LOCK_NAME','persistSessionValidation','isSessionProfileForUser_',
        fnSource + '\\nreturn validateSessionCoordinated;'
    );
    const validate = factory(
        () => true, () => false,
        async () => ({ valid: false, error: 'Error temporal de Google Sheets' }),
        { locks: null }, AbortController, 8000, 'test-lock', () => {}, () => true
    );
    const result = await validate({ ID: 'U-TEST', SessionToken: 'token-test' }, true);
    assert.equal(result.valid, null);
    assert.equal(result.unavailable, true);
});

await test('una respuesta valid:false sin error conserva el significado de revocación', async () => {
    const fnSource = extract(client, 'async function validateSessionCoordinated(user, force = false)', '\\nfunction loadUserLocalActivity');
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const factory = new AsyncFunction(
        'isCurrentSession','getRecentValidation','apiValidateSession','navigator','AbortController',
        'VALIDATION_TIMEOUT_MS','VALIDATION_LOCK_NAME','persistSessionValidation','isSessionProfileForUser_',
        fnSource + '\\nreturn validateSessionCoordinated;'
    );
    const validate = factory(
        () => true, () => false,
        async () => ({ valid: false, reason: 'missing_session' }),
        { locks: null }, AbortController, 8000, 'test-lock', () => {}, () => true
    );
    const result = await validate({ ID: 'U-TEST', SessionToken: 'token-test' }, true);
    assert.equal(result.valid, false);
    assert.equal(result.reason, 'missing_session');
});

await test('AUTH mantiene false únicamente para identidad o token ausentes/revocados', () => {
    const handler = extract(service, 'function handleValidateSession(payload)', '\nfunction handleTouchSession(payload)');
    const fn = new Function('validateAndTouchSession_', 'logToSheet', handler + '\nreturn handleValidateSession;')(
        () => ({ valid: false, reason: 'missing_session' }), () => {}
    );
    assert.equal(fn({ userId: 'U-TEST', sessionToken: 'token-test' }).valid, false);
    assert.equal(fn({ userId: 'U-TEST' }).valid, false);
});

await test('AUTH trata hojas faltantes y revocación pendiente como indisponibilidad temporal', () => {
    assert.match(service, /valid: null, unavailable: true, reason: 'missing_sheet'/);
    assert.match(service, /valid: null, unavailable: true, reason: 'role_revocation_pending'/);
});

await test('las operaciones protegidas distinguen indisponibilidad de sesión inválida', () => {
    assert.match(api, /result&&result\.valid===false&&!result\.error&&!result\.unavailable/);
    assert.match(api, /SESSION_VALIDATION_UNAVAILABLE/);
});

await test('la validación reciente puede reutilizarse al restaurar una actualización rápida', () => {
    const check = extract(client, 'export async function checkSession()', '\nexport async function login(');
    assert.match(check, /validateSessionCoordinated\(user, false\)/);
});

console.log('SessionRestoreOnValidationFailure: ' + passed + '/13 PASS');
