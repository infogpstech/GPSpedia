import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const auth=readFileSync(resolve(root,"JS/Services/Auth.js"),"utf8");
const api=readFileSync(resolve(root,"JS/Frontend/api-config.js"),"utf8");
const start=auth.indexOf("function doPost(e)");
const end=auth.indexOf("\nfunction handleGetPublicConfiguration_",start);
const router=auth.slice(start,end);
let passed=0;
function test(name,run){run();passed++;console.log("PASS "+name);}
test("getUsers/createUser/updateProfile se enrutan a AUTH",()=>{
 assert.match(api,/'getUsers': 'AUTH'/);assert.match(api,/'createUser': 'AUTH'/);assert.match(api,/'updateProfile': 'AUTH'/);
});
test("AUTH usa actor cacheado sin telemetría directa",()=>{
 assert.match(router,/getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken, \{ service: "AUTH" \}\)/);
 assert.match(router,/getUsers", "createUser", "updateProfile/);
 assert.doesNotMatch(auth,/USERS_DIRECT_TRAFFIC_PREFIX_|recordUsersDirectTraffic_|USERS_TRAFFIC_SECRET_PROPERTY_/);
});
console.log("UsersDirectTrafficTelemetry: "+passed+"/2 PASS");
