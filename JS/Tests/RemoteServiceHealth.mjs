import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
const targetCommit = String(process.env.TARGET_COMMIT || "").trim();
if (!/^[a-f0-9]{40}$/i.test(targetCommit)) throw new Error("TARGET_COMMIT debe ser un SHA completo.");
const source = execFileSync("git", ["show", targetCommit + ":JS/Frontend/api-config.js"], { encoding:"utf8", maxBuffer:4*1024*1024 });
const bootstrapMatch = source.match(/const CENTRAL_CONFIGURATION_BOOTSTRAP_URL = "([^"]+)"/);
if (!bootstrapMatch) throw new Error("No se encontró el localizador bootstrap central.");
const keysMatch = source.match(/export const CENTRAL_SERVICE_KEYS = Object\.freeze\(\[([\s\S]*?)\]\);/);
if (!keysMatch) throw new Error("No se encontró CENTRAL_SERVICE_KEYS.");
const serviceKeys = [...keysMatch[1].matchAll(/["']([A-Z]+)["']/g)].map(x=>x[1]);
function parseObject(name) {
 const match=source.match(new RegExp("export const "+name+" = (?:Object\\.freeze\\()?\\{([\\s\\S]*?)\\n\\}\\)?;"));
 if(!match)throw new Error("No se encontró "+name+".");
 const values={}; for(const line of match[1].split(/\r?\n/)){const item=line.match(/^\s*([A-Z]+):\s*"([^"]+)"\s*,?\s*$/);if(item)values[item[1]]=item[2];}
 return values;
}
const identities=parseObject("SERVICE_HEALTH_CONTRACTS"), keys=Object.keys(identities).sort();
if(serviceKeys.length!==6||serviceKeys.slice().sort().join(",")!==keys.join(","))throw new Error("El inventario central y los contratos de salud no coinciden.");
const bootstrapResponse=await fetch(bootstrapMatch[1],{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({action:"getPublicConfiguration",payload:{}}),redirect:"follow",signal:AbortSignal.timeout(12000)});
if(!bootstrapResponse.ok)throw new Error("AUTH bootstrap respondió HTTP "+bootstrapResponse.status+".");
const config=await bootstrapResponse.json();
if(!config||config.status!=="success"||config.routingAvailable!==true||!config.services)throw new Error("AUTH no publicó configuración central vigente; no se usarán URLs locales.");
const endpoints={};
for(const key of serviceKeys){const item=config.services[key];if(!item||item.enabled!==true||!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(String(item.endpointUrl||"")))throw new Error("Endpoint central inválido/deshabilitado: "+key);endpoints[key]=item.endpointUrl;}
const forbidden=/secret|token|password|spreadsheet.?id|drive.?folder.?id|sheets.?accessed|cache.?key|stack|exception/i;
function inspect(value,path="response"){if(!value||typeof value!=="object")return;for(const [key,child] of Object.entries(value)){if(forbidden.test(key))throw new Error("Campo de diagnóstico no permitido: "+path+"."+key);inspect(child,path+"."+key);}}
function transient(error){const message=String(error&&error.message||error||""),name=String(error&&error.name||"");return name==="TimeoutError"||name==="AbortError"||/timed? ?out|timeout|fetch failed|ECONNRESET|ECONNREFUSED|EAI_AGAIN|socket hang up/i.test(message);}
async function probe(service){
 const startedTotal=performance.now();let lastError=null;
 for(let attempt=1;attempt<=3;attempt++){const started=performance.now();try{
  const response=await fetch(endpoints[service]+"?debug=true",{method:"GET",redirect:"follow",signal:AbortSignal.timeout(12000),headers:{accept:"application/json"}});
  const latencyMs=Math.round(performance.now()-started);
  if(!response.ok){const error=new Error("HTTP "+response.status);if((response.status===429||response.status>=500)&&attempt<3){lastError=error;await new Promise(r=>setTimeout(r,attempt*750));continue;}throw error;}
  const bodyText=await response.text();let body;try{body=JSON.parse(bodyText);}catch{throw new Error("Respuesta no JSON (HTTP "+response.status+")");}
  if(!body||typeof body!=="object"||Array.isArray(body))throw new Error("La respuesta no es un objeto JSON.");
  inspect(body);if(body.service!==identities[service])throw new Error("Identidad incorrecta: "+String(body.service));
  if(!["available","online"].includes(String(body.status||"").toLowerCase()))throw new Error("Estado backend no disponible: "+String(body.status));
  if(typeof body.version!=="string"||!body.version.trim())throw new Error("Falta la versión del servicio.");
  return {service,status:"PASS",version:body.version,latencyMs,attempts:attempt,totalMs:Math.round(performance.now()-startedTotal)};
 }catch(error){lastError=error;if(!transient(error)||attempt===3)break;await new Promise(r=>setTimeout(r,attempt*750));}}
 return {service,status:"FAIL",error:String(lastError&&lastError.message||lastError),attempts:3,totalMs:Math.round(performance.now()-startedTotal)};
}
async function run(services,concurrency=2){const results=new Array(services.length);let next=0;async function worker(){while(true){const i=next++;if(i>=services.length)return;results[i]=await probe(services[i]);}}await Promise.all(Array.from({length:Math.min(concurrency,services.length)},worker));return results;}
console.log("GPSpedia remote service health — target "+targetCommit);
console.log("Bootstrap central + GET ?debug=true; sin escrituras ni cambios remotos.");
const results=await run(keys,2);
for(const r of results){if(r.status==="PASS")console.log("PASS "+r.service+" v"+r.version+" — "+r.latencyMs+" ms (intento "+r.attempts+"/3; total "+r.totalMs+" ms)");else console.error("FAIL "+r.service+" — "+r.error+" (3 intentos; total "+r.totalMs+" ms)");}
const passed=results.filter(x=>x.status==="PASS").length;console.log("Resultado: "+passed+"/"+results.length+" servicios disponibles.");if(passed!==results.length)process.exitCode=1;
