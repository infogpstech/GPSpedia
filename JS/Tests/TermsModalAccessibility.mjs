import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createOverlayHistoryManager, overlayHistoryStateKey } from '../Frontend/overlayHistory.js';
import { getOrCreateTermsDeviceId, getDeviceTermsAcceptance, saveDeviceTermsAcceptance } from '../Frontend/termsDeviceAcceptance.js';

const root = new URL('../../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const html = read('index.html');
const ui = read('JS/Frontend/ui.js');
const auth = read('JS/Frontend/auth.js');
const main = read('JS/Frontend/main.js');
const sw = read('service-worker.js');
const css = read('style.css');
const serviceAuth = read('Services/Auth.js');
const coordinator = read('Services/Coordinator.js');
let passed = 0;
function test(name, callback) {
    callback();
    passed++;
    console.log('PASS ' + name);
}
function createFakeHistory() {
    const entries = [{ state: { section: 'login', marker: 'preserved' } }];
    let index = 0, onPopState = null;
    return {
        get state() { return entries[index].state; },
        get length() { return entries.length; },
        setPopStateHandler(handler) { onPopState = handler; },
        pushState(state) { entries.splice(index + 1); entries.push({ state }); index++; },
        replaceState(state) { entries[index] = { state }; },
        back() {
            if (index === 0) return;
            index--;
            if (onPopState) onPopState(entries[index].state);
        }
    };
}

test('el aviso obligatorio expone semántica de diálogo y descripción accesible', () => {
    const opening = html.match(/<div id="terms-modal"[^>]*>/)?.[0] || '';
    assert.match(opening, /role="dialog"/);
    assert.match(opening, /aria-modal="true"/);
    assert.match(opening, /aria-labelledby="terms-modal-title"/);
    assert.match(opening, /aria-describedby="terms-modal-description"/);
    assert.match(html, /<h2 id="terms-modal-title" tabindex="-1">Aviso Importante<\/h2>/);
    assert.match(html, /<p id="terms-modal-description">/);
});
test('el aviso obligatorio no incluye control de cierre', () => {
    const start = html.indexOf('<div id="terms-modal"');
    const end = html.indexOf('<!-- ========= MODAL DEL ACUERDO', start);
    const notice = html.slice(start, end);
    assert.doesNotMatch(notice, /info-close-btn|aria-label="Cerrar/);
    assert.match(notice, /id="btn-accept-terms"/);
});
test('el acuerdo tiene role dialog, nombre, descripción y botón de cierre semántico', () => {
    const start = html.indexOf('<div id="terms-agreement-modal"');
    const end = html.indexOf('<!-- ========= MODALES DE INFORMACIÓN', start);
    const agreement = html.slice(start, end);
    const opening = agreement.slice(0, agreement.indexOf('>') + 1);
    assert.match(opening, /role="dialog"/);
    assert.match(opening, /aria-modal="true"/);
    assert.match(opening, /aria-labelledby="terms-agreement-title"/);
    assert.match(opening, /aria-describedby="terms-agreement-description"/);
    assert.match(agreement, /<button type="button" class="info-close-btn" aria-label="Cerrar términos y condiciones">/);
    assert.match(agreement, /<h2 id="terms-agreement-title" tabindex="-1">/);
    assert.match(agreement, /<p id="terms-agreement-description">/);
    assert.doesNotMatch(agreement, /<span class="info-close-btn"/);
});
test('el foco del acuerdo se inicia en el encabezado, se contiene y se restaura al cerrar', () => {
    assert.match(ui, /function activateLegalModalFocus_\(modal, options = \{\}\)/);
    assert.match(ui, /document\.addEventListener\('keydown', handleKeydown, true\)/);
    assert.match(ui, /document\.removeEventListener\('keydown', handleKeydown, true\)/);
    assert.match(ui, /event\.key !== 'Tab'/);
    assert.match(ui, /modal\.contains\(active\)/);
    assert.match(ui, /previousFocus\.focus\(\)/);
    assert.match(ui, /parentNotice\.setAttribute\('aria-hidden', 'true'\)/);
    assert.match(ui, /parentNotice\.removeAttribute\('aria-hidden'\)/);
    assert.match(ui, /initialFocus: modal\.querySelector\('#terms-agreement-title'\)/);
    assert.match(ui, /allowEscape: true/);
});
test('Escape cierra el acuerdo pero nunca descarta el aviso obligatorio', () => {
    assert.match(ui, /if \(event\.key === 'Escape'\)[\s\S]*?if \(allowEscape\) close\(\)/);
    assert.match(ui, /activateLegalModalFocus_\(modal, \{ initialFocus: button, allowEscape: false \}\)/);
    assert.match(ui, /initialFocus: modal\.querySelector\('#terms-modal-title'\),\s*allowEscape: false/);
    assert.match(ui, /historyManager\.close\(overlayId\)/);
});
test('el acuerdo se abre desde login, footer y enlace del aviso', () => {
    assert.match(main, /footer-terms-link.*addEventListener\('click', openTerms\)/);
    assert.match(main, /login-terms-link.*addEventListener\('click', openTerms\)/);
    assert.match(main, /terms-link-in-modal.*addEventListener\('click', openTerms\)/);
    assert.match(ui, /termsNotice && termsNotice\.style\.display === 'flex' \? '3200' : ''/);
});
test('el aviso se recuerda por usuario y dispositivo, incluso después de cerrar sesión', () => {
    const createStorage = () => {
        const values = new Map();
        return {
            getItem: key => values.has(key) ? values.get(key) : null,
            setItem: (key, value) => values.set(key, String(value)),
            removeItem: key => values.delete(key)
        };
    };
    const storage = createStorage();
    const deviceA = getOrCreateTermsDeviceId(storage, { randomUUID: () => '11111111-1111-4111-8111-111111111111' });
    const acceptance = { version: '2026-07', acceptedAt: '2026-11-14T12:00:00.000Z', status: 'accepted' };
    saveDeviceTermsAcceptance(storage, 'USR-0001', deviceA, acceptance);
    storage.setItem('gpsepedia_session', '{"SessionToken":"old"}');
    storage.removeItem('gpsepedia_session');
    assert.equal(getOrCreateTermsDeviceId(storage, { randomUUID: () => 'ffffffff-ffff-4fff-8fff-ffffffffffff' }), deviceA);
    assert.deepEqual(getDeviceTermsAcceptance(storage, 'USR-0001', deviceA, '2026-07'), acceptance);
    assert.equal(getDeviceTermsAcceptance(storage, 'USR-0002', deviceA, '2026-07'), null);
    assert.equal(getDeviceTermsAcceptance(storage, 'USR-0001', deviceA, '2027-01'), null);

    const newDeviceStorage = createStorage();
    const deviceB = getOrCreateTermsDeviceId(newDeviceStorage, { randomUUID: () => '22222222-2222-4222-8222-222222222222' });
    assert.notEqual(deviceB, deviceA);
    assert.equal(getDeviceTermsAcceptance(newDeviceStorage, 'USR-0001', deviceB, '2026-07'), null);
});
test('el aviso bloquea el catálogo hasta confirmar la aceptación del dispositivo', () => {
    assert.match(ui, /if \(!renderTermsGate_\(user\)\) return;/);
    assert.match(ui, /getOrCreateTermsDeviceId\(localStorage, window\.crypto\)/);
    assert.match(ui, /saveDeviceTermsAcceptance\(localStorage, userId, deviceId, confirmed\)/);
    assert.match(auth, /if \(appReady\) loadInitialData\(\)/);
    assert.match(auth, /if \(handleLoginSuccess\(validatedUser, false\)\) loadInitialData\(\)/);
});
test('AUTH registra la aceptación por dispositivo sin escribir la columna de aceptación de la sesión', () => {
    const start = serviceAuth.indexOf('function handleAcceptTerms(payload) {');
    const end = serviceAuth.indexOf('\nfunction handleMigrateLegacyPasswords(payload) {', start);
    const handler = serviceAuth.slice(start, end);
    assert.match(handler, /payload && payload\.deviceId/);
    assert.match(handler, /COLS_USERS\.TermsAcceptance/);
    assert.doesNotMatch(handler, /sessionCell\.setValue|ensureSessionTermsAcceptanceColumn_/);
    const preflightStart = serviceAuth.indexOf('function touchProtectedAuthRequestSession_(action, payload) {');
    const preflightEnd = serviceAuth.indexOf('\nfunction doPostInternal_(e) {', preflightStart);
    const preflight = serviceAuth.slice(preflightStart, preflightEnd);
    assert.match(preflight, /action === "acceptTerms"[\s\S]*?validateSessionReadOnly_\(token, userId\)/);
    assert.match(preflight, /const result = validateAndTouchSession_\(token\)/);
    assert.match(coordinator, /acceptTerms: \{ read: \["ACTIVE_SESSIONS"\], write: \["USERS"\], sharedWrite: \["ACTIVE_SESSIONS"\] \}/);
    assert.match(coordinator, /operation !== "acceptTerms"/);
});
test('cerrar el acuerdo sobre el aviso limpia History API y conserva el aviso padre', () => {
    const history = createFakeHistory();
    const manager = createOverlayHistoryManager(history);
    let noticeVisible = true, agreementVisible = true;
    history.setPopStateHandler(state => manager.handlePopState(state));
    manager.register('terms-agreement-modal', () => { agreementVisible = false; return true; });
    assert.deepEqual(history.state[overlayHistoryStateKey], ['terms-agreement-modal']);
    history.back();
    assert.equal(agreementVisible, false);
    assert.equal(noticeVisible, true);
    assert.deepEqual(manager.getStack(), []);
    assert.equal(Object.prototype.hasOwnProperty.call(history.state, overlayHistoryStateKey), false);
    assert.equal(Object.prototype.hasOwnProperty.call(history.state, 'modalOpen'), false);
});
test('los logos usados por el contenido legal se precargan en el Service Worker', () => {
    assert.match(sw, /const CACHE_NAME='gpsepedia-cache-v\\d+'/);
    assert.match(sw, /\.\/JS\/Frontend\/termsDeviceAcceptance\.js/);
    for (const file of ['Images/Logo_TemaOscuro.png', 'Images/tracklink_logo.png']) {
        assert.ok(sw.includes("'./" + file + "'"), file + ' no está en CORE_ASSETS');
        assert.ok(existsSync(new URL('../../' + file, import.meta.url)), file + ' no existe en el repositorio');
    }
});
test('el botón de cierre conserva indicador visible de foco en temas y viewports', () => {
    assert.match(css, /#terms-agreement-modal \.info-close-btn:focus-visible/);
    assert.match(css, /#terms-modal button:focus-visible/);
});

console.log('TermsModalAccessibility: ' + passed + '/' + passed + ' PASS');
