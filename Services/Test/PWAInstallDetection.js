import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mainSource = readFileSync(new URL('../../main.js', import.meta.url), 'utf8');
const htmlSource = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const manifestSource = readFileSync(new URL('../../manifest.json', import.meta.url), 'utf8');
const serviceWorkerSource = readFileSync(new URL('../../service-worker.js', import.meta.url), 'utf8');

let passed = 0;
function test(name, fn) {
    fn();
    passed += 1;
    console.log('PASS', name);
}

const pwaStart = mainSource.indexOf('const isIOSDevice = () => {');
const pwaEnd = mainSource.indexOf('\n    // Initial check', pwaStart);
assert.ok(pwaStart >= 0 && pwaEnd > pwaStart, 'No se encontró el bloque de detección PWA');
const pwaDetectionSource = mainSource.slice(pwaStart, pwaEnd);
const createDetection = new Function(
    'navigator',
    'window',
    'localStorage',
    'sessionStorage',
    'installButton',
    pwaDetectionSource + '\nreturn { isIOSDevice, isPWAInstalled, checkPWAInstallStatus };'
);

function storage(initial = {}) {
    const values = { ...initial };
    return {
        getItem(key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
        setItem(key, value) { values[key] = String(value); },
        values
    };
}

function createEnv(options = {}) {
    const navigator = {
        userAgent: options.userAgent || '',
        platform: options.platform || '',
        maxTouchPoints: options.maxTouchPoints || 0,
        standalone: options.navigatorStandalone === true
    };
    const window = {
        navigator,
        MSStream: options.msStream || false,
        matchMedia: () => ({ matches: options.displayModeStandalone === true })
    };
    const localStorage = storage(options.localStorage || {});
    const sessionStorage = storage(options.sessionStorage || {});
    const installButton = { style: { display: 'none' } };
    return {
        navigator, window, localStorage, sessionStorage, installButton,
        detection: createDetection(navigator, window, localStorage, sessionStorage, installButton)
    };
}

test('detecta iPhone mediante user-agent móvil', () => {
    const env = createEnv({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' });
    assert.equal(env.detection.isIOSDevice(), true);
});

test('detecta iPad mediante user-agent tradicional', () => {
    const env = createEnv({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)', platform: 'iPad', maxTouchPoints: 5 });
    assert.equal(env.detection.isIOSDevice(), true);
});

test('detecta iPadOS con user-agent de escritorio Macintosh y pantalla táctil', () => {
    const env = createEnv({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15',
        platform: 'MacIntel',
        maxTouchPoints: 5
    });
    assert.equal(env.detection.isIOSDevice(), true);
});

test('no clasifica un Mac de escritorio sin pantalla táctil como iPad', () => {
    const env = createEnv({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)',
        platform: 'MacIntel',
        maxTouchPoints: 0
    });
    assert.equal(env.detection.isIOSDevice(), false);
});

test('no clasifica un Mac con un solo punto táctil como iPadOS', () => {
    const env = createEnv({ userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 1 });
    assert.equal(env.detection.isIOSDevice(), false);
});

test('respeta la exclusión heredada de MSStream', () => {
    const env = createEnv({ userAgent: 'iPhone', msStream: true });
    assert.equal(env.detection.isIOSDevice(), false);
});

test('detecta instalación mediante display-mode standalone', () => {
    const env = createEnv({ displayModeStandalone: true });
    assert.equal(env.detection.isPWAInstalled(), true);
});

test('detecta instalación mediante navigator.standalone de Safari', () => {
    const env = createEnv({ navigatorStandalone: true });
    assert.equal(env.detection.isPWAInstalled(), true);
});

test('Safari iOS no oculta el botón por flags persistentes ajenos al modo standalone', () => {
    const env = createEnv({
        userAgent: 'iPhone',
        platform: 'iPhone',
        maxTouchPoints: 5,
        localStorage: { pwa_installed: 'true' },
        sessionStorage: { pwa_installed_session: 'true' }
    });
    assert.equal(env.detection.isPWAInstalled(), false);
});

test('Safari iOS muestra el botón de instrucciones cuando no está instalado', () => {
    const env = createEnv({ userAgent: 'iPad', platform: 'iPad', maxTouchPoints: 5 });
    env.detection.checkPWAInstallStatus();
    assert.equal(env.installButton.style.display, 'block');
});

test('la PWA iOS en modo standalone oculta el botón de instalación', () => {
    const env = createEnv({ userAgent: 'iPad', platform: 'iPad', maxTouchPoints: 5, navigatorStandalone: true });
    env.detection.checkPWAInstallStatus();
    assert.equal(env.installButton.style.display, 'none');
    assert.equal(env.sessionStorage.getItem('pwa_installed_session'), 'true');
});

test('otros navegadores conservan la detección de flags de instalación existentes', () => {
    const env = createEnv({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', localStorage: { pwa_installed: 'true' } });
    assert.equal(env.detection.isPWAInstalled(), true);
    env.detection.checkPWAInstallStatus();
    assert.equal(env.installButton.style.display, 'none');
});

test('index.html declara icono y metadatos Apple sin sustituir el manifest estándar', () => {
    assert.match(htmlSource, /rel="apple-touch-icon"[^>]*href="icon-pwa-192x192\.png"/);
    assert.match(htmlSource, /name="apple-mobile-web-app-capable" content="yes"/);
    assert.match(htmlSource, /name="apple-mobile-web-app-title" content="GPSpedia"/);
    assert.match(htmlSource, /name="apple-mobile-web-app-status-bar-style" content="default"/);
    assert.match(htmlSource, /rel="manifest" href="manifest\.json"/);
    assert.match(manifestSource, /"display":\s*"standalone"/);
    assert.match(serviceWorkerSource, /icon-pwa-192x192\.png/);
});

test('las instrucciones manuales incluyen iPhone e iPad y la acción Añadir a pantalla de inicio', () => {
    assert.match(htmlSource, /Instala GPSpedia en tu iPhone o iPad/);
    assert.match(htmlSource, /Añadir a pantalla de inicio/);
});

test('el flujo estándar beforeinstallprompt y appinstalled permanece activo', () => {
    assert.match(mainSource, /addEventListener\('beforeinstallprompt'/);
    assert.match(mainSource, /addEventListener\('appinstalled'/);
    assert.match(mainSource, /deferredPrompt\.prompt\(\)/);
});

console.log('PWAInstallDetection:', passed + '/15 PASS');
