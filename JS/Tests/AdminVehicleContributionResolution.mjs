import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const admin=readFileSync(new URL("../Services/admin.js",import.meta.url),"utf8");
function extractFunction(source,name){
 const start=source.indexOf("function "+name+"(");assert.notEqual(start,-1,"No se encontró "+name);
 const open=source.indexOf("{",start);let depth=0,quote="",escaped=false,line=false,block=false;
 for(let i=open;i<source.length;i++){const ch=source[i],next=source[i+1];
  if(line){if(ch==="\n")line=false;continue;}if(block){if(ch==="*"&&next==="/"){block=false;i++;}continue;}
  if(quote){if(escaped)escaped=false;else if(ch==="\\")escaped=true;else if(ch===quote)quote="";continue;}
  if(ch==="/"&&next==="/"){line=true;i++;continue;}if(ch==="/"&&next==="*"){block=true;i++;continue;}
  if(ch==="'"||ch=='"'||ch==="`"){quote=ch;continue;}if(ch==="{")depth++;if(ch==="}"&&--depth===0)return source.slice(start,i+1);
 }throw new Error("Bloque incompleto: "+name);
}
function buildRuntime(){
 const headers=["eventId","opId","vehicleId","operationHash","kind","payloadJson","actorId","actorName","createdAt","status","supersedesEventId"];
 const rows=[headers.slice(),["EV-ORIGINAL-123","OP-ORIGINAL","101","a".repeat(64),"feed",JSON.stringify({text:"12V"}),"USR-1","Técnico","2026-11-20T10:00:00.000Z","review",""]];
 let uuid=0,flushes=0;
 const sheet={getLastRow:()=>rows.length,getLastColumn:()=>11,getRange(row,col,count=1,width=1){return{
  getDisplayValues:()=>Array.from({length:count},(_,i)=>(rows[row-1+i]||[]).slice(col-1,col-1+width).map(v=>String(v??""))),
  getValues:()=>Array.from({length:count},(_,i)=>(rows[row-1+i]||[]).slice(col-1,col-1+width))
 };},appendRow(row){rows.push(row.slice());}};
 const spreadsheet={getSheetByName:name=>name==="AportesVehiculo"?sheet:null};
 const utilities={DigestAlgorithm:{SHA_256:"SHA-256"},Charset:{UTF_8:"UTF-8"},computeDigest:(a,s)=>Array(32).fill(s.length%255),getUuid:()=>"generated-event-"+(++uuid)};
 const fn=new Function("withReplacedImagesSchemaLock_","getSpreadsheet","ADMIN_VEHICLE_CONTRIBUTIONS_SHEET_NAME_","ADMIN_VEHICLE_CONTRIBUTIONS_HEADERS_","Utilities","SpreadsheetApp",
  extractFunction(admin,"handleResolveVehicleContributionCandidate_")+";return handleResolveVehicleContributionCandidate_;")(
  callback=>callback(),()=>spreadsheet,"AportesVehiculo",headers,utilities,{flush(){flushes++;}});
 return{fn,rows,state:()=>({flushes})};
}
const actor={userId:"DEV-1",fullName:"Desarrollador"};
const request={eventId:"EV-ORIGINAL-123",requestId:"request-1234567890123456",decision:"accept"};
let passed=0;function test(name,fn){fn();passed++;console.log("PASS "+name);}
test("resolución aceptada se anexa sin editar el evento original",()=>{
 const r=buildRuntime(),result=r.fn(request,actor);
 assert.equal(result.status,"success");assert.equal(result.duplicate,false);assert.equal(r.rows.length,3);
 assert.equal(r.rows[2][10],request.eventId);assert.equal(r.rows[2][9],"accepted");
 assert.equal(r.rows[1][9],"review");
});
test("reintento con el mismo requestId y contenido devuelve el evento existente",()=>{
 const r=buildRuntime(),first=r.fn(request,actor),retry=r.fn(request,actor);
 assert.equal(retry.eventId,first.eventId);assert.equal(retry.duplicate,true);assert.equal(r.rows.length,3);
});
test("reutilizar requestId con decisión distinta se rechaza",()=>{
 const r=buildRuntime();r.fn(request,actor);
 assert.throws(()=>r.fn({...request,decision:"discard"},actor),e=>e.code==="CONTRIBUTION_RESOLUTION_IDEMPOTENCY_CONFLICT");
});
test("una segunda resolución distinta del mismo candidato se rechaza",()=>{
 const r=buildRuntime();r.fn(request,actor);
 assert.throws(()=>r.fn({...request,requestId:"request-2234567890123456",decision:"discard"},actor),e=>e.code==="CONTRIBUTION_ALREADY_RESOLVED");
 assert.equal(r.rows.length,3);
});
test("corrección registra payload nuevo y mantiene el vínculo histórico",()=>{
 const r=buildRuntime(),result=r.fn({...request,requestId:"request-3234567890123456",decision:"correct",correctedPayload:{text:"IGN"}},actor);
 assert.equal(result.status,"success");assert.deepEqual(JSON.parse(r.rows[2][5]),{text:"IGN"});assert.equal(r.rows[2][10],request.eventId);
});
assert.ok(admin.includes("case 'resolveVehicleContributionCandidate':"));
assert.ok(admin.includes('"resolveVehicleContributionCandidate"'));

function buildFieldRuntime(target) {
 const headers=["eventId","opId","vehicleId","operationHash","kind","payloadJson","actorId","actorName","createdAt","status","supersedesEventId"];
 const rows=[headers.slice(),[target.eventId,"OP-ADMIN-FIELD-OLD","101","a".repeat(64),"vehicle_update",JSON.stringify(target.payload),"DEV-1","Editor","2026-11-20T10:00:00.000Z","accepted",target.sourceEventId||""]];
 let uuid=0;
 const sheet={getLastRow:()=>rows.length,getLastColumn:()=>11,getRange(row,col,count=1,width=1){return{
  getDisplayValues:()=>Array.from({length:count},(_,i)=>(rows[row-1+i]||[]).slice(col-1,col-1+width).map(v=>String(v??"")),
  getValues:()=>Array.from({length:count},(_,i)=>(rows[row-1+i]||[]).slice(col-1,col-1+width))
 };},appendRow(row){rows.push(row.slice());}};
 const spreadsheet={getSheetByName:name=>name==="AportesVehiculo"?sheet:null};
 const utilities={DigestAlgorithm:{SHA_256:"SHA-256"},Charset:{UTF_8:"UTF-8"},computeDigest:()=>Array(32).fill(7),getUuid:()=>"field-resolution-"+(++uuid)};
 const fn=new Function("withReplacedImagesSchemaLock_","getSpreadsheet","ADMIN_VEHICLE_CONTRIBUTIONS_SHEET_NAME_","ADMIN_VEHICLE_CONTRIBUTIONS_HEADERS_","Utilities","SpreadsheetApp",
  extractFunction(admin,"handleResolveVehicleContributionCandidate_")+";return handleResolveVehicleContributionCandidate_;")(
  callback=>callback(),()=>spreadsheet,"AportesVehiculo",headers,utilities,{flush(){}});
 return{fn,rows};
}
test("corrección de conflicto de campo supersede la versión fuente, no el candidato",()=>{
 const targetId="EV-FIELD-CANDIDATE-123",sourceId="EV-CURRENT-SOURCE-123";
 const r=buildFieldRuntime({eventId:targetId,sourceEventId:"EV-BASE-SOURCE-123",
  payload:{fieldName:"modelo",value:"Corolla Y",expectedCurrentValue:"Corolla",currentValue:"Corolla X",currentSourceEventId:sourceId}});
 const corrected={fieldName:"modelo",value:"Corolla Z",expectedCurrentValue:"Corolla X",currentValue:"Corolla X",currentSourceEventId:sourceId};
 const result=r.fn({eventId:targetId,requestId:"request-field-12345678",decision:"correct",correctedPayload:corrected},actor);
 assert.equal(result.status,"success");assert.equal(r.rows[2][4],"vehicle_update");assert.equal(r.rows[2][10],sourceId);
 const saved=JSON.parse(r.rows[2][5]);assert.equal(saved.resolvesCandidateEventId,targetId);assert.equal(saved.expectedCurrentValue,"Corolla X");
});
test("descartar conflicto de campo añade tombstone auditable para el candidato",()=>{
 const targetId="EV-FIELD-CANDIDATE-124",sourceId="EV-BASE-SOURCE-124";
 const r=buildFieldRuntime({eventId:targetId,sourceEventId,
  payload:{fieldName:"modelo",value:"Corolla Y",expectedCurrentValue:"Corolla",currentValue:"Corolla X",currentSourceEventId:"EV-CURRENT-SOURCE-124"}});
 const result=r.fn({eventId:targetId,requestId:"request-field-22345678",decision:"discard"},actor);
 assert.equal(result.status,"success");assert.equal(r.rows[2][9],"retracted");assert.equal(r.rows[2][10],sourceId);
 assert.equal(JSON.parse(r.rows[2][5]).resolvesCandidateEventId,targetId);
});
test("doble resolución de campo se bloquea por resolvesCandidateEventId",()=>{
 const targetId="EV-FIELD-CANDIDATE-125",sourceId="EV-BASE-SOURCE-125";
 const r=buildFieldRuntime({eventId:targetId,sourceEventId,
  payload:{fieldName:"modelo",value:"Corolla Y",expectedCurrentValue:"Corolla",currentValue:"Corolla X",currentSourceEventId:"EV-CURRENT-SOURCE-125"}});
 const request={eventId:targetId,requestId:"request-field-32345678",decision:"discard"};
 r.fn(request,actor);
 assert.throws(()=>r.fn({...request,requestId:"request-field-42345678"},actor),e=>e.code==="CONTRIBUTION_ALREADY_RESOLVED");
 assert.equal(r.rows.length,3);
});

console.log(passed+"/"+passed+" PASS");
