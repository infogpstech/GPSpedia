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
const audit=new Function(extract("auditUserIdReferences_")+"\nreturn auditUserIdReferences_;")();
const sheets={
 Users:makeSheet([["ID"],["USR-0001"],["USR-0002"],["USR-0003"],["usr-0003"]]),
 ActiveSessions:makeSheet([["ID_Usuario"],["USR-0001"],["USR-9999"]]),
 ActividadUsuario:makeSheet([["id","timestamp","idUsuario"],["A1","2026-01-01","usr-0002"]]),
 Contactanos:makeSheet([["id","User_ID","Asunto","Mensaje","Respuesta","ID_usuario_responde"],["C1","USR-0003","","","","0"]]),
 InboxAuditLog:makeSheet([["eventId","timestamp","actorId"],["E1","2026-01-01","USR-0001"]]),
 FeedbackLikes:makeSheet([["actorKey"],["user:USR-9999"],["anon:unverified"]]),
 Feedbacks:makeSheet([["ID","Usuario","ID_vehiculo","Problema"],
  ["F1","","",JSON.stringify({userId:"USR-0002",createdByUserId:"USR-0001",metadata:{userId:"USR-0008"}})],
  ["F2","","",'{"userId":"truncated"']])
};
const ss={getSheetByName:name=>sheets[name]||null};
let passed=0;
function test(name,fn){fn();passed++;console.log("PASS "+name);}
test("Cruza IDs con sesiones, actividad, contactos, auditoría, likes y metadata",()=>{
 const r=audit(ss);
 assert.equal(r.status,"success");assert.equal(r.readOnly,true);
 assert.equal(r.referencesScanned,9);assert.equal(r.matchedReferences,5);
 assert.equal(r.orphanReferences,3);assert.equal(r.ambiguousReferences,1);
 assert.equal(r.duplicateUserIds,1);assert.equal(r.sentinelReferencesSkipped,1);
});
test("Detecta referencias huérfanas y ambiguas con ubicación de origen",()=>{
 const r=audit(ss);
 assert.ok(r.details.some(x=>x.sheet==="ActiveSessions"&&x.userId==="USR-9999"));
 assert.ok(r.details.some(x=>x.sheet==="Contactanos"&&x.issue==="ambiguous_user_reference"));
 assert.ok(r.details.some(x=>x.sheet==="Feedbacks"&&x.userId==="USR-0008"));
});
test("Marca metadata JSON truncada que contiene campos de identidad",()=>{
 assert.equal(audit(ss).malformedMetadataRecords,1);
});
test("Ignora IDs anónimos/sentinela y claves no asociadas a usuario",()=>{
 const r=audit(ss);
 assert.equal(r.sentinelReferencesSkipped,1);
 assert.equal(r.referencesScanned,9);
});
test("No modifica hojas y requiere Users para producir resultados",()=>{
 audit(ss);
 Object.values(sheets).forEach(sheet=>assert.equal(sheet.writes,0));
 assert.equal(audit({getSheetByName:()=>null}).status,"incomplete");
});
test("La auditoría agregada publica el informe de referencias de usuario",()=>{
 assert.match(admin,/auditUserIdReferences_\(ss\)/);
 assert.match(admin,/userReferences,/);
});
console.log("UserIdReferenceAudit: "+passed+"/"+passed+" PASS");
