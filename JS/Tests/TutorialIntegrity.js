import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";

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
    const state = { lockWaits: 0, lockReleases: 0, flushes: 0, inserted: false, insertedTitleEvents: false, insertedEditEvents: false, insertedRenameEvents: false, titleEventsSheet: null, renameEventsSheet: null };
    const titleEventsSheet = makeSheet_(options.titleEvents || [], options);
    state.titleEventsSheet = titleEventsSheet;
    const editEventsSheet = makeSheet_(options.editEvents || [], options);
    const renameEventsSheet = makeSheet_(options.renameEvents || [], options);
    state.renameEventsSheet = renameEventsSheet;
    const context = {
        LockService: { getScriptLock: () => ({
            waitLock() { state.lockWaits++; },
            releaseLock() { state.lockReleases++; }
        }) },
        Utilities: {
            DigestAlgorithm: { SHA_256: "SHA_256" },
            computeDigest: (algorithm, value) => Array.from(crypto.createHash("sha256").update(String(value)).digest())
        },
        SpreadsheetApp: { flush() { state.flushes++; if (options.failFlushAt === state.flushes) throw new Error("simulated flush failure"); } },
        getSpreadsheet: () => ({
            getSheetByName: name => name === "Tutorial"
                ? (options.missingSheet !== true ? sheet : null)
                : name === "TutorialTitleEvents" ? (state.insertedTitleEvents || options.titleEvents ? titleEventsSheet : null)
                : name === "TutorialEditEvents" ? (state.insertedEditEvents || options.editEvents ? editEventsSheet : null)
                : name === "TutorialRenameEvents" ? (state.insertedRenameEvents || options.renameEvents ? renameEventsSheet : null) : null,
            insertSheet: name => {
                if (name === "Tutorial") { state.inserted = true; return sheet; }
                if (name === "TutorialTitleEvents") { state.insertedTitleEvents = true; return titleEventsSheet; }
                if (name === "TutorialEditEvents") { state.insertedEditEvents = true; return editEventsSheet; }
                if (name === "TutorialRenameEvents") { state.insertedRenameEvents = true; return renameEventsSheet; }
                throw new Error("wrong sheet");
            }
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
    vm.runInNewContext(helpers + "\n" + update + "\nthis.api = { add: handleAddTutorial, update: handleUpdateTutorialItem, headers: TUTORIAL_HEADERS, appendTitleEvent: appendTutorialTitleEvent_, readTitleEvents: readTutorialTitleEvents_, titleOwner: getTutorialTitleOwner_, appendEditEvent: appendTutorialEditEvent_, projectEdit: projectTutorialEditFields_, projectTitle: projectTutorialTitle_, titleEventsSheet: state.titleEventsSheet, renameEventsSheet: state.renameEventsSheet };", context);
    return { api: context.api, sheet, state, editEventsSheet };
}

function readCatalogTutorials_(catalog, tutorialRows, editEvents = [], renameEvents = []) {
    const tutorialColumns = extract_(catalog, "const COLS_TUTORIALES", "const COLS_RELAY");
    const relayColumns = extract_(catalog, "const COLS_RELAY", "// ============================================================================");
    const mapper = extract_(catalog, "function mapRowToObject", "function handleGetCatalogData");
    const project = extract_(catalog, "function tutorialEditFieldsHash_", "function projectTutorialCatalogTitles_");
    const titleProject = extract_(catalog, "function projectTutorialCatalogTitles_", "function dedupeTutorialCatalogRows_");
    const dedupe = extract_(catalog, "function dedupeTutorialCatalogRows_", "function handleGetCatalogData");
    const reader = project + "\n" + titleProject + "\n" + dedupe + "\n" + extract_(catalog, "function handleGetCatalogData", "function handleGetDropdownData");
    const editHeaders = ["operationId", "payloadHash", "tutorialId", "expectedHash", "snapshotJson", "createdAt"];
    const renameHeaders = ["operationId", "payloadHash", "tutorialId", "expectedTitleKey", "title", "createdAt"];
    const rows = { Cortes: [["id"]], LogosMarca: [["id"]], Tutorial: tutorialRows.map(row => row.slice()),
        TutorialEditEvents: [editHeaders, ...editEvents.map(row => row.slice())],
        TutorialRenameEvents: [renameHeaders, ...renameEvents.map(row => row.slice())], Relay: [["ID"]] };
    const context = {
        SHEET_NAMES: { CORTES: "Cortes", LOGOS_MARCA: "LogosMarca", TUTORIALES: "Tutorial", RELAY: "Relay" },
        COLS_CORTES: {}, COLS_LOGOS_MARCA: { id: 1, nombreMarca: 2, urlLogo: 3 },
        IMAGE_FIELDS_CORTES: new Set(), IMAGE_FIELDS_LOGOS: new Set(),
        IMAGE_FIELDS_TUTORIALES: new Set(["Imagen"]), IMAGE_FIELDS_RELAY: new Set(),
        CacheService: { getScriptCache: () => ({ get: () => null }) },
        getCortesColumnMap: () => ({}), normalizeAndValidateImageId: value => value,
        normalizeYouTubeUrl: value => value,
        Utilities: { DigestAlgorithm: { SHA_256: "SHA_256" },
            computeDigest: (algorithm, value) => Array.from(crypto.createHash("sha256").update(String(value)).digest()) },
        getSpreadsheet: () => ({ getSheetByName(name) {
            if (!Object.prototype.hasOwnProperty.call(rows, name)) return null;
            return { getDataRange: () => ({ getValues: () => rows[name].map(row => row.slice()) }) };
        } })
    };
    vm.runInNewContext(tutorialColumns + "\n" + relayColumns + "\n" + mapper + "\n" + reader +
        "\nthis.read = handleGetCatalogData;", context);
    return context.read({ forceRefresh: true });
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
        assert.equal(JSON.stringify(h.sheet.data[0]), JSON.stringify(headers));
        assert.equal(JSON.stringify(h.sheet.data[1]), JSON.stringify(["tut-" + operationId, base.tema, "", base.comoIdentificarlo,
            base.dondeEncontrarlo, base.detalles, "", base.userName]));
        assert.equal(h.state.lockWaits, 0);
        assert.equal(h.state.lockReleases, 0);
    });

    test("un reintento con el mismo operationId devuelve la fila original sin duplicarla", () => {
        const h = buildHarness_(feedback, { missingSheet: true });
        const first = h.api.add(base), retry = h.api.add(base);
        assert.equal(first.referenceId, retry.referenceId);
        assert.equal(retry.alreadyCreated, true);
        assert.equal(h.sheet.data.length, 2);
    });

    test("normaliza operationId a minúsculas para producir IDs tut canónicos", () => {
        const h = buildHarness_(feedback, { missingSheet: true });
        const result = h.api.add({ ...base, operationId: operationId.toUpperCase() });
        assert.equal(result.referenceId, "tut-" + operationId);
        assert.equal(h.sheet.data[1][0], "tut-" + operationId);
    });

    test("reintenta una fila histórica tut con distinta capitalización sin duplicarla", () => {
        const legacyId = "tut-" + operationId.toUpperCase();
        const oldRow = [legacyId, base.tema, "", base.comoIdentificarlo, base.dondeEncontrarlo, base.detalles, "", base.userName];
        const h = buildHarness_(feedback, { rows: [headers, oldRow] });
        const result = h.api.add(base);
        assert.equal(result.referenceId, legacyId);
        assert.equal(result.alreadyCreated, true);
        assert.equal(h.sheet.data.length, 2);
    });

    test("rechaza reutilizar operationId con contenido diferente", () => {
        const h = buildHarness_(feedback, { missingSheet: true });
        h.api.add(base);
        assert.throws(() => h.api.add({ ...base, tema: "Otro tutorial" }), /ya pertenece a otro tutorial/);
        assert.equal(h.sheet.data.length, 2);
    });

    test("recupera un alta cuyo flush falla si la fila completa quedó persistida", () => {
        const h = buildHarness_(feedback, { rows: [headers], failFlushAt: 3 });
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
        const result = h.api.update({ originalTema: "Tutorial histórico", detalles: "Detalle actualizado" });
        assert.equal(result.status, "success");
        assert.equal(result.updated.detalles, "Detalle actualizado");
        assert.equal(h.sheet.data[1][0], "");
        assert.equal(h.sheet.data[1][1], "Tutorial histórico");
        assert.equal(h.sheet.data[1][5], "Detalles");
        const identity = "legacy-" + crypto.createHash("sha256").update("tutorial historico").digest("hex");
        assert.equal(h.api.projectEdit(identity, h.sheet.data[1]).row[5], "Detalle actualizado");
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

    test("protege solicitudes antiguas por tema aunque el registro ya tenga ID", () => {
        const h = buildHarness_(feedback, { rows: [headers, ["tut-legacy", "Tema con ID", "", "", "", "", "", "Autor"]],
            pendingApproval: true, feedbackSheet: {} });
        assert.throws(() => h.api.update({ tutorialId: "tut-legacy", tema: "Tema renombrado" }), /solicitud de vídeo pendiente/);
        assert.equal(h.sheet.data[1][1], "Tema con ID");
    });

    test("rechaza edición ambigua y renombrado a un tema ya utilizado", () => {
        const h = buildHarness_(feedback, { rows: [headers,
            ["tut-1", "Uno", "", "", "", "", "", "A"],
            ["tut-2", "Dos", "", "", "", "", "", "B"]] });
        assert.throws(() => h.api.update({ tutorialId: "inexistente", tema: "Nuevo" }), /Tutorial no encontrado/);
        assert.throws(() => h.api.update({ tutorialId: "tut-1", tema: "Dos" }), /Ya existe otro tutorial/);
    });

    test("los fallos de validación o persistencia no requieren ScriptLock", () => {
        const h = buildHarness_(feedback, { missingSheet: true, failAppend: true });
        assert.throws(() => h.api.add(base), /simulated append failure/);
        assert.equal(h.state.lockWaits, 0);
        assert.equal(h.state.lockReleases, 0);
        const u = buildHarness_(feedback, { rows: [headers, ["tut-1", "Tema", "", "", "", "", "", "Autor"]], failSetValues: true });
        assert.throws(() => u.api.update({ tutorialId: "tut-1", detalles: "fallo" }), /simulated range write failure/);
        assert.equal(u.state.lockReleases, 0);
    });

    test("UI limita el alta a Desarrollador, envía todos los campos y conserva ID para aprobación", () => {
        assert.match(ui, /getUiSessionContext_\(\)\?\.role === "desarrollador"/);
        assert.match(ui, /operationId:\s*tutorialOperationId/);
        assert.match(ui, /tema, comoIdentificarlo, dondeEncontrarlo, detalles/);
        assert.match(ui, /createdTutorialId = String\(created\.referenceId\)/);
        assert.match(ui, /referenceId: createdTutorialId/);
        assert.match(ui, /referenceId: item\.ID \|\| item\.Tema/);
        assert.match(ui, /Colaborador/);
        assert.match(ui, /tutorialId: item\.ID \|\| ""/);
        assert.match(ui, /comoIdentificarlo: newComo/);
        assert.match(ui, /dondeEncontrarlo: newDonde/);
        assert.match(ui, /createFormRichTextToolbar_\("edit-tutorial-details-textarea"\)/);
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

    test("authorizeFeedbackAction exige sesión Desarrollador y sustituye identidad del cliente", () => {
        const authBlock = extract_(feedback, "const FEEDBACK_ACTION_PERMISSIONS", "function doPostInternal_");
        const authContext = {
            assertFeedbackSession(payload, allowedRoles) {
                if (!payload.sessionToken) throw new Error("Sesión inválida.");
                const actor = { userId: "USR-VERIFIED", userName: "Nombre desde Users", role: "Desarrollador" };
                if (Array.isArray(allowedRoles) && !allowedRoles.some(role => String(role).toLowerCase() === actor.role.toLowerCase())) {
                    throw new Error("Rol no autorizado.");
                }
                return actor;
            },
        };
        vm.runInNewContext(authBlock + "\nthis.authorize = authorizeFeedbackAction_;", authContext);
        const authorized = authContext.authorize("addTutorial", {
            userId: "USR-FALSO", userName: "Nombre falso", userRole: "Desarrollador",
            colaborador: "Colaborador falso", sessionToken: "SESSION-VALIDA"
        });
        assert.equal(authorized.userId, "USR-VERIFIED");
        assert.equal(authorized.userName, "Nombre desde Users");
        assert.equal(authorized.userRole, "Desarrollador");
        const h = buildHarness_(feedback, { missingSheet: true });
        h.api.add({ ...authorized, operationId: "55555555555555555555555555555555", tema: "Tutorial autenticado" });
        assert.equal(h.sheet.data[1][7], "Nombre desde Users");
        const technicianContext = {
            assertFeedbackSession(payload, allowedRoles) {
                if (!payload.sessionToken) throw new Error("Sesión inválida.");
                const actor = { userId: "USR-TECH", userName: "Técnico", role: "Tecnico" };
                if (Array.isArray(allowedRoles) && !allowedRoles.some(role => String(role).toLowerCase() === actor.role.toLowerCase())) throw new Error("Rol no autorizado.");
                return actor;
            },
        };
        vm.runInNewContext(authBlock + "\nthis.authorize = authorizeFeedbackAction_;", technicianContext);
        assert.throws(() => technicianContext.authorize("addTutorial", { userId: "USR-TECH", sessionToken: "SESSION-TECH" }), /Rol no autorizado/);
    });

    test("edita campos descriptivos con ID estable mediante eventos append-only sin ScriptLock", () => {
        const id = "tut-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        const row = [id, "Tema", "", "Cómo viejo", "Dónde viejo", "Detalle viejo", "", "Autora"];
        const h = buildHarness_(feedback, { rows: [headers, row] });
        const result = h.api.update({ tutorialId: id, comoIdentificarlo: "Cómo nuevo" });
        assert.equal(result.status, "success");
        assert.equal(h.state.lockWaits, 0);
        assert.equal(h.state.lockReleases, 0);
        assert.equal(h.sheet.data[1][3], "Cómo viejo");
        const projected = h.api.projectEdit(id, h.sheet.data[1]);
        assert.equal(projected.row[3], "Cómo nuevo");
        assert.equal(h.editEventsSheet.data.length, 2);
    });

    test("dos ediciones basadas en la misma versión aceptan una sola y el replay idéntico es idempotente", () => {
        const id = "tut-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
        const row = [id, "Tema", "", "Cómo viejo", "Dónde viejo", "Detalle viejo", "", "Autora"];
        const h = buildHarness_(feedback, { rows: [headers, row] });
        const first = ["Cómo A", "Dónde viejo", "Detalle viejo"];
        h.api.appendEditEvent(id, row, first);
        h.api.appendEditEvent(id, row, first);
        assert.equal(h.editEventsSheet.data.length, 2);
        const conflict = ["Cómo B", "Dónde B", "Detalle B"];
        assert.throws(() => h.api.appendEditEvent(id, row, conflict), /Otra edición modificó esta versión/);
        const projected = h.api.projectEdit(id, row);
        assert.deepEqual(projected.row.slice(3, 6), first);
    });

    test("el ledger de títulos elige una sola reserva y rechaza una operación distinta para el mismo tema", () => {
        const h = buildHarness_(feedback, { missingSheet: true });
        const first = { operationId: "tutorial-create-11111111111111111111111111111111",
            tutorialId: "tut-11111111111111111111111111111111", action: "CLAIM",
            titleKey: "motor", previousTitleKey: "", payloadHash: "a".repeat(64) };
        const second = { operationId: "tutorial-create-22222222222222222222222222222222",
            tutorialId: "tut-22222222222222222222222222222222", action: "CLAIM",
            titleKey: "motor", previousTitleKey: "", payloadHash: "b".repeat(64) };
        h.api.appendTitleEvent(first);
        assert.equal(h.api.titleOwner("motor"), first.tutorialId);
        assert.throws(() => h.api.appendTitleEvent(second), /tema del tutorial ya está reservado|Ya existe un tutorial/);
        assert.equal(h.api.titleOwner("motor"), first.tutorialId);
    });

    test("el ledger de títulos rechaza un operationId duplicado con evento contradictorio", () => {
        const h = buildHarness_(feedback, { missingSheet: true });
        const first = { operationId: "tutorial-create-44444444444444444444444444444444",
            tutorialId: "tut-44444444444444444444444444444444", action: "CLAIM",
            titleKey: "tema uno", previousTitleKey: "", payloadHash: "4".repeat(64) };
        h.api.appendTitleEvent(first);
        const conflicting = { ...first, titleKey: "tema dos" };
        const digest = crypto.createHash("sha256").update(JSON.stringify([
            conflicting.operationId, conflicting.tutorialId, conflicting.action, conflicting.titleKey,
            conflicting.previousTitleKey, conflicting.payloadHash
        ])).digest("hex");
        h.api.titleEventsSheet.appendRow([conflicting.operationId, digest, conflicting.tutorialId,
            conflicting.action, conflicting.titleKey, conflicting.previousTitleKey, conflicting.payloadHash, "now"]);
        assert.throws(() => h.api.readTitleEvents(h.api.titleEventsSheet), /mismo operationId con eventos contradictorios/);
    });

    test("el ledger de títulos rechaza eventHash alterado", () => {
        const h = buildHarness_(feedback, { missingSheet: true });
        h.api.appendTitleEvent({ operationId: "tutorial-create-55555555555555555555555555555555",
            tutorialId: "tut-55555555555555555555555555555555", action: "CLAIM",
            titleKey: "tema", previousTitleKey: "", payloadHash: "5".repeat(64) });
        h.api.titleEventsSheet.data[1][1] = "f".repeat(64);
        assert.throws(() => h.api.readTitleEvents(h.api.titleEventsSheet), /eventHash que no coincide/);
    });

    test("el rename append-only libera el título anterior y reserva el nuevo", () => {
        const h = buildHarness_(feedback, { missingSheet: true });
        const tutorialId = "tut-33333333333333333333333333333333";
        h.api.appendTitleEvent({ operationId: "tutorial-create-33333333333333333333333333333333",
            tutorialId, action: "CLAIM", titleKey: "tema anterior", previousTitleKey: "", payloadHash: "c".repeat(64) });
        h.api.appendTitleEvent({ operationId: "tutorial-rename-" + "d".repeat(64),
            tutorialId, action: "RENAME", titleKey: "tema nuevo", previousTitleKey: "tema anterior",
            payloadHash: "e".repeat(64) });
        assert.equal(h.api.titleOwner("tema anterior"), "");
        assert.equal(h.api.titleOwner("tema nuevo"), tutorialId);
    });

    test("la edición D:F de un tutorial histórico sin ID usa journal append-only sin lock ni ID inventado", () => {
        const row = ["", "Tema histórico", "imagen", "Cómo original", "Dónde original", "Detalle original", "video", "Autora"];
        const h = buildHarness_(feedback, { rows: [headers, row] });
        const result = h.api.update({ tutorialId: "Tema histórico", comoIdentificarlo: "Cómo actualizado",
            dondeEncontrarlo: "Dónde actualizado", detalles: "Detalle actualizado" });
        assert.equal(result.status, "success");
        assert.equal(result.updated.tutorialId, "");
        assert.equal(h.state.lockWaits, 0);
        assert.equal(h.sheet.data[1][0], "");
        assert.equal(h.sheet.data[1][3], "Cómo original");
        const identity = "legacy-" + crypto.createHash("sha256").update("tema historico").digest("hex");
        const projected = h.api.projectEdit(identity, h.sheet.data[1]);
        assert.deepEqual(projected.row.slice(3, 6), ["Cómo actualizado", "Dónde actualizado", "Detalle actualizado"]);
    });

    test("una edición combinada de título y campos D:F legacy se proyecta sin modificar la fila", () => {
        const row = ["", "Tema histórico", "imagen", "Cómo original", "Dónde original", "Detalle original", "video", "Autora"];
        const h = buildHarness_(feedback, { rows: [headers, row] });
        const result = h.api.update({ tutorialId: "Tema histórico", tema: "Tema renombrado",
            comoIdentificarlo: "Cómo nuevo", dondeEncontrarlo: "Dónde nuevo", detalles: "Detalle nuevo" });
        assert.equal(result.status, "success");
        assert.equal(result.updated.tema, "Tema renombrado");
        assert.equal(h.state.lockWaits, 0);
        assert.equal(h.sheet.data[1][0], "");
        assert.equal(h.sheet.data[1][1], "Tema histórico");
        const identity = "legacy-" + crypto.createHash("sha256").update("tema historico").digest("hex");
        assert.equal(h.api.projectTitle(identity, "Tema histórico"), "Tema renombrado");
        assert.deepEqual(h.api.projectEdit(identity, h.sheet.data[1]).row.slice(3, 6), ["Cómo nuevo", "Dónde nuevo", "Detalle nuevo"]);
    });

    test("el renombrado de tutorial con ID estable usa journals append-only sin ScriptLock", () => {
        const id = "tut-77777777777777777777777777777777";
        const row = [id, "Tema anterior", "imagen", "Cómo", "Dónde", "Detalle", "video", "Autora"];
        const h = buildHarness_(feedback, { rows: [headers, row] });
        const result = h.api.update({ tutorialId: id, tema: "Tema nuevo" });
        assert.equal(result.status, "success");
        assert.equal(result.updated.tema, "Tema nuevo");
        assert.equal(h.state.lockWaits, 0);
        assert.equal(h.sheet.data[1][1], "Tema anterior");
        assert.equal(h.api.projectTitle(id, "Tema anterior"), "Tema nuevo");
        assert.equal(h.api.titleOwner("tema anterior"), "");
        assert.equal(h.api.titleOwner("tema nuevo"), id);
        assert.equal(h.state.renameEventsSheet.data.length, 2);
    });

    test("un tutorial histórico sin ID puede renombrarse append-only sin crear un ID físico ni usar ScriptLock", () => {
        const row = ["", "Tema histórico", "imagen", "Cómo", "Dónde", "Detalle", "video", "Autora"];
        const h = buildHarness_(feedback, { rows: [headers, row] });
        const result = h.api.update({ tutorialId: "Tema histórico", tema: "Tema histórico actualizado" });
        assert.equal(result.status, "success");
        assert.equal(result.updated.tema, "Tema histórico actualizado");
        assert.equal(result.updated.tutorialId, "");
        assert.equal(h.state.lockWaits, 0);
        assert.equal(h.sheet.data[1][0], "");
        assert.equal(h.sheet.data[1][1], "Tema histórico");
        const legacyId = "legacy-" + crypto.createHash("sha256").update("tema historico").digest("hex");
        assert.equal(h.api.projectTitle(legacyId, "Tema histórico"), "Tema histórico actualizado");
    });

    test("el ledger impide dos renombrados desde el mismo título anterior", () => {
        const h = buildHarness_(feedback, { missingSheet: true });
        const id = "tut-88888888888888888888888888888888";
        h.api.appendTitleEvent({ operationId: "tutorial-title-claim-" + "a".repeat(64),
            tutorialId: id, action: "CLAIM", titleKey: "tema base", previousTitleKey: "", payloadHash: "b".repeat(64) });
        h.api.appendTitleEvent({ operationId: "tutorial-title-rename-" + "c".repeat(64),
            tutorialId: id, action: "RENAME", titleKey: "tema uno", previousTitleKey: "tema base", payloadHash: "d".repeat(64) });
        assert.throws(() => h.api.appendTitleEvent({ operationId: "tutorial-title-rename-" + "e".repeat(64),
            tutorialId: id, action: "RENAME", titleKey: "tema dos", previousTitleKey: "tema base", payloadHash: "f".repeat(64) }),
            /tema del tutorial ya está reservado|Ya existe un tutorial/);
        assert.equal(h.api.titleOwner("tema uno"), id);
        assert.equal(h.api.titleOwner("tema dos"), "");
    });

    test("CATALOG proyecta el título renombrado y conserva imagen, vídeo y colaborador", () => {
        const id = "tut-99999999999999999999999999999999";
        const row = [id, "Tema anterior", "imagen", "Cómo", "Dónde", "Detalle", "video", "Autora"];
        const expectedTitleKey = "tema anterior", title = "Tema nuevo";
        const payloadHash = crypto.createHash("sha256").update(JSON.stringify([id, expectedTitleKey, title])).digest("hex");
        const event = ["tutorial-rename-" + payloadHash, payloadHash, id, expectedTitleKey, title, "now"];
        const result = readCatalogTutorials_(catalog, [headers, row], [], [event]);
        assert.equal(result.data.tutoriales[0].Tema, "Tema nuevo");
        assert.equal(result.data.tutoriales[0].Imagen, "imagen");
        assert.equal(result.data.tutoriales[0].Video, "video");
        assert.equal(result.data.tutoriales[0].Colaborador, "Autora");
        assert.equal(row[1], "Tema anterior");
    });


    test("CATALOG proyecta eventos append-only D:F sin revertir título, imagen, vídeo o autor", () => {
        const id = "tut-0123456789abcdef0123456789abcdef";
        const row = [id, "Tema", "imagen", "Cómo viejo", "Dónde viejo", "Detalle viejo", "video", "Autora"];
        const expectedHash = crypto.createHash("sha256").update(JSON.stringify(["Cómo viejo", "Dónde viejo", "Detalle viejo"])).digest("hex");
        const snapshot = ["Cómo nuevo", "Dónde nuevo", "Detalle nuevo"];
        const payloadHash = crypto.createHash("sha256").update(JSON.stringify([id, expectedHash, snapshot])).digest("hex");
        const event = ["tutorial-edit-" + payloadHash, payloadHash, id, expectedHash, JSON.stringify(snapshot), "now"];
        const result = readCatalogTutorials_(catalog, [headers, row], [event]);
        const projected = result.data.tutoriales[0];
        assert.equal(projected.comoIdentificarlo, snapshot[0]);
        assert.equal(projected.dondeEncontrarlo, snapshot[1]);
        assert.equal(projected.Detalles, snapshot[2]);
        assert.equal(projected.Tema, row[1]);
        assert.equal(projected.Imagen, row[2]);
        assert.equal(projected.Video, row[6]);
        assert.equal(projected.Colaborador, row[7]);
    });

    test("CATALOG ignora eventos con expectedHash obsoleto", () => {
        const id = "tut-0123456789abcdef0123456789abcdef";
        const row = [id, "Tema", "", "Cómo vigente", "Dónde vigente", "Detalle vigente", "", "Autora"];
        const stale = ["Cómo obsoleto", "Dónde obsoleto", "Detalle obsoleto"];
        const eventHash = crypto.createHash("sha256").update(JSON.stringify(["versión anterior"])).digest("hex");
        const payloadHash = crypto.createHash("sha256").update(JSON.stringify([id, eventHash, stale])).digest("hex");
        const event = ["tutorial-edit-" + payloadHash, payloadHash, id, eventHash, JSON.stringify(stale), "now"];
        const result = readCatalogTutorials_(catalog, [headers, row], [event]);
        assert.equal(result.data.tutoriales[0].comoIdentificarlo, row[3]);
        assert.equal(result.data.tutoriales[0].Detalles, row[5]);
    });

    test("catálogo conserva las siete columnas históricas y expone Colaborador en H", () => {
        assert.match(catalog, /ID:\s*1,[\s\S]*?Tema:\s*2,[\s\S]*?Imagen:\s*3,[\s\S]*?comoIdentificarlo:\s*4,[\s\S]*?dondeEncontrarlo:\s*5,[\s\S]*?Detalles:\s*6,[\s\S]*?Video:\s*7,[\s\S]*?Colaborador:\s*8/);
    });

    test("alta sobre esquema vigente A:H conserva encabezados y registros existentes", () => {
        const existing = ["tut-anterior", "Anterior", "imagen", "Cómo", "Dónde", "Detalle", "video", "Autor"];
        const h = buildHarness_(feedback, { rows: [headers, existing] });
        const result = h.api.add({ ...base, operationId: "66666666666666666666666666666666", tema: "Tutorial nuevo" });
        assert.equal(result.status, "success");
        assert.deepEqual(h.sheet.data[0], headers);
        assert.deepEqual(h.sheet.data[1], existing);
        assert.equal(h.sheet.data[2][0], "tut-66666666666666666666666666666666");
    });

    test("CATALOG lee Tutorial por el mismo contrato de ocho columnas e identidad estable", () => {
        const row = ["tut-0123456789abcdef0123456789abcdef", "Tema", "drive-image", "Cómo", "Dónde", "Detalle", "https://youtube.com/watch?v=abcdefghijk", "Autora"];
        const result = readCatalogTutorials_(catalog, [headers, row]);
        assert.equal(result.status, "success");
        assert.equal(result.data.tutoriales.length, 1);
        assert.equal(JSON.stringify(result.data.tutoriales[0]), JSON.stringify({
            ID: row[0], Tema: row[1], Imagen: row[2], comoIdentificarlo: row[3],
            dondeEncontrarlo: row[4], Detalles: row[5], Video: row[6], Colaborador: row[7]
        }));
    });

    test("CATALOG deduplica reintentos físicos idénticos por ID y rechaza copias contradictorias", () => {
        const row = ["tut-0123456789abcdef0123456789abcdef", "Tema", "", "Cómo", "Dónde", "Detalle", "", "Autora"];
        const result = readCatalogTutorials_(catalog, [headers, row, row.slice()]);
        assert.equal(result.data.tutoriales.length, 1);
        const conflict = row.slice(); conflict[1] = "Otro tema";
        const projected = readCatalogTutorials_(catalog, [headers, row, conflict]);
        assert.equal(projected.data.tutoriales.length, 1);
        assert.equal(projected.data.tutoriales[0].Tema, "Tema");
    });

    test("CATALOG conserva lectura de registros históricos A:G sin inventar Colaborador", () => {
        const legacyRow = ["", "Tutorial histórico", "imagen-propia", "Cómo", "Dónde", "Detalle", "video"];
        const result = readCatalogTutorials_(catalog, [headers.slice(0, 7), legacyRow]);
        assert.equal(result.data.tutoriales.length, 1);
        assert.equal(result.data.tutoriales[0].ID, null);
        assert.equal(result.data.tutoriales[0].Tema, legacyRow[1]);
        assert.equal(result.data.tutoriales[0].Imagen, legacyRow[2]);
        assert.equal(result.data.tutoriales[0].Video, legacyRow[6]);
        assert.equal(result.data.tutoriales[0].Colaborador, null);
    });

    test("FEEDBACK y CATALOG declaran Tutorial como única hoja canónica", () => {
        assert.match(catalog, /TUTORIALES:\s*"Tutorial"/);
        assert.match(feedback, /getSheetByName\("Tutorial"\)/);
        assert.doesNotMatch(feedback, /(?:getSheetByName|insertSheet)\("Tutoriales"\)/);
    });

    test("Tutoriales y aprobaciones de vídeo no declaran leases Coordinator", () => {
        for (const action of ["addTutorial", "updateTutorialItem", "submitVideoForApproval", "approveVideo", "rejectVideo"]) {
            assert.doesNotMatch(coordinator, new RegExp(action + ":\\s*\\{"));
        }
        assert.match(feedback, /appendTutorialTitleEvent_\(/);
        assert.match(feedback, /appendVideoApprovalEvent_\(/);
    });

    return { status: failed ? "FAIL" : "PASS", passed, failed, results };
}

if (process.argv[1] && process.argv[1].endsWith("TutorialIntegrity.js")) {
    const result = runTutorialIntegrityTests({
        feedback: fs.readFileSync("JS/Services/feedback.js", "utf8"),
        ui: fs.readFileSync("JS/Frontend/ui.js", "utf8"),
        coordinator: fs.readFileSync("JS/Services/Coordinator.js", "utf8"),
        catalog: fs.readFileSync("JS/Services/catalog.js", "utf8")
    });
    console.log("TutorialIntegrity: " + result.passed + "/" + (result.passed + result.failed) + " PASS");
    if (result.failed) console.error(JSON.stringify(result.results.filter(item => item.status === "FAIL")));
    if (result.status !== "PASS") process.exitCode = 1;
}
