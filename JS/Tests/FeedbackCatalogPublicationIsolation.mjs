import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const feedback = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const helperStart = feedback.indexOf("const FEEDBACK_CATALOG_PYS_CHANGE_ACTIONS_");
const helperEnd = feedback.indexOf("\nfunction doGet(e)", helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, "Debe existir el adaptador de metadatos de catálogo FEEDBACK.");
const helperSource = feedback.slice(helperStart, helperEnd);
const attachFeedbackCatalogChange_ = new Function(helperSource + "\nreturn attachFeedbackCatalogChange_;")();

let passed = 0;
function test(name, callback) {
    callback();
    passed++;
    console.log("PASS " + name);
}

test("recordLike publica delta de Cortes solo cuando el like es nuevo", () => {
    const fresh = attachFeedbackCatalogChange_("recordLike", { vehicleId: "42" }, { status: "success", alreadyLiked: false });
    const duplicate = attachFeedbackCatalogChange_("recordLike", { vehicleId: "42" }, { status: "success", alreadyLiked: true });
    assert.deepEqual(fresh.catalogChange, { collection: "cortes", recordId: "42", operation: "upsert" });
    assert.equal(duplicate.catalogChange, undefined);
});

test("suggestYear transforma invalidación pendiente en delta de Cortes", () => {
    const result = attachFeedbackCatalogChange_("suggestYear", { vehicleId: "42" }, {
        status: "success", catalogResetRequired: true
    });
    assert.deepEqual(result.catalogChange, { collection: "cortes", recordId: "42", operation: "upsert" });
    assert.equal(result.catalogResetRequired, undefined);
});

test("addProblem usa el ID creado para publicar delta PyS", () => {
    const result = attachFeedbackCatalogChange_("addProblem", {}, { status: "success", problemId: "isue-22" });
    assert.deepEqual(result.catalogChange, { collection: "pys", recordId: "isue-22", operation: "upsert" });
});

test("las operaciones PyS existentes conservan el ID del registro", () => {
    for (const action of ["addSolution", "addPrevention", "addVehicleToProblem", "removeVehicleFromProblem", "updatePysItem"]) {
        const result = attachFeedbackCatalogChange_(action, { problemId: "isue-23" }, { status: "success" });
        assert.deepEqual(result.catalogChange, { collection: "pys", recordId: "isue-23", operation: "upsert" });
    }
});

test("updatePysItem acepta el alias id_problem", () => {
    const result = attachFeedbackCatalogChange_("updatePysItem", { id_problem: "isue-24" }, { status: "success" });
    assert.equal(result.catalogChange.recordId, "isue-24");
});

test("updateTutorialItem y addTutorial publican deltas de tutoriales", () => {
    const updated = attachFeedbackCatalogChange_("updateTutorialItem", { tutorialId: "tut-123" }, { status: "success" });
    const created = attachFeedbackCatalogChange_("addTutorial", {}, { status: "success", referenceId: "tut-456" });
    assert.deepEqual(updated.catalogChange, { collection: "tutoriales", recordId: "tut-123", operation: "upsert" });
    assert.deepEqual(created.catalogChange, { collection: "tutoriales", recordId: "tut-456", operation: "upsert" });
});

test("una mutación fallida nunca publica un delta", () => {
    const result = attachFeedbackCatalogChange_("addProblem", {}, { status: "error", problemId: "isue-25" });
    assert.equal(result.catalogChange, undefined);
});

test("acciones ajenas al catálogo no publican cambios", () => {
    const result = attachFeedbackCatalogChange_("reportProblem", {}, { status: "success" });
    assert.equal(result.catalogChange, undefined);
    assert.equal(result.catalogResetRequired, undefined);
});

test("FEEDBACK no invoca SharedMutationClient para publicar cambios", () => {
    assert.doesNotMatch(feedback, /publishSharedCatalogChange_/);
    assert.doesNotMatch(feedback, /publishFeedbackCatalogChange_/);
    assert.doesNotMatch(feedback, /publishPysCatalogChange_/);
    assert.doesNotMatch(feedback, /publishTutorialCatalogChange_/);
});

test("doPost adjunta metadatos después de confirmar la mutación", () => {
    assert.match(feedback, /response = attachFeedbackCatalogChange_\(action, payload, response\);/);
});

test("suggestYear solo notifica después de una aplicación confirmada", () => {
    assert.match(feedback, /if \(catalogResetRequest\) result\.catalogResetRequired = true;/);
});

test("el adaptador no envía snapshots al navegador", () => {
    assert.match(helperSource, /collection: "pys"/);
    assert.match(helperSource, /collection: "tutoriales"/);
    assert.match(helperSource, /collection: "cortes"/);
    assert.doesNotMatch(helperSource, /publishSharedCatalogChange_/);
});

test("las respuestas conservan su resultado original y solo añaden referencia", () => {
    const response = { status: "success", problemId: "isue-27", message: "Guardado" };
    const result = attachFeedbackCatalogChange_("addProblem", {}, response);
    assert.equal(result.message, "Guardado");
    assert.equal(result.status, "success");
    assert.equal(result.catalogChange.snapshot, undefined);
});

test("el frontend puede enviar el cambio sin transportar datos arbitrarios", () => {
    const result = attachFeedbackCatalogChange_("recordLike", { vehicleId: "vehicle-42" }, {
        status: "success", alreadyLiked: false, snapshot: { fake: true }
    });
    assert.deepEqual(result.catalogChange, { collection: "cortes", recordId: "vehicle-42", operation: "upsert" });
    assert.deepEqual(result.snapshot, { fake: true });
});

console.log("FeedbackCatalogPublicationIsolation: " + passed + "/14 PASS");
assert.equal(passed, 14);
