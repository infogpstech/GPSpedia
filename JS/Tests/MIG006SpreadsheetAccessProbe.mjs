import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const probePath=resolve(root,"JS/Tests/MIG006SpreadsheetAccessProbe.js");
const source=readFileSync(probePath,"utf8");
for(const pattern of [/SPREADSHEET_ID/,/openById\s*\(/,/PropertiesService/,/UrlFetchApp/,/COORDINATOR_SECRET|API_KEY|PASSWORD|TOKEN/i,/https?:\/\//])
  assert.equal(pattern.test(source),false,"Configuración o credencial prohibida: "+pattern);
function environment(activeSpreadsheet) {
  const calls={flush:0};
  const context={
    SpreadsheetApp:{getActiveSpreadsheet(){return activeSpreadsheet;},flush(){calls.flush++;}},
    ContentService:{MimeType:{JSON:"application/json"},createTextOutput(content){return{content,mimeType:null,setMimeType(value){this.mimeType=value;return this;}};}},
    HtmlService:{createHtmlOutput(content){return{content,title:null,setTitle(value){this.title=value;return this;}};}},
    Date,JSON
  };
  vm.runInNewContext(source,context,{filename:probePath});
  return{context,calls};
}
function database() {
  let sheet=null; const calls={reads:0,writes:[],inserts:0};
  const api={
    getSheetByName(name){assert.equal(name,"__MIG006_ACCESS_PROBE__");return sheet;},
    insertSheet(name){
      assert.equal(name,"__MIG006_ACCESS_PROBE__");calls.inserts++;
      sheet={getRange(row,col,rows,cols){
        assert.equal([row,col,rows,cols].join(","),"1,1,1,2");
        return{getValues(){calls.reads++;return[sheet.values||["",""]];},setValues(values){calls.writes.push(values);sheet.values=values[0];}};
      }};
      return sheet;
    }
  };
  return{api,calls};
}
function parse(output){assert.equal(output.mimeType,"application/json");return JSON.parse(output.content);}
{
 const env=environment(null);
 assert.equal(parse(env.context.doGet({})).code,"NO_ACTIVE_SPREADSHEET");
 assert.equal(parse(env.context.doPost({parameter:{action:"write-probe",confirmDisposable:"true"}})).code,"NO_ACTIVE_SPREADSHEET");
}
{
 const env=environment(null),ui=env.context.doGet({parameter:{probeUi:"1"}});
 assert.match(ui.content,/<form method="post">/);assert.match(ui.content,/confirmDisposable/);
 assert.equal(ui.title,"GPSpedia MIG-006");
}
{
 const db=database(),env=environment(db.api),before=parse(env.context.doGet({}));
 assert.equal(before.code,"ACTIVE_SPREADSHEET_AVAILABLE");assert.equal(before.probeSheetExists,false);
 assert.equal(db.calls.reads,0);assert.equal(db.calls.writes.length,0);assert.equal(db.calls.inserts,0);
}
{
 const db=database(),env=environment(db.api),response=parse(env.context.doPost({parameter:{action:"write-probe",confirmDisposable:"false"}}));
 assert.equal(response.code,"CONFIRMATION_REQUIRED");assert.equal(db.calls.writes.length,0);assert.equal(db.calls.inserts,0);
}
{
 const db=database(),env=environment(db.api),response=parse(env.context.doPost({parameter:{action:"write-probe",confirmDisposable:"true"}}));
 assert.equal(response.code,"WRITE_OK");assert.equal(response.marker,"MIG006_WRITE_OK");
 assert.equal(db.calls.writes.length,1);assert.equal(db.calls.writes[0][0][0],"MIG006_WRITE_OK");
 assert.ok(Number.isFinite(Date.parse(db.calls.writes[0][0][1])));assert.equal(env.calls.flush,1);
 assert.equal(parse(env.context.doGet({})).writeMarkerDetected,true);
}
console.log("MIG006SpreadsheetAccessProbe: 5/5 PASS — guardas, contexto nulo/activo, UI Web App, lectura y escritura aisladas.");