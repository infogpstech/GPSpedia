import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderActivityInsights, renderActivityLogs } from "../Frontend/activityDashboard.js";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const feedback=readFileSync(resolve(root,"JS/Services/feedback.js"),"utf8");
const ui=readFileSync(resolve(root,"JS/Frontend/ui.js"),"utf8"),html=readFileSync(resolve(root,"index.html"),"utf8"),css=readFileSync(resolve(root,"style.css"),"utf8");
const start=feedback.indexOf("function readActivityDashboardCutsSnapshot_()"),end=feedback.indexOf("\nfunction handleRecordVehicleView",start);
assert.ok(start>=0&&end>start,"No se encontró agregación.");
const helper=feedback.slice(start,end),headers=Array(42).fill("h");
const cut=(id,brand,model,type,votes)=>{const row=Array(42).fill("");row[0]=id;row[2]=brand;row[3]=model;row[11]=type;row[16]=votes;return row;};
const cuts=[headers,cut("V1","Toyota","Hilux","Corte",7),cut("V2","Mitsubishi","L200","Corte",2)];
const feedbackHeaders=["ID","Usuario","ID_vehiculo","Problema","Respuesta","Se resolvio","Responde","Reporte de util","anoSugerido","suggestionActorKey"];
const fb=[feedbackHeaders,
 ["F1","Ana","V1","Confirmación de funcionamiento para año 2020","La información funciona para el año 2020.","","","",2020,"user:U1"],
 ["F2","Luis","V2","Sugerencia de ampliar rango al año 2021","La información funciona para el año 2021.","","","",2021,"anon:unverified"],
 ["F3","Luis","V2","Reporte de información no funcional","El usuario indicó que la información no fue útil.","","","",2022,"user:U2"],
 ["F4","Luis","V1","Reporte de información no funcional","La información no funciona para el año 2023.","","","",2023,"user:U2"]];
const applications=[Array(12).fill("h"),["OP1","V1",2020,2018,2020,2018,2020,3,"completed",true,"",""]];
const sheet=rows=>({reads:[],getLastRow:()=>rows.length,getLastColumn:()=>rows[0].length,getRange(r,c,n,w){this.reads.push([r,c,n,w]);return{getValues:()=>rows.slice(r-1,r-1+n).map(row=>row.slice(c-1,c-1+w))};}});
const cutSheet=sheet(cuts),feedbackSheet=sheet(fb),applicationSheet=sheet(applications);
const ss={getSheetByName:name=>name==="Cortes"?cutSheet:name==="Feedbacks"?feedbackSheet:name==="FeedbackYearApplications"?applicationSheet:null};
const cols={id:1,marca:3,modelo:4,tipoCorte1:12,utilCorte1:17,colaboradorCorte1:18,tipoCorte2:19,utilCorte2:24,colaboradorCorte2:25,tipoCorte3:26,utilCorte3:31,colaboradorCorte3:32,timestamp:37};
const dashboard=new Function("getSpreadsheet","SHEET_NAMES","COLS_CORTES","COLS_FEEDBACKS",helper+";return {readActivityDashboardCutsSnapshot_,buildCutContributionSummary_,buildActivityDashboardInsights_};")(()=>ss,{CORTES:"Cortes",FEEDBACKS:"Feedbacks"},cols,{ID:1,Usuario:2,ID_vehiculo:3,Problema:4,Respuesta:5,anoSugerido:9});
const sharedSnapshot=dashboard.readActivityDashboardCutsSnapshot_();
const snapshotReadCount=cutSheet.reads.length;
const insights=dashboard.buildActivityDashboardInsights_(sharedSnapshot);
assert.equal(snapshotReadCount,4,"El snapshot de Cortes se construye con A:D y tres rangos combinados tipo→colaborador.");
dashboard.buildCutContributionSummary_(sharedSnapshot);
dashboard.buildActivityDashboardInsights_(sharedSnapshot);
assert.equal(cutSheet.reads.length,snapshotReadCount,"Ambos resúmenes deben reutilizar el mismo snapshot sin volver a leer Cortes.");
assert.deepEqual(insights.summary,{vehicles:2,cuts:2,usefulVotes:9,notUseful:1,notWorking:1});
assert.equal(insights.topUseful[0].brand,"Toyota");assert.deepEqual(insights.topNegative.map(row=>row.model),["Hilux","L200"]);
assert.deepEqual(insights.years,{confirmations:1,suggestions:1,verified:3,anonymous:1,applied:1});
assert.equal(insights.windowLimited,false);
assert.match(ui,/renderActivityInsights\(insightContainer/);assert.match(ui,/activity-dashboard-status/);assert.match(ui,/result\.status !== 'success'/);assert.match(feedback,/activitySheetAvailable/);assert.match(html,/id="activity-insights"/);assert.match(html,/id="activity-dashboard-status"/);assert.match(html,/data-activity-tab="insights"/);assert.match(css,/GP-DASH-INSIGHTS-01/);
class FakeElement{
 constructor(tag){this.tagName=tag;this.children=[];this.className="";this.style={};this.attributes={};this.hidden=false;this._textContent="";this.parentNode=null;this.classList={add:name=>{const names=this.className.split(" ").filter(Boolean);if(!names.includes(name))names.push(name);this.className=names.join(" ");}};}
 set textContent(v){this._textContent=String(v);this.children=[];}
 get textContent(){return this._textContent+this.children.map(child=>child.textContent).join("");}
 set innerHTML(_v){throw new Error("No usar innerHTML.");}
 appendChild(c){c.parentNode=this;this.children.push(c);return c;}
 append(...nodes){nodes.forEach(node=>this.appendChild(node));}
 replaceChildren(){this.children.forEach(child=>child.parentNode=null);this.children=[];}
 setAttribute(name,value){this.attributes[name]=String(value);}
 getAttribute(name){return this.attributes[name]??null;}
 contains(target){return this===target||this.children.some(child=>child.contains(target));}
 closest(selector){return selector===".activity-log-toggle"&&this.className.split(" ").includes("activity-log-toggle")?this:null;}
}
const doc={createElement:tag=>new FakeElement(tag)},container=doc.createElement("div");
renderActivityInsights(container,{summary:{vehicles:2,cuts:2,usefulVotes:9,notUseful:1},topUseful:[{brand:"<img onerror=alert(1)>",model:"Hilux",cutType:"Corte",usefulVotes:9}],years:{confirmations:1,suggestions:1,applied:1,verified:3,anonymous:1}},[],doc);
const collect=node=>[node.textContent,...node.children.flatMap(collect)].join(" ");
assert.ok(collect(container).includes("<img onerror=alert(1)>"));assert.equal(container.children.length,4);assert.equal(container.children[0].children.length,5);
const documentHandlers={};
doc.addEventListener=(name,handler)=>{documentHandlers[name]=handler;};
doc.removeEventListener=(name,handler)=>{if(documentHandlers[name]===handler)delete documentHandlers[name];};
const logContainer=doc.createElement("tbody");
renderActivityLogs(logContainer,[
 {timestamp:"2026-11-17T10:00:00Z",nombreUsuario:"Técnico",tipoActividad:"like",detalle:"{} • referencia V-105",idElementoAsociado:"V1"},
 {timestamp:"2026-11-16T10:00:00Z",nombreUsuario:"",tipoActividad:"view_vehicle",detalle:"{}"}
],doc,{vehicles:[{id:"V1",marca:"Chevrolet",modelo:"Suburban",anoDesde:2021,anoHasta:2026}]});
assert.equal(logContainer.children[0].children.length,3);
assert.equal(logContainer.children[0].children[0].textContent,"17/11/26");
assert.equal(logContainer.children[0].children[1].textContent,"Técnico");
assert.equal(logContainer.children[0].children[2].children[0].textContent,"Marcó como útil");
const firstDetail=logContainer.children[1],firstToggle=logContainer.children[0].children[2].children[0];
firstToggle.onclick();
assert.equal(firstDetail.hidden,false);
assert.equal(firstToggle.getAttribute("aria-expanded"),"true");
assert.match(firstDetail.textContent,/Chevrolet · Suburban · 2021–2026/);
assert.ok(!firstDetail.textContent.includes("referencia")&&!firstDetail.textContent.includes("{}"));
const secondDetail=logContainer.children[3],secondToggle=logContainer.children[2].children[2].children[0];
secondToggle.onclick();
assert.equal(firstDetail.hidden,true);
assert.equal(secondDetail.hidden,false);
documentHandlers.click({target:doc.createElement("aside")});
assert.equal(secondDetail.hidden,true);
assert.equal(secondToggle.getAttribute("aria-expanded"),"false");
const emptyLogContainer=doc.createElement("tbody");
renderActivityLogs(emptyLogContainer,[],doc);
assert.equal(emptyLogContainer.children.length,1);
assert.equal(emptyLogContainer.children[0].children[0].colSpan,3);
assert.match(emptyLogContainer.children[0].children[0].textContent,/Todavía no hay actividad registrada/);
assert.ok(html.includes('class="activity-log-table"'));
assert.ok(!html.includes("Descripción</th>"));
assert.ok(css.includes("GP-DASH-ACTIVITY-RECENT-01"));
assert.ok(ui.includes("renderActivityLogs(logContainer, logs, undefined, { vehicles:"));

console.log("1/1 PASS — GP-DASH-INSIGHTS-01 y GP-DASH-ACTIVITY-RECENT-01");
