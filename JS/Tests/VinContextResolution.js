import assert from 'node:assert/strict';
import { VinDifferentialEngine } from '../../VinDifferentialEngine.js';
const engine=new VinDifferentialEngine(),common={vinLength:17,positions:[0],values:['J'],confidence:100,status:'validada'};
engine.signatures=new Map([
['A',{...common,classKey:'A',marca:'Toyota',modelo:'Corolla',anoDesde:2018,anoHasta:2022,rangoAnos:'2018-2022',version:'LE'}],
['B',{...common,classKey:'B',marca:'Toyota',modelo:'Corolla',anoDesde:2023,anoHasta:2025,rangoAnos:'2023-2025',version:'XLE'}],
['C',{...common,classKey:'C',marca:'Honda',modelo:'Civic',anoDesde:2018,anoHasta:2022,rangoAnos:'2018-2022',version:'EX'}]
]);
const vin='J1234567890123456';let passed=0;function test(n,f){f();passed++;console.log('PASS',n);}
test('classKey exacto',()=>{const r=engine.queryVehicle({vin,context:{classKey:'A'}});assert.equal(r.identificationType,'completa');assert.equal(r.match.version,'LE');});
test('marca/modelo normalizados',()=>{const r=engine.queryVehicle({vin,context:{marca:' toyota ',modelo:' corol-la '}});assert.equal(r.identificationType,'ambigua');assert.equal(r.matches.length,2);});
test('año dentro del rango',()=>{const r=engine.queryVehicle({vin,context:{ano:2024}});assert.equal(r.identificationType,'completa');assert.equal(r.match.version,'XLE');});
test('versión',()=>{const r=engine.queryVehicle({vin,context:{marca:'Toyota',modelo:'Corolla',version:'XLE'}});assert.equal(r.identificationType,'completa');assert.equal(r.match.version,'XLE');});
test('rechaza contexto contradictorio con una única coincidencia',()=>{const x=new VinDifferentialEngine();x.signatures.set('A',{...common,classKey:'A',marca:'Toyota',modelo:'Corolla',version:'LE'});const r=x.queryVehicle({vin,context:{marca:'Ford'}});assert.equal(r.identificationType,'sin_coincidencias');});
test('mantiene ambigüedad con contexto insuficiente',()=>{const r=engine.queryVehicle({vin,context:{marca:'Toyota'}});assert.equal(r.identificationType,'ambigua');assert.equal(r.matches.length,2);});
console.log('VIN context resolution:',passed,'/ 6');
