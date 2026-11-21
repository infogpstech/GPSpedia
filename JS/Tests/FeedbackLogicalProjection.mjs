import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../Services/feedback.js",import.meta.url),"utf8");
const start=source.indexOf("function isCanonicalFeedbackInboxRow_(");
const end=source.indexOf("\nfunction handleGetFeedbackItems(",start);
assert.ok(start>=0&&end>start,"No se encontró la proyección lógica del Inbox");
const code=source.slice(start,end);
const make=(deps={})=>new Function("COLS_FEEDBACKS","parseCutSuggestionRecord","findCutSuggestionByOperation_","findCutSuggestionByRequest_","parseReportMetadata","findReportByReportId_",code+"\nreturn isCanonicalFeedbackInboxRow_;")(
 {ID_vehiculo:3,Usuario:2,Problema:4},
 deps.parseSuggestion||(()=>null),
 deps.findByOperation||(()=>null),
 deps.findByRequest||(()=>null),
 deps.parseMetadata||(()=>null),
 deps.findReport||(()=>null)
);
let passed=0;const test=(n,fn)=>{fn();passed++;};
test("el Inbox solo proyecta la primera fila física de un reportId",()=>{
 const fn=make({parseMetadata:()=>({reportId:"REP-1"}),findReport:()=>({rowIndex:3})});
 assert.equal(fn({},["F-2","Ana","101","Problema"],4,9),false);
 assert.equal(fn({},["F-1","Ana","101","Problema"],3,9),true);
});
test("el Inbox solo proyecta la primera fila física de una suggestionOperationId",()=>{
 const fn=make({parseSuggestion:()=>({suggestionOperationId:"SUG-1"}),findByOperation:()=>({rowNumber:5})});
 assert.equal(fn({},["F-2","Ana","101",'{"subType":"suggestion_cut"}'],4,0),false);
 assert.equal(fn({},["F-3","Ana","101",'{"subType":"suggestion_cut"}'],5,0),true);
});
test("el Inbox conserva compatibilidad legacy por reporte, vehículo, corte y actor",()=>{
 const calls=[];
 const fn=make({parseSuggestion:()=>({suggestionOperationId:"",reportId:"REP-1",vehicleId:"101",corteIndex:2,userId:"USR-1"}),
  findByRequest:(sheet,report,vehicle,cut,user)=>{calls.push([report,vehicle,cut,user]);return{rowNumber:7};}});
 assert.equal(fn({},["F-2","Ana","101","{}"],7,0),true);
 assert.deepEqual(calls,[["REP-1","101",2,"USR-1"]]);
});
test("el listado de reportes propios mantiene un conjunto de reportId ya proyectados",()=>{
 const a=source.indexOf("function handleGetMyProblemReports("),b=source.indexOf("\nfunction ",a+10);
 const handler=source.slice(a,b);
 assert.match(handler,/const seenReportIds = new Set\(\)/);
 assert.match(handler,/seenReportIds\.has\(parsedMetadata\.reportId\)/);
});
console.log("FeedbackLogicalProjection: "+passed+"/"+passed+" PASS");
