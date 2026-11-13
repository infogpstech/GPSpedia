import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mainSource = readFileSync(new URL('../../main.js', import.meta.url), 'utf8');
const htmlSource = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../../style.css', import.meta.url), 'utf8');

let passed = 0;
function test(name, fn) {
    fn();
    passed += 1;
    console.log('PASS', name);
}

function createIndicator() {
    const classes = new Set(['online', 'keep-existing-class']);
    return {
        classes,
        classList: {
            toggle(name, force) {
                if (force) classes.add(name);
                else classes.delete(name);
            }
        },
        title: ''
    };
}

const updaterStart = mainSource.indexOf('const updateStatus = () => {');
const updaterEnd = mainSource.indexOf("\n        window.addEventListener('online', updateStatus)", updaterStart);
assert.ok(updaterStart >= 0 && updaterEnd > updaterStart, 'No se encontró updateStatus');
const updaterSource = mainSource.slice(updaterStart, updaterEnd).trim();
const createUpdater = new Function(
    'connectionStatus',
    'connectionStatusLabel',
    'navigator',
    updaterSource + '\nreturn updateStatus;'
);

test('el markup conserva el punto de 3px y añade role=status/aria-live', () => {
    assert.match(htmlSource, /id="connection-status"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/);
    assert.match(htmlSource, /id="connection-status-label"/);
});

test('el texto accesible cambia a estado online sin afirmar disponibilidad backend', () => {
    const indicator = createIndicator();
    const label = { textContent: '' };
    createUpdater(indicator, label, { onLine: true })();
    assert.ok(indicator.classes.has('online'));
    assert.ok(!indicator.classes.has('offline'));
    assert.ok(indicator.classes.has('keep-existing-class'));
    assert.match(label.textContent, /El navegador indica que hay conexión de red/);
    assert.match(label.textContent, /no confirma que los servicios de GPSpedia estén disponibles/);
    assert.equal(indicator.title, label.textContent);
});

test('el texto accesible cambia a estado offline y conserva la información de caché', () => {
    const indicator = createIndicator();
    const label = { textContent: '' };
    createUpdater(indicator, label, { onLine: false })();
    assert.ok(indicator.classes.has('offline'));
    assert.ok(!indicator.classes.has('online'));
    assert.match(label.textContent, /no hay conexión de red/);
    assert.match(label.textContent, /datos guardados pueden seguir disponibles/);
});

test('navigator.onLine se consulta sin realizar health checks de backend', () => {
    assert.match(updaterSource, /navigator\.onLine/);
    assert.doesNotMatch(updaterSource, /\bfetch\s*\(/);
    assert.doesNotMatch(updaterSource, /XMLHttpRequest/);
});

test('los eventos online/offline actualizan el indicador', () => {
    assert.match(mainSource, /window\.addEventListener\('online', updateStatus\)/);
    assert.match(mainSource, /window\.addEventListener\('offline', updateStatus\)/);
    assert.match(mainSource, /updateStatus\(\); \/\/ Estado inicial/);
});

test('el indicador mantiene exactamente 3px y el texto oculto no altera el layout', () => {
    const indicatorCss = cssSource.slice(cssSource.indexOf('#connection-status {'), cssSource.indexOf('#connection-status.online'));
    assert.match(indicatorCss, /width:\s*3px/);
    assert.match(indicatorCss, /height:\s*3px/);
    assert.match(cssSource, /\.connection-status-sr-only\s*\{/);
    assert.match(cssSource, /clip:\s*rect\(0,\s*0,\s*0,\s*0\)/);
});

test('prefers-reduced-motion elimina la animación pero conserva el estado offline', () => {
    assert.match(cssSource, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    assert.match(cssSource, /#connection-status\.offline\s*\{\s*animation:\s*none;/);
    assert.match(cssSource, /#connection-status\.offline\s*\{[^}]*background-color:\s*#ffc107/s);
});

test('el indicador no muestra ni promete estado de disponibilidad de servicios', () => {
    assert.match(htmlSource, /no confirma que los servicios de GPSpedia estén disponibles/);
    assert.doesNotMatch(updaterSource, /backend.*disponible|servicios.*responden/i);
});

console.log('ConnectionStatusAccessibility:', passed + '/8 PASS');
