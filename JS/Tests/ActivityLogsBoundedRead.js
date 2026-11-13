function runActivityLogsBoundedReadTests(sources){
 const source=String(sources.feedback||""),out=[];let passed=0,failed=0;
 const assert=(x,m)=>{if(!x)throw Error(m||"assert");},eq=(a,b)=>{if(a!==b)throw Error("Expected "+b+" got "+a);},run=(name,fn)=>{try{fn();passed++;out.push({name,status:"PASS"});}catch(e){failed++;out.push({name,status:"FAIL",message:String(e.message||e)});}};
 const s=source.indexOf("function handleGetActivityLogs(payload)"),e=source.indexOf("\n\n\n/* TAREA 9",s),fn=source.slice(s,e);assert(s>=0&&e>s);
 const make=(a,b)=>{const calls=[],sheet=(name,rows)=>({getLastRow:()=>rows.length,getRange:(r,c,n,w)=>({getValues:()=>{calls.push({name,r,n,w});return rows.slice(r-1,r-1+n).map(x=>x.slice(c-1,c-1+w));}}),getDataRange:()=>{throw Error("unbounded");}}),as=sheet("activity",a),bs=sheet("audit",b);
 const api=new Function("getSafeSheet","getSpreadsheet","SHEET_NAMES","COLS_ACTIVIDAD_USUARIO","INBOX_AUDIT_SHEET_NAME","INBOX_AUDIT_HEADERS",fn+"\nreturn handleGetActivityLogs;")(n=>n==="ActividadUsuario"?as:null,()=>({getSheetByName:n=>n==="InboxAuditLog"?bs:null}),{ACTIVIDAD_USUARIO:"ActividadUsuario"},{id:1,timestamp:2,idUsuario:3,nombreUsuario:4,tipoActividad:5,idElementoAsociado:6,detalle:7},"InboxAuditLog",["eventId","timestamp","actorId","actorName","action","itemType","itemId","details"]);return{api,calls};};
 const a=(id,t)=>[id,t,"U","User","like","V","D"],b=(id,t)=>[id,t,"A","Admin","delete","problem_report",id,"E"];
 run("Bounded read on both sheets with 10,000 + 500 records",()=>{const x=[["h"]],y=[["h"]];for(let n=1;n<=10000;n++)x.push(a("A"+n,new Date(Date.UTC(2026,0,1,0,0,n)).toISOString()));for(let n=1;n<=500;n++)y.push(b("B"+n,new Date(Date.UTC(2026,0,2,0,0,n)).toISOString()));const h=make(x,y),r=h.api({});eq(r.data.length,100);eq(h.calls.length,2);assert(h.calls.every(v=>v.n<=100));eq(h.calls[0].r,x.length-99);eq(h.calls[1].r,y.length-99);eq(r.data[0].id,"B500");eq(r.data[99].id,"B401");});
 run("Chronological merge across both sources",()=>{const r=make([["h"],a("A1","2026-01-01T00:00:01Z"),a("A2","2026-01-01T00:00:03Z")],[["h"],b("B1","2026-01-01T00:00:02Z"),b("B2","2026-01-01T00:00:04Z")]).api({}).data;eq(r.map(x=>x.id).join(","),"B2,A2,B1,A1");});
 run("Stable order for equal timestamps",()=>{const t="2026-01-01T00:00:00Z";eq(make([["h"],a("A1",t),a("A2",t)],[["h"],b("B1",t)]).api({}).data.map(x=>x.id).join(","),"A1,A2,B1");});
 run("Final result is capped at 100",()=>{const x=[["h"]],y=[["h"]];for(let n=1;n<=100;n++){x.push(a("A"+n,new Date(1700000000000+n).toISOString()));y.push(b("B"+n,new Date(1700000000100+n).toISOString()));}eq(make(x,y).api({}).data.length,100);});
 run("Empty sheets require no range reads",()=>{const h=make([["h"]],[["h"]]),r=h.api({});eq(r.status,"success");eq(r.data.length,0);eq(h.calls.length,0);});
 run("Preserves ordinary and Inbox response fields",()=>{const r=make([["h"],["A","2026-01-01T00:00:00Z","U","Tech","like","V","Like"]],[["h"],["E","2026-01-02T00:00:00Z","U2","Admin","resolve","problem_report","F","Event"]]).api({}).data;eq(r[0].tipoActividad,"inbox_resolve");eq(r[0].idElementoAsociado,"F");eq(r[1].tipoActividad,"like");eq(r[1].detalle,"Like");});
 run("No uses getDataRange",()=>{assert(!/getDataRange\s*\(/.test(fn));assert(/getRange\(startRow,\s*1,\s*rowCount,\s*columnCount\)/.test(fn));});
 return{status:failed?"FAIL":"PASS",passed,failed,results:out};
}

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const result=runActivityLogsBoundedReadTests({feedback:readFileSync(resolve(root,"Services/feedback.js"),"utf8")});
result.results.forEach(item=>console.log(item.status+" "+item.name+(item.message?" — "+item.message:"")));
console.log("AUG-120: "+result.passed+"/"+(result.passed+result.failed)+" pruebas aprobadas.");
if(result.failed)process.exitCode=1;
export {runActivityLogsBoundedReadTests};
