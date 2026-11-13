
// Pruebas aisladas de tipo, unicidad e inmutabilidad de estado de solicitudes de vídeo.
// Requiere cargar Services/feedback.js.
function runVideoApprovalStateTests() {
    const results = []; let passed = 0, failed = 0;
    function assert_(value, message) { if (!value) throw new Error(message || "Aserción fallida."); }
    function expectThrow_(callback, expected) {
        let error = null; try { callback(); } catch (caught) { error = caught; }
        assert_(!!error, "Se esperaba rechazo.");
        if (expected) assert_(String(error.message || error).includes(expected), "Error inesperado: " + String(error.message || error));
    }
    function run_(name, callback) {
        try { callback(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    }
    function row_(id, data) {
        const row = [];
        row[COLS_FEEDBACKS.ID - 1] = id;
        row[COLS_FEEDBACKS.Problema - 1] = data;
        let parsed = data;
        if (typeof data === "string") { try { parsed = JSON.parse(data); } catch (error) {} }
        row[COLS_FEEDBACKS.ID_vehiculo - 1] = parsed && parsed.referenceId || "";
        return row;
    }
    function sheet_(rows) { return { getDataRange: () => ({ getValues: () => rows }) }; }
    const base = {
        subType: "video_approval", status: "pending", contentType: "corte",
        videoId: "abcdefghijk", videoUrl: "https://www.youtube.com/watch?v=abcdefghijk",
        referenceId: "destination-1", opVideoId: "a".repeat(32),
        title: "Manual técnico", createdByUserId: "user-1"
    };
    run_("acepta una solicitud Corte pendiente válida", () => {
        const result = findPendingVideoApproval_(sheet_([[], row_("vid-1", JSON.stringify(base))]), "vid-1");
        assert_(result.rowIndex === 2 && result.videoData.subType === "video_approval");
    });
    run_("acepta una solicitud PyS pendiente válida", () => {
        const result = findPendingVideoApproval_(sheet_([[], row_("vid-2", JSON.stringify({ ...base, contentType: "pys" }))]), "vid-2");
        assert_(result.videoData.contentType === "pys");
    });
    run_("acepta una solicitud Tutorial pendiente válida", () => {
        const result = findPendingVideoApproval_(sheet_([[], row_("vid-3", JSON.stringify({ ...base, contentType: "tutorial" }))]), "vid-3");
        assert_(result.videoData.contentType === "tutorial");
    });
    run_("rechaza ID inexistente", () => expectThrow_(() => findPendingVideoApproval_(sheet_([[]]), "vid-x"), "no encontrada"));
    run_("rechaza ID duplicado aunque ambas filas coincidan", () => {
        const encoded = JSON.stringify(base);
        expectThrow_(() => findPendingVideoApproval_(sheet_([[], row_("vid-4", encoded), row_("vid-4", encoded)]), "vid-4"), "más de una vez");
    });
    run_("rechaza JSON inválido", () => expectThrow_(() => findPendingVideoApproval_(sheet_([[], row_("vid-5", "{")]), "vid-5"), "JSON"));
    run_("rechaza reporte que no es aprobación de vídeo", () => expectThrow_(() => findPendingVideoApproval_(sheet_([[], row_("vid-6", JSON.stringify({ ...base, subType: "problem_report" }))]), "vid-6"), "no corresponde"));
    run_("rechaza estado approved", () => expectThrow_(() => findPendingVideoApproval_(sheet_([[], row_("vid-7", JSON.stringify({ ...base, status: "approved" }))]), "vid-7"), "ya no está pendiente"));
    run_("rechaza estado rejected", () => expectThrow_(() => findPendingVideoApproval_(sheet_([[], row_("vid-8", JSON.stringify({ ...base, status: "rejected" }))]), "vid-8"), "ya no está pendiente"));
    run_("rechaza enlace que no coincide con el ID", () => expectThrow_(() => findPendingVideoApproval_(sheet_([[], row_("vid-9", JSON.stringify({ ...base, videoUrl: "https://youtu.be/abcdefghijk" }))]), "vid-9"), "inconsistente"));
    run_("rechaza tipo de contenido desconocido", () => expectThrow_(() => findPendingVideoApproval_(sheet_([[], row_("vid-10", JSON.stringify({ ...base, contentType: "relay" }))]), "vid-10"), "tipo de contenido"));
    run_("rechaza opVideoId mal formado", () => expectThrow_(() => findPendingVideoApproval_(sheet_([[], row_("vid-11", JSON.stringify({ ...base, opVideoId: "short" }))]), "vid-11"), "identificador de operación"));
    run_("rechaza ID de solicitud vacío", () => expectThrow_(() => findPendingVideoApproval_(sheet_([[]]), ""), "ID de la solicitud"));
    return { status: failed === 0 ? "PASS" : "FAIL", passed, failed, results };
}
