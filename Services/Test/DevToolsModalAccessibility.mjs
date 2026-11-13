import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createOverlayHistoryManager, overlayHistoryStateKey } from '../../overlayHistory.js';

const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const html = read('index.html'), ui = read('ui.js'), main = read('main.js'), css = read('style.css');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS ' + name); }
function fakeHistory() {
    const entries = [{ state: { section: 'catalog', marker: 'keep' } }];
    let index = 0, pop = null;
    return {
        get state() { return entries[index].state; },
        setPopStateHandler(fn) { pop = fn; },
        pushState(state) { entries.splice(index + 1); entries.push({ state }); index++; },
        replaceState(state) { entries[index] = { state }; },
        back() { if (index > 0) { index--; if (pop) pop(entries[index].state); } }
    };
}

test('el modal de desarrollador declara diálogo modal y título accesible', () => {
    const start = html.indexOf('<div id="dev-tools-modal"');
    const opening = html.slice(start, html.indexOf('>', start) + 1);
    assert.match(opening, /role="dialog"/);
    assert.match(opening, /aria-modal="true"/);
    assert.match(opening, /aria-labelledby="dev-tools-title"/);
    assert.match(html, /<h2 id="dev-tools-title" class="dev-tools-title" tabindex="-1">/);
});
test('el cierre del modal es un botón semántico con nombre accesible', () => {
    const start = html.indexOf('<div id="dev-tools-modal"');
    const end = html.indexOf('<!-- =========', start);
    const modal = html.slice(start, end);
    assert.match(modal, /<button type="button" class="info-close-btn" aria-label="Cerrar opciones de desarrollador">/);
    assert.doesNotMatch(modal, /<span class="info-close-btn"/);
});
test('la apertura inicia foco, contiene Tab y restaura el disparador visible', () => {
    assert.match(ui, /activateLegalModalFocus_\(modal, \{[\s\S]*?initialFocus: modal\.querySelector\('#dev-tools-title'\)/);
    assert.match(ui, /returnFocus: options\.returnFocus/);
    assert.match(ui, /requestedReturnFocus && requestedReturnFocus\.isConnected \? requestedReturnFocus : document\.activeElement/);
    assert.match(ui, /document\.addEventListener\('keydown', handleKeydown, true\)/);
    assert.match(ui, /event\.key !== 'Tab'/);
    assert.match(ui, /modal\.contains\(active\)/);
    assert.match(ui, /previousFocus\.focus\(\)/);
});
test('Escape y botón de cierre usan la misma pila History API', () => {
    const start = ui.indexOf("const openDevToolsModal_ = setupModal('dev-tools-modal'");
    const end = ui.indexOf('\n});', start);
    const open = ui.slice(start, end + 4);
    assert.match(open, /allowEscape: true/);
    assert.match(open, /historyManager\.close\(overlayId\)/);
    assert.match(open, /modal\.style\.display = 'none'/);
    assert.match(ui, /if \(event\.key === 'Escape'\)[\s\S]*?if \(allowEscape\) close\(\)/);
});
test('el disparador del menú devuelve el foco a un control visible', () => {
    assert.match(main, /const focusReturnTarget = document\.getElementById\('hamburger-btn'\) \|\| devToolsBtn/);
    assert.match(main, /ui\.openDevTools\(\{ returnFocus: focusReturnTarget \}\)/);
});
test('la apertura continúa restringida al rol Desarrollador', () => {
    assert.match(ui, /ensureUiSessionRole_\(\['desarrollador'\]\)/);
});
test('el cierre del panel elimina su entrada y conserva la sección anterior', () => {
    const history = fakeHistory();
    const manager = createOverlayHistoryManager(history);
    let visible = true;
    history.setPopStateHandler(state => manager.handlePopState(state));
    manager.register('ui-modal:dev-tools-modal', () => { visible = false; return true; });
    assert.deepEqual(history.state[overlayHistoryStateKey], ['ui-modal:dev-tools-modal']);
    history.back();
    assert.equal(visible, false);
    assert.deepEqual(manager.getStack(), []);
    assert.equal(history.state.section, 'catalog');
    assert.equal(history.state.marker, 'keep');
    assert.equal(Object.hasOwn(history.state, overlayHistoryStateKey), false);
    assert.equal(Object.hasOwn(history.state, 'modalOpen'), false);
});
test('el botón y el encabezado conservan foco visible en ambos temas', () => {
    assert.match(css, /#dev-tools-modal \.info-close-btn:focus-visible/);
    assert.match(css, /#dev-tools-modal #dev-tools-title:focus-visible/);
});

console.log('DevToolsModalAccessibility: ' + passed + '/' + passed + ' PASS');
