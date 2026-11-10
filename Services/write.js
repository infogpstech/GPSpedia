// ============================================================================
// GPSPEDIA-WRITE SERVICE (STANDARDIZED FOR DB V2.0)
// ============================================================================
// COMPONENT VERSION: 2.3.1

// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================
const SPREADSHEET_ID = "1M6zAVch_EGKGGRXIo74Nbn_ihH1APZ7cdr2kNdWfiDs";
const DRIVE_FOLDER_ID = '1-8QqhS-wtEFFwyBG8CmnEOp5i8rxSM-2';
let spreadsheet = null;

function getSpreadsheet() {
  if (spreadsheet === null) {
    spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return spreadsheet;
}

const SHEET_NAMES = {
    CORTES: "Cortes",
    IDEMPOTENCIA: "Idempotencia",
    IDEMPOTENCIA_FALLBACK: "Idempotencia_Cortes",
    USERS: "Users",
    ACTIVE_SESSIONS: "ActiveSessions"
};

const COLS_CORTES = {
    id: 1, categoria: 2, marca: 3, modelo: 4, versionesAplicables: 5, anoDesde: 6, anoHasta: 7, tipoEncendido: 8,
    imagenVehiculo: 9, videoGuiaDesarmeUrl: 10, contadorBusqueda: 11, tipoCorte1: 12, ubicacionCorte1: 13,
    colorCableCorte1: 14, configRelay1: 15, imgCorte1: 16, utilCorte1: 17, colaboradorCorte1: 18,
    tipoCorte2: 19, ubicacionCorte2: 20, colorCableCorte2: 21, configRelay2: 22, imgCorte2: 23,
    utilCorte2: 24, colaboradorCorte2: 25, tipoCorte3: 26, ubicacionCorte3: 27, colorCableCorte3: 28,
    configRelay3: 29, imgCorte3: 30, utilCorte3: 31, colaboradorCorte3: 32,
    apertura: 33, imgApertura: 34, cableAlimen: 35, imgCableAlimen: 36,
    timestamp: 37, notaImportante: 38,
    cableAlimen2: 39, imgCableAlimen2: 40, cableAlimen3: 41, imgCableAlimen3: 42,
    activaTestigo1: 46, activaTestigo2: 47, activaTestigo3: 48
};

/**
 * Devuelve la posición real de la columna «vin» según el encabezado.
 * Retorna 0 cuando la hoja no dispone de esa columna.
 */
function getVinColumnIndex(sheet) {
    if (!sheet || sheet.getLastColumn() < 1) return 0;
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const matches = [];
    headers.forEach((value, index) => {
        if (String(value || "").trim().toLowerCase() === "vin") matches.push(index + 1);
    });
    if (matches.length > 1) {
        throw new Error("La hoja «Cortes» contiene encabezados VIN duplicados en las columnas " + matches.join(", ") + "; no se realizó ninguna escritura.");
    }
    return matches.length === 1 ? matches[0] : 0;
}

function ensureTestigoColumns(sheet, lockAlreadyHeld = false) {
    if (!sheet) throw new Error('No se encontró la hoja «Cortes».');
    const lock = lockAlreadyHeld ? null : LockService.getScriptLock();
    let lockAcquired = false;
    try {
        if (lock) {
            lock.waitLock(30000);
            lockAcquired = true;
        }
        const targetColumns = [46, 47, 48]; // AT:AV es el contrato físico obligatorio.
        const headerNames = ["activaTestigo1", "activaTestigo2", "activaTestigo3"];
        const lastColumn = sheet.getLastColumn();
        if (lastColumn < 1) throw new Error('La hoja «Cortes» no contiene encabezados.');
        getVinColumnIndex(sheet); // Rechaza encabezados VIN duplicados antes de modificar AT:AV.

        const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
        headerNames.forEach((name, index) => {
            const matches = [];
            currentHeaders.forEach((value, column) => {
                if (String(value || "").trim().toLowerCase() === name.toLowerCase()) matches.push(column + 1);
            });
            if (matches.length > 1) {
                throw new Error("El encabezado " + name + " está duplicado en las columnas " + matches.join(", ") + ".");
            }
            if (matches.length === 1 && matches[0] !== targetColumns[index]) {
                throw new Error("El encabezado " + name + " está en la columna " + matches[0] +
                    "; el contrato requiere la columna " + targetColumns[index] + " (" +
                    ["AT", "AU", "AV"][index] + "). No se desplazaron datos.");
            }
        });

        const maxColumns = sheet.getMaxColumns();
        if (maxColumns < 48) sheet.insertColumnsAfter(maxColumns, 48 - maxColumns);

        const lastRow = sheet.getLastRow();
        const targetHeaders = sheet.getRange(1, 46, 1, 3).getValues()[0];
        for (let index = 0; index < headerNames.length; index++) {
            const current = String(targetHeaders[index] || "").trim();
            if (current && current.toLowerCase() !== headerNames[index].toLowerCase()) {
                throw new Error("La columna " + ["AT", "AU", "AV"][index] + " ya contiene el encabezado «" +
                    current + "»; no se sobrescribió.");
            }
            if (!current && lastRow > 1) {
                const values = sheet.getRange(2, targetColumns[index], lastRow - 1, 1).getValues();
                if (values.some(row => row[0] !== "" && row[0] !== null && row[0] !== undefined)) {
                    throw new Error("La columna " + ["AT", "AU", "AV"][index] +
                        " contiene datos sin encabezado; no se reasignó.");
                }
            }
        }

        for (let index = 0; index < headerNames.length; index++) {
            if (String(targetHeaders[index] || "").trim() !== headerNames[index]) {
                sheet.getRange(1, targetColumns[index]).setValue(headerNames[index]);
            }
            COLS_CORTES[headerNames[index]] = targetColumns[index];
        }
        return {
            activaTestigo1: 46,
            activaTestigo2: 47,
            activaTestigo3: 48
        };
    } finally {
        if (lockAcquired) lock.releaseLock();
    }
}

function getSessionExpirationStatus_(row,now=new Date()){
 if(!row)return{expired:true,reason:'missing_session'};
 const parse=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const d=v instanceof Date?new Date(v.getTime()):new Date(v);return Number.isNaN(d.getTime())?null:d;};
 const add=(date,n)=>{const d=new Date(date.getTime()),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d;};
 const created=parse(row[3]),raw=row[5],activity=raw===null||raw===undefined||String(raw).trim()===''?created:parse(raw);
 if(!created||!activity)return{expired:true,reason:'invalid_timestamp'};
 if(now.getTime()>=add(created,3).getTime())return{expired:true,reason:'absolute_expiration'};
 if(now.getTime()>=add(activity,1).getTime())return{expired:true,reason:'inactivity_expiration'};
 return{expired:false};
}
function getAuthenticatedCollaborator(payload){
  const id=String(payload&&payload.userId||'').trim(),token=String(payload&&payload.sessionToken||'');if(!id||!token.trim())throw new Error("Acceso no autorizado: se requiere una sesión válida.");
  const ss=getSpreadsheet(),sh=ss.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS),uh=ss.getSheetByName(SHEET_NAMES.USERS);if(!sh||!uh)throw new Error("Acceso no autorizado: sesión no autorizada.");
  const tokenMatches=sh.getDataRange().getValues().slice(1).filter(r=>r[COLS_ACTIVE_SESSIONS.ActiveSessions-1]===token);
  if(tokenMatches.length!==1||String(tokenMatches[0][COLS_ACTIVE_SESSIONS.ID_Usuario-1]||'').trim()!==id||getSessionExpirationStatus_(tokenMatches[0],new Date()).expired)throw new Error("Acceso no autorizado: sesión inválida, duplicada, cruzada o expirada.");
  const userMatches=uh.getDataRange().getValues().slice(1).filter(r=>String(r[COLS_USERS.ID-1]||'').trim()===id);
  if(userMatches.length!==1)throw new Error("Acceso no autorizado: el perfil de usuario no es único.");
  const u=userMatches[0];if(String(u[COLS_USERS.SessionToken-1]||'').startsWith(ROLE_REVOCATION_SHARED_PREFIX))throw new Error("Acceso no autorizado: existe una revocación de rol pendiente. Inicia sesión nuevamente cuando finalice.");
  const username=String(u[COLS_USERS.Nombre_Usuario-1]||'').trim();
  const role=String(u[COLS_USERS.Privilegios-1]||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  if(!username||username.startsWith('__deleted__:')||!['desarrollador','gefe','jefe','supervisor','tecnico','tecnico_exterior'].includes(role))throw new Error("Acceso no autorizado: la cuenta no está activa o no tiene un rol válido.");
  const name=String(u[COLS_USERS.Nombre_Completo-1]||'').trim();if(!name)throw new Error("El perfil del usuario no tiene un nombre completo registrado.");return name;
}
// ============================================================================
// ROUTER PRINCIPAL (doGet y doPost)
// ============================================================================

function doGet(e) {
    if (e.parameter.debug === 'true') {
        const serviceState = {
            service: 'GPSpedia-Write',
            version: '2.3.1',
            spreadsheetId: SPREADSHEET_ID,
            driveFolderId: DRIVE_FOLDER_ID,
            sheetsAccessed: [SHEET_NAMES.CORTES]
        };
        return ContentService.createTextOutput(JSON.stringify(serviceState, null, 2))
            .setMimeType(ContentService.MimeType.TEXT);
    }
    const defaultResponse = { status: 'success', message: 'GPSpedia Write-SERVICE v2.0 is active.' };
    return ContentService.createTextOutput(JSON.stringify(defaultResponse))
        .setMimeType(ContentService.MimeType.TEXT);
}


function isSharedMutationAction_(action) {
    return ["addOrUpdateCut","addSupplementaryInfo","addVinToVehicle","allocateVehicleId","freezeCortesIds"].includes(action);
}

function doPost(e) {
    let request;
    try {
        request = JSON.parse(e && e.postData && e.postData.contents || "{}");
    } catch (error) {
        return doPostInternal_(e);
    }
    if (!request || typeof request !== "object") return doPostInternal_(e);
    const action = String(request.action || "");
    if (!isSharedMutationAction_(action)) return doPostInternal_(e);

    const payload = request.payload && typeof request.payload === "object" ? request.payload : {};
    const nestedToken = String(payload.__sharedMutationToken || "").trim();
    try {
        return withSharedMutationLease_("WRITE", action, function(token) {
            
            const wrappedEvent = Object.assign({}, e || {}, {
                postData: Object.assign({}, e && e.postData || {}, { contents: JSON.stringify(request) })
            });
            return doPostInternal_(wrappedEvent);
        }, nestedToken ? { nestedToken: nestedToken } : undefined);
    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            status: "error",
            message: error && error.message ? error.message : "La operación fue rechazada por el coordinador compartido."
        })).setMimeType(ContentService.MimeType.TEXT);
    }
}

function doPostInternal_(e) {
    let response;
    try {
        const request = JSON.parse(e.postData.contents);
        switch (request.action) {
            case 'getHeaders':
                const cortesSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
                response = { status: 'success', headers: cortesSheet.getRange(1, 1, 1, cortesSheet.getLastColumn()).getValues()[0] };
                break;
            case 'checkVehicle':
                response = handleCheckVehicle(request.payload);
                break;
            case 'getSuggestion': // Acción nueva para sugerencias
                response = handleGetSuggestion(request.payload);
                break;
            case 'checkOperation':
                response = handleCheckOperation(request.payload);
                break;
            case 'addOrUpdateCut':
                response = handleAddOrUpdateCut(request.payload);
                break;
            case 'addSupplementaryInfo':
                response = handleAddSupplementaryInfo(request.payload);
                break;
            case 'checkVinDuplicate':
                response = handleCheckVinDuplicate(request.payload);
                break;
            case 'addVinToVehicle':
                response = handleAddVinToVehicle(request.payload);
                break;
            case 'allocateVehicleId':
                response = handleAllocateVehicleId(request.payload);
                break;
            case 'freezeCortesIds':
                response = handleFreezeCortesIds(request.payload);
                break;
            default:
                throw new Error(`La acción '${request.action}' es desconocida.`);
        }
    } catch (error) {
        Logger.log(`Error en Write-Service doPost: ${error.stack}`);
        response = { status: 'error', message: 'Ocurrió un error en el servicio.', details: { errorMessage: error.message } };
    }
    return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.TEXT);
}


// ============================================================================
// HANDLERS DE ACCIONES
// ============================================================================

/* TAREA 3 (4.2, 4.4, B31): REGISTRO Y ACTUALIZACIÓN DE CORTES E IDEMPOTENCIA CON REPARACIÓN */
function handleAddOrUpdateCut(payload) {
    const lock = LockService.getScriptLock();
    try { lock.waitLock(30000); }
    catch (error) { throw new Error("No se pudo obtener el bloqueo para registrar el corte. Por favor reintente en unos instantes."); }
    try { return handleAddOrUpdateCutLocked(payload); }
    finally { lock.releaseLock(); }
}


const CORTES_ID_COUNTER_PROPERTY = "GPSpedia_CORTES_LAST_ID";

/** Asignador único de IDs; debe ejecutarse bajo el ScriptLock del proyecto WRITE. */
function getNextCortesVehicleIdLocked(sheet) {
    if (!sheet) throw new Error("No se encontró la hoja «Cortes».");
    if (String(sheet.getRange(1, COLS_CORTES.id).getValue() || "").trim() !== "id") {
        throw new Error("El encabezado de la primera columna de «Cortes» no es «id».");
    }

    let maxSheetId = 0;
    const seenIds = new Set();
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    if (lastRow > 1) {
        const rows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
        const formulas = sheet.getRange(2, COLS_CORTES.id, lastRow - 1, 1).getFormulas();
        rows.forEach((row, index) => {
            const rawId = row[COLS_CORTES.id - 1];
            const hasData = row.slice(1).some(value => value !== "" && value !== null && value !== undefined);
            const hasId = rawId !== "" && rawId !== null && rawId !== undefined;
            if (!hasData && formulas[index][0]) return;
            if (!hasData && !hasId) return;
            if (!hasId) throw new Error(`La fila ${index + 2} contiene datos, pero no tiene ID.`);

            const id = typeof rawId === "number" ? rawId : Number(String(rawId).trim());
            if (!Number.isSafeInteger(id) || id < 1) {
                throw new Error(`El ID de la fila ${index + 2} no es un entero numérico positivo seguro.`);
            }
            if (seenIds.has(id)) throw new Error(`Se detectó el ID duplicado ${id} en «Cortes»; no se asignó otro ID.`);
            seenIds.add(id);
            maxSheetId = Math.max(maxSheetId, id);
        });
    }

    const properties = PropertiesService.getScriptProperties();
    const storedValue = properties.getProperty(CORTES_ID_COUNTER_PROPERTY);
    const storedId = storedValue === null ? 0 : Number(storedValue);
    if (!Number.isSafeInteger(storedId) || storedId < 0) {
        throw new Error("El contador central de IDs de Cortes contiene un valor inválido.");
    }
    const nextId = Math.max(maxSheetId, storedId) + 1;
    if (!Number.isSafeInteger(nextId) || nextId < 1) throw new Error("Se alcanzó el límite seguro del ID numérico de Cortes.");
    properties.setProperty(CORTES_ID_COUNTER_PROPERTY, String(nextId));
    return nextId;
}

/** Endpoint autenticado para que ADMIN solicite un ID al asignador central. */
function handleAllocateVehicleId(payload) {
    assertDeveloperForIdMaintenance(payload);
    const lock = LockService.getScriptLock();
    try { lock.waitLock(30000); }
    catch (error) { throw new Error("No se pudo obtener el bloqueo central de IDs. Intente nuevamente."); }
    try {
        assertDeveloperForIdMaintenance(payload);
        const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
        return { status: "success", vehicleId: getNextCortesVehicleIdLocked(sheet) };
    } finally {
        lock.releaseLock();
    }
}

function assertDeveloperForIdMaintenance(payload) {
    getAuthenticatedCollaborator(payload);
    const userId = String(payload && payload.userId || "").trim();
    const usersSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
    if (!usersSheet) throw new Error("No se encontró la hoja Users.");
    const rows = usersSheet.getDataRange().getValues();
    const userMatches = rows.slice(1).filter(row =>
        String(row[COLS_USERS.ID - 1] || "").trim() === userId);
    if (userMatches.length !== 1) {
        throw new Error("No se pudo resolver un perfil único para el mantenimiento de IDs.");
    }
    const role = String(userMatches[0][COLS_USERS.Privilegios - 1] || "")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    if (role !== "desarrollador") {
        throw new Error("El mantenimiento de IDs de Cortes requiere privilegio Desarrollador.");
    }
}

function verifyCortesIdsBackup(value) {
    const raw = String(value || "").trim();
    const match = raw.match(/\/d\/([a-zA-Z0-9_-]{20,})/) || raw.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
    const backupId = match ? match[1] : raw;
    if (!/^[a-zA-Z0-9_-]{20,}$/.test(backupId) || backupId === SPREADSHEET_ID) {
        throw new Error("Se requiere un respaldo de Spreadsheet válido y distinto de producción.");
    }
    const file = DriveApp.getFileById(backupId);
    if (file.isTrashed() || file.getMimeType() !== MimeType.GOOGLE_SHEETS ||
        !String(file.getName() || "").startsWith("GPSpedia_DB_BACKUP_")) {
        throw new Error("El recurso indicado no es un respaldo de Spreadsheet válido.");
    }
    const rootId = DriveApp.getRootFolder().getId();
    const parents = file.getParents();
    let rootChild = false;
    while (parents.hasNext()) if (parents.next().getId() === rootId) rootChild = true;
    if (!rootChild) throw new Error("El respaldo debe estar directamente en la raíz de Drive.");
    const backup = SpreadsheetApp.openById(backupId);
    const backupCortes = backup.getSheetByName(SHEET_NAMES.CORTES);
    if (!backupCortes || backupCortes.getLastColumn() < 45) {
        throw new Error("El respaldo no contiene una hoja Cortes compatible con la estructura inventariada.");
    }
    return backupId;
}

function buildCortesIdFreezePlan(sheet) {
    if (!sheet) throw new Error("No se encontró la hoja «Cortes».");
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    if (lastRow < 2) return { finalValues: [], formulasToFreeze: 0, emptyFormulaRowsToClear: 0, rowsWithData: 0, maxId: 0 };

    const rows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
    const formulas = sheet.getRange(2, COLS_CORTES.id, lastRow - 1, 1).getFormulas();
    const seenIds = new Set();
    const finalValues = [];
    let formulasToFreeze = 0, emptyFormulaRowsToClear = 0, rowsWithData = 0, maxId = 0;

    rows.forEach((row, index) => {
        const rawId = row[COLS_CORTES.id - 1];
        const hasData = row.slice(1).some(value => value !== "" && value !== null && value !== undefined);
        const hasId = rawId !== "" && rawId !== null && rawId !== undefined;
        const hasFormula = Boolean(formulas[index][0]);
        if (hasData) {
            rowsWithData++;
            if (!hasId) throw new Error(`La fila ${index + 2} contiene datos, pero no tiene ID.`);
        }
        if (hasFormula && !hasData) {
            emptyFormulaRowsToClear++;
            finalValues.push([""]);
            return;
        }
        if (hasId) {
            const id = typeof rawId === "number" ? rawId : Number(String(rawId).trim());
            if (!Number.isSafeInteger(id) || id < 1) throw new Error(`El ID de la fila ${index + 2} no es un entero numérico positivo seguro.`);
            if (seenIds.has(id)) throw new Error(`Se detectó el ID duplicado ${id}; no se modificó ninguna fórmula.`);
            seenIds.add(id);
            maxId = Math.max(maxId, id);
        }
        if (hasFormula) {
            if (!hasId) throw new Error(`La fórmula de ID de la fila ${index + 2} no devuelve un valor válido.`);
            formulasToFreeze++;
        }
        finalValues.push([rawId]);
    });
    return { finalValues, formulasToFreeze, emptyFormulaRowsToClear, rowsWithData, maxId };
}

/** Convierte fórmulas heredadas en valores sin alterar los valores calculados ni el formato de celda. */
function handleFreezeCortesIds(payload) {
    const lock = LockService.getScriptLock();
    try { lock.waitLock(30000); }
    catch (error) { throw new Error("No se pudo obtener el bloqueo central para estabilizar los IDs de Cortes."); }
    try {
        assertDeveloperForIdMaintenance(payload);
        const backupId = verifyCortesIdsBackup(payload && payload.backupId);
        const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
        const plan = buildCortesIdFreezePlan(sheet);
        const summary = {
            backupId,
            rowsWithData: plan.rowsWithData,
            formulasToFreeze: plan.formulasToFreeze,
            emptyFormulaRowsToClear: plan.emptyFormulaRowsToClear,
            maxId: plan.maxId
        };
        if (!payload || payload.confirm !== true) {
            return { status: "success", dryRun: true, ...summary, message: "Simulación completada; no se modificó Cortes." };
        }

        const properties = PropertiesService.getScriptProperties();
        const storedValue = properties.getProperty(CORTES_ID_COUNTER_PROPERTY);
        const storedId = storedValue === null ? 0 : Number(storedValue);
        if (!Number.isSafeInteger(storedId) || storedId < 0) throw new Error("El contador central de IDs contiene un valor inválido.");
        properties.setProperty(CORTES_ID_COUNTER_PROPERTY, String(Math.max(storedId, plan.maxId)));

        if (plan.finalValues.length) {
            const idRange = sheet.getRange(2, COLS_CORTES.id, plan.finalValues.length, 1);
            idRange.setValues(plan.finalValues);
            SpreadsheetApp.flush();
            const valuesAfter = idRange.getValues();
            const formulasAfter = idRange.getFormulas();
            for (let index = 0; index < plan.finalValues.length; index++) {
                if (String(valuesAfter[index][0] ?? "") !== String(plan.finalValues[index][0] ?? "") || formulasAfter[index][0]) {
                    throw new Error(`No se pudo verificar la conversión estática del ID en la fila ${index + 2}.`);
                }
            }
        }
        return {
            status: "success",
            dryRun: false,
            ...summary,
            message: "Las fórmulas heredadas se convirtieron en valores estáticos y se conservaron los formatos de celda."
        };
    } finally {
        lock.releaseLock();
    }
}


function handleAddOrUpdateCutLocked(payload) {
    payload = payload && typeof payload === 'object' ? payload : {};
    const { vehicleData, cutData, vehicleId } = payload;
    if (!cutData) {
        throw new Error("Los datos del corte son requeridos.");
    }

    const colaboradorName = getAuthenticatedCollaborator(payload);
    let opId = payload.opId || null;
    // Compatibilidad con operaciones antiguas: solo se extrae el opId del campo heredado.
    // El nombre de colaborador enviado por el cliente nunca se utiliza como identidad.
    if (!opId && typeof payload.colaborador === 'string') {
        const opMatch = payload.colaborador.match(/\[(OP-[a-zA-Z0-9_-]+)\]/);
        if (opMatch) opId = opMatch[1];
    }

    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    ensureTestigoColumns(sheet, true);
    const vinColumnIndex = getVinColumnIndex(sheet);
    const vinPrefix = cutData.vin ? extractVinPrefix(cutData.vin) : "";
    if (cutData.vin && !vinColumnIndex) {
        throw new Error("La hoja «Cortes» no contiene el encabezado «VIN»; no se puede guardar el identificador sin alterar otras columnas.");
    }

    if (opId) {
        const match = findRowByOpId(sheet, opId);
        if (match) {
            const rowIndex = match.rowIndex;
            const rowValues = match.rowValues;
            const rowObj = mapRowToObject(rowValues, COLS_CORTES);
            let recoveredVinCollection = null;
            if (vinPrefix) {
                const existing = parseVinCollection(rowValues[vinColumnIndex - 1]);
                if (!existing.includes(vinPrefix)) {
                    const duplicate = checkVinDuplicateInSheet(sheet, vinPrefix, rowObj.id);
                    if (duplicate) throw new Error("VIN ya está registrado para: " + duplicate.modelName);
                    const maxAllowed = countEquipmentVersions((vehicleData && vehicleData.versionesAplicables) || rowObj.versionesAplicables);
                    recoveredVinCollection = addVinToAvailableSlot(existing, vinPrefix, maxAllowed).collection;
                }
            }
            const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
            const matchedColName = String(headers[match.colIndex - 1]).toLowerCase();

            let slotIndex = 1;
            if (matchedColName.includes("1") || match.colIndex === COLS_CORTES.colaboradorCorte1) slotIndex = 1;
            else if (matchedColName.includes("2") || match.colIndex === COLS_CORTES.colaboradorCorte2) slotIndex = 2;
            else if (matchedColName.includes("3") || match.colIndex === COLS_CORTES.colaboradorCorte3) slotIndex = 3;

            // 1. Check and repair vehicle image if it was registered but is invalid/corrupted/trashed
            if (vehicleData && vehicleData.imagenVehiculo) {
                const currentImg = rowObj.imagenVehiculo;
                if (!checkFileIdValid(currentImg)) {
                    const folder = findOrCreateVehicleFolder(mergeVehicleFolderInfo(rowObj, vehicleData));
const filename = buildCanonicalImageBaseName(rowObj, "imagenVehiculo", "_repaired");
                    const newUrl = uploadImageToDrive(vehicleData.imagenVehiculo, filename, folder, buildImageUploadOperationKey(opId, rowObj.id, "imagenVehiculo"));
                    sheet.getRange(rowIndex, COLS_CORTES.imagenVehiculo).setValue(newUrl);
                }
            }

            // 2. Check and repair cut image if it was registered but is invalid/corrupted/trashed
            if (cutData && cutData.imgCorte1 && cutData.tipoCorte1 !== 'No recomendado') {
                const currentCorteImg = rowObj[`imgCorte${slotIndex}`];
                if (!checkFileIdValid(currentCorteImg)) {
                    const folder = findOrCreateVehicleFolder(mergeVehicleFolderInfo(rowObj, vehicleData));
const filename = buildCanonicalImageBaseName(rowObj, "imgCorte" + slotIndex, "_repaired");
                    const newCorteImgUrl = uploadImageToDrive(cutData.imgCorte1, filename, folder, buildImageUploadOperationKey(opId, rowObj.id, "imgCorte" + slotIndex));
                    sheet.getRange(rowIndex, COLS_CORTES[`imgCorte${slotIndex}`]).setValue(newCorteImgUrl);
                }
            }

            // 3. Complete missing/empty text fields in the sheet (partially completed registration)
            if (vehicleData) {
                if (!rowObj.categoria && vehicleData.categoria) {
                    sheet.getRange(rowIndex, COLS_CORTES.categoria).setValue(vehicleData.categoria);
                }
                if (!rowObj.marca && vehicleData.marca) {
                    sheet.getRange(rowIndex, COLS_CORTES.marca).setValue(vehicleData.marca);
                }
                if (!rowObj.modelo && vehicleData.modelo) {
                    sheet.getRange(rowIndex, COLS_CORTES.modelo).setValue(vehicleData.modelo);
                }
                if (!rowObj.versionesAplicables && vehicleData.versionesAplicables) {
                    sheet.getRange(rowIndex, COLS_CORTES.versionesAplicables).setValue(vehicleData.versionesAplicables);
                }
                if (!rowObj.anoDesde && vehicleData.anoDesde) {
                    const yearInput = String(vehicleData.anoDesde).trim();
                    let anoDesde = yearInput;
                    let anoHasta = yearInput;
                    if (yearInput.includes('-')) {
                        const [start, end] = yearInput.split('-').map(function(y) { return parseInt(y.trim(), 10); });
                        anoDesde = Math.min(start, end);
                        anoHasta = Math.max(start, end);
                    }
                    sheet.getRange(rowIndex, COLS_CORTES.anoDesde).setValue(anoDesde);
                    if (!rowObj.anoHasta) {
                        sheet.getRange(rowIndex, COLS_CORTES.anoHasta).setValue(anoHasta);
                    }
                }
                if (!rowObj.tipoEncendido && vehicleData.tipoEncendido) {
                    sheet.getRange(rowIndex, COLS_CORTES.tipoEncendido).setValue(vehicleData.tipoEncendido);
                }
            }

            if (cutData) {
                if (!rowObj[`tipoCorte${slotIndex}`] && cutData.tipoCorte1) {
                    sheet.getRange(rowIndex, COLS_CORTES[`tipoCorte${slotIndex}`]).setValue(cutData.tipoCorte1 || "");
                }
                if (!rowObj[`ubicacionCorte${slotIndex}`] && cutData.ubicacionCorte1) {
                    sheet.getRange(rowIndex, COLS_CORTES[`ubicacionCorte${slotIndex}`]).setValue(cutData.ubicacionCorte1 || "");
                }
                if (!rowObj[`colorCableCorte${slotIndex}`] && cutData.colorCableCorte1) {
                    sheet.getRange(rowIndex, COLS_CORTES[`colorCableCorte${slotIndex}`]).setValue(cutData.colorCableCorte1 || "");
                }
                if (!rowObj[`configRelay${slotIndex}`] && cutData.configRelay1) {
                    sheet.getRange(rowIndex, COLS_CORTES[`configRelay${slotIndex}`]).setValue(cutData.configRelay1 || "");
                }
                const testigoKey = `activaTestigo${slotIndex}`;
                if ((rowObj[testigoKey] === "" || rowObj[testigoKey] === null || rowObj[testigoKey] === undefined) && typeof cutData.activaTestigo1 === "boolean") {
                    sheet.getRange(rowIndex, COLS_CORTES[testigoKey]).setValue(cutData.activaTestigo1);
                }
                if (!rowObj[`colaboradorCorte${slotIndex}`] && colaboradorName) {
                    sheet.getRange(rowIndex, COLS_CORTES[`colaboradorCorte${slotIndex}`]).setValue(colaboradorName || "");
                }
            }

            if (recoveredVinCollection) {
                sheet.getRange(rowIndex, vinColumnIndex).setValue(JSON.stringify(recoveredVinCollection));
            }
            if (match.timestamp && (match.status === "pending" || !rowObj.timestamp)) {
                sheet.getRange(rowIndex, COLS_CORTES.timestamp).setValue(match.timestamp);
            }
            SpreadsheetApp.flush();
            markImageUploadLinked(sheet.getRange(rowIndex, COLS_CORTES.imagenVehiculo).getValue());
            markImageUploadLinked(sheet.getRange(rowIndex, COLS_CORTES["imgCorte" + slotIndex]).getValue());
            if (opId && rowObj.id) {
                recordOpId(opId, rowObj.id, slotIndex, match.timestamp || rowObj.timestamp, "completed");
            }
            return {
                status: 'success',
                message: 'La operación ya fue completada (recuperada, reparada y completada).',
                vehicleId: rowObj.id,
                timestamp: match.timestamp || rowObj.timestamp
            };
        }
    }

    let targetDate = new Date();
    if (payload && payload.silent === true) {
        targetDate.setDate(targetDate.getDate() - 365); // Hace 365 días para evitar "Agregados recientemente"
    }
    const formattedDate = Utilities.formatDate(targetDate, "GMT-6", "dd/MM/yyyy");
    let rowIndex;
    let newId;

    if (vinPrefix && !vehicleId) {
        const duplicate = checkVinDuplicateInSheet(sheet, vinPrefix, null);
        if (duplicate) throw new Error("VIN ya está registrado para: " + duplicate.modelName);
    }

    if (vehicleId) { // --- Lógica para vehículo EXISTENTE ---
        const ids = sheet.getRange(2, 1, sheet.getLastRow(), 1).getValues().flat();
        const existingIndex = ids.findIndex(id => id.toString() == vehicleId.toString());
        if (existingIndex === -1) throw new Error("El ID del vehículo no fue encontrado.");
        rowIndex = existingIndex + 2;

        const rowValues = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
        const vehicleInfo = mapRowToObject(rowValues, COLS_CORTES);
        let updatedVinCollection = null;
        if (vinPrefix) {
            const existingVinCollection = parseVinCollection(rowValues[vinColumnIndex - 1]);
            if (!existingVinCollection.includes(vinPrefix)) {
                const duplicate = checkVinDuplicateInSheet(sheet, vinPrefix, vehicleId);
                if (duplicate) throw new Error("VIN ya está registrado para: " + duplicate.modelName);
                const maxAllowed = countEquipmentVersions((vehicleData && vehicleData.versionesAplicables) || vehicleInfo.versionesAplicables);
                updatedVinCollection = addVinToAvailableSlot(existingVinCollection, vinPrefix, maxAllowed).collection;
            }
        }

        let cutSlotIndex = -1;
        for (let i = 1; i <= 3; i++) {
            if (!rowValues[COLS_CORTES[`tipoCorte${i}`] - 1]) {
                cutSlotIndex = i;
                break;
            }
        }
        if (cutSlotIndex === -1) throw new Error("No hay espacios disponibles para más cortes.");

        if (opId) recordOpId(opId, vehicleId, cutSlotIndex, formattedDate, "pending");

        let imageUrl = '';
        if (cutData.imgCorte1) {
            const folder = findOrCreateVehicleFolder(vehicleInfo);
const filename = buildCanonicalImageBaseName(vehicleInfo, "imgCorte" + cutSlotIndex);
            imageUrl = uploadImageToDrive(cutData.imgCorte1, filename, folder, buildImageUploadOperationKey(opId, vehicleId, "imgCorte" + cutSlotIndex));
        }

        sheet.getRange(rowIndex, COLS_CORTES[`tipoCorte${cutSlotIndex}`]).setValue(cutData.tipoCorte1);
        sheet.getRange(rowIndex, COLS_CORTES[`ubicacionCorte${cutSlotIndex}`]).setValue(cutData.ubicacionCorte1);
        sheet.getRange(rowIndex, COLS_CORTES[`colorCableCorte${cutSlotIndex}`]).setValue(cutData.colorCableCorte1);
        sheet.getRange(rowIndex, COLS_CORTES[`configRelay${cutSlotIndex}`]).setValue(cutData.configRelay1);
        sheet.getRange(rowIndex, COLS_CORTES[`activaTestigo${cutSlotIndex}`]).setValue(cutData.activaTestigo1 === true);
        sheet.getRange(rowIndex, COLS_CORTES[`imgCorte${cutSlotIndex}`]).setValue(imageUrl);
        sheet.getRange(rowIndex, COLS_CORTES[`colaboradorCorte${cutSlotIndex}`]).setValue(colaboradorName);
        if (updatedVinCollection) {
            sheet.getRange(rowIndex, vinColumnIndex).setValue(JSON.stringify(updatedVinCollection));
        }
        sheet.getRange(rowIndex, COLS_CORTES.timestamp).setValue(formattedDate);
        SpreadsheetApp.flush();
        markImageUploadLinked(sheet.getRange(rowIndex, COLS_CORTES["imgCorte" + cutSlotIndex]).getValue());
        if (opId) recordOpId(opId, vehicleId, cutSlotIndex, formattedDate, "completed");

        newId = vehicleId;

    } else { // --- Lógica para vehículo NUEVO (CORREGIDO PARA PRESERVAR FÓRMULA DE ID) ---
        if (!vehicleData) throw new Error("Los datos del vehículo son requeridos para un nuevo registro.");

        var entities = getExistingEntities(sheet);
        vehicleData.marca = resolveAndNormalizeEntity(vehicleData.marca, entities.brands, false);
        vehicleData.modelo = resolveAndNormalizeEntity(vehicleData.modelo, entities.models, false);
        vehicleData.versionesAplicables = resolveAndNormalizeEntity(vehicleData.versionesAplicables, entities.versions, true);

        const lastRow = sheet.getLastRow();
        rowIndex = lastRow + 1;
        const lastColumn = sheet.getLastColumn();

        // Copiar la plantilla de formato/validación; el nuevo ID será un valor estático.
        const previousRowRange = sheet.getRange(lastRow, 1, 1, lastColumn);
        const newRowRange = sheet.getRange(rowIndex, 1, 1, lastColumn);
        previousRowRange.copyTo(newRowRange);

        // Limpiar los datos heredados y retirar expresamente la fórmula copiada de la columna ID.
        const dataRange = sheet.getRange(rowIndex, 2, 1, lastColumn - 1);
        dataRange.clearContent();
        sheet.getRange(rowIndex, COLS_CORTES.id).clearContent();
        SpreadsheetApp.flush();

        // La asignación se realiza bajo el bloqueo exclusivo de WRITE.
        newId = getNextCortesVehicleIdLocked(sheet);
        sheet.getRange(rowIndex, COLS_CORTES.id).setValue(newId);
        SpreadsheetApp.flush();
        if (Number(sheet.getRange(rowIndex, COLS_CORTES.id).getValue()) !== newId) {
            removeEmptyPendingCutRow(sheet, rowIndex, lastColumn);
            throw new Error("No se pudo verificar el ID estático del nuevo vehículo; no se guardó el corte.");
        }
        if (opId) {
            try {
                recordOpId(opId, newId, 1, formattedDate, "pending");
            } catch (error) {
                try {
                    const persistedOperation = findRowByOpId(sheet, opId);
                    if (!persistedOperation || persistedOperation.rowIndex !== rowIndex) removeEmptyPendingCutRow(sheet, rowIndex, lastColumn);
                } catch (verificationError) {
                    Logger.log("No se pudo determinar si la reserva de opId quedó persistida: " + verificationError.message);
                }
                throw error;
            }
        }
        if (vinPrefix) {
            sheet.getRange(rowIndex, vinColumnIndex).setValue(serializeVinCollection([vinPrefix]));
        }


        // 3. Preparar los datos que se van a escribir.
        // Parsear año...
        const yearInput = vehicleData.anoDesde.trim();
        let anoDesde, anoHasta, anioParaFolder;
        if (yearInput.includes('-')) {
            const [start, end] = yearInput.split('-').map(y => parseInt(y.trim(), 10));
            anoDesde = Math.min(start, end);
            anoHasta = Math.max(start, end);
        } else {
            anoDesde = parseInt(yearInput, 10);
            anoHasta = anoDesde;
        }
        anioParaFolder = anoDesde;

        // Subir imágenes y obtener URLs...
        const folder = findOrCreateVehicleFolder(Object.assign({}, vehicleData, { anoDesde: anoDesde, anoHasta: anoHasta }));
        let vehiculoImageUrl = '';
        if (vehicleData.imagenVehiculo) {
const filename = buildCanonicalImageBaseName(Object.assign({}, vehicleData, { anoDesde: anoDesde, anoHasta: anoHasta }), "imagenVehiculo");
            vehiculoImageUrl = uploadImageToDrive(vehicleData.imagenVehiculo, filename, folder, buildImageUploadOperationKey(opId, newId, "imagenVehiculo"));
        }
        let corteImageUrl = '';
        if (cutData.imgCorte1) {
const filename = buildCanonicalImageBaseName(Object.assign({}, vehicleData, { anoDesde: anoDesde, anoHasta: anoHasta }), "imgCorte1");
            corteImageUrl = uploadImageToDrive(cutData.imgCorte1, filename, folder, buildImageUploadOperationKey(opId, newId, "imgCorte1"));
        }

        // 4. Escribir los nuevos datos en las celdas específicas usando múltiples `setValue` para claridad.
        // Esto es más legible que crear un array gigante y previene errores de índice.
        sheet.getRange(rowIndex, COLS_CORTES.categoria).setValue(vehicleData.categoria || '');
        sheet.getRange(rowIndex, COLS_CORTES.marca).setValue(vehicleData.marca);
        sheet.getRange(rowIndex, COLS_CORTES.modelo).setValue(vehicleData.modelo);
        sheet.getRange(rowIndex, COLS_CORTES.versionesAplicables).setValue(vehicleData.versionesAplicables || '');
        sheet.getRange(rowIndex, COLS_CORTES.anoDesde).setValue(anoDesde);
        sheet.getRange(rowIndex, COLS_CORTES.anoHasta).setValue(anoHasta);
        sheet.getRange(rowIndex, COLS_CORTES.tipoEncendido).setValue(vehicleData.tipoEncendido);
        sheet.getRange(rowIndex, COLS_CORTES.imagenVehiculo).setValue(vehiculoImageUrl);
        sheet.getRange(rowIndex, COLS_CORTES.timestamp).setValue(formattedDate);

        // Datos del primer corte
        sheet.getRange(rowIndex, COLS_CORTES.tipoCorte1).setValue(cutData.tipoCorte1);
        sheet.getRange(rowIndex, COLS_CORTES.ubicacionCorte1).setValue(cutData.ubicacionCorte1);
        sheet.getRange(rowIndex, COLS_CORTES.colorCableCorte1).setValue(cutData.colorCableCorte1);
        sheet.getRange(rowIndex, COLS_CORTES.configRelay1).setValue(cutData.configRelay1);
        sheet.getRange(rowIndex, COLS_CORTES.activaTestigo1).setValue(cutData.activaTestigo1 === true);
        sheet.getRange(rowIndex, COLS_CORTES.imgCorte1).setValue(corteImageUrl);
        sheet.getRange(rowIndex, COLS_CORTES.colaboradorCorte1).setValue(colaboradorName);
        SpreadsheetApp.flush();
        markImageUploadLinked(vehiculoImageUrl);
        markImageUploadLinked(corteImageUrl);
        if (opId) recordOpId(opId, newId, 1, formattedDate, "completed");
    }

    return { status: 'success', message: `Corte agregado exitosamente.`, vehicleId: newId, timestamp: formattedDate };
}


function handleCheckVehicle(payload) {
    const { marca, modelo, anoDesde, tipoEncendido } = payload;
    if (!marca || !modelo || !anoDesde || !tipoEncendido) {
        throw new Error("Parámetros de búsqueda incompletos.");
    }
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const data = sheet.getDataRange().getValues();
    data.shift(); // Quitar encabezados

    const paramMarca = marca.trim().toLowerCase();
    const paramModelo = modelo.trim().toLowerCase();
    const paramAnio = parseInt(anoDesde.trim(), 10);
    const paramTipoEncendido = tipoEncendido.trim().toLowerCase();

    const matches = data.filter(row => {
        if (!row[0]) return false; // Omitir filas vacías

        const sheetMarca = (row[COLS_CORTES.marca - 1] || "").toString().trim().toLowerCase();
        const sheetModelo = (row[COLS_CORTES.modelo - 1] || "").toString().trim().toLowerCase();
        const sheetVersiones = (row[COLS_CORTES.versionesAplicables - 1] || "").toString().toLowerCase();
        const sheetTipoEncendido = (row[COLS_CORTES.tipoEncendido - 1] || "").toString().trim().toLowerCase();
        const sheetAnoDesde = row[COLS_CORTES.anoDesde - 1];
        const sheetAnoHasta = row[COLS_CORTES.anoHasta - 1];

        // Búsqueda flexible (parcial) basada en claves de comparación normalizadas
        const compSheetMarca = toComparisonKey(sheetMarca, false);
        const compParamMarca = toComparisonKey(paramMarca, false);
        const marcaMatch = compSheetMarca.indexOf(compParamMarca) !== -1 || compParamMarca.indexOf(compSheetMarca) !== -1;

        const compSheetModelo = toComparisonKey(sheetModelo, false);
        const compParamModelo = toComparisonKey(paramModelo, false);
        const compSheetVersiones = toComparisonKey(sheetVersiones, true);
        const modeloMatch = compSheetModelo.indexOf(compParamModelo) !== -1 || compParamModelo.indexOf(compSheetModelo) !== -1 || compSheetVersiones.indexOf(compParamModelo) !== -1;

        // Búsqueda exacta para año y tipo de encendido
        const anioMatch = isYearInRange(paramAnio, sheetAnoDesde, sheetAnoHasta);
        const tipoEncendidoMatch = sheetTipoEncendido === paramTipoEncendido;

        return marcaMatch && modeloMatch && anioMatch && tipoEncendidoMatch;
    }).map(row => mapRowToObject(row, COLS_CORTES));

    return { status: 'success', matches: matches };
}

function handleAddSupplementaryInfo(payload) {
    getAuthenticatedCollaborator(payload);
    const lock = LockService.getScriptLock();
    try { lock.waitLock(30000); }
    catch (error) { throw new Error("No se pudo bloquear el registro de información suplementaria. Intente nuevamente."); }
    try { return handleAddSupplementaryInfoLocked(payload); }
    finally { lock.releaseLock(); }
}

function handleAddSupplementaryInfoLocked(payload) {
    getAuthenticatedCollaborator(payload);
    const { vehicleId, apertura, imgApertura, cableAlimen, imgCableAlimen, cableAlimen2, imgCableAlimen2, cableAlimen3, imgCableAlimen3, notaImportante, timestamp } = payload;
    if (!vehicleId) {
        throw new Error("El ID del vehículo es requerido para agregar información suplementaria.");
    }

    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
    const rowIndex = ids.findIndex(id => id.toString() == vehicleId.toString());

    if (rowIndex === -1) {
        throw new Error("El ID del vehículo proporcionado no fue encontrado para actualizar.");
    }
    const actualRow = rowIndex + 2;

    const rowValues = sheet.getRange(actualRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    const vehicleInfo = mapRowToObject(rowValues, COLS_CORTES);

    const folder = findOrCreateVehicleFolder(vehicleInfo);

    // Actualizar campos de texto si se proporcionaron
    if (apertura) sheet.getRange(actualRow, COLS_CORTES.apertura).setValue(apertura);
    if (cableAlimen) sheet.getRange(actualRow, COLS_CORTES.cableAlimen).setValue(cableAlimen);
    if (cableAlimen2) sheet.getRange(actualRow, COLS_CORTES.cableAlimen2).setValue(cableAlimen2);
    if (cableAlimen3) sheet.getRange(actualRow, COLS_CORTES.cableAlimen3).setValue(cableAlimen3);
    if (notaImportante) sheet.getRange(actualRow, COLS_CORTES.notaImportante).setValue(notaImportante);

    // Subir imágenes si se proporcionaron y no están ya correctamente subidas
    if (imgApertura) {
        const currentAperturaImg = rowValues[COLS_CORTES.imgApertura - 1];
        if (!checkFileIdValid(currentAperturaImg)) {
const filename = buildCanonicalImageBaseName(vehicleInfo, "imgApertura");
            const imageUrl = uploadImageToDrive(imgApertura, filename, folder, buildImageUploadOperationKey(payload.opId, vehicleId, "imgApertura"));
            sheet.getRange(actualRow, COLS_CORTES.imgApertura).setValue(imageUrl);
        }
    }
    if (imgCableAlimen) {
        const currentAlimenImg = rowValues[COLS_CORTES.imgCableAlimen - 1];
        if (!checkFileIdValid(currentAlimenImg)) {
const filename = buildCanonicalImageBaseName(vehicleInfo, "imgCableAlimen");
            const imageUrl = uploadImageToDrive(imgCableAlimen, filename, folder, buildImageUploadOperationKey(payload.opId, vehicleId, "imgCableAlimen"));
            sheet.getRange(actualRow, COLS_CORTES.imgCableAlimen).setValue(imageUrl);
        }
    }
    if (imgCableAlimen2) {
        const currentAlimenImg2 = rowValues[COLS_CORTES.imgCableAlimen2 - 1];
        if (!checkFileIdValid(currentAlimenImg2)) {
const filename = buildCanonicalImageBaseName(vehicleInfo, "imgCableAlimen2");
            const imageUrl = uploadImageToDrive(imgCableAlimen2, filename, folder, buildImageUploadOperationKey(payload.opId, vehicleId, "imgCableAlimen2"));
            sheet.getRange(actualRow, COLS_CORTES.imgCableAlimen2).setValue(imageUrl);
        }
    }
    if (imgCableAlimen3) {
        const currentAlimenImg3 = rowValues[COLS_CORTES.imgCableAlimen3 - 1];
        if (!checkFileIdValid(currentAlimenImg3)) {
const filename = buildCanonicalImageBaseName(vehicleInfo, "imgCableAlimen3");
            const imageUrl = uploadImageToDrive(imgCableAlimen3, filename, folder, buildImageUploadOperationKey(payload.opId, vehicleId, "imgCableAlimen3"));
            sheet.getRange(actualRow, COLS_CORTES.imgCableAlimen3).setValue(imageUrl);
        }
    }

    // Actualizar el timestamp al añadir información o usar el proporcionado si es registro silencioso (solo si está vacío)
    const currentTimestamp = rowValues[COLS_CORTES.timestamp - 1];
    if (!currentTimestamp) {
        const formattedDate = timestamp || Utilities.formatDate(new Date(), "GMT-6", "dd/MM/yyyy");
        sheet.getRange(actualRow, COLS_CORTES.timestamp).setValue(formattedDate);
    }

    SpreadsheetApp.flush();
    [COLS_CORTES.imgApertura, COLS_CORTES.imgCableAlimen, COLS_CORTES.imgCableAlimen2, COLS_CORTES.imgCableAlimen3]
        .forEach(column => markImageUploadLinked(sheet.getRange(actualRow, column).getValue()));

    return { status: 'success', message: 'Información suplementaria agregada exitosamente.' };
}

function handleGetSuggestion(payload) {
    const { term, field, brand } = payload;
    if (!term || !field) {
        throw new Error("El término y el campo son requeridos para obtener una sugerencia.");
    }

    let columnIndex;
    if (field.toLowerCase() === 'marca') {
        columnIndex = COLS_CORTES.marca - 1;
    } else if (field.toLowerCase() === 'modelo') {
        columnIndex = COLS_CORTES.modelo - 1;
    } else {
        throw new Error(`El campo '${field}' no es válido para sugerencias.`);
    }

    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    if (!sheet) return { status: 'success', suggestion: null };

    const data = sheet.getDataRange().getValues();
    data.shift();

    var uniqueValues = [];
    if (field.toLowerCase() === 'modelo' && brand) {
        var compBrand = toComparisonKey(brand, false);
        var rowsForBrand = data.filter(function(row) {
            var rowBrand = row[COLS_CORTES.marca - 1];
            return rowBrand && toComparisonKey(rowBrand, false) === compBrand;
        });

        uniqueValues = Array.from(new Set(rowsForBrand.map(function(row) { return row[columnIndex]; }).filter(Boolean)));

        if (uniqueValues.length === 0) {
            uniqueValues = Array.from(new Set(data.map(function(row) { return row[columnIndex]; }).filter(Boolean)));
        }
    } else {
        uniqueValues = Array.from(new Set(data.map(function(row) { return row[columnIndex]; }).filter(Boolean)));
    }

    const searchTerm = term.trim();
    const searchKey = toComparisonKey(searchTerm, false);

    // 1. Buscar coincidencia exacta por clave de comparación
    for (var i = 0; i < uniqueValues.length; i++) {
        var val = uniqueValues[i];
        if (toComparisonKey(val, false) === searchKey) {
            if (val !== searchTerm) {
                return { status: 'success', suggestion: val };
            } else {
                return { status: 'success', suggestion: null };
            }
        }
    }

    // 2. Buscar coincidencia aproximada usando Levenshtein
    let bestMatch = null;
    let minDistance = Infinity;
    const searchTermLower = searchTerm.toLowerCase();

    for (var i = 0; i < uniqueValues.length; i++) {
        var val = uniqueValues[i];
        var valLower = val.toLowerCase();
        if (valLower === searchTermLower) {
            return { status: 'success', suggestion: null };
        }

        const distance = levenshteinDistance(searchTermLower, valLower);
        if (distance < minDistance) {
            minDistance = distance;
            bestMatch = val;
        }
    }

    var maxDistance = searchTerm.length <= 3 ? 1 : 3;
    if (minDistance <= maxDistance && bestMatch.toLowerCase().indexOf(searchTermLower) === -1) {
        return { status: 'success', suggestion: bestMatch };
    }

    return { status: 'success', suggestion: null };
}


// ============================================================================
// HELPERS
// ============================================================================

function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i++) { matrix[0][i] = i; }
    for (let j = 0; j <= b.length; j++) { matrix[j][0] = j; }
    for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,      // deletion
                matrix[j - 1][i] + 1,      // insertion
                matrix[j - 1][i - 1] + cost // substitution
            );
        }
    }
    return matrix[b.length][a.length];
}
function sanitizeForFilename(text) {
    if (text === null || text === undefined) return '';
    return String(text).replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\s+/g, '_');
}


function sanitizeForNomenclature(text) {
    if (text === null || text === undefined) return "";
    return String(text).toLowerCase()
        .replace(/[\/,]/g, "_")
        .replace(/[^a-z0-9_.-]/g, "_")
        .replace(/__+/g, "_")
        .replace(/^_+|_+$/g, "");
}
function buildCanonicalImageBaseName(vehicleInfo, fieldName, extraSuffix) {
    const info = vehicleInfo || {};
    const suffixes = { imagenVehiculo: "", imgCorte1: "_corte1", imgCorte2: "_corte2", imgCorte3: "_corte3",
        imgApertura: "_apert", imgCableAlimen: "_alimen", imgCableAlimen2: "_alimen2", imgCableAlimen3: "_alimen3" };
    if (!Object.prototype.hasOwnProperty.call(suffixes, fieldName)) throw new Error("El campo de imagen no tiene una nomenclatura canónica definida.");
    const parts = [sanitizeForNomenclature(info.modelo), sanitizeForNomenclature(info.versionesAplicables),
        sanitizeForNomenclature(info.tipoEncendido), sanitizeForNomenclature(info.anoDesde || "XXXX")].filter(Boolean);
    if (!parts.length) throw new Error("No hay metadatos suficientes para construir el nombre canónico de la imagen.");
    return (parts.join("_") + suffixes[fieldName] + String(extraSuffix || "")).toLowerCase();
}


function mapRowToObject(row, colMap) {
    const obj = {};
    for (const key in colMap) {
        const colIndex = colMap[key] - 1;
        obj[key] = (colIndex < row.length) ? row[colIndex] : "";
    }
    return obj;
}

function isYearInRange(inputYear, anoDesde, anoHasta) {
    if (isNaN(inputYear)) return false;
    const desde = anoDesde ? parseInt(anoDesde, 10) : inputYear;
    const hasta = anoHasta ? parseInt(anoHasta, 10) : desde;
    return inputYear >= desde && inputYear <= hasta;
}

function getCortesRootFolder() {
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    if (String(folder.getId()) !== String(DRIVE_FOLDER_ID) || String(folder.getName() || "").trim().toLowerCase() !== "cortes") {
        throw new Error("DRIVE_FOLDER_ID no corresponde a la carpeta «Cortes».");
    }
    const driveRootId = DriveApp.getRootFolder().getId();
    const parents = folder.getParents();
    let isDirectChild = false;
    while (parents.hasNext()) if (parents.next().getId() === driveRootId) isDirectChild = true;
    if (!isDirectChild) throw new Error("La carpeta «Cortes» no está ubicada directamente en la raíz de Drive.");
    return folder;
}
function sanitizeForFolderDisplay(text) {
    if (text === null || text === undefined) return '';
    return String(text).replace(/\s+/g, ' ').replace(/__+/g, '_').trim();
}

function getFolderCanonicalName(name) {
    return String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findOrCreateSubFolder(parentFolder, desiredName) {
    if (!parentFolder) throw new Error('No se proporcionó la carpeta padre.');
    const name = sanitizeForFolderDisplay(desiredName);
    const canonical = getFolderCanonicalName(name);
    if (!canonical) throw new Error('El nombre de carpeta no es válido.');

    const matches = [];
    const folders = parentFolder.getFolders();
    while (folders.hasNext()) {
        const folder = folders.next();
        if (getFolderCanonicalName(folder.getName()) === canonical) matches.push(folder);
    }

    const exactMatches = matches.filter(folder => folder.getName() === name);
    if (exactMatches.length === 1) return exactMatches[0];
    if (exactMatches.length > 1 || matches.length > 1) {
        throw new Error('Existen varias carpetas equivalentes a «' + name + '»; no se fusionaron ni modificaron.');
    }
    if (matches.length === 1) {
        matches[0].setName(name);
        return matches[0];
    }

    try {
        return parentFolder.createFolder(name);
    } catch (error) {
        const retryMatches = [];
        const retryFolders = parentFolder.getFolders();
        while (retryFolders.hasNext()) {
            const folder = retryFolders.next();
            if (getFolderCanonicalName(folder.getName()) === canonical) retryMatches.push(folder);
        }
        if (retryMatches.length === 1) return retryMatches[0];
        throw error;
    }
}

function mergeVehicleFolderInfo(existingInfo, incomingInfo) {
    const merged = Object.assign({}, existingInfo || {});
    const incoming = incomingInfo || {};
    ['categoria', 'marca', 'modelo', 'versionesAplicables', 'tipoEncendido', 'anoDesde', 'anoHasta'].forEach(key => {
        const current = String(merged[key] === null || merged[key] === undefined ? '' : merged[key]).trim();
        const next = String(incoming[key] === null || incoming[key] === undefined ? '' : incoming[key]).trim();
        if (!current && next) merged[key] = incoming[key];
    });
    return merged;
}

function getVehicleYearFolderName(vehicleInfo) {
    const info = vehicleInfo || {};
    const rawDesde = String(info.anoDesde === null || info.anoDesde === undefined ? '' : info.anoDesde).trim();
    const rawHasta = String(info.anoHasta === null || info.anoHasta === undefined ? '' : info.anoHasta).trim();
    const inlineRange = rawDesde.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
    let desde = inlineRange ? parseInt(inlineRange[1], 10) : parseInt(rawDesde, 10);
    let hasta = inlineRange ? parseInt(inlineRange[2], 10) : parseInt(rawHasta, 10);
    if (!Number.isFinite(desde)) return 'Sin_Año';
    if (!Number.isFinite(hasta)) hasta = desde;
    const start = Math.min(desde, hasta);
    const end = Math.max(desde, hasta);
    return start === end ? String(start) : String(start) + '_' + String(end);
}

function findOrCreateVehicleFolder(vehicleInfo) {
    const info = vehicleInfo || {};
    const rootFolder = getCortesRootFolder();
    const category = sanitizeForFolderDisplay(info.categoria || 'Sin_Categoria');
    const brand = sanitizeForFolderDisplay(info.marca || 'Sin_Marca');
    const model = sanitizeForFolderDisplay(info.modelo || 'Sin_Modelo');
    const versionOrIgnition = sanitizeForFolderDisplay(
        String(info.versionesAplicables || '').trim() || String(info.tipoEncendido || '').trim() || 'Sin_Tipo_de_Encendido'
    );
    const yearRange = sanitizeForFolderDisplay(getVehicleYearFolderName(info));

    const categoryFolder = findOrCreateSubFolder(rootFolder, category);
    const brandFolder = findOrCreateSubFolder(categoryFolder, brand);
    const modelFolder = findOrCreateSubFolder(brandFolder, model);
    const versionFolder = findOrCreateSubFolder(modelFolder, versionOrIgnition);
    return findOrCreateSubFolder(versionFolder, yearRange);
}

// Compatibilidad para consumidores heredados que solo proporcionen un año.
function getOrCreateFolder(categoria, marca, modelo, anio) {
    return findOrCreateVehicleFolder({
        categoria: categoria, marca: marca, modelo: modelo,
        anoDesde: anio, anoHasta: anio
    });
}

function getOrCreateSubFolder(parentFolder, name) {
    return findOrCreateSubFolder(parentFolder, name);
}

const IMAGE_UPLOAD_LEDGER_SHEET_NAME = "ImageUploadLedger";
const IMAGE_UPLOAD_LEDGER_HEADERS = [
    "token", "operationKey", "folderId", "mimeType", "sizeBytes", "contentHash",
    "fileId", "fileUrl", "state", "referenceSheet", "referenceRow", "referenceColumns",
    "referencesJson", "fileName", "createdAt", "updatedAt", "lastError"
];
const IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

function getOrCreateImageUploadLedgerSheet_() {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(IMAGE_UPLOAD_LEDGER_SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(IMAGE_UPLOAD_LEDGER_SHEET_NAME);

    if (sheet.getLastRow() === 0 && sheet.getLastColumn() === 0) {
        sheet.getRange(1, 1, 1, IMAGE_UPLOAD_LEDGER_HEADERS.length)
            .setValues([IMAGE_UPLOAD_LEDGER_HEADERS])
            .setFontWeight("bold")
            .setBackground("#f0f4f8");
        sheet.setFrozenRows(1);
        SpreadsheetApp.flush();
    }

    if (sheet.getLastColumn() < IMAGE_UPLOAD_LEDGER_HEADERS.length) {
        throw new Error("La hoja ImageUploadLedger tiene una estructura incompleta; no se creó ningún archivo Drive.");
    }
    const headers = sheet.getRange(1, 1, 1, IMAGE_UPLOAD_LEDGER_HEADERS.length)
        .getDisplayValues()[0].map(value => String(value || "").trim());
    if (IMAGE_UPLOAD_LEDGER_HEADERS.some((header, index) => headers[index] !== header)) {
        throw new Error("La estructura de ImageUploadLedger no coincide con el contrato esperado; no se creó ningún archivo Drive.");
    }
    return sheet;
}

function findImageUploadLedgerRecord_(sheet, token) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;
    const tokens = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().flat();
    const matches = [];
    tokens.forEach((value, index) => {
        if (String(value || "").trim() === token) matches.push(index + 2);
    });
    if (matches.length > 1) {
        throw new Error("El token de carga aparece duplicado en ImageUploadLedger; se detuvo la operación por integridad.");
    }
    if (!matches.length) return null;
    return {
        rowIndex: matches[0],
        values: sheet.getRange(matches[0], 1, 1, IMAGE_UPLOAD_LEDGER_HEADERS.length).getValues()[0]
    };
}

function findImageUploadLedgerOperationKey_(sheet, operationKey) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    const values = sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues().flat();
    const matches = [];
    values.forEach((value, index) => {
        if (String(value || "").trim() === operationKey) matches.push(index + 2);
    });
    return matches.map(rowIndex => ({
        rowIndex: rowIndex,
        values: sheet.getRange(rowIndex, 1, 1, IMAGE_UPLOAD_LEDGER_HEADERS.length).getValues()[0]
    }));
}

function saveImageUploadLedgerRecord_(sheet, record) {
    if (!record || !Array.isArray(record.values) ||
        record.values.length !== IMAGE_UPLOAD_LEDGER_HEADERS.length) {
        throw new Error("No se pudo guardar ImageUploadLedger: estructura de registro inválida.");
    }
    const rowIndex = record.rowIndex || sheet.getLastRow() + 1;
    sheet.getRange(rowIndex, 1, 1, IMAGE_UPLOAD_LEDGER_HEADERS.length).setValues([record.values]);
    SpreadsheetApp.flush();

    const verified = sheet.getRange(rowIndex, 1, 1, IMAGE_UPLOAD_LEDGER_HEADERS.length).getValues()[0];
    IMAGE_UPLOAD_LEDGER_HEADERS.forEach((header, index) => {
        if (String(verified[index] === null || verified[index] === undefined ? "" : verified[index]) !==
            String(record.values[index] === null || record.values[index] === undefined ? "" : record.values[index])) {
            throw new Error("No se pudo verificar la persistencia del registro de ImageUploadLedger en la fila " + rowIndex + ".");
        }
    });
    record.rowIndex = rowIndex;
    return record;
}

function calculateImageUploadContentHash_(bytes) {
    return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)
        .map(value => ("0" + ((value + 256) % 256).toString(16)).slice(-2))
        .join("");
}

function buildImageUploadOperationKey(opId, vehicleId, fieldName) {
    const operationId = String(opId || "").trim() || "legacy";
    return operationId + "|" + String(vehicleId || "").trim() + "|" + String(fieldName || "").trim();
}

function buildImageUploadToken(operationKey, blob, folder, mimeType) {
    const prefix = Utilities.newBlob(String(operationKey || "") + "|" + folder.getId() + "|" + mimeType + "|").getBytes();
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, prefix.concat(blob.getBytes()));
    return digest.slice(0, 16).map(byte => ((byte + 256) % 256).toString(16).padStart(2, "0")).join("");
}

function parseImageUploadDescription_(description) {
    const raw = String(description || "");
    if (!raw.startsWith("GPSpediaImageUpload|")) return null;
    const metadata = {};
    raw.split("|").slice(1).forEach(part => {
        const separator = part.indexOf("=");
        if (separator < 1) return;
        const key = part.slice(0, separator);
        const value = part.slice(separator + 1);
        try { metadata[key] = decodeURIComponent(value); }
        catch (error) { metadata[key] = value; }
    });
    return metadata;
}

function buildImageUploadDescription_(record, state, referencesJson) {
    return "GPSpediaImageUpload|v=2" +
        "|operationKey=" + encodeURIComponent(String(record.operationKey || "")) +
        "|token=" + String(record.token || "") +
        "|folderId=" + String(record.folderId || "") +
        "|mimeType=" + encodeURIComponent(String(record.mimeType || "")) +
        "|sizeBytes=" + String(record.sizeBytes || "") +
        "|contentHash=" + String(record.contentHash || "") +
        "|state=" + String(state || "pending") +
        "|name=" + encodeURIComponent(String(record.fileName || "")) +
        "|references=" + encodeURIComponent(String(referencesJson || "[]"));
}

function getImageUploadFileId_(value) {
    const text = String(value || "");
    const match = text.match(/[?&]id=([a-zA-Z0-9_-]+)/) || text.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : "";
}

function verifyImageUploadFile_(file, folder, expected) {
    if (!file || file.isTrashed()) throw new Error("El archivo asociado a la carga no existe o está en la papelera.");
    const actualMime = String(file.getMimeType() || "").trim().toLowerCase();
    if (actualMime !== String(expected.mimeType || "").trim().toLowerCase()) {
        throw new Error("El archivo Drive recuperado no coincide con el MIME esperado.");
    }
    const bytes = file.getBlob().getBytes();
    if (!bytes || !bytes.length || Number(file.getSize()) !== Number(expected.sizeBytes)) {
        throw new Error("El tamaño del archivo Drive recuperado no coincide con el payload.");
    }
    const contentHash = calculateImageUploadContentHash_(bytes);
    if (contentHash !== String(expected.contentHash || "")) {
        throw new Error("El contenido del archivo Drive recuperado no coincide con el hash del payload.");
    }
    const parents = file.getParents();
    let inExpectedFolder = false;
    while (parents.hasNext()) {
        if (String(parents.next().getId()) === String(expected.folderId || folder && folder.getId())) {
            inExpectedFolder = true;
        }
    }
    if (!inExpectedFolder) throw new Error("El archivo Drive recuperado no pertenece a la carpeta esperada.");

    const expectedToken = buildImageUploadToken(expected.operationKey, file.getBlob(), folder, expected.mimeType);
    if (expectedToken !== String(expected.token || "")) {
        throw new Error("El token de operación no coincide con el contenido, la carpeta y el MIME recuperados.");
    }

    const metadata = parseImageUploadDescription_(file.getDescription());
    if (metadata) {
        if (metadata.token && metadata.token !== expected.token) throw new Error("El archivo contiene un token de otra operación.");
        if (metadata.operationKey && metadata.operationKey !== expected.operationKey) throw new Error("El archivo contiene otra operación.");
        if (metadata.folderId && metadata.folderId !== expected.folderId) throw new Error("El archivo contiene otra carpeta de destino.");
        if (metadata.mimeType && metadata.mimeType !== expected.mimeType) throw new Error("El archivo contiene otro MIME.");
        if (metadata.sizeBytes && Number(metadata.sizeBytes) !== Number(expected.sizeBytes)) throw new Error("El archivo contiene otro tamaño declarado.");
        if (metadata.contentHash && metadata.contentHash !== expected.contentHash) throw new Error("El archivo contiene otro hash declarado.");
    }
    return true;
}

function findExistingImageUpload(folder, temporaryFilename, expected, token) {
    const matches = [];
    const byName = folder.getFilesByName(temporaryFilename);
    while (byName.hasNext()) matches.push(byName.next());
    const files = folder.getFiles();
    while (files.hasNext()) {
        const file = files.next();
        const metadata = parseImageUploadDescription_(file.getDescription());
        if (metadata && metadata.token === token) matches.push(file);
    }

    const unique = new Map();
    matches.forEach(file => unique.set(file.getId(), file));
    if (unique.size > 1) {
        throw new Error("Se encontraron varios archivos para la misma operación de imagen; no se creó ni reutilizó ninguno.");
    }
    if (!unique.size) return null;

    const file = Array.from(unique.values())[0];
    verifyImageUploadFile_(file, folder, expected);
    return file;
}

function getImageUploadReferences_(fileId) {
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    if (!sheet || sheet.getLastRow() < 2) return [];
    const fields = [
        ["imagenVehiculo", COLS_CORTES.imagenVehiculo],
        ["imgCorte1", COLS_CORTES.imgCorte1],
        ["imgCorte2", COLS_CORTES.imgCorte2],
        ["imgCorte3", COLS_CORTES.imgCorte3],
        ["imgApertura", COLS_CORTES.imgApertura],
        ["imgCableAlimen", COLS_CORTES.imgCableAlimen],
        ["imgCableAlimen2", COLS_CORTES.imgCableAlimen2],
        ["imgCableAlimen3", COLS_CORTES.imgCableAlimen3]
    ].filter(item => Number(item[1]) > 0);
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    const rows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
    const references = [];
    rows.forEach((row, offset) => {
        fields.forEach(field => {
            if (getImageUploadFileId_(row[field[1] - 1]) === fileId) {
                references.push({
                    sheet: SHEET_NAMES.CORTES,
                    row: offset + 2,
                    field: field[0],
                    column: field[1],
                    url: String(row[field[1] - 1] || "")
                });
            }
        });
    });
    return references;
}

function markImageUploadLinked(imageUrl) {
    const fileId = getImageUploadFileId_(imageUrl);
    if (!fileId) return false;
    try {
        const file = DriveApp.getFileById(fileId);
        const metadata = parseImageUploadDescription_(file.getDescription());
        if (!metadata || metadata.v !== "2" || !metadata.token || !metadata.operationKey ||
            !metadata.folderId || !metadata.mimeType || !metadata.contentHash || !metadata.sizeBytes) {
            return false;
        }

        const expected = {
            token: String(metadata.token),
            operationKey: String(metadata.operationKey),
            folderId: String(metadata.folderId),
            mimeType: String(metadata.mimeType),
            sizeBytes: Number(metadata.sizeBytes),
            contentHash: String(metadata.contentHash)
        };
        const folder = DriveApp.getFolderById(expected.folderId);
        verifyImageUploadFile_(file, folder, expected);

        const ledgerSheet = getOrCreateImageUploadLedgerSheet_();
        let record = findImageUploadLedgerRecord_(ledgerSheet, expected.token);
        if (!record) {
            const timestamp = new Date().toISOString();
            record = saveImageUploadLedgerRecord_(ledgerSheet, {
                rowIndex: 0,
                values: [
                    expected.token, expected.operationKey, expected.folderId, expected.mimeType,
                    expected.sizeBytes, expected.contentHash, fileId,
                    "https://drive.google.com/uc?export=view&id=" + fileId, "pending",
                    "", "", "", "[]", metadata.name || file.getName(), timestamp, timestamp,
                    "Registro reconstruido desde metadatos Drive v2."
                ]
            });
        }

        const values = record.values;
        if (String(values[6] || "").trim() && String(values[6]).trim() !== fileId) {
            throw new Error("El token de carga ya está asociado a otro fileId en ImageUploadLedger.");
        }
        if (String(values[1]) !== expected.operationKey || String(values[2]) !== expected.folderId ||
            String(values[3]) !== expected.mimeType || Number(values[4]) !== expected.sizeBytes ||
            String(values[5]) !== expected.contentHash) {
            throw new Error("Los metadatos Drive no coinciden con ImageUploadLedger.");
        }

        const references = getImageUploadReferences_(fileId);
        if (!references.length) return false;

        values[6] = fileId;
        values[7] = "https://drive.google.com/uc?export=view&id=" + fileId;
        values[8] = "linked";
        values[9] = SHEET_NAMES.CORTES;
        values[10] = references[0].row;
        values[11] = references.map(item => item.field).join(",");
        values[12] = JSON.stringify(references);
        values[14] = values[14] || new Date().toISOString();
        values[15] = new Date().toISOString();
        values[16] = "";
        saveImageUploadLedgerRecord_(ledgerSheet, record);

        try {
            const originalName = String(values[13] || "");
            if (originalName && file.getName() !== originalName) file.setName(originalName);
            const linkedDescription = buildImageUploadDescription_({ ...expected, fileName: String(values[13] || "") }, "linked", JSON.stringify(references));
            file.setDescription(linkedDescription);
            if (String(file.getDescription() || "") !== linkedDescription) {
                Logger.log("ImageUploadLedger quedó linked, pero Drive no confirmó la descripción final para " + fileId + ".");
            }
        } catch (descriptionError) {
            Logger.log("ImageUploadLedger quedó linked; no se pudo actualizar la descripción Drive: " + descriptionError.message);
        }
        return true;
    } catch (error) {
        Logger.log("No se pudo reconciliar la carga de imagen " + fileId + ": " + error.message);
        return false;
    }
}

function uploadImageToDrive(imageData, filename, folder, operationKey) {
    if (!imageData) return "";
    if (!folder || typeof folder.getId !== "function") throw new Error("No se encontró una carpeta válida para guardar la imagen.");

    let blob;
    let mimeType = "";
    if (/^https?:\/\//i.test(String(imageData))) {
        const response = UrlFetchApp.fetch(String(imageData), { muteHttpExceptions: true });
        const responseCode = response.getResponseCode();
        if (responseCode < 200 || responseCode >= 300) throw new Error("No se pudo descargar la imagen de origen. HTTP " + responseCode + ".");
        blob = response.getBlob();
        mimeType = String(blob.getContentType() || "").split(";")[0].trim().toLowerCase();
    } else if (typeof imageData === "string" && imageData.startsWith("data:image/")) {
        const parts = imageData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/i);
        if (!parts) throw new Error("Los datos Base64 de la imagen tienen un formato inválido.");
        mimeType = String(parts[1] || "").toLowerCase();
        const decodedData = Utilities.base64Decode(parts[2]);
        if (!decodedData || !decodedData.length) throw new Error("La imagen recibida está vacía.");
        blob = Utilities.newBlob(decodedData, mimeType);
    } else {
        throw new Error("El formato de imagen recibido no es compatible.");
    }

    const bytes = blob.getBytes();
    if (!bytes || !bytes.length) throw new Error("La imagen recibida está vacía.");
    if (!mimeType.startsWith("image/")) throw new Error("El MIME recibido no corresponde a una imagen.");
    if (bytes.length > IMAGE_UPLOAD_MAX_BYTES) {
        throw new Error("La imagen supera el límite de 10 MB por archivo.");
    }

    const contentHash = calculateImageUploadContentHash_(bytes);
    let stableOperationKey = String(operationKey || "").trim();
    if (!stableOperationKey) stableOperationKey = "legacy|" + folder.getId() + "|" + String(filename || "") + "|" + contentHash;
    else if (stableOperationKey.startsWith("legacy|")) stableOperationKey += "|" + contentHash;

    const extension = getExtensionFromMimeType(mimeType);
    const originalFilename = String(filename || "imagen") + extension;
    const token = buildImageUploadToken(stableOperationKey, blob, folder, mimeType);
    const temporaryFilename = "__GPSpediaUpload_" + token + extension;
    const expected = {
        token: token, operationKey: stableOperationKey, folderId: String(folder.getId()),
        mimeType: mimeType, sizeBytes: bytes.length, contentHash: contentHash
    };

    // La reserva durable se confirma antes de crear o reutilizar un archivo Drive.
    const ledgerSheet = getOrCreateImageUploadLedgerSheet_();
    let record = findImageUploadLedgerRecord_(ledgerSheet, token);
    if (record) {
        const old = record.values;
        if (String(old[1]) !== expected.operationKey || String(old[2]) !== expected.folderId ||
            String(old[3]) !== expected.mimeType || Number(old[4]) !== expected.sizeBytes ||
            String(old[5]) !== expected.contentHash) {
            throw new Error("El token ya está registrado con otra operación, carpeta, MIME, tamaño o contenido.");
        }
        if (String(old[8]) === "requires_review") {
            throw new Error("La carga tiene estado requires_review; no se reutilizó el archivo.");
        }
    } else {
        if (!stableOperationKey.startsWith("legacy|")) {
            const previousOperations = findImageUploadLedgerOperationKey_(ledgerSheet, stableOperationKey);
            if (previousOperations.some(item => String(item.values[0]) !== token)) {
                throw new Error("El opId/campo ya está asociado a otro contenido; no se creó un segundo archivo.");
            }
        }
        const timestamp = new Date().toISOString();
        record = {
            rowIndex: 0,
            values: [
                token, stableOperationKey, expected.folderId, mimeType, bytes.length, contentHash,
                "", "", "pending", "", "", "", "[]", originalFilename, timestamp, timestamp, ""
            ]
        };
        saveImageUploadLedgerRecord_(ledgerSheet, record);
    }

    let file = null;
    if (String(record.values[6] || "").trim()) {
        try {
            file = DriveApp.getFileById(String(record.values[6]).trim());
        } catch (lookupError) {
            file = null;
        }
        if (!file) {
            file = findExistingImageUpload(folder, temporaryFilename, expected, token);
            if (!file) {
                record.values[8] = "file_missing";
                record.values[16] = "El ID registrado no está disponible y no se encontró el token en la carpeta.";
                record.values[15] = new Date().toISOString();
                saveImageUploadLedgerRecord_(ledgerSheet, record);
                throw new Error("El archivo de esta operación no está disponible; se conservó el registro para reconciliación.");
            }
        } else {
            verifyImageUploadFile_(file, folder, expected);
        }
    } else {
        file = findExistingImageUpload(folder, temporaryFilename, expected, token);
    }

    if (!file) {
        blob.setName(temporaryFilename);
        file = folder.createFile(blob);
    }
    verifyImageUploadFile_(file, folder, expected);

    const url = "https://drive.google.com/uc?export=view&id=" + file.getId();
    const finalState = String(record.values[8]) === "linked" ? "linked" : "pending";
    const existingReferences = String(record.values[12] || "[]");
    const description = buildImageUploadDescription_({
        operationKey: stableOperationKey, token: token, folderId: expected.folderId,
        mimeType: mimeType, sizeBytes: bytes.length, contentHash: contentHash,
        fileName: originalFilename
    }, finalState, existingReferences);
    file.setDescription(description);
    if (String(file.getDescription() || "") !== description) {
        throw new Error("Drive no confirmó por lectura posterior los metadatos de la carga; el registro pending se conservó.");
    }

    record.values[6] = file.getId();
    record.values[7] = url;
    if (String(record.values[8]) !== "linked") record.values[8] = "pending";
    record.values[13] = originalFilename;
    record.values[15] = new Date().toISOString();
    record.values[16] = "";
    saveImageUploadLedgerRecord_(ledgerSheet, record);
    return url;
}

function getExtensionFromMimeType(mimeType) {
    const mimeMap = {
        'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/pjpeg': '.jpg',
        'image/png': '.png', 'image/x-png': '.png', 'image/gif': '.gif',
        'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/bmp': '.bmp',
        'image/x-ms-bmp': '.bmp', 'image/tiff': '.tiff', 'image/heic': '.heic',
        'image/heif': '.heif', 'image/avif': '.avif', 'image/x-icon': '.ico',
        'image/vnd.microsoft.icon': '.ico'
    };
    const extension = mimeMap[String(mimeType || "").toLowerCase()];
    if (!extension) throw new Error("No se reconoce una extensión para el MIME de imagen: " + mimeType);
    return extension;
}

function checkFileIdValid(url) {
    if (!url || typeof url !== 'string' || url.indexOf('drive.google.com') === -1) {
        return false;
    }
    const match = url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/file\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) return false;
    const id = match[1];
    try {
        const file = DriveApp.getFileById(id);
        if (file.isTrashed()) {
            return false;
        }
        return true;
    } catch (e) {
        return false;
    }
}

// ============================================================================
// GESTIÓN DE IDEMPOTENCIA EN HOJA DEDICADA ("Idempotencia")
// ============================================================================

const IDEMPOTENCIA_HEADERS = ["opId", "vehicleId", "slotIndex", "timestamp", "status"];

/**
 * Comprueba el esquema A:E sin modificar la hoja.
 * Los encabezados vacíos son reparables; los encabezados no vacíos distintos
 * del esquema esperado hacen que la hoja sea incompatible.
 */
function isBlankIdempotenciaValue_(value) {
    return value === "" || value === null || value === undefined;
}

function getIdempotenciaHeaderState(sheet) {
    if (!sheet) return { compatible: false, missingIndexes: [], reason: "missing_sheet" };
    const maxColumns = Math.max(0, Number(sheet.getMaxColumns()) || 0);
    const lastRow = sheet.getLastRow();
    if (maxColumns < IDEMPOTENCIA_HEADERS.length && lastRow > 1) {
        return { compatible: false, missingIndexes: [], reason: "insufficient_columns_with_data" };
    }
    const availableColumns = Math.min(maxColumns, IDEMPOTENCIA_HEADERS.length);
    const headers = availableColumns
        ? sheet.getRange(1, 1, 1, availableColumns).getValues()[0]
        : [];
    const missingIndexes = [];
    let recognizedHeaders = 0;

    for (let index = 0; index < IDEMPOTENCIA_HEADERS.length; index++) {
        const header = index < availableColumns ? String(headers[index] || "").trim() : "";
        if (!header) {
            missingIndexes.push(index);
            continue;
        }
        if (header.toLowerCase() !== IDEMPOTENCIA_HEADERS[index].toLowerCase()) {
            return {
                compatible: false, missingIndexes: [], reason: "incompatible_header",
                column: index + 1, header: header
            };
        }
        recognizedHeaders++;
    }

    if (lastRow > 1) {
        for (const index of missingIndexes) {
            if (index < availableColumns) {
                const values = sheet.getRange(2, index + 1, lastRow - 1, 1).getValues();
                if (values.some(row => !isBlankIdempotenciaValue_(row[0]))) {
                    return { compatible: false, missingIndexes: [], reason: "missing_header_with_data", column: index + 1 };
                }
            }
        }
        if (recognizedHeaders === 0) {
            return { compatible: false, missingIndexes: [], reason: "no_recognized_headers_with_data" };
        }
    }

    return {
        compatible: true,
        missingIndexes: missingIndexes,
        reason: missingIndexes.length ? "missing_headers" : null
    };
}

function isUnsafeIdempotenciaHeaderState_(state) {
    return !!state && (
        state.reason === "missing_header_with_data" ||
        state.reason === "no_recognized_headers_with_data" ||
        state.reason === "insufficient_columns_with_data"
    );
}

function isIdempotenciaSheetCompatible(sheet) {
    return getIdempotenciaHeaderState(sheet).compatible;
}

function normalizeIdempotenciaOpId_(value, context) {
    const opId = String(value === null || value === undefined ? "" : value).trim();
    if (!/^OP-[A-Za-z0-9_-]{1,100}$/.test(opId)) {
        throw new Error((context || "Idempotencia") + ": opId vacío o inválido.");
    }
    return opId;
}

function normalizeIdempotenciaVehicleId_(value, context) {
    const vehicleId = String(value === null || value === undefined ? "" : value).trim();
    if (!vehicleId || vehicleId.length > 80 || /[\u0000-\u001f\u007f]/.test(vehicleId)) {
        throw new Error((context || "Idempotencia") + ": vehicleId vacío o inválido.");
    }
    return vehicleId;
}

function normalizeIdempotenciaSlotIndex_(value, context) {
    const slotIndex = String(value === null || value === undefined ? "" : value).trim();
    if (!/^[1-3]$/.test(slotIndex)) {
        throw new Error((context || "Idempotencia") + ": slotIndex debe ser 1, 2 o 3.");
    }
    return Number(slotIndex);
}

function isValidIdempotenciaTimestamp_(value) {
    if (value instanceof Date) return !Number.isNaN(value.getTime());
    if (typeof value === "number") {
        return Number.isFinite(value) && value > 0 && !Number.isNaN(new Date(value).getTime());
    }

    const raw = String(value === null || value === undefined ? "" : value).trim();
    if (!raw) return false;
    const localDate = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(raw);
    if (localDate) {
        const day = Number(localDate[1]);
        const month = Number(localDate[2]);
        const year = Number(localDate[3]);
        const hour = Number(localDate[4] || 0);
        const minute = Number(localDate[5] || 0);
        const second = Number(localDate[6] || 0);
        const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
        return parsed.getUTCFullYear() === year &&
            parsed.getUTCMonth() === month - 1 &&
            parsed.getUTCDate() === day &&
            hour <= 23 && minute <= 59 && second <= 59;
    }
    return !Number.isNaN(Date.parse(raw));
}

function normalizeIdempotenciaStatus_(value, context) {
    const status = String(value === null || value === undefined ? "" : value).trim().toLowerCase();
    if (status !== "pending" && status !== "completed") {
        throw new Error((context || "Idempotencia") + ": status debe ser pending o completed.");
    }
    return status;
}

function normalizeIdempotenciaEntry_(row, rowIndex) {
    if (row.every(isBlankIdempotenciaValue_)) return null;
    const context = "Idempotencia fila " + rowIndex;
    if (!isValidIdempotenciaTimestamp_(row[3])) {
        throw new Error(context + ": timestamp vacío o inválido.");
    }
    return {
        opId: normalizeIdempotenciaOpId_(row[0], context),
        vehicleId: normalizeIdempotenciaVehicleId_(row[1], context),
        slotIndex: normalizeIdempotenciaSlotIndex_(row[2], context),
        timestamp: row[3],
        status: normalizeIdempotenciaStatus_(row[4], context),
        rowIndex: rowIndex
    };
}

function readIdempotenciaEntries_(sheet, allowMissingHeaders) {
    if (!sheet) return { entries: [], byOpId: new Map() };
    const state = getIdempotenciaHeaderState(sheet);
    if (!state.compatible || (!allowMissingHeaders && state.missingIndexes.length)) {
        throw new Error("La hoja Idempotencia tiene encabezados o contenido incompatibles (" +
            (state.reason || "faltan encabezados") + "); no se modificó.");
    }

    const entries = [];
    const byOpId = new Map();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { entries: entries, byOpId: byOpId };

    const rows = sheet.getRange(2, 1, lastRow - 1, IDEMPOTENCIA_HEADERS.length).getValues();
    rows.forEach((row, offset) => {
        const entry = normalizeIdempotenciaEntry_(row, offset + 2);
        if (!entry) return;
        if (byOpId.has(entry.opId)) {
            const previous = byOpId.get(entry.opId);
            throw new Error("opId duplicado " + entry.opId + " en filas " + previous.rowIndex +
                " y " + entry.rowIndex + "; no se fusionaron ni eliminaron filas. Requiere reconciliación manual.");
        }
        entries.push(entry);
        byOpId.set(entry.opId, entry);
    });
    return { entries: entries, byOpId: byOpId };
}

function initializeIdempotenciaSheet(sheet) {
    if (!sheet) throw new Error("No se puede inicializar una hoja de idempotencia inexistente.");
    let state = getIdempotenciaHeaderState(sheet);
    if (!state.compatible) {
        throw new Error("La hoja «" + sheet.getName() + "» no es compatible (" + state.reason + "); se conserva sin modificar.");
    }

    // Valida todas las filas antes de reparar encabezados o ampliar la hoja.
    readIdempotenciaEntries_(sheet, true);
    const maxColumns = sheet.getMaxColumns();
    if (maxColumns < IDEMPOTENCIA_HEADERS.length) {
        sheet.insertColumnsAfter(maxColumns, IDEMPOTENCIA_HEADERS.length - maxColumns);
    }

    if (sheet.getLastRow() === 0 && sheet.getLastColumn() === 0) {
        sheet.getRange(1, 1, 1, IDEMPOTENCIA_HEADERS.length).setValues([IDEMPOTENCIA_HEADERS]);
    } else {
        state.missingIndexes.forEach(index => {
            sheet.getRange(1, index + 1).setValue(IDEMPOTENCIA_HEADERS[index]);
        });
    }

    sheet.setFrozenRows(1);
    SpreadsheetApp.flush();
    state = getIdempotenciaHeaderState(sheet);
    if (!state.compatible || state.missingIndexes.length) {
        throw new Error("No se pudo verificar la estructura A:E de la hoja «" + sheet.getName() + "».");
    }
    readIdempotenciaEntries_(sheet, false);
    return sheet;
}

function createIdempotenciaSheetIfMissing(ss, sheetName) {
    let sheet = ss.getSheetByName(sheetName);
    if (sheet) return sheet;
    try {
        return ss.insertSheet(sheetName);
    } catch (error) {
        sheet = ss.getSheetByName(sheetName);
        if (sheet) return sheet;
        throw error;
    }
}

function findOrCreateIdempotenciaSheet() {
    const ss = getSpreadsheet();
    const primary = ss.getSheetByName(SHEET_NAMES.IDEMPOTENCIA);
    const fallback = ss.getSheetByName(SHEET_NAMES.IDEMPOTENCIA_FALLBACK);

    if (primary) {
        const state = getIdempotenciaHeaderState(primary);
        if (isUnsafeIdempotenciaHeaderState_(state)) {
            throw new Error("La hoja Idempotencia tiene datos bajo un encabezado vacío o incompleto; se detuvo sin repararla ni cambiar de hoja.");
        }
        if (state.compatible) return initializeIdempotenciaSheet(primary);
    }

    if (fallback) {
        const state = getIdempotenciaHeaderState(fallback);
        if (isUnsafeIdempotenciaHeaderState_(state)) {
            throw new Error("La hoja Idempotencia_Cortes tiene datos bajo un encabezado vacío o incompleto; se detuvo sin modificarla.");
        }
        if (!state.compatible) {
            throw new Error("La hoja Idempotencia_Cortes existe, pero su estructura no es compatible; requiere revisión manual.");
        }
        return initializeIdempotenciaSheet(fallback);
    }

    if (primary) {
        throw new Error("La hoja Idempotencia principal no es compatible y no existe una hoja alternativa segura; requiere revisión manual.");
    }
    return initializeIdempotenciaSheet(createIdempotenciaSheetIfMissing(ss, SHEET_NAMES.IDEMPOTENCIA));
}

function getIdempotenciaSheet() {
    return findOrCreateIdempotenciaSheet();
}

function removeEmptyPendingCutRow(sheet, rowIndex, lastColumn) {
    try {
        if (!sheet || sheet.getLastRow() !== rowIndex) return false;
        const width = Math.max(0, lastColumn - 1);
        if (width > 0) {
            const values = sheet.getRange(rowIndex, 2, 1, width).getValues()[0];
            if (values.some(value => value !== "" && value !== null && value !== undefined)) return false;
        }
        sheet.deleteRow(rowIndex);
        return true;
    } catch (error) {
        Logger.log("No se pudo retirar la fila vacía de una operación sin reservar: " + error.message);
        return false;
    }
}

function recordOpId(opId, vehicleId, slotIndex, timestamp, status) {
    const cleanOpId = String(opId === null || opId === undefined ? "" : opId).trim();
    if (!cleanOpId) return null;
    normalizeIdempotenciaOpId_(cleanOpId, "Registro de operación");

    const cleanVehicleId = normalizeIdempotenciaVehicleId_(vehicleId, "Registro de operación");
    const cleanSlotIndex = normalizeIdempotenciaSlotIndex_(slotIndex, "Registro de operación");
    const cleanTimestamp = timestamp === null || timestamp === undefined || timestamp === ""
        ? new Date().toISOString()
        : timestamp;
    if (!isValidIdempotenciaTimestamp_(cleanTimestamp)) {
        throw new Error("Registro de operación: timestamp vacío o inválido.");
    }
    const targetStatus = normalizeIdempotenciaStatus_(status === undefined ? "completed" : status, "Registro de operación");
    const sheet = getIdempotenciaSheet();
    const existing = readIdempotenciaEntries_(sheet, false).byOpId.get(cleanOpId);

    if (existing) {
        if (existing.vehicleId !== cleanVehicleId || existing.slotIndex !== cleanSlotIndex) {
            throw new Error("El opId " + cleanOpId + " ya está asociado a otro vehicleId/slotIndex; no se modificó.");
        }
        const finalStatus = existing.status === "completed" || targetStatus === "completed" ? "completed" : "pending";
        if (existing.status !== finalStatus) sheet.getRange(existing.rowIndex, 5).setValue(finalStatus);
        SpreadsheetApp.flush();

        const verified = readIdempotenciaEntries_(sheet, false).byOpId.get(cleanOpId);
        if (!verified || verified.vehicleId !== cleanVehicleId ||
            verified.slotIndex !== cleanSlotIndex || verified.status !== finalStatus) {
            throw new Error("No se pudo verificar la actualización del opId " + cleanOpId + ".");
        }
        return verified;
    }

    sheet.appendRow([cleanOpId, cleanVehicleId, cleanSlotIndex, cleanTimestamp, targetStatus]);
    SpreadsheetApp.flush();
    const verified = readIdempotenciaEntries_(sheet, false).byOpId.get(cleanOpId);
    if (!verified || verified.vehicleId !== cleanVehicleId ||
        verified.slotIndex !== cleanSlotIndex || verified.status !== targetStatus) {
        throw new Error("No se pudo verificar el registro del opId " + cleanOpId + ".");
    }
    return verified;
}

function findUniqueCortesVehicleRow_(sheet,vehicleId,opId){if(!sheet)throw Error("No se encontró la hoja Cortes para recuperar el opId "+opId+".");const id=normalizeIdempotenciaVehicleId_(vehicleId,"Recuperación "+opId),data=sheet.getDataRange().getValues(),matches=[];for(let r=1;r<data.length;r++){const v=data[r][COLS_CORTES.id-1];if(isBlankIdempotenciaValue_(v))continue;if(normalizeIdempotenciaVehicleId_(v,"Cortes fila "+(r+1))===id)matches.push({rowIndex:r+1,rowValues:data[r]});}if(matches.length!==1)throw Error("No se puede recuperar el opId "+opId+": vehicleId "+id+" aparece en "+matches.length+" filas de Cortes; se requiere exactamente una. No se modificó.");return matches[0];}
function findUniqueCortesVehicleRow_(cortesSheet, vehicleId, opId) {
    if (!cortesSheet) throw new Error("No se encontró la hoja Cortes para recuperar el opId " + opId + ".");
    const cleanVehicleId = normalizeIdempotenciaVehicleId_(vehicleId, "Recuperación " + opId);
    const data = cortesSheet.getDataRange().getValues();
    const matches = [];

    for (let rowOffset = 1; rowOffset < data.length; rowOffset++) {
        const rawId = data[rowOffset][COLS_CORTES.id - 1];
        if (isBlankIdempotenciaValue_(rawId)) continue;
        if (normalizeIdempotenciaVehicleId_(rawId, "Cortes fila " + (rowOffset + 1)) === cleanVehicleId) {
            matches.push({ rowIndex: rowOffset + 1, rowValues: data[rowOffset] });
        }
    }
    if (matches.length !== 1) {
        throw new Error("No se puede recuperar el opId " + opId + ": vehicleId " + cleanVehicleId +
            " aparece en " + matches.length + " filas de Cortes; se requiere exactamente una. No se modificó.");
    }
    return matches[0];
}

function findUniqueCortesVehicleRow_(cortesSheet, vehicleId, opId) {
    if (!cortesSheet) throw new Error("No se encontró la hoja Cortes para recuperar el opId " + opId + ".");
    const cleanVehicleId = normalizeIdempotenciaVehicleId_(vehicleId, "Recuperación " + opId);
    const data = cortesSheet.getDataRange().getValues();
    const matches = [];
    for (let rowOffset = 1; rowOffset < data.length; rowOffset++) {
        const rawId = data[rowOffset][COLS_CORTES.id - 1];
        if (isBlankIdempotenciaValue_(rawId)) continue;
        if (normalizeIdempotenciaVehicleId_(rawId, "Cortes fila " + (rowOffset + 1)) === cleanVehicleId) {
            matches.push({ rowIndex: rowOffset + 1, rowValues: data[rowOffset] });
        }
    }
    if (matches.length !== 1) {
        throw new Error("No se puede recuperar el opId " + opId + ": vehicleId " + cleanVehicleId +
            " aparece en " + matches.length + " filas de Cortes; se requiere exactamente una. No se modificó.");
    }
    return matches[0];
}

function findRowByOpId(sheet, opId) {
    const cleanOpId = String(opId === null || opId === undefined ? "" : opId).trim();
    if (!cleanOpId) return null;
    normalizeIdempotenciaOpId_(cleanOpId, "Recuperación de operación");

    const idempotenciaSheet = getIdempotenciaSheet();
    const entry = readIdempotenciaEntries_(idempotenciaSheet, false).byOpId.get(cleanOpId);
    const cortesSheet = sheet || getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    if (!cortesSheet) throw new Error("No se encontró la hoja Cortes para recuperar " + cleanOpId + ".");

    if (entry) {
        const unique = findUniqueCortesVehicleRow_(cortesSheet, entry.vehicleId, cleanOpId);
        return {
            rowIndex: unique.rowIndex,
            rowValues: unique.rowValues,
            colIndex: COLS_CORTES["colaboradorCorte" + entry.slotIndex],
            slotIndex: entry.slotIndex,
            timestamp: entry.timestamp,
            status: entry.status,
            fromIdempotenciaSheet: true
        };
    }

    if (cortesSheet.getLastRow() <= 1) return null;
    const data = cortesSheet.getDataRange().getValues();
    const headers = data[0] || [];
    const vinColumn = headers.findIndex(header => String(header || "").trim().toLowerCase() === "vin") + 1;
    const operationColumns = [];
    headers.forEach((header, index) => {
        const normalized = String(header || "").trim().toLowerCase();
        const legacyVinColumn = vinColumn > 0 && index + 1 === vinColumn &&
            data.slice(1).some(row => /^OP-[A-Za-z0-9_-]{1,100}$/.test(String(row[index] || "").trim()));
        if (normalized.includes("idoperacion") || normalized.includes("id_operacion") || legacyVinColumn) {
            operationColumns.push(index);
        }
    });

    const directMatches = [];
    data.slice(1).forEach((row, offset) => {
        operationColumns.forEach(column => {
            if (String(row[column] || "").trim() === cleanOpId) {
                directMatches.push({ rowIndex: offset + 2, rowValues: row, colIndex: column + 1 });
            }
        });
    });

    let match = null;
    if (directMatches.length > 1) {
        throw new Error("El opId heredado " + cleanOpId +
            " aparece en varias columnas de operación de Cortes; no se eligió ni limpió ninguna coincidencia.");
    }
    if (directMatches.length === 1) {
        match = directMatches[0];
    } else {
        const taggedMatches = [];
        data.slice(1).forEach((row, offset) => {
            row.forEach((value, column) => {
                if (typeof value === "string" &&
                    (value === cleanOpId || value.includes("[" + cleanOpId + "]"))) {
                    taggedMatches.push({ rowIndex: offset + 2, rowValues: row, colIndex: column + 1 });
                }
            });
        });
        if (taggedMatches.length > 1) {
            throw new Error("El opId heredado " + cleanOpId +
                " aparece en varias celdas de Cortes; no se eligió ni limpió ninguna coincidencia.");
        }
        if (taggedMatches.length === 1) match = taggedMatches[0];
    }

    if (!match) return null;
    const vehicleId = match.rowValues[COLS_CORTES.id - 1];
    const unique = findUniqueCortesVehicleRow_(cortesSheet, vehicleId, cleanOpId);
    if (unique.rowIndex !== match.rowIndex) {
        throw new Error("La fila heredada del opId " + cleanOpId + " no coincide con la única fila de su vehicleId.");
    }
    return {
        rowIndex: unique.rowIndex,
        rowValues: unique.rowValues,
        colIndex: match.colIndex,
        slotIndex: null,
        timestamp: unique.rowValues[COLS_CORTES.timestamp - 1] || "",
        status: "completed",
        fromIdempotenciaSheet: false
    };
}

function handleCheckOperation(payload) {
    getAuthenticatedCollaborator(payload);
    const { opId } = payload || {};
    if (!opId) throw new Error("ID de operación requerido.");

    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const match = findRowByOpId(sheet, opId);
    if (!match) {
        return { status: "success", exists: false, pending: false };
    }
    if (match.status !== "completed") {
        return {
            status: "success",
            exists: false,
            pending: true,
            operationStatus: match.status
        };
    }

    const rowObj = mapRowToObject(match.rowValues, COLS_CORTES);
    return {
        status: "success",
        exists: true,
        pending: false,
        operationStatus: "completed",
        vehicleId: rowObj.id,
        timestamp: rowObj.timestamp
    };
}

// ============================================================================
// LÓGICA DE NORMALIZACIÓN Y EQUIVALENCIA
// ============================================================================

function toComparisonKey(str, isVersion) {
  if (!str) return "";
  var val = String(str).toLowerCase().trim();
  val = val.replace(/[\/\\.,_\-]/g, ' ');
  var words = val.split(/\s+/).filter(Boolean);
  if (isVersion) {
    words.sort();
  }
  return words.join(' ');
}

function normalizeForStorage(text) {
  if (!text) return "";
  var tokens = String(text).split(/([a-zA-Z0-9]+)/);
  var normalizedTokens = [];
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];
    if (/^[a-zA-Z0-9]+$/.test(token)) {
      if (token.length <= 3) {
        normalizedTokens.push(token.toUpperCase());
      } else {
        normalizedTokens.push(token.charAt(0).toUpperCase() + token.substring(1).toLowerCase());
      }
    } else {
      normalizedTokens.push(token);
    }
  }
  return normalizedTokens.join('');
}

function resolveAndNormalizeEntity(value, existingList, isVersion) {
  if (!value) return "";
  var valTrimmed = String(value).trim();
  var keyVal = toComparisonKey(valTrimmed, isVersion);

  for (var i = 0; i < existingList.length; i++) {
    var item = existingList[i];
    if (item) {
      var keyItem = toComparisonKey(item, isVersion);
      if (keyVal === keyItem) {
        return item;
      }
    }
  }

  return normalizeForStorage(valTrimmed);
}

function getExistingEntities(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { brands: [], models: [], versions: [] };
  }
  var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var brands = [];
  var models = [];
  var versions = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var brandVal = String(row[COLS_CORTES.marca - 1] || "").trim();
    var modelVal = String(row[COLS_CORTES.modelo - 1] || "").trim();
    var versionVal = String(row[COLS_CORTES.versionesAplicables - 1] || "").trim();

    if (brandVal && brands.indexOf(brandVal) === -1) brands.push(brandVal);
    if (modelVal && models.indexOf(modelVal) === -1) models.push(modelVal);
    if (versionVal && versions.indexOf(versionVal) === -1) versions.push(versionVal);
  }

  return { brands: brands, models: models, versions: versions };
}

// ============================================================================
// LÓGICA Y HANDLERS DE VIN (Vehicle Identification Number)
// ============================================================================

function parseEquipmentVersions(rawStr) {
  if (!rawStr) return [];
  return String(rawStr).split(/[,/\\;]+/).map(v => v.trim()).filter(Boolean);
}

function countEquipmentVersions(versionesStr) {
  if (!versionesStr) return 1;
  const str = String(versionesStr).trim();
  if (!str) return 1;
  const parts = str.split(/[,/\\;]+/).map(p => p.trim()).filter(Boolean);
  const count = parts.length;
  if (count <= 1) return 1;
  if (count === 2) return 2;
  return 3; // Máximo 3
}

function normalizeVinCollectionValue_(value, context) {
    if (value === null || value === undefined) return "";
    if (typeof value !== "string") throw new Error((context || "VIN") + ": cada elemento debe ser texto.");
    const normalized = value.trim().toUpperCase();
    if (!normalized || normalized.startsWith("OP-") || normalized.startsWith("OP_") || normalized.includes("IDOPERACION")) return "";
    if (!/^[A-Z0-9]{1,18}$/.test(normalized)) throw new Error((context || "VIN") + ": identificador heredado inválido «" + normalized + "».");
    return normalized;
}
function normalizeVinCollectionArray_(values, context) {
    if (!Array.isArray(values)) throw new Error((context || "VIN") + ": se esperaba una colección.");
    if (values.length > 3) throw new Error((context || "VIN") + ": la colección no puede superar tres posiciones.");
    const normalized = values.map(value => normalizeVinCollectionValue_(value, context));
    const seen = new Set();
    normalized.forEach(value => {
        if (!value) return;
        if (seen.has(value)) throw new Error((context || "VIN") + ": el VIN «" + value + "» está duplicado en la misma colección.");
        seen.add(value);
    });
    return normalized;
}
function parseVinCollection(rawVin) {
    if (rawVin === null || rawVin === undefined || rawVin === "") return [];
    if (Array.isArray(rawVin)) return normalizeVinCollectionArray_(rawVin, "Colección VIN");
    const text = String(rawVin).trim();
    if (!text) return [];
    if (text.startsWith("[") || text.endsWith("]")) {
        let parsed;
        try { parsed = JSON.parse(text); }
        catch (error) { throw new Error("La colección VIN contiene JSON mal formado; no se interpretó como texto heredado."); }
        if (!Array.isArray(parsed)) throw new Error("El formato JSON de VIN debe ser un array.");
        return normalizeVinCollectionArray_(parsed, "Colección VIN JSON");
    }
    const values = text.split(/[,/\\;]+/)
        .map(value => normalizeVinCollectionValue_(value, "Colección VIN heredada"))
        .filter(Boolean);
    if (values.length > 3) throw new Error("La colección VIN heredada supera el máximo de tres identificadores.");
    return normalizeVinCollectionArray_(values, "Colección VIN heredada");
}
function serializeVinCollection(vinArray) {
    const normalized = normalizeVinCollectionArray_(vinArray, "Serialización VIN");
    return normalized.some(Boolean) ? JSON.stringify(normalized) : "";
}
function parseVinCollectionForAdmin(rawVin) {
    return parseVinCollection(rawVin);
}

function addVinToAvailableSlot(existingCollection, vinPrefix, maxAllowed, requestedIndex) {
   const prefix = String(vinPrefix || "").trim().toUpperCase();
   const limit = Math.max(1, Math.min(3, Math.floor(Number(maxAllowed) || 1)));
   const original = Array.isArray(existingCollection) ? existingCollection.map(value => String(value || "").trim().toUpperCase()) : [];
   if (!prefix) throw new Error("El prefijo VIN está vacío.");
   if (original.slice(limit).some(Boolean)) throw new Error("La colección VIN contiene identificadores fuera del máximo permitido para las versiones registradas.");
   const collection = original.slice(0, limit);
   const duplicateIndex = collection.findIndex(value => value === prefix);
   if (duplicateIndex >= 0) return { alreadyPresent: true, duplicateIndex, slotIndex: duplicateIndex, collection };
   let slotIndex = Number.isInteger(requestedIndex) ? requestedIndex : collection.findIndex(value => !value);
   if (slotIndex < 0) slotIndex = collection.length;
   if (slotIndex >= limit || slotIndex < 0) throw new Error("Este vehículo ya alcanzó el máximo de VIN permitido según sus versiones de equipamiento.");
   if (collection[slotIndex]) throw new Error("La versión de equipamiento seleccionada ya tiene un VIN registrado. No se sobrescribió el identificador existente.");
   while (collection.length <= slotIndex) collection.push("");
   collection[slotIndex] = prefix;
   return { alreadyPresent: false, duplicateIndex: -1, slotIndex, collection };
}

/* TAREA 4 (11.1, 11.2, 11.7, B34): EXCLUSIÓN DE ÚLTIMOS 5 CARACTERES Y PROCESAMIENTO DE VIN */
function extractVinPrefix(vinStr) {
  if (!vinStr) return "";
  const cleaned = String(vinStr).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length <= 5) return "";
  return cleaned.substring(0, cleaned.length - 5);
}

function checkVinDuplicateInSheet(sheet, vinPrefix, currentVehicleId) {
  if (!vinPrefix) return null;
  const vinColumnIndex = getVinColumnIndex(sheet);
  if (!vinColumnIndex) {
    throw new Error("La hoja «Cortes» no contiene una columna «vin»; no es posible validar duplicados.");
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowId = row[COLS_CORTES.id - 1];
    if (currentVehicleId && String(rowId) === String(currentVehicleId)) continue;

    const rowVinRaw = row[vinColumnIndex - 1];
    const vinList = parseVinCollection(rowVinRaw);
    if (vinList.includes(vinPrefix)) {
      const marca = row[COLS_CORTES.marca - 1] || "";
      const modelo = row[COLS_CORTES.modelo - 1] || "";
      const anoDesde = row[COLS_CORTES.anoDesde - 1] || "";
      const anoHasta = row[COLS_CORTES.anoHasta - 1] || "";
      const modelName = `${marca} ${modelo} (${anoDesde}${anoHasta ? '-' + anoHasta : ''})`.trim();
      return {
        vehicleId: rowId,
        modelName: modelName,
        vinPrefix: vinPrefix
      };
    }
  }
  return null;
}

function handleCheckVinDuplicate(payload) {
  const { vin, currentVehicleId } = payload;
  const prefix = extractVinPrefix(vin);
  if (!prefix) {
    return { status: 'success', duplicate: false };
  }
  const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
  const match = checkVinDuplicateInSheet(sheet, prefix, currentVehicleId);
  if (match) {
    return {
      status: 'duplicate',
      duplicate: true,
      vehicleId: match.vehicleId,
      modelName: match.modelName,
      vinPrefix: match.vinPrefix
    };
  }
  return { status: 'success', duplicate: false, vinPrefix: prefix };
}

function handleAddVinToVehicle(payload) {
    const lock = LockService.getScriptLock();
    try { lock.waitLock(30000); }
    catch (error) { return { status: "error", message: "No se pudo obtener el bloqueo para registrar el VIN. Intenta nuevamente." }; }
    try { return handleAddVinToVehicleLocked(payload || {}); }
    catch (error) { return { status: "error", message: error && error.message ? error.message : "No se pudo registrar el VIN." }; }
    finally { lock.releaseLock(); }
}
function handleAddVinToVehicleLocked(payload) {
    getAuthenticatedCollaborator(payload);
    const vehicleId = String(payload.vehicleId || "").trim();
    const prefix = extractVinPrefix(payload.vin);
    if (!vehicleId || !prefix) return { status: "error", message: "ID de vehículo y VIN son requeridos." };
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const vinColumnIndex = getVinColumnIndex(sheet);
    if (!vinColumnIndex) return { status: "error", message: "La hoja «Cortes» no contiene una columna «VIN»." };
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { status: "error", message: "No se encontraron vehículos registrados." };
    const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    let targetRowIndex = -1, targetRow = null;
    for (let i = 0; i < data.length; i++) {
        if (String(data[i][COLS_CORTES.id - 1]).trim() === vehicleId) {
            targetRowIndex = i + 2; targetRow = data[i]; break;
        }
    }
    if (targetRowIndex === -1 || !targetRow) return { status: "error", message: "Vehículo no encontrado." };
    const currentVersionsStr = String(targetRow[COLS_CORTES.versionesAplicables - 1] || "").trim();
    const versions = parseEquipmentVersions(currentVersionsStr);
    if (versions.length > 3) return { status: "error", message: "El vehículo contiene más de tres versiones de equipamiento; se requiere revisar su configuración antes de agregar VIN." };
    const cleanTrim = String(payload.trimLevel || "").trim();
    if (!cleanTrim) return { status: "error", message: "Selecciona una versión de equipamiento para asociar el VIN." };
    const nextVersions = versions.slice();
    const existingTrimIndex = versions.findIndex(value => value.toLowerCase() === cleanTrim.toLowerCase());
    let targetIndex = -1;
    if (payload.isNewTrim === true) {
        if (existingTrimIndex >= 0) return { status: "error", message: "La versión de equipamiento ya existe. Selecciona la versión registrada en lugar de crearla nuevamente." };
        if (versions.length >= 3) return { status: "error", message: "Este vehículo ya alcanzó el máximo de tres versiones de equipamiento." };
        nextVersions.push(cleanTrim); targetIndex = nextVersions.length - 1;
    } else {
        if (existingTrimIndex < 0) return { status: "error", message: "La versión seleccionada ya no existe en el registro del vehículo. Actualiza el catálogo e inténtalo nuevamente." };
        targetIndex = existingTrimIndex;
    }
    const maxAllowed = Math.max(1, nextVersions.length);
    if (targetIndex < 0 || targetIndex >= maxAllowed || targetIndex > 2) return { status: "error", message: "La versión seleccionada no corresponde a una posición VIN válida." };
    const existingCollection = parseVinCollection(targetRow[vinColumnIndex - 1]);
    const sameVehicleIndex = existingCollection.findIndex(value => value === prefix);
    const modelName = [targetRow[COLS_CORTES.marca - 1] || "", targetRow[COLS_CORTES.modelo - 1] || ""].join(" ").trim() +
        " (" + String(targetRow[COLS_CORTES.anoDesde - 1] || "") +
        (targetRow[COLS_CORTES.anoHasta - 1] ? "-" + targetRow[COLS_CORTES.anoHasta - 1] : "") + ")";
    if (sameVehicleIndex >= 0) {
        if (sameVehicleIndex === targetIndex) return {
            status: "success", message: "El VIN ya está registrado para esta versión de equipamiento.",
            vinPrefix: prefix, vinCollection: existingCollection, versionesAplicables: currentVersionsStr
        };
        return { status: "duplicate", message: "El VIN ya está registrado en otra versión de este mismo vehículo.",
            vehicleId, modelName, vinPrefix: prefix, vinCollection: existingCollection };
    }
    const duplicate = checkVinDuplicateInSheet(sheet, prefix, vehicleId);
    if (duplicate) return { status: "duplicate", message: "El VIN ya está registrado para: " + duplicate.modelName,
        vehicleId: duplicate.vehicleId, modelName: duplicate.modelName, vinPrefix: prefix };
    const update = addVinToAvailableSlot(existingCollection, prefix, maxAllowed, targetIndex);
    if (update.alreadyPresent) return { status: "success", message: "El VIN ya está registrado para esta versión de equipamiento.",
        vinPrefix: prefix, vinCollection: update.collection, versionesAplicables: currentVersionsStr };
    const previousVinValue = targetRow[vinColumnIndex - 1];
    const previousVersionsValue = targetRow[COLS_CORTES.versionesAplicables - 1];
    const updatedVersionsStr = nextVersions.join(" / ");
    const serialized = serializeVinCollection(update.collection);
    try {
        if (updatedVersionsStr !== currentVersionsStr) sheet.getRange(targetRowIndex, COLS_CORTES.versionesAplicables).setValue(updatedVersionsStr);
        sheet.getRange(targetRowIndex, vinColumnIndex).setValue(serialized);
        SpreadsheetApp.flush();
        const persistedVersions = String(sheet.getRange(targetRowIndex, COLS_CORTES.versionesAplicables).getValue() || "").trim();
        const persistedCollection = parseVinCollection(sheet.getRange(targetRowIndex, vinColumnIndex).getValue());
        if (persistedVersions !== updatedVersionsStr || JSON.stringify(persistedCollection) !== JSON.stringify(update.collection)) {
            throw new Error("No se pudo verificar la persistencia de la versión de equipamiento y su VIN.");
        }
    } catch (operationError) {
        let rollbackError = null;
        try {
            sheet.getRange(targetRowIndex, COLS_CORTES.versionesAplicables).setValue(previousVersionsValue);
            sheet.getRange(targetRowIndex, vinColumnIndex).setValue(previousVinValue);
            SpreadsheetApp.flush();
        } catch (error) { rollbackError = error; }
        if (rollbackError) throw new Error("Falló el registro del VIN y también la reversión de los datos: " + operationError.message + "; " + rollbackError.message);
        throw operationError;
    }
    return { status: "success", message: "VIN registrado correctamente.", vinPrefix: prefix,
        vinCollection: update.collection, versionesAplicables: updatedVersionsStr };
}
