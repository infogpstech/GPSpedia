import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const feedback=readFileSync(new URL("../Services/feedback.js",import.meta.url),"utf8");
const inbox=readFileSync(new URL("../Services/InboxConversations.js",import.meta.url),"utf8");
function extract(source,name,next){const start=source.indexOf("function "+name+"(");assert.ok(start>=0,"Missing "+name);const end=next?source.indexOf("\nfunction "+next+"(",start+10):source.indexOf("\nfunction ",start+10);return source.slice(start,end>start?end:source.length);}
const helper=extract(feedback,"acquireFeedbackScriptLock_","DIRECT_SERVICE_TRAFFIC_CONFIG_");
const acquire=new Function(helper+";return acquireFeedbackScriptLock_;")();
{
 const calls=[];const lock={tryLock(ms){calls.push(ms);return true;}};
 assert.equal(acquire(lock),true);assert.deepEqual(calls,[0]);
}
{
 const calls=[];const lock={tryLock(ms){calls.push(ms);return false;}};
 assert.throws(()=>acquire(lock),/FEEDBACK está procesando otra escritura/);assert.deepEqual(calls,[0]);
}
{
 const calls=[];const lock={waitLock(ms){calls.push(ms);}};
 assert.equal(acquire(lock),true);assert.deepEqual(calls,[0],"El fallback solo se usa en dobles de prueba y nunca espera.");
}
assert.doesNotMatch(feedback,/waitLock\((?:10000|15000)\)/);
assert.doesNotMatch(inbox,/waitLock\(10000\)/);
assert.match(inbox,/lock\.tryLock\(0\)/);
for(const name of ["handleSuggestYear","handleRecordLike","handleReportProblem","handleSuggestCutChange","handleAddProblem","handleAddTutorial","handleUpdateTutorialItem"]){
 const body=extract(feedback,name);
 assert.ok(body.includes("acquireFeedbackScriptLock_(lock)"),name+" debe adquirir el lock sin espera.");
}
{
 const contact=extract("handleSendContactForm");
 assert.doesNotMatch(contact,/LockService\.getScriptLock\(\)|acquireFeedbackScriptLock_\(/,
  "El formulario de contacto no debe conservar el lock global durante su escritura.");
 assert.match(contact,/getNextFormulaBasedId_\(sheet, COLS_CONTACTANOS\.Contacto_ID\)/,
  "La asignación secuencial conserva su sección crítica breve.");
 assert.match(contact,/sheet\.appendRow\(row\)/,
  "El registro de contacto se anexa en una sola escritura.");
 assert.ok(contact.indexOf("getNextFormulaBasedId_") < contact.indexOf("sheet.appendRow(row)"));
}
console.log("1/1 PASS — FEEDBACK e Inbox sin esperas de bloqueo prolongadas");
