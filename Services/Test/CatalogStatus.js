import assert from 'node:assert/strict';
import { getCatalogStatusView } from '../../catalogStatus.js';

let passed = 0;
function run(name, testCase) {
    testCase();
    passed += 1;
    console.log('PASS: ' + name);
}

run('loading muestra estado informativo sin reintento', () => {
    const view = getCatalogStatusView('loading');
    assert.equal(view.visible, true);
    assert.equal(view.retryable, false);
    assert.match(view.message, /Cargando catálogo/);
});
run('stale conserva los datos y advierte que pueden estar desactualizados', () => {
    const view = getCatalogStatusView('stale');
    assert.equal(view.visible, true);
    assert.equal(view.status, 'stale');
    assert.equal(view.retryable, true);
    assert.match(view.message, /guardados/);
    assert.match(view.message, /desactualizados/);
});
run('error sin caché ofrece una acción recuperable', () => {
    const view = getCatalogStatusView('error');
    assert.equal(view.visible, true);
    assert.equal(view.retryable, true);
    assert.match(view.message, /vuelve a intentarlo/);
});
run('ready e idle ocultan el aviso', () => {
    for (const status of ['ready', 'idle', null, undefined]) {
        assert.equal(getCatalogStatusView(status).visible, false);
    }
});
console.log('CatalogStatus: ' + passed + '/4 PASS');
