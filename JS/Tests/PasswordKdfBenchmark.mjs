import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const auth=readFileSync(resolve(root,"JS/Services/Auth.js"),"utf8");
const coordinator=readFileSync(resolve(root,"JS/Services/Coordinator.js"),"utf8");
const api=readFileSync(resolve(root,"JS/Frontend/api-config.js"),"utf8");
function extract(source,name){
 const start=source.indexOf("function "+name+"(");
 assert.ok(start>=0,"No se encontró "+name);
 const next=source.indexOf("\nfunction ",start+10);
 return source.slice(start,next<0?source.length:next);
}
const normalizeUserId=value=>String(value??"").trim();
const normalizeRoleName=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
const actorGuard=new Function("normalizeUserId","normalizeRoleName",extract(auth,"requireSharedAuthActor_")+"\nreturn requireSharedAuthActor_;")(normalizeUserId,normalizeRoleName);
let benchmarkCalls=0;
const handler=new Function("requireSharedAuthActor_","benchmarkPasswordKdf_",extract(auth,"handleBenchmarkPasswordKdf_")+"\nreturn handleBenchmarkPasswordKdf_;")(
 actorGuard,()=>{benchmarkCalls++;return [{iterations:1000,durationMs:4},{iterations:12000,durationMs:25}];});
const mutation=new Function(extract(auth,"isSharedMutationAction_")+"\nreturn isSharedMutationAction_;")();
const policy=new Function(extract(coordinator,"coordinatorPolicy_")+"\nreturn coordinatorPolicy_;")();
let passed=0;function test(name,fn){fn();passed++;console.log("PASS "+name);}
const actor={userId:"U1",role:"Desarrollador",epoch:3,fullName:"Usuario verificado"};
test("el benchmark consume el actor confiable sin revalidar Users/ActiveSessions",()=>{
 const result=handler({userId:"U1",__sharedSessionActor:actor});
 assert.equal(result.status,"success");assert.equal(result.benchmarkOnly,true);assert.equal(result.readOnly,true);
 assert.equal(result.results.length,2);assert.equal(benchmarkCalls,1);
});
test("rechaza contexto ausente, rol no autorizado o epoch inválido antes de ejecutar PBKDF2",()=>{
 assert.throws(()=>handler({userId:"U1"}),/contexto central/);
 assert.throws(()=>handler({userId:"U1",__sharedSessionActor:{...actor,role:"Supervisor"}}),/contexto central/);
 assert.throws(()=>handler({userId:"U1",__sharedSessionActor:{...actor,epoch:0}}),/contexto central/);
 assert.equal(benchmarkCalls,1);
});
test("el router AUTH usa el actor cacheado y no adquiere lease para el benchmark",()=>{
 assert.equal(mutation("benchmarkPasswordKdf"),false);
 assert.equal(auth.includes("function isSharedReadAction_("),false);
 assert.match(api,/'benchmarkPasswordKdf': 'AUTH'/);
 const route=extract(auth,"doPost");
 const calls=[];
 const withActor=(event,trusted)=>{const body=JSON.parse(event.postData.contents);body.payload.__sharedSessionActor=trusted;return {postData:{contents:JSON.stringify(body)}};};
 const cachedActor=(userId,token)=>{calls.push({userId,token});return actor;};
 const internal=event=>{const body=JSON.parse(event.postData.contents);return {content:JSON.stringify(handler(body.payload))};};
 const content={createTextOutput:value=>({content:value,setMimeType(){return this;}}),MimeType:{TEXT:"text"}};
 const doPost=new Function("isSharedMutationAction_","withSharedSessionActor_","getCachedSharedSessionActor_","doPostInternal_","ContentService","DIRECT_SERVICE_TRAFFIC_CONFIG_","readDirectServiceTraffic_","recordDirectServiceTraffic_",
  extract(auth,"isSharedMutationAction_")+"\\n"+route+"\\nreturn doPost;")(
   mutation,withActor,cachedActor,internal,content,{actions:new Set()},()=>({status:"unavailable"}),()=>false);
 const response=doPost({postData:{contents:JSON.stringify({action:"benchmarkPasswordKdf",payload:{userId:"U1",sessionToken:"session-token"}})}});
 assert.equal(JSON.parse(response.content).status,"success");
 assert.deepEqual(calls,[{userId:"U1",token:"session-token"}]);
 assert.equal(benchmarkCalls,1);
});
test("Coordinator ya no declara una política para una acción que no lo consulta",()=>{
 assert.equal(policy("AUTH","benchmarkPasswordKdf"),null);
});
test("el benchmark usa una cadena fija y no accede a contraseñas ni hojas de usuarios",()=>{
 const source=extract(auth,"benchmarkPasswordKdf_");
 assert.match(source,/GPSpedia-KDF-benchmark-only/);
 assert.doesNotMatch(source,/SpreadsheetApp|Users|sessionToken/);
});
console.log("PasswordKdfBenchmark: "+passed+"/"+passed+" PASS");
