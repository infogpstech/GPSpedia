import assert from 'node:assert/strict';
import { createOverlayHistoryManager, overlayHistoryStateKey } from '../../overlayHistory.js';

function createFakeHistory() {
    const entries = [{ state: { level: 'catalogo', marker: 'preserved' } }];
    let index = 0;
    let onPopState = null;
    return {
        get state() { return entries[index].state; },
        get length() { return entries.length; },
        setPopStateHandler(handler) { onPopState = handler; },
        pushState(state) {
            entries.splice(index + 1);
            entries.push({ state });
            index++;
        },
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

let passed = 0;
function test(name, callback) {
    callback();
    passed++;
    console.log('PASS', name);
}

test('registrar overlay crea entrada sin perder el estado previo', () => {
    const history = createFakeHistory();
    const manager = createOverlayHistoryManager(history);
    manager.register('parent', () => {});
    assert.deepEqual(manager.getStack(), ['parent']);
    assert.deepEqual(history.state[overlayHistoryStateKey], ['parent']);
    assert.equal(history.state.marker, 'preserved');
    assert.equal(history.length, 2);
});

test('un retroceso cierra solo el overlay superior', () => {
    const history = createFakeHistory();
    const closed = [];
    const manager = createOverlayHistoryManager(history);
    history.setPopStateHandler(state => manager.handlePopState(state));
    manager.register('parent', () => closed.push('parent'));
    manager.register('child', () => closed.push('child'));
    history.back();
    assert.deepEqual(closed, ['child']);
    assert.deepEqual(manager.getStack(), ['parent']);
});

test('retrocesos consecutivos cierran primero hijo y luego padre', () => {
    const history = createFakeHistory();
    const closed = [];
    const manager = createOverlayHistoryManager(history);
    history.setPopStateHandler(state => manager.handlePopState(state));
    manager.register('parent', () => closed.push('parent'));
    manager.register('child', () => closed.push('child'));
    history.back();
    history.back();
    assert.deepEqual(closed, ['child', 'parent']);
    assert.deepEqual(manager.getStack(), []);
});

test('cierre manual del overlay superior usa el historial', () => {
    const history = createFakeHistory();
    const closed = [];
    const manager = createOverlayHistoryManager(history);
    history.setPopStateHandler(state => manager.handlePopState(state));
    manager.register('parent', () => closed.push('parent'));
    manager.register('child', () => closed.push('child'));
    assert.equal(manager.close('child'), true);
    assert.deepEqual(closed, ['child']);
    assert.deepEqual(manager.getStack(), ['parent']);
});

test('reemplazar overlay superior conserva una sola entrada', () => {
    const history = createFakeHistory();
    const closed = [];
    const manager = createOverlayHistoryManager(history);
    history.setPopStateHandler(state => manager.handlePopState(state));
    manager.register('parent', () => closed.push('parent'));
    manager.register('menu-plus', () => closed.push('menu-plus'));
    manager.replaceTop('form-vin', () => closed.push('form-vin'));
    assert.equal(history.length, 3);
    assert.deepEqual(manager.getStack(), ['parent', 'form-vin']);
    history.back();
    assert.deepEqual(closed, ['form-vin']);
    assert.deepEqual(manager.getStack(), ['parent']);
});

test('cerrar manualmente un padre con hijos retrocede hasta su entrada', () => {
    const history = createFakeHistory();
    const closed = [];
    const manager = createOverlayHistoryManager(history);
    history.setPopStateHandler(state => manager.handlePopState(state));
    manager.register('parent', () => closed.push('parent'));
    manager.register('child-a', () => closed.push('child-a'));
    manager.register('child-b', () => closed.push('child-b'));
    manager.close('parent');
    assert.deepEqual(closed, ['child-b', 'child-a', 'parent']);
    assert.deepEqual(manager.getStack(), []);
});

test('un error de cierre no impide cerrar los overlays restantes', () => {
    const history = createFakeHistory();
    const errors = [];
    const closed = [];
    const manager = createOverlayHistoryManager(history, error => errors.push(error.message));
    history.setPopStateHandler(state => manager.handlePopState(state));
    manager.register('parent', () => closed.push('parent'));
    manager.register('child', () => { throw new Error('close failed'); });
    history.back();
    assert.deepEqual(errors, ['close failed']);
    assert.deepEqual(manager.getStack(), ['parent']);
    assert.deepEqual(closed, []);
});

test('rechaza identificadores duplicados y callbacks inválidos', () => {
    const manager = createOverlayHistoryManager(createFakeHistory());
    manager.register('parent', () => {});
    assert.throws(() => manager.register('parent', () => {}), /ya está registrado/);
    assert.throws(() => manager.register('child', null), /función de cierre/);
});

test('cierre de identificador inexistente no altera el historial', () => {
    const history = createFakeHistory();
    const manager = createOverlayHistoryManager(history);
    manager.register('parent', () => {});
    assert.equal(manager.close('missing'), false);
    assert.deepEqual(manager.getStack(), ['parent']);
    assert.equal(history.length, 2);
});

test('clear cierra en orden inverso y reemplaza el estado actual', () => {
    const history = createFakeHistory();
    const closed = [];
    const manager = createOverlayHistoryManager(history);
    manager.register('parent', () => closed.push('parent'));
    manager.register('child', () => closed.push('child'));
    manager.clear();
    assert.deepEqual(closed, ['child', 'parent']);
    assert.deepEqual(manager.getStack(), []);
    assert.deepEqual(history.state[overlayHistoryStateKey], []);
});

test('cancelar un cierre por popstate restaura la entrada del overlay', () => {
    const history = createFakeHistory();
    let attempts = 0;
    const manager = createOverlayHistoryManager(history);
    history.setPopStateHandler(state => manager.handlePopState(state));
    manager.register('youtube-upload', () => {
        attempts++;
        return attempts > 1;
    });
    history.back();
    assert.deepEqual(manager.getStack(), ['youtube-upload']);
    assert.deepEqual(history.state[overlayHistoryStateKey], ['youtube-upload']);
    assert.equal(history.length, 2);
    history.back();
    assert.deepEqual(manager.getStack(), []);
    assert.equal(Object.prototype.hasOwnProperty.call(history.state, overlayHistoryStateKey), false);
    assert.equal(attempts, 2);
});

console.log('OverlayHistoryStack:', passed + '/10 PASS');
