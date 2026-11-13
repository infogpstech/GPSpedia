import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
const authSource = readFileSync(new URL('../Auth.js', import.meta.url), 'utf8');
const authTestSource = readFileSync(new URL('./Auth.js', import.meta.url), 'utf8');
const usersSource = readFileSync(new URL('../users.js', import.meta.url), 'utf8');
const usersTestSource = readFileSync(new URL('./users.js', import.meta.url), 'utf8');
const apiConfigSource = readFileSync(new URL('../../api-config.js', import.meta.url), 'utf8');
const uiSource = readFileSync(new URL('../../ui.js', import.meta.url), 'utf8');
const htmlSource = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const sandbox = { SpreadsheetApp: { flush() {} }, console, Date, JSON, Object, String, Number, Array };
runInNewContext(authSource + '\n;globalThis.__termsHelpers = { parseTermsAcceptance_, ensureTermsAcceptanceColumn_ };', sandbox);
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
test('estado distinto de accepted se rechaza', () => assert.equal(helpers.parseTermsAcceptance_(JSON.stringify({ version: '2026-07', acceptedAt: '2026-07-18T12:00:00.000Z', status: 'pending' })).status, 'invalid'));
test('crea el encabezado I solo cuando la celda está libre', () => assert.equal(helpers.ensureTermsAcceptanceColumn_(fakeUsersSheet()), 9));
test('no reemplaza un encabezado diferente', () => assert.throws(() => helpers.ensureTermsAcceptanceColumn_(fakeUsersSheet('OtroCampo')), /otro encabezado/i));
test('no adopta datos preexistentes bajo encabezado vacío', () => assert.throws(() => helpers.ensureTermsAcceptanceColumn_(fakeUsersSheet('', 'dato existente')), /datos sin encabezado/i));
test('AUTH y su espejo de pruebas incluyen la acción y la columna', () => {
    assert.match(authSource, /case 'acceptTerms'/); assert.match(authTestSource, /case 'acceptTerms'/);
    assert.match(authSource, /TermsAcceptance: 9/); assert.match(authTestSource, /TermsAcceptance: 9/);
});
test('USERS mantiene la columna privada fuera de la escritura de perfil', () => {
    assert.match(usersSource, /TermsAcceptance: 9/); assert.match(usersTestSource, /TermsAcceptance: 9/);
    assert.match(usersSource, /Solo permitir cambios en Nombre_Completo/);
});
test('API dirige acceptTerms a AUTH', () => assert.match(apiConfigSource, /'acceptTerms': 'AUTH'/));
test('UI no usa el indicador local antiguo y valida la versión del markup', () => {
    assert.doesNotMatch(uiSource, /gpsepedia_terms_accepted/);
    assert.match(htmlSource, /data-terms-version="2026-07"/); assert.match(htmlSource, /id="terms-error"/);
});
test('UI conserva el bloqueo ante errores de backend o caché local', () => {
    assert.match(uiSource, /El catálogo permanece bloqueado/);
    assert.match(uiSource, /localStorage\.setItem\('gpsepedia_session'/);
});
console.log('TermsAcceptance: ' + passed + '/14 PASS');
