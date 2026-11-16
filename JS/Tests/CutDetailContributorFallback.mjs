import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../Frontend/ui.js', import.meta.url), 'utf8');
const marker = 'function renderCutContent(';
const start = source.indexOf(marker);
assert.notEqual(start, -1, 'Debe existir el renderizador de cortes del modal.');

const end = source.indexOf('\nfunction renderRelayInfoModal', start);
assert.notEqual(end, -1, 'Debe poder delimitarse el renderizador de cortes.');
const renderCut = source.slice(start, end);

assert.match(
    renderCut,
    /if\s*\(!inEditMode\)\s*\{\s*const collaboratorName = String\(cutData\.colaborador \|\| ''\)\.trim\(\) \|\| 'Comunidad de técnicos';/,
    'Todo corte mostrado fuera del modo edición debe usar Comunidad de técnicos si el colaborador falta o está vacío.'
);
assert.match(
    renderCut,
    /cleanColaboradorName\(collaboratorName\)/,
    'Los nombres existentes deben conservar la normalización de colaborador.'
);
assert.match(
    renderCut,
    /if\s*\(inEditMode\)\s*\{/,
    'El modo edición debe conservar su renderizado independiente y no mostrar una atribución de presentación.'
);

console.log('CutDetailContributorFallback: 3/3 PASS');
