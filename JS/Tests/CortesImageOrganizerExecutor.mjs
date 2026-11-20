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
const classify = new Function(extractFunction("classifyCortesImageOrganizerOperationState_") +
    "\nreturn classifyCortesImageOrganizerOperationState_;")();
const execute = new Function(extractFunction("executeCortesImageOrganizerManifest_") +
    "\nreturn executeCortesImageOrganizerManifest_;")();
const rollback = new Function(extractFunction("rollbackCortesImageOrganizerOperations_") +
    "\nreturn rollbackCortesImageOrganizerOperations_;")();

const fileId = "drive_file_id_0000000000000001";
const operation = {
    operationId: "a".repeat(64) + ":" + fileId,
    manifestDigest: "a".repeat(64), auditId: "12345678-1234-4234-8234-123456789abc",
    fileId, currentName: "old.jpg", currentFolderPath: "Cortes/Entrada",
    targetName: "Hilux_2020_ign1.jpg", targetFolderPath: "Cortes/Toyota/Hilux"
};
function fixture(options = {}) {
    const state = { fileId, fileName: "old.jpg", folderPath: "Cortes/Entrada", mimeType: "image/jpeg", trashed: false };
    const ledger = new Map();
    const events = [];
    const adapters = {
        loadLedger: id => ledger.get(id) || null,
        saveLedger: record => { ledger.set(record.operationId, structuredClone(record)); events.push("ledger:" + record.status); },
        inspectFile: () => structuredClone(state),
        resolveFolder: path => ({ folder: { path }, chain: [{ path }] }),
        verifyAcl: () => { if (options.failAcl) throw new Error("acl denied"); },
        assertNoNameConflict: () => {},
        moveAndRename: (_id, folder, name) => {
            state.folderPath = folder.path;
            state.fileName = name;
            events.push("move:" + folder.path + ":" + name);
            if (options.failAfterMove) throw new Error("simulated response loss after Drive mutation");
            if (options.failBeforeMove) throw new Error("simulated Drive failure");
        }
    };
    return { state, ledger, events, adapters };
}
const run = (name, fn) => { fn(); console.log("PASS " + name); };

run("persiste processing antes de mover y confirma el resultado", () => {
    const f = fixture();
    const result = execute([operation], "developer-1", f.adapters);
    assert.equal(result.status, "success");
    assert.equal(result.results[0].status, "applied");
    assert.equal(f.ledger.get(operation.operationId).status, "complete");
    assert.ok(f.events.indexOf("ledger:processing") < f.events.findIndex(x => x.startsWith("move:")));
    assert.equal(f.state.folderPath, operation.targetFolderPath);
    assert.equal(f.state.fileName, operation.targetName);
});
run("reintento reconoce el archivo aplicado sin repetir el movimiento", () => {
    const f = fixture();
    execute([operation], "developer-1", f.adapters);
    const moves = f.events.filter(x => x.startsWith("move:")).length;
    const retry = execute([operation], "developer-1", f.adapters);
    assert.equal(retry.results[0].status, "already_applied");
    assert.equal(f.events.filter(x => x.startsWith("move:")).length, moves);
});
run("rechaza una operación durable perteneciente a otro desarrollador", () => {
    const f = fixture();
    f.ledger.set(operation.operationId, { operationId: operation.operationId, ownerId: "other", status: "complete" });
    const result = execute([operation], "developer-1", f.adapters);
    assert.equal(result.results[0].status, "blocked");
    assert.equal(f.state.folderPath, "Cortes/Entrada");
});
run("un fallo de ACL evita el movimiento y registra rollback", () => {
    const f = fixture({ failAcl: true });
    const result = execute([operation], "developer-1", f.adapters);
    assert.equal(result.results[0].status, "rolled_back");
    assert.equal(f.state.folderPath, "Cortes/Entrada");
    assert.equal(f.ledger.get(operation.operationId).status, "rolled_back");
});
run("recupera respuesta perdida después de que Drive aplicó el movimiento", () => {
    const f = fixture({ failAfterMove: true });
    const result = execute([operation], "developer-1", f.adapters);
    assert.equal(result.results[0].status, "applied");
    assert.equal(f.ledger.get(operation.operationId).status, "complete");
});
run("ejecuta rollback y lo hace idempotente", () => {
    const f = fixture();
    execute([operation], "developer-1", f.adapters);
    const reverted = rollback([operation.operationId], "developer-1", f.adapters);
    assert.equal(reverted.status, "success");
    assert.equal(reverted.results[0].status, "rolled_back");
    assert.equal(f.state.folderPath, operation.currentFolderPath);
    const retry = rollback([operation.operationId], "developer-1", f.adapters);
    assert.equal(retry.results[0].status, "already_rolled_back");
});
run("no revierte si el archivo cambió después de aplicar", () => {
    const f = fixture();
    execute([operation], "developer-1", f.adapters);
    f.state.fileName = "manual-change.jpg";
    const result = rollback([operation.operationId], "developer-1", f.adapters);
    assert.equal(result.results[0].status, "needs_review");
    assert.equal(f.state.fileName, "manual-change.jpg");
});
run("rechaza IDs duplicados o inválidos en rollback", () => {
    const f = fixture();
    assert.throws(() => rollback([operation.operationId, operation.operationId], "developer-1", f.adapters), /inválidos o repetidos/i);
    assert.throws(() => rollback(["bad"], "developer-1", f.adapters), /inválidos o repetidos/i);
});
console.log("CortesImageOrganizerExecutor: 8/8 PASS");
