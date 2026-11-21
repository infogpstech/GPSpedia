import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../Services/feedback.js",import.meta.url),"utf8");
const start=source.indexOf("function handleAddProblem(source) {");
const end=source.indexOf("\\nfunction withPysMutationLock_",start);
const handler=source.slice(start,end);
assert.doesNotMatch(handler,/LockService\\.getScriptLock\\(\\)|acquireFeedbackScriptLock_\\(|releaseLockForPostWork/);
const reserve=handler.indexOf("writePysOperation_(opsSheet, 0");
const append=handler.indexOf("sheet.appendRow(expected)");
const metadata=handler.indexOf('file.setDescription(["GPSpedia PyS — LINKED"');
const activity=handler.indexOf('logUserActivity(userId, userName, "add_problem"');
assert.ok(reserve>=0&&append>reserve&&metadata>append&&activity>metadata,
 "La reserva completa precede al registro y el trabajo auxiliar sucede después del append.");
assert.doesNotMatch(handler,/status: "LINKED"|status: "RECOVERY_REQUIRED"|setTrashed\(true\)/,
 "El flujo nuevo no muta estados ni elimina archivos tras una escritura ambigua.");
assert.match(source,/function writePysOperation_\\(sheet, rowNumber, record\\) \\{[\\s\\S]*?if \\(rowNumber\\) throw new Error/);
console.log("FeedbackPysPostCommitOutsideLock: 4/4 PASS");
