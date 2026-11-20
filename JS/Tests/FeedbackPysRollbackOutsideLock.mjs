import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function handleAddProblem(source) {");
const end = source.indexOf("\nfunction ", start + 10);
assert.ok(start >= 0 && end > start, "No se encontró handleAddProblem");
const handler = source.slice(start, end);
const branch = handler.indexOf("if (refs.length > 0 || own.length > 0)");
assert.ok(branch >= 0, "No se encontró la rama que protege referencias ambiguas");
const recoveryWrite = handler.indexOf('status: "RECOVERY_REQUIRED"', branch);
const release = handler.indexOf("releaseLockForPostWork();", recoveryWrite);
const trash = handler.indexOf("file.setTrashed(true)", release);
const trashedCheck = handler.indexOf("file.isTrashed()", trash);
const reacquire = handler.indexOf("acquireFeedbackScriptLock_(lock)", trash);
const reread = handler.indexOf("readPysOperations_(opsSheet)", reacquire);
const pending = handler.indexOf('status: "PENDING"', reread);
assert.ok(recoveryWrite < release && release < trash && trash < trashedCheck && trashedCheck < reacquire,
    "El ledger debe reservar RECOVERY_REQUIRED antes de sacar Drive del lock");
assert.ok(reacquire < reread && reread < pending,
    "Solo tras reacquirir y revalidar el ledger se puede limpiar a PENDING");
assert.match(handler.slice(reacquire), /latestOp\.status !== "RECOVERY_REQUIRED"/);
assert.match(handler.slice(reacquire), /String\(latestOp\.imageFileId\) !== String\(fileId\)/);
assert.match(handler.slice(reacquire), /String\(latestOp\.imageUrl\) !== String\(url\)/);
assert.match(handler, /catch \(cleanupError\)[\s\S]*?markPysImageForRecovery_\(file, problemId, fileId/);
assert.match(handler, /catch \(reconcileError\)[\s\S]*?markPysImageForRecovery_\(file, problemId, fileId/);
console.log("FeedbackPysRollbackOutsideLock: 6/6 PASS");
