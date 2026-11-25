import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");
const api = read("JS/Frontend/api-config.js");
const cacheSource = read("JS/Frontend/centralConfigurationCache.js");
const authClient = read("JS/Frontend/auth.js");
const invalidation = read("JS/Frontend/sessionCacheInvalidation.js");
const telemetry = read("JS/Frontend/serviceTelemetry.js");
const actor = read("JS/Services/SharedSessionActor.js");
const services = Object.fromEntries([
  ["AUTH","JS/Services/Auth.js"],["CATALOG","JS/Services/catalog.js"],
  ["WRITE","JS/Services/write.js"],["FEEDBACK","JS/Services/feedback.js"],
  ["ADMIN","JS/Services/admin.js"],["UTILITIES","JS/Services/Utilities.js"]
].map(([key,path])=>[key,read(path)]));
const roles = read("MATRIZ_CAPACIDADES_ROLES.md");
const runner = read("JS/Tests/RunServiceTests.mjs");
const baseline = read("LINEA_BASE_MIGRACION_2026-11-23.md");

let passed=0;
function testCase(name,fn){fn();passed++;console.log("PASS",name);}
async function asyncCase(name,fn){await fn();passed++;console.log("PASS",name);}
function block(source,startMarker,endMarker){
 const start=source.indexOf(startMarker);
 assert.ok(start>=0,"No se encontró "+startMarker);
 const end=source.indexOf(endMarker,start+startMarker.length);
 assert.ok(end>start,"No se encontró cierre de "+startMarker);
 return source.slice(start,end);
}

testCase("El router usa API_ENDPOINTS local y no revalida sesión por acción",()=>{
 assert.match(api,/export const API_ENDPOINTS = Object\.freeze/);
 assert.match(api,/function resolveApiEndpoint_\(serviceKey\)/);
 const route=block(api,"async function routeActionInternal_(","\n}\n");
 assert.doesNotMatch(route,/validateSession|touchSession|apiValidateSession|checkSession/);
 assert.match(route,/getConfiguredServiceEndpoint_\(service\)/);
 assert.doesNotMatch(route,/loadCentralConfiguration|CENTRAL_CONFIGURATION_BOOTSTRAP_URL|resolveCentralServiceEndpoint/);
 const health=block(api,"export async function checkAllServicesHealth","export async function checkServiceHealth");
 assert.match(health,/resolveApiEndpoint_\(serviceKey\)/);
 assert.doesNotMatch(health,/loadCentralConfiguration|resolveCentralServiceEndpoint/);
 assert.doesNotMatch(cacheSource,/endpointUrl|endpoint_url|resolveCentralServiceEndpoint|routingAvailable|services/i);
});
await asyncCase("La caché de parámetros es single-flight y limita stale sin intervenir en el enrutamiento",async()=>{
 const u="data:text/javascript;base64,"+Buffer.from(cacheSource,"utf8").toString("base64"),{createCentralConfigurationCache,CENTRAL_CONFIG_FRESH_TTL_MS,CENTRAL_CONFIG_STALE_TTL_MS}=await import(u);
 const valid={status:"success",schemaVersion:1,revision:7,parameters:{rich_text_mode:"strict"}};let now=1000000,calls=0;const c=createCentralConfigurationCache({now:()=>now});
 const first=await c.load(async()=>{calls++;return valid;});assert.equal(first.parameters.rich_text_mode,"strict");await c.load(async()=>{calls++;throw Error("No debe recargar");});assert.equal(calls,1);
 let release;const a=c.load(()=>new Promise(r=>{release=r;}),{force:true}),b=c.load(async()=>{calls++;return valid;},{force:true});release(valid);const both=await Promise.all([a,b]);assert.equal(both[0].revision,7);assert.equal(both[1].revision,7);
 now+=CENTRAL_CONFIG_FRESH_TTL_MS+1;const stale=await c.load(async()=>{throw Error("AUTH temporalmente no disponible");});assert.equal(stale.stale,true);assert.equal(stale.parameters.rich_text_mode,"strict");
 now+=CENTRAL_CONFIG_STALE_TTL_MS+1;await assert.rejects(()=>c.load(async()=>{throw Error("fuera de ventana stale");}),/fuera de ventana stale/);assert.equal(c.peek(),null);
 const bad=createCentralConfigurationCache();await assert.rejects(()=>bad.load(async()=>({...valid,parameters:{rich_text_mode:"unsafe"}})),/parámetro desconocido o inválido/);
});
testCase("Sesión y revocación mantienen cachés por servicio sin transmitir tokens",()=>{
 assert.match(authClient,/window\.addEventListener\('gpsepedia:session-invalid'/);
 assert.match(invalidation,/Promise\.all\(SESSION_CACHE_SERVICES\.map/);
 assert.match(invalidation,/const payload = \{ userId, cacheKeys \}/);
 assert.doesNotMatch(invalidation,/sessionToken|SessionToken|UrlFetchApp|COORDINATOR_SECRET/);
 assert.match(actor,/SHARED_SESSION_ACTOR_CACHE_TTL_SECONDS_ = 21600/);
 assert.match(actor,/function getCachedSharedSessionActor_/);
 assert.match(runner,/SessionInvalidationFlow\.mjs/);
 assert.match(runner,/RoleRevocationLedger\.mjs/);
 assert.match(runner,/SessionActorCacheInvalidation\.mjs/);
});
testCase("Los servicios consumen actor confiable y conservan RBAC backend",()=>{
 for(const [name,source] of Object.entries(services)){
  if(name==="CATALOG") assert.match(source,/function getCatalogSessionActor_\(/,"CATALOG debe usar su actor local específico");
  else assert.match(source,/getCachedSharedSessionActor_/,"Falta actor confiable en "+name);
  assert.doesNotMatch(source,/GPSpedia_COORDINATOR_SECRET|GPSpedia_COORDINATOR_URL|withSharedMutationLease_|\.waitLock\s*\(/,name+" introduce coordinación no permitida");
 }
 for(const role of ["Desarrollador","Jefe","Supervisor","Tecnico","Tecnico_exterior"])assert.ok(roles.includes(role),"Falta rol "+role);
 assert.match(runner,/VehicleModalRolePolicy\.mjs/);
 assert.match(runner,/SessionActorCapabilityPreservation\.mjs/);
});
testCase("Las operaciones concurrentes evitan esperas globales y conservan idempotencia",()=>{
 for(const [name,source] of Object.entries(services)){
  const waits=[...source.matchAll(/\.tryLock\(([^)]*)\)/g)].map(m=>m[1].trim());
  assert.ok(waits.every(value=>value==="0"),name+" contiene espera bloqueante");
  assert.doesNotMatch(source,/Utilities\.sleep\s*\(/,name+" introduce espera artificial");
 }
 for(const file of ["MutationLockContention.mjs","NonBlockingServiceLocks.mjs","WriteContributionAppendConcurrency.mjs","AdminCutSlotReservation.mjs","FeedbackLockFastFail.mjs"])
  assert.ok(runner.includes(file),"No se ejecuta la prueba de concurrencia "+file);
});
testCase("Los errores de endpoint, JSON, red y servicios parciales están cubiertos sin detener otros servicios",()=>{
 for(const file of ["RouteActionErrors.mjs","ServiceHealthContract.mjs","CatalogRequestRetry.js","CatalogFeedRetry.mjs","MIG008FrontendConfigurationCache.mjs","SessionRestoreOnValidationFailure.mjs","IndexedDBTransactions.js","CatalogStartupIntegrity.mjs"])
  assert.ok(runner.includes(file),"No se ejecuta la prueba de tolerancia a fallos "+file);
 assert.match(api,/createRouteActionError_/);
 assert.match(api,/HTTP_ERROR|NETWORK_ERROR|INVALID_JSON/);
});
testCase("La telemetría de rendimiento es local y no agrega viajes de red",()=>{
 assert.match(telemetry,/eventHistory/);
 assert.match(telemetry,/hourlyBuckets/);
 assert.doesNotMatch(telemetry,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|UrlFetchApp|localStorage\.setItem/);
 assert.match(runner,/ServiceBrowserTrafficContract\.mjs/);
 assert.match(runner,/DirectServiceTrafficTelemetry\.mjs/);
});
testCase("La línea base MIG-005 distingue CI de latencia real de la aplicación",()=>{
 assert.match(baseline,/306/);assert.match(baseline,/3,581/);
 assert.match(baseline,/aprox(?:imadamente)? 30 segundos|aprox\. 30 s/i);
  assert.ok(baseline.includes("Duración de CI") && baseline.includes("30 segundos") && baseline.includes("PENDIENTE BETA"),"La duración del runner es una métrica de CI; las latencias de aplicación siguen pendientes de Beta.");
 for(const metric of ["Arranque y login","Catálogo: snapshot","Inbox","Carga de imágenes y vídeos","Número de llamadas"])
  assert.ok(baseline.includes(metric),"MIG-005 no documenta "+metric);
 assert.match(baseline,/PENDIENTE BETA/);
});
testCase("No se añade validación interactiva, reautenticación o llamada de red a cada acción ordinaria",()=>{
 assert.match(runner,/AuthSessionReadOptimization\.mjs/);
 assert.match(runner,/SessionActivityLeaseMinimization\.mjs/);
 assert.match(runner,/WriteAuthorizationMinimization\.js/);
 assert.match(runner,/AuthErrorPrivacy\.mjs/);
 const route=block(api,"async function routeActionInternal_(","\n}\n");
 assert.doesNotMatch(route,/validateSession|touchSession|password|confirmIdentity|lease/i);
 for(const source of Object.values(services))assert.doesNotMatch(source,/withSharedMutationLease_\(/);
});
console.log("MIG028SecurityPerformanceRegression: "+passed+"/9 PASS");
