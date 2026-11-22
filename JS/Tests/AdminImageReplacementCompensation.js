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
        assert(/findUniqueAdminVehicleRow_\(sheet, cleanVehicleId\)/.test(handler), "El reemplazo no resuelve el vehículo mediante la búsqueda única.");
        const uniqueLookup = extractFunction(admin, "findUniqueAdminVehicleRow_");
        assert(/matches\.length !== 1/.test(uniqueLookup), "La búsqueda compartida no rechaza IDs inexistentes o duplicados.");
        assert(!/ids\.findIndex/.test(handler), "El reemplazo todavía selecciona la primera fila coincidente.");
    });
    run("Una imagen linked enviada a papelera pasa a revisión sin reactivarse", () => {
        assert(linkedBlock.includes("linkedFile.isTrashed()"), "Falta detectar el archivo eliminado fuera del ScriptLock.");
        assert(linkedBlock.includes("markAdminImageUploadRequiresReview_"), "La operación linked no delega la reconciliación a requires_review.");
        const reviewHelper = extractFunction(admin, "markAdminImageUploadRequiresReview_");
        assert(reviewHelper.includes('"requires_review"'), "El helper no marca requires_review en el ledger.");
        assert(reviewHelper.includes('"requiere_revision"'), "El helper no marca requiere_revision en el historial.");
        assert(reviewHelper.includes("updateAdminImageUploadFileState_"), "El helper no alinea el estado del archivo Drive.");
        assert(reviewHelper.includes('status: "error"'), "La UI podría interpretar la operación como confirmada.");
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
    run("Los fallos parciales conservan el archivo y anexan requires_review al journal", () => {
        const handler = extractFunction(admin, "handleUploadAdminImage");
        assert(handler.includes('state: "requires_review"'), "No se registra revisión en el journal ante un fallo parcial.");
        assert(handler.includes("appendImageUploadEventForAdmin_"), "No se conserva la transición compensatoria append-only.");
        assert(!handler.includes("setTrashed(true)"), "El flujo nuevo no debe borrar evidencia de una operación parcial.");
    });
    run("El descarte lee el catálogo fresco y usa compare-and-set por campo", () => {
        const discard = ui.slice(ui.indexOf("export async function exitModalEditMode"), ui.indexOf("function getAdminImageUploadOwnerVehicleKey"));
        assert(/const currentResponse = await routeAction\(["']getCatalogData["']\)/.test(discard), "No se obtiene una lectura fresca antes de restaurar.");
        assert(/saveFieldSilently\(cleanVehicleId, field, backupSnapshot\[field\], currentEditItem\[field\]\)/.test(discard), "La restauración no envía el valor esperado.");
        const save = extractFunction(ui, "saveFieldSilently");
        assert(/enforceExpectedCurrentValue\s*:\s*true/.test(save), "No se exige una versión esperada del campo.");
        assert(/expectedSourceEventId/.test(save) && /adminModalFieldVersions\.get\(versionKey\)/.test(save),
            "La UI no conserva y envía la identidad de la versión fuente.");
        const backend = extractFunction(admin, "handleUpdateVehicleField");
        assert(/appendAdminVehicleFieldUpdate_\([\s\S]*expectedCurrentValue[\s\S]*expectedSourceEventId/.test(backend),
            "El backend no registra el cambio como versión condicionada por valor y evento fuente.");
        const append = extractFunction(admin, "appendAdminVehicleFieldUpdate_");
        assert(/expectedCurrentValue/.test(append) && /expectedSourceEventId/.test(append),
            "El journal no conserva el compare-and-set lógico por campo.");
        const vin = extractFunction(admin, "handleUpdateVehicleVinCollection_");
        assert(/appendAdminVehicleFieldUpdate_\([\s\S]*expectedCurrentValue[\s\S]*expectedSourceEventId/.test(vin),
            "La restauración VIN no utiliza el mismo versionado por campo.");
    });
    run("La comparación condicional rechaza un cambio concurrente", () => {
        const fn = new Function(extractFunction(admin, "assertAdminModalExpectedValue_") + "; return assertAdminModalExpectedValue_;")();
        assert(fn("valor leído", "valor leído") === true, "Rechazó un valor que no cambió.");
        let conflict = false;
        try { fn("cambio concurrente", "valor leído"); } catch (_) { conflict = true; }
        assert(conflict, "Sobrescribió un cambio concurrente.");
    });
    run("La imagen desplazada durante una restauración reutiliza un ID idempotente y estable", () => {
        const builderSource = extractFunction(admin, "buildReplacedImageRestoreOperationId_");
        const builder = new Function("Utilities", builderSource + "; return buildReplacedImageRestoreOperationId_;")({
            DigestAlgorithm: { SHA_256: "SHA_256" },
            computeDigest(algorithm, value) {
                assert(algorithm === "SHA_256", "Debe usar SHA-256.");
                const input = String(value || "x");
                let checksum = 2166136261;
                for (let index = 0; index < input.length; index++) {
                    checksum = Math.imul(checksum ^ input.charCodeAt(index), 16777619) >>> 0;
                }
                return Array.from({ length: 32 }, (_, index) =>
                    ((checksum >>> ((index % 4) * 8)) + index * 13) % 256
                );
            }
        });
        const first = builder("REP-HIST-1", "VEH-1", "imgCorte1", "https://drive.google.com/file/d/ACTIVE-A/view");
        assert(/^RESTORE-[a-f0-9]{64}$/.test(first), "El ID debe cumplir el contrato operationId de 20 a 80 caracteres.");
        assert(first === builder("REP-HIST-1", "VEH-1", "imgCorte1", "https://drive.google.com/file/d/ACTIVE-A/view"),
            "El mismo registro/campo/imagen activa debe producir el mismo operationId.");
        assert(first !== builder("REP-HIST-1", "VEH-1", "imgCorte1", "https://drive.google.com/file/d/ACTIVE-B/view"),
            "Una imagen activa diferente debe crear una identidad de operación distinta.");
        const restore = extractFunction(admin, "handleRecoverReplacedImage");
        assert(restore.includes("buildReplacedImageRestoreOperationId_"), "La restauración debe derivar el ID de forma determinista.");
        assert(restore.includes("operationId:swappedOperationId"), "El registro histórico debe recibir el ID estable.");
        const record = extractFunction(admin, "recordReplacedImage");
        assert(record.includes("findReplacedImageRecordById(sheet, newId)"), "El registro debe recuperar la fila existente por operationId.");
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
