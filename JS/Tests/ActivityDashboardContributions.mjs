import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeContributionRows, renderActivityContributions } from "../Frontend/activityDashboard.js";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const fb=readFileSync(resolve(root,"JS/Services/feedback.js"),"utf8");
const dash=readFileSync(resolve(root,"JS/Frontend/activityDashboard.js"),"utf8");
const ui=readFileSync(resolve(root,"JS/Frontend/ui.js"),"utf8");
const html=readFileSync(resolve(root,"index.html"),"utf8");
const helperStart=fb.indexOf("function readActivityDashboardCutsSnapshot_()");
const helper=fb.slice(helperStart,fb.indexOf("\nfunction handleRecordVehicleView",helperStart));
assert.match(fb,/contributions:buildCutContributionSummary_\(cutsSnapshot\)/);
const columns={id:1,marca:3,modelo:4,tipoCorte1:12,colaboradorCorte1:18,tipoCorte2:19,colaboradorCorte2:25,tipoCorte3:26,colaboradorCorte3:32};
const makeRow=(id,slots)=>{const row=Array(32).fill("");row[0]=id;slots.forEach(([type,person],slot)=>{row[[12,19,26][slot]-1]=type;row[[18,25,32][slot]-1]=person;});return row;};
const cortesRows=[Array(32).fill("header"),makeRow("V1",[["Corte","Ana"],["Corte","Luis"]]),makeRow("V2",[["Corte","Ana"],["",""],["Corte","Carlos M."]]),makeRow("V3",[["Corte","ana"]]),makeRow("V4",[["Corte",""]])];
const userRows=[Array(8).fill("header"),["U1","ana","","","","","Ana",""],["U2","__deleted__:user-two","","","","","",""],["U3","luis","","","","","Luis",""]];
const ledgerHeaders=["eventId","opId","vehicleId","operationHash","kind","payloadJson","actorId","actorName","createdAt","status","supersedesEventId"];
const ledgerEvent=(eventId,opId,vehicleId,hash,kind,payload,actorId,actorName,status="accepted")=>[eventId,opId,vehicleId,hash,kind,JSON.stringify(payload),actorId,actorName,"2026-11-22T12:00:00.000Z",status,""];
const ledgerRows=[ledgerHeaders,
 ledgerEvent("EV-OPEN-1","OP-OPEN-1","V1","a".repeat(64),"opening",{text:"IGN"},"U1","Ana"),
 ledgerEvent("EV-OPEN-1-DUP","OP-OPEN-1","V1","a".repeat(64),"opening",{text:"IGN"},"U1","Ana"),
 ledgerEvent("EV-FEED-1","OP-FEED-1","V3","b".repeat(64),"feed",{text:"12V"},"U2","Carlos"),
 ledgerEvent("EV-CUT-USER2","OP-CUT-USER2","V2","f".repeat(64),"cut",{text:"Corte"},"U2","Carlos M."),
 ledgerEvent("EV-CONFLICT-1","OP-CONFLICT","V1","c".repeat(64),"feed",{text:"12V"},"U1","Ana"),
 ledgerEvent("EV-CONFLICT-2","OP-CONFLICT","V1","c".repeat(64),"feed",{text:"24V"},"U1","Ana"),
 ledgerEvent("EV-REJECTED","OP-REJECTED","V3","d".repeat(64),"feed",{text:"12V"},"U1","Ana","rejected"),
 ledgerEvent("EV-CUT","OP-CUT","V3","e".repeat(64),"cut",{text:"Corte"},"U1","Ana")];
const sheet=rows=>({getLastRow:()=>rows.length,getLastColumn:()=>rows[0].length,getRange:(r,c,n,w)=>({getValues:()=>rows.slice(r-1,r-1+n).map(row=>row.slice(c-1,c-1+w))})});
const ss={getSheetByName:name=>name==="Cortes"?sheet(cortesRows):name==="Users"?sheet(userRows):name==="AportesVehiculo"?sheet(ledgerRows):null};
const dashboard=new Function("getSpreadsheet","SHEET_NAMES","COLS_CORTES","COLS_FEEDBACKS",helper+";return {buildCutContributionSummary_,readActivityDashboardCutsSnapshot_};")(()=>ss,{CORTES:"Cortes",FEEDBACKS:"Feedbacks"},columns,{ID:1,Usuario:2,ID_vehiculo:3,Problema:4,Respuesta:5,anoSugerido:9});
const aggregate=dashboard.buildCutContributionSummary_();
assert.deepEqual(aggregate,[
 {userId:"U1",nombreUsuario:"Ana",cortesAportados:3,aportesApertura:1,aportesAlimentacion:0,aportesRegistrados:4,vehiculosConAportes:3},
 {userId:"U2",nombreUsuario:"Carlos M.",cortesAportados:1,aportesApertura:0,aportesAlimentacion:1,aportesRegistrados:2,vehiculosConAportes:2},
 {userId:"",nombreUsuario:"Comunidad de técnicos",cortesAportados:1,aportesApertura:0,aportesAlimentacion:0,aportesRegistrados:1,vehiculosConAportes:1},
 {userId:"U3",nombreUsuario:"Luis",cortesAportados:1,aportesApertura:0,aportesAlimentacion:0,aportesRegistrados:1,vehiculosConAportes:1}
]);
const deletedUserStats=aggregate.find(row=>row.userId==="U2");
assert.equal(deletedUserStats.nombreUsuario,"Carlos M.","El ledger debe conservar el nombre histórico del usuario eliminado.");
assert.equal(deletedUserStats.aportesAlimentacion,1,"Los aliases del mismo actor deben compartir la estadística.");
assert.equal(deletedUserStats.vehiculosConAportes,2,"Los vehículos del usuario se cuentan una sola vez por ID.");
assert.ok(helper.includes('||"Comunidad de técnicos"'));
assert.ok(helper.includes('.replace(/\\s*\\([^)]*\\)/g," ")'));
assert.match(dash,/export function renderActivityContributions/);
assert.match(ui,/renderActivityContributions\(contributionContainer/);
assert.match(html,/data-activity-tab="contributions"/);
assert.match(html,/id="activity-contributions"/);
assert.match(html,/Aportes registrados/);
const normalized=normalizeContributionRows([
 {nombreUsuario:"Pablo Peña.<br>PABLO PENA <br> María López",cortesAportados:2,vehiculosConAportes:1},
 {nombreUsuario:"pablo pena .",cortesAportados:3,vehiculosConAportes:2},
 {nombreUsuario:"MÁRIA   LÓPEZ.",cortesAportados:1,vehiculosConAportes:1},
 {nombreUsuario:"<b>JOSE</b> <i>GARCIA</i>",cortesAportados:1,vehiculosConAportes:1},
 {nombreUsuario:"Pablo Peña.<br><script>alert('x')</script>",cortesAportados:1,vehiculosConAportes:1},
 {nombreUsuario:"Byron Lopez (apert)",cortesAportados:2,vehiculosConAportes:1},
 {nombreUsuario:"BYRON LÓPEZ (corte)",cortesAportados:3,vehiculosConAportes:2},
 {nombreUsuario:"Comunidad Internacional de técnicos",cortesAportados:2,vehiculosConAportes:1},
 {nombreUsuario:"Comunidad de técnicos.",cortesAportados:1,vehiculosConAportes:1},
 {nombreUsuario:"",cortesAportados:1,vehiculosConAportes:1}
]);
assert.deepEqual(normalized,[
 {nombreUsuario:"Pablo Peña",cortesAportados:6,vehiculosConAportes:2},
 {nombreUsuario:"Byron Lopez",cortesAportados:5,vehiculosConAportes:2},
 {nombreUsuario:"Comunidad de técnicos",cortesAportados:3,vehiculosConAportes:1},
 {nombreUsuario:"María López",cortesAportados:3,vehiculosConAportes:1},
 {nombreUsuario:"Jose Garcia",cortesAportados:1,vehiculosConAportes:1}
]);
class FakeElement {
 constructor(tag){this.tagName=tag;this.children=[];this.textContent="";this.ownerDocument=null;}
 appendChild(child){this.children.push(child);return child;}
 replaceChildren(){this.children=[];}
}
const doc={createElement(tag){const node=new FakeElement(tag);node.ownerDocument=doc;return node;}};
const tbody=new FakeElement("tbody");tbody.ownerDocument=doc;
renderActivityContributions(tbody,[{nombreUsuario:"pAbLo pEñA.<br>PABLO PENA",cortesAportados:2,vehiculosConAportes:1}],doc);
assert.equal(tbody.children.length,1);
assert.deepEqual(tbody.children[0].children.map(cell=>cell.textContent),["Pablo Peña","2","1"]);

const sharedContributors = normalizeContributionRows([
 {nombreUsuario:"Pablo Peña, Byron Lopez",cortesAportados:2,vehiculosConAportes:1},
 {nombreUsuario:"Byron Lopez, Pablo Peña",cortesAportados:3,vehiculosConAportes:2}
]);
assert.deepEqual(sharedContributors,[
 {nombreUsuario:"Byron Lopez",cortesAportados:5,vehiculosConAportes:2},
 {nombreUsuario:"Pablo Peña",cortesAportados:5,vehiculosConAportes:2}
]);
const ledgerOnlyDashboard=new Function("getSpreadsheet","SHEET_NAMES","COLS_CORTES","COLS_FEEDBACKS",helper+";return {buildCutContributionSummary_};")(()=>ss,{CORTES:"Cortes",FEEDBACKS:"Feedbacks"},columns,{ID:1,Usuario:2,ID_vehiculo:3,Problema:4,Respuesta:5,anoSugerido:9});
const ledgerOnly=ledgerOnlyDashboard.buildCutContributionSummary_({sheet:null,count:0,baseRows:[],slotColumns:[],slotValues:[]});
assert.equal(ledgerOnly.length,2,"El ledger debe aportar datos aunque Cortes esté vacío.");
assert.equal(ledgerOnly.find(row=>row.userId==="U1").aportesRegistrados,1);
const byIdentity=normalizeContributionRows([
 {userId:"U1",nombreUsuario:"Pablo Peña",aportesRegistrados:2,vehiculosConAportes:1},
 {userId:"U1",nombreUsuario:"PABLO PENA",aportesRegistrados:3,vehiculosConAportes:2},
 {userId:"U2",nombreUsuario:"Pablo Peña",aportesRegistrados:4,vehiculosConAportes:1}
]);
assert.deepEqual(byIdentity,[
 {nombreUsuario:"Pablo Peña",cortesAportados:5,vehiculosConAportes:2},
 {nombreUsuario:"Pablo Peña",cortesAportados:4,vehiculosConAportes:1}
]);
const ambiguousUsers=[Array(8).fill("header"),["U1","ana","","","","","Ana",""],["U4","ana-dos","","","","","Ana",""]];
const ambiguousCuts=[Array(32).fill("header"),makeRow("VA",[["Corte","Ana"]])];
const ambiguousLedger=[ledgerHeaders,
 ledgerEvent("EV-A1","OP-A1","VA","1".repeat(64),"opening",{text:"IGN"},"U1","Ana"),
 ledgerEvent("EV-A4","OP-A4","VA","2".repeat(64),"feed",{text:"12V"},"U4","Ana")];
const ambiguousSheet={getSheetByName:name=>name==="Cortes"?sheet(ambiguousCuts):name==="Users"?sheet(ambiguousUsers):name==="AportesVehiculo"?sheet(ambiguousLedger):null};
const ambiguousDashboard=new Function("getSpreadsheet","SHEET_NAMES","COLS_CORTES","COLS_FEEDBACKS",helper+";return {buildCutContributionSummary_};")(()=>ambiguousSheet,{CORTES:"Cortes",FEEDBACKS:"Feedbacks"},columns,{ID:1,Usuario:2,ID_vehiculo:3,Problema:4,Respuesta:5,anoSugerido:9});
const ambiguous=ambiguousDashboard.buildCutContributionSummary_({sheet:sheet(ambiguousCuts),count:1,baseRows:[ambiguousCuts[1]],slotColumns:[{type:12,collaborator:18}],slotValues:[[["Corte","","","","","","Ana"]]]});
assert.equal(ambiguous.find(row=>row.userId==="U1").aportesRegistrados,1);
assert.equal(ambiguous.find(row=>row.userId==="U4").aportesRegistrados,1);
assert.equal(ambiguous.find(row=>!row.userId).cortesAportados,1,"Un nombre compartido no debe atribuir un corte histórico al usuario equivocado.");
console.log("3/3 PASS — ActivityDashboardContributions (ledger opening/feed, replay/conflicto, aliases y usuarios eliminados)");
