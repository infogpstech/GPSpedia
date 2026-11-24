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
const serviceMatch = api.match(/export\s+const\s+CENTRAL_SERVICE_KEYS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\);/);
assert.ok(serviceMatch, "No se encontró CENTRAL_SERVICE_KEYS.");
const serviceKeys = [...serviceMatch[1].matchAll(/["']([A-Z]+)["']/g)].map(x => x[1]);
assert.deepEqual(serviceKeys, ["AUTH", "CATALOG", "WRITE", "FEEDBACK", "UTILITIES", "ADMIN"]);
assert.equal(Object.keys(actionMap).length, 123, "Cambió el total de acciones sin revisar inventario.");
const actionCounts = Object.fromEntries(serviceKeys.map(key => [key, Object.values(actionMap).filter(service => service === key).length]));
assert.deepEqual(actionCounts, { AUTH: 19, CATALOG: 9, WRITE: 9, FEEDBACK: 40, UTILITIES: 1, ADMIN: 45 });
assert.equal(actionMap.getPublicConfiguration, "AUTH");
assert.equal(actionMap.publishCatalogReset, "CATALOG");
assert.equal(actionMap.invalidateRichTextModeCache, "FEEDBACK");
for (const [action, service] of Object.entries(actionMap)) assert.ok(serviceKeys.includes(service), action + " apunta a servicio desconocido.");
assert.doesNotMatch(api, /API_ENDPOINTS/);
assert.equal((api.match(/https:\/\/script\.google\.com\/macros\/s\//g) || []).length, 1);
assert.match(api, /resolveCentralServiceEndpoint\(snapshot, service\)/);
assert.match(api, /resolveCentralServiceEndpoint\(routingSnapshot, serviceKey\)/);
assert.match(api, /getConfiguredServiceEndpoint_\("FEEDBACK"\)/);
assert.doesNotMatch(api, /PropertiesService|COORDINATOR_SECRET|API_KEY/i);
function makeSnapshot(revision = 1, deployment = "CURRENT") {
 const services = {};
 for (const key of serviceKeys) services[key] = {
   endpointUrl:"https://script.google.com/macros/s/" + deployment + "_" + key + "_123456789/exec",
   enabled:true, contractVersion:"2.2.5", minClientVersion:"2.2.5"
 };
 return {status:"success",schemaVersion:1,revision,generatedAt:"2026-11-23T00:00:00.000Z",routingAvailable:true,stale:false,services,parameters:{}};
}
{
 const current=makeSnapshot();
 assert.match(resolveCentralServiceEndpoint(current,"AUTH"),/CURRENT_AUTH/);
 assert.match(resolveCentralServiceEndpoint(current,"CATALOG"),/CURRENT_CATALOG/);
 assert.match(resolveCentralServiceEndpoint(makeSnapshot(2,"UPDATED"),"WRITE"),/UPDATED_WRITE/);
}
{
 const disabled=makeSnapshot(); disabled.services.WRITE.enabled=false;
 assert.throws(()=>resolveCentralServiceEndpoint(disabled,"WRITE"),/deshabilitado/);
 const expired=makeSnapshot(); expired.routingAvailable=false; expired.services=null;
 assert.throws(()=>resolveCentralServiceEndpoint(expired,"AUTH"),/no permite enrutar/);
 assert.throws(()=>resolveCentralServiceEndpoint(makeSnapshot(),"UNKNOWN"),/desconocido/);
 const malformed=makeSnapshot(); malformed.services.AUTH.endpointUrl="https://attacker.example/exec";
 assert.throws(()=>resolveCentralServiceEndpoint(malformed,"AUTH"),/no es válido/);
}
{
 let clock=1000000,revision=1,deployment="CURRENT";
 const cache=createCentralConfigurationCache({now:()=>clock});
 const loader=async()=>makeSnapshot(revision,deployment);
 const first=await cache.load(loader);
 assert.match(resolveCentralServiceEndpoint(first,"ADMIN"),/CURRENT_ADMIN/);
 clock+=CENTRAL_CONFIG_FRESH_TTL_MS+1; revision=2; deployment="ROTATED";
 const second=await cache.load(loader);
 assert.equal(second.revision,2);
 assert.match(resolveCentralServiceEndpoint(second,"ADMIN"),/ROTATED_ADMIN/);
}
console.log("MIG009FrontendActionRouter: 5/5 PASS — 123 acciones, seis servicios, actualización de URLs, health checks y fail-closed.");
