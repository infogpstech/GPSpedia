import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { captureModalViewState, restoreModalViewState, shouldRecordModalTransition, pushModalNavigationContext, popModalNavigationContext } from '../../modalNavigation.js';
const ui=readFileSync(new URL('../../ui.js',import.meta.url),'utf8'),main=readFileSync(new URL('../../main.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../../style.css',import.meta.url),'utf8');
let passed=0;function test(name,fn){fn();passed++;console.log('PASS',name);}
function classes(initial=[]){const s=new Set(initial);return{contains:v=>s.has(v),add:v=>s.add(v),remove:v=>s.delete(v)};}
function button(label,active=false){const panel={scrollHeight:240,style:{},classList:classes(['panel-desplegable'])},arrow={textContent:active?'▲':'▼'};return{textContent:label+(active?' ▲':' ▼'),classList:classes(active?['active']:[]),nextElementSibling:panel,querySelector:q=>q==='.accordion-arrow'?arrow:null,panel,arrow};}
function track(name,left){return{classList:classes([name]),scrollLeft:left};}
function modal(){const detail={scrollTop:0,buttons:[button('Apertura'),button('Posibles problemas',true)],tracks:[track('carousel-track',180),track('pys-models-track',95)],querySelectorAll(q){if(q==='.accordion-btn')return this.buttons;if(q==='.pys-models-track, .carousel-track')return this.tracks;return[];}};return{detail,querySelector:q=>q==='#detalleCompleto'?detail:null};}
test('tarjeta Agregar Problema comparte wrapper y dimensiones con tarjetas relacionadas',()=>{
 assert.ok(ui.includes('cardWrapper.className = "pys-card-wrapper"'));
 assert.ok(ui.includes('function createPysAssociationAddCard'));
 assert.ok(ui.includes('singleCardContainer.appendChild(createPysAssociationAddCard(activeItem, navOptions))'));
 assert.ok(ui.includes('carouselTrack.appendChild(createPysAssociationAddCard(activeItem, navOptions))'));
 assert.ok(css.includes('.pys-card-wrapper {'));
 assert.ok(css.includes('.carousel-container .carousel-track > .pys-card-wrapper {'));
 assert.ok(css.includes('height: 120px;'));
});
test('captures modal scroll, active accordion and both horizontal carousels',()=>{const m=modal();m.detail.scrollTop=420;const s=captureModalViewState(m);assert.equal(s.scrollTop,420);assert.equal(s.accordion.label,'Posibles problemas');assert.deepEqual(s.horizontalScrolls.map(x=>x.scrollLeft),[180,95]);});
test('restores modal scroll, accordion state and carousel positions',()=>{const m=modal();m.detail.scrollTop=0;m.detail.tracks.forEach(x=>x.scrollLeft=0);m.detail.buttons[1].classList.remove('active');const s={scrollTop:350,accordion:{index:1,label:'Posibles problemas'},horizontalScrolls:[{className:'carousel-track',index:0,scrollLeft:160},{className:'pys-models-track',index:1,scrollLeft:80}]};const r=restoreModalViewState(m,s);assert.equal(r.accordionRestored,true);assert.equal(m.detail.scrollTop,350);assert.equal(m.detail.buttons[1].classList.contains('active'),true);assert.equal(m.detail.buttons[1].arrow.textContent,'▲');assert.equal(m.detail.buttons[1].panel.style.maxHeight,'240px');assert.deepEqual(m.detail.tracks.map(x=>x.scrollLeft),[160,80]);});
test('deferred restoration does not reset vertical scroll after asynchronous content arrives',()=>{
 const detail={scrollTop:700,querySelectorAll:()=>[]},empty={querySelector:()=>detail};
 const state={scrollTop:350,accordion:{index:0,label:'Posibles problemas'},horizontalScrolls:[{className:'carousel-track',index:0,scrollLeft:120}]};
 const result=restoreModalViewState(empty,state);
 assert.equal(result.accordionRestored,false);assert.equal(result.pendingHorizontalScrolls.length,1);
 detail.scrollTop=700;
 const deferred={accordion:state.accordion,horizontalScrolls:result.pendingHorizontalScrolls};
 const again=restoreModalViewState(empty,deferred);
 assert.equal(detail.scrollTop,700);assert.equal(again.pendingHorizontalScrolls.length,1);
 assert.match(ui,/pendingAccordion[\s\S]*pendingTracks/);
});
test('records only real modal transitions and suppresses edit/restore rerenders',()=>{
 const origin={type:'pys',item:{id_problem:7},navOptions:{originModal:'vehicle'}};
 assert.equal(shouldRecordModalTransition('corte','pys',true,{fromOriginModal:origin}),true);
 assert.equal(shouldRecordModalTransition('corte','corte',true,{fromOriginModal:origin}),false);
 assert.equal(shouldRecordModalTransition('pys','corte',false,{fromOriginModal:origin}),false);
 assert.equal(shouldRecordModalTransition('pys','corte',true,{fromOriginModal:origin,_restoreFromStack:true}),false);
});
test('nested PyS–vehicle navigation restores exactly one LIFO context at a time',()=>{
 const stack=[],pys={id_problem:1},vehicle={id:22},vehicleOptions={originModal:'pys'};
 assert.equal(pushModalNavigationContext(stack,{type:'pys',item:pys,navOptions:{}},{scrollTop:120}),true);
 assert.equal(pushModalNavigationContext(stack,{type:'vehicle',item:vehicle,navOptions:vehicleOptions},{scrollTop:340}),true);
 const first=popModalNavigationContext(stack);
 assert.equal(first.type,'vehicle');assert.equal(first.item,vehicle);assert.deepEqual(first.navOptions,vehicleOptions);assert.equal(stack.length,1);
 const second=popModalNavigationContext(stack);
 assert.equal(second.type,'pys');assert.equal(second.item,pys);assert.equal(stack.length,0);
 assert.equal(popModalNavigationContext(stack),null);
});
test('keeps navigation options when vehicle and PyS modals are opened from one another',()=>{assert.match(ui,/function createPysCard\([\s\S]*?navigationOptions = \{\}/);assert.match(ui,/navOptions: navigationOptions \|\| \{\}/);assert.match(ui,/createPysCard\(relatedProblems\[0\], 'vehicle',[\s\S]*?\}, navOptions\)/);assert.match(ui,/fromOriginModal:\s*\{\s*type:\s*'pys',[\s\S]*?navOptions: navOptions \|\| \{\}/);});
test('does not push duplicate stack entries when rerendering or editing the same modal',()=>{assert.match(ui,/shouldRecordModalTransition\(targetType,currentType,modalWasVisible,navOptions\)/);assert.match(ui,/if\(navOptions\._restoreFromStack\)return/);assert.match(ui,/mostrarDetalleModal\(editedItemBuffer, true, navOptions\)/);assert.match(ui,/exitModalEditMode\(saveChanges, vehicleId, skipReopen = false, navOptions = \{\}\)/);});
test('manual close and browser popstate share one-level context restoration',()=>{assert.match(ui,/function closeModalToPreviousContext_\(\)/);assert.match(ui,/closeModalToPreviousContext_\(\)/);assert.match(ui,/export function restoreModalNavigationContext\(\)/);assert.match(main,/if\s*\(ui\.restoreModalNavigationContext\(\)\)\s*return/);assert.doesNotMatch(main,/const prevContext = navStack\.pop\(\)/);});
console.log('PysModalNavigation:',passed+'/8 PASS');
