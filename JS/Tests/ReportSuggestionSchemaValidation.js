import fs from "node:fs";
import assert from "node:assert/strict";

function section(source, start, end) {
    const i = source.indexOf(start);
    const j = source.indexOf(end, i + start.length);
    if (i < 0 || j < 0) throw new Error("No se encontró el bloque " + start);
    return source.slice(i, j);
}

export function runReportSuggestionSchemaTests({ feedback, ui }) {
    const results = [];
    let passed = 0, failed = 0;
    const test = (name, fn) => {
        try { fn(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    };
    const helperBlock = section(feedback, "const FEEDBACK_REPORT_TEXT_MAX_LENGTH", "function parseCutSuggestionRecord(");
    const helpers = new Function(helperBlock + `
        return { normalizeFeedbackText_, normalizeSuggestionProposedValues,
            normalizeStoredSuggestionProposedValues, assertMeaningfulSuggestionChanges_,
            FEEDBACK_REPORT_TEXT_MAX_LENGTH, SUGGESTION_FIELD_MAX_LENGTHS };
    `)();

    test("la descripción del reporte elimina espacios externos y normaliza espacios horizontales", () => {
        assert.equal(helpers.normalizeFeedbackText_("  Falla   intermitente  ", "Reporte", 2000), "Falla intermitente");
    });
    test("el reporte rechaza texto vacío, espacios y tipos distintos de string", () => {
        assert.throws(() => helpers.normalizeFeedbackText_("", "Reporte", 2000), /vacío/);
        assert.throws(() => helpers.normalizeFeedbackText_(" \n \t ", "Reporte", 2000), /vacío/);
        assert.throws(() => helpers.normalizeFeedbackText_({ text:"x" }, "Reporte", 2000), /texto/);
    });
    test("el reporte y la justificación respetan el máximo de 2000 caracteres", () => {
        assert.equal(helpers.normalizeFeedbackText_("x".repeat(2000), "Reporte", 2000).length, 2000);
        assert.throws(() => helpers.normalizeFeedbackText_("x".repeat(2001), "Reporte", 2000), /2000/);
        assert.throws(() => helpers.normalizeFeedbackText_("x".repeat(2001), "Justificación", 2000), /2000/);
        assert.equal(helpers.FEEDBACK_REPORT_TEXT_MAX_LENGTH, 2000);
    });
    test("acepta una propuesta parcial de un solo campo", () => {
        assert.deepEqual(helpers.normalizeSuggestionProposedValues({ ubicacion:"  Bajo asiento   trasero " }), { ubicacion:"Bajo asiento trasero" });
    });
    test("acepta propuestas de varios campos y conserva boolean/null del testigo", () => {
        assert.deepEqual(helpers.normalizeSuggestionProposedValues({
            tipo:"Ignición", colorCable:" Azul / Blanco ", activaTestigo:null
        }), { tipo:"Ignición", colorCable:"Azul / Blanco", activaTestigo:null });
        assert.equal(helpers.normalizeSuggestionProposedValues({ activaTestigo:true }).activaTestigo, true);
        assert.equal(helpers.normalizeSuggestionProposedValues({ activaTestigo:false }).activaTestigo, false);
    });
    test("rechaza array, string y propiedades no autorizadas en proposedValues", () => {
        assert.throws(() => helpers.normalizeSuggestionProposedValues([]), /objeto/);
        assert.throws(() => helpers.normalizeSuggestionProposedValues("tipo"), /objeto/);
        assert.throws(() => helpers.normalizeSuggestionProposedValues({ admin:true }), /no está permitido/);
        assert.throws(() => helpers.normalizeSuggestionProposedValues({ activaCheckEngine:true }), /no está permitido/);
    });
    test("rechaza valores con tipos incompatibles", () => {
        assert.throws(() => helpers.normalizeSuggestionProposedValues({ tipo:1 }), /debe ser texto/);
        assert.throws(() => helpers.normalizeSuggestionProposedValues({ ubicacion:["x"] }), /debe ser texto/);
        assert.throws(() => helpers.normalizeSuggestionProposedValues({ activaTestigo:"true" }), /true, false o null/);
        assert.throws(() => helpers.normalizeSuggestionProposedValues({ activaTestigo:{} }), /true, false o null/);
    });
    test("aplica los límites documentados a cada campo propuesto", () => {
        for (const [field, max] of Object.entries(helpers.SUGGESTION_FIELD_MAX_LENGTHS)) {
            assert.equal(helpers.normalizeSuggestionProposedValues({ [field]:"x".repeat(max) })[field].length, max);
            assert.throws(() => helpers.normalizeSuggestionProposedValues({ [field]:"x".repeat(max + 1) }), new RegExp(String(max)));
        }
        assert.deepEqual(helpers.SUGGESTION_FIELD_MAX_LENGTHS, { tipo:80, ubicacion:300, colorCable:120, configRelay:120 });
    });
    test("rechaza propuestas sin campos o con todos los valores iguales al catálogo", () => {
        const current = { tipo:"Ignición", ubicacion:"Bajo tablero", colorCable:"Azul", configRelay:"Relay 4 pines", activaTestigo:false };
        assert.throws(() => helpers.assertMeaningfulSuggestionChanges_({}, current), /no modifica/);
        assert.throws(() => helpers.assertMeaningfulSuggestionChanges_({ tipo:" ignición " }, current), /no modifica/);
        assert.throws(() => helpers.assertMeaningfulSuggestionChanges_({ activaTestigo:false }, current), /no modifica/);
    });
    test("acepta cambio significativo de un campo o de varios campos", () => {
        const current = { tipo:"Ignición", ubicacion:"Bajo tablero", colorCable:"Azul", configRelay:"Relay 4 pines", activaTestigo:false };
        assert.equal(helpers.assertMeaningfulSuggestionChanges_({ ubicacion:"Consola central" }, current), true);
        assert.equal(helpers.assertMeaningfulSuggestionChanges_({ tipo:"Bomba", colorCable:"Verde" }, current), true);
        assert.equal(helpers.assertMeaningfulSuggestionChanges_({ activaTestigo:null }, current), true);
    });
    test("la lectura histórica conserva la compatibilidad con activaCheckEngine", () => {
        assert.equal(helpers.normalizeStoredSuggestionProposedValues({ activaCheckEngine:true }).activaTestigo, true);
        assert.equal(helpers.normalizeStoredSuggestionProposedValues({ activaCheckEngine:"true" }).activaTestigo, true);
        assert.equal(helpers.normalizeStoredSuggestionProposedValues({ activaCheckEngine:"false" }).activaTestigo, false);
        assert.equal(helpers.normalizeStoredSuggestionProposedValues({ activaTestigo:false }).activaTestigo, false);
    });
    test("el handler valida descripción y justificación en servidor antes de escribir", () => {
        const reportHandler = section(feedback, "function handleReportProblem(", "\nfunction enforceFeedbackRateLimit_");
        const suggestionHandler = section(feedback, "function handleSuggestCutChange(", "\nfunction parseModelosAsociados(");
        assert.match(reportHandler, /normalizeFeedbackText_\(problemText, "La descripción del reporte", FEEDBACK_REPORT_TEXT_MAX_LENGTH\)/);
        assert.match(suggestionHandler, /normalizeFeedbackText_\(details, "La justificación de la sugerencia", FEEDBACK_REPORT_TEXT_MAX_LENGTH\)/);
        assert.ok(suggestionHandler.indexOf("assertMeaningfulSuggestionChanges_") < suggestionHandler.indexOf("saveSuggestionImageAttachment_"));
    });
    test("el contexto compara propuestas contra el corte real y el estado del testigo del reporte", () => {
        const contextHandler = section(feedback, "function validateCutSuggestionReportContext_(", "\nfunction normalizeSuggestionImageAttachment_");
        assert.ok(contextHandler.includes("colorCableCorte"));
        assert.ok(contextHandler.includes("configRelay"));
        assert.ok(contextHandler.includes("metadata.activaTestigoMotor"));
        assert.ok(contextHandler.includes("currentValues"));
    });
    test("handleReportProblem rechaza descripción vacía o excesiva antes de adquirir lock", () => {
        const reportStart = feedback.indexOf("function handleReportProblem(");
        const reportEnd = feedback.indexOf("function enforceFeedbackRateLimit_", reportStart);
        const reportHandler = feedback.slice(reportStart, reportEnd);
        const factory = new Function("normalizeFeedbackText_", "FEEDBACK_REPORT_TEXT_MAX_LENGTH", reportHandler + "\nreturn handleReportProblem;");
        const handler = factory(helpers.normalizeFeedbackText_, helpers.FEEDBACK_REPORT_TEXT_MAX_LENGTH);
        const base = { vehicleId:"VEH-1", userId:"USR-1", userName:"Técnico" };
        assert.throws(() => handler({ ...base, problemText:"   " }), /vacío/);
        assert.throws(() => handler({ ...base, problemText:"x".repeat(2001) }), /2000/);
    });
    test("el estado del testigo informado se conserva como baseline al abrir la sugerencia", () => {
        assert.ok(ui.includes("showReportSuccessModal(vehicleId, corteNum, currentCutData, confirmedReportId, activaTestigoMotor)"));
        assert.ok(ui.includes("openSuggestCutModal(vehicleId, corteNum, currentCutData, reportId, reportActivaTestigo)"));
        assert.ok(ui.includes('typeof reportActivaTestigo === "boolean"'));
    });
    test("la interfaz limita texto, descripción y campos propuestos", () => {
        assert.match(ui, /id="rep-error"[^>]*maxlength="1500"/);
        assert.match(ui, /id="rep-incorrecto"[^>]*maxlength="400"/);
        assert.match(ui, /id="sug-ubicacion"[^>]*maxlength="300"/);
        assert.match(ui, /id="sug-color"[^>]*maxlength="120"/);
        assert.match(ui, /id="sug-detalles"[^>]*maxlength="2000"/);
        assert.ok(ui.includes("La descripción completa del reporte no puede superar 2000 caracteres."));
        assert.ok(ui.includes("La justificación no puede superar 2000 caracteres."));
    });

    return { status: failed ? "FAIL" : "PASS", passed, failed, results };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const feedback = fs.readFileSync("Services/feedback.js", "utf8");
    const ui = fs.readFileSync("ui.js", "utf8");
    const result = runReportSuggestionSchemaTests({ feedback, ui });
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "PASS") process.exitCode = 1;
}
