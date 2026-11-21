import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../Services/feedback.js",import.meta.url),"utf8");
const start=source.indexOf("function handleAddProblem(source) {");
const end=source.indexOf("\\nfunction withPysMutationLock_",start);
const handler=source.slice(start,end);
assert.doesNotMatch(handler,/LockService\\.getScriptLock\\(\\)|acquireFeedbackScriptLock_\\(|releaseLockForPostWork/);
assert.match(handler,/if \(file && reservationConfirmed\\)[\\s\\S]*?markPysImageForRecovery_/,
 "Una imagen ya reservada se conserva ante cualquier fallo ambiguo.");
assert.match(handler,/if \(file && !reservationConfirmed\\)[\\s\\S]*?isPysOperationImageReferenced_/,
 "Solo se compensa una imagen cuando se confirma que no tiene referencias.");
assert.match(source,/function isPysOperationImageReferenced_\\(opsSheet, fileId\\) \\{[\\s\\S]*?readPysOperations_\\(opsSheet\\)/);
console.log("FeedbackPysRollbackOutsideLock: 6/6 PASS");
