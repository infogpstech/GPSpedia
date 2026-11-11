const ADMIN_IMAGE_UPLOAD_PENDING_PREFIX = "adminImageUploadPending:";
const ADMIN_IMAGE_UPLOAD_FIELDS = new Set(["imagenVehiculo","imgCorte1","imgCorte2","imgCorte3","imgApertura","imgCableAlimen","imgCableAlimen2","imgCableAlimen3"]);
export function getAdminImageUploadPendingKey(ownerId,vehicleId,fieldName){
 const owner=String(ownerId??"").trim(),vehicle=String(vehicleId??"").trim(),field=String(fieldName||"").trim();
 if(!owner||!vehicle||!ADMIN_IMAGE_UPLOAD_FIELDS.has(field))return "";
 return ADMIN_IMAGE_UPLOAD_PENDING_PREFIX+encodeURIComponent(owner)+":"+encodeURIComponent(vehicle)+":"+encodeURIComponent(field);
}
export function getLegacyAdminImageUploadPendingKey(vehicleId,fieldName){
 const vehicle=String(vehicleId??"").trim(),field=String(fieldName||"").trim();
 return vehicle&&ADMIN_IMAGE_UPLOAD_FIELDS.has(field)?ADMIN_IMAGE_UPLOAD_PENDING_PREFIX+encodeURIComponent(vehicle)+":"+encodeURIComponent(field):"";
}
export function getQuarantinedAdminImageUploadPendingKey(vehicleId,fieldName,opId,reason="owner-missing"){
 const vehicle=String(vehicleId??"").trim(),field=String(fieldName||"").trim(),id=String(opId||"unknown").trim();
 if(!vehicle||!ADMIN_IMAGE_UPLOAD_FIELDS.has(field))return "";
 const safeReason=reason==="owner-mismatch"?"owner-mismatch":"owner-missing";
 return ADMIN_IMAGE_UPLOAD_PENDING_PREFIX+"quarantine:"+safeReason+":"+encodeURIComponent(vehicle)+":"+encodeURIComponent(field)+":"+encodeURIComponent(id);
}
export function createAdminImageUploadPendingSnapshot(operation){
 if(!operation||typeof operation!=="object")return null;
 const ownerId=String(operation.ownerId??"").trim(),vehicleId=String(operation.vehicleId??"").trim(),fieldName=String(operation.fieldName||"").trim(),id=String(operation.id||"").trim();
 if(!ownerId||!vehicleId||!ADMIN_IMAGE_UPLOAD_FIELDS.has(fieldName)||!/^[A-Za-z0-9_-]{20,80}$/.test(id)||
 typeof operation.fileData!=="string"||!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(operation.fileData)||
 !String(operation.filename||"").trim()||!/^image\//i.test(String(operation.mimeType||"")))return null;
 return {id,ownerId,vehicleId,fieldName,fileData:operation.fileData,filename:String(operation.filename),mimeType:String(operation.mimeType),createdAt:Number(operation.createdAt)||Date.now()};
}
export function isAdminImageUploadPendingOwnedBy(operation,ownerId){
 const expected=String(ownerId??"").trim();
 return Boolean(expected&&operation&&String(operation.ownerId||"")===expected);
}
