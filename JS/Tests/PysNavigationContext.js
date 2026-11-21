import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../../ui.js', import.meta.url), 'utf8');
let passed = 0;
function test(name, callback) { callback(); passed++; console.log('PASS', name); }
test('single and carousel add cards forward navigation options', () => {
 const matches = source.match(/addPysCard\.onclick = \(\) => openAssociateExistingProblemModal\(activeItem, navOptions\);/g) || [];
 assert.equal(matches.length, 2);
});
test('existing-problem modal preserves options when opening pre-associated creation', () => {
 assert.match(source, /export async function openAssociateExistingProblemModal\(vehicle, navOptions = \{\}\)/);
 assert.match(source, /openAddProblemModal\(vehicle, navOptions\)/);
});
test('new-problem flow accepts and restores the originating navigation context', () => {
 assert.match(source, /export function openAddProblemModal\(preAssociatedVehicle = null, navOptions = \{\}\)/);
 assert.match(source, /renderPosiblesProblemasAccordion\(panel, preAssociatedVehicle, navOptions\)/);
});
test('successful existing-problem association restores the same navigation context', () => {
 assert.match(source, /renderPosiblesProblemasAccordion\(panel, vehicle, navOptions\)/);
});
test('anti-cycle guard remains contextual and association payload is unchanged', () => {
 assert.match(source, /if \(navOptions && navOptions\.originModal === 'pys'\) \{\s*return;\s*\}/);
 assert.match(source, /problemId: p\.id_problem,\s*vehicleId: vehicle\.id/);
});
test('both add-card variants are present and receive the same options', () => {
 const start = source.indexOf('export function renderPosiblesProblemasAccordion');
 const end = source.indexOf('\nexport ', start + 10);
 const section = source.slice(start, end);
 assert.equal((section.match(/openAssociateExistingProblemModal\(activeItem, navOptions\)/g) || []).length, 2);
});
console.log('PysNavigationContext:', passed + '/6 PASS');