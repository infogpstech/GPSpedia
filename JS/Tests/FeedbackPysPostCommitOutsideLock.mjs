import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function handleAddProblem(source) {");
const end = source.indexOf("\nfunction ", start + 10);
assert.ok(start >= 0 && end > start, "No se encontró handleAddProblem");
const handler = source.slice(start, end);

const successRelease = handler.indexOf("releaseLockForPostWork();", handler.indexOf('status: "LINKED"'));
const successMetadata = handler.indexOf('file.setDescription(["GPSpedia PyS — LINKED"');
const activity = handler.indexOf('logUserActivity(userId, userName, "add_problem"');
assert.ok(successRelease >= 0 && successRelease < successMetadata && successMetadata < activity,
    "La metadata LINKED y el log de actividad deben ejecutarse después de liberar ScriptLock");

const readError = handler.indexOf("catch (readError)");
const readLedger = handler.indexOf('status: "RECOVERY_REQUIRED"', readError);
const readRelease = handler.indexOf("releaseLockForPostWork();", readError);
const readMetadata = handler.indexOf("markPysImageForRecovery_", readError);
assert.ok(readError >= 0 && readLedger < readRelease && readRelease < readMetadata,
    "La marca Drive de recuperación debe ocurrir después de persistir el ledger y liberar el lock");

const ambiguous = handler.indexOf("if (refs.length > 0 || own.length > 0)");
const ambiguousLedger = handler.indexOf('status: "RECOVERY_REQUIRED"', ambiguous);
const ambiguousRelease = handler.indexOf("releaseLockForPostWork();", ambiguous);
const ambiguousMetadata = handler.indexOf("markPysImageForRecovery_", ambiguous);
assert.ok(ambiguous >= 0 && ambiguousLedger < ambiguousRelease && ambiguousRelease < ambiguousMetadata,
    "La metadata de ambigüedad debe ejecutarse fuera del lock");

assert.match(handler, /finally\s*\{\s*if \(lockAcquired\) lock\.releaseLock\(\);\s*\}/,
    "El finally debe liberar solo si la sección crítica sigue adquirida");
console.log("FeedbackPysPostCommitOutsideLock: 4/4 PASS");
