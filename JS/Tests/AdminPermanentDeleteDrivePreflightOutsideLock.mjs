import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source=readFileSync(new URL("../Services/admin.js",import.meta.url),"utf8");
function extract(name){const start=source.indexOf("function "+name+"(");const end=source.indexOf("\nfunction ",start+10);assert.ok(start>=0&&end>start,"No se encontró "+name);return source.slice(start,end);}
const handler=extract("handlePermanentlyDeleteReplacedImage");
const helper=extract("runAdminDriveWorkOutsideScriptLock_");
const preflight=handler.indexOf("runAdminDriveWorkOutsideScriptLock_(");
const driveGet=handler.indexOf('requestAdminDriveFile_(driveId,"get")');
const references=handler.indexOf("collectActiveDriveReferences()");
const pending=handler.indexOf('setReplacedImageHistoryStatusVerified_(sheet,rowIndex,"eliminacion_pendiente")');
const deletion=handler.indexOf('requestAdminDriveFile_(driveId,"delete")');
const finalGet=handler.indexOf('requestAdminDriveFile_(driveId,"get")',driveGet+10);
assert.ok(preflight>=0&&driveGet>preflight,"La lectura Drive debe estar dentro del preflight externo");
assert.ok(references>preflight&&pending>references&&deletion>pending&&finalGet>deletion,
    "La verificación de referencias y el commit destructivo deben ocurrir después de revalidar y bajo lock");
assert.match(handler,/driveResult => \{[\s\S]*?latestRow\[10\].*status[\s\S]*?getReplacedImageRecordType\(latestRow,latestHeaders\)!==type[\s\S]*?getReplacedImageRecordIdentity_\(latestRow,latestHeaders,true\)!==driveId/);
assert.match(handler,/return \{record:latest,missing:driveResult\.missing===true,fileName:driveResult\.fileName\|\|""\};/);
assert.match(handler,/if\(verified\.missing\)[\s\S]*?setReplacedImageHistoryStatusVerified_\(sheet,rowIndex,"eliminada"\)/);
assert.match(handler,/if\(deletion\.code!==404[\s\S]*?setReplacedImageHistoryStatusVerified_\(sheet,rowIndex,status\)/);
assert.match(handler,/const releaseLock=\(\)=>\{if\(lockAcquired\)\{if\(typeof lock\.hasLock!=="function"\|\|lock\.hasLock\(\)\)lock\.releaseLock\(\);lockAcquired=false;\}\};/);

const runHelper=new Function(helper+"\nreturn runAdminDriveWorkOutsideScriptLock_;")();
let locked=true,driveRan=false,revalidated=false;
const lock={hasLock:()=>locked,releaseLock(){assert.equal(locked,true);locked=false;},tryLock(timeout){assert.equal(timeout,0);locked=true;return true;}};
const result=runHelper(lock,"ADMIN_PERMANENT_DELETE_IMG-1",()=>{assert.equal(locked,false);driveRan=true;return {missing:false};},driveResult=>{assert.equal(locked,true);revalidated=true;return {record:{rowIndex:4},missing:driveResult.missing};});
assert.equal(driveRan,true);assert.equal(revalidated,true);assert.equal(result.record.rowIndex,4);assert.equal(result.missing,false);assert.equal(locked,true);
console.log("AdminPermanentDeleteDrivePreflightOutsideLock: 9/9 PASS");
