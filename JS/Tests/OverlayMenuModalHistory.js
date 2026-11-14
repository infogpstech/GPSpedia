import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createOverlayHistoryManager, overlayHistoryStateKey } from '../Frontend/overlayHistory.js';

function createFakeHistory() {
    const entries = [{ state: { section: 'cortes', query: 'Toyota 2020', marker: 'preserved' } }];
    let index = 0;
    let onPopState = null;
    return {
        get state() { return entries[index].state; },
        get length() { return entries.length; },
        setPopStateHandler(handler) { onPopState = handler; },
        pushState(state) { entries.splice(index + 1); entries.push({ state }); index++; },
        replaceState(state) { entries[index] = { state }; },
        back() { if (index === 0) return; index--; if (onPopState) onPopState(entries[index].state); }
    };
}

let passed = 0;
function test(name, callback) { callback(); passed++; console.log('PASS', name); }

test('el gestor identifica overlays sin modificar su pila', () => {
    const manager = createOverlayHistoryManager(createFakeHistory());
    assert.equal(manager.has('side-menu'), false);
    manager.register('side-menu', () => {});
    assert.equal(manager.has('side-menu'), true);
    assert.deepEqual(manager.getStack(), ['side-menu']);
    assert.throws(() => manager.register('side-menu', () => {}), /ya está registrado/);
});

test('abrir el menú repetidamente conserva una sola entrada', () => {
    const history = createFakeHistory(), manager = createOverlayHistoryManager(history);
    if (!manager.has('side-menu')) manager.register('side-menu', () => {});
    if (!manager.has('side-menu')) manager.register('side-menu', () => {});
    assert.equal(history.length, 2);
    assert.deepEqual(manager.getStack(), ['side-menu']);
});

test('cerrar el menú permite abrir Inbox sin sideMenuOpen obsoleto', () => {
    const history = createFakeHistory(), manager = createOverlayHistoryManager(history);
    history.setPopStateHandler(state => manager.handlePopState(state));
    manager.register('side-menu', () => {});
    manager.close('side-menu');
    assert.deepEqual(manager.getStack(), []);
    manager.register('ui-modal:inbox-modal', () => {});
    assert.deepEqual(manager.getStack(), ['ui-modal:inbox-modal']);
    assert.equal(history.state.sideMenuOpen, undefined);
    assert.equal(history.state.section, 'cortes');
    assert.equal(history.state.query, 'Toyota 2020');
});

test('cerrar un modal hijo conserva el menú padre', () => {
    const history = createFakeHistory(), closed = [], manager = createOverlayHistoryManager(history);
    history.setPopStateHandler(state => manager.handlePopState(state));
    manager.register('side-menu', () => closed.push('menu'));
    manager.register('ui-modal:inbox-modal', () => closed.push('inbox'));
    history.back();
    assert.deepEqual(closed, ['inbox']);
    assert.deepEqual(manager.getStack(), ['side-menu']);
});

test('cierre directo del modal conserva la entrada anterior', () => {
    const history = createFakeHistory(), closed = [], manager = createOverlayHistoryManager(history);
    history.setPopStateHandler(state => manager.handlePopState(state));
    manager.register('section:dashboard', () => closed.push('dashboard'));
    manager.register('ui-modal:contact-modal', () => closed.push('contact'));
    manager.close('ui-modal:contact-modal');
    assert.deepEqual(closed, ['contact']);
    assert.deepEqual(manager.getStack(), ['section:dashboard']);
    assert.equal(history.state.section, 'cortes');
    assert.equal(history.state.query, 'Toyota 2020');
});

test('la publicación conserva búsqueda y sección ajenas a la pila', () => {
    const history = createFakeHistory(), manager = createOverlayHistoryManager(history);
    manager.register('modal:contact', () => {});
    assert.deepEqual(history.state[overlayHistoryStateKey], ['modal:contact']);
    assert.equal(history.state.section, 'cortes');
    assert.equal(history.state.query, 'Toyota 2020');
    assert.equal(history.state.marker, 'preserved');
});

test('reemplazar un modal conserva su identidad y callback personalizados', () => {
    const history = createFakeHistory(), closed = [], manager = createOverlayHistoryManager(history);
    history.setPopStateHandler(state => manager.handlePopState(state));
    manager.register('modal:old', () => closed.push('old'));
    manager.replaceTop('ui-modal:audit-drive-modal', () => closed.push('audit'));
    assert.deepEqual(manager.getStack(), ['ui-modal:audit-drive-modal']);
    history.back();
    assert.deepEqual(closed, ['audit']);
    assert.deepEqual(manager.getStack(), []);
});

test('main.js integra menú y modales en la misma pila y usa callbacks personalizados', () => {
    const source = readFileSync(new URL('../Frontend/main.js', import.meta.url), 'utf8');
    assert.match(source, /overlayHistory\.has\(id\)/);
    assert.match(source, /overlayHistory\.handlePopState\(state\)/);
    assert.match(source, /stackOrder\.get\('side-menu'\)/);
    assert.match(source, /querySelectorAll\('\.info-modal'\)/);
    assert.match(source, /element\.__gpOverlayClose/);
    assert.match(source, /overlayHistory\.replaceTop\(id, closeOverlay\)/);
});

test('main popstate reconcilia un modal ya oculto por un cierre directo', () => {
    const source = readFileSync(new URL('../Frontend/main.js', import.meta.url), 'utf8');
    const start = source.indexOf('if (!topOverlay)');
    const end = source.indexOf("const searchInput", start);
    assert.ok(start >= 0 && end > start);
    const fallback = source.slice(start, end);
    assert.match(fallback, /targetOverlayIds\.includes\(topOverlayId\)/);
    assert.match(fallback, /overlayHistory\.handlePopState\(state\)/);
    assert.match(source, /function isManagedOverlayVisible_\(id\)/);
    assert.match(source, /!isManagedOverlayVisible_\(topOverlayId\)/);
    assert.match(source, /replaced-images-lightbox/);
});

test('ui.js registra el menú idempotentemente y serializa su cierre', () => {
    const source = readFileSync(new URL('../Frontend/ui.js', import.meta.url), 'utf8');
    assert.match(source, /const SIDE_MENU_HISTORY_ID_ = 'side-menu'/);
    assert.match(source, /if \(!historyManager\.has\(SIDE_MENU_HISTORY_ID_\)\)/);
    assert.match(source, /export function closeSideMenuAndRun\(callback\)/);
    assert.match(source, /historyManager\.close\(SIDE_MENU_HISTORY_ID_\)/);
    assert.match(source, /historyManager\.has\(overlayId\)/);
    assert.match(source, /typeof modal\.__gpOverlayClose === 'function'/);
});

test('Inbox, Dashboard, Changelog y DevTools esperan el cierre del menú', () => {
    const source = readFileSync(new URL('../Frontend/main.js', import.meta.url), 'utf8');
    for (const action of ['openInbox', 'openDashboard', 'openChangeLog']) {
        assert.ok(source.includes(`closeSideMenuAndRun(() => ui.${action}())`), 'Falta: ' + action);
    }
    assert.match(source, /closeSideMenuAndRun\(\(\) => ui\.openDevTools\(\{ returnFocus: focusReturnTarget \}\)\)/);
});

test('las vistas administrativas invalidan operaciones y cierran el lightbox hijo', () => {
    const source = readFileSync(new URL('../Frontend/ui.js', import.meta.url), 'utf8');
    assert.match(source, /ui-modal:audit-drive-modal/);
    assert.match(source, /ui-modal:replaced-images-modal/);
    assert.match(source, /modal\.__gpOverlayClose = \(\) =>/);
    assert.match(source, /closeReplacedImagesLightbox_\(true\)/);
    assert.match(source, /historyManager\.close\(auditOverlayId\)/);
    assert.match(source, /historyManager\.close\(replacedOverlayId\)/);
});

test('el éxito de contact-form cierra mediante el gestor compartido', () => {
    const source = readFileSync(new URL('../Frontend/main.js', import.meta.url), 'utf8');
    assert.match(source, /contactOverlayId && historyManager && historyManager\.has\(contactOverlayId\)/);
    assert.match(source, /historyManager\.close\(contactOverlayId\)/);
});

test('Inbox y Developer reutilizan la validación reciente y comparten solicitudes concurrentes', () => {
    const source = readFileSync(new URL('../Frontend/ui.js', import.meta.url), 'utf8');
    assert.match(source, /let uiRoleValidationInFlight_ = null/);
    assert.match(source, /authApi\.validateActiveSession\(false\)/);
    assert.match(source, /await pending\.promise/);
    assert.doesNotMatch(source, /authApi\.validateActiveSession\(true\)/);
});

test('Inbox y Developer registran cierres completos en la pila de overlays', () => {
    const source = readFileSync(new URL('../Frontend/ui.js', import.meta.url), 'utf8');
    assert.match(source, /modal\.__gpOverlayClose = closeInboxModal_/);
    assert.match(source, /modal\.__gpOverlayClose = \(\) => \{/);
    assert.match(source, /modal\.setAttribute\('aria-hidden', 'false'\)/);
});

test('Developer conserva los nombres de las secciones en navegación móvil', () => {
    const source = readFileSync(new URL('../../style.css', import.meta.url), 'utf8');
    assert.match(source, /#dev-tools-modal \.dev-tab-link span\s*\{\s*position: static/);
    assert.match(source, /#dev-tools-modal \.dev-tools-sidebar\s*\{\s*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
});

console.log('OverlayMenuModalHistory:', passed + '/16 PASS');
