import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runPysCreationIntegrityTests } from "./PysCreationIntegrity.js";
import { runPysImageStorageRecoveryTests } from "./PysImageStorageRecovery.js";
const feedback=readFileSync(new URL("../Services/feedback.js",import.meta.url),"utf8");
const ui=readFileSync(new URL("../Frontend/ui.js",import.meta.url),"utf8");
const a=runPysCreationIntegrityTests({feedback,ui});
const b=runPysImageStorageRecoveryTests({feedback,ui});
for(const [name,result] of [["PysCreationIntegrity",a],["PysImageStorageRecovery",b]]){
 console.log(name+": "+result.passed+"/"+(result.passed+result.failed)+" PASS");
 for(const item of result.results||[])if(item.status!=="PASS")console.error(name,item.name,item.message);
}
assert.equal(a.failed,0,"PysCreationIntegrity tiene fallos");
assert.equal(b.failed,0,"PysImageStorageRecovery tiene fallos");
const handler=feedback.slice(feedback.indexOf("function handleAddProblem(source)"),feedback.indexOf("\nfunction withPysMutationLock_"));
assert.ok(handler.indexOf("folder.createFile")<handler.indexOf("acquireFeedbackScriptLock_(lock)"),"PyS debe cargar la imagen antes del lock");
assert.ok(handler.includes("if (lockAcquired) lock.releaseLock()"));
console.log("P2PysImageUploadOutsideLock: PASS — Drive fuera del lock y recuperación preservada");
