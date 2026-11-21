// Contrato estático: solicitudes de aprobación pending no mutan catálogo ni PyS.
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
        const tail = source.slice(at);
        const close = tail.match(/\n\s+\}\);/);
        assert_(start >= 0 && close, "No se pudo delimitar el modal: " + anchor);
        return source.slice(start, at + close.index + close[0].length);
    }
    run_("tutorial existente no refresca catálogo al enviar vídeo pending", () => {
        const block = uploadBlock_('initialTitle: item.Tema || "Tutorial técnico"');
        assert_(!block.includes("onSuccess") && !block.includes("getCatalogData"), "El tutorial existente conserva un refresh pending.");
    });
    run_("corte existente no refresca catálogo al enviar vídeo pending", () => {
        const block = uploadBlock_("initialTitle: meta.title");
        assert_(!block.includes("onSuccess") && !block.includes("getCatalogData"), "El corte existente conserva un refresh pending.");
    });
    run_("tutorial nuevo conserva el refresh necesario de su alta, no el del vídeo", () => {
        const block = uploadBlock_("initialTitle: tema,");
        assert_(!block.includes("onSuccess"), "El upload del tutorial conserva refresh al completar vídeo pending.");
        assert_(source.includes("await refreshTutorialCatalog();\n                return;"), "Se eliminó el refresh necesario tras crear el tutorial.");
    });
    run_("PyS nuevo conserva su refresh inmediato y no repite al completar vídeo", () => {
        const block = uploadBlock_('initialTitle: content.querySelector("#pys-titulo").value.trim()');
        assert_(!block.includes("onSuccess"), "El upload PyS conserva refresh al completar vídeo pending.");
        assert_(source.includes("invalidatePysDataCache();\n                await loadPysData().catch(() => {});"), "Se eliminó la actualización inmediata del nuevo problema PyS.");
        assert_(!source.includes("refreshPysAfterVideo_"), "Quedó helper de refresh PyS sin consumidor.");
    });
    run_("PyS existente no vuelve a cargar una colección que no cambió", () => {
        const block = uploadBlock_('initialTitle: item.Problema || "Problema técnico"');
        assert_(!block.includes("onSuccess") && !block.includes("loadPysData"), "El vídeo pending provoca una recarga PyS innecesaria.");
    });
    return { status: failed === 0 ? "PASS" : "FAIL", passed, failed, results };
}
