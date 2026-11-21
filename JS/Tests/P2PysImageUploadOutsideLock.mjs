import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runPysCreationIntegrityTests} from "./PysCreationIntegrity.js";
import {runPysImageStorageRecoveryTests} from "./PysImageStorageRecovery.js";
const feedback=readFileSync(new URL("../Services/feedback.js",import.meta.url),"utf8");
const ui=readFileSync(new URL("../Frontend/ui.js",import.meta.url),"utf8");
const a=runPysCreationIntegrityTests({feedback,ui}),b=runPysImageStorageRecoveryTests({feedback,ui});
for(const [name,result] of [["PysCreationIntegrity",a],["PysImageStorageRecovery",b]]){console.log(name+": "+result.passed+"/"+(result.passed+result.failed)+" PASS");for(const item of result.results||[])if(item.status!=="PASS")console.error(name,item.name,item.message);}
assert.equal(a.failed,0,"PysCreationIntegrity tiene fallos");assert.equal(b.failed,0,"PysImageStorageRecovery tiene fallos");
const start=feedback.indexOf("function handleAddProblem(source)"),end=feedback.indexOf("\nfunction handleAddSolution(payload)",start),handler=feedback.slice(start,end);
assert.ok(!handler.includes("LockService.getScriptLock()")&&!handler.includes("acquireFeedbackScriptLock_("));
assert.ok(handler.includes("writePysOperation_(opsSheet, 0,"));
console.log("P2PysImageUploadOutsideLock: PASS — Drive y alta PyS sin lock global");
