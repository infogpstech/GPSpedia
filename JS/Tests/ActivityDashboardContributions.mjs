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
const helper=fb.slice(fb.indexOf("function buildCutContributionSummary_()"),fb.indexOf("\nfunction handleGetActivityLogs",fb.indexOf("function buildCutContributionSummary_()")));
assert.match(fb,/contributions:buildCutContributionSummary_\(\)/);
const columns={id:1,tipoCorte1:12,colaboradorCorte1:18,tipoCorte2:19,colaboradorCorte2:25,tipoCorte3:26,colaboradorCorte3:32};
const makeRow=(id,slots)=>{const row=Array(32).fill("");row[0]=id;slots.forEach(([type,person],slot)=>{row[[12,19,26][slot]-1]=type;row[[18,25,32][slot]-1]=person;});return row;};
const cortesRows=[Array(32).fill("header"),makeRow("V1",[["Corte","Ana"],["Corte","Luis"]]),makeRow("V2",[["Corte","Ana"],["",""],["Corte","Ana"]]),makeRow("V3",[["Corte",""]])];
const userRows=[Array(8).fill("header"),["U1","ana","","","","","Ana",""],["U2","luis","","","","","Luis",""]];
const sheet=rows=>({getLastRow:()=>rows.length,getLastColumn:()=>rows[0].length,getRange:(r,c,n,w)=>({getValues:()=>rows.slice(r-1,r-1+n).map(row=>row.slice(c-1,c-1+w))})});
const ss={getSheetByName:name=>name==="Cortes"?sheet(cortesRows):name==="Users"?sheet(userRows):null};
const aggregate=new Function("getSpreadsheet","SHEET_NAMES","COLS_CORTES",helper+";return buildCutContributionSummary_;")(()=>ss,{CORTES:"Cortes"},columns)();
assert.deepEqual(aggregate,[{userId:"U1",nombreUsuario:"Ana",cortesAportados:3,vehiculosConAportes:2},{userId:"",nombreUsuario:"Comunidad de técnicos",cortesAportados:1,vehiculosConAportes:1},{userId:"U2",nombreUsuario:"Luis",cortesAportados:1,vehiculosConAportes:1}]);
assert.ok(helper.includes('||"Comunidad de técnicos"'));
assert.ok(helper.includes('.replace(/\\s*\\([^)]*\\)/g," ")'));
assert.match(dash,/export function renderActivityContributions/);
assert.match(ui,/renderActivityContributions\(contributionContainer/);
assert.match(html,/data-activity-tab="contributions"/);
assert.match(html,/id="activity-contributions"/);
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
console.log("1/1 PASS — ActivityDashboardContributions (separadores multilínea y coma)");
