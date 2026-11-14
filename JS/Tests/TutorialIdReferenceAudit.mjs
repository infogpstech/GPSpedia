import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const admin=readFileSync(resolve(root,"Services/admin.js"),"utf8");
function extract(name){
 const start=admin.indexOf("function "+name+"(");
 assert.ok(start>=0,"No se encontró "+name);
 const next=admin.indexOf("\nfunction ",start+10);
 return admin.slice(start,next<0?admin.length:next);
}
function makeSheet(rows){
 let writes=0;
 return {
  getLastRow:()=>rows.length,
  getLastColumn:()=>Math.max(0,...rows.map(row=>row.length)),
  getRange:(row,col,numRows=1,numCols=1)=>({
   getValues:()=>Array.from({length:numRows},(_,r)=>Array.from({length:numCols},(_,c)=>rows[row-1+r]?.[col-1+c]??"")),
   setValue:()=>{writes++;throw new Error("La auditoría no debe escribir.");},
   setValues:()=>{writes++;throw new Error("La auditoría no debe escribir.");}
  }),
  get writes(){return writes;}
 };
}
const audit=new Function(extract("auditTutorialApprovalReferences_")+"\nreturn auditTutorialApprovalReferences_;")();
const tutorial=makeSheet([
 ["ID","Tema"],["tut-a","A"],["tut-dup","B"],["tut-dup","C"]
]);
const approval=(referenceId,rowReferenceId=referenceId,metadataId=referenceId)=>[
 "vid-1","Colaborador",rowReferenceId,JSON.stringify({
  subType:"video_approval",contentType:"tutorial",referenceId,
  metadata:metadataId?{tutorialId:metadataId}:{}
 })
];
const feedback=makeSheet([
 ["ID","Usuario","ID_vehiculo","Problema"],
 approval("tut-a"),
 approval("tut-missing"),
 approval("tut-dup"),
 approval("tut-a","tut-other","tut-other"),
 approval("","", ""),
 ["vid-bad","Colaborador","tut-a",'{"subType":"video_approval"'],
 ["problem-1","Colaborador","1","Reporte ordinario"]
]);
let passed=0;
function test(name,fn){fn();passed++;console.log("PASS "+name);}
test("Reconoce referencias válidas y no confunde reportes ordinarios",()=>{
 const r=audit(tutorial,feedback);
 assert.equal(r.status,"success");assert.equal(r.readOnly,true);
 assert.equal(r.tutorialRecords,3);assert.equal(r.approvalRecords,5);
 assert.equal(r.matchedReferences,2);assert.equal(r.orphanReferences,1);
 assert.equal(r.ambiguousReferences,1);assert.equal(r.missingReferenceIds,1);
});
test("Detecta desacuerdos entre ID de fila, referencia y metadata",()=>{
 const r=audit(tutorial,feedback);
 assert.equal(r.rowReferenceMismatches,1);
 assert.equal(r.metadataReferenceMismatches,1);
 assert.ok(r.details.some(x=>x.issue==="row_reference_mismatch"));
 assert.ok(r.details.some(x=>x.issue==="metadata_reference_mismatch"));
});
test("Reporta JSON de aprobación truncado sin detener el resto del inventario",()=>{
 const r=audit(tutorial,feedback);
 assert.equal(r.malformedApprovalRecords,1);
 assert.ok(r.details.some(x=>x.issue==="malformed_video_approval_json"));
});
test("No escribe en ninguna de las hojas consultadas",()=>{
 audit(tutorial,feedback);
 assert.equal(tutorial.writes,0);assert.equal(feedback.writes,0);
});
test("Si falta una hoja requerida, declara el inventario incompleto",()=>{
 assert.equal(audit(null,feedback).status,"incomplete");
 assert.equal(audit(tutorial,null).reason,"missing_feedbacks_sheet");
});
test("La auditoría agregada incorpora el informe de referencias de Tutorial",()=>{
 assert.match(admin,/auditTutorialApprovalReferences_\(/);
 assert.match(admin,/tutorialReferences,/);
});
console.log("TutorialIdReferenceAudit: "+passed+"/"+passed+" PASS");
