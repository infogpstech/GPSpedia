
// Pruebas aisladas del contrato e idempotencia de solicitudes de aprobación YouTube.
// Requiere cargar Services/feedback.js.
function runYouTubeApprovalTests() {
    const results = []; let passed = 0, failed = 0;
    const originalGetSafeSheet = getSafeSheet;
    const originalUuid = Utilities.getUuid;
    const originalFlush = SpreadsheetApp.flush;
    const originalTimezone = Session.getScriptTimeZone;
    function assert_(condition, message) { if (!condition) throw new Error(message || "Aserción fallida."); }
    function expectThrow_(callback, text) {
        let error = null; try { callback(); } catch (caught) { error = caught; }
        assert_(!!error, "Se esperaba que la operación fuera rechazada.");
        if (text) assert_(String(error.message || error).includes(text), "Error inesperado: " + String(error.message || error));
    }
    function makeSheet_() {
        const rows = [["ID", "Usuario", "ID_vehiculo", "Problema", "Respuesta", "Se resolvio", "Responde", "Reporte de util", "anoSugerido"]];
        return {
            rows,
            getLastRow: () => rows.length,
            getLastColumn: () => 9,
            getDataRange() { return { getValues: () => rows.map(row => row.slice()) }; },
            getRange(row, column, rowCount, columnCount) {
                return {
                    setValue(value) { while (rows.length < row) rows.push([]); rows[row - 1][column - 1] = value; },
                    setValues(values) {
                        values.forEach((line, r) => {
                            while (rows.length < row + r) rows.push([]);
                            line.forEach((value, c) => { rows[row - 1 + r][column - 1 + c] = value; });
                        });
                    },
                    getValues() {
                        return Array.from({ length: rowCount || 1 }, (_, r) =>
                            Array.from({ length: columnCount || 1 }, (_, c) => (rows[row - 1 + r] || [])[column - 1 + c] ?? ""));
                    }
                };
            }
        };
    }
    let sheet, cutSheet, uuidCounter = 0;
    const opVideoId = "a".repeat(32);
    const payload = {
        opVideoId, title: "Prueba de vídeo", description: "Descripción",
        contentType: "corte", referenceId: "17",
        videoId: "abcdefghijk", videoUrl: "https://www.youtube.com/watch?v=abcdefghijk",
        userId: "user-1", userName: "Técnico"
    };
    function reset_() {
        sheet = makeSheet_();
        const headers = new Array(45).fill("");
        headers[0] = "id"; headers[9] = "videoGuiaDesarmeUrl";
        const targetRow = new Array(45).fill("");
        targetRow[0] = "17";
        const targetRows = [headers, targetRow];
        cutSheet = {
            getLastRow: () => targetRows.length,
            getLastColumn: () => 45,
            getDataRange: () => ({ getValues: () => targetRows.map(row => row.slice()) }),
            getRange(row, column, rowCount, columnCount) {
                return {
                    getValue: () => (targetRows[row - 1] || [])[column - 1] || "",
                    getValues: () => Array.from({length:rowCount||1},(_,i)=>Array.from({length:columnCount||1},(_,j)=>(targetRows[row-1+i]||[])[column-1+j]||"")),
                    getDisplayValues: () => Array.from({length:rowCount||1},(_,i)=>Array.from({length:columnCount||1},(_,j)=>String((targetRows[row-1+i]||[])[column-1+j]||"")))
                };
            }
        };
        getSafeSheet = name => name === SHEET_NAMES.FEEDBACKS ? sheet : name === SHEET_NAMES.CORTES ? cutSheet : null;
        Utilities.getUuid = () => "uuid-test-" + (++uuidCounter);
        SpreadsheetApp.flush = () => {};
        Session.getScriptTimeZone = () => "GMT-6";
    }
    function run_(name, callback) {
        reset_();
        try { callback(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    }
    try {
        run_("crea solicitud con ID real y opVideoId", () => {
            const result = handleSubmitVideoForApproval(payload);
            const stored = JSON.parse(sheet.rows[1][COLS_FEEDBACKS.Problema - 1]);
            assert_(result.status === "success" && result.opVideoId === opVideoId);
            assert_(stored.videoId === "abcdefghijk" && stored.opVideoId === opVideoId && stored.createdByUserId === "user-1");
            assert_(stored.videoUrl === payload.videoUrl && stored.status === "pending");
        });
        run_("reintento idéntico devuelve la misma solicitud", () => {
            const first = handleSubmitVideoForApproval(payload);
            const second = handleSubmitVideoForApproval(payload);
            assert_(first.id === second.id && sheet.rows.length === 2);
        });
        run_("mismo opVideoId con otro vídeo se rechaza", () => {
            handleSubmitVideoForApproval(payload);
            expectThrow_(() => handleSubmitVideoForApproval({ ...payload, videoId: "lmnopqrstuv", videoUrl: "https://www.youtube.com/watch?v=lmnopqrstuv" }), "solicitud distinta");
            assert_(sheet.rows.length === 2);
        });
        run_("mismo opVideoId con otro usuario se rechaza", () => {
            handleSubmitVideoForApproval(payload);
            expectThrow_(() => handleSubmitVideoForApproval({ ...payload, userId: "user-2" }), "solicitud distinta");
            assert_(sheet.rows.length === 2);
        });
        run_("rechaza opVideoId inválido", () => expectThrow_(() => handleSubmitVideoForApproval({ ...payload, opVideoId: "short" }), "Identificador de operación"));
        run_("rechaza ID provisional o inválido de YouTube", () => expectThrow_(() => handleSubmitVideoForApproval({ ...payload, videoId: opVideoId, videoUrl: "https://www.youtube.com/watch?v=" + opVideoId }), "ID real"));
        run_("rechaza URL que no coincide con el ID real", () => expectThrow_(() => handleSubmitVideoForApproval({ ...payload, videoUrl: "https://youtu.be/zyxwvutsrqp" }), "URL no coincide"));
        run_("rechaza tipo de contenido desconocido", () => expectThrow_(() => handleSubmitVideoForApproval({ ...payload, contentType: "relay" }), "Tipo de contenido"));
        run_("rechaza operación sin identidad autenticada", () => expectThrow_(() => handleSubmitVideoForApproval({ ...payload, userId: "" }), "identidad válida"));
        run_("rechaza opVideoId duplicado en dos filas", () => {
            handleSubmitVideoForApproval(payload);
            sheet.rows.push(sheet.rows[1].slice());
            expectThrow_(() => handleSubmitVideoForApproval(payload), "ya está duplicado");
        });
        run_("recupera la solicitud existente por opVideoId y propietario", () => {
            handleSubmitVideoForApproval(payload);
            const before = JSON.stringify(sheet.rows);
            const result = handleGetVideoApprovalByOperation({ opVideoId, userId: "user-1" });
            assert_(result.found === true && result.approvalStatus === "pending" && result.videoUrl === payload.videoUrl);
            assert_(before === JSON.stringify(sheet.rows));
        });
        run_("no revela la solicitud a otro usuario", () => {
            handleSubmitVideoForApproval(payload);
            expectThrow_(() => handleGetVideoApprovalByOperation({ opVideoId, userId: "user-2" }), "no pertenece");
        });
        run_("devuelve no encontrado para una operación aún no registrada", () => {
            const result = handleGetVideoApprovalByOperation({ opVideoId: "b".repeat(32), userId: "user-1" });
            assert_(result.found === false);
        });
        run_("impide dos solicitudes pendientes para el mismo destino", () => {
            handleSubmitVideoForApproval(payload);
            expectThrow_(() => handleSubmitVideoForApproval({
                ...payload,
                opVideoId: "b".repeat(32),
                videoId: "lmnopqrstuv",
                videoUrl: "https://www.youtube.com/watch?v=lmnopqrstuv"
            }), "Ya existe una solicitud de vídeo pendiente");
            assert_(sheet.rows.length === 2);
        });
        run_("no crea solicitud si falta título", () => {
            expectThrow_(() => handleSubmitVideoForApproval({ ...payload, title: " " }), "título");
            assert_(sheet.rows.length === 1);
        });
    } finally {
        getSafeSheet = originalGetSafeSheet;
        Utilities.getUuid = originalUuid;
        SpreadsheetApp.flush = originalFlush;
        Session.getScriptTimeZone = originalTimezone;
    }
    return { status: failed === 0 ? "PASS" : "FAIL", passed, failed, results };
}
