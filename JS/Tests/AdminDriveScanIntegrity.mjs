import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const ui = readFileSync(new URL("../Frontend/ui.js", import.meta.url), "utf8");

const start = admin.indexOf("function validateCompletedDriveAudit_");
const end = admin.indexOf("\nfunction writeDriveInventoryRowVerified_", start);
assert.ok(start >= 0 && end > start, "completed audit validator exists");
const validator = new Function(
  "ADMIN_SERVICE_VERSION", "loadDriveAuditServerState_", "normalizeDriveAuditFileIds_", "hashDriveAuditFileIds_",
  admin.slice(start, end) + "\nreturn validateCompletedDriveAudit_;"
);
let state = {
  ownerId: "developer-1", status: "complete", completedAt: Date.now(), scanVersion: "2.7.2", imageMetadataVersion: 1,
  expectedUnusedCount: 1, expectedUnusedDigest: "stable-digest",
  errorCount: 1, unverifiableReferenceCount: 0
};
const validate = validator(
  "2.7.2",
  () => state,
  files => files.map(file => typeof file === "object" ? file.fileId : file),
  () => "stable-digest"
);
assert.throws(() => validate("audit-1", "developer-1", [{ fileId: "image-file-id-123456789" }]), /errores o referencias no interpretables/);
state.errorCount = 0;
state.unverifiableReferenceCount = 1;
assert.throws(() => validate("audit-1", "developer-1", [{ fileId: "image-file-id-123456789" }]), /errores o referencias no interpretables/);
state.unverifiableReferenceCount = 0;
state.scanVersion = "2.7.1";
assert.throws(() => validate("audit-1", "developer-1", [{ fileId: "image-file-id-123456789" }]), /otra versión/);
state.scanVersion = "2.7.2";
assert.equal(validate("audit-1", "developer-1", [{ fileId: "image-file-id-123456789" }]), state);

assert.match(admin, /function getLatestDriveAuditIdForUser_[\s\S]*?state\.scanVersion!==ADMIN_SERVICE_VERSION[\s\S]*?state\.imageMetadataVersion!==1/);
assert.match(admin, /function getLatestDriveAuditIdForUser_[\s\S]*?Number\(state\.errorCount\s*\|\|\s*0\)\s*>\s*0/);
assert.match(admin, /function validateDriveAuditInventoryBatch_[\s\S]*?state\.scanVersion !== ADMIN_SERVICE_VERSION/);
assert.match(admin, /function validateDriveAuditInventoryBatch_[\s\S]*?Number\(state\.errorCount\s*\|\|\s*0\)\s*>\s*0/);
assert.match(admin, /function handleOrganizeUnusedImagesBatch[\s\S]*?auditState\.scanVersion !== ADMIN_SERVICE_VERSION[\s\S]*?Number\(auditState\.errorCount\s*\|\|\s*0\)\s*>\s*0/);
assert.match(admin, /function handlePreviewCortesImageOrganizer_[\s\S]*?Number\(auditState\.errorCount\s*\|\|\s*0\)\s*>\s*0/);
assert.match(admin, /Number\(auditState\.unverifiableReferenceCount\s*\|\|\s*0\)\s*>\s*0/);

assert.match(ui, /const canSaveInventory = complete && errorCount === 0 && unverifiableReferences === 0/);
assert.match(ui, /const canOrganize = complete && errorCount === 0 && unverifiableReferences === 0/);
assert.match(ui, /reconcileButton\.disabled =[^;]*errorCount > 0[^;]*unverifiableReferences > 0/);
assert.match(ui, /if \(complete && hasUnusedImages && !scanHasErrors\)/);
assert.match(ui, /Los resultados parciales se conservaron, pero no se confirmó el inventario/);
assert.match(admin, /function handleApplyCortesImageReconciliation_[\s\S]*?Number\(auditState\.errorCount\s*\|\|\s*0\)\s*>\s*0/);
console.log("AdminDriveScanIntegrity: 18/18 PASS");
