import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createOverlayHistoryManager, overlayHistoryStateKey } from '../Frontend/overlayHistory.js';

const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const html = read('index.html'), ui = read('JS/Frontend/ui.js'), main = read('JS/Frontend/main.js'), css = read('style.css'), usersPage = read('HTML/users.html'), addCortesPage = read('HTML/add_cortes.html');
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
    const closeRegion = modal.slice(0, modal.indexOf('<h2'));
    assert.doesNotMatch(closeRegion, /<span class="info-close-btn"/);
});
test('la apertura inicia foco, contiene Tab y restaura el disparador visible', () => {
    assert.match(ui, /activateLegalModalFocus_\(modal, \{[\s\S]*?initialFocus: modal\.querySelector\('#dev-tools-title'\)/);
    assert.match(ui, /returnFocus: options\.returnFocus/);
    assert.match(ui, /requestedReturnFocus && requestedReturnFocus\.isConnected \? requestedReturnFocus : document\.activeElement/);
    assert.match(ui, /document\.addEventListener\('keydown', handleKeydown, true\)/);
    assert.match(ui, /event\.key !== 'Tab'/);
    assert.match(ui, /modal\.contains\(active\)/);
    assert.match(ui, /isTopmostManagedModal_\(modal\)/);
    assert.match(ui, /document\.querySelectorAll\('\.info-modal, \.terms-overlay'\)/);
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
test('los avisos extensos se guardan en la terminal y la interfaz muestra texto breve', () => {
    assert.match(ui, /const developerDiagnosticQueue_ = \[\]/);
    assert.match(ui, /window\.gpsepediaDeveloperLog = \(message, level = 'info'\)/);
    assert.match(ui, /original\.length > 110/);
    assert.match(ui, /No se pudo completar la operación\./);
});
test('el panel diagnostica la configuración del coordinador AUTH', () => {
    assert.match(ui, /metadata\.coordinatorConfigured === false/);
    assert.match(ui, /Coordinador pendiente/);
    assert.match(ui, /Coordinador compartido/);
});
test('las páginas auxiliares remiten los detalles largos al aviso central', () => {
    for (const source of [usersPage, addCortesPage]) {
        assert.match(source, /function showConciseAlert_\(message\)/);
        assert.match(source, /hostUi\.showGlobalError\(detail\)/);
        assert.match(source, /No se pudo completar la operación\./);
    }
    assert.match(addCortesPage, /showConciseAlert_\(/);
    assert.match(usersPage, /showConciseAlert_\(/);
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


test('las cuatro opciones usan un único grupo nativo de radios con etiquetas asociadas', () => {
    const tabsStart = html.indexOf('<div class="dev-tools-tabs"');
    const tabsEnd = html.indexOf('<div class="dev-tools-panels">', tabsStart);
    const tabs = html.slice(tabsStart, tabsEnd);
    assert.ok(tabs.includes('<fieldset class="dev-tools-tab-options">'));
    assert.ok(tabs.includes('<legend>Secciones del panel de desarrollador</legend>'));
    for (const id of ['diagnostics', 'database', 'images', 'system']) {
        assert.ok(tabs.includes('id="dev-tab-' + id + '" aria-controls="dev-panel-' + id + '"'));
        assert.ok(tabs.includes('for="dev-tab-' + id + '"'));
    }
    assert.equal((tabs.match(/type="radio" name="dev-tools-section"/g) || []).length, 4);
    assert.equal((tabs.match(/checked>/g) || []).length, 1);
});
test('el grupo nativo tiene leyenda y queda separado del contenido de los paneles', () => {
    const start = html.indexOf('<fieldset class="dev-tools-tab-options">');
    const end = html.indexOf('</fieldset>', start);
    const group = html.slice(start, end);
    assert.ok(group.includes('<legend>Secciones del panel de desarrollador</legend>'));
    assert.ok(!group.includes('dev-tools-panels'));
    assert.ok(css.includes('#dev-tools-modal .dev-tools-tab-options'));
    assert.ok(css.includes('clip: rect(0, 0, 0, 0)'));
});
test('los paneles son regiones con encabezados propios y relaciones correctas', () => {
    for (const id of ['diagnostics', 'database', 'images', 'system']) {
        assert.ok(html.includes('id="dev-panel-' + id + '" class="dev-tab-panel dev-panel-' + id + '" role="region" aria-labelledby="dev-panel-title-' + id + '"'));
        assert.ok(html.includes('<h3 id="dev-panel-title-' + id + '">'));
    }
});
test('no mezcla roles tab/tablist/tabpanel con controles radio nativos', () => {
    const start = html.indexOf('<div class="dev-tools-tabs"');
    const end = html.indexOf('<!-- =========', start);
    const tabs = html.slice(start, end);
    assert.doesNotMatch(tabs, /role="tablist"|role="tab"|role="tabpanel"/);
    assert.ok(tabs.includes('<fieldset class="dev-tools-tab-options">'));
    assert.ok(tabs.includes('type="radio" name="dev-tools-section"'));
});
test('los selectores CSS conservan visibilidad y foco para las cuatro opciones', () => {
    for (const id of ['diagnostics', 'database', 'images', 'system']) {
        assert.ok(css.includes('.dev-tools-tabs:has(#dev-tab-' + id + ':checked)'));
        assert.ok(css.includes('.dev-tools-tabs:has(#dev-tab-' + id + ':focus-visible)'));
    }
});
test('Respaldos y Base de datos comparten una sola pestaña', () => {
    const tabsStart = html.indexOf('<div class="dev-tools-tabs"');
    const tabsEnd = html.indexOf('<div class="dev-tools-panels">', tabsStart);
    const tabs = html.slice(tabsStart, tabsEnd);
    assert.doesNotMatch(tabs, /dev-tab-backups|dev-panel-backups/);
    const databaseStart = html.indexOf('<section id="dev-panel-database"');
    const imagesStart = html.indexOf('<!-- Imágenes y Drive -->', databaseStart);
    const databasePanel = html.slice(databaseStart, imagesStart);
    assert.ok(databasePanel.includes('id="backup-management-panel"'));
    assert.ok(databasePanel.includes('btn-admin-backup-db'));
    assert.ok(databasePanel.includes('btn-admin-restore-db'));
    assert.match(databasePanel, /Base de datos y respaldos/);
});
test('Migrar esquema y selector de limpieza conservan dimensiones compactas', () => {
    assert.match(ui, /migrateButton\.className = "btn btn-primary replaced-images-schema-migrate"/);
    assert.match(css, /\.replaced-images-schema-migrate\s*\{[^}]*min-height:\s*38px/);
    assert.match(html, /id="clear-logs-option-select" class="dev-input dev-control-compact"/);
    assert.match(css, /#dev-tools-modal #clear-logs-option-select\s*\{[^}]*height:\s*38px/);
    assert.match(css, /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
});
test('las limpiezas destructivas mantienen confirmación explícita', () => {
    assert.match(ui, /const confirmation = "Se ejecutarán exclusivamente estas operaciones:/);
    assert.match(ui, /if \(!confirm\(confirmation\)\) return/);
});
console.log('DevToolsModalAccessibility: ' + passed + '/' + passed + ' PASS');
