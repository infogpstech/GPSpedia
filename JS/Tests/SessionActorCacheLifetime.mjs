import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../Services/SharedMutationClient.js",import.meta.url),"utf8");
const authSource=readFileSync(new URL("../Services/Auth.js",import.meta.url),"utf8");
const start=source.indexOf("const SHARED_SESSION_ACTOR_CACHE_TTL_SECONDS_");
const end=source.indexOf("\nfunction syncSharedUserSessionContexts_",start);
assert.ok(start>=0&&end>start,"No se encontró la caché del actor de sesión");
const block=source.slice(start,end);
assert.match(block,/SHARED_SESSION_ACTOR_CACHE_TTL_SECONDS_ = 21600/);
assert.match(block,/Math\.min\(21600, Number\(deps\.ttlSeconds\)/);
const cacheValues=new Map(),puts=[];
const cache={
 get:key=>cacheValues.get(key)||null,
 put:(key,value,ttl)=>{cacheValues.set(key,value);puts.push({key,value,ttl});},
 remove:key=>cacheValues.delete(key)
};
let validations=0;
const actor={userId:"U-1",role:"tecnico",epoch:4,fullName:"Técnico"};
const cacheApi=new Function("CacheService",block+"\nreturn {getCachedSharedSessionActor_,cacheSharedSessionActor_};")({getScriptCache:()=>cache});
const getActor=cacheApi.getCachedSharedSessionActor_;
const deps={cache,keyFor:()=>"session-key",validate:(userId,token)=>{validations++;assert.equal(userId,"U-1");assert.equal(token,"token-1");return{status:"success",valid:true,actor};}};
const first=getActor("U-1","token-1",deps);
assert.deepEqual(first,actor);
assert.equal(validations,1);
assert.equal(puts[0].ttl,21600,"El actor queda cacheado durante el máximo TTL de CacheService.");
const second=getActor("U-1","token-1",deps);
assert.deepEqual(second,actor);
assert.equal(validations,1,"Una acción posterior no vuelve a consultar Coordinator mientras exista caché.");
assert.equal(puts.length,1);
cacheValues.set("session-key",JSON.stringify({userId:"U-2",role:"tecnico",epoch:4}));
const third=getActor("U-1","token-1",deps);
assert.deepEqual(third,actor);
assert.equal(validations,2,"Un contexto corrupto/incompatible se descarta y se recupera.");
assert.equal(cacheValues.get("session-key"),JSON.stringify(actor));
const capped=getActor("U-1","token-1",{...deps,cache:{get:()=>null,put:(_k,_v,ttl)=>assert.equal(ttl,21600)},ttlSeconds:99999});
assert.deepEqual(capped,actor);
const primedValues=new Map(),primedCache={
 get:key=>primedValues.get(key)||null,
 put:(key,value)=>primedValues.set(key,value),
 remove:key=>primedValues.delete(key)
};
const primedApi=new Function("CacheService",block+"\nreturn {getCachedSharedSessionActor_,cacheSharedSessionActor_};")({getScriptCache:()=>primedCache});
assert.equal(primedApi.cacheSharedSessionActor_("U-1","token-1",actor,{cache:primedCache,keyFor:()=>"primed-key"}),true);
assert.deepEqual(JSON.parse(primedValues.get("primed-key")),actor);
let primedValidations=0;
assert.deepEqual(primedApi.getCachedSharedSessionActor_("U-1","token-1",{
 cache:primedCache,keyFor:()=>"primed-key",
 validate:()=>{primedValidations++;throw new Error("No debe consultar Coordinator");}
}),actor);
assert.equal(primedValidations,0,"El actor preparado al login evita Coordinator en la primera acción.");
assert.match(authSource,/cacheSharedSessionActor_\(normalizedId, currentSessionToken/);
console.log("SessionActorCacheLifetime: 5/5 PASS — actor precalentado al login y reutilizado sin Coordinator");
