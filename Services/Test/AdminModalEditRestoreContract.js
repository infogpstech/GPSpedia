// Contrato estático de la restauración in-modal: la UI y el backend deben admitir
// el mismo conjunto de campos y el descarte debe pasar por el helper filtrado.
function runAdminModalEditRestoreContractTests(uiSource, adminSource) {
    const results = [];
    let passed = 0, failed = 0;
    const run = (name, fn) => {
        try { fn(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    };
    const assert = (value, message) => { if (!value) throw new Error(message || "Aserción fallida."); };
    const ui = String(uiSource || ""), admin = String(adminSource || "");
    run("UI importa y utiliza el helper de restauración filtrada", () => {
        assert(/import\s*\{[^}]*getEditBackupFieldsToRestore[^}]*\}\s*from\s*['"]\.\/editBackupStore\.js['"]/.test(ui), "Falta importar el helper.");
        assert(/getEditBackupFieldsToRestore\(\s*backupSnapshot\s*,\s*currentEditItem\s*,\s*ADMIN_MODAL_EDIT_FIELDS\s*\)/.test(ui), "El descarte no filtra snapshot con la whitelist.");
        assert(/currentResponse\s*=\s*await routeAction\(["']getCatalogData["']\)/.test(ui), "Falta recuperar la ficha actual cuando no hay búfer.");
    });
    run("la whitelist de UI coincide con los campos base del servidor", () => {
        const uiMatch = ui.match(/const ADMIN_MODAL_EDIT_FIELDS = new Set\(\[([\s\S]*?)\.\.\.\[1, 2, 3\]/);
        const backendMatch = admin.match(/const ADMIN_MODAL_EDIT_FIELDS = new Set\(\[([\s\S]*?)\]\);/);
        assert(uiMatch && backendMatch, "No se encontró la whitelist de UI o backend.");
        const extract = source => [...source.matchAll(/["']([^"']+)["']/g)].map(match => match[1]).sort();
        assert(JSON.stringify(extract(uiMatch[1])) === JSON.stringify(extract(backendMatch[1])),
            "Los campos base permitidos por UI y backend no coinciden.");
        assert(/\[1, 2, 3\]\.flatMap/.test(ui), "La UI no genera los campos dinámicos 1–3.");
        assert(/\^\(tipoCorte\|configRelay\|ubicacionCorte\|colorCableCorte\)\[1-3\]\$/.test(admin),
            "El backend no admite exactamente los campos dinámicos 1–3.");
    });
    run("el descarte no vuelve a iterar indiscriminadamente todas las propiedades", () => {
        assert(!/const fieldsToRestore\s*=\s*Object\.keys\(backupSnapshot\)/.test(ui),
            "Se encontró restauración indiscriminada del snapshot completo.");
    });

    run("not_found conserva la operación local y detiene el descarte", () => {
        const resolver = ui.slice(
            ui.indexOf("async function resolvePendingAdminImageOperationsBeforeDiscard_"),
            ui.indexOf("async function exitModalEditMode")
        );
        assert(/if\s*\(operationStatus\s*===\s*["']not_found["']\)\s*\{[\s\S]*?throw new Error/.test(resolver),
            "not_found no detiene el descarte.");
        assert(/isAdminImageUploadStatusConfirmedCancelled\(operationStatus\)/.test(resolver),
            "La limpieza no exige cancelación explícita.");
        assert(!/operationStatus\s*===\s*["']cancelled["']\s*\|\|\s*operationStatus\s*===\s*["']not_found["']/.test(resolver),
            "not_found todavía se trata como cancelación.");
        const missingIndex = resolver.indexOf('operationStatus === "not_found"');
        const clearIndex = resolver.indexOf("removePendingAdminImageUploadConfirmed_(operation)", missingIndex);
        assert(clearIndex === -1, "El camino not_found intenta borrar el snapshot local.");
    });
    return { status: failed === 0 ? "PASS" : "FAIL", passed, failed, results };
}
