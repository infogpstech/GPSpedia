import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source=readFileSync(new URL("../Services/admin.js",import.meta.url),"utf8");
const start=source.indexOf("function handleMarkReplacedImageInUse(");
const end=source.indexOf("\nfunction ",start+10);
assert.ok(start>=0&&end>start,"No se encontró handleMarkReplacedImageInUse");
const handler=source.slice(start,end);
const helper=source.slice(source.indexOf("function runAdminDriveWorkOutsideScriptLock_"),source.indexOf("\nfunction ",source.indexOf("function runAdminDriveWorkOutsideScriptLock_")+10));
const drive=handler.indexOf("DriveApp.getFileById(driveId)");
const outside=handler.indexOf("runAdminDriveWorkOutsideScriptLock_(");
const write=handler.indexOf('setReplacedImageHistoryStatusVerified_(sheet, verified.rowIndex, "en_uso")');
const release=handler.indexOf("lock.releaseLock()");
const activity=handler.indexOf("recordImageAdministrationActivity(postCommitActivity.developerContext");
const log=handler.indexOf("logMessage && logMessage(");
assert.ok(outside>0&&drive>outside&&write>drive,"Drive preflight debe preceder a la escritura del estado");
assert.ok(release>write&&activity>release&&log>release,"Actividad y logging deben ocurrir después de liberar el lock");
assert.match(handler,/latestRow\[10\].*requiere_revision/);
assert.match(handler,/getReplacedImageRecordIdentity_\(latestRow, latestHeaders, true\) !== driveId/);
assert.match(handler,/getReplacedImageRecordType\(latestRow, latestHeaders\) !== type/);
assert.match(handler,/file\.isTrashed\(\)/);
assert.match(handler,/getSingleParentFolderInsideCortes\(file, root\.getId\(\)\)/);
assert.match(handler,/finally\s*\{\s*if \(typeof lock\.hasLock !== "function" \|\| lock\.hasLock\(\)\) lock\.releaseLock\(\);/);
assert.ok(helper.includes("lock.tryLock(0)"),"El trabajo externo debe readquirir el lock sin espera");
assert.ok(handler.indexOf("recordImageAdministrationActivity(")===activity);

console.log("AdminMarkImageInUseDrivePreflightOutsideLock: 10/10 PASS");
