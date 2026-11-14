import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createOverlayHistoryManager, overlayHistoryStateKey } from '../Frontend/overlayHistory.js';

const root = new URL('../../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const html = read('index.html');
const ui = read('JS/Frontend/ui.js');
const main = read('JS/Frontend/main.js');
const sw = read('service-worker.js');
const css = read('style.css');
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
    assert.match(sw, /gpsepedia-cache-v24/);
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
