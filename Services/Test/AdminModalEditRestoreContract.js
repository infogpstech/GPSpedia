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
        const notFoundBlock = resolver.match(/if\s*\(operationStatus\s*===\s*["']not_found["']\)\s*\{([\s\S]*?)\n\s*\}/);
        assert(notFoundBlock && /throw new Error/.test(notFoundBlock[1]),
            "not_found no termina en un error conservador.");
        assert(!/removePendingAdminImageUploadConfirmed_/.test(notFoundBlock[1]) &&
            !/commitAdminImageReplacementBaseline_/.test(notFoundBlock[1]),
            "El camino not_found modifica o elimina estado local.");
    });
    run("las lecturas pendientes solo actualizan memoria si sigue vigente la misma sesión", () => {
        const loader = ui.slice(ui.indexOf("async function loadPendingAdminImageUploads"), ui.indexOf("function createAdminImageUploadOperationId"));
        assert(/const sessionContext = getCurrentEditOwnerContext_\(\)/.test(loader), "La carga no captura el contexto completo de sesión.");
        assert(/await Promise\.all\([\s\S]*?isCurrentUiSessionContext_\(sessionContext\)/.test(loader), "La carga no revalida el contexto después de IndexedDB.");
        assert(!/activeSession\.userId/.test(loader), "La carga sigue validando únicamente el userId.");
    });
    run("la consulta remota no continúa con una sesión distinta", () => {
        const resolver = ui.slice(ui.indexOf("async function resolvePendingAdminImageOperationsBeforeDiscard_"), ui.indexOf("async function exitModalEditMode"));
        assert(/await routeAction\(["']getAdminImageUploadStatus["'][\s\S]*?isCurrentUiSessionContext_\(editSession\)/.test(resolver), "Falta revalidar tras consultar el ledger.");
        assert(/await submitAdminImageUploadOperation\(operation, imageTarget(?:,\s*editSession)?\)[\s\S]*?isCurrentUiSessionContext_\(editSession\)/.test(resolver), "Falta revalidar tras reconciliar un reemplazo.");
        assert(/commitAdminImageReplacementBaseline_\(cleanVehicleId, operation\.fieldName, currentUrl, editSession\)/.test(resolver), "El baseline no recibe el contexto esperado.");
        assert(/removePendingAdminImageUploadConfirmed_\(operation, editSession\)/.test(resolver), "La eliminación no recibe el contexto esperado.");
    });
    run("la limpieza IndexedDB no muta mapas después de cambiar sesión", () => {
        const remover = ui.slice(ui.indexOf("async function removePendingAdminImageUploadConfirmed_"), ui.indexOf("async function resolvePendingAdminImageOperationsBeforeDiscard_"));
        assert(/await offline\.removeAdminImageUploadPendingOperation[\s\S]*?isCurrentUiSessionContext_\(expectedSession\)/.test(remover), "Falta validar tras eliminar.");
        assert(/await offline\.getAdminImageUploadPendingOperation[\s\S]*?isCurrentUiSessionContext_\(expectedSession\)/.test(remover), "Falta validar tras releer.");
        const submit = ui.slice(ui.indexOf("async function submitAdminImageUploadOperation"), ui.indexOf("function convertImageToEditable"));
        assert(/await offline\.removeAdminImageUploadPendingOperation[\s\S]*?isCurrentUiSessionContext_\(editSession\)/.test(submit), "El envío no revalida tras eliminar.");
        assert(/await offline\.getAdminImageUploadPendingOperation[\s\S]*?isCurrentUiSessionContext_\(editSession\)/.test(submit), "El envío no revalida tras releer.");
    });
    run("el envío conserva el contexto completo de la sesión iniciadora", () => {
        const submit = ui.slice(ui.indexOf("async function submitAdminImageUploadOperation"), ui.indexOf("function convertImageToEditable"));
        const converter = ui.slice(ui.indexOf("function convertImageToEditable"), ui.indexOf("const normalizeVersion"));
        assert(/submitAdminImageUploadOperation\(operation, imgElement, expectedSession = null\)/.test(submit), "El envío no acepta el contexto iniciador.");
        assert(/expectedSession \|\| getCurrentEditOwnerContext_\(\)/.test(submit) && /!isCurrentUiSessionContext_\(editSession\)/.test(submit), "El envío no valida la sesión completa esperada.");
        assert(/await readAdminImageAsDataUrl\(file\)[\s\S]*?isCurrentUiSessionContext_\(editSession\)/.test(converter), "La lectura no revalida el contexto iniciador.");
        assert(/await offline\.saveAdminImageUploadPendingOperation\(operation\)[\s\S]*?isCurrentUiSessionContext_\(editSession\)[\s\S]*?pendingAdminImageUploads\.set\(pendingKey, operation\)[\s\S]*?submitAdminImageUploadOperation\(operation, imgElement, editSession\)/.test(converter), "No se verifica la sesión tras persistir y antes de enviar.");
        assert(/submitAdminImageUploadOperation\(pendingOperation, imgElement, editSession\)/.test(converter), "El reintento no conserva la sesión iniciadora.");
    });
    run("los callbacks obsoletos no modifican la interfaz tras cambiar sesión", () => {
        const converter = ui.slice(ui.indexOf("function convertImageToEditable"), ui.indexOf("const normalizeVersion"));
        assert(/catch \(error\) \{\s*if \(isCurrentUiSessionContext_\(editSession\)\) \{[\s\S]*?imgElement\.src = previousSrc/.test(converter), "El callback tardío restaura la imagen.");
        assert(/catch \(error\) \{\s*if \(isCurrentUiSessionContext_\(editSession\)\) \{[\s\S]*?showSavingIndicator/.test(converter), "El callback tardío muestra avisos.");
    });
    run("la eliminación IndexedDB no muta mapas después de cambiar sesión", () => {
        const remover = ui.slice(ui.indexOf("async function removePendingAdminImageUploadConfirmed_"), ui.indexOf("async function resolvePendingAdminImageOperationsBeforeDiscard_"));
        assert(/await offline\.removeAdminImageUploadPendingOperation[\s\S]*?if \(!isCurrentUiSessionContext_\(expectedSession\)\) return false;[\s\S]*?pendingAdminImageUploads\.delete\(key\)/.test(remover), "La eliminación no protege memoria después de IndexedDB.");
        const submit = ui.slice(ui.indexOf("async function submitAdminImageUploadOperation"), ui.indexOf("function convertImageToEditable"));
        assert(/await offline\.removeAdminImageUploadPendingOperation[\s\S]*?if \(!isCurrentUiSessionContext_\(editSession\)\)[\s\S]*?throw new Error[\s\S]*?pendingAdminImageUploads\.delete\(key\)/.test(submit), "El envío no protege memoria después de eliminar.");
    });
    return { status: failed === 0 ? "PASS" : "FAIL", passed, failed, results };
}
