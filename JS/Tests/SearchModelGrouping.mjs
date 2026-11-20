import assert from 'node:assert/strict';
import { groupVehicleSearchResults, resolveVehicleNavigation } from '../Frontend/search-utils.js';
let passed=0; function test(name,fn){fn();passed++;console.log('PASS',name);}
const base={_sectionType:'corte',categoria:'Auto',marca:'Toyota',modelo:'Corolla',versionesAplicables:'LE',tipoEncendido:'Llave',anoDesde:2018,anoHasta:2022,id:'A'};
test('agrupa por categoría+marca+modelo',()=>{const x=groupVehicleSearchResults([base,{...base,id:'B',anoDesde:2023,anoHasta:2025}]);assert.equal(x.length,1);assert.equal(x[0].records.length,2);});
test('separa misma denominación por marca y categoría',()=>assert.equal(groupVehicleSearchResults([base,{...base,marca:'Honda'},{...base,categoria:'Camioneta'}]).length,3));
test('no agrupa Relay, Tutoriales ni PyS',()=>{const x=groupVehicleSearchResults([base,{_sectionType:'relay'},{_sectionType:'tutorial'},{_sectionType:'pys'}]);assert.deepEqual(x.slice(1).map(v=>v._sectionType),['relay','tutorial','pys']);});
test('mantiene cada opción VIN ambigua',()=>assert.equal(groupVehicleSearchResults([{...base,_vinAmbiguousChoice:true},{...base,id:'B',_vinAmbiguousChoice:true}]).length,2));
test('varias versiones muestran equipamiento',()=>{const x=resolveVehicleNavigation([base,{...base,versionesAplicables:'X'}]);assert.equal(x.step,'equipment');assert.deepEqual(x.options,['LE','X']);});
test('una versión y varios encendidos muestran encendido',()=>{const x=resolveVehicleNavigation([base,{...base,id:'B',tipoEncendido:'Botón'}]);assert.equal(x.step,'ignition');});
test('tras elegir versión vuelve a evaluar encendidos',()=>{const x=resolveVehicleNavigation([base,{...base,id:'B',tipoEncendido:'Botón'},{...base,id:'C',versionesAplicables:'X'}],'LE');assert.equal(x.step,'ignition');assert.equal(x.version,'LE');});
test('una versión y un encendido omiten selectores y muestran rangos',()=>{const x=resolveVehicleNavigation([base,{...base,id:'B',anoDesde:2023,anoHasta:2025}]);assert.equal(x.step,'ranges');assert.equal(x.ranges.length,2);});
test('rango único con un registro abre detalle',()=>assert.equal(resolveVehicleNavigation([base]).step,'detail'));
test('duplicados de rango no seleccionan un registro arbitrario',()=>{const x=resolveVehicleNavigation([base,{...base,id:'B'}]);assert.equal(x.step,'ranges');assert.equal(x.ranges[0].records.length,2);});
test('un rango abierto y otro cerrado son distintos',()=>{const x=resolveVehicleNavigation([{...base,anoHasta:''},{...base,id:'B',anoDesde:2018,anoHasta:2026}]);assert.equal(x.ranges.length,2);});
test('sin versión ni encendido un rango único abre detalle',()=>assert.equal(resolveVehicleNavigation([{...base,versionesAplicables:'',tipoEncendido:''}]).step,'detail'));
console.log('SearchModelGrouping:',passed+'/'+passed+' PASS');
