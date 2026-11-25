import assert from"node:assert/strict";import{readFileSync}from"node:fs";
const s=readFileSync(new URL("../Frontend/centralConfigurationCache.js",import.meta.url),"utf8");assert.doesNotMatch(s,/endpointUrl|endpoint_url|resolveCentralServiceEndpoint|routingAvailable|services/i);
const{createCentralConfigurationCache,CENTRAL_CONFIG_FRESH_TTL_MS,CENTRAL_CONFIG_STALE_TTL_MS}=await import("data:text/javascript;base64,"+Buffer.from(s,"utf8").toString("base64"));
const valid={status:"success",schemaVersion:1,revision:7,parameters:{rich_text_mode:"strict"}};let now=5000000,calls=0;const c=createCentralConfigurationCache({now:()=>now}),fetcher=async()=>{calls++;return valid;};
{const a=await c.load(fetcher);assert.equal(a.parameters.rich_text_mode,"strict");assert.equal(Object.hasOwn(a,"services"),false);const b=await c.load(async()=>{throw Error("no debe consultar");});assert.equal(b.revision,7);assert.equal(calls,1);}
{now+=CENTRAL_CONFIG_FRESH_TTL_MS+1;const a=await c.load(async()=>{throw Error("offline");});assert.equal(a.stale,true);assert.equal(a.parameters.rich_text_mode,"strict");}
{now+=CENTRAL_CONFIG_STALE_TTL_MS;await assert.rejects(()=>c.load(async()=>{throw Error("fuera de ventana");}),/fuera de ventana/);assert.equal(c.peek(),null);}
{now+=100;let release;const a=c.load(()=>new Promise(r=>{release=r;})),b=c.load(async()=>{throw Error("single-flight falló");});release(valid);const both=await Promise.all([a,b]);assert.equal(both[0].revision,7);assert.equal(both[1].revision,7);}
{const bad={...valid,parameters:{rich_text_mode:"unsafe"}},a=await c.load(async()=>bad,{force:true});assert.equal(a.stale,true);assert.equal(a.parameters.rich_text_mode,"strict");}
{c.invalidate();assert.equal(c.peek(),null);await assert.rejects(()=>c.load(async()=>{throw Error("sin fuente");}),/sin fuente/);}
console.log("MIG008FrontendConfigurationCache: 6/6 PASS — caché de parámetros, single-flight, stale limitado, invalidación y ausencia de endpoints.");
