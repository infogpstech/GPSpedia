import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
function extractFunction(name) {
    const start = admin.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const next = admin.indexOf("\nfunction ", start + 10);
    const end = next >= 0 ? next : admin.length;
    const block = admin.slice(start, end);
    const close = block.lastIndexOf("\n}");
    assert.ok(close >= 0, "No se encontró el cierre de " + name);
    return block.slice(0, close + 2);
}
const normalize = extractFunction("normalizeOrganizerSegment_");
const buildManifest = new Function(normalize + "\n" + extractFunction("buildCortesImageOrganizerApplyManifest_") +
    "\nreturn buildCortesImageOrganizerApplyManifest_;")();
const classify = new Function(extractFunction("classifyCortesImageOrganizerOperationState_") +
    "\nreturn classifyCortesImageOrganizerOperationState_;")();
const rollback = new Function(extractFunction("buildCortesImageOrganizerRollbackPlan_") +
    "\nreturn buildCortesImageOrganizerRollbackPlan_;")();

const digest = "a".repeat(64);
const auditId = "12345678-1234-4234-8234-123456789abc";
const id1 = "drive_file_id_0000000000000001";
const id2 = "drive_file_id_0000000000000002";
const item = (fileId, overrides = {}) => ({
    fileId, status: "ready", activeReferenceCount: 1,
    sheetName: "Cortes", row: 2, field: "imgCorte1",
    currentName: "old.jpg", currentFolderPath: "Cortes/Entrada",
    targetName: "Hilux_2020_ign1.jpg", targetFolderPath: "Cortes/Camionetas/Toyota/Hilux",
    originalExtension: ".jpg", action: "move_and_rename",
    ...overrides
});
const preview = (results = [item(id1), item(id2)], overrides = {}) => ({
    status: "success", writePerformed: false, manifestDigest: digest, auditId,
    referenceCheckStatus: "verified", missingReferenceCount: 0, results, ...overrides
});
const run = (name, fn) => { fn(); console.log("PASS " + name); };

run("congela operaciones seleccionadas con IDs y destinos exactos", () => {
    const result = buildManifest(preview(), [id1], digest, true);
    assert.equal(result.length, 1);
    assert.equal(result[0].operationId, digest + ":" + id1);
    assert.equal(result[0].targetName, "Hilux_2020_ign1.jpg");
});
run("exige confirmación explícita del Desarrollador", () => {
    assert.throws(() => buildManifest(preview(), [id1], digest, false), /confirmación explícita/i);
});
run("rechaza digest distinto al preview", () => {
    assert.throws(() => buildManifest(preview(), [id1], "b".repeat(64), true), /digest/i);
});
run("rechaza preview con referencias no verificadas", () => {
    assert.throws(() => buildManifest(preview(undefined, { referenceCheckStatus: "unverifiable" }), [id1], digest, true), /referencias/i);
});
run("rechaza IDs seleccionados duplicados", () => {
    assert.throws(() => buildManifest(preview(), [id1, id1], digest, true), /repetidos/i);
});
run("rechaza archivos que no pertenecen a la página revisada", () => {
    assert.throws(() => buildManifest(preview(), ["drive_file_id_0000000000000099"], digest, true), /no pertenece/i);
});
run("rechaza nombres de destino con separadores de ruta", () => {
    assert.throws(() => buildManifest(preview([item(id1, { targetName: "subdir/file.jpg" })]), [id1], digest, true), /origen, destino/i);
    assert.throws(() => buildManifest(preview([item(id1, { targetName: "subdir\\file.jpg" })]), [id1], digest, true), /origen, destino/i);
});
run("rechaza propuestas bloqueadas", () => {
    assert.throws(() => buildManifest(preview([item(id1, { status: "blocked" })]), [id1], digest, true), /listo/i);
});
run("rechaza destinos duplicados dentro del mismo lote", () => {
    assert.throws(() => buildManifest(preview([item(id1), item(id2)]), [id1, id2], digest, true), /mismo destino/i);
});
run("clasifica el estado original como listo", () => {
    const operation = buildManifest(preview([item(id1)]), [id1], digest, true)[0];
    assert.equal(classify({ fileId: id1, fileName: "old.jpg", folderPath: "Cortes/Entrada", mimeType: "image/jpeg" }, operation).status, "ready");
});
run("reintento detecta movimiento y renombrado ya aplicados", () => {
    const operation = buildManifest(preview([item(id1)]), [id1], digest, true)[0];
    assert.equal(classify({ fileId: id1, fileName: operation.targetName, folderPath: operation.targetFolderPath, mimeType: "image/jpeg" }, operation).status, "already_applied");
});
run("bloquea papelera, MIME inválido e identidad alterada", () => {
    const operation = buildManifest(preview([item(id1)]), [id1], digest, true)[0];
    assert.equal(classify({ fileId: id1, trashed: true, mimeType: "image/jpeg" }, operation).reason, "file_in_trash");
    assert.equal(classify({ fileId: id1, mimeType: "application/pdf" }, operation).reason, "file_is_not_an_image");
    assert.equal(classify({ fileId: id2, mimeType: "image/jpeg" }, operation).reason, "file_identity_mismatch");
});
run("genera rollback en orden inverso y solo con estado destino confirmado", () => {
    const manifest = buildManifest(preview([item(id1), item(id2, { targetName: "Hilux_2020_ign2.jpg" })]), [id1, id2], digest, true);
    const states = {};
    manifest.forEach(op => states[op.fileId] = {
        fileId: op.fileId, fileName: op.targetName, folderPath: op.targetFolderPath, mimeType: "image/jpeg"
    });
    const plan = rollback(manifest, [{ fileId: id1, status: "applied" }, { fileId: id2, status: "applied" }], states);
    assert.deepEqual(plan.map(item => item.fileId), [id2, id1]);
    assert.equal(plan[0].toName, "old.jpg");
});
run("impide rollback si el archivo cambió después de aplicar", () => {
    const manifest = buildManifest(preview([item(id1)]), [id1], digest, true);
    assert.throws(() => rollback(manifest, [{ fileId: id1, status: "applied" }], {
        [id1]: { fileId: id1, fileName: "manual.jpg", folderPath: "Cortes/Otro", mimeType: "image/jpeg" }
    }), /no coincide/i);
});
console.log("CortesImageOrganizerApplyPlan: 14/14 PASS");
