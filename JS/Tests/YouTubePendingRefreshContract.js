// Contrato estático: solicitar aprobación de vídeo no modifica el catálogo.
function runYouTubePendingRefreshContractTests(uiSource) {
    const source = String(uiSource || "");
    const results = [];
    let passed = 0, failed = 0;
    function assert_(value, message) { if (!value) throw new Error(message || "Aserción fallida."); }
    function run_(name, callback) {
        try { callback(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    }
    function uploadBlock_(anchor) {
        const at = source.indexOf(anchor);
        assert_(at >= 0 && source.indexOf(anchor, at + anchor.length) < 0, "No se encontró unívocamente la ruta: " + anchor);
        const start = source.lastIndexOf("openYouTubeUploadModal({", at);
        const end = source.indexOf("\n        });", at);
        assert_(start >= 0 && end > at, "No se pudo delimitar el modal: " + anchor);
        return source.slice(start, end);
    }
    run_("el envío de vídeo de tutorial existente no solicita snapshot de catálogo", () => {
        const block = uploadBlock_('initialTitle: item.Tema || "Tutorial técnico"');
        assert_(!block.includes("getCatalogData"), "El envío pending de tutorial aún refresca el catálogo.");
        assert_(!block.includes("onSuccess"), "El modal tutorial conserva callback de éxito innecesario.");
    });
    run_("el envío de vídeo de corte existente no solicita snapshot de catálogo", () => {
        const block = uploadBlock_("initialTitle: meta.title");
        assert_(!block.includes("getCatalogData"), "El envío pending de corte aún refresca el catálogo.");
        assert_(!block.includes("onSuccess"), "El modal corte conserva callback de éxito innecesario.");
    });
    run_("el refresco funcional de vídeo PyS se conserva", () => {
        const block = uploadBlock_('initialTitle: item.Problema || "Problema técnico"');
        assert_(block.includes("invalidatePysDataCache()"), "Se eliminó la invalidación del caché PyS.");
        assert_(block.includes("loadPysData()"), "Se eliminó la recarga funcional de PyS.");
    });
    return { status: failed === 0 ? "PASS" : "FAIL", passed, failed, results };
}
