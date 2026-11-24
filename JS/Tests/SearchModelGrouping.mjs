import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { groupVehicleSearchResults, resolveVehicleNavigation } from '../Frontend/search-utils.js';
import { pushNavigationState, navigationHistoryStateKey } from '../Frontend/navigationHistory.js';
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
test('sin Trim Level agrupa por tipo de encendido',()=>{const rows=[{...base,versionesAplicables:''},{...base,id:'B',versionesAplicables:'',tipoEncendido:'Botón'}];const x=resolveVehicleNavigation(rows);assert.equal(x.step,'ignition');assert.deepEqual(x.options,['Llave','Botón']);});
test('conserva la opción sin Trim Level cuando coexiste con una versión',()=>{const x=resolveVehicleNavigation([base,{...base,id:'B',versionesAplicables:''}]);assert.equal(x.step,'equipment');assert.deepEqual(x.options,['LE','']);});
test('seleccionar ausencia de Trim Level filtra solo sus registros',()=>{const rows=[base,{...base,id:'B',versionesAplicables:'',tipoEncendido:'Botón'}];const x=resolveVehicleNavigation(rows,'');assert.equal(x.step,'detail');assert.equal(x.records[0].id,'B');});
test('seleccionar una versión con un solo encendido y rango abre detalle',()=>{const x=resolveVehicleNavigation([base,{...base,id:'B',versionesAplicables:'X'}],'LE');assert.equal(x.step,'detail');assert.equal(x.records[0].id,'A');});
test('conserva la opción sin tipo de encendido cuando coexiste con otro tipo',()=>{const rows=[base,{...base,id:'B',tipoEncendido:''}];const x=resolveVehicleNavigation(rows);assert.equal(x.step,'ignition');assert.deepEqual(x.options,['Llave','']);});
test('seleccionar un encendido conserva solo sus registros',()=>{const rows=[base,{...base,id:'B',tipoEncendido:'Botón'}];const x=resolveVehicleNavigation(rows,null,'Botón');assert.equal(x.step,'detail');assert.equal(x.records[0].id,'B');});
test('rango único con un registro abre detalle',()=>assert.equal(resolveVehicleNavigation([base]).step,'detail'));
test('duplicados de rango no seleccionan un registro arbitrario',()=>{const x=resolveVehicleNavigation([base,{...base,id:'B'}]);assert.equal(x.step,'ranges');assert.equal(x.ranges[0].records.length,2);});
test('un rango abierto y otro cerrado son distintos',()=>{const x=resolveVehicleNavigation([{...base,anoHasta:''},{...base,id:'B',anoDesde:2018,anoHasta:2026}]);assert.equal(x.ranges.length,2);});
test('sin versión ni encendido un rango único abre detalle',()=>assert.equal(resolveVehicleNavigation([{...base,versionesAplicables:'',tipoEncendido:''}]).step,'detail'));

const ui=readFileSync('JS/Frontend/ui.js','utf8');
const navigation=readFileSync('JS/Frontend/navigation.js','utf8');
const history=readFileSync('JS/Frontend/navigationHistory.js','utf8');
const main=readFileSync('JS/Frontend/main.js','utf8');
test('la búsqueda renderiza modelos agrupados solo con el nombre y navega con identidad completa',()=>{
    assert.match(ui,/groupVehicleSearchResults\(results\)/);
    assert.match(ui,/navegarADetallesDeModelo\(item\.categoria, item\.marca, item\.modelo\)/);
    assert.doesNotMatch(ui,/configuraciones disponibles/);
    assert.match(ui,/title\.textContent = String\(item\.modelo \|\| ''\)/);
});
test('la selección de versión de equipamiento vuelve a resolver el siguiente nivel',()=>{
    assert.match(ui,/resolverNavegacionModelo_\(categoria, marca, modelo, version\)/);
    assert.match(ui,/decision\.step === 'ignition'/);
    assert.match(ui,/Sin versión de equipamiento/);
});
test('el selector de encendido conserva opciones sin dato y filtra la versión vacía',()=>{
    assert.match(ui,/Sin tipo de encendido/);
    assert.match(ui,/versionEquipamiento === null \|\| versionEquipamiento === undefined/);
});
test('el rango único abre detalle y duplicados se muestran explícitamente',()=>{
    assert.match(ui,/rangeDecision\.step === 'detail'/);
    assert.match(ui,/Registro duplicado/);
});
test('la búsqueda textual no autoabre y VIN inequívoco conserva la apertura',()=>{
    assert.match(navigation,/mostrarResultadosDeBusqueda\(\{ type: resultType, query: textoBusqueda, results: renderResults \}, !isRestoring && isVinQuery && Boolean\(matchedVehicleById\)\)/);
    assert.match(ui,/autoOpen = false/);
});
test('el historial conserva versión, encendido y consulta',()=>{
    for(const field of ['query','versionEquipamiento','tipoEncendido','modelo']) assert.ok(history.includes("'" + field + "'"));
    assert.match(navigation,/level: "busqueda_focused"[\s\S]*?query/);
});
test('popstate reconstruye niveles y vuelve a ejecutar la consulta original',()=>{
    assert.match(main,/popstate/);
    assert.match(main,/case 'tiposEncendido'/);
    assert.match(main,/case 'versionesEquipamiento'/);
    assert.match(main,/case 'versiones'/);
    assert.match(main,/navigation\.filtrarContenido\(state\.query, true\)/);
});

test('cero registros no inventa una versión ni un rango',()=>{
    const x=resolveVehicleNavigation([]);
    assert.equal(x.step,'ranges'); assert.deepEqual(x.records,[]); assert.deepEqual(x.ranges,[]);
});
test('preserva el orden de relevancia al agrupar resultados mixtos',()=>{
    const low={...base,id:'low',_searchPriority:5,_searchOrder:0};
    const high={...base,id:'high',_searchPriority:1,_searchOrder:1};
    const relay={_sectionType:'relay',_searchPriority:2,_searchOrder:2};
    const x=groupVehicleSearchResults([low,relay,high]);
    assert.equal(x[0]._searchGroupType,'vehicleModel');
    assert.equal(x[0].records.length,2);
    assert.equal(x[1]._sectionType,'relay');
});
test('History API conserva la ruta de búsqueda, versión, encendido y rangos',()=>{
    const entries=[{state:{level:'categorias'},url:'/'}]; let index=0;
    const history={
        get state(){return entries[index].state;},
        pushState(state,_title,url){entries.splice(index+1);entries.push({state,url});index++;},
        replaceState(state,_title,url){entries[index]={state,url};},
        back(){if(index>0)index--;},
        forward(){if(index<entries.length-1)index++;}
    };
    const location={pathname:'/catalog',search:'',hash:''};
    const search={level:'busqueda',query:'Toyota Corolla'};
    const equipment={level:'versionesEquipamiento',categoria:'Auto',marca:'Toyota',modelo:'Corolla'};
    const ignition={level:'tiposEncendido',categoria:'Auto',marca:'Toyota',modelo:'Corolla',versionEquipamiento:'LE'};
    const ranges={level:'versiones',categoria:'Auto',marca:'Toyota',modelo:'Corolla',versionEquipamiento:'LE',tipoEncendido:'Llave'};
    pushNavigationState(search,{historyObject:history,locationObject:location,previousNavigationState:{level:'categorias'}});
    pushNavigationState(equipment,{historyObject:history,locationObject:location,previousNavigationState:search});
    assert.deepEqual(history.state[navigationHistoryStateKey],search);
    pushNavigationState(ignition,{historyObject:history,locationObject:location,previousNavigationState:equipment});
    assert.deepEqual(history.state[navigationHistoryStateKey],equipment);
    pushNavigationState(ranges,{historyObject:history,locationObject:location,previousNavigationState:ignition});
    assert.deepEqual(history.state[navigationHistoryStateKey],ignition);
    history.back(); assert.equal(history.state.level,'tiposEncendido');
    history.back(); assert.equal(history.state.level,'versionesEquipamiento');
    history.back(); assert.equal(history.state.level,'busqueda');
    assert.equal(history.state.query,'Toyota Corolla');
    history.forward(); assert.equal(history.state.level,'versionesEquipamiento');
});

console.log('SearchModelGrouping:',passed+'/'+passed+' PASS');
