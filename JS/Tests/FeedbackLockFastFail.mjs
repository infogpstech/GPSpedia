import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const feedback=readFileSync(new URL("../Services/feedback.js",import.meta.url),"utf8");
const inbox=readFileSync(new URL("../Services/InboxConversations.js",import.meta.url),"utf8");
function extract(source,name,next){const start=source.indexOf("function "+name+"(");assert.ok(start>=0,"Missing "+name);const end=next?source.indexOf("\nfunction "+next+"(",start+10):source.indexOf("\nfunction ",start+10);return source.slice(start,end>start?end:source.length);}
assert.match(feedback,/function acquireFeedbackScriptLock_/);
assert.match(feedback,/lock\.tryLock\(0\)/);
assert.doesNotMatch(feedback,/\.waitLock\(/);
assert.ok([...feedback.matchAll(/\.tryLock\(([^)]*)\)/g)].every(m=>m[1].trim()==="0"));
assert.doesNotMatch(inbox,/\.waitLock\(/);
assert.match(inbox,/LockService\.getScriptLock\(\)/);
assert.match(inbox,/\.tryLock\(0\)/);
assert.ok([...inbox.matchAll(/\.tryLock\(([^)]*)\)/g)].every(m=>m[1].trim()==="0"));
assert.match(inbox,/function runInboxConversationAction_\(callback\)/);
const suggestYear=extract(feedback,"handleSuggestYear");
assert.ok(!suggestYear.includes("LockService.getScriptLock()")&&!suggestYear.includes("acquireFeedbackScriptLock_("));
assert.ok(!extract(feedback,"handleAddTutorial").includes("acquireFeedbackScriptLock_("),"El alta de tutoriales usa reservas append-only y no debe adquirir ScriptLock.");
assert.ok(!extract(feedback,"handleUpdateTutorialItem").includes("acquireFeedbackScriptLock_(")&&!extract(feedback,"handleUpdateTutorialItem").includes("LockService.getScriptLock()"),"La edición de tutorial debe ejecutarse directamente sin lock.");
const addProblem=extract(feedback,"handleAddProblem");
assert.ok(!addProblem.includes("LockService.getScriptLock()")&&!addProblem.includes("acquireFeedbackScriptLock_("),"PyS debe usar reservas append-only sin ScriptLock.");
for(const [name,nextName] of [["handleReportProblem","enforceFeedbackRateLimit_"],["handleSuggestCutChange","parseModelosAsociados"]]){const body=extract(feedback,name,nextName);assert.ok(!body.includes("LockService.getScriptLock()")&&!body.includes("acquireFeedbackScriptLock_("),name+" debe ser lock-free.");}
const contact=extract(feedback,"handleSendContactForm");
assert.ok(!contact.includes("LockService.getScriptLock()")&&!contact.includes("acquireFeedbackScriptLock_("));
assert.ok(contact.includes("getNextFormulaBasedId_(sheet, COLS_CONTACTANOS.Contacto_ID)"));
assert.ok(contact.includes("sheet.appendRow(row)"));
const allocator=extract(feedback,"getNextFormulaBasedId_");
assert.ok(!allocator.includes("LockService")&&!allocator.includes("tryLock")&&!allocator.includes("waitLock")&&!allocator.includes("PropertiesService"));
console.log("1/1 PASS — FEEDBACK e Inbox sem esperas de bloqueo prolongadas");