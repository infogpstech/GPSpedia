import assert from 'node:assert/strict';
import { setState, waitForCatalogReadiness } from '../../state.js';

let passed = 0;
async function run(name, test) {
    await test();
    passed += 1;
    console.log(`PASS: ${name}`);
}

await run('resuelve inmediatamente cuando el catálogo ya está disponible', async () => {
    setState({ catalogLoadStatus: 'ready', catalogLoadError: null, catalogData: { cortes: [] } });
    const result = await waitForCatalogReadiness(50);
    assert.equal(result.status, 'ready');
    assert.deepEqual(result.catalogData.cortes, []);
});

await run('espera el cambio de estado sin polling', async () => {
    setState({ catalogLoadStatus: 'loading', catalogLoadError: null, catalogData: { cortes: [] } });
    const pending = waitForCatalogReadiness(100);
    setTimeout(() => setState({ catalogLoadStatus: 'stale', catalogData: { cortes: [{ id: 'A-1' }] } }), 5);
    const result = await pending;
    assert.equal(result.status, 'stale');
    assert.equal(result.catalogData.cortes[0].id, 'A-1');
});

await run('propaga un estado terminal de error', async () => {
    setState({ catalogLoadStatus: 'error', catalogLoadError: 'Red no disponible.' });
    const result = await waitForCatalogReadiness(50);
    assert.equal(result.status, 'error');
    assert.equal(result.error, 'Red no disponible.');
});

await run('termina con timeout cuando no llega un estado terminal', async () => {
    setState({ catalogLoadStatus: 'loading', catalogLoadError: null });
    const result = await waitForCatalogReadiness(5);
    assert.equal(result.status, 'timeout');
});

console.log(`CatalogReadiness: ${passed}/4 PASS`);
