import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const extract = (name, nextName) => {
  const start = admin.indexOf("function " + name + "(");
  const end = admin.indexOf("\nfunction " + nextName + "(", start);
  assert.ok(start >= 0 && end > start, "function " + name + " exists");
  return admin.slice(start, end);
};

const fingerprintSource = extract("getDriveAuditCursorFingerprint_", "normalizeDriveAuditFileIds_");
const fingerprint = new Function("hashDriveAuditValue_", fingerprintSource + "\nreturn getDriveAuditCursorFingerprint_;")(value => value);
const cursor = {referenceCacheId:"123e4567-e89b-42d3-a456-426614174000",scanVersion:"2.7.2",
  totalAnalyzed:25,foldersVisited:3,stack:[{folderId:"folder-id-12345678901234567890",fileToken:"opaque-token"}]};
assert.equal(fingerprint(cursor), fingerprint(JSON.parse(JSON.stringify(cursor))));
assert.notEqual(fingerprint(cursor), fingerprint({...cursor,stack:[{...cursor.stack[0],fileToken:"next-token"}]}));
assert.throws(() => fingerprint({...cursor,stack:[]}), /inválido o incompleto/);
assert.throws(() => fingerprint({...cursor,referenceCacheId:"bad"}), /inválido o incompleto/);

const idsSource = extract("normalizeDriveAuditFileIds_", "hashDriveAuditFileIds_");
const normalizeIds = new Function(idsSource + "\nreturn normalizeDriveAuditFileIds_;")();
const idA="drive-file-12345678901234567890", idB="drive-file-22345678901234567890", idC="drive-file-32345678901234567890";
const folderA="drive-folder-12345678901234567890", folderB="drive-folder-22345678901234567890";
assert.deepEqual(normalizeIds([idB,idA,idB]).sort(),[idA,idB].sort());
assert.throws(() => normalizeIds(["bad"]), /ID de Drive inválido/);

const values = new Map([
  ["page:audit-1:0",JSON.stringify({files:[idA,idB],folders:[folderA],unused:[idA],metadata:[]})],
  ["page:audit-1:1",JSON.stringify({files:[idB,idC],folders:[folderB],unused:[idC],metadata:[]})]
]);
let putAllCalls=0, lastTtl=0;
const cache={
  getAll:keys=>Object.fromEntries(keys.filter(key=>values.has(key)).map(key=>[key,values.get(key)])),
  putAll:(items,ttl)=>{putAllCalls++;lastTtl=ttl;Object.entries(items).forEach(([key,value])=>values.set(key,value));},
  get:key=>values.has(key)?values.get(key):null,
  put:(key,value)=>values.set(key,value)
};
const CacheService={getScriptCache:()=>cache};
const loadSource=extract("loadDriveAuditSeenIds_","loadDriveAuditFileMetadata_");
const loadSeen=new Function("CacheService","getDriveAuditReferenceSnapshotConfig_","getDriveAuditSeenPageCacheKey_","normalizeDriveAuditFileIds_",
  loadSource+"\nreturn loadDriveAuditSeenIds_;")(
    CacheService,()=>({ttlSeconds:21600}),(id,page)=>"page:"+id+":"+page,normalizeIds
  );
const seen=loadSeen("audit-1",2,true);
assert.deepEqual(seen.fileIds,[idA,idB,idC].sort());
assert.deepEqual(seen.folderIds,[folderA,folderB].sort());
assert.equal(putAllCalls,1);
assert.equal(lastTtl,21600);
assert.throws(()=>loadSeen("audit-1",3,false),/Falta una página/);
values.set("page:audit-1:0","{");
assert.throws(()=>loadSeen("audit-1",1,false),/corrupta/);
values.set("page:audit-1:0",JSON.stringify({files:[idA],folders:[folderA]}));
assert.throws(()=>loadSeen("audit-1",1,false),/estructura inválida/);

const scannerStart=admin.indexOf("function handleAuditDriveImagesInCortesCore_(");
const scannerEnd=admin.indexOf("\nfunction ",scannerStart+10);
const scanner=admin.slice(scannerStart,scannerEnd);
assert.ok(scanner.includes("state.lastRequestFingerprint === inputFingerprint && state.lastResponseCacheKey"));
assert.ok(scanner.includes("if (cachedResponse !== null) { try { return JSON.parse(cachedResponse);"));
assert.ok(scanner.includes("La respuesta de este lote expiró; inicia una auditoría nueva"));
assert.ok(scanner.includes("state.expectedCursorFingerprint !== inputFingerprint"));
assert.ok(scanner.includes("cursor.stack.forEach(item =>"));
assert.ok(scanner.includes("isFolderInsideCortes(getAuditFolderById(item.folderId)"));
const responseCacheWrite=scanner.indexOf("CacheService.getScriptCache().put(responseCacheKey, responseJson, 21600)");
const pageCountAdvance=scanner.indexOf("state.pageCount = nextPageCount");
const stateCommit=scanner.indexOf("saveDriveAuditServerState_(state)",pageCountAdvance);
assert.ok(responseCacheWrite >= 0 && pageCountAdvance > responseCacheWrite && stateCommit > pageCountAdvance);
assert.ok(scanner.includes("state.scanVersion !== ADMIN_SERVICE_VERSION"));
assert.ok(scanner.includes("storeDriveAuditPageResults_(auditId, pageIndex"));
assert.ok(scanner.includes("storeDriveAuditSeenPage_(auditId, pageIndex"));
console.log("AdminDriveAuditCursorRecovery: 20/20 PASS");
