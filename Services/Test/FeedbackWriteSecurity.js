// Pruebas aisladas de autorización y escrituras FEEDBACK — AUG-040.
// No utiliza deployments, Spreadsheet ni Drive reales.

function runFeedbackWriteSecurityTests() {
    const results = [];
    let passed = 0;
    let failed = 0;
    function assert_(condition, message) {
        if (!condition) throw new Error(message || "Aserción fallida.");
    }
    function expectThrow_(callback, expected) {
        let thrown = null;
        try { callback(); } catch (error) { thrown = error; }
        assert_(!!thrown, "Se esperaba que la operación fuera rechazada.");
        if (expected) assert_(String(thrown.message || thrown).includes(expected), "Error inesperado: " + String(thrown.message || thrown));
    }
    function test_(name, callback) {
        try { callback(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    }

    const oldAssert = assertFeedbackSession;
    const oldGetSpreadsheet = getSpreadsheet;
    const oldGetSafeSheet = getSafeSheet;
    const oldEnsureReportMetadataColumn = ensureReportMetadataColumn;
    const oldLog = logUserActivity;
    const oldCache = typeof CacheService === "undefined" ? null : CacheService;
    const oldLock = typeof LockService === "undefined" ? null : LockService;
    const oldSpreadsheetApp = typeof SpreadsheetApp === "undefined" ? null : SpreadsheetApp;
    const oldDriveApp = typeof DriveApp === "undefined" ? null : DriveApp;
    const oldUtilities = typeof Utilities === "undefined" ? null : Utilities;

    try {
        assertFeedbackSession = function(payload, allowedRoles) {
            if (!payload || payload.sessionToken !== "TEST_SESSION") throw new Error("Sesión inválida.");
            const actor = { userId: "USR-TEST-01", userName: "Usuario verificado", role: "Tecnico" };
            if (Array.isArray(allowedRoles) && !allowedRoles.includes(actor.role)) throw new Error("Rol no autorizado.");
            return actor;
        };

        test_("Solo getPysData y sendContactForm quedan públicos", function() {
            assert_(FEEDBACK_PUBLIC_ACTIONS.has("getPysData") && FEEDBACK_PUBLIC_ACTIONS.has("sendContactForm"));
            assert_(!FEEDBACK_PUBLIC_ACTIONS.has("recordLike") && !FEEDBACK_PUBLIC_ACTIONS.has("addProblem"));
        });
        test_("El contacto público descarta userId enviado por el cliente", function() {
            assert_(authorizeFeedbackAction_("sendContactForm", { userId: "ADMIN-FALSO" }).userId === "N/A");
        });
        test_("getPysData conserva acceso público de solo lectura", function() {
            const payload = { value: "test" };
            assert_(authorizeFeedbackAction_("getPysData", payload) === payload);
        });
        test_("Acciones no declaradas y assignCollaborator se rechazan", function() {
            expectThrow_(() => authorizeFeedbackAction_("unknownAction", {}), "no declarada");
            expectThrow_(() => authorizeFeedbackAction_("assignCollaborator", { sessionToken: "TEST_SESSION" }), "no declarada");
        });
        test_("recordLike exige sesión y sustituye identidad falsificada", function() {
            expectThrow_(() => authorizeFeedbackAction_("recordLike", { userId: "ADMIN-FALSO" }), "Sesión inválida");
            const actor = authorizeFeedbackAction_("recordLike", { sessionToken: "TEST_SESSION", userId: "ADMIN-FALSO", userName: "Falso" });
            assert_(actor.userId === "USR-TEST-01" && actor.userName === "Usuario verificado");
        });
        test_("Las escrituras PyS exigen sesión y sustituyen identidad", function() {
            ["reportProblem", "addProblem", "addSolution", "addPrevention", "suggestCutChange"].forEach(action => {
                expectThrow_(() => authorizeFeedbackAction_(action, {}), "Sesión inválida");
                const actor = authorizeFeedbackAction_(action, { sessionToken: "TEST_SESSION", userId: "FALSO", userName: "Falso" });
                assert_(actor.userId === "USR-TEST-01" && actor.userName === "Usuario verificado", action);
            });
        });
        test_("Aprobación mantiene la restricción de rol", function() {
            expectThrow_(() => authorizeFeedbackAction_("approveVideo", { sessionToken: "TEST_SESSION" }), "Rol no autorizado");
        });

        test_("El alta de tutorial usa el colaborador derivado de la sesión", function() {
            const originalAssert = assertFeedbackSession;
            const originalGetSafeSheet = getSafeSheet;
            const rows = [["Tema", "Imagen", "Video", "Descripción", "Colaborador"]];
            const sheet = {
                getLastRow: () => rows.length,
                getLastColumn: () => 5,
                getRange: (row, column, rowCount, columnCount) => ({
                    getDisplayValues: () => Array.from({ length: rowCount }, (_, r) =>
                        Array.from({ length: columnCount }, (_, c) => String((rows[row - 1 + r] || [])[column - 1 + c] || ""))),
                    getValues: () => Array.from({ length: rowCount }, (_, r) =>
                        Array.from({ length: columnCount }, (_, c) => (rows[row - 1 + r] || [])[column - 1 + c] || ""))
                }),
                appendRow: row => rows.push(row.slice())
            };
            try {
                assertFeedbackSession = function(payload, allowedRoles) {
                    if (!allowedRoles || !allowedRoles.includes("Desarrollador")) throw new Error("Rol no autorizado.");
                    return { userId: "USR-DEV", userName: "Desarrollador verificado", role: "Desarrollador" };
                };
                getSafeSheet = () => sheet;
                SpreadsheetApp = { flush: function() {} };
                const authorized = authorizeFeedbackAction_("addTutorial", {
                    sessionToken: "TEST_SESSION", userId: "ADMIN-FALSO",
                    userName: "Nombre falso", colaborador: "Colaborador falso"
                });
                handleAddTutorial({
                    ...authorized, tema: "Tutorial de prueba", descripcion: "Descripción",
                    colaborador: "Colaborador falsificado"
                });
                assert_(rows[1][4] === "Desarrollador verificado",
                    "El colaborador guardado debe proceder de la sesión, no del navegador.");
            } finally {
                assertFeedbackSession = originalAssert;
                getSafeSheet = originalGetSafeSheet;
            }
        });
        test_("El actor anónimo ignora el identificador fabricable del navegador", function() {
            const actor = resolveSuggestionYearActor({ userId: "0", anonymousReporterId: "fabricado" });
            assert_(actor.suggestionActorKey === "anon:unverified");
            assert_(!isVerifiedSuggestionActorKey_(actor.suggestionActorKey));
        });
        test_("El actor autenticado se deriva de la sesión validada", function() {
            const actor = resolveSuggestionYearActor({ userId: "FALSO", sessionToken: "TEST_SESSION" });
            assert_(actor.userId === "USR-TEST-01" && actor.suggestionActorKey === "user:USR-TEST-01");
            assert_(isVerifiedSuggestionActorKey_(actor.suggestionActorKey));
        });
        test_("addProblem rechaza una imagen ausente", function() {
            expectThrow_(() => handleAddProblem({
                titulo: "Falla", descripcion: "Detalle", sinSolucion: true,
                userId: "USR-1", userName: "Usuario"
            }), "imagen del problema es obligatoria");
        });
        test_("Si falla la escritura PyS, el archivo creado se compensa", function() {
            let trashed = false;
            const sheet = {
                getLastRow: () => 1,
                getDataRange: () => ({ getValues: () => [["header"]] }),
                appendRow: () => { throw new Error("fallo controlado de appendRow"); }
            };
            getSafeSheet = () => sheet;
            LockService = { getScriptLock: () => ({ waitLock: function() {}, releaseLock: function() {} }) };
            SpreadsheetApp = { flush: function() {} };
            const file = {
                setSharing: function() {},
                getUrl: () => "https://drive.google.test/file/dummy",
                setTrashed: function(value) { trashed = value; }
            };
            const folder = { createFile: () => file };
            DriveApp = {
                getFoldersByName: () => ({ hasNext: () => true, next: () => folder }),
                Access: { ANYONE_WITH_LINK: "anyone" },
                Permission: { VIEW: "view" }
            };
            Utilities = { base64Decode: () => [1], newBlob: () => ({}) };
            expectThrow_(() => handleAddProblem({
                titulo: "Falla", descripcion: "Detalle", sinSolucion: true,
                imgBase64: "data:image/jpeg;base64,AA==", userId: "USR-1", userName: "Usuario"
            }), "fallo controlado");
            assert_(trashed === true, "El archivo no vinculado debe enviarse a papelera.");
        });
        test_("reportProblem devuelve el mismo resultado ante un reintento idéntico", function() {
            const reportId = "REP-1731260000000-abc123";
            const metadata = { reportId, userId: "USR-TEST-01", vehicleId: "VEH-1", corteIndex: 2, activaTestigoMotor: true };
            const row = ["REP-ROW-1", "Usuario verificado", "VEH-1", "Falla intermitente", "", "", "", "", "", JSON.stringify(metadata)];
            const sheet = makeSheet([Array(10).fill("header"), row]);
            const originalEnsure = ensureReportMetadataColumn;
            const originalLog = logUserActivity;
            let logCalls = 0;
            try {
                getSafeSheet = () => sheet;
                ensureReportMetadataColumn = () => 10;
                LockService = { getScriptLock: () => ({ waitLock: function() {}, releaseLock: function() {} }) };
                SpreadsheetApp = { flush: function() {} };
                logUserActivity = () => { logCalls++; };
                const result = handleReportProblem({
                    vehicleId: "VEH-1", problemText: "Falla intermitente",
                    userId: "USR-TEST-01", userName: "Usuario verificado",
                    reportId, corteIndex: 2, activaTestigoMotor: true
                });
                assert_(result.status === "success" && result.alreadyReported === true && result.reportId === reportId);
                assert_(sheet.rows.length === 2, "El reintento no debe crear una segunda fila.");
                assert_(logCalls === 0, "El reintento no debe duplicar el registro de actividad.");
            } finally {
                ensureReportMetadataColumn = originalEnsure;
                logUserActivity = originalLog;
            }
        });
        test_("reportProblem rechaza reutilizar un reportId con datos distintos", function() {
            const reportId = "REP-1731260000001-def456";
            const metadata = { reportId, userId: "USR-TEST-01", vehicleId: "VEH-1", corteIndex: 2, activaTestigoMotor: true };
            const row = ["REP-ROW-2", "Usuario verificado", "VEH-1", "Falla original", "", "", "", "", "", JSON.stringify(metadata)];
            const sheet = makeSheet([Array(10).fill("header"), row]);
            const originalEnsure = ensureReportMetadataColumn;
            try {
                getSafeSheet = () => sheet;
                ensureReportMetadataColumn = () => 10;
                LockService = { getScriptLock: () => ({ waitLock: function() {}, releaseLock: function() {} }) };
                expectThrow_(() => handleReportProblem({
                    vehicleId: "VEH-1", problemText: "Texto modificado",
                    userId: "USR-TEST-01", userName: "Usuario verificado",
                    reportId, corteIndex: 2, activaTestigoMotor: true
                }), "ya pertenece a un reporte distinto");
                assert_(sheet.rows.length === 2, "El conflicto no debe crear otra fila.");
            } finally {
                ensureReportMetadataColumn = originalEnsure;
            }
        });
        test_("reportProblem bloquea reportId duplicados preexistentes", function() {
            const reportId = "REP-1731260000002-ghi789";
            const metadata = { reportId, userId: "USR-TEST-01", vehicleId: "VEH-1", corteIndex: 2, activaTestigoMotor: true };
            const row = ["REP-ROW-3", "Usuario verificado", "VEH-1", "Falla original", "", "", "", "", "", JSON.stringify(metadata)];
            const sheet = makeSheet([Array(10).fill("header"), row.slice(), row.slice()]);
            const originalEnsure = ensureReportMetadataColumn;
            try {
                getSafeSheet = () => sheet;
                ensureReportMetadataColumn = () => 10;
                LockService = { getScriptLock: () => ({ waitLock: function() {}, releaseLock: function() {} }) };
                expectThrow_(() => handleReportProblem({
                    vehicleId: "VEH-1", problemText: "Falla original",
                    userId: "USR-TEST-01", userName: "Usuario verificado",
                    reportId, corteIndex: 2, activaTestigoMotor: true
                }), "aparece duplicado");
                assert_(sheet.rows.length === 3, "El estado duplicado debe permanecer intacto para revisión.");
            } finally {
                ensureReportMetadataColumn = originalEnsure;
            }
        });

        test_("El límite de frecuencia público se aplica en el servidor", function() {
            const store = {};
            CacheService = { getScriptCache: () => ({
                get: key => store[key] || null,
                put: (key, value) => { store[key] = String(value); }
            }) };
            enforceFeedbackRateLimit_("test_scope", 1, 3600);
            expectThrow_(() => enforceFeedbackRateLimit_("test_scope", 1, 3600), "límite temporal");
        });

        function makeSheet(rows) {
            return {
                rows: rows,
                getLastRow: function() { return this.rows.length; },
                getLastColumn: function() { return this.rows.reduce((max, row) => Math.max(max, row.length), 0); },
                getDataRange: function() {
                    const self = this;
                    return { getValues: function() { return self.rows.map(row => row.slice()); } };
                },
                getRange: function(row, column, numRows, numColumns) {
                    const self = this;
                    const rowCount = numRows === undefined ? 1 : numRows;
                    const columnCount = numColumns === undefined ? 1 : numColumns;
                    return {
                        getValue: function() { return self.rows[row - 1] ? self.rows[row - 1][column - 1] : undefined; },
                        setValue: function(value) {
                            while (self.rows.length < row) self.rows.push([]);
                            while (self.rows[row - 1].length < column) self.rows[row - 1].push("");
                            self.rows[row - 1][column - 1] = value;
                        },
                        getValues: function() {
                            return Array.from({ length: rowCount }, (_, r) =>
                                Array.from({ length: columnCount }, (_, c) =>
                                    self.rows[row - 1 + r] ? self.rows[row - 1 + r][column - 1 + c] : undefined
                                )
                            );
                        },
                        setValues: function(values) {
                            values.forEach((line, r) => line.forEach((value, c) => {
                                while (self.rows.length < row + r) self.rows.push([]);
                                while (self.rows[row - 1 + r].length < column + c) self.rows[row - 1 + r].push("");
                                self.rows[row - 1 + r][column - 1 + c] = value;
                            }));
                        }
                    };
                },
                appendRow: function(row) { this.rows.push(row.slice()); }
            };
        }

        function createLikeRuntime_(vehicleId, duplicateVehicle) {
            const maxColumn = Math.max(COLS_CORTES.id, COLS_CORTES.tipoCorte1, COLS_CORTES.utilCorte1);
            const header = Array(maxColumn).fill("");
            const vehicle = Array(maxColumn).fill("");
            vehicle[COLS_CORTES.id - 1] = vehicleId;
            vehicle[COLS_CORTES.tipoCorte1 - 1] = "Relay";
            vehicle[COLS_CORTES.utilCorte1 - 1] = 0;
            const rows = duplicateVehicle ? [header, vehicle, vehicle.slice()] : [header, vehicle];
            const cuts = makeSheet(rows);
            const sheets = {};
            const spreadsheet = {
                getSheetByName: name => sheets[name] || null,
                insertSheet: name => (sheets[name] = makeSheet([]))
            };
            getSpreadsheet = () => spreadsheet;
            getSafeSheet = () => cuts;
            LockService = { getScriptLock: () => ({ waitLock: function() {}, releaseLock: function() {} }) };
            SpreadsheetApp = { flush: function() {} };
            logUserActivity = function() {};
            return { cuts, sheets };
        }

        test_("Los likes son idempotentes por actor, vehículo y corte", function() {
            const runtime = createLikeRuntime_("VEH-1", false);
            const first = handleRecordLike({ vehicleId: "VEH-1", corteIndex: 1, userId: "USR-1", userName: "Uno" });
            assert_(first.status === "success" && runtime.cuts.rows[1][COLS_CORTES.utilCorte1 - 1] === 1);
            const duplicate = handleRecordLike({ vehicleId: "VEH-1", corteIndex: 1, userId: "USR-1", userName: "Uno" });
            assert_(duplicate.alreadyLiked && runtime.cuts.rows[1][COLS_CORTES.utilCorte1 - 1] === 1);
            handleRecordLike({ vehicleId: "VEH-1", corteIndex: 1, userId: "USR-2", userName: "Dos" });
            assert_(runtime.cuts.rows[1][COLS_CORTES.utilCorte1 - 1] === 2);
            assert_(runtime.sheets.FeedbackLikes.rows[1][5] === "completed" && runtime.sheets.FeedbackLikes.rows[2][5] === "completed");
        });
        test_("El like recupera un incremento pendiente sin duplicarlo", function() {
            const runtime = createLikeRuntime_("VEH-2", false);
            runtime.cuts.rows[1][COLS_CORTES.utilCorte1 - 1] = 0;
            const ledger = makeSheet([
                ["actorKey", "vehicleId", "corteIndex", "previousCount", "targetCount", "status", "createdAt"],
                ["user:USR-1", "VEH-2", 1, 0, 1, "pending", "2026-11-10T00:00:00.000Z"]
            ]);
            runtime.sheets.FeedbackLikes = ledger;
            const result = handleRecordLike({ vehicleId: "VEH-2", corteIndex: 1, userId: "USR-1", userName: "Uno" });
            assert_(result.recovered && runtime.cuts.rows[1][COLS_CORTES.utilCorte1 - 1] === 1);
            assert_(ledger.rows[1][5] === "completed");
        });
        test_("Un contador inválido bloquea el like sin sobrescribirlo", function() {
            const runtime = createLikeRuntime_("VEH-3", false);
            runtime.cuts.rows[1][COLS_CORTES.utilCorte1 - 1] = "dato-inválido";
            expectThrow_(() => handleRecordLike({ vehicleId: "VEH-3", corteIndex: 1, userId: "USR-1", userName: "Uno" }), "contador de likes");
            assert_(runtime.cuts.rows[1][COLS_CORTES.utilCorte1 - 1] === "dato-inválido", "El contador inválido no debe sobrescribirse.");
        });
        test_("Un ID de vehículo duplicado bloquea el like", function() {
            const runtime = createLikeRuntime_("DUP", true);
            expectThrow_(() => handleRecordLike({ vehicleId: "DUP", corteIndex: 1, userId: "USR-1", userName: "Uno" }), "ID duplicado");
            assert_(runtime.cuts.rows[1][COLS_CORTES.utilCorte1 - 1] === 0);
        });
    } finally {
        assertFeedbackSession = oldAssert;
        getSpreadsheet = oldGetSpreadsheet;
        getSafeSheet = oldGetSafeSheet;
        ensureReportMetadataColumn = oldEnsureReportMetadataColumn;
        logUserActivity = oldLog;
        if (oldCache) CacheService = oldCache;
        if (oldLock) LockService = oldLock;
        if (oldSpreadsheetApp) SpreadsheetApp = oldSpreadsheetApp;
        if (oldDriveApp) DriveApp = oldDriveApp;
        if (oldUtilities) Utilities = oldUtilities;
    }

    return { status: failed === 0 ? "PASS" : "FAIL", passed, failed, results };
}
