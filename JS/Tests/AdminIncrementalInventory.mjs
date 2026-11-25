import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const admin=readFileSync(new URL('../Services/admin.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../Frontend/ui.js',import.meta.url),'utf8');
assert.ok(admin.includes('function validateDriveAuditInventoryBatch_'));
assert.ok(admin.includes('state.ownerId !== String(ownerId || "").trim()'));
assert.ok(admin.includes('if (submitted.some(id => !candidates.has(id))'));
assert.ok(admin.includes('incremental ? validateDriveAuditInventoryBatch_'));
assert.ok(admin.includes("incremental ? ('AUD-' + auditId + '-' + submissionDigest)"));
assert.ok(admin.includes('if (!incremental && auditState.unverifiableReferenceCount'));
assert.ok(admin.includes('if (!incremental && auditState.unverifiableReferenceCount === 0'));
assert.ok(ui.includes('files: unusedBatchIds, incremental: true'));
assert.ok(ui.includes('routeActionWithRetry(\'saveUnusedImagesInventory\''));
assert.ok(ui.includes('Inventario automático: '));
assert.ok(ui.includes("const finalInventory = await routeActionWithRetry('saveUnusedImagesInventory'"));
const start=admin.indexOf('function validateDriveAuditInventoryBatch_');
const end=admin.indexOf('function handleSaveUnusedImagesInventory',start);
const helper=admin.slice(start,end);
let state={auditId:'audit-1',ownerId:'owner-1',status:'running',updatedAt:Date.now(),pageCount:1};
const cache=new Map([['page-0',JSON.stringify(['valid-image-id-123456789012345'])]]);
const validate=new Function('loadDriveAuditServerState_','normalizeDriveAuditFileIds_','CacheService',helper+'return validateDriveAuditInventoryBatch_;')(
 id=>state,
 files=>Array.from(new Set(files.map(x=>typeof x==='object'?x.fileId:x))),
 {getScriptCache:()=>({get:key=>cache.get(key)??null})});
const pageKey='page-0';
globalThis.__unusedValidationKey=pageKey;
assert.equal(validate('audit-1','owner-1',[{fileId:'valid-image-id-123456789012345'}]).status,'running');
assert.throws(()=>validate('audit-1','wrong-owner',[{fileId:'valid-image-id-123456789012345'}]),/otra sesión/);
assert.throws(()=>validate('audit-1','owner-1',[{fileId:'attacker-image-id-123456789'}]),/no emitió/);
console.log('AdminIncrementalInventory: 14/14 PASS');
