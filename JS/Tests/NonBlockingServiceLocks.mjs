import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const services=["Auth.js","CentralConfigurationReader.js","InboxConversations.js","SharedSessionActor.js","Utilities.js","admin.js","catalog.js","feedback.js","write.js"];
let checks=0;
for(const file of services){
 const source=readFileSync(new URL("../Services/"+file,import.meta.url),"utf8");
 assert.doesNotMatch(source,/\.waitLock\s*\(/,file+" no debe esperar por un lock."); checks++;
 const args=[...source.matchAll(/\.tryLock\(([^)]*)\)/g)].map(m=>m[1].trim());
 assert.ok(args.every(value=>value==="0"),file+" solo puede adquirir locks con tryLock(0)."); checks++;
 assert.doesNotMatch(source,/Utilities\.sleep\s*\(/,file+" no debe introducir esperas artificiales."); checks++;
}
console.log("NonBlockingServiceLocks: "+checks+"/"+checks+" PASS");
