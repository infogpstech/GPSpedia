import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const auth=readFileSync(resolve(root,"Services/Auth.js"),"utf8");
const api=readFileSync(resolve(root,"JS/Frontend/api-config.js"),"utf8");
function extract(name){
 const start=auth.indexOf("function "+name+"(");
 assert.ok(start>=0,"No se encontró "+name);
 const next=auth.indexOf("\nfunction ",start+10);
 return auth.slice(start,next<0?auth.length:next);
}
const handler=new Function("normalizeUserId","validateSessionReadOnly_","normalizeRoleName","benchmarkPasswordKdf_",
 extract("handleBenchmarkPasswordKdf_")+"\nreturn handleBenchmarkPasswordKdf_;");
let validationCalls=0,benchmarkCalls=0;
let currentRole="Desarrollador",sessionValid=true;
const run=handler(v=>String(v??"").trim(),(token,userId)=>{validationCalls++;assert.equal(token,"session-token");assert.equal(userId,"U1");return {valid:sessionValid,profile:{Privilegios:currentRole}};},
 v=>String(v||"").trim().toLowerCase(),
 ()=>{benchmarkCalls++;return [{iterations:1000,durationMs:4},{iterations:12000,durationMs:25}];});
let passed=0;
function test(name,fn){fn();passed++;console.log("PASS "+name);}

test("Benchmark solo requiere sesión válida e identidad coincidente",()=>{
 const result=run({userId:" U1 ",sessionToken:"session-token"});
 assert.equal(result.status,"success");assert.equal(result.benchmarkOnly,true);assert.equal(result.readOnly,true);
 assert.equal(result.results.length,2);assert.equal(validationCalls,1);assert.equal(benchmarkCalls,1);
});
test("Rechaza roles que no sean Desarrollador antes de ejecutar PBKDF2",()=>{
 currentRole="Supervisor";
 assert.throws(()=>run({userId:"U1",sessionToken:"session-token"}),/reservado a Desarrollador/);
 assert.equal(benchmarkCalls,1);
});
test("Rechaza sesiones inválidas o temporalmente no verificables",()=>{
 sessionValid=null;
 assert.throws(()=>run({userId:"U1",sessionToken:"session-token"}),/No se pudo validar la sesión/);
 assert.equal(benchmarkCalls,1);
});
test("Rechaza payload incompleto sin consultar sesión",()=>{
 const before=validationCalls;
 assert.throws(()=>run({userId:"U1"}),/Se requiere una sesión válida/);
 assert.equal(validationCalls,before);
});
test("Router AUTH y mapa de acciones exponen el endpoint sin clasificarlo como mutación",()=>{
 assert.match(auth,/case 'benchmarkPasswordKdf':\\s*response = handleBenchmarkPasswordKdf_\\(request\\.payload\\);/);
 assert.match(api,/'benchmarkPasswordKdf': 'AUTH'/);
 const shared=auth.slice(auth.indexOf("function isSharedMutationAction_"),auth.indexOf("\nfunction doPost("));
 assert.doesNotMatch(shared,/benchmarkPasswordKdf/);
});
test("El benchmark usa una cadena fija de prueba y no accede a datos de usuarios",()=>{
 const source=extract("benchmarkPasswordKdf_");
 assert.match(source,/GPSpedia-KDF-benchmark-only/);
 assert.doesNotMatch(source,/SpreadsheetApp|Users|Password|sessionToken/);
});
console.log("PasswordKdfBenchmark: "+passed+"/"+passed+" PASS");
