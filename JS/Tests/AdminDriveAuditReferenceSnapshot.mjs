import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const extract = (name, nextName) => {
  const start = admin.indexOf("function " + name + "(");
  const end = admin.indexOf("\nfunction " + nextName + "(", start);
  assert.ok(start >= 0 && end > start, "function " + name + " exists");
  return admin.slice(start, end);
};
const normalizerSource = extract("normalizeDriveAuditReferenceLocations_", "validateAuditDriveReferenceSnapshot_");
const normalizeLocations = new Function(normalizerSource + "\nreturn normalizeDriveAuditReferenceLocations_;")();
const location = {sheet:"Cortes",row:18,column:16,field:"imgCorte2",vehicleId:"V-205",category:"Motocicleta",brand:"Yamaha",model:"MTN155"};
assert.deepEqual(normalizeLocations([location]), [location]);
assert.throws(() => normalizeLocations([{sheet:"Cortes",row:"bad",column:16}]), /fila o columna verificable/);

const idsSource = extract("normalizeDriveAuditFileIds_", "hashDriveAuditFileIds_");
const normalizeIds = new Function(idsSource + "\nreturn normalizeDriveAuditFileIds_;")();
const validateSource = extract("validateAuditDriveReferenceSnapshot_", "removeAuditDriveReferenceSnapshotCache_");
const validateSnapshot = new Function("normalizeDriveAuditFileIds_", "normalizeDriveAuditReferenceLocations_",
  validateSource + "\nreturn validateAuditDriveReferenceSnapshot_;")(normalizeIds, normalizeLocations);
const fileId = "drive-file-12345678901234567890";
const snapshot = {activeDriveIds:[fileId],historicalDriveIds:[],protectedDriveIds:[],
  referenceLocationsById:{[fileId]:[location]},unverifiableReferenceCount:0};
assert.equal(validateSnapshot(snapshot), true);
assert.throws(() => validateSnapshot({...snapshot,referenceLocationsById:{"bad":[location]}}), /ID Drive inválido/);
assert.throws(() => validateSnapshot({...snapshot,referenceLocationsById:{[fileId]:[{sheet:"Cortes",row:-1,column:1}]}}), /fila o columna verificable/);

const cacheValues = new Map();
const cache = {
  get:key=>cacheValues.has(key)?cacheValues.get(key):null,
  put:(key,value)=>cacheValues.set(key,value)
};
const CacheService = {getScriptCache:()=>cache};
const storeSource = extract("storeDriveAuditSeenPage_", "loadDriveAuditSeenIds_");
const storePage = new Function("CacheService","normalizeDriveAuditFileIds_","normalizeDriveAuditReferenceLocations_","getDriveAuditSeenPageCacheKey_",
  storeSource + "\nreturn storeDriveAuditSeenPage_;")(CacheService,normalizeIds,normalizeLocations,(id,page)=>"page:"+id+":"+page);
storePage("audit-1",0,[fileId],["folder-id-12345678901234567890"],[{fileId,fileName:"cut.jpg",mimeType:"image/jpeg",folderPath:"Cortes/Yamaha",folderId:"folder-id-12345678901234567890",referenceLocations:[location]}]);
const page = JSON.parse(cache.get("page:audit-1:0"));
assert.deepEqual(page.metadata[0].referenceLocations,[location]);
assert.deepEqual(page.files,[fileId]);

const loadSource = extract("loadDriveAuditFileMetadata_", "getCortesCanonicalDuplicateFileIds_");
const loadMetadata = new Function("CacheService","getDriveAuditSeenPageCacheKey_","normalizeDriveAuditReferenceLocations_",
  loadSource + "\nreturn loadDriveAuditFileMetadata_;")(CacheService,(id,index)=>"page:"+id+":"+index,normalizeLocations);
const metadata = loadMetadata("audit-1",1,false);
assert.deepEqual(metadata[0].referenceLocations,[location]);
assert.equal(metadata[0].fileId,fileId);

assert.match(admin,/const references = collectActiveDriveReferences\(true\)/);
assert.match(admin,/referenceLocationsById\[String\(fileId\)\] = cortesLocations/);
assert.match(admin,/referenceSnapshot\.referenceLocationsById\[fileId\]/);
assert.match(admin,/referenceLocations: normalizeDriveAuditReferenceLocations_\(item && item\.referenceLocations \|\| \[\]\)/);
assert.match(admin,/referencias_catalogo_json", JSON\.stringify\(Array\.isArray\(auditedMetadata\.referenceLocations\)/);
console.log("AdminDriveAuditReferenceSnapshot: 14/14 PASS");
