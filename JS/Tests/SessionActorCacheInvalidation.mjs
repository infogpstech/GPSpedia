import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync("JS/Services/SharedSessionActor.js","utf8");
const services=["JS/Services/Auth.js","JS/Services/write.js","JS/Services/admin.js","JS/Services/feedback.js","JS/Services/Utilities.js","JS/Services/catalog.js"]
 .map(path=>({path,source:fs.readFileSync(path,"utf8")}));
const removed=[];
const utilities={DigestAlgorithm:{SHA_256:"SHA_256"},Charset:{UTF_8:"UTF_8"},computeDigest:()=>[1,2,3,4]};
const api=new Function("Utilities","CacheService",source+"\nreturn {handleSharedSessionActorCacheInvalidation_,invalidateLocalSharedSessionActorCaches_};")(
 utilities,{getScriptCache:()=>({remove:key=>removed.push(key)})});
const local=[];
const accepted=api.handleSharedSessionActorCacheInvalidation_(
 {userId:"U-1",sessionTokens:["opaque-session-token-01","opaque-session-token-01","opaque-session-token-02"]},
 {cache:{remove:key=>local.push(key)},keyFor:(id,token)=>id+":"+token}
);
assert.deepEqual(accepted,{status:"success",invalidated:2});
assert.deepEqual(local,["U-1:opaque-session-token-01","U-1:opaque-session-token-02"]);
assert.equal(api.handleSharedSessionActorCacheInvalidation_({userId:"U-1",sessionTokens:["short"]}).status,"error");
assert.doesNotMatch(source.slice(source.indexOf("function handleSharedSessionActorCacheInvalidation_"),source.indexOf("// El contexto de usuario/rol")),/GPSpedia_COORDINATOR_SECRET|properties|getProperty|secret/);

for(const {path,source:code} of services){
 if(path.endsWith("catalog.js")) assert.match(code,/function invalidateCatalogSessionActorCache_/);
 else assert.match(code,/handleSharedSessionActorCacheInvalidation_\(/);
 assert.match(code,/__invalidateSessionActorCache/,"Debe exponer invalidación local sin secreto: "+path);
}
assert.match(source,/function revokeSharedSessionContext_\(userId, sessionToken\) \{\s*return invalidateLocalSharedSessionActorCaches_/);
assert.match(source,/function revokeSharedUserSessionContexts_\(userId, sessionTokens\) \{\s*return invalidateLocalSharedSessionActorCaches_/);
const localRevoke=source.slice(source.indexOf("function revokeSharedSessionContext_"),source.indexOf("function withSharedSessionActor_"));
assert.doesNotMatch(localRevoke,/createSharedMutationClient_|client\.|send_\(/);
console.log("SessionActorCacheInvalidation: 6/6 PASS — invalidación local, sin secretos ni llamadas Coordinator");
