import assert from 'node:assert/strict';
import { decodeSearchHash } from '../../search-utils.js';
import { readFileSync } from 'node:fs';
import {
    pushNavigationState,
    replaceNavigationState,
    navigateBackToState,
    navigationHistoryStateKey,
    sameNavigationState
} from '../../navigationHistory.js';

function createFakeHistory(initialState = { level: 'categorias' }) {
    const entries = [{ state: initialState, url: '/' }];
    let index = 0;
    let backCalls = 0;
    let pushCalls = 0;
    let replaceCalls = 0;
    return {
        get state() { return entries[index].state; },
        get index() { return index; },
        get entries() { return entries; },
        get backCalls() { return backCalls; },
        get pushCalls() { return pushCalls; },
        get replaceCalls() { return replaceCalls; },
        pushState(state, _title, url) {
            entries.splice(index + 1);
            entries.push({ state, url });
            index++;
            pushCalls++;
        },
        replaceState(state, _title, url) {
            entries[index] = { state, url };
            replaceCalls++;
        },
        back() {
            backCalls++;
            if (index > 0) index--;
        },
        forward() {
            if (index < entries.length - 1) index++;
        }
    };
}

const locationObject = { pathname: '/catalog', search: '?mode=all' };
let passed = 0;
function test(name, callback) {
    callback();
    passed++;
    console.log('PASS', name);
}

test('push stores the exact previous navigation context', () => {
    const history = createFakeHistory({ level: 'categorias' });
    const action = pushNavigationState(
        { level: 'marcas', categoria: 'Autos', origin: 'categoria' },
        { historyObject: history, locationObject, previousNavigationState: { level: 'categorias' } }
    );
    assert.equal(action, 'push');
    assert.deepEqual(history.state[navigationHistoryStateKey], { level: 'categorias' });
});

test('internal back uses native history when the previous entry is the requested target', () => {
    const history = createFakeHistory({ level: 'categorias' });
    pushNavigationState(
        { level: 'marcas', categoria: 'Autos', origin: 'categoria' },
        { historyObject: history, locationObject, previousNavigationState: { level: 'categorias' } }
    );
    const action = navigateBackToState(
        { level: 'categorias' },
        { historyObject: history, locationObject }
    );
    assert.equal(action, 'back');
    assert.equal(history.backCalls, 1);
    assert.equal(history.index, 0);
    assert.equal(history.state.level, 'categorias');
});

test('fallback replaces the current entry and renders without adding a history entry', () => {
    const history = createFakeHistory({ level: 'categorias' });
    pushNavigationState(
        { level: 'modelos', categoria: 'Autos', marca: 'Toyota', origin: 'categoria' },
        { historyObject: history, locationObject, previousNavigationState: { level: 'categorias' } }
    );
    let rendered = null;
    const action = navigateBackToState(
        { level: 'marcas', categoria: 'Autos', origin: 'categoria' },
        {
            historyObject: history,
            locationObject,
            renderFallback: state => { rendered = state; }
        }
    );
    assert.equal(action, 'replace');
    assert.equal(history.entries.length, 2);
    assert.equal(history.state.level, 'marcas');
    assert.deepEqual(rendered, {
        level: 'marcas',
        categoria: 'Autos',
        origin: 'categoria',
        previousState: { level: 'categorias' }
    });
});

test('same level with different parameters creates a distinct entry', () => {
    const history = createFakeHistory({ level: 'marcas', categoria: 'Autos' });
    const action = pushNavigationState(
        { level: 'marcas', categoria: 'Motocicletas' },
        { historyObject: history, locationObject, previousNavigationState: history.state }
    );
    assert.equal(action, 'push');
    assert.equal(history.entries.length, 2);
    assert.equal(history.state.categoria, 'Motocicletas');
});

test('reopening the same navigation state replaces instead of duplicating', () => {
    const history = createFakeHistory({ level: 'marcas', categoria: 'Autos' });
    const action = pushNavigationState(
        { level: 'marcas', categoria: 'Autos' },
        { historyObject: history, locationObject, previousNavigationState: { level: 'categorias' } }
    );
    assert.equal(action, 'replace');
    assert.equal(history.entries.length, 1);
});

test('search focus and blur keep one entry with query and original ancestry', () => {
    const history = createFakeHistory({ level: 'categorias' });
    pushNavigationState(
        { level: 'busqueda_focused', query: 'Toyota' },
        { historyObject: history, locationObject, previousNavigationState: { level: 'categorias' } }
    );
    replaceNavigationState(
        { level: 'busqueda', query: 'Toyota' },
        { historyObject: history, locationObject }
    );
    assert.equal(history.entries.length, 2);
    assert.equal(history.state.query, 'Toyota');
    assert.deepEqual(history.state[navigationHistoryStateKey], { level: 'categorias' });
    assert.equal(navigateBackToState(
        { level: 'categorias' },
        { historyObject: history, locationObject }
    ), 'back');
    assert.equal(history.state.level, 'categorias');
});

test('native back while search is focused restores one unfocused search entry', () => {
    const history = createFakeHistory({ level: 'categorias' });
    pushNavigationState(
        { level: 'busqueda_focused', query: 'Toyota' },
        { historyObject: history, locationObject, previousNavigationState: { level: 'categorias' } }
    );
    history.back();
    pushNavigationState(
        { level: 'busqueda', query: 'Toyota' },
        { historyObject: history, locationObject, previousNavigationState: { level: 'categorias' } }
    );
    assert.equal(history.entries.length, 2);
    assert.equal(history.state.level, 'busqueda');
    assert.deepEqual(history.state[navigationHistoryStateKey], { level: 'categorias' });
    history.back();
    assert.equal(history.state.level, 'categorias');
});

test('category, brand, model, equipment and ignition fields are compared', () => {
    assert.equal(sameNavigationState(
        { level: 'versiones', categoria: 'Autos', marca: 'Toyota', modelo: 'Yaris', versionEquipamiento: 'X', tipoEncendido: 'Push' },
        { level: 'versiones', categoria: 'Autos', marca: 'Toyota', modelo: 'Yaris', versionEquipamiento: 'X', tipoEncendido: 'Push' }
    ), true);
    assert.equal(sameNavigationState(
        { level: 'versiones', categoria: 'Autos', marca: 'Toyota', modelo: 'Yaris', versionEquipamiento: 'X', tipoEncendido: 'Push' },
        { level: 'versiones', categoria: 'Autos', marca: 'Toyota', modelo: 'Yaris', versionEquipamiento: 'X', tipoEncendido: 'Key' }
    ), false);
    assert.equal(sameNavigationState(
        { level: 'modelos', categoria: 'Autos', marca: 'Toyota', origin: 'categoria' },
        { level: 'modelos', categoria: 'Autos', marca: 'Toyota', origin: 'marca' }
    ), false);
});

test('search fallback restores the deep-link hash', () => {
    const history = createFakeHistory({ level: 'modelos', categoria: 'Autos', marca: 'Toyota' });
    navigateBackToState(
        { level: 'busqueda', query: 'Toyota Hilux' },
        {
            historyObject: history,
            locationObject,
            renderFallback: () => {}
        }
    );
    assert.equal(history.state.level, 'busqueda');
    assert.equal(history.entries[0].url, '/catalog?mode=all#search=Toyota%20Hilux');
});

test('reselecting the active section replaces instead of duplicating', () => {
    const history = createFakeHistory({ section: 'tutoriales' });
    const action = pushNavigationState(
        { section: 'tutoriales' },
        { historyObject: history, locationObject }
    );
    assert.equal(action, 'replace');
    assert.equal(history.entries.length, 1);
    assert.equal(history.entries[0].url, '/catalog?mode=all#tutoriales');
});

test('section back and forward restore the adjacent section entries', () => {
    const history = createFakeHistory({ section: 'cortes' });
    pushNavigationState(
        { section: 'tutoriales' },
        { historyObject: history, locationObject, previousNavigationState: { section: 'cortes' } }
    );
    assert.equal(navigateBackToState(
        { section: 'cortes' },
        { historyObject: history, locationObject }
    ), 'back');
    assert.equal(history.state.section, 'cortes');
    history.forward();
    assert.equal(history.state.section, 'tutoriales');
});

test('main focus and blur handlers do not create paired duplicate search entries', () => {
    const mainSource = readFileSync(new URL('../../main.js', import.meta.url), 'utf8');
    const focusStart = mainSource.indexOf("searchInput.addEventListener('focus'");
    const blurStart = mainSource.indexOf("searchInput.addEventListener('blur'", focusStart);
    const focusSource = mainSource.slice(focusStart, blurStart);
    assert.match(focusSource, /if \(currentState\.level === 'busqueda' \|\| currentState\.level === 'busqueda_focused'\) \{\s*replaceNavigationState\(focusedState/);
    assert.doesNotMatch(focusSource, /pushNavigationState\(searchState/);
    assert.match(mainSource, /pushNavigationState\(searchState, \{ previousNavigationState: currentNavState\.previousState \}\)/);
});

test('all catalog back buttons use the centralized operation', () => {
    const uiSource = readFileSync(new URL('../../ui.js', import.meta.url), 'utf8');
    assert.equal((uiSource.match(/renderNavigationBackButton\(cont,/g) || []).length, 6);
    assert.match(uiSource, /button\.addEventListener\('click', \(\) => volverAEstado\(targetState\)\)/);
});

test('empty and no-result searches retain their query ancestry before rendering', () => {
    const navigationSource = readFileSync(new URL('../../navigation.js', import.meta.url), 'utf8');
    const syncIndex = navigationSource.indexOf('syncSearchNavigationState_(textoBusqueda, isRestoring)');
    const noResultsIndex = navigationSource.indexOf('if (datosFiltrados.length === 0)');
    assert.ok(syncIndex >= 0 && noResultsIndex > syncIndex);
    assert.match(navigationSource, /function syncSearchNavigationState_\(query, isRestoring\)/);
    assert.match(navigationSource, /const emptySearchState = \{ level, query: "", previousState: previousNavigationState \}/);
});

test('vehicle detail shortcuts preserve the previous navigation context', () => {
    const uiSource = readFileSync(new URL('../../ui.js', import.meta.url), 'utf8');
    assert.equal((uiSource.match(/replaceNavigationState\(targetState, \{ previousNavigationState \}\)/g) || []).length, 2);
    assert.match(uiSource, /previousState: previousNavigationState/);
});

test('native popstate restores previous navigation metadata and section states', () => {
    const mainSource = readFileSync(new URL('../../main.js', import.meta.url), 'utf8');
    const uiSource = readFileSync(new URL('../../ui.js', import.meta.url), 'utf8');
    assert.match(mainSource, /\[navigationHistoryStateKey\]: previousNavigationState/);
    assert.match(mainSource, /case 'busqueda_focused':/);
    assert.match(mainSource, /if \(state\.section\)/);
    assert.match(uiSource, /pushNavigationState\(\{ section: sectionName \}/);
});

test('multi-level back and forward traversal does not create a loop', () => {
    const history = createFakeHistory({ level: 'categorias' });
    pushNavigationState(
        { level: 'marcas', categoria: 'Autos', origin: 'categoria' },
        { historyObject: history, locationObject, previousNavigationState: { level: 'categorias' } }
    );
    pushNavigationState(
        { level: 'modelos', categoria: 'Autos', marca: 'Toyota', origin: 'categoria' },
        { historyObject: history, locationObject, previousNavigationState: history.state }
    );
    pushNavigationState(
        { level: 'tiposEncendido', categoria: 'Autos', marca: 'Toyota', modelo: 'Yaris', origin: 'categoria' },
        { historyObject: history, locationObject, previousNavigationState: history.state }
    );
    pushNavigationState(
        { level: 'versiones', categoria: 'Autos', marca: 'Toyota', modelo: 'Yaris', tipoEncendido: 'Push', origin: 'categoria' },
        { historyObject: history, locationObject, previousNavigationState: history.state }
    );
    assert.equal(navigateBackToState(
        { level: 'tiposEncendido', categoria: 'Autos', marca: 'Toyota', modelo: 'Yaris', origin: 'categoria' },
        { historyObject: history, locationObject }
    ), 'back');
    assert.equal(history.state.level, 'tiposEncendido');
    history.forward();
    assert.equal(history.state.level, 'versiones');
    assert.equal(navigateBackToState(
        { level: 'tiposEncendido', categoria: 'Autos', marca: 'Toyota', modelo: 'Yaris', origin: 'categoria' },
        { historyObject: history, locationObject }
    ), 'back');
    assert.equal(history.state.level, 'tiposEncendido');
    assert.equal(history.entries.length, 5);
});

test('fallback rendering does not push a duplicate when optional dimensions normalize to null', () => {
    assert.equal(sameNavigationState(
        { level: 'modelos', categoria: 'Autos', marca: 'Toyota' },
        { level: 'modelos', categoria: 'Autos', marca: 'Toyota', versionEquipamiento: null }
    ), true);
    assert.equal(sameNavigationState(
        { level: 'versiones', tipoEncendido: 'Push' },
        { level: 'versiones', tipoEncendido: null }
    ), false);

    const history = createFakeHistory({
        level: 'versiones',
        categoria: 'Autos',
        marca: 'Toyota',
        modelo: 'Yaris'
    });
    const target = { level: 'modelos', categoria: 'Autos', marca: 'Toyota', origin: 'categoria' };
    const action = navigateBackToState(target, {
        historyObject: history,
        locationObject,
        previousNavigationState: { level: 'versiones', categoria: 'Autos', marca: 'Toyota', modelo: 'Yaris' },
        renderFallback: state => {
            // mostrarModelos completa la dimensión opcional ausente con null al reconstruir la vista.
            pushNavigationState({
                level: 'modelos',
                categoria: 'Autos',
                marca: 'Toyota',
                versionEquipamiento: null,
                origin: 'categoria',
                previousState: state.previousState
            }, {
                historyObject: history,
                locationObject,
                previousNavigationState: state.previousState
            });
        }
    });
    assert.equal(action, 'replace');
    assert.equal(history.entries.length, 1);
    assert.equal(history.pushCalls, 0);
    assert.equal(history.replaceCalls, 2);
});

test('fallback keeps the destination ancestry instead of stale current metadata', () => {
    const history = createFakeHistory({ level: 'categorias' });
    pushNavigationState(
        { level: 'modelos', categoria: 'Autos', marca: 'Toyota' },
        { historyObject: history, locationObject }
    );
    history.entries[history.index].state[navigationHistoryStateKey] = {
        level: 'versiones', categoria: 'Autos', marca: 'Toyota', modelo: 'Yaris'
    };
    const action = navigateBackToState(
        { level: 'marcas', categoria: 'Autos', previousState: { level: 'categorias' } },
        { historyObject: history, locationObject }
    );
    assert.equal(action, 'replace');
    assert.deepEqual(history.state[navigationHistoryStateKey], { level: 'categorias' });
    history.back();
    assert.equal(history.state.level, 'categorias');
});

test('section rendering synchronizes the in-memory navigation context with History API', () => {
    const uiSource = readFileSync(new URL('../../ui.js', import.meta.url), 'utf8');
    assert.match(uiSource, /pickNavigationState\(activeHistoryState\[navigationHistoryStateKey\]\)/);
    assert.match(uiSource, /setState\(\{ navigationState: \{ section: sectionName, previousState: parentNavigationState \|\| null \} \}\)/);
    assert.match(uiSource, /pushNavigationState\(\{ section: sectionName \}, \{ previousNavigationState \}\)/);
});

test('search deep links round-trip reserved characters and malformed escapes remain recoverable', () => {
    const query = 'Toyota Hilux 2025 + edición';
    assert.equal(decodeSearchHash('#search=' + encodeURIComponent(query)), query);
    assert.equal(decodeSearchHash('#search=%E0%A4%A'), '%E0%A4%A');
});

console.log('NavigationBackHistory:', passed + '/21 PASS');
