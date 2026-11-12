import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createOverlayHistoryManager, overlayHistoryStateKey } from '../../overlayHistory.js';

const uiSource = readFileSync(new URL('../../ui.js', import.meta.url), 'utf8');
const closeStart = uiSource.indexOf('function closeReplacedImagesLightbox_(fromHistory = false)');
const closeEnd = uiSource.indexOf('\nfunction resetRoleScopedViews_', closeStart);
assert.ok(closeStart >= 0 && closeEnd > closeStart, 'No se encontró el cierre completo del lightbox de imágenes reemplazadas');
const closeSource = uiSource.slice(closeStart, closeEnd);
const openStart = uiSource.indexOf('const openLightbox = (rep) => {', closeEnd);
const openEnd = uiSource.indexOf('\n    if (lightbox) lightbox.onclick', openStart);
assert.ok(openStart >= 0 && openEnd > openStart, 'No se encontró la apertura del lightbox');
const openSource = uiSource.slice(openStart, openEnd);

let passed = 0;
function test(name, callback) {
    callback();
    passed++;
    console.log('PASS', name);
}

function createFakeHistory() {
    const entries = [{ state: { page: 'replaced-images' } }];
    let index = 0;
    let onPopState = null;
    return {
        get state() { return entries[index].state; },
        get length() { return entries.length; },
        setPopStateHandler(handler) { onPopState = handler; },
        pushState(state) { entries.splice(index + 1); entries.push({ state }); index++; },
        replaceState(state) { entries[index] = { state }; },
        back() { this.go(-1); },
        go(delta) {
            const next = Math.max(0, Math.min(entries.length - 1, index + delta));
            if (next === index) return;
            index = next;
            if (onPopState) onPopState(entries[index].state);
        }
    };
}

test('la apertura registra el lightbox como hijo en la pila compartida', () => {
    assert.match(openSource, /historyManager\.register\(REPLACED_IMAGES_LIGHTBOX_HISTORY_ID_/);
    assert.match(openSource, /!historyManager\.getStack\(\)\.includes\(REPLACED_IMAGES_LIGHTBOX_HISTORY_ID_\)/);
    assert.match(openSource, /closeReplacedImagesLightbox_\(true\)/);
});

test('la apertura repetida reutiliza la entrada y no duplica profundidad', () => {
    assert.match(openSource, /getStack\(\)\.includes\(REPLACED_IMAGES_LIGHTBOX_HISTORY_ID_\)/);
    assert.doesNotMatch(openSource, /closeLightbox\(\);/);
});

test('el cierre manual delega al gestor y el callback popstate limpia sin recursión', () => {
    assert.match(closeSource, /if \(!fromHistory && historyManager/);
    assert.match(closeSource, /historyManager\.close\(REPLACED_IMAGES_LIGHTBOX_HISTORY_ID_\)/);
    assert.match(closeSource, /if \(lightbox\) lightbox\.style\.display = 'none'/);
});

test('Atrás cierra primero el lightbox y conserva visible el modal padre', () => {
    const history = createFakeHistory();
    const closed = [];
    const manager = createOverlayHistoryManager(history);
    history.setPopStateHandler(state => manager.handlePopState(state));
    manager.register('replaced-images-modal', () => closed.push('parent'));
    manager.register('replaced-images-lightbox', () => closed.push('lightbox'));
    history.back();
    assert.deepEqual(closed, ['lightbox']);
    assert.deepEqual(manager.getStack(), ['replaced-images-modal']);
    assert.deepEqual(history.state[overlayHistoryStateKey], ['replaced-images-modal']);
});

test('cerrar el modal padre cierra el lightbox hijo en orden LIFO', () => {
    const history = createFakeHistory();
    const closed = [];
    const manager = createOverlayHistoryManager(history);
    history.setPopStateHandler(state => manager.handlePopState(state));
    manager.register('replaced-images-modal', () => closed.push('parent'));
    manager.register('replaced-images-lightbox', () => closed.push('lightbox'));
    manager.close('replaced-images-modal');
    assert.deepEqual(closed, ['lightbox', 'parent']);
    assert.deepEqual(manager.getStack(), []);
});

test('el cierre del modal padre no ejecuta un cierre paralelo del lightbox', () => {
    const parentCloseStart = uiSource.indexOf("if (closeBtn) closeBtn.onclick = () => {", openEnd);
    const parentCloseEnd = uiSource.indexOf("\n    if (filterInput)", parentCloseStart);
    assert.ok(parentCloseStart >= 0 && parentCloseEnd > parentCloseStart);
    const parentClose = uiSource.slice(parentCloseStart, parentCloseEnd);
    assert.doesNotMatch(parentClose, /closeLightbox\(\)/);
    assert.match(parentClose, /modal\.style\.display = 'none'/);
});

console.log('ReplacedImagesLightboxHistory:', passed + '/6 PASS');
