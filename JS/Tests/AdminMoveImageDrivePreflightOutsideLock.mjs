import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source=readFileSync(new URL("../Services/admin.js",import.meta.url),"utf8");
function extract(name){const start=source.indexOf("function "+name+"(");const end=source.indexOf("\nfunction ",start+10);assert.ok(start>=0&&end>start,"No se encontró "+name);return source.slice(start,end);}
const handler=extract("handleMoveReplacedImage");
const helper=extract("runAdminDriveWorkOutsideScriptLock_");
const outside=handler.indexOf("runAdminDriveWorkOutsideScriptLock_(");
const drive=handler.indexOf("DriveApp.getFileById(driveId)");
const refs=handler.indexOf("collectActiveDriveReferences()");
const move=handler.indexOf("file.moveTo(targetFolder)");
const release=handler.indexOf("lock.releaseLock()");
assert.ok(outside>0&&drive>outside,"La consulta Drive debe estar dentro del preflight externo");
assert.ok(refs>outside&&move>refs,"Las referencias se revalidan bajo lock antes del movimiento");
assert.ok(move<release,"El movimiento y su compensación siguen dentro de la sección crítica");
assert.match(handler,/latestRow\[10\].*status/);
assert.match(handler,/getReplacedImageRecordType\(latestRow, latestHeaders\) !== type/);
assert.match(handler,/getReplacedImageRecordIdentity_\(latestRow, latestHeaders, true\) !== driveId/);
assert.match(handler,/metadataColumns = \{[\s\S]*?organizationDate:/);
assert.match(handler,/La metadata del inventario cambió durante la verificación Drive/);
assert.match(handler,/return \{record:latest,\.\.\.driveResult\};/);
assert.match(handler,/if \(typeof lock\.hasLock !== "function" \|\| lock\.hasLock\(\)\) lock\.releaseLock\(\);/);
assert.doesNotMatch(handler,/setValue\(file\.getMimeType\(\)\)/);
assert.ok(helper.includes("lock.tryLock(0)"));

let locked=true,driveRan=false,revalidated=false;
const lock={hasLock:()=>locked,releaseLock(){locked=false;},tryLock(timeout){assert.equal(timeout,0);locked=true;return true;}};
const runHelper=new Function(helper+"\nreturn runAdminDriveWorkOutsideScriptLock_;")();
const result=runHelper(lock,"ADMIN_MOVE_IMAGE-1",()=>{assert.equal(locked,false);driveRan=true;return {sourcePath:"Cortes/A"};},driveResult=>{assert.equal(locked,true);revalidated=true;return {record:{rowIndex:8},...driveResult};});
assert.equal(driveRan,true);assert.equal(revalidated,true);assert.equal(result.record.rowIndex,8);assert.equal(result.sourcePath,"Cortes/A");assert.equal(locked,true);
console.log("AdminMoveImageDrivePreflightOutsideLock: 11/11 PASS");
