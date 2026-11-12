import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function extract_(source, start, end) {
    const i = source.indexOf(start), j = source.indexOf(end, i + start.length);
    if (i < 0 || j < 0) throw new Error("No se encontró el bloque " + start);
    return source.slice(i, j);
}

function makeSheet_(rows, options = {}) {
    const data = rows.map(row => row.slice());
    function range_(row, col, numRows = 1, numCols = 1) {
        return {
            getValues() {
                return Array.from({ length: numRows }, (_, r) =>
                    Array.from({ length: numCols }, (_, c) => data[row - 1 + r]?.[col - 1 + c] ?? ""));
            },
            getDisplayValues() {
                return this.getValues().map(values => values.map(value => String(value ?? "")));
            },
            getValue() { return data[row - 1]?.[col - 1] ?? ""; },
            setValue(value) {
                if (options.failWriteAt === col) throw new Error("simulated write failure");
                data[row - 1] = data[row - 1] || [];
                data[row - 1][col - 1] = value;
            },
            setValues(values) {
                if (options.failSetValues) throw new Error("simulated range write failure");
                values.forEach((line, r) => {
                    data[row - 1 + r] = data[row - 1 + r] || [];
                    line.forEach((value, c) => { data[row - 1 + r][col - 1 + c] = value; });
                });
            }
        };
    }
    return {
        data,
        getLastRow: () => data.length,
        getLastColumn: () => Math.max(0, ...data.map(row => row.length)),
        getRange: range_,
        getDataRange: () => range_(1, 1, data.length, Math.max(1, Math.max(0, ...data.map(row => row.length)))),
        appendRow(row) { if (options.failAppend) throw new Error("simulated append failure"); data.push(row.slice()); }
    };
}

function buildHarness_(feedback, options = {}) {
    const initial = options.rows || [];
    const sheet = makeSheet_(initial, options);
    const state = { lockWaits: 0, lockReleases: 0, flushes: 0, inserted: false };
    const context = {
        LockService: { getScriptLock: () => ({
            waitLock() { state.lockWaits++; },
            releaseLock() { state.lockReleases++; }
        }) },
        SpreadsheetApp: { flush() { state.flushes++; if (options.failFlush) throw new Error("simulated flush failure"); } },
        getSpreadsheet: () => ({
            getSheetByName: name => name === "Tutorial" && options.missingSheet !== true ? sheet : null,
            insertSheet: name => { if (name !== "Tutorial") throw new Error("wrong sheet"); state.inserted = true; return sheet; }
        }),
        SHEET_NAMES: { FEEDBACKS: "Feedbacks" },
        getSafeSheet: () => options.feedbackSheet || null,
        findPendingVideoApprovalForTarget_: () => options.pendingApproval === true,
        state
    };
    const helpers = extract_(feedback, "const TUTORIAL_HEADERS", "function extractYouTubeId(url)");
    const updateStart = feedback.indexOf("function handleUpdateTutorialItem(payload)");
    if (updateStart < 0) throw new Error("No se encontró handleUpdateTutorialItem.");
    const update = feedback.slice(updateStart);
    vm.runInNewContext(helpers + "\n" + update + "\nthis.api = { add: handleAddTutorial, update: handleUpdateTutorialItem, headers: TUTORIAL_HEADERS };", context);
    return { api: context.api, sheet, state };
}

export function runTutorialIntegrityTests({ feedback, ui, coordinator, catalog }) {
    const results = [];
    let passed = 0, failed = 0;
    const test = (name, fn) => {
        try { fn(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    };
    const operationId = "0123456789abcdef0123456789abcdef";
    const base = {
        operationId, tema: "Instalación GPS", comoIdentificarlo: "Conector principal",
        dondeEncontrarlo: "Detrás del tablero", detalles: "Verificar continuidad",
        videoUrl: "", userId: "user-1", userName: "Colaborador verificado"
    };
    const headers = ["ID", "Tema", "Imagen", "comoIdentificarlo", "dondeEncontrarlo", "Detalles", "Video", "Colaborador"];

    test("crea Tutorial en la hoja canónica con ocho columnas y orden histórico A:G", () => {
        const h = buildHarness_(feedback, { missingSheet: true });
        const result = h.api.add(base);
        assert.equal(result.status, "success");
        assert.equal(result.referenceId, "tut-" + operationId);
        assert.equal(h.state.inserted, true);
        assert.deepEqual(h.sheet.data[0], headers);
        assert.deepEqual(h.sheet.data[1], ["tut-" + operationId, base.tema, "", base.comoIdentificarlo,
            base.dondeEncontrarlo, base.detalles, "", base.userName]);
        assert.equal(h.state.lockWaits, 1);
        assert.equal(h.state.lockReleases, 1);
    });

    test("un reintento con el mismo operationId devuelve la fila original sin duplicarla", () => {
        const h = buildHarness_(feedback, { missingSheet: true });
        const first = h.api.add(base), retry = h.api.add(base);
        assert.equal(first.referenceId, retry.referenceId);
        assert.equal(retry.alreadyCreated, true);
        assert.equal(h.sheet.data.length, 2);
    });

    test("rechaza reutilizar operationId con contenido diferente", () => {
        const h = buildHarness_(feedback, { missingSheet: true });
        h.api.add(base);
        assert.throws(() => h.api.add({ ...base, tema: "Otro tutorial" }), /ya pertenece a otro tutorial/);
        assert.equal(h.sheet.data.length, 2);
    });

    test("recupera un alta cuyo flush falla si la fila completa quedó persistida", () => {
        const h = buildHarness_(feedback, { rows: [headers], failFlush: true });
        const result = h.api.add(base);
        assert.equal(result.status, "success");
        assert.equal(result.recovered, true);
        assert.equal(h.sheet.data.length, 2);
    });

    test("rechaza temas duplicados por clave normalizada aunque cambie el operationId", () => {
        const h = buildHarness_(feedback, { missingSheet: true });
        h.api.add(base);
        assert.throws(() => h.api.add({ ...base, operationId: "fedcba9876543210fedcba9876543210", tema: "  INSTALACION gps " }), /Ya existe un tutorial/);
        assert.equal(h.sheet.data.length, 2);
    });

    test("valida tema, longitudes, operación y ausencia de enlace directo", () => {
        const h = buildHarness_(feedback, { missingSheet: true });
        assert.throws(() => h.api.add({ ...base, operationId: "short" }), /Identificador de operación/);
        assert.throws(() => h.api.add({ ...base, tema: " " }), /tema.*obligatorio/i);
        assert.throws(() => h.api.add({ ...base, tema: "T".repeat(31) }), /30 caracteres/);
        assert.throws(() => h.api.add({ ...base, detalles: "D".repeat(701) }), /700 caracteres/);
        assert.throws(() => h.api.add({ ...base, videoUrl: "https://youtube.com/watch?v=abcdefghijk" }), /flujo de aprobación/);
        assert.equal(h.sheet.data.length, 0);
        assert.equal(h.state.lockWaits, 0);
    });

    test("extiende H como Colaborador sin reordenar ni reinterpretar filas históricas", () => {
        const oldRows = [
            headers.slice(0, 7),
            ["", "Tutorial antiguo", "imagen-propia", "Cómo reconocer", "Ubicación", "Detalles antiguos", "https://youtube.com/watch?v=abcdefghijk"]
        ];
        const h = buildHarness_(feedback, { rows: oldRows });
        const result = h.api.add({ ...base, operationId: "11111111111111111111111111111111", tema: "Tutorial nuevo" });
        assert.equal(result.status, "success");
        assert.equal(h.sheet.data[0][7], "Colaborador");
        assert.deepEqual(h.sheet.data[1], oldRows[1]);
        assert.equal(h.sheet.data[2][0], "tut-11111111111111111111111111111111");
        assert.equal(h.sheet.data[2][7], base.userName);
    });

    test("no convierte datos de H sin encabezado en colaboradores históricos", () => {
        const rows = [headers.slice(0, 7).concat(""), ["", "Tutorial antiguo", "", "", "", "", "", "Dato sin encabezado"]];
        const h = buildHarness_(feedback, { rows });
        assert.throws(() => h.api.add({ ...base, operationId: "33333333333333333333333333333333" }), /datos históricos sin encabezado/);
        assert.equal(h.sheet.data[0][7], "");
        assert.equal(h.sheet.data[1][7], "Dato sin encabezado");
        assert.equal(h.sheet.data.length, 2);
    });

    test("rechaza el esquema A:E heredado sin modificarlo ni crear Tutoriales alternativo", () => {
        const rows = [["Tema", "Imagen", "Video", "Descripción", "Colaborador"], ["Tutorial antiguo", "", "", "", "Autor"]];
        const h = buildHarness_(feedback, { rows });
        assert.throws(() => h.api.add({ ...base, operationId: "22222222222222222222222222222222" }), /esquema A:G/);
        assert.deepEqual(h.sheet.data, rows);
        assert.equal(h.state.inserted, false);
    });

    test("edita por ID las columnas B, D, E y F sin tocar ID, imagen, vídeo ni colaborador", () => {
        const row = ["tut-stable", "Tema", "imagen", "Identificación anterior", "Ubicación anterior", "Detalle anterior", "video", "Autor"];
        const h = buildHarness_(feedback, { rows: [headers, row] });
        const result = h.api.update({ tutorialId: "tut-stable", tema: "Tema actualizado",
            comoIdentificarlo: "Identificación nueva", dondeEncontrarlo: "Ubicación nueva", detalles: "Detalle nuevo" });
        assert.equal(result.status, "success");
        assert.deepEqual(h.sheet.data[1], ["tut-stable", "Tema actualizado", "imagen", "Identificación nueva",
            "Ubicación nueva", "Detalle nuevo", "video", "Autor"]);
        assert.equal(result.updated.tutorialId, "tut-stable");
    });

    test("permite editar por tema único registros históricos cuyo ID está vacío", () => {
        const row = ["", "Tutorial histórico", "", "Cómo", "Dónde", "Detalles", "", ""];
        const h = buildHarness_(feedback, { rows: [headers, row] });
        h.api.update({ originalTema: "Tutorial histórico", detalles: "Detalle actualizado" });
        assert.equal(h.sheet.data[1][0], "");
        assert.equal(h.sheet.data[1][1], "Tutorial histórico");
        assert.equal(h.sheet.data[1][5], "Detalle actualizado");
    });

    test("no usa un ID tut- inexistente como fallback de un tema coincidente", () => {
        const key = "tut-44444444444444444444444444444444";
        const h = buildHarness_(feedback, { rows: [headers, ["", key, "", "", "", "", "", "Autor"]] });
        assert.throws(() => h.api.update({ tutorialId: key, detalles: "No debe modificar" }), /Tutorial no encontrado/);
        assert.equal(h.sheet.data[1][5], "");
    });

    test("protege el renombrado histórico si hay una aprobación de vídeo pendiente", () => {
        const h = buildHarness_(feedback, { rows: [headers, ["", "Tutorial antiguo", "", "", "", "", "", "Autor"]], pendingApproval: true, feedbackSheet: {} });
        assert.throws(() => h.api.update({ originalTema: "Tutorial antiguo", tema: "Tutorial nuevo" }), /solicitud de vídeo pendiente/);
        assert.equal(h.sheet.data[1][1], "Tutorial antiguo");
    });

    test("rechaza edición ambigua y renombrado a un tema ya utilizado", () => {
        const h = buildHarness_(feedback, { rows: [headers,
            ["tut-1", "Uno", "", "", "", "", "", "A"],
            ["tut-2", "Dos", "", "", "", "", "", "B"]] });
        assert.throws(() => h.api.update({ tutorialId: "inexistente", tema: "Nuevo" }), /Tutorial no encontrado/);
        assert.throws(() => h.api.update({ tutorialId: "tut-1", tema: "Dos" }), /Ya existe otro tutorial/);
    });

    test("libera ScriptLock después de fallos de validación o persistencia", () => {
        const h = buildHarness_(feedback, { missingSheet: true, failAppend: true });
        assert.throws(() => h.api.add(base), /simulated append failure/);
        assert.equal(h.state.lockWaits, 1);
        assert.equal(h.state.lockReleases, 1);
        const u = buildHarness_(feedback, { rows: [headers, ["tut-1", "Tema", "", "", "", "", "", "Autor"]], failSetValues: true });
        assert.throws(() => u.api.update({ tutorialId: "tut-1", detalles: "fallo" }), /simulated range write failure/);
        assert.equal(u.state.lockReleases, 1);
    });

    test("UI limita el alta a Desarrollador, envía todos los campos y conserva ID para aprobación", () => {
        assert.match(ui, /getUiSessionContext_\(\)\?\.role === "desarrollador"/);
        assert.match(ui, /operationId, tema, comoIdentificarlo, dondeEncontrarlo, detalles/);
        assert.match(ui, /referenceId: created\.referenceId/);
        assert.match(ui, /referenceId: item\.ID \|\| item\.Tema/);
        assert.match(ui, /Colaborador/);
        assert.match(ui, /tutorialId: item\.ID \|\| ""/);
        assert.match(ui, /comoIdentificarlo: newComo/);
        assert.match(ui, /dondeEncontrarlo: newDonde/);
    });

    test("autorización backend exige Desarrollador y obtiene identidad de Users", () => {
        assert.match(feedback, /updateTutorialItem:\s*\["Desarrollador"\].*addTutorial:\s*\["Desarrollador"\]/);
        assert.match(feedback, /const actor = assertFeedbackSession\(source, FEEDBACK_ACTION_PERMISSIONS\[action\]\)/);
        assert.match(feedback, /userName: actor\.userName/);
        assert.match(feedback, /const collaborator = normalizeTutorialField_\(source\.userName/);
        const updateStart = feedback.indexOf("function handleUpdateTutorialItem(payload)");
        const updateHandler = feedback.slice(updateStart);
        assert.doesNotMatch(updateHandler, /userRole/);
    });

    test("catálogo conserva las siete columnas históricas y expone Colaborador en H", () => {
        assert.match(catalog, /ID:\s*1,[\s\S]*?Tema:\s*2,[\s\S]*?Imagen:\s*3,[\s\S]*?comoIdentificarlo:\s*4,[\s\S]*?dondeEncontrarlo:\s*5,[\s\S]*?Detalles:\s*6,[\s\S]*?Video:\s*7,[\s\S]*?Colaborador:\s*8/);
    });

    test("coordinador reserva TUTORIAL para alta, edición, solicitud, aprobación y rechazo", () => {
        ["addTutorial", "updateTutorialItem", "submitVideoForApproval", "approveVideo", "rejectVideo"].forEach(action => {
            const start = coordinator.indexOf(action + ":");
            assert.ok(start >= 0, "Falta política " + action);
            const end = coordinator.indexOf("\n", start);
            const policy = coordinator.slice(start, end < 0 ? coordinator.length : end);
            assert.match(policy, /TUTORIAL/);
        });
    });

    return { status: failed ? "FAIL" : "PASS", passed, failed, results };
}

if (import.meta.url === "file://" + process.argv[1]) {
    const result = runTutorialIntegrityTests({
        feedback: fs.readFileSync("Services/feedback.js", "utf8"),
        ui: fs.readFileSync("ui.js", "utf8"),
        coordinator: fs.readFileSync("Services/Coordinator.js", "utf8"),
        catalog: fs.readFileSync("Services/catalog.js", "utf8")
    });
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "PASS") process.exitCode = 1;
}
