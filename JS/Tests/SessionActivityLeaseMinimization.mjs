import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin=readFileSync("JS/Services/admin.js","utf8");
const auth=readFileSync("JS/Services/Auth.js","utf8");
const write=readFileSync("JS/Services/write.js","utf8");
const feedback=readFileSync("JS/Services/feedback.js","utf8");
const utilities=readFileSync("JS/Services/Utilities.js","utf8");
const apiConfig=readFileSync("JS/Frontend/api-config.js","utf8");
function block(source,name,nextName){
 const start=source.indexOf("function "+name+"(");assert.ok(start>=0,"No se encontró "+name);
 const end=source.indexOf("\nfunction "+nextName+"(",start+10);return source.slice(start,end<0?undefined:end);
}
const adminPost=block(admin,"doPost","doPostInternal_");
const authPost=block(auth,"doPost","doPostInternal_");
const writePost=block(write,"doPost","doPostInternal_");
const feedbackPost=block(feedback,"doPost","RICH_TEXT_MODE_PROPERTY_");
let passed=0;function test(name,fn){fn();passed++;console.log("PASS "+name);}
test("WRITE/FEEDBACK usan actor cacheado y no adquieren lease por acción",()=>{
 assert.match(writePost,/getCachedSharedSessionActor_/);assert.doesNotMatch(writePost,/withSharedMutationLease_/);
 assert.match(feedbackPost,/getCachedSharedSessionActor_/);assert.doesNotMatch(feedbackPost,/withSharedMutationLease_/);
});
test("AUTH elimina la lease de sesión y carga actor desde la fuente local",()=>{
 assert.match(authPost,/getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken, \{ service: "AUTH" \}\)/);
 assert.doesNotMatch(authPost,/withSharedMutationLease_|sessionOptions|validateSharedSessionContext_/);
 assert.match(authPost,/if \(!isSharedMutationAction_\(action\)\)/);
 assert.match(auth,/function syncSharedSessionContextsForUser_[\s\S]*?cacheSharedSessionActor_/);
 assert.doesNotMatch(auth,/syncSharedUserSessionContexts_|validateSharedSessionContext_/);
 assert.match(auth,/function handleValidateSession\(payload\) \{[\s\S]*?validateSessionReadOnly_\(sessionToken, userId\)/);
});
test("AUTH mantiene bloqueo temporal y hash actual",()=>{
 assert.match(auth,/function beginLoginAttempt\(/);assert.match(auth,/registerFailedLoginAttempt\(/);
 assert.match(auth,/function createPasswordHash\(/);assert.match(auth,/function verifyStoredPassword\(/);
});
test("ADMIN conserva leases solo para operaciones de mantenimiento ajenas a sesión",()=>{
 assert.match(adminPost,/getCachedSharedSessionActor_/);assert.doesNotMatch(adminPost,/withSharedMutationLease_/);
 const operations=[...admin.matchAll(/withSharedMutationLease_\("ADMIN", "([^"]+)"/g)].map(match=>match[1]).sort();
 assert.deepEqual(operations,["auditDriveImagesInCortes","createCortesImageFolder","saveUnusedImagesInventory"].sort());
});
test("UTILITIES obtiene actor local sin lease Coordinator",()=>{
 assert.match(utilities,/getCachedSharedSessionActor_\(payload&&payload\.userId,payload&&payload\.sessionToken/);
 assert.doesNotMatch(utilities,/withSharedMutationLease_\("UTILITIES"/);
});
test("Frontend mantiene el enrutamiento directo a cada servicio",()=>{
 assert.match(apiConfig,/'getVehicleProjection': 'CATALOG'/);assert.match(apiConfig,/'addOrUpdateCut': 'WRITE'/);
});
console.log("SessionActivityLeaseMinimization: "+passed+"/"+passed+" PASS");
