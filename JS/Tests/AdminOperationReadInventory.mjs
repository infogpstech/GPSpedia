import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
function block(name) {
    const start = admin.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const end = admin.indexOf("\nfunction ", start + 10);
    return admin.slice(start, end < 0 ? admin.length : end);
}
function count(text, regex) { return [...text.matchAll(regex)].length; }

const backupDb = block("handleBackupDatabase");
const backupDrive = block("handleBackupDrive");
const restoreDb = block("handleRestoreDatabase");
const restoreDrive = block("handleRestoreDrive");
const normalize = block("handleNormalizeImages");
const organize = block("handleOrganizePrimaryVehicleImages");
const replaced = block("handleGetReplacedImages");
const upload = block("handleUploadAdminImage");
const uploadStatus = block("handleGetAdminImageUploadStatus");

let passed = 0;
function test(name, fn) { fn(); passed++; console.log("PASS " + name); }

test("normalización y organización de imágenes leen Cortes una sola vez por operación", () => {
    assert.equal(count(normalize, /getDataRange\(\)/g), 1);
    assert.equal(count(organize, /getDataRange\(\)/g), 1);
    assert.match(normalize, /fileToProcess\.setTrashed\(true\)/);
    assert.match(organize, /getDataRange\(\)/);
});

test("inventario de reemplazos usa un snapshot y proyección interna mínima", () => {
    assert.equal(count(replaced, /getDataRange\(\)/g), 1);
    assert.match(replaced, /getReplacedImagesReadSchema_\(\)/);
    assert.match(replaced, /getDuplicateDriveImageRows_\(rows\)/);
    assert.match(replaced, /getReplacedImageRecordIdentity_\(row, headers/);
});

test("backup DB valida origen y copia, manifiesto completo y privacidad", () => {
    assert.match(backupDb, /adminRestoreValidateDatabaseSchema_\(ss\)/);
    assert.match(backupDb, /adminRestoreValidateDatabaseSchema_\(verifiedSpreadsheet\)/);
    assert.match(backupDb, /status: "complete"/);
    assert.match(backupDb, /DriveApp\.Access\.PRIVATE/);
    assert.match(backupDb, /persistedManifest\.fingerprint/);
    assert.match(backupDb, /createdBackupFile\.setTrashed\(true\)/);
});

test("backup Drive mantiene estado reanudable y manifiesto por lotes", () => {
    assert.match(backupDrive, /adminRestoreDriveManifest_\(sourceRoot\)/);
    assert.match(backupDrive, /status: "copying"/);
    assert.match(backupDrive, /nextFolderIndex/);
    assert.match(backupDrive, /nextFileIndex/);
    assert.match(backupDrive, /adminRestoreVerifyDriveBackupState_/);
});

test("restore DB valida respaldo, staging, rollback y swap verificado", () => {
    assert.match(restoreDb, /adminRestoreValidateDatabaseSchema_\(backupSS\)/);
    assert.match(restoreDb, /adminRestoreCreateDatabaseRollback_\(targetSS, runId\)/);
    assert.match(restoreDb, /__GP_RESTORE_STAGE_/);
    assert.match(restoreDb, /adminRestoreSwapDatabaseSheets_/);
    assert.match(restoreDb, /adminRestoreDeleteTemporarySheets_/);
});

test("restore Drive valida staging y conserva rollback antes de intercambiar", () => {
    assert.match(restoreDrive, /adminRestoreCopyFolderRecursively_/);
    assert.match(restoreDrive, /adminRestoreManifestsEqual_\(backupManifest, adminRestoreDriveManifest_\(stagingFolder\)\)/);
    assert.match(restoreDrive, /GPSpedia_Drive_BACKUP_RESTORE_ROLLBACK_/);
    assert.match(restoreDrive, /adminRestoreMoveFolderContents_\(stagingFolder, targetFolder\)/);
    assert.match(restoreDrive, /adminRestoreManifestsEqual_\(backupManifest, restoredManifest\)/);
});

test("upload ADMIN conserva compare-and-set, ledger append-only y estado requires_review", () => {
    assert.match(upload, /expectedCurrentValue/);
    assert.match(upload, /appendAdminVehicleFieldUpdate_/);
    assert.match(upload, /appendImageUploadEventForAdmin_/);
    assert.match(upload, /state: "linked"/);
    assert.match(upload, /state: "requires_review"/);
    assert.match(upload, /file\.getDescription\(\)\s*\|\| ""\) !== linkedDescription/);
});

test("status de upload solo consulta CATALOG tras encontrar eventos de la operación", () => {
    const entries = uploadStatus.indexOf("const entries = findImageUploadEventsByOperationKeyForAdmin_");
    const empty = uploadStatus.indexOf("if (!entries.length)");
    const projection = uploadStatus.indexOf("getAdminProjectedVehicleFieldSnapshot_");
    assert.ok(entries >= 0 && empty > entries && projection > empty);
    assert.match(uploadStatus, /verifyImageUploadFile_/);
});

console.log("AdminOperationReadInventory: " + passed + "/" + passed + " PASS — respaldos, restore, escáneres y uploads");
