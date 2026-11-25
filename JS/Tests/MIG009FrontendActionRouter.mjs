import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const api = readFileSync(resolve(root, "JS/Frontend/api-config.js"), "utf8");
const cacheSource = readFileSync(resolve(root, "JS/Frontend/centralConfigurationCache.js"), "utf8");
const { resolveCentralServiceEndpoint, createCentralConfigurationCache, CENTRAL_CONFIG_FRESH_TTL_MS } =
    await import("data:text/javascript;base64," + Buffer.from(cacheSource, "utf8").toString("base64"));
const mapMatch = api.match(/export\s+const\s+ACTION_TO_SERVICE_MAP\s*=\s*\{([\s\S]*?)\n\};/);
assert.ok(mapMatch, "No se encontró ACTION_TO_SERVICE_MAP.");
const actionMap = Function("return ({" + mapMatch[1] + "});")();
const endpointMatch = api.match(/export const API_ENDPOINTS = Object\.freeze\((\{[\s\S]*?\})\);/);
assert.ok(endpointMatch, "No se encontró API_ENDPOINTS.");
const endpoints = Function("return (" + endpointMatch[1] + ");")();
const serviceKeys = Object.keys(endpoints);
assert.deepEqual(serviceKeys, ["AUTH", "CATALOG", "WRITE", "FEEDBACK", "UTILITIES", "ADMIN"]);
assert.equal(Object.keys(actionMap).length, 125, "Cambió el total de acciones sin revisar inventario.");
const actionCounts = Object.fromEntries(serviceKeys.map(key => [key, Object.values(actionMap).filter(service => service === key).length]));
assert.deepEqual(actionCounts, { AUTH: 21, CATALOG: 9, WRITE: 9, FEEDBACK: 40, UTILITIES: 1, ADMIN: 45 });
assert.equal(actionMap.getPublicConfiguration, "AUTH");
assert.equal(actionMap.publishCatalogReset, "CATALOG");
assert.equal(actionMap.invalidateRichTextModeCache, "FEEDBACK");
for (const [action, service] of Object.entries(actionMap)) assert.ok(serviceKeys.includes(service), action + " apunta a servicio desconocido.");
assert.equal((api.match(/https:\/\/script\.google\.com\/macros\/s\//g) || []).length, 7, "Se esperan seis endpoints locales y el bootstrap transitorio.");
assert.doesNotMatch(api, /PropertiesService|COORDINATOR_SECRET|API_KEY/i);
const resolverMatch = api.match(/function resolveApiEndpoint_\([\s\S]*?\n\}/);
assert.ok(resolverMatch, "No se encontró el resolvedor local.");
const resolveLocal = Function("API_ENDPOINTS","API_ENDPOINT_PATTERN_",resolverMatch[0]+"\nreturn resolveApiEndpoint_;")(
 endpoints, /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/
);
for (const key of serviceKeys) assert.equal(resolveLocal(key), endpoints[key]);
assert.throws(()=>resolveLocal("UNKNOWN"),/sin endpoint local/);
{
 const invalid={...endpoints,AUTH:"http://attacker.invalid/exec"};
 const resolver=Function("API_ENDPOINTS","API_ENDPOINT_PATTERN_",resolverMatch[0]+"\nreturn resolveApiEndpoint_;")(
  invalid,/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/
 );
 assert.throws(()=>resolver("AUTH"),/no cumple el formato HTTPS/);
}
{
 const duplicate={...endpoints,ADMIN:endpoints.AUTH};
 const resolver=Function("API_ENDPOINTS","API_ENDPOINT_PATTERN_",resolverMatch[0]+"\nreturn resolveApiEndpoint_;")(
  duplicate,/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/
 );
 assert.throws(()=>resolver("ADMIN"),/IDs de deployment vacíos o duplicados/);
}
{
 const routeStart=api.indexOf("async function routeActionInternal_");
 const routeEnd=api.indexOf("export async function routeAction(",routeStart);
 const route=api.slice(routeStart,routeEnd);
 assert.ok(routeStart>=0&&routeEnd>routeStart);
 assert.match(api,/return resolveApiEndpoint_\(service\)/);
 assert.doesNotMatch(route,/loadCentralConfiguration|CENTRAL_CONFIGURATION_BOOTSTRAP_URL|resolveCentralServiceEndpoint/);
 const healthStart=api.indexOf("export async function checkAllServicesHealth");
 const healthEnd=api.indexOf("export async function checkServiceHealth",healthStart);
 const health=api.slice(healthStart,healthEnd);
 assert.ok(healthStart>=0&&healthEnd>healthStart);
 assert.match(health,/resolveApiEndpoint_\(serviceKey\)/);
 assert.doesNotMatch(health,/loadCentralConfiguration|resolveCentralServiceEndpoint/);
}
{
 let clock=1000000,revision=1,deployment="CURRENT";
 const cache=createCentralConfigurationCache({now:()=>clock});
 const loader=async()=>({
  status:"success",schemaVersion:1,revision,generatedAt:"2026-11-23T00:00:00.000Z",routingAvailable:true,stale:false,
  services:Object.fromEntries(serviceKeys.map(key=>[key,{endpointUrl:"https://script.google.com/macros/s/"+deployment+"_"+key+"_123456789/exec",enabled:true,contractVersion:"2.2.5",minClientVersion:"2.2.5"}])),
  parameters:{}
 });
 const first=await cache.load(loader);
 assert.match(resolveCentralServiceEndpoint(first,"ADMIN"),/CURRENT_ADMIN/);
 clock+=CENTRAL_CONFIG_FRESH_TTL_MS+1;revision=2;deployment="ROTATED";
 const second=await cache.load(loader);
 assert.equal(second.revision,2);
 assert.match(resolveCentralServiceEndpoint(second,"ADMIN"),/ROTATED_ADMIN/);
}
console.log("MIG009FrontendActionRouter: 5/5 PASS — 125 acciones, seis endpoints locales, resolución fail-closed, router/health locales y caché transitoria aislada.");
