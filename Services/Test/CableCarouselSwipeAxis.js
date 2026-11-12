import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const uiSource = readFileSync(new URL('../../ui.js', import.meta.url), 'utf8');

function extractFunction(source, signature) {
    const start = source.indexOf(signature);
    if (start < 0) throw new Error('No se encontró el helper de gestos del carrusel.');
    const opening = source.indexOf('{', start);
    let depth = 0;
    let quote = '';
    let escaped = false;
    let lineComment = false;
    let blockComment = false;

    for (let i = opening; i < source.length; i++) {
        const char = source[i];
        const next = source[i + 1];

        if (lineComment) {
            if (char === '\n') lineComment = false;
            continue;
        }
        if (blockComment) {
            if (char === '*' && next === '/') {
                blockComment = false;
                i++;
            }
            continue;
        }
        if (quote) {
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === quote) quote = '';
            continue;
        }
        if (char === '/' && next === '/') {
            lineComment = true;
            i++;
            continue;
        }
        if (char === '/' && next === '*') {
            blockComment = true;
            i++;
            continue;
        }
        if (char === "'" || char === '"') {
            quote = char;
            continue;
        }
        if (char === '{') depth++;
        if (char === '}' && --depth === 0) return source.slice(start, i + 1);
    }
    throw new Error('El helper de gestos está incompleto.');
}

const helperSource = extractFunction(uiSource, 'function createCableCarouselTouchHandlers(');
const createHandlers = runInNewContext('(' + helperSource + ')');

let passed = 0;
function test(name, callback) {
    callback();
    passed++;
    console.log('PASS', name);
}
function makeHarness() {
    const directions = [];
    const handlers = createHandlers((direction) => directions.push(direction));
    return { directions, handlers };
}
function touchEvent(x, y, options = {}) {
    const touchCount = options.touches === undefined ? 1 : options.touches;
    const changedCount = options.changed === undefined ? 1 : options.changed;
    return {
        touches: Array.from({ length: touchCount }, () => ({})),
        changedTouches: Array.from({ length: changedCount }, () => ({ clientX: x, clientY: y })),
        target: options.target || null
    };
}
function swipe(handlers, startX, startY, endX, endY) {
    handlers.touchstart(touchEvent(startX, startY));
    handlers.touchend(touchEvent(endX, endY, { touches: 0 }));
}

test('desplazamiento horizontal hacia la izquierda avanza', () => {
    const h = makeHarness();
    swipe(h.handlers, 200, 100, 120, 110);
    assert.deepEqual(h.directions, [1]);
});
test('desplazamiento horizontal hacia la derecha retrocede', () => {
    const h = makeHarness();
    swipe(h.handlers, 120, 100, 200, 110);
    assert.deepEqual(h.directions, [-1]);
});
test('desplazamiento vertical no cambia de diapositiva', () => {
    const h = makeHarness();
    swipe(h.handlers, 100, 100, 110, 190);
    assert.deepEqual(h.directions, []);
});
test('desplazamiento diagonal dominado por el eje vertical se ignora', () => {
    const h = makeHarness();
    swipe(h.handlers, 100, 100, 160, 180);
    assert.deepEqual(h.directions, []);
});
test('desplazamiento diagonal dominado por el eje horizontal se acepta', () => {
    const h = makeHarness();
    swipe(h.handlers, 200, 100, 120, 130);
    assert.deepEqual(h.directions, [1]);
});
test('movimiento inferior al umbral se ignora', () => {
    const h = makeHarness();
    swipe(h.handlers, 100, 100, 140, 105);
    assert.deepEqual(h.directions, []);
});
test('movimiento exactamente igual al umbral se ignora', () => {
    const h = makeHarness();
    swipe(h.handlers, 100, 100, 150, 100);
    assert.deepEqual(h.directions, []);
});
test('inicio multitáctil se ignora', () => {
    const h = makeHarness();
    h.handlers.touchstart(touchEvent(200, 100, { touches: 2 }));
    h.handlers.touchend(touchEvent(100, 100, { touches: 0 }));
    assert.deepEqual(h.directions, []);
});
test('incorporar un segundo dedo cancela el gesto iniciado', () => {
    const h = makeHarness();
    h.handlers.touchstart(touchEvent(200, 100));
    h.handlers.touchstart(touchEvent(190, 100, { touches: 2 }));
    h.handlers.touchend(touchEvent(100, 100, { touches: 0 }));
    assert.deepEqual(h.directions, []);
});
test('el inicio sobre un control interactivo se ignora', () => {
    const h = makeHarness();
    const target = { closest: () => ({ tagName: 'BUTTON' }) };
    h.handlers.touchstart(touchEvent(200, 100, { target }));
    h.handlers.touchend(touchEvent(100, 100, { touches: 0 }));
    assert.deepEqual(h.directions, []);
});
test('touchcancel restablece el estado del gesto', () => {
    const h = makeHarness();
    h.handlers.touchstart(touchEvent(200, 100));
    h.handlers.touchcancel();
    h.handlers.touchend(touchEvent(100, 100, { touches: 0 }));
    assert.deepEqual(h.directions, []);
});
test('un gesto solo produce un cambio aunque llegue otro touchend', () => {
    const h = makeHarness();
    swipe(h.handlers, 200, 100, 100, 100);
    h.handlers.touchend(touchEvent(50, 100, { touches: 0 }));
    assert.deepEqual(h.directions, [1]);
});
test('touchend con otro dedo todavía activo se ignora', () => {
    const h = makeHarness();
    h.handlers.touchstart(touchEvent(200, 100));
    h.handlers.touchend(touchEvent(100, 100, { touches: 1 }));
    assert.deepEqual(h.directions, []);
});
test('touchstart con varios cambios simultáneos se ignora', () => {
    const h = makeHarness();
    h.handlers.touchstart(touchEvent(200, 100, { changed: 2 }));
    h.handlers.touchend(touchEvent(100, 100, { touches: 0 }));
    assert.deepEqual(h.directions, []);
});
test('coordenadas inválidas no activan el carrusel', () => {
    const h = makeHarness();
    h.handlers.touchstart({ touches: [{}], changedTouches: [{ clientX: NaN, clientY: 100 }], target: null });
    h.handlers.touchend(touchEvent(20, 100, { touches: 0 }));
    assert.deepEqual(h.directions, []);
});

console.log('CableCarouselSwipeAxis:', passed + '/15 PASS');
