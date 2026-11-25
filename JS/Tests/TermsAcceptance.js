import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
const authSource = readFileSync(new URL('../Services/Auth.js', import.meta.url), 'utf8');
const authTestSource = readFileSync(new URL('./Auth.js', import.meta.url), 'utf8');
const apiConfigSource = readFileSync(new URL('../Frontend/api-config.js', import.meta.url), 'utf8');
const uiSource = readFileSync(new URL('../Frontend/ui.js', import.meta.url), 'utf8');
const frontendAuthSource = readFileSync(new URL('../Frontend/auth.js', import.meta.url), 'utf8');
const htmlSource = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const termsDeviceSource = readFileSync(new URL('../Frontend/termsDeviceAcceptance.js', import.meta.url), 'utf8');
const sandbox = { SpreadsheetApp: { flush() {} }, console, Date, JSON, Object, String, Number, Array };
runInNewContext(authSource + '\n;globalThis.__termsHelpers = { parseTermsAcceptance_, parseDeviceTermsAcceptanceStore_, ensureTermsAcceptanceColumn_, ensureSessionTermsAcceptanceColumn_ };', sandbox);
const helpers = sandbox.__termsHelpers;
let passed = 0;
function test(name, operation) {
    try { operation(); passed++; console.log('PASS ' + name); }
    catch (error) { console.error('FAIL ' + name + ': ' + error.message); throw error; }
}
function plain(value) { return JSON.parse(JSON.stringify(value)); }
function fakeUsersSheet(header = '', value = '') {
    let storedHeader = header, storedValue = value;
    return {
        getLastRow() { return storedValue ? 2 : 1; },
        getRange(row, column) {
            return {
                getValue() { return row === 1 && column === 9 ? storedHeader : (row === 2 && column === 9 ? storedValue : ''); },
                setValue(next) { if (row === 1 && column === 9) storedHeader = next; else if (row === 2 && column === 9) storedValue = next; },
                getValues() { return [[storedValue]]; }
            };
        }
    };
}

function fakeActiveSessionsSheet(header = '', value = '') {
    let storedHeader = header, storedValue = value;
    return {
        getLastRow() { return storedValue ? 2 : 1; },
        getRange(row, column) {
            return {
                getValue() { return row === 1 && column === 7 ? storedHeader : (row === 2 && column === 7 ? storedValue : ''); },
                setValue(next) { if (row === 1 && column === 7) storedHeader = next; else if (row === 2 && column === 7) storedValue = next; },
                getValues() { return [[storedValue]]; }
            };
        }
    };
}
test('celda vacía requiere aceptación', () => assert.deepEqual(plain(helpers.parseTermsAcceptance_('')), { version: '', acceptedAt: '', status: 'pending' }));
test('aceptación vigente y timestamp válido se reconoce', () => {
    const value = JSON.stringify({ version: '2026-07', acceptedAt: '2026-07-18T12:00:00.000Z', status: 'accepted' });
    assert.deepEqual(plain(helpers.parseTermsAcceptance_(value)), { version: '2026-07', acceptedAt: '2026-07-18T12:00:00.000Z', status: 'accepted' });
});
test('una versión anterior se conserva como evidencia, pero no es la vigente', () => {
    const parsed = helpers.parseTermsAcceptance_(JSON.stringify({ version: '2026-06', acceptedAt: '2026-06-18T12:00:00.000Z', status: 'accepted' }));
    assert.equal(parsed.status, 'accepted'); assert.notEqual(parsed.version, '2026-07');
});
test('JSON dañado se considera inválido', () => assert.equal(helpers.parseTermsAcceptance_('{malformed').status, 'invalid'));
test('timestamp ausente o inválido se rechaza', () => assert.equal(helpers.parseTermsAcceptance_(JSON.stringify({ version: '2026-07', acceptedAt: 'bad', status: 'accepted' })).status, 'invalid'));
test('registro histórico anterior se conserva sin aceptarse automáticamente en dispositivos nuevos', () => {
    const legacy = JSON.stringify({ version: '2026-07', acceptedAt: '2026-07-18T12:00:00.000Z', status: 'accepted' });
    const store = helpers.parseDeviceTermsAcceptanceStore_(legacy);
    assert.equal(store.schemaVersion, 1);
    assert.deepEqual(plain(store.devices), {});
    assert.deepEqual(plain(store.legacyAcceptance), plain(JSON.parse(legacy)));
});
test('mapa de aceptación reconoce registros independientes por dispositivo', () => {
    const deviceA = '11111111111141118111111111111111';
    const deviceB = '22222222222242228222222222222222';
    const recordA = { version: '2026-07', acceptedAt: '2026-07-18T12:00:00.000Z', status: 'accepted' };
    const recordB = { version: '2026-07', acceptedAt: '2026-07-19T12:00:00.000Z', status: 'accepted' };
    const store = helpers.parseDeviceTermsAcceptanceStore_(JSON.stringify({ schemaVersion: 1, devices: { [deviceA]: recordA, [deviceB]: recordB }, legacyAcceptance: null }));
    assert.deepEqual(plain(store.devices[deviceA]), recordA);
    assert.deepEqual(plain(store.devices[deviceB]), recordB);
    assert.throws(() => helpers.parseDeviceTermsAcceptanceStore_(JSON.stringify({ schemaVersion: 1, devices: { invalid: recordA } })), /identificador de dispositivo inválido/i);
});
test('estado distinto de accepted se rechaza', () => assert.equal(helpers.parseTermsAcceptance_(JSON.stringify({ version: '2026-07', acceptedAt: '2026-07-18T12:00:00.000Z', status: 'pending' })).status, 'invalid'));
test('crea el encabezado I solo cuando la celda está libre', () => assert.equal(helpers.ensureTermsAcceptanceColumn_(fakeUsersSheet()), 9));
test('no reemplaza un encabezado diferente', () => assert.throws(() => helpers.ensureTermsAcceptanceColumn_(fakeUsersSheet('OtroCampo')), /otro encabezado/i));
test('no adopta datos preexistentes bajo encabezado vacío', () => assert.throws(() => helpers.ensureTermsAcceptanceColumn_(fakeUsersSheet('', 'dato existente')), /datos sin encabezado/i));
test('crea SessionTermsAcceptance en G sin tocar el esquema de ActiveSessions', () => assert.equal(helpers.ensureSessionTermsAcceptanceColumn_(fakeActiveSessionsSheet()), 7));
test('no reemplaza encabezados ni datos existentes en G', () => {
    assert.throws(() => helpers.ensureSessionTermsAcceptanceColumn_(fakeActiveSessionsSheet('OtroCampo')), /otro encabezado/i);
    assert.throws(() => helpers.ensureSessionTermsAcceptanceColumn_(fakeActiveSessionsSheet('', 'dato existente')), /datos sin encabezado/i);
});
test('AUTH y su espejo guardan aceptación por dispositivo y validan la sesión en solo lectura', () => {
    assert.match(authSource, /case 'acceptTerms'/); assert.match(authTestSource, /case 'acceptTerms'/);
    assert.match(authSource, /TermsAcceptance: 9/); assert.match(authTestSource, /TermsAcceptance: 9/);
    assert.match(authSource, /SessionTermsAcceptance: 7/); assert.match(authTestSource, /SessionTermsAcceptance: 7/);
    assert.match(authSource, /function parseDeviceTermsAcceptanceStore_/);
    assert.match(authTestSource, /function parseDeviceTermsAcceptanceStore_/);
    const start = authSource.indexOf('function handleAcceptTerms(payload) {');
    const end = authSource.indexOf('\nfunction handleMigrateLegacyPasswords(payload) {', start);
    const handler = authSource.slice(start, end);
    assert.match(handler, /payload && payload\.deviceId/);
    assert.match(handler, /acceptanceStore\.devices\[deviceId\]/);
    assert.doesNotMatch(handler, /sessionCell\.setValue|ensureSessionTermsAcceptanceColumn_/);
    assert.match(handler, /requireSharedAuthActor_\(/);
    assert.doesNotMatch(handler, /findSessionRowsByTokenUnderLock_|getSessionExpirationStatus_|hasPendingRoleRevocation_/);
    const dispatchStart = authSource.indexOf('function doPostInternal_(e) {');
    const dispatchEnd = authSource.indexOf('\nfunction ', dispatchStart + 10);
    const dispatcher = authSource.slice(dispatchStart, dispatchEnd);
    assert.doesNotMatch(dispatcher, /touchProtectedAuthRequestSession_|validateAndTouchSession_|validateSessionReadOnly_/);
    assert.match(termsDeviceSource, /TERMS_DEVICE_ID_STORAGE_KEY/);
    const authMutationActions = authSource.match(/function isSharedMutationAction_\(action\) \{([\s\S]*?)\n\}/)[1];
    const authMirrorMutationActions = authTestSource.match(/function isSharedMutationAction_\(action\) \{([\s\S]*?)\n\}/)[1];
    assert.doesNotMatch(authMutationActions, /validateSession|touchSession|acceptTerms/);
    assert.doesNotMatch(authMirrorMutationActions, /validateSession|touchSession|acceptTerms/);
    const authRouter = authSource.slice(authSource.indexOf('function doPost(e) {'), authSource.indexOf('function doPostInternal_(e)'));
    assert.match(authRouter, /\["acceptTerms", "changePassword", "resetUserPassword", "resetUserSessions", "updateUser", "migrateLegacyPasswords", "getUsers", "createUser", "updateProfile", "benchmarkPasswordKdf"\]\.includes\(action\)[\s\S]*?getCachedSharedSessionActor_/);
    assert.doesNotMatch(authRouter, /withSharedMutationLease_\("AUTH",\s*"acceptTerms"/);
    assert.match(authSource, /cacheSharedSessionActor_\(normalizedId, currentSessionToken/);
    assert.match(authTestSource, /cacheSharedSessionActor_\(normalizedId, currentSessionToken/);
});
test('AUTH conserva la columna privada de aceptación fuera de la escritura de perfil', () => {
    assert.match(authSource, /TermsAcceptance: 9/);
    assert.match(authTestSource, /TermsAcceptance: 9/);
    const start = authSource.indexOf('function normalizeUserProfileUpdates_(');
    const end = authSource.indexOf('\nfunction ', start + 10);
    assert.ok(start >= 0 && end > start);
    assert.match(authSource.slice(start, end), /Nombre_Completo/);
    assert.doesNotMatch(authSource.slice(start, end), /TermsAcceptance|Password|Privilegios/);
});
test('API dirige acceptTerms a AUTH sin enviar una llamada touchSession adicional', () => {
    assert.match(apiConfigSource, /'acceptTerms': 'AUTH'/);
    assert.match(apiConfigSource, /const requestBody = JSON\.stringify\(\{ action, payload \}\)/); assert.match(apiConfigSource, /body: requestBody/);
    assert.match(uiSource, /routeAction\('acceptTerms',[\s\S]*?deviceId/);
    assert.doesNotMatch(uiSource, /routeAction\('touchSession'/);
});
test('la aceptación local habilita la app inmediatamente y AUTH se sincroniza en segundo plano', () => {
    const localSaveAt = uiSource.indexOf("saveDeviceTermsAcceptance(localStorage, userId, deviceId, localAcceptance, { syncStatus: 'pending' })");
    const resumeAt = uiSource.indexOf('showApp(user) !== true', localSaveAt);
    const syncStart = uiSource.indexOf('function syncPendingTermsAcceptance_(user, deviceId)');
    const remoteAt = uiSource.indexOf("routeAction('acceptTerms'", syncStart);
    assert.ok(localSaveAt >= 0 && resumeAt > localSaveAt, 'La aceptación local debe guardarse antes de reanudar la aplicación.');
    assert.ok(syncStart > 0 && remoteAt > syncStart, 'La llamada AUTH debe pertenecer al sincronizador en segundo plano.');
    const clickStart = uiSource.indexOf('button.onclick = () => {', uiSource.indexOf('function renderTermsGate_'));
    const clickEnd = uiSource.indexOf('    };', clickStart);
    assert.doesNotMatch(uiSource.slice(clickStart, clickEnd), /await routeAction\('acceptTerms'/,
        'El botón no debe esperar la respuesta remota.');
    assert.match(uiSource, /getDeviceTermsSyncStatus\(localStorage, userId, deviceId, TERMS_CURRENT_VERSION\) !== 'pending'/);
    assert.match(uiSource, /if \(!isCurrentTermsSyncSession_\(userId, sessionToken\)\) return false;/);
    const showStart = uiSource.indexOf('export function showApp(user)');
    const catalogStart = uiSource.indexOf('startCatalogLoad()', showStart);
    const fadeStart = uiSource.indexOf('fadeSplash();', catalogStart);
    assert.ok(showStart >= 0 && catalogStart > showStart && fadeStart > catalogStart,
        'La carga cache-first debe iniciarse antes del desvanecimiento del Splash.');
    assert.match(uiSource, /setTimeout\(\(\) => \{ splash\.style\.display = 'none'; \}, 500\)/);
    assert.ok(uiSource.includes("welcomeMsg.textContent = `Hola, ${displayName || 'Usuario'}`"));
    assert.ok(uiSource.includes('function getUiSessionContext_(user = getState().currentUser)'));
    assert.match(frontendAuthSource, /handleLoginSuccess\(result\.user\);/);
    assert.doesNotMatch(frontendAuthSource, /if \(appReady\) loadInitialData\(\)/);
    assert.doesNotMatch(frontendAuthSource, /if \(handleLoginSuccess\(user, false\)\) loadInitialData\(\)/);
    assert.match(frontendAuthSource, /export async function loadInitialData\([^)]*\)/);
});
test('UI no usa el indicador local antiguo y valida la versión del markup', () => {
    assert.doesNotMatch(uiSource, /gpsepedia_terms_accepted/);
    assert.match(htmlSource, /data-terms-version="2026-07"/); assert.match(htmlSource, /id="terms-error"/);
});
test('UI conserva el bloqueo si no puede identificar sesión/dispositivo o persistir aceptación local', () => {
    assert.match(uiSource, /El catálogo permanecerá bloqueado/);
    assert.match(uiSource, /No se pudo guardar la aceptación local/);
    assert.match(uiSource, /saveDeviceTermsAcceptance\(localStorage, userId, deviceId, localAcceptance/);
    assert.match(uiSource, /window.addEventListener\('online'/);
});
console.log('TermsAcceptance: ' + passed + '/19 PASS');
