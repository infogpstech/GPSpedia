// ============================================================================
// GPSPEDIA-FEEDBACK SERVICE (COMPATIBLE WITH DB V2.0)
// ============================================================================
// COMPONENT VERSION: 2.3.0

// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================
const SPREADSHEET_ID = "1M6zAVch_EGKGGRXIo74Nbn_ihH1APZ7cdr2kNdWfiDs"; // <-- ACTUALIZADO A DB V2.0
let spreadsheet = null;

function getSpreadsheet() {
  if (spreadsheet === null) {
    spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return spreadsheet;
}

/**
 * Obtiene una hoja por su nombre, con manejo de fallos para singular/plural.
 */
function getSafeSheet(name) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    const altName = name.endsWith('s') ? name.slice(0, -1) : name + 's';
    sheet = ss.getSheetByName(altName);
  }
  return sheet;
}

const SHEET_NAMES = {
    CORTES: "Cortes",
    FEEDBACKS: "Feedbacks",
    CONTACTANOS: "Contactanos",
    ACTIVIDAD_USUARIO: "ActividadUsuario",
    SUGERENCIAS_ANO: "Feedbacks"
};

// Mapa de columnas para la hoja "Cortes" (v2.0)
const COLS_CORTES = {
    id: 1, categoria: 2, marca: 3, modelo: 4, versionesAplicables: 5, anoDesde: 6, anoHasta: 7, tipoEncendido: 8,
    imagenVehiculo: 9, videoGuiaDesarmeUrl: 10, contadorBusqueda: 11, tipoCorte1: 12, ubicacionCorte1: 13,
    colorCableCorte1: 14, configRelay1: 15, imgCorte1: 16, utilCorte1: 17, colaboradorCorte1: 18,
    tipoCorte2: 19, ubicacionCorte2: 20, colorCableCorte2: 21, configRelay2: 22, imgCorte2: 23,
    utilCorte2: 24, colaboradorCorte2: 25, tipoCorte3: 26, ubicacionCorte3: 27, colorCableCorte3: 28,
    configRelay3: 29, imgCorte3: 30, utilCorte3: 31, colaboradorCorte3: 32,
    apertura: 33, imgApertura: 34, cableAlimen: 35, imgCableAlimen: 36,
    timestamp: 37, notaImportante: 38
};

// Mapa de columnas para la hoja "Feedbacks" (v2.0)
const COLS_FEEDBACKS = {
    ID: 1,
    Usuario: 2,
    ID_vehiculo: 3,
    Problema: 4,
    Respuesta: 5,
    "Se resolvio": 6,
    Responde: 7,
    "Reporte de util": 8,
    anoSugerido: 9
};

const COLS_CONTACTANOS = {
    Contacto_ID: 1,
    User_ID: 2,
    Asunto: 3,
    Mensaje: 4,
    Respuesta_mensaje: 5,
    ID_usuario_responde: 6
};

const COLS_ACTIVIDAD_USUARIO = {
    id: 1,
    timestamp: 2,
    idUsuario: 3,
    nombreUsuario: 4,
    tipoActividad: 5,
    idElementoAsociado: 6,
    detalle: 7
};

// ============================================================================
// ROUTER PRINCIPAL (doGet y doPost)
// ============================================================================
function doGet(e) {
    if (e.parameter.debug === 'true') {
        const serviceState = {
            service: 'GPSpedia-Feedback',
            version: '1.2.1',
            spreadsheetId: SPREADSHEET_ID,
            sheetsAccessed: [SHEET_NAMES.CORTES, SHEET_NAMES.FEEDBACKS]
        };
        return ContentService.createTextOutput(JSON.stringify(serviceState, null, 2))
            .setMimeType(ContentService.MimeType.TEXT);
    }
    const defaultResponse = {
        status: 'success',
        message: 'GPSpedia Feedback-SERVICE v2.0 is active.'
    };
    return ContentService.createTextOutput(JSON.stringify(defaultResponse))
        .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
    let response;
    try {
        const request = JSON.parse(e.postData.contents);
        const action = request.action;
        const payload = request.payload || {};

        switch (action) {
            case 'recordLike':
                response = handleRecordLike(payload);
                break;
            case 'reportProblem':
                response = handleReportProblem(payload);
                break;
            case 'assignCollaborator':
                response = handleAssignCollaborator(payload);
                break;
            case 'suggestYear':
                response = handleSuggestYear(payload);
                break;
            case 'sendContactForm':
                response = handleSendContactForm(payload);
                break;
            // --- INBOX ACTIONS ---
            case 'getFeedbackItems':
                response = handleGetFeedbackItems(payload);
                break;
            case 'replyToFeedback':
                response = handleReplyToFeedback(payload);
                break;
            case 'markAsResolved':
                response = handleMarkAsResolved(payload);
                break;
            case 'getActivityLogs':
                response = handleGetActivityLogs(payload);
                break;
            default:
                throw new Error(`Acción desconocida en Feedback Service: ${action}`);
        }
    } catch (error) {
        response = { status: 'error', message: error.message };
    }
    return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================================
// MANEJADORES DE ACCIONES (HANDLERS)
// ============================================================================


function handleAssignCollaborator(payload) {
    const { vehicleId, corteIndex, userName } = payload;
    if (!vehicleId || !corteIndex || !userName) {
        throw new Error("Faltan datos para asignar colaborador.");
    }
    const sheet = getSafeSheet(SHEET_NAMES.CORTES);
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();

    for (let i = 0; i < data.length; i++) {
        if (data[i][0] == vehicleId) {
            const rowIndex = i + 2;
            const colName = `colaboradorCorte${corteIndex}`;
            const col = COLS_CORTES[colName];
            if (!col) throw new Error("Índice de corte inválido.");

            sheet.getRange(rowIndex, col).setValue(userName);
            return { status: 'success', message: 'Colaborador asignado.' };
        }
    }
    throw new Error("Vehículo no encontrado.");
}

function handleSuggestYear(payload) {
    const { vehicleId, newYear, response, userId, userName } = payload;
    if (!vehicleId || !newYear || !userId || !userName) {
        throw new Error("Faltan datos para sugerir año (vehicleId, newYear, userId, userName).");
    }

    const year = parseInt(newYear, 10);
    if (isNaN(year) || year < 1980 || year > 2099) {
        throw new Error("El año proporcionado no es un número válido.");
    }

    const sheet = getSafeSheet(SHEET_NAMES.SUGERENCIAS_ANO);
    if (!sheet) throw new Error(`Hoja no encontrada: ${SHEET_NAMES.SUGERENCIAS_ANO}`);

    // 1. Registrar la sugerencia (preservando fórmula de ID 'F-XXX')
    const lastRow = sheet.getLastRow();
    const FORMULA_ROW = 2; // Fila que contiene la fórmula base del ID
    const newRowNumber = lastRow + 1;
    const lastCol = Math.max(sheet.getLastColumn(), 9);

    if (newRowNumber > FORMULA_ROW) {
        const formulaRange = sheet.getRange(FORMULA_ROW, 1, 1, lastCol);
        const newRowRange = sheet.getRange(newRowNumber, 1, 1, lastCol);
        formulaRange.copyTo(newRowRange);
        // Limpiar contenido de celdas de datos (col 2 en adelante) preservando la fórmula del ID (col 1)
        if (lastCol > 1) {
            sheet.getRange(newRowNumber, 2, 1, lastCol - 1).clearContent();
        }
    }

    // Asignar valores a columnas específicas según esquema (batch write para mayor robustez)
    const values = [[
        userName,                              // Col 2: Usuario
        vehicleId,                             // Col 3: ID_vehiculo
        `Sugerencia de año: ${year}`,          // Col 4: Problema
        `La información funciona para el año ${year}`, // Col 5: Respuesta
        "",                                    // Col 6: Se resolvio
        "",                                    // Col 7: Responde
        "",                                    // Col 8: Reporte de util
        year                                   // Col 9: anoSugerido
    ]];
    sheet.getRange(newRowNumber, 2, 1, values[0].length).setValues(values);

    SpreadsheetApp.flush(); // Garantizar persistencia inmediata

    logUserActivity(userId, userName, 'suggest_year', vehicleId, `Año sugerido: ${year}. Respuesta: ${response}`);

    // Solo procesar actualización si la respuesta es positiva (Sí, Otro año o Es más antiguo)
    const isPositive = response && (response.includes('Sí') || response.includes('Otro año') || response.includes('Es más antiguo'));
    if (!isPositive) {
        return { status: 'success', message: 'Respuesta registrada.' };
    }

    // 2. Contar votos para esta combinación (ID_Vehículo + Año_Sugerido)
    const allData = sheet.getDataRange().getValues().slice(1);
    const voteCount = allData.filter(row =>
        row[COLS_FEEDBACKS.ID_vehiculo - 1] == vehicleId &&
        row[COLS_FEEDBACKS.anoSugerido - 1] == year
    ).length;

    // 3. Si no se alcanzan los 3 votos (más de 2), terminar
    if (voteCount < 3) {
        return { status: 'success', message: `Sugerencia para el año ${year} registrada. Se necesitan ${3 - voteCount} más para aplicar el cambio.` };
    }

    // 4. Si se alcanzan los 3 votos, proceder con la lógica de actualización
    const cortesSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const allCortesData = cortesSheet.getDataRange().getValues();
    const headers = allCortesData.shift();
    const vehicleRowIndex = allCortesData.findIndex(row => row[COLS_CORTES.id - 1] == vehicleId);

    if (vehicleRowIndex === -1) throw new Error("Vehículo no encontrado para actualizar.");

    const vehicleRow = allCortesData[vehicleRowIndex];
    const anoDesde = parseInt(vehicleRow[COLS_CORTES.anoDesde - 1], 10);
    const anoHasta = parseInt(vehicleRow[COLS_CORTES.anoHasta - 1] || anoDesde, 10);

    // Si el año ya está en el rango, no hacer nada
    if (year >= anoDesde && year <= anoHasta) {
        return { status: 'info', message: `El año ${year} ya está dentro del rango actual.` };
    }

    // 5. Lógica Anti-colisión
    const marca = String(vehicleRow[COLS_CORTES.marca - 1]).toLowerCase();
    const modelo = String(vehicleRow[COLS_CORTES.modelo - 1]).toLowerCase();
    const categoria = String(vehicleRow[COLS_CORTES.categoria - 1]).toLowerCase();
    const tipoEncendido = String(vehicleRow[COLS_CORTES.tipoEncendido - 1]).toLowerCase();

    const normalizeV = (v) => (v || "").toString().toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ');
    const versionNormalizada = normalizeV(vehicleRow[COLS_CORTES.versionesAplicables - 1]);

    for (const row of allCortesData) {
        if (row[COLS_CORTES.id - 1] == vehicleId) continue; // No comparar consigo mismo

        const otherMarca = String(row[COLS_CORTES.marca - 1]).toLowerCase();
        const otherModelo = String(row[COLS_CORTES.modelo - 1]).toLowerCase();
        const otherCategoria = String(row[COLS_CORTES.categoria - 1]).toLowerCase();
        const otherTipoEncendido = String(row[COLS_CORTES.tipoEncendido - 1]).toLowerCase();
        const otherVersion = normalizeV(row[COLS_CORTES.versionesAplicables - 1]);

        if (otherMarca === marca && otherModelo === modelo && otherCategoria === categoria &&
            otherTipoEncendido === tipoEncendido && otherVersion === versionNormalizada) {
            const otherAnoDesde = parseInt(row[COLS_CORTES.anoDesde - 1], 10);
            const otherAnoHasta = parseInt(row[COLS_CORTES.anoHasta - 1] || otherAnoDesde, 10);

            // Anti-colisión: El año sugerido no debe solaparse con otra generación
            // ni "saltar" sobre ella si es una generación anterior.
            if (year <= otherAnoHasta) {
                logUserActivity(userId, userName, 'suggest_year_collision', vehicleId, `Año ${year} colisiona con rango de vehículo ID ${row[COLS_CORTES.id - 1]}`);
                return { status: 'warning', message: `La sugerencia para el año ${year} no se puede aplicar porque el año ya está cubierto o es anterior a una generación registrada (${otherAnoDesde}-${otherAnoHasta}). Se requiere revisión manual.` };
            }
        }
    }

    // 6. Actualizar el rango
    let newAnoDesde = anoDesde;
    let newAnoHasta = anoHasta;
    let updated = false;

    if (year < anoDesde) {
        newAnoDesde = year;
        updated = true;
    }
    if (year > anoHasta) {
        newAnoHasta = year;
        updated = true;
    }

    if (updated) {
        cortesSheet.getRange(vehicleRowIndex + 2, COLS_CORTES.anoDesde).setValue(newAnoDesde);
        cortesSheet.getRange(vehicleRowIndex + 2, COLS_CORTES.anoHasta).setValue(newAnoHasta);
        logUserActivity(userId, userName, 'apply_year_suggestion', vehicleId, `Rango actualizado a ${newAnoDesde}-${newAnoHasta} basado en 3 votos para el año ${year}.`);

        // 7. Depuración automática: Eliminar registros de Feedback que respaldaron esta actualización
        const feedbackSheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
        if (feedbackSheet) {
          const feedbackValues = feedbackSheet.getDataRange().getValues();

        // Recorrer de abajo hacia arriba para evitar desajustes de índices al eliminar filas
        for (let i = feedbackValues.length - 1; i >= 1; i--) {
            const row = feedbackValues[i];
            const isMatch = row[COLS_FEEDBACKS.ID_vehiculo - 1] == vehicleId &&
                            row[COLS_FEEDBACKS.anoSugerido - 1] == year &&
                            String(row[COLS_FEEDBACKS.Problema - 1]).includes('Sugerencia de año');

            if (isMatch) {
                feedbackSheet.deleteRow(i + 1);
            }
        }
        }

        return { status: 'success', message: `¡Gracias! Con 3 votos confirmados, el rango de años se ha actualizado a ${newAnoDesde}-${newAnoHasta}.` };
    }

    return { status: 'info', message: 'No se realizaron cambios.' };
}

function logUserActivity(userId, userName, activityType, associatedId, details) {
    try {
        const sheet = getSafeSheet(SHEET_NAMES.ACTIVIDAD_USUARIO);
        if (!sheet) {
            Logger.log(`CRITICAL: No se encontró la hoja de actividad de usuario: ${SHEET_NAMES.ACTIVIDAD_USUARIO}`);
            return;
        }
        const lastRow = sheet.getLastRow();
        const newRowNumber = lastRow + 1;
        const lastCol = Math.max(sheet.getLastColumn(), 7);
        const FORMULA_ROW = 2;

        // 1. Copiar la fila con fórmulas para asegurar el ID correcto (F-XXX)
        if (lastRow >= FORMULA_ROW) {
            const formulaRange = sheet.getRange(FORMULA_ROW, 1, 1, lastCol);
            const newRowRange = sheet.getRange(newRowNumber, 1, 1, lastCol);
            formulaRange.copyTo(newRowRange);
            // Preservar ID (col 1), limpiar el resto
            if (lastCol > 1) {
                sheet.getRange(newRowNumber, 2, 1, lastCol - 1).clearContent();
            }
        }

        // 2. Preparar los datos que se van a escribir, EXCLUYENDO la columna de ID.
        const dataToWrite = [
            new Date().toISOString(),
            userId,
            userName,
            activityType,
            associatedId,
            details
        ];

        // 3. Obtener el rango SOLO para las celdas de datos y escribirlos.
        // Esto deja la columna 1 (ID) intacta, conservando la fórmula heredada.
        const dataRange = sheet.getRange(newRowNumber, COLS_ACTIVIDAD_USUARIO.timestamp, 1, dataToWrite.length);
        dataRange.setValues([dataToWrite]);

    } catch (e) {
        // Log error to main log sheet if activity logging fails
        Logger.log(`CRITICAL: Fallo al registrar actividad de usuario. Error: ${e.message}`);
    }
}

function handleRecordLike(payload) {
    const { vehicleId, corteIndex, userId, userName } = payload;
    if (!vehicleId || !corteIndex || !userId || !userName) {
        throw new Error("Faltan datos para registrar el 'like' (vehicleId, corteIndex, userId, userName).");
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(15000); // Wait up to 15 seconds for the lock

    try {
        const sheet = getSafeSheet(SHEET_NAMES.CORTES);
        const ids = sheet.getRange(2, COLS_CORTES.id, sheet.getLastRow() - 1, 1).getValues().flat();
        const rowIndex = ids.findIndex(id => id == vehicleId);

        if (rowIndex === -1) {
            throw new Error("No se encontró el vehículo con el ID proporcionado.");
        }

        const actualRow = rowIndex + 2;
        const utilColName = `utilCorte${corteIndex}`;
        const utilCol = COLS_CORTES[utilColName];

        if (!utilCol) {
            throw new Error(`Índice de corte inválido: ${corteIndex}`);
        }

        const cell = sheet.getRange(actualRow, utilCol);
        let currentValue = cell.getValue();
        if (typeof currentValue !== 'number' || isNaN(currentValue)) {
            currentValue = 0;
        }

        cell.setValue(currentValue + 1);

        logUserActivity(userId, userName, 'like', vehicleId, `Like en corte ${corteIndex}. Nuevo total: ${currentValue + 1}`);

        return { status: 'success', message: 'Like registrado correctamente.' };
    } finally {
        lock.releaseLock();
    }
}

function handleReportProblem(payload) {
    const { vehicleId, problemText, userId, userName } = payload;
    if (!vehicleId || !problemText || !userId || !userName) {
        throw new Error("Faltan datos para reportar el problema (vehicleId, problemText, userId, userName).");
    }

    const sheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
    const lastRow = sheet.getLastRow();
    const newRowNumber = lastRow + 1;
    const FORMULA_ROW = 2;
    const lastCol = sheet.getLastColumn() || 8;

    if (lastRow >= FORMULA_ROW) {
        const formulaRange = sheet.getRange(FORMULA_ROW, 1, 1, lastCol);
        const newRowRange = sheet.getRange(newRowNumber, 1, 1, lastCol);
        formulaRange.copyTo(newRowRange);
        if (lastCol > 1) {
            sheet.getRange(newRowNumber, 2, 1, lastCol - 1).clearContent();
        }
    }

    const values = [[
        userName,
        vehicleId,
        problemText
    ]];
    sheet.getRange(newRowNumber, COLS_FEEDBACKS.Usuario, 1, values[0].length).setValues(values);

    SpreadsheetApp.flush();

    logUserActivity(userId, userName, 'report_problem', vehicleId, problemText);
    return { status: 'success', message: 'Problema reportado.' };
}

function handleSendContactForm(payload) {
    const { name, email, message, userId } = payload;
    if (!name || !email || !message) {
        throw new Error("Faltan datos para enviar el formulario de contacto (name, email, message).");
    }

    const sheet = getSafeSheet(SHEET_NAMES.CONTACTANOS);
    const lastRow = sheet.getLastRow();
    const newRowNumber = lastRow + 1;
    const FORMULA_ROW = 2;
    const lastCol = sheet.getLastColumn() || 6;

    if (lastRow >= FORMULA_ROW) {
        const formulaRange = sheet.getRange(FORMULA_ROW, 1, 1, lastCol);
        const newRowRange = sheet.getRange(newRowNumber, 1, 1, lastCol);
        formulaRange.copyTo(newRowRange);
        if (lastCol > 1) {
            sheet.getRange(newRowNumber, 2, 1, lastCol - 1).clearContent();
        }
    }

    const values = [[
        userId || 'N/A',
        `Contacto de ${name}`,
        `De: ${email}\n\n${message}`
    ]];
    sheet.getRange(newRowNumber, COLS_CONTACTANOS.User_ID, 1, values[0].length).setValues(values);

    SpreadsheetApp.flush();

    return { status: 'success', message: 'Formulario de contacto enviado.' };
}

// ============================================================================
// HANDLERS FOR INBOX SYSTEM
// ============================================================================

function handleGetFeedbackItems(payload) {
    const feedbackSheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
    const contactSheet = getSafeSheet(SHEET_NAMES.CONTACTANOS);

    const feedbackData = (!feedbackSheet) ? [] : feedbackSheet.getDataRange().getValues().slice(1).map(row => ({
        type: 'problem_report',
        id: row[COLS_FEEDBACKS.ID - 1],
        subject: `Reporte en Vehículo #${row[COLS_FEEDBACKS.ID_vehiculo - 1]}`,
        content: row[COLS_FEEDBACKS.Problema - 1],
        user: row[COLS_FEEDBACKS.Usuario - 1],
        vehicleId: row[COLS_FEEDBACKS.ID_vehiculo - 1],
        reply: row[COLS_FEEDBACKS.Respuesta - 1],
        isResolved: row[COLS_FEEDBACKS['Se resolvio'] - 1] === true,
        responder: row[COLS_FEEDBACKS.Responde - 1]
    }));

    const contactData = (!contactSheet) ? [] : contactSheet.getDataRange().getValues().slice(1).map(row => ({
        type: 'contact_form',
        id: row[COLS_CONTACTANOS.Contacto_ID - 1],
        subject: row[COLS_CONTACTANOS.Asunto - 1],
        content: row[COLS_CONTACTANOS.Mensaje - 1],
        user: 'Formulario de Contacto',
        vehicleId: null,
        reply: row[COLS_CONTACTANOS.Respuesta_mensaje - 1],
        isResolved: null,
        responder: row[COLS_CONTACTANOS.ID_usuario_responde - 1]
    }));

    const unifiedData = [...feedbackData, ...contactData];
    return { status: 'success', data: unifiedData };
}

function handleReplyToFeedback(payload) {
    const { itemId, itemType, replyText, responderName } = payload;
    if (!itemId || !itemType || !replyText || !responderName) {
        throw new Error("Datos insuficientes para enviar la respuesta.");
    }

    if (itemType === 'problem_report') {
        const sheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
        const ids = sheet.getRange(2, COLS_FEEDBACKS.ID, sheet.getLastRow() -1, 1).getValues().flat();
        const rowIndex = ids.findIndex(id => id == itemId);
        if (rowIndex !== -1) {
            sheet.getRange(rowIndex + 2, COLS_FEEDBACKS.Respuesta).setValue(replyText);
            sheet.getRange(rowIndex + 2, COLS_FEEDBACKS.Responde).setValue(responderName);
        } else {
            throw new Error("No se encontró el reporte de problema.");
        }
    } else if (itemType === 'contact_form') {
        const sheet = getSafeSheet(SHEET_NAMES.CONTACTANOS);
        const ids = sheet.getRange(2, COLS_CONTACTANOS.Contacto_ID, sheet.getLastRow() - 1, 1).getValues().flat();
        const rowIndex = ids.findIndex(id => id == itemId);
        if (rowIndex !== -1) {
            sheet.getRange(rowIndex + 2, COLS_CONTACTANOS.Respuesta_mensaje).setValue(replyText);
            sheet.getRange(rowIndex + 2, COLS_CONTACTANOS.ID_usuario_responde).setValue(responderName);
        } else {
            throw new Error("No se encontró el mensaje de contacto.");
        }
    }

    return { status: 'success', message: 'Respuesta enviada.' };
}

function handleMarkAsResolved(payload) {
    const { itemId } = payload;
    if (!itemId) throw new Error("ID del item es requerido.");

    const sheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
    const ids = sheet.getRange(2, COLS_FEEDBACKS.ID, sheet.getLastRow() - 1, 1).getValues().flat();
    const rowIndex = ids.findIndex(id => id == itemId);

    if (rowIndex !== -1) {
        sheet.getRange(rowIndex + 2, COLS_FEEDBACKS['Se resolvio']).setValue(true);
    } else {
        throw new Error("No se encontró el reporte de problema para marcar como resuelto.");
    }

    return { status: 'success', message: 'Reporte marcado como resuelto.' };
}

function handleGetActivityLogs(payload) {
    const sheet = getSafeSheet(SHEET_NAMES.ACTIVIDAD_USUARIO);
    if (!sheet) return { status: 'success', data: [] };

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { status: 'success', data: [] };

    data.shift(); // Remove headers

    // Reverse and take last 100 logs
    const logs = data.map(row => ({
        id: row[COLS_ACTIVIDAD_USUARIO.id - 1],
        timestamp: row[COLS_ACTIVIDAD_USUARIO.timestamp - 1],
        idUsuario: row[COLS_ACTIVIDAD_USUARIO.idUsuario - 1],
        nombreUsuario: row[COLS_ACTIVIDAD_USUARIO.nombreUsuario - 1],
        tipoActividad: row[COLS_ACTIVIDAD_USUARIO.tipoActividad - 1],
        idElementoAsociado: row[COLS_ACTIVIDAD_USUARIO.idElementoAsociado - 1],
        detalle: row[COLS_ACTIVIDAD_USUARIO.detalle - 1]
    })).reverse().slice(0, 100);

    return { status: 'success', data: logs };
}
