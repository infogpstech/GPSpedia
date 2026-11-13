function runAdminImageReplacementCompensationTests(uiSource, adminSource) {
    const ui = String(uiSource || ""), admin = String(adminSource || "");
    const results = [];
    let passed = 0, failed = 0;
    const run = (name, fn) => {
        try { fn(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    };
    const assert = (value, message) => { if (!value) throw new Error(message || "Aserción fallida."); };
    const extractFunction = (source, name) => {
        const start = source.indexOf("function " + name + "(");
        assert(start >= 0, "No se encontró " + name + ".");
        const end = source.indexOf("\nfunction ", start + 10);
        return source.slice(start, end > start ? end : source.length);
    };
    const linkedStart = admin.indexOf('if (status === "linked") {');
    const linkedEnd = admin.indexOf('            if (currentUrl !== originalUrl', linkedStart);
    const linkedBlock = linkedStart >= 0 && linkedEnd > linkedStart ? admin.slice(linkedStart, linkedEnd) : "";
    const catchStart = admin.indexOf('    } catch (error) {', admin.indexOf("function handleUploadAdminImage("));
    const catchEnd = admin.indexOf('    } finally {', catchStart);
    const catchBlock = catchStart >= 0 && catchEnd > catchStart ? admin.slice(catchStart, catchEnd) : "";
    run("El reemplazo exige una única fila Cortes por vehicleId", () => {
        const handler = extractFunction(admin, "handleUploadAdminImage");
        assert(/findUniqueAdminVehicleRow_\(sheet, String\(vehicleId\)\.trim\(\)\)/.test(handler), "El reemplazo no valida unicidad de vehicleId.");
        assert(!/ids\.findIndex/.test(handler), "El reemplazo todavía selecciona la primera fila coincidente.");
    });
    run("Una imagen linked enviada a papelera pasa a revisión sin reactivarse", () => {
        assert(linkedBlock.includes("if (newFile.isTrashed())"), "Falta detectar el archivo eliminado.");
        assert(linkedBlock.includes('operationRecord.values[9] = "requires_review"'), "No se marca requires_review.");
        assert(linkedBlock.includes('status: "error"'), "La UI podría interpretar la operación como confirmada.");
        assert(!/setTrashed\(false\)/.test(linkedBlock), "Se reactiva automáticamente un archivo eliminado.");
    });
    run("La reversión de Cortes verifica la URL restaurada por lectura posterior", () => {
        const fn = new Function("SpreadsheetApp", extractFunction(admin, "restoreAdminImageActiveCell_") + "; return restoreAdminImageActiveCell_;")({flush(){}});
        let value = "new-url";
        const cell = {setValue(v){value=v;},getValue(){return value;}};
        assert(fn(cell, "old-url") === true && value === "old-url", "No restauró la URL anterior.");
        let mismatch = false;
        try { fn({setValue(){},getValue(){return "new-url";}}, "old-url"); } catch (_) { mismatch = true; }
        assert(mismatch, "No detectó una reversión que no persistió.");
    });
    run("El historial verifica el estado y propaga una escritura no confirmada", () => {
        const fn = new Function("SpreadsheetApp", extractFunction(admin, "updateAdminImageReplacementHistoryStatus_") + "; return updateAdminImageReplacementHistoryStatus_;")({flush(){}});
        let value = "activa";
        const sheet = {getRange(){return {setValue(v){value=v;},getValue(){return value;}};}};
        assert(fn(sheet, 2, "requiere_revision") === true && value === "requiere_revision", "No actualizó el historial.");
        let mismatch = false;
        try { fn({getRange(){return {setValue(){},getValue(){return "cancelada";}};}}, 2, "requiere_revision"); } catch (_) { mismatch = true; }
        assert(mismatch, "No detectó un estado histórico no persistido.");
    });
    run("El estado Drive se verifica y solo elimina un archivo recién creado tras compensación limpia", () => {
        const builder = (id, hash, state) => "op=" + id + "|hash=" + hash + "|state=" + state;
        const fn = new Function("buildAdminImageUploadDescription", extractFunction(admin, "updateAdminImageUploadFileState_") + "; return updateAdminImageUploadFileState_;")(builder);
        let description = "", trashed = false;
        const file = {setDescription(v){description=v;},getDescription(){return description;},setTrashed(v){trashed=v;},isTrashed(){return trashed;}};
        assert(fn(file, "op-1", "hash-1", "cancelled", true) === true && trashed, "No verificó el traslado a papelera.");
        trashed = false;
        assert(fn(file, "op-2", "hash-2", "requires_review", false) === true && !trashed, "Se eliminó evidencia que requiere revisión.");
        let mismatch = false;
        try { fn({setDescription(){},getDescription(){return "";}}, "op-3", "hash-3", "cancelled", false); } catch (_) { mismatch = true; }
        assert(mismatch, "No detectó metadatos Drive no persistidos.");
    });
    run("La compensación actualiza el historial antes del ledger y cualquier fallo eleva revisión", () => {
        assert(catchBlock.indexOf("updateAdminImageReplacementHistoryStatus_") >= 0, "No se actualiza el historial.");
        assert(catchBlock.indexOf("rollbackFailed = true") >= 0, "Los errores de compensación no se acumulan.");
        assert(catchBlock.indexOf("updateAdminImageReplacementHistoryStatus_") < catchBlock.indexOf("saveAdminImageUploadOperation"), "El ledger se confirma antes del historial.");
        assert(/operationRecord\.values\[9\] = finalStatus/.test(catchBlock), "El ledger no usa el resultado final de compensación.");
        assert(/operationRecord\.values\[9\] = "requires_review"/.test(catchBlock), "No intenta persistir requires_review si falla el ledger.");
    });
    run("El descarte lee el catálogo fresco y usa compare-and-set por campo", () => {
        const discard = ui.slice(ui.indexOf("export async function exitModalEditMode"), ui.indexOf("function getAdminImageUploadOwnerVehicleKey"));
        assert(/const currentResponse = await routeAction\(["']getCatalogData["']\)/.test(discard), "No se obtiene una lectura fresca antes de restaurar.");
        assert(/saveFieldSilently\(cleanVehicleId, field, backupSnapshot\[field\], currentEditItem\[field\]\)/.test(discard), "La restauración no envía el valor esperado.");
        const save = extractFunction(ui, "saveFieldSilently");
        assert(/enforceExpectedCurrentValue: true/.test(save), "No se activa compare-and-set.");
        const backend = extractFunction(admin, "handleUpdateVehicleField");
        assert(/assertAdminModalExpectedValue_\(previousValue, expectedCurrentValue\)/.test(backend), "El backend no protege cambios concurrentes.");
    });
    run("La comparación condicional rechaza un cambio concurrente", () => {
        const fn = new Function(extractFunction(admin, "assertAdminModalExpectedValue_") + "; return assertAdminModalExpectedValue_;")();
        assert(fn("valor leído", "valor leído") === true, "Rechazó un valor que no cambió.");
        let conflict = false;
        try { fn("cambio concurrente", "valor leído"); } catch (_) { conflict = true; }
        assert(conflict, "Sobrescribió un cambio concurrente.");
    });
    run("El descarte conserva la base de reemplazos confirmados y verifica la restauración", () => {
        const resolver = ui.slice(ui.indexOf("async function resolvePendingAdminImageOperationsBeforeDiscard_"), ui.indexOf("export async function exitModalEditMode"));
        assert(/operationStatus === "linked"/.test(resolver), "No reconoce reemplazos confirmados.");
        assert(/submitAdminImageUploadOperation\(operation, imageTarget, editSession\)/.test(resolver), "No reconcilia el mismo opId.");
        assert(/commitAdminImageReplacementBaseline_/.test(resolver), "No actualiza la base local del reemplazo confirmado.");
        const discard = ui.slice(ui.indexOf("export async function exitModalEditMode"), ui.indexOf("function getAdminImageUploadOwnerVehicleKey"));
        assert(/const mismatches = fieldsToRestore.filter/.test(discard), "No verifica la restauración final.");
        assert(/if \(mismatches.length\)/.test(discard), "No detiene el cierre ante una restauración parcial.");
        assert(/getEditBackupStore_\(editSession.userId\)\.remove/.test(discard), "No conserva la copia local hasta verificar el descarte.");
    });
    return { passed, failed, total: passed + failed, results };
}
