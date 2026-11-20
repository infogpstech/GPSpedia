import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source=readFileSync(new URL("../Services/admin.js",import.meta.url),"utf8");
const start=source.indexOf("function handlePermanentlyDeleteReplacedImage(");
const end=source.indexOf("\nfunction ",start+10);
assert.ok(start>=0&&end>start,"No se encontró handlePermanentlyDeleteReplacedImage");
const handler=source.slice(start,end);
const release=handler.indexOf("releaseLock();");
const activityCalls=[...handler.matchAll(/recordImageAdministrationActivity\(/g)].map(m=>m.index);
assert.equal(activityCalls.length,2,"Deben cubrirse la reconciliación 404 y la eliminación confirmada");
assert.ok(activityCalls.every(index=>handler.lastIndexOf("releaseLock();",index)>=0),
    "Cada registro de actividad debe ocurrir después de liberar ScriptLock");
const logIndex=handler.indexOf("logMessage&&logMessage(");
assert.ok(logIndex>0&&handler.lastIndexOf("releaseLock();",logIndex)>=0,
    "El logger de eliminación debe ejecutarse después de liberar ScriptLock");
assert.match(handler,/setReplacedImageHistoryStatusVerified_\(sheet,rowIndex,"eliminada"\);\s*releaseLock\(\);/);
assert.match(handler,/const releaseLock=\(\)=>\{if\(lockAcquired\)\{lock\.releaseLock\(\);lockAcquired=false;\}\};/);
assert.match(handler,/finally\{releaseLock\(\);\}/);
assert.ok(release>=0);
console.log("AdminPermanentDeleteActivityOutsideLock: 6/6 PASS");
