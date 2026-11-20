import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../Services/write.js",import.meta.url),"utf8");
function extract(name,nextName){
 const start=source.indexOf("function "+name+"(");
 assert.ok(start>=0,"No se encontró "+name);
 const end=nextName?source.indexOf("\nfunction "+nextName+"(",start+10):source.indexOf("\nfunction ",start+10);
 assert.ok(end>start,"No se encontró el límite de "+name);
 return source.slice(start,end);
}
const optionsCode=extract("getAddCutPayloadValidationOptions_");
const optionsFn=new Function("COLS_CORTES",optionsCode+"\nreturn getAddCutPayloadValidationOptions_;")({
 categoria:2,tipoEncendido:8,tipoCorte1:12,tipoCorte2:19,tipoCorte3:26
});
const rows=Array.from({length:3},()=>Array(25).fill(""));
rows[0][0]="Moto";rows[0][6]="Llave";rows[0][10]="Ignición";rows[0][17]="Bomba";rows[0][24]="No recomendado";
rows[1][0]="Camioneta";rows[1][6]="Botón";rows[1][10]="Bomba";rows[1][17]="Corte";rows[1][24]="Bomba";
rows[2][0]="Moto";rows[2][6]="Llave";rows[2][10]="Ignición";rows[2][17]="Bomba";rows[2][24]="No recomendado";
const sheetCalls=[],relayCalls=[];
const sheet={getLastRow:()=>4,getLastColumn:()=>48,getRange(...args){
 sheetCalls.push(args);
 if(args.length===2&&args[0]===2&&args[1]===2)return{getDataValidation:()=>null};
 if(args.join(",")==="2,2,3,25")return{getValues:()=>rows};
 throw new Error("Rango Cortes inesperado: "+args.join(","));
}};
const relaySheet={getLastRow:()=>4,getLastColumn:()=>6,getRange(...args){
 relayCalls.push(args);
 if(args.join(",")==="2,2,3,1")return{getValues:()=>[["NC"],["NO"],["NC"]]};
 throw new Error("Rango Relay inesperado: "+args.join(","));
}};
const lists=optionsFn(sheet,relaySheet);
assert.deepEqual(lists.categoria,["Moto","Camioneta"]);
assert.deepEqual(lists.tipoEncendido,["Llave","Botón"]);
assert.deepEqual(lists.tipoDeCorte,["Ignición","Bomba","No recomendado","Corte"]);
assert.deepEqual(lists.configRelay,["NC","NO"]);
assert.deepEqual(sheetCalls,[[2,2,3,25],[2,2]],"Cortes solo debe leer columnas 2 a 26 y la regla de categoría");
assert.deepEqual(relayCalls,[[2,2,3,1]],"Relay solo debe leer su columna de configuración");
const preflight=extract("prepareAddOrUpdateCutRequest_","handleAddOrUpdateCut");
const preflightFn=new Function("getAuthenticatedCollaborator","getSpreadsheet","SHEET_NAMES","getAddCutPayloadValidationOptions_","validateAddOrUpdateCutPayload_",preflight+"\nreturn prepareAddOrUpdateCutRequest_;")(
 (payload,roles)=>{assert.equal(payload.userId,"U1");assert.deepEqual(roles,undefined);return "Técnico";},
 ()=>({getSheetByName:name=>({name})}),
 {CORTES:"Cortes"},
 ()=>({categoria:["Moto"],tipoEncendido:["Llave"],tipoDeCorte:["Ignición"],configRelay:["NC"]}),
 payload=>({validated:true,payload})
);
const prepared=preflightFn({userId:"U1",cutData:{}});
assert.equal(prepared.collaboratorName,"Técnico");
assert.equal(prepared.validatedPayload.validated,true);
assert.equal(prepared.sheet.name,"Cortes");
const wrapper=extract("handleAddOrUpdateCut","handleAddOrUpdateCutLocked");
const events=[];
const wrapperFn=new Function("prepareAddOrUpdateCutRequest_","getWriteContributionLock_","handleAddOrUpdateCutLocked","nextWriteCatalogVersionLocked_","Logger",wrapper+"\nreturn handleAddOrUpdateCut;")(
 ()=>{events.push("preflight");return{ready:true,validatedPayload:{vehicleId:"V1"}};},
 ()=>({tryLock(ms){assert.equal(ms,0);events.push("lock");return true;},hasLock:()=>true,releaseLock(){events.push("release");}}),
 preparedRequest=>{assert.equal(preparedRequest.ready,true);events.push("persist");return{status:"success",vehicleId:"22"};},
 ()=>7,{log(){}}
);
const result=wrapperFn({});
assert.equal(result.catalogVersion,7);
assert.deepEqual(events,["preflight","lock","persist","release"],"La preparación debe terminar antes de adquirir el lock");
console.log("WriteCutPreflightOutsideLock: 1/1 PASS — validación fuera del lock y rangos acotados Cortes/Relay");
