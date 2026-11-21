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
    function uploadBlock_(contentType) {
        const marker = 'contentType: "' + contentType + '"';
        const blocks = [];
        let cursor = 0, at;
        while ((at = source.indexOf(marker, cursor)) >= 0) {
            const start = source.lastIndexOf("openYouTubeUploadModal({", at);
            const end = source.indexOf("\n        });", at);
            if (start >= 0 && end > at) {
                const block = source.slice(start, end);
                if (block.includes(marker) && !blocks.includes(block)) blocks.push(block);
            }
            cursor = at + marker.length;
        }
        assert_(blocks.length === 1, "Se esperaba una única ruta de vídeo modal para " + contentType + "; encontradas: " + blocks.length + ".");
        return blocks[0];
    }
    run_("el envío de vídeo de tutorial no solicita snapshot de catálogo", () => {
        const block = uploadBlock_("tutorial");
        assert_(!block.includes("getCatalogData"), "El envío pending de tutorial aún refresca el catálogo.");
        assert_(!block.includes("onSuccess"), "El modal tutorial conserva callback de éxito innecesario.");
    });
    run_("el envío de vídeo de corte no solicita snapshot de catálogo", () => {
        const block = uploadBlock_("corte");
        assert_(!block.includes("getCatalogData"), "El envío pending de corte aún refresca el catálogo.");
        assert_(!block.includes("onSuccess"), "El modal corte conserva callback de éxito innecesario.");
    });
    run_("el refresco funcional de vídeo PyS se conserva", () => {
        const block = uploadBlock_("pys");
        assert_(block.includes("invalidatePysDataCache()"), "Se eliminó la invalidación del caché PyS.");
        assert_(block.includes("loadPysData()"), "Se eliminó la recarga funcional de PyS.");
    });
    return { status: failed === 0 ? "PASS" : "FAIL", passed, failed, results };
}
