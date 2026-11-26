import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
const targetCommit = String(process.env.TARGET_COMMIT || "").trim();
if (!/^[a-f0-9]{40}$/i.test(targetCommit)) throw new Error("TARGET_COMMIT debe ser un SHA completo.");
const source = execFileSync("git", ["show", targetCommit + ":JS/Frontend/api-config.js"], { encoding:"utf8", maxBuffer:4*1024*1024 });
const healthDoc = execFileSync("git", ["show", targetCommit + ":Services/SERVICE_HEALTH.md"], { encoding:"utf8", maxBuffer:2*1024*1024 });
function parseExpectedVersions(document) {
 const rows=[...document.matchAll(/^\|\s*(AUTH|CATALOG|WRITE|FEEDBACK|UTILITIES|ADMIN)\s*\|\s*`[^\n`]+`\s*\|\s*([0-9]+\.[0-9]+\.[0-9]+)\s*\|/gm)];
 const versions=Object.fromEntries(rows.map(match=>[match[1],match[2]]));
 if(Object.keys(versions).length!==6)throw new Error("SERVICE_HEALTH.md no contiene las seis versiones esperadas.");
 return versions;
}
const expectedVersions=parseExpectedVersions(healthDoc);
if (String(process.env.GPSPEDIA_HEALTH_ENV || "") !== "BETA_ISOLATED" ||
 String(process.env.GPSPEDIA_CONFIRM_BETA_ENDPOINTS || "") !== "I_HAVE_VERIFIED_THE_SIX_ENDPOINTS_ARE_BETA") {
 throw new Error("La comprobación remota exige confirmar que las seis URLs locales apuntan a una Beta aislada.");
}
function parseObject(name) {
 const match=source.match(new RegExp("export const "+name+" = (?:Object\\.freeze\\()?\\{([\\s\\S]*?)\\n\\}\\)?;"));
 if(!match)throw new Error("No se encontró "+name+".");
 const values={};for(const line of match[1].split(/\r?\n/)){const item=line.match(/^\s*([A-Z]+):\s*"([^"]+)"\s*,?\s*$/);if(item)values[item[1]]=item[2];}
 return values;
}
const endpoints=parseObject("API_ENDPOINTS"),identities=parseObject("SERVICE_HEALTH_CONTRACTS"),keys=Object.keys(identities).sort(),serviceKeys=Object.keys(endpoints).sort();
if(serviceKeys.length!==6||serviceKeys.join(",")!==keys.join(","))throw new Error("API_ENDPOINTS y los contratos de salud no contienen los mismos seis servicios.");
for(const key of serviceKeys)if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(String(endpoints[key]||"")))throw Error("Endpoint local inválido: "+key);
const forbidden=/secret|token|password|spreadsheet.?id|drive.?folder.?id|sheets.?accessed|session.?authority|sheet.?name|spreadsheet.?name|cache.?key|stack|exception/i;
function inspect(value,path="response"){if(!value||typeof value!=="object")return;for(const [key,child] of Object.entries(value)){if(forbidden.test(key))throw new Error("Campo de diagnóstico no permitido: "+path+"."+key);inspect(child,path+"."+key);}}
function transient(error){const message=String(error&&error.message||error||""),name=String(error&&error.name||"");return name==="TimeoutError"||name==="AbortError"||/timed? ?out|timeout|fetch failed|ECONNRESET|ECONNREFUSED|EAI_AGAIN|socket hang up/i.test(message);}
async function probe(service){
 const startedTotal=performance.now();let lastError=null,attempts=0;
 for(let retry=0;retry<3;retry++){attempts++;const started=performance.now();try{
  const response=await fetch(endpoints[service]+"?debug=true",{method:"GET",redirect:"follow",signal:AbortSignal.timeout(8000),headers:{accept:"application/json"}});
  if(!response.ok){const error=new Error("HTTP "+response.status);if(([408,425,429].includes(response.status)||response.status>=500)&&retry<2){lastError=error;await new Promise(r=>setTimeout(r,(retry+1)*750));continue;}throw error;}
  const bodyText=await response.text();let body;try{body=JSON.parse(bodyText);}catch{throw new Error("Respuesta no JSON (HTTP "+response.status+")");}
  const latencyMs=Math.round(performance.now()-started);
  if(!body||typeof body!=="object"||Array.isArray(body))throw new Error("La respuesta no es un objeto JSON.");
  inspect(body);if(body.service!==identities[service])throw new Error("Identidad incorrecta: "+String(body.service));
  const reportedStatus=typeof body.status==="string"?body.status.trim().toLowerCase():"";
  if(!["available","online"].includes(reportedStatus))throw new Error("Estado backend no disponible: "+String(body.status));
  if(typeof body.version!=="string"||!body.version.trim())throw new Error("Falta la versión del servicio.");
  if(body.version.trim()!==expectedVersions[service])throw new Error("Versión desactualizada: deployment "+body.version+"; fuente esperada "+expectedVersions[service]);
  return {service,status:latencyMs>=2000?"SLOW":"PASS",version:body.version,latencyMs,attempts,totalMs:Math.round(performance.now()-startedTotal)};
 }catch(error){lastError=error;if(!transient(error)||retry===2)break;await new Promise(r=>setTimeout(r,(retry+1)*750));}}
 return {service,status:"FAIL",error:String(lastError&&lastError.message||lastError),attempts,totalMs:Math.round(performance.now()-startedTotal)};
}
async function run(services,concurrency=2){const results=new Array(services.length);let next=0;async function worker(){while(true){const i=next++;if(i>=services.length)return;results[i]=await probe(services[i]);}}await Promise.all(Array.from({length:Math.min(concurrency,services.length)},worker));return results;}
console.log("GPSpedia remote service health — target "+targetCommit);
console.log("API_ENDPOINTS local + GET ?debug=true; Beta aislada confirmada; sin escrituras ni cambios remotos.");
const results=await run(keys,2);
for(const r of results){if(["PASS","SLOW"].includes(r.status))console.log(r.status+" "+r.service+" v"+r.version+" — "+r.latencyMs+" ms (intento "+r.attempts+"/3; total "+r.totalMs+" ms)");else console.error("FAIL "+r.service+" — "+r.error+" ("+r.attempts+"/3 intentos; total "+r.totalMs+" ms)");}
const passed=results.filter(x=>["PASS","SLOW"].includes(x.status)).length;console.log("Resultado: "+passed+"/"+results.length+" servicios disponibles (SLOW indica latencia >= 2000 ms).");if(passed!==results.length)process.exitCode=1;
