import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const admin=readFileSync(new URL("../Services/admin.js",import.meta.url),"utf8");
const write=readFileSync(new URL("../Services/write.js",import.meta.url),"utf8");
const legacyStart=admin.indexOf("function handleAddOrUpdateCut(payload, logMessage, developerContext)");
const legacyEnd=admin.indexOf("\nfunction sanitizeSupplementaryRichText_",legacyStart);
assert.ok(legacyStart>=0&&legacyEnd>legacyStart);
assert.ok(admin.slice(legacyStart,legacyEnd).includes("ACTION_MOVED_TO_WRITE"));
assert.equal(admin.includes("getAdminRecoveryImageRepairNeeds_"),false);

const helperStart=write.indexOf("function getWriteRecoveryImageRepairNeeds_");
const helperEnd=write.indexOf("\nfunction ",helperStart+10);
assert.ok(helperStart>=0&&helperEnd>helperStart);
const helperSource=write.slice(helperStart,helperEnd);
const resolveNeeds=new Function("checkFileIdValid",helperSource+";return getWriteRecoveryImageRepairNeeds_;")(
 value=>typeof value==="string"&&value.startsWith("valid:")
);
const vehicleData={imagenVehiculo:"new-vehicle-image"};
const cutData={imgCorte1:"new-cut-image",tipoCorte1:"Bomba"};
assert.deepEqual(resolveNeeds(vehicleData,cutData,{imagenVehiculo:"valid:vehicle",imgCorte1:"valid:cut"},1),{vehicle:false,cut:false});
assert.deepEqual(resolveNeeds(vehicleData,cutData,{imagenVehiculo:"",imgCorte1:"valid:cut"},1),{vehicle:true,cut:false});
assert.deepEqual(resolveNeeds(vehicleData,cutData,{imagenVehiculo:"valid:vehicle",imgCorte1:""},1),{vehicle:false,cut:true});
assert.deepEqual(resolveNeeds(vehicleData,cutData,{imagenVehiculo:"",imgCorte1:""},1),{vehicle:true,cut:true});
assert.deepEqual(resolveNeeds(vehicleData,{...cutData,tipoCorte1:"No recomendado"},{imagenVehiculo:"valid:vehicle",imgCorte1:""},1),{vehicle:false,cut:false});
assert.deepEqual(resolveNeeds(null,null,{},1),{vehicle:false,cut:false});

const start=write.indexOf("function handleAddOrUpdateCutLockedUnsafe_");
const end=write.indexOf("\nfunction ",start+10);
assert.ok(start>=0&&end>start);
const handler=write.slice(start,end);
const guard=handler.indexOf("if (imageRepairNeeds.vehicle || imageRepairNeeds.cut)");
const drive=handler.indexOf("runWriteDriveWorkOutsideScriptLock_(lock, lockState, opId",guard);
const recoveryEnd=handler.indexOf("// 3. Complete missing/empty text fields",guard);
assert.ok(guard>=0&&drive>guard&&recoveryEnd>drive);
const recovery=handler.slice(guard,recoveryEnd);
assert.equal((recovery.match(/runWriteDriveWorkOutsideScriptLock_\(/g)||[]).length,1,
 "La reparación de imagen debe usar un único ciclo Drive/lock para ambas imágenes.");
assert.ok(recovery.includes("repairedImages = runWriteDriveWorkOutsideScriptLock_"));
assert.ok(recovery.includes("imageRepairNeeds.vehicle"));
assert.ok(recovery.includes("imageRepairNeeds.cut"));
console.log("AdminRecoveryImageRepairFastPath: 1/1 PASS — WRITE omite Drive si no hace falta y agrupa reparaciones en un solo ciclo");
