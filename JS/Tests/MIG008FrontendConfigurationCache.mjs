import assert from "node:assert/strict";
import { createCentralConfigurationCache, CENTRAL_CONFIG_FRESH_TTL_MS, CENTRAL_CONFIG_STALE_TTL_MS } from "../Frontend/centralConfigurationCache.js";

const services = {};
for (const key of ["AUTH","CATALOG","WRITE","USERS","FEEDBACK","UTILITIES","ADMIN"]) {
    services[key] = {endpointUrl:"https://script.google.com/macros/s/FAKE_DEPLOYMENT_"+key+"_123456789/exec",enabled:true,contractVersion:"2.2.5",minClientVersion:"2.2.5"};
}
const valid = {status:"success",schemaVersion:1,revision:7,generatedAt:"2026-11-23T00:00:00.000Z",stale:false,routingAvailable:true,services,parameters:{rich_text_mode:"strict"}};
let clock=5000000;
const cache=createCentralConfigurationCache({now:()=>clock});
let calls=0;
const fetcher=async()=>{calls++;return valid;};

{
    const first=await cache.load(fetcher);
    assert.equal(first.routingAvailable,true);
    assert.equal(first.services.AUTH.enabled,true);
    const second=await cache.load(async()=>{throw new Error("no debe consultar");});
    assert.equal(second.revision,7);
    assert.equal(calls,1);
}
{
    clock+=CENTRAL_CONFIG_FRESH_TTL_MS+1;
    const stale=await cache.load(async()=>{throw new Error("offline");});
    assert.equal(stale.stale,true);
    assert.equal(stale.routingAvailable,false);
    assert.equal(stale.services,null);
    assert.equal(stale.parameters.rich_text_mode,"strict");
}
{
    clock+=CENTRAL_CONFIG_STALE_TTL_MS;
    await assert.rejects(()=>cache.load(async()=>{throw new Error("offline");}),/offline/);
    assert.equal(cache.peek(),null);
}
{
    clock+=100;
    let release;
    const pending=cache.load(()=>new Promise(resolve=>{release=resolve;}));
    const concurrent=cache.load(()=>{throw new Error("single-flight falló");});
    release(valid);
    const results=await Promise.all([pending,concurrent]);
    assert.equal(results[0].revision,7);
    assert.equal(results[1].revision,7);
}
{
    const broken=JSON.parse(JSON.stringify(valid));
    broken.services.AUTH.endpointUrl="https://attacker.example/exec";
    const retained=await cache.load(async()=>broken,{force:true});
    assert.equal(retained.stale,true);
    assert.equal(retained.services.AUTH.enabled,true);
    assert.equal(retained.revision,7);
}
{
    cache.invalidate();
    assert.equal(cache.peek(),null);
    await assert.rejects(()=>cache.load(async()=>{throw new Error("sin fuente");}),/sin fuente/);
}
console.log("MIG008FrontendConfigurationCache: 6/6 PASS — cache-first, single-flight, expiración, stale limitado, invalidación y rechazo de endpoints.");
