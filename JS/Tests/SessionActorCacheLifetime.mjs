import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync("JS/Services/SharedMutationClient.js","utf8");
const auth=fs.readFileSync("JS/Services/Auth.js","utf8");
assert.match(source,/SHARED_SESSION_ACTOR_CACHE_TTL_SECONDS_ = 21600/);
assert.match(source,/loadSharedSessionActorFromSpreadsheet_/);
assert.match(source,/getCachedSharedSessionActor_[\s\S]*?loader\(id, token, deps\)/);
assert.match(auth,/cacheSharedSessionActor_\(normalizedId, currentSessionToken/);
assert.doesNotMatch(auth,/syncSharedUserSessionContexts_|validateSharedSessionContext_/);

const values=new Map(),writes=[];
const cache={get:key=>values.get(key)||null,put:(key,value,ttl)=>{values.set(key,value);writes.push({key,value,ttl});},remove:key=>values.delete(key)};
const utilities={DigestAlgorithm:{SHA_256:"SHA_256"},Charset:{UTF_8:"UTF_8"},computeDigest:()=>[1,2,3,4]};
const api=new Function("CacheService","Utilities","SPREADSHEET_ID",source+"\nreturn {getCachedSharedSessionActor_,cacheSharedSessionActor_};")(
 {getScriptCache:()=>cache},utilities,"test-sheet");
const actor={userId:"U-1",role:"tecnico",fullName:"Técnico",epoch:1};
let loads=0;
const deps={cache,keyFor:()=>"session-key",loadActor:()=>{loads++;return actor;}};
assert.deepEqual(api.getCachedSharedSessionActor_("U-1","opaque-session-token-01",deps),actor);
assert.equal(loads,1,"El cache miss carga el actor local desde la fuente de identidad.");
const writesBeforeHit=writes.length;
assert.deepEqual(api.getCachedSharedSessionActor_("U-1","opaque-session-token-01",deps),actor);
assert.equal(loads,1,"El cache hit no vuelve a consultar Spreadsheet.");
assert.equal(writes.length,writesBeforeHit,"El TTL fijo no se renueva en cada acción.");

const invalid={userId:"U-2",role:"tecnico",epoch:1};
assert.throws(()=>api.getCachedSharedSessionActor_("U-1","opaque-session-token-01",{
 ...deps,cache:{get:()=>null,put(){},remove(){}},loadActor:()=>invalid
}),/sesión|confirmar/i,"Un actor de otra identidad se rechaza.");
assert.equal(api.cacheSharedSessionActor_("U-1","opaque-session-token-02",actor,{cache,keyFor:()=>"cap",ttlSeconds:99999}),true);
assert.equal(writes.at(-1).ttl,21600,"El TTL respeta el máximo de CacheService.");
console.log("SessionActorCacheLifetime: 5/5 PASS — caché local fría/caliente y TTL de seis horas");
