// Contrato estático del flujo de vídeo de Cortes; recibe el contenido de add_cortes.html desde el runner local.
function runYouTubeAddCortesContractTests(htmlSource) {
    const source = String(htmlSource || "");
    const results = [];
    let passed = 0, failed = 0;
    function assert_(value, message) { if (!value) throw new Error(message || "Aserción fallida."); }
    function run_(name, callback) {
        try { callback(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    }
    run_("retira la entrada manual de enlaces", () => {
        assert_(!source.includes('id="videoGuiaUrl"'), "Sigue presente el campo manual videoGuiaUrl.");
        assert_(!source.includes("O ingresar enlace de YouTube directamente"), "Sigue presente la opción de enlace directo.");
    });
    run_("no copia la URL pendiente en un campo del formulario", () => {
        assert_(!source.includes("urlInput.value = data.videoUrl"), "La URL pendiente vuelve a inyectarse en el formulario.");
    });
    run_("mantiene la subida mediante aprobación para Cortes", () => {
        assert_(source.includes("openYouTubeUploadModal({"), "No se encontró openYouTubeUploadModal.");
        assert_(source.includes("contentType: 'corte'"), "No se conserva contentType corte.");
        assert_(source.includes("referenceId: state.selectedVehicleId"), "No se conserva el destino del vehículo seleccionado.");
    });
    run_("muestra pendiente y evita un segundo envío", () => {
        assert_(source.includes("Solicitud enviada a aprobación"), "Falta el estado de solicitud pendiente.");
        assert_(source.includes("uploadYtBtn.disabled = true"), "El botón no se deshabilita tras enviar la solicitud.");
        assert_(source.includes("Solicitud pendiente de aprobación"), "El botón no refleja el estado pendiente.");
    });
    return { status: failed === 0 ? "PASS" : "FAIL", passed, failed, results };
}