// ============================================================================
// GPSPEDIA-FEEDBACK SERVICE (COMPATIBLE WITH DB V2.0)
// ============================================================================
// COMPONENT VERSION: 2.3.0

// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================
const SPREADSHEET_ID = "1_BDp256L6fxmZdyCek9m4A-a_-TjeKJOt3fteXYt3Os"; // <-- ACTUALIZADO A DB V2.0
const DRIVE_FOLDER_ID = "1-8QqhS-wtEFFwyBG8CmnEOp5i8rxSM-2";
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


/** El dispatcher adjunta el actor validado localmente desde Users/ActiveSessions. */
function normalizeFeedbackRole(role) {
    const normalized = Array.from(String(role || "").normalize("NFD"))
        .filter(character => { const code = character.charCodeAt(0); return code < 768 || code > 879; }).join("");
    const roleName = normalized.trim().toLowerCase();
    return roleName;
}

function getFeedbackActor_(payload,allowedRoles) {
    return payload && payload.__feedbackActor ? payload.__feedbackActor : assertFeedbackSession(payload,allowedRoles);
}

function assertFeedbackSession(payload, allowedRoles) {
 const trusted = payload && payload.__sharedSessionActor;
 if (!trusted || typeof trusted.userId !== "string" || typeof trusted.role !== "string" || !Number.isSafeInteger(trusted.epoch) || trusted.epoch < 1) throw new Error("Acceso denegado: falta el contexto de sesión compartido.");
 const id = trusted.userId.trim(), requested = String(payload.userId || id).trim(), normalized = normalizeFeedbackRole(trusted.role);
 const displayRoles = {desarrollador:"Desarrollador",jefe:"Jefe",supervisor:"Supervisor",tecnico:"Tecnico",tecnico_exterior:"Tecnico_exterior"};
 if (!id || requested !== id || !displayRoles[normalized]) throw new Error("Acceso denegado: sesión no autorizada.");
 if (Array.isArray(allowedRoles) && !allowedRoles.some(role => normalizeFeedbackRole(role) === normalized)) throw new Error("Acceso denegado: sesión no autorizada.");
 return {userId:id,role:displayRoles[normalized],userName:String(trusted.fullName || "").trim() || "Usuario",epoch:trusted.epoch};
}

/** Identidad de aportantes de validación de año; el identificador anónimo es seudónimo, no identidad civil. */
function createAnonymousSuggestionActorKey() {
    // El identificador del navegador no acredita una persona.
    return "anon:unverified";
}

function resolveSuggestionYearActor(payload) {
    const requestedUserId = String(payload && payload.userId !== undefined ? payload.userId : "").trim();
    if (requestedUserId === "0") {
        return { userId: "0", userName: "Anónimo", userRole: "Anónimo", suggestionActorKey: createAnonymousSuggestionActorKey() };
    }
    const actor = assertFeedbackSession(payload, null);
    return { userId: actor.userId, userName: actor.userName, userRole: actor.role, suggestionActorKey: "user:" + actor.userId };
}

function ensureSuggestionActorColumn(sheet) {
    const expectedHeaders = [
        "ID", "Usuario", "ID_vehiculo", "Problema", "Respuesta",
        "Se resolvio", "Responde", "Reporte de util", "anoSugerido"
    ];
    const maxColumns = sheet.getMaxColumns();
    if (maxColumns < expectedHeaders.length) {
        sheet.insertColumnsAfter(maxColumns, expectedHeaders.length - maxColumns);
    }
    const baseHeaders = sheet.getRange(1, 1, 1, expectedHeaders.length).getValues()[0];
    expectedHeaders.forEach((expected, index) => {
        if (String(baseHeaders[index] || "").trim() !== expected) {
            throw new Error("El esquema de Feedbacks no coincide con el esperado; no se modificó la hoja.");
        }
    });
    const headerWidth = Math.max(sheet.getLastColumn(), expectedHeaders.length);
    const headers = sheet.getRange(1, 1, 1, headerWidth).getValues()[0];
    const actorPositions = [];
    headers.forEach((header, index) => {
        if (String(header || "").trim() === "suggestionActorKey") actorPositions.push(index + 1);
    });
    if (actorPositions.length > 1 || (actorPositions.length === 1 && actorPositions[0] <= expectedHeaders.length)) {
        throw new Error("La columna suggestionActorKey existe en una posición duplicada o incompatible.");
    }
    if (actorPositions.length === 1) return actorPositions[0];

    const newColumn = headerWidth + 1;
    if (sheet.getMaxColumns() < newColumn) {
        sheet.insertColumnsAfter(sheet.getMaxColumns(), newColumn - sheet.getMaxColumns());
    }
    const occupiedHeader = sheet.getRange(1, newColumn).getValue();
    if (occupiedHeader !== "" && occupiedHeader !== null) {
        throw new Error("No se puede añadir suggestionActorKey sin sobrescribir un encabezado existente.");
    }
    sheet.getRange(1, newColumn).setValue("suggestionActorKey");
    SpreadsheetApp.flush();
    return newColumn;
}

function getReportMetadataColumn(sheet) {
    const maxColumns = sheet.getMaxColumns();
    if (maxColumns < 10) return 0;
    const headerWidth = Math.min(Math.max(sheet.getLastColumn(), 9), maxColumns);
    const headers = sheet.getRange(1, 1, 1, headerWidth).getValues()[0];
    const positions = [];
    headers.forEach((header, index) => {
        if (String(header || "").trim() === "reportMetadata") positions.push(index + 1);
    });
    if (positions.length > 1 || (positions.length === 1 && positions[0] <= 9)) {
        throw new Error("La columna reportMetadata existe en una posición duplicada o incompatible.");
    }
    return positions.length ? positions[0] : 0;
}

function ensureReportMetadataColumn(sheet) {
    const expectedHeaders = [
        "ID", "Usuario", "ID_vehiculo", "Problema", "Respuesta",
        "Se resolvio", "Responde", "Reporte de util", "anoSugerido"
    ];
    const maxColumns = sheet.getMaxColumns();
    if (maxColumns < expectedHeaders.length) {
        sheet.insertColumnsAfter(maxColumns, expectedHeaders.length - maxColumns);
    }
    const baseHeaders = sheet.getRange(1, 1, 1, expectedHeaders.length).getValues()[0];
    expectedHeaders.forEach((expected, index) => {
        if (String(baseHeaders[index] || "").trim() !== expected) {
            throw new Error("El esquema de Feedbacks no coincide con el esperado; no se modificó la hoja.");
        }
    });

    const existingColumn = getReportMetadataColumn(sheet);
    if (existingColumn) return existingColumn;

    const headerWidth = Math.max(sheet.getLastColumn(), expectedHeaders.length);
    const newColumn = headerWidth + 1;
    if (sheet.getMaxColumns() < newColumn) {
        sheet.insertColumnsAfter(sheet.getMaxColumns(), newColumn - sheet.getMaxColumns());
    }
    const occupiedHeader = sheet.getRange(1, newColumn).getValue();
    if (occupiedHeader !== "" && occupiedHeader !== null) {
        throw new Error("No se puede añadir reportMetadata sin sobrescribir un encabezado existente.");
    }
    sheet.getRange(1, newColumn).setValue("reportMetadata");
    SpreadsheetApp.flush();
    return newColumn;
}

function normalizeReportImageMetadata_(source) {
    if (!source || typeof source !== "object" || Array.isArray(source)) return null;
    const imageFileId = String(source.imageFileId || "").trim(), imageUrl = String(source.imageUrl || "").trim();
    const imageName = String(source.imageName || "").trim(), imageMimeType = String(source.imageMimeType || "").trim().toLowerCase();
    const imageSize = Number(source.imageSize), imageSha256 = String(source.imageSha256 || "").trim().toLowerCase();
    const expectedUrl = imageFileId ? "https://drive.google.com/file/d/" + imageFileId + "/view" : "";
    if (!/^[A-Za-z0-9_-]{10,}$/.test(imageFileId) || imageUrl !== expectedUrl ||
        !["image/jpeg","image/png","image/webp"].includes(imageMimeType) || !imageName || imageName.length > 120 ||
        !Number.isInteger(imageSize) || imageSize < 1 || imageSize > 3 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(imageSha256)) return null;
    return { imageFileId, imageUrl, imageName, imageMimeType, imageSize, imageSha256 };
}
function parseReportMetadata(rawValue, rowVehicleId) {
    if (typeof rawValue !== "string" || !rawValue.trim()) return null;
    try {
        const parsed = JSON.parse(rawValue);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
        const reportId = String(parsed.reportId || "").trim(), vehicleId = String(parsed.vehicleId || "").trim();
        const corteIndex = Number(parsed.corteIndex);
        if (!/^REP-[A-Za-z0-9_-]{1,80}$/.test(reportId) || !vehicleId ||
            vehicleId !== String(rowVehicleId || "").trim() || !Number.isInteger(corteIndex) ||
            corteIndex < 1 || corteIndex > 3 || typeof parsed.activaTestigoMotor !== "boolean") return null;
        const validCategories = new Set(["incidencia_tecnica","instalacion","acceso","contenido","otro"]);
        const categoryRaw = String(parsed.category || "incidencia_tecnica").trim().toLowerCase();
        const category = validCategories.has(categoryRaw) ? categoryRaw : "incidencia_tecnica";
        const defaultSubject = "Reporte técnico de vehículo " + vehicleId + " — Corte #" + String(corteIndex);
        const subjectRaw = String(parsed.subject || "").replace(/\s+/g," ").trim();
        const subject = subjectRaw && subjectRaw.length <= 200 ? subjectRaw : defaultSubject;
        const metadata = { reportId, vehicleId, corteIndex, activaTestigoMotor: parsed.activaTestigoMotor, category, subject };
        const imageMetadata = normalizeReportImageMetadata_(parsed);
        if (imageMetadata) Object.assign(metadata, imageMetadata);
        return metadata;
    } catch (error) { return null; }
}

function isPositiveYearSuggestionRow(row) {
    const problem = String(row[COLS_FEEDBACKS.Problema - 1] || "");
    const answer = String(row[COLS_FEEDBACKS.Respuesta - 1] || "");
    if (problem.includes("Sugerencia de ampliar rango") ||
        problem.includes("Confirmación de funcionamiento")) return true;
    return problem.includes("Modelo sin generaciones recientes") &&
        answer.includes("confirmó que se trata de una generación más reciente");
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
    timestamp: 37, notaImportante: 38,
    cableAlimen2: 39, imgCableAlimen2: 40, cableAlimen3: 41, imgCableAlimen3: 42
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

const IDENTIFIER_SEQUENCE_CONFIG_SHEET = "__IdentifierSequenceConfig__";
const IDENTIFIER_SEQUENCE_CONFIG_HEADERS = ["sheet","column","header","prefix","padding","formula","updatedAt"];
const IDENTIFIER_SEQUENCE_RESERVATIONS_SHEET = "__IdentifierSequenceReservations__";
const IDENTIFIER_SEQUENCE_RESERVATIONS_HEADERS = ["reservationId","sheet","column","reservedSuffix","baseSuffix","createdAt"];

function parseFeedbackIdFormula_(formula) {
    const raw = String(formula || "").trim();
    const match = /^=\s*"([^"]{1,40})"\s*&\s*(?:TEXTO|TEXT)\s*\(\s*(?:FILA|ROW)\s*\(\s*\)\s*-\s*\d+\s*,\s*"([0]+)"\s*\)\s*$/i.exec(raw);
    return match ? { prefix: match[1], padding: match[2].length, formula: raw } : null;
}

function getFormulaBasedIdPattern_(sheet, idColumn) {
    const header = String(sheet.getRange(1, idColumn).getValue() || "").trim().toLowerCase().replace(/\\s+/g, "_");
    if (!/^(?:id|id_[a-z0-9_]+|id_de_[a-z0-9_]+|[a-z0-9_]+_id|identificador|identifier|codigo|codigo_id|code)$/.test(header)) {
        throw new Error("La columna seleccionada no tiene un encabezado ID reconocido en " + sheet.getName() + ".");
    }
    if (sheet.getName() === "pys" && idColumn === 1 && header === "id_problem") {
        return { prefix: "isue-", padding: 3, formula: '="isue-"&TEXT(ROW()-1,"000")' };
    }
    const ss = getSpreadsheet(), configSheet = ss.getSheetByName(IDENTIFIER_SEQUENCE_CONFIG_SHEET);
    if (configSheet && configSheet.getLastRow() > 1) {
        const headers = configSheet.getRange(1, 1, 1, IDENTIFIER_SEQUENCE_CONFIG_HEADERS.length).getValues()[0].map(value => String(value || ""));
        if (JSON.stringify(headers) !== JSON.stringify(IDENTIFIER_SEQUENCE_CONFIG_HEADERS)) {
            throw new Error("La configuración central de secuencias ID tiene un esquema incompatible.");
        }
        const rows = configSheet.getRange(2, 1, configSheet.getLastRow() - 1, IDENTIFIER_SEQUENCE_CONFIG_HEADERS.length).getValues();
        const matches = rows.filter(row => String(row[0]) === sheet.getName() && Number(row[1]) === idColumn);
        if (matches.length > 1) throw new Error("La configuración de ID está duplicada para " + sheet.getName() + " columna " + idColumn + ".");
        if (matches.length === 1) {
            const pattern = { prefix: String(matches[0][3] || ""), padding: Number(matches[0][4]), formula: String(matches[0][5] || "") };
            const currentHeader = String(sheet.getRange(1, idColumn).getValue() || "").trim();
            if (!pattern.prefix || !Number.isInteger(pattern.padding) || pattern.padding < 1 || pattern.padding > 20 ||
                currentHeader !== String(matches[0][2] || "")) {
                throw new Error("La configuración de secuencia ID no coincide con la columna actual de " + sheet.getName() + ".");
            }
            const currentLastRow = sheet.getLastRow();
            if (currentLastRow > 1) {
                const currentFormulas = sheet.getRange(2, idColumn, currentLastRow - 1, 1).getFormulas().flat().filter(Boolean);
                if (currentFormulas.some(formula => formula !== pattern.formula)) {
                    throw new Error("La columna ID de " + sheet.getName() + " contiene una fórmula distinta de la configuración backend.");
                }
            }
            return pattern;
        }
    }
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error("No existe una fórmula ni configuración previa para generar IDs en " + sheet.getName() + ".");
    const formulas = sheet.getRange(2, idColumn, lastRow - 1, 1).getFormulas().flat().filter(Boolean);
    if (!formulas.length) throw new Error("No se ha confirmado el patrón backend de ID para " + sheet.getName() + ". La operación se detuvo sin insertar el registro.");
    const patterns = formulas.map(parseFeedbackIdFormula_);
    if (patterns.some(pattern => !pattern)) throw new Error("La fórmula ID de " + sheet.getName() + " no tiene un patrón secuencial compatible; se requiere revisión.");
    const first = patterns[0];
    if (patterns.some(pattern => pattern.prefix !== first.prefix || pattern.padding !== first.padding || pattern.formula !== first.formula)) {
        throw new Error("La columna ID de " + sheet.getName() + " contiene fórmulas con patrones diferentes; se requiere revisión.");
    }
    return first;
}

function copyRowPresentationOnly_(sheet, sourceRow, targetRow, lastColumn) {
    if (!sheet || sourceRow < 1 || targetRow < 2 || lastColumn < 1) return;
    const source = sheet.getRange(sourceRow, 1, 1, lastColumn);
    const target = sheet.getRange(targetRow, 1, 1, lastColumn);
    source.copyTo(target, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    source.copyTo(target, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
}

function getIdentifierSequenceReservationsSheet_() {
    const spreadsheet = getSpreadsheet();
    let sheet = spreadsheet.getSheetByName(IDENTIFIER_SEQUENCE_RESERVATIONS_SHEET);
    if (!sheet) {
        try { sheet = spreadsheet.insertSheet(IDENTIFIER_SEQUENCE_RESERVATIONS_SHEET); }
        catch (createError) { sheet = spreadsheet.getSheetByName(IDENTIFIER_SEQUENCE_RESERVATIONS_SHEET); if (!sheet) throw createError; }
    }
    if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, IDENTIFIER_SEQUENCE_RESERVATIONS_HEADERS.length)
        .setValues([IDENTIFIER_SEQUENCE_RESERVATIONS_HEADERS]);
    const actual = sheet.getRange(1, 1, 1, IDENTIFIER_SEQUENCE_RESERVATIONS_HEADERS.length)
        .getValues()[0].map(value => String(value || "").trim());
    if (IDENTIFIER_SEQUENCE_RESERVATIONS_HEADERS.some((header, index) => actual[index] !== header)) {
        throw new Error("El esquema de reservas de secuencia ID es incompatible.");
    }
    return sheet;
}

function getNextFormulaBasedId_(sheet, idColumn, minimumSuffix) {
    if (!sheet || !Number.isInteger(idColumn) || idColumn < 1) throw new Error("Hoja o columna ID inválida.");
    const pattern = getFormulaBasedIdPattern_(sheet, idColumn);
    const lastRow = sheet.getLastRow();
    const idValues = lastRow > 1
        ? sheet.getRange(2, idColumn, lastRow - 1, 1).getValues().map(row => row[0])
        : [];
    const seen = new Set();
    const blankOffsets = [];
    let maxSuffix = 0;
    idValues.forEach((rawId, index) => {
        const id = String(rawId === null || rawId === undefined ? "" : rawId).trim();
        if (!id) { blankOffsets.push(index); return; }
        if (!id.startsWith(pattern.prefix)) throw new Error("El ID de " + sheet.getName() + " fila " + (index + 2) + " no coincide con el prefijo configurado.");
        const suffix = id.slice(pattern.prefix.length);
        if (!/^\d+$/.test(suffix)) throw new Error("El ID de " + sheet.getName() + " fila " + (index + 2) + " no conserva el sufijo numérico configurado.");
        const normalized = id.toLowerCase();
        if (seen.has(normalized)) throw new Error("Se detectó el ID duplicado " + id + " en " + sheet.getName() + "; no se asignó otro ID.");
        seen.add(normalized);
        const numeric = Number(suffix);
        if (!Number.isSafeInteger(numeric) || numeric < 1) throw new Error("El sufijo ID de " + sheet.getName() + " no es un entero seguro.");
        maxSuffix = Math.max(maxSuffix, numeric);
    });
    if (blankOffsets.length) {
        const lastColumn = Math.max(sheet.getLastColumn(), idColumn);
        let runStart = blankOffsets[0], previousOffset = blankOffsets[0];
        const validateBlankRun = (firstOffset, lastOffset) => {
            const firstRow = firstOffset + 2;
            const rows = sheet.getRange(firstRow, 1, lastOffset - firstOffset + 1, lastColumn).getValues();
            rows.forEach((row, index) => {
                const hasRecordData = row.some((value, columnIndex) =>
                    columnIndex !== idColumn - 1 && value !== "" && value !== null && value !== undefined
                );
                if (hasRecordData) throw new Error("La fila " + (firstRow + index) + " de " + sheet.getName() + " contiene datos, pero no tiene ID.");
            });
        };
        for (let i = 1; i < blankOffsets.length; i++) {
            const offset = blankOffsets[i];
            if (offset === previousOffset + 1) { previousOffset = offset; continue; }
            validateBlankRun(runStart, previousOffset);
            runStart = previousOffset = offset;
        }
        validateBlankRun(runStart, previousOffset);
    }

    // appendRow asigna una posición física única. La fórmula de la reserva calcula
    // su secuencia contando únicamente reservas anteriores de la misma hoja/columna.
    const ledger = getIdentifierSequenceReservationsSheet_();
    const ledgerLastRow = ledger.getLastRow();
    let previousReservations = [];
    if (ledgerLastRow > 1) {
        const matches = ledger.getRange(2, 2, ledgerLastRow - 1, 1)
            .createTextFinder(sheet.getName()).matchCase(true).matchEntireCell(true).findAll();
        previousReservations = matches.map(match => {
            const rowIndex = match.getRow();
            const values = ledger.getRange(rowIndex, 2, 1, 5).getValues()[0];
            return { rowIndex, column: Number(values[1]), reservedSuffix: Number(values[2]), baseSuffix: Number(values[3]) };
        }).filter(item => item.column === idColumn).sort((a, b) => a.rowIndex - b.rowIndex);
    }
    const requestedMinimum = Number(minimumSuffix);
    const minimumBase = Number.isSafeInteger(requestedMinimum) && requestedMinimum > 0 ? requestedMinimum : 0;
    let baseSuffix = Math.max(maxSuffix, minimumBase);
    if (previousReservations.length) {
        const latest = previousReservations[previousReservations.length - 1];
        if (!Number.isSafeInteger(latest.baseSuffix) || latest.baseSuffix < 0) {
            throw new Error("La última reserva de ID contiene una base de secuencia inválida.");
        }
        const priorCount = previousReservations.length;
        baseSuffix = Math.max(latest.baseSuffix, maxSuffix - priorCount, minimumBase);
    }
    if (!Number.isSafeInteger(baseSuffix) || baseSuffix < 0) throw new Error("La base de secuencia ID no es válida.");

    const reservationId = Utilities.getUuid();
    const suffixFormula = '=INDEX($E:$E,ROW())+IF(ROW()<=2,0,COUNTIFS($B$2:INDEX($B:$B,ROW()-1),INDEX($B:$B,ROW()),$C$2:INDEX($C:$C,ROW()-1),INDEX($C:$C,ROW())))+1';
    ledger.appendRow([reservationId, sheet.getName(), idColumn, suffixFormula, baseSuffix, new Date().toISOString()]);
    SpreadsheetApp.flush();
    const reservationMatches = ledger.getRange(2, 1, Math.max(1, ledger.getLastRow() - 1), 1)
        .createTextFinder(reservationId).matchCase(true).matchEntireCell(true).findAll();
    if (reservationMatches.length !== 1) throw new Error("No se pudo confirmar una reserva única de ID.");
    const reservedSuffix = Number(ledger.getRange(reservationMatches[0].getRow(), 4).getValue());
    if (!Number.isSafeInteger(reservedSuffix) || reservedSuffix <= maxSuffix) {
        throw new Error("La reserva de ID no produjo un sufijo nuevo y verificable.");
    }
    const id = pattern.prefix + String(reservedSuffix).padStart(pattern.padding, "0");
    if (seen.has(id.toLowerCase())) throw new Error("El siguiente ID ya existe en " + sheet.getName() + ".");
    return id;
}

function isFeedbackCoordinatorConfigured_() {
    try {
        const properties = PropertiesService.getScriptProperties();
        const url = String(properties.getProperty("GPSpedia_COORDINATOR_URL") || "").trim();
        const secret = String(properties.getProperty("GPSpedia_COORDINATOR_SECRET") || "");
        return url.startsWith("https://script.google.com/macros/s/") &&
            url.endsWith("/exec") && secret.length >= 32 &&
            typeof withSharedMutationLease_ === "function";
    } catch (error) {
        return false;
    }
}

function getFeedbackCortesColumnMap_(sheet) {
    const columnMap = { ...COLS_CORTES };
    // El contrato del catálogo solo incluye estos campos si existen encabezados reales.
    delete columnMap.activaTestigo1;
    delete columnMap.activaTestigo2;
    delete columnMap.activaTestigo3;
    const lastColumn = sheet.getLastColumn();
    if (lastColumn < 1) return columnMap;
    const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    const vinMatches = [];
    headers.forEach((value, index) => {
        if (String(value || "").trim().toLowerCase() === "vin") vinMatches.push(index + 1);
    });
    if (vinMatches.length > 1) throw new Error("La hoja Cortes contiene encabezados VIN duplicados.");
    if (vinMatches.length === 1) columnMap.vin = vinMatches[0];
    ["activaTestigo1", "activaTestigo2", "activaTestigo3"].forEach(name => {
        const matches = [];
        headers.forEach((value, index) => { if (String(value || "").trim() === name) matches.push(index + 1); });
        if (matches.length > 1) throw new Error("El encabezado " + name + " está duplicado.");
        if (matches.length === 1) columnMap[name] = matches[0];
    });
    return columnMap;
}

function normalizeFeedbackCatalogImageId_(value) {
    if (!value || typeof value !== "string" || !value.trim()) return null;
    const trimmed = value.trim();
    const match = trimmed.match(/file\/d\/([a-zA-Z0-9_-]+)|id=([a-zA-Z0-9_-]+)|\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
        const fileId = match[1] || match[2] || match[3];
        return fileId && fileId.length > 20 ? fileId : null;
    }
    return trimmed.length > 20 && !trimmed.includes("/") && !trimmed.includes(":") ? trimmed : null;
}

function normalizeFeedbackCatalogYouTubeUrl_(url) {
    if (typeof url !== "string") return null;
    const candidate = url.trim();
    const idPattern = /^[A-Za-z0-9_-]{11}$/;
    if (idPattern.test(candidate)) return "https://www.youtube.com/embed/" + candidate + "?enablejsapi=1";
    const parts = candidate.match(/^https:\/\/([^/?#]+)(\/[^?#]*)?(?:\?([^#]*))?(?:#.*)?$/i);
    if (!parts) return null;
    const authority = parts[1].toLowerCase();
    if (authority.includes("@") || authority.includes(":")) return null;
    const host = authority, path = parts[2] || "/", query = parts[3] || "";
    let videoId = "";
    if (host === "youtu.be") {
        const match = path.match(/^\/([A-Za-z0-9_-]{11})\/?$/);
        videoId = match ? match[1] : "";
    } else if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host)) {
        if (path === "/watch") {
            const ids = [];
            try {
                query.split("&").filter(Boolean).forEach(part => {
                    const pair = part.split("=");
                    const key = decodeURIComponent(pair.shift().replace(/\+/g, " "));
                    if (key === "v") ids.push(decodeURIComponent(pair.join("=").replace(/\+/g, " ")));
                });
            } catch (error) { return null; }
            if (ids.length !== 1) return null;
            videoId = ids[0];
        } else {
            const match = path.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})\/?$/);
            videoId = match ? match[1] : "";
        }
    } else return null;
    if (!idPattern.test(videoId)) return null;
    return "https://www.youtube.com/embed/" + videoId + "?enablejsapi=1";
}

function buildFeedbackCortesCatalogChange_(reference) {
    const sheet = getSafeSheet(SHEET_NAMES.CORTES);
    if (!sheet || sheet.getLastRow() < 2) throw new Error("No se encontró la hoja Cortes para publicar el cambio.");
    const wanted = String(reference === null || reference === undefined ? "" : reference).trim();
    if (!wanted) throw new Error("El ID del vehículo está vacío.");
    const ids = sheet.getRange(2, COLS_CORTES.id, sheet.getLastRow() - 1, 1).getValues().flat();
    const matches = [];
    ids.forEach((id, index) => { if (String(id === null || id === undefined ? "" : id).trim() === wanted) matches.push(index + 2); });
    if (matches.length !== 1) throw new Error(matches.length ? "El ID del vehículo está duplicado." : "No se encontró la fila final del vehículo.");
    const row = sheet.getRange(matches[0], 1, 1, sheet.getLastColumn()).getValues()[0];
    const columnMap = getFeedbackCortesColumnMap_(sheet);
    const imageFields = new Set(["imagenVehiculo", "imgCorte1", "imgCorte2", "imgCorte3", "imgApertura",
        "imgCableAlimen", "imgCableAlimen2", "imgCableAlimen3"]);
    const snapshot = {};
    Object.keys(columnMap).forEach(key => {
        const raw = row[columnMap[key] - 1];
        const value = raw === undefined || raw === "" ? null : raw;
        snapshot[key] = imageFields.has(key) ? normalizeFeedbackCatalogImageId_(value) : value;
    });
    if (snapshot.videoGuiaDesarmeUrl) {
        snapshot.Video = normalizeFeedbackCatalogYouTubeUrl_(snapshot.videoGuiaDesarmeUrl);
        delete snapshot.videoGuiaDesarmeUrl;
    }
    const likeEventLedger = getSpreadsheet().getSheetByName("FeedbackLikes");
    for (let index = 1; index <= 3; index++) {
        snapshot["utilCorte" + index] = (parseInt(snapshot["utilCorte" + index], 10) || 0) +
            getFeedbackLikeEventCount_(likeEventLedger, wanted, index);
    }
    const cuts = [
        { index: 1, util: parseInt(snapshot.utilCorte1, 10) || 0 },
        { index: 2, util: parseInt(snapshot.utilCorte2, 10) || 0 },
        { index: 3, util: parseInt(snapshot.utilCorte3, 10) || 0 }
    ].sort((a, b) => b.util - a.util);
    const temp = {};
    for (let index = 1; index <= 3; index++) {
        temp[index] = {
            tipo: snapshot["tipoCorte" + index], ubicacion: snapshot["ubicacionCorte" + index],
            color: snapshot["colorCableCorte" + index], config: snapshot["configRelay" + index],
            img: snapshot["imgCorte" + index], util: snapshot["utilCorte" + index],
            activaTestigo: snapshot["activaTestigo" + index], colaborador: snapshot["colaboradorCorte" + index]
        };
    }
    cuts.forEach((cut, position) => {
        const target = position + 1, source = temp[cut.index];
        snapshot["tipoCorte" + target] = source.tipo;
        snapshot["ubicacionCorte" + target] = source.ubicacion;
        snapshot["colorCableCorte" + target] = source.color;
        snapshot["configRelay" + target] = source.config;
        snapshot["imgCorte" + target] = source.img;
        snapshot["utilCorte" + target] = source.util;
        snapshot["activaTestigo" + target] = source.activaTestigo;
        snapshot["colaboradorCorte" + target] = source.colaborador;
    });
    if (String(snapshot.id === null || snapshot.id === undefined ? "" : snapshot.id).trim() !== wanted) {
        throw new Error("La fila releída no conserva el ID solicitado.");
    }
    return { collection: "cortes", recordId: wanted, operation: "upsert", snapshot: snapshot };
}

function publishFeedbackCatalogChange_(action, buildChange) {
    let change = { operation: "reset" };
    try {
        const snapshot = buildChange();
        if (snapshot && typeof snapshot === "object" && snapshot.operation !== "reset") {
            // Date.now() ofrece una versión de origen no bloqueante. Si dos ejecuciones
            // coinciden en el mismo milisegundo, Coordinator convierte la versión repetida
            // en reset y reconstruye el snapshot; no se pierde la actualización.
            change = Object.assign({}, snapshot, { sourceVersion: Math.max(1, Date.now()) });
        }
    } catch (catalogSnapshotError) {
        console.error("No se pudo preparar el snapshot del catálogo FEEDBACK; se publicará reset.",
            catalogSnapshotError && catalogSnapshotError.message ? catalogSnapshotError.message : catalogSnapshotError);
        change = { operation: "reset" };
    }
    return publishSharedCatalogChange_("FEEDBACK", action, change);
}
function publishFeedbackCortesCatalogChange_(action, reference) {
    return publishFeedbackCatalogChange_(action, () => buildFeedbackCortesCatalogChange_(reference));
}


function doGet(e) {
    const parameters = e && e.parameter && typeof e.parameter === "object" ? e.parameter : {};
    if (String(parameters.catalogFeed || "") === "1") {
        let response;
        try {
            const cursor = parameters.cursor === undefined || parameters.cursor === "" ? 0 : Number(parameters.cursor);
            const limit = parameters.limit === undefined || parameters.limit === "" ? 50 : Number(parameters.limit);
            response = getSharedCatalogChanges_(cursor, limit);
        } catch (error) {
            response = { status: "error", message: error && error.message ? error.message : "No se pudo consultar el feed público del catálogo." };
        }
        return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
    }
    if (e && e.parameter && e.parameter.debug === 'true') {
        const serviceState = {
            service: 'GPSpedia-Feedback',
            version: '1.2.2',
            status: 'available',
            coordinatorConfigured: isFeedbackCoordinatorConfigured_()
        };
        return ContentService.createTextOutput(JSON.stringify(serviceState, null, 2))
            .setMimeType(ContentService.MimeType.JSON);
    }
    const defaultResponse = {
        status: 'success',
        message: 'GPSpedia Feedback-SERVICE v2.0 is active.'
    };
    return ContentService.createTextOutput(JSON.stringify(defaultResponse))
        .setMimeType(ContentService.MimeType.TEXT);
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
    if (action === "__invalidateSessionActorCache") {
        const invalidation = handleSharedSessionActorCacheInvalidation_(request.payload);
        return ContentService.createTextOutput(JSON.stringify(invalidation)).setMimeType(ContentService.MimeType.JSON);
    }
    const payload = request.payload && typeof request.payload === "object" ? request.payload : {};
    const anonymousSuggestion = action === "suggestYear" && String(payload.userId || "").trim() === "0";
    const isPublic = FEEDBACK_PUBLIC_ACTIONS.has(action);
    const isDeclared = Object.prototype.hasOwnProperty.call(FEEDBACK_ACTION_PERMISSIONS, action);

    // FEEDBACK usa el actor confiable en caché local; no adquiere leases ni hace viajes
    // a Coordinator por cada acción. Las rutas públicas/anónimas siguen sin requerir sesión.
    if (isPublic || anonymousSuggestion || !isDeclared) {
        return doPostInternal_(withSharedSessionActor_(e, null));
    }
    try {
        const actor = getCachedSharedSessionActor_(payload.userId, payload.sessionToken, { service: "FEEDBACK" });
        return doPostInternal_(withSharedSessionActor_(e, actor));
    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            status: "error",
            message: error && error.message ? error.message : "La sesión no pudo ser confirmada."
        })).setMimeType(ContentService.MimeType.TEXT);
    }
}

const RICH_TEXT_MODE_PROPERTY_ = "GPSpedia_RICH_TEXT_MODE_V1";

function normalizeRichTextMode_(value) {
    const mode = String(value || "").trim().toLowerCase();
    return mode === "strict" || mode === "advanced" ? mode : null;
}

function handleGetRichTextMode(payload) {
    const actor = payload && payload.__feedbackActor;
    if (!actor || !actor.userId) throw new Error("Se requiere una sesión activa para consultar el formato global.");
    const mode = normalizeRichTextMode_(PropertiesService.getScriptProperties().getProperty(RICH_TEXT_MODE_PROPERTY_)) || "strict";
    return { status: "success", mode };
}

function handleSetRichTextMode(payload) {
    const actor = payload && payload.__feedbackActor;
    if (!actor || normalizeFeedbackRole(actor.role) !== "desarrollador") {
        throw new Error("Acceso denegado: solo un Desarrollador puede cambiar el formato global.");
    }
    const mode = normalizeRichTextMode_(payload && payload.mode);
    if (!mode) throw new Error("Modo de texto enriquecido no válido.");
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty(RICH_TEXT_MODE_PROPERTY_, mode);
    const saved = normalizeRichTextMode_(properties.getProperty(RICH_TEXT_MODE_PROPERTY_));
    if (saved !== mode) throw new Error("No se pudo confirmar el guardado del formato global.");
    return { status: "success", mode: saved };
}

const FEEDBACK_ACTION_PERMISSIONS = Object.freeze({
    recordLike: null, reportProblem: null, addProblem: null, addSolution: null, addPrevention: null,
    addVehicleToProblem: null, removeVehicleFromProblem: ["Desarrollador"], updatePysItem: ["Desarrollador"],
    updateTutorialItem: ["Desarrollador"], suggestCutChange: null, suggestYear: null, addTutorial: ["Desarrollador"],
    getFeedbackItems: ["Desarrollador", "Jefe", "Supervisor"], getMyProblemReports: null,
    replyToFeedback: ["Desarrollador", "Jefe", "Supervisor"],
    markAsResolved: ["Desarrollador", "Jefe", "Supervisor"],
    deleteFeedbackItem: ["Desarrollador", "Jefe", "Supervisor"],
    getInboxRecipients: null, notifyDevelopersDriveCritical: ["Desarrollador"], getInboxConversations: null, getInboxMessages: null,
    createInboxConversation: null, sendInboxMessage: null, markInboxRead: null, markInboxUnread: null, deleteInboxConversation: null, archiveInboxConversation: null,
    closeInboxConversation: ["Desarrollador", "Jefe", "Supervisor"],
    getRichTextMode: null, setRichTextMode: ["Desarrollador"],
    getActivityLogs: ["Desarrollador", "Jefe", "Supervisor"], recordVehicleView: null, clearActivityLogs: ["Desarrollador"],
    initYouTubeUpload: null, getVideoApprovalByOperation: null, submitVideoForApproval: null,
    approveVideo: ["Desarrollador"], rejectVideo: ["Desarrollador"]
});
const FEEDBACK_PUBLIC_ACTIONS = new Set(["getPysData", "sendContactForm", "getCatalogChanges"]);
function authorizeFeedbackAction_(action, payload) {
    const source = payload && typeof payload === "object" ? payload : {};
    if (action === "suggestYear") return { ...source, ...resolveSuggestionYearActor(source) };
    if (Object.prototype.hasOwnProperty.call(FEEDBACK_ACTION_PERMISSIONS, action)) {
        const actor = assertFeedbackSession(source, FEEDBACK_ACTION_PERMISSIONS[action]);
        const authorized = { ...source, userId: actor.userId, userName: actor.userName, userRole: actor.role, __feedbackActor: actor };
        if (action === "replyToFeedback") authorized.responderName = actor.userName;
        if (action === "approveVideo") authorized.approverName = actor.userName;
        if (action === "rejectVideo") authorized.rejecterName = actor.userName;
        return authorized;
    }
    if (FEEDBACK_PUBLIC_ACTIONS.has(action)) return action === "sendContactForm" ? { ...source, userId: "N/A" } : source;
    throw new Error("Acción no declarada en la política de FEEDBACK: " + String(action || ""));
}

function doPostInternal_(e) {
    let response;
    try {
        const request = JSON.parse(e.postData.contents);
        const action = request.action;
        let payload = request.payload || {};

        payload = authorizeFeedbackAction_(action, payload);

        switch (action) {
            case 'getRichTextMode':
                response = handleGetRichTextMode(payload);
                break;
            case 'setRichTextMode':
                response = handleSetRichTextMode(payload);
                break;
            case 'recordLike':
                response = handleRecordLike(payload);
                break;
            case 'reportProblem':
                response = handleReportProblem(payload);
                break;
            case 'getPysData':
                response = handleGetPysData();
                break;
            case 'getCatalogChanges':
                response = handleGetCatalogChanges(payload);
                break;
            case 'addProblem':
                response = handleAddProblem(payload);
                break;
            case 'addSolution':
                response = handleAddSolution(payload);
                break;
            case 'addPrevention':
                response = handleAddPrevention(payload);
                break;
            case 'addVehicleToProblem':
                response = handleAddVehicleToProblem(payload);
                break;
            case 'removeVehicleFromProblem':
                response = handleRemoveVehicleFromProblem(payload);
                break;
            case 'updatePysItem':
                response = handleUpdatePysItem(payload);
                break;
            case 'updateTutorialItem':
                response = handleUpdateTutorialItem(payload);
                break;
            case 'suggestCutChange':
                response = handleSuggestCutChange(payload);
                break;
            case 'suggestYear':
                response = handleSuggestYear(payload);
                break;
            case 'addTutorial':
                response = handleAddTutorial(payload);
                break;
            case 'sendContactForm':
                response = handleSendContactForm(payload);
                break;
            // --- INBOX ACTIONS ---
            case 'getFeedbackItems':
                response = handleGetFeedbackItems(payload);
                break;
            case 'getMyProblemReports':
                response = handleGetMyProblemReports(payload);
                break;
            case 'replyToFeedback':
                response = handleReplyToFeedback(payload);
                break;
            case 'markAsResolved':
                response = handleMarkAsResolved(payload);
                break;
            case 'recordVehicleView':
                response = handleRecordVehicleView(payload);
                break;
            case 'getActivityLogs':
                response = handleGetActivityLogs(payload);
                break;
            case 'deleteFeedbackItem':
                response = handleDeleteFeedbackItem(payload);
                break;
            case 'getInboxRecipients':
                response = handleGetInboxRecipients(payload);
                break;
            case 'notifyDevelopersDriveCritical':
                response = handleNotifyDevelopersDriveCritical(payload);
                break;
            case 'getInboxConversations':
                response = handleGetInboxConversations(payload);
                break;
            case 'getInboxMessages':
                response = handleGetInboxMessages(payload);
                break;
            case 'createInboxConversation':
                response = handleCreateInboxConversation(payload);
                break;
            case 'sendInboxMessage':
                response = handleSendInboxMessage(payload);
                break;
            case 'markInboxRead':
                response = handleMarkInboxRead(payload);
                break;
            case 'markInboxUnread':
                response = handleMarkInboxUnread(payload);
                break;
            case 'deleteInboxConversation':
                response = handleDeleteInboxConversation(payload);
                break;
            case 'archiveInboxConversation':
                response = handleArchiveInboxConversation(payload);
                break;
            case 'closeInboxConversation':
                response = handleCloseInboxConversation(payload);
                break;
            case 'clearActivityLogs':
                response = handleClearActivityLogs(payload);
                break;
            case 'initYouTubeUpload':
                response = handleInitYouTubeUpload(payload);
                break;
            case 'getVideoApprovalByOperation':
                response = handleGetVideoApprovalByOperation(payload);
                break;
            case 'submitVideoForApproval':
                response = handleSubmitVideoForApproval(payload);
                break;
            case 'approveVideo':
                response = handleApproveVideo(payload);
                break;
            case 'rejectVideo':
                response = handleRejectVideo(payload);
                break;
            default:
                throw new Error(`Acción desconocida en Feedback Service: ${action}`);
        }

        // Publicar el cambio solo después de confirmar el like y liberar su ScriptLock.
        // Un fallo del feed no revierte ni convierte en error una reacción ya guardada.
        if (action === "recordLike" && response && response.status === "success" && !response.alreadyLiked) {
            try {
                // Los likes nuevos son eventos append-only; un reset obliga a CATALOG a
                // recomponer el contador desde FeedbackLikes sin reservar versión bajo ScriptLock.
                publishSharedCatalogChange_("FEEDBACK", "recordLike", { operation: "reset" });
            } catch (catalogPublishError) {
                console.error("El like se guardó, pero no se pudo invalidar CATALOG:",
                    catalogPublishError && catalogPublishError.message ? catalogPublishError.message : catalogPublishError);
            }
        } else if (action === "suggestYear" && response &&
            (response.recovered === false || response.recovered === true)) {
            // Solo una aplicación de rango confirmada modifica la fila Cortes; los votos previos no generan delta.
            try {
                const vehicleId = String(payload.vehicleId || "").trim();
                if (!vehicleId) throw new Error("No se recibió el ID del vehículo actualizado.");
                publishFeedbackCortesCatalogChange_(action, vehicleId);
            } catch (catalogPublishError) {
                console.error("La sugerencia de año se procesó, pero no se pudo publicar su cambio incremental:",
                    catalogPublishError && catalogPublishError.message ? catalogPublishError.message : catalogPublishError);
            }
        } else if ((action === "approveVideo" || action === "rejectVideo") && response && response.status === "success") {
            try {
                const targetType = String(response.targetType || "").trim();
                const contentType = String(response.contentType || "").trim();
                const referenceId = String(response.referenceId || "").trim();
                if (!referenceId || targetType !== contentType) throw new Error("El destino del vídeo no se pudo verificar.");
                if (targetType === "corte") publishFeedbackCortesCatalogChange_(action, referenceId);
                else if (targetType === "pys") publishPysCatalogChange_(action, referenceId);
                else if (targetType === "tutorial") publishTutorialCatalogChange_(action, referenceId);
                else throw new Error("El tipo de destino del vídeo no está soportado por el feed.");
            } catch (catalogPublishError) {
                try { publishSharedCatalogChange_("FEEDBACK", action, { operation: "reset" }); }
                catch (resetError) { console.error("No se pudo publicar el cambio de vídeo ni su reset de recuperación:", resetError); }
            }
        } else if (response && response.status === "success" &&
            ["addProblem", "addSolution", "addPrevention", "addVehicleToProblem",
             "removeVehicleFromProblem", "updatePysItem", "updateTutorialItem", "addTutorial"].includes(action)) {
            // PyS y Tutoriales publican snapshots individuales después de verificar la fila persistida.
            try {
                if (["addProblem", "addSolution", "addPrevention", "addVehicleToProblem",
                    "removeVehicleFromProblem", "updatePysItem"].includes(action)) {
                    const problemId = action === "addProblem"
                        ? response.problemId
                        : payload && payload.problemId;
                    if (!problemId) throw new Error("La operación PyS no devolvió un ID verificable.");
                    publishPysCatalogChange_(action, problemId);
                } else if (action === "addTutorial" || action === "updateTutorialItem") {
                    const tutorialId = action === "addTutorial"
                        ? response.referenceId
                        : response.updated && response.updated.tutorialId;
                    if (!tutorialId) throw new Error("La operación no devolvió un ID de tutorial verificable.");
                    publishTutorialCatalogChange_(action, tutorialId);
                } else {
                    publishSharedCatalogChange_("FEEDBACK", action, { operation: "reset" });
                }
            } catch (catalogPublishError) {
                // Si no puede obtenerse/publicarse un snapshot exacto, el reset conserva la coherencia.
                try {
                    publishSharedCatalogChange_("FEEDBACK", action, { operation: "reset" });
                } catch (resetPublishError) {
                    console.error("La operación FEEDBACK se confirmó, pero no se pudo publicar su cambio:",
                        resetPublishError && resetPublishError.message ? resetPublishError.message : "CatalogFeedError");
                }
            }
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




// ============================================================================
// SINCRONIZACIÓN DE LA CARPETA DE IMAGEN PRINCIPAL TRAS AMPLIAR AÑOS
// ============================================================================

function extractDriveFileIds(value) {
    const text = String(value || "");
    const ids = new Set();
    const patterns = [
        /[?&]id=([a-zA-Z0-9_-]{10,})/g,
        new RegExp("[/]d/([a-zA-Z0-9_-]{10,})", "g")
    ];
    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) ids.add(match[1]);
    });
    if (/^[a-zA-Z0-9_-]{20,}$/.test(text.trim())) ids.add(text.trim());
    return Array.from(ids);
}

function getCortesRootFolder() {
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const rootId = DriveApp.getRootFolder().getId();
    if (String(folder.getId()) !== String(DRIVE_FOLDER_ID) ||
        String(folder.getName() || "").trim().toLowerCase() !== "cortes") {
        throw new Error("DRIVE_FOLDER_ID no corresponde a la carpeta «Cortes».");
    }
    const parents = folder.getParents();
    let directChild = false;
    while (parents.hasNext()) if (parents.next().getId() === rootId) directChild = true;
    if (!directChild) throw new Error("La carpeta «Cortes» no está ubicada directamente en la raíz de Drive.");
    return folder;
}

function sanitizeForFolderDisplay(text) {
    if (text === null || text === undefined) return "";
    return String(text).replace(/\s+/g, " ").replace(/__+/g, "_").trim();
}

function getFolderCanonicalName(name) {
    return String(name || "").normalize("NFD").replace(/\p{M}/gu, "")
        .toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findOrCreateSubFolder(parentFolder, desiredName) {
    if (!parentFolder) throw new Error("No se proporcionó la carpeta padre.");
    const name = sanitizeForFolderDisplay(desiredName);
    const canonical = getFolderCanonicalName(name);
    if (!canonical) throw new Error("El nombre de carpeta no es válido.");

    const matches = [];
    const folders = parentFolder.getFolders();
    while (folders.hasNext()) {
        const folder = folders.next();
        if (getFolderCanonicalName(folder.getName()) === canonical) matches.push(folder);
    }

    const exactMatches = matches.filter(folder => folder.getName() === name);
    if (exactMatches.length === 1) return exactMatches[0];
    if (exactMatches.length > 1 || matches.length > 1) {
        throw new Error("Existen varias carpetas equivalentes a «" + name + "»; no se fusionaron ni modificaron.");
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

function getVehicleYearFolderName(vehicleInfo) {
    const info = vehicleInfo || {};
    const rawDesde = String(info[COLS_CORTES.anoDesde - 1] === null || info[COLS_CORTES.anoDesde - 1] === undefined ? "" : info[COLS_CORTES.anoDesde - 1]).trim();
    const rawHasta = String(info[COLS_CORTES.anoHasta - 1] === null || info[COLS_CORTES.anoHasta - 1] === undefined ? "" : info[COLS_CORTES.anoHasta - 1]).trim();
    const inlineRange = rawDesde.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
    let desde = inlineRange ? parseInt(inlineRange[1], 10) : parseInt(rawDesde, 10);
    let hasta = inlineRange ? parseInt(inlineRange[2], 10) : parseInt(rawHasta, 10);
    if (!Number.isFinite(desde)) return "Sin_Año";
    if (!Number.isFinite(hasta)) hasta = desde;
    const start = Math.min(desde, hasta);
    const end = Math.max(desde, hasta);
    return start === end ? String(start) : String(start) + "_" + String(end);
}

function findOrCreateVehicleFolder(vehicleRow) {
    const row = vehicleRow || [];
    const category = sanitizeForFolderDisplay(row[COLS_CORTES.categoria - 1] || "Sin_Categoria");
    const brand = sanitizeForFolderDisplay(row[COLS_CORTES.marca - 1] || "Sin_Marca");
    const model = sanitizeForFolderDisplay(row[COLS_CORTES.modelo - 1] || "Sin_Modelo");
    const versionOrIgnition = sanitizeForFolderDisplay(
        String(row[COLS_CORTES.versionesAplicables - 1] || "").trim() ||
        String(row[COLS_CORTES.tipoEncendido - 1] || "").trim() || "Sin_Tipo_de_Encendido"
    );
    const yearRange = sanitizeForFolderDisplay(getVehicleYearFolderName(row));

    const categoryFolder = findOrCreateSubFolder(getCortesRootFolder(), category);
    const brandFolder = findOrCreateSubFolder(categoryFolder, brand);
    const modelFolder = findOrCreateSubFolder(brandFolder, model);
    const versionFolder = findOrCreateSubFolder(modelFolder, versionOrIgnition);
    return findOrCreateSubFolder(versionFolder, yearRange);
}

function collectCortesImageReferencesForFolderSync(sheet) {
    const imageFields = [
        "imagenVehiculo", "imgCorte1", "imgCorte2", "imgCorte3",
        "imgApertura", "imgCableAlimen", "imgCableAlimen2", "imgCableAlimen3"
    ];
    const imageColumns = imageFields.map(field => ({
        field: field, column: COLS_CORTES[field]
    })).filter(item => Number.isInteger(item.column) && item.column > 0);
    const references = new Map();
    let unverifiableReferenceCount = 0;
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { references: references, unverifiableReferenceCount: 0 };

    const range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
    const values = range.getDisplayValues();
    const formulas = range.getFormulas();
    const richTextValues = range.getRichTextValues();

    for (let r = 0; r < values.length; r++) {
        imageColumns.forEach(item => {
            const columnIndex = item.column - 1;
            const candidates = [
                String(values[r][columnIndex] || ""),
                String((formulas[r] && formulas[r][columnIndex]) || "")
            ];
            const richText = richTextValues[r] && richTextValues[r][columnIndex];
            if (richText) {
                const link = richText.getLinkUrl();
                if (link) candidates.push(link);
                const runs = richText.getRuns ? richText.getRuns() : [];
                runs.forEach(run => { const runLink = run.getLinkUrl(); if (runLink) candidates.push(runLink); });
            }

            const cellIds = new Set();
            let hasUnverifiable = false;
            candidates.forEach(candidate => {
                if (!candidate) return;
                const ids = extractDriveFileIds(candidate);
                ids.forEach(id => cellIds.add(id));
                if (!ids.length && /drive\.google\.com\/(?:uc|thumbnail|file|open)|googleusercontent\.com/i.test(candidate)) {
                    hasUnverifiable = true;
                }
            });

            cellIds.forEach(id => {
                if (!references.has(id)) references.set(id, []);
                references.get(id).push({
                    row: r + 2, field: item.field, column: item.column
                });
            });
            if (hasUnverifiable) unverifiableReferenceCount++;
        });
    }
    return { references: references, unverifiableReferenceCount: unverifiableReferenceCount };
}

function movePrimaryVehicleImageToCanonicalFolder(sheet, rowNumber, vehicleRow) {
    const imageUrl = vehicleRow[COLS_CORTES.imagenVehiculo - 1];
    const imageIds = extractDriveFileIds(imageUrl);
    if (!imageIds.length) return { skipped: true };

    const imageId = imageIds[0];
    const referenceData = collectCortesImageReferencesForFolderSync(sheet);
    if (referenceData.unverifiableReferenceCount > 0) {
        return {
            skipped: true, warning: true,
            reason: "Existen referencias de imagen de Cortes no verificables; se protegió el archivo."
        };
    }

    const locations = referenceData.references.get(imageId) || [];
    if (!locations.length) return { skipped: true, warning: true, reason: "No se pudo confirmar la referencia de imagenVehiculo." };
    if (locations.some(location => location.field !== "imagenVehiculo")) {
        return { skipped: true, warning: true, reason: "La imagen también se utiliza en un campo de corte, apertura o alimentación." };
    }
    const primaryLocations = locations.filter(location => location.field === "imagenVehiculo")
        .sort((a, b) => a.row - b.row);
    if (primaryLocations.length && primaryLocations[0].row !== rowNumber) {
        return { skipped: true, reason: "La imagen pertenece al primer registro que la utiliza (fila " + primaryLocations[0].row + ")." };
    }

    const file = DriveApp.getFileById(imageId);
    if (file.isTrashed()) return { skipped: true, warning: true, reason: "La imagen principal está en la papelera de Drive." };
    if (!String(file.getMimeType() || "").toLowerCase().startsWith("image/")) {
        return { skipped: true, warning: true, reason: "El archivo referenciado no tiene MIME de imagen." };
    }

    const targetFolder = findOrCreateVehicleFolder(vehicleRow);
    const parents = file.getParents();
    while (parents.hasNext()) {
        if (parents.next().getId() === targetFolder.getId()) return { skipped: true };
    }

    file.moveTo(targetFolder);
    return { moved: true, skipped: false };
}

function handleSuggestYear(payload) {
    // El flujo se coordina mediante votos, aplicaciones y eventos append-only
    // con identidades deterministas; no serializa solicitudes con un lock global.
    const result = handleSuggestYearLocked(payload);

    if (!result || typeof result !== "object") return result;
    const catalogResetRequest = result._catalogResetRequest === true;
    delete result._catalogResetRequest;
    if (catalogResetRequest) {
        try {
            publishFeedbackCatalogChange_("suggestYear", () => ({ operation: "reset" }));
        } catch (catalogError) {
            result.catalogSyncWarning = true;
            result.message += " La ampliación quedó registrada, pero la actualización de caché del catálogo requiere reintento.";
            Logger.log("No se pudo invalidar el catálogo tras anexar la ampliación de años: " +
                String(catalogError && catalogError.message || catalogError));
        }
    }

    const activityLogRequest = result._activityLogRequest;
    delete result._activityLogRequest;
    if (activityLogRequest) {
        try {
            logUserActivity(activityLogRequest.userId, activityLogRequest.userName,
                activityLogRequest.activityType, activityLogRequest.associatedId, activityLogRequest.details);
        } catch (activityError) {
            Logger.log("No se pudo registrar la actividad de sugerencia de año: " + activityError.message);
        }
    }

    const folderSyncRequest = result._folderSyncRequest;
    delete result._folderSyncRequest;
    if (folderSyncRequest && folderSyncRequest.expectedImageUrl) {
        try {
            const currentRow = folderSyncRequest.sheet.getRange(
                folderSyncRequest.rowNumber, 1, 1, folderSyncRequest.sheet.getLastColumn()
            ).getValues()[0];
            if (String(currentRow[COLS_CORTES.id - 1] || "").trim() !== String(folderSyncRequest.vehicleId).trim()) {
                throw new Error("El registro del vehículo cambió después de aplicar la sugerencia; no se movió la imagen.");
            }
            if (String(currentRow[COLS_CORTES.imagenVehiculo - 1] || "") !== folderSyncRequest.expectedImageUrl) {
                throw new Error("La imagen principal cambió después de aplicar la sugerencia; no se movió un archivo posiblemente distinto.");
            }
            const folderSyncResult = movePrimaryVehicleImageToCanonicalFolder(
                folderSyncRequest.sheet, folderSyncRequest.rowNumber, currentRow
            );
            result.folderSyncWarning = Boolean(folderSyncResult && folderSyncResult.warning);
            if (result.folderSyncWarning) {
                result.message += " La carpeta de la imagen principal no pudo sincronizarse automáticamente: " +
                    String(folderSyncResult.reason || "requiere revisión manual") + ".";
            }
        } catch (folderError) {
            result.folderSyncWarning = true;
            result.message += " La carpeta de la imagen principal no pudo sincronizarse automáticamente: " +
                String(folderError && folderError.message || folderError) + ".";
            Logger.log("No se pudo sincronizar la carpeta de imagenVehiculo tras ampliar el rango: " +
                String(folderError && folderError.message || folderError));
        }
    }
    return result;
}

function isVerifiedSuggestionActorKey_(actorKey) {
    return /^user:[A-Za-z0-9_.-]{1,100}$/.test(String(actorKey || ""));
}

function getAppliedSuggestionActorKey_(actorKey) {
    return "applied:" + String(actorKey || "").trim();
}

const YEAR_SUGGESTION_VOTE_THRESHOLD_ = 3;

function countVerifiedPositiveYearSuggestionVotes_(rows, vehicleId, year, actorColumn) {
    // La primera respuesta física de cada actor es la única que define su voto.
    // Así, una escritura concurrente contradictoria no puede convertir después
    // un voto negativo en positivo ni sumar dos veces al mismo aportante.
    const firstVoteByActor = new Map();
    (Array.isArray(rows) ? rows : []).forEach(row => {
        const rowVehicleId = String(row[COLS_FEEDBACKS.ID_vehiculo - 1] || "").trim();
        const rowYear = Number(row[COLS_FEEDBACKS.anoSugerido - 1]);
        const actorKey = String(row[actorColumn - 1] || "").trim();
        if (rowVehicleId !== String(vehicleId || "").trim() || rowYear !== Number(year) ||
            !isVerifiedSuggestionActorKey_(actorKey) || firstVoteByActor.has(actorKey)) return;
        firstVoteByActor.set(actorKey, isPositiveYearSuggestionRow(row));
    });
    let positiveVotes = 0;
    firstVoteByActor.forEach(isPositive => { if (isPositive) positiveVotes++; });
    return positiveVotes;
}

function buildFeedbackYearApplicationId_(details) {
    const input = details || {};
    const canonical = JSON.stringify({
        vehicleId: String(input.vehicleId || "").trim(),
        year: Number(input.year),
        previousFrom: Number(input.previousFrom),
        previousTo: Number(input.previousTo),
        targetFrom: Number(input.targetFrom),
        targetTo: Number(input.targetTo),
        previousRawFrom: input.previousRawFrom == null ? "" : String(input.previousRawFrom),
        previousSourceFromEventId: String(input.previousSourceFromEventId || "").trim(),
        previousRawTo: input.previousRawTo == null ? "" : String(input.previousRawTo),
        previousSourceToEventId: String(input.previousSourceToEventId || "").trim()
    });
    if (!/^[1-9]\d{0,14}$/.test(input.vehicleId == null ? "" : String(input.vehicleId).trim()) ||
        ![input.year, input.previousFrom, input.previousTo, input.targetFrom, input.targetTo].every(value => Number.isFinite(Number(value)))) {
        throw new Error("No se puede construir una identidad estable para la aplicación de año.");
    }
    const digest = Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256, canonical, Utilities.Charset.UTF_8
    );
    const hex = digest.map(value => ("0" + (value & 255).toString(16)).slice(-2)).join("");
    return "YSA-" + hex;
}

function getFeedbackYearApplicationsSheet_(createIfMissing) {
    const headers = [
        "operationId", "vehicleId", "year", "previousFrom", "previousTo",
        "targetFrom", "targetTo", "voteCount", "status", "activityAttempted",
        "createdAt", "updatedAt", "previousRawFrom", "previousSourceFromEventId",
        "previousRawTo", "previousSourceToEventId"
    ];
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("FeedbackYearApplications");
    if (!sheet && !createIfMissing) return null;
    if (!sheet) sheet = ss.insertSheet("FeedbackYearApplications");
    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        SpreadsheetApp.flush();
    }
    const actual = sheet.getRange(1, 1, 1, headers.length).getValues()[0].map(value => String(value || "").trim());
    const legacyHeaders = headers.slice(0, 12);
    if (legacyHeaders.some((header, index) => actual[index] !== header)) {
        throw new Error("El esquema de FeedbackYearApplications no coincide con el contrato esperado.");
    }
    const extensionHeaders = headers.slice(12);
    const lastColumn = sheet.getLastColumn();
    if (lastColumn < headers.length) {
        sheet.getRange(1, 13, 1, extensionHeaders.length).setValues([extensionHeaders]);
        SpreadsheetApp.flush();
    } else if (extensionHeaders.some((header, index) => actual[index + 12] !== header)) {
        throw new Error("La extensión versionada de FeedbackYearApplications no coincide.");
    }
    return sheet;
}

function getFeedbackYearApplicationEventsSheet_(createIfMissing) {
    const headers = ["eventId", "operationId", "eventType", "createdAt", "payloadJson"];
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("FeedbackYearApplicationEvents");
    if (!sheet && !createIfMissing) return null;
    if (!sheet) sheet = ss.insertSheet("FeedbackYearApplicationEvents");
    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        SpreadsheetApp.flush();
    }
    const actual = sheet.getRange(1, 1, 1, headers.length).getValues()[0]
        .map(value => String(value || "").trim());
    if (headers.some((header, index) => actual[index] !== header)) {
        throw new Error("El esquema de FeedbackYearApplicationEvents no coincide.");
    }
    return sheet;
}

function appendFeedbackYearApplicationEvent_(operationId, eventType, payload) {
    const cleanOperationId = String(operationId || "").trim();
    const allowedTypes = new Set(["activity_attempted", "requires_review", "completed"]);
    if (!/^YSA-[A-Za-z0-9_-]{20,80}$/.test(cleanOperationId) || !allowedTypes.has(eventType)) {
        throw new Error("El evento de aplicación de año no tiene una identidad o tipo válido.");
    }
    const payloadJson = JSON.stringify(payload == null ? {} : payload);
    const sheet = getFeedbackYearApplicationEventsSheet_(true);
    const rows = sheet.getLastRow() > 1
        ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues() : [];
    const existing = rows.filter(row =>
        String(row[1] || "").trim() === cleanOperationId &&
        String(row[2] || "").trim() === eventType
    );
    if (existing.length) {
        if (existing.some(row => String(row[4] || "") !== payloadJson)) {
            throw new Error("El evento de aplicación ya existe con contenido distinto; requiere revisión.");
        }
        return { duplicate: true, eventId: String(existing[0][0] || "") };
    }
    const canonical = JSON.stringify({ operationId: cleanOperationId, eventType, payload: payload == null ? {} : payload });
    const digest = Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256, canonical, Utilities.Charset.UTF_8
    );
    const eventId = "YSE-" + digest.map(value => ("0" + (value & 255).toString(16)).slice(-2)).join("");
    const createdAt = new Date().toISOString();
    sheet.appendRow([eventId, cleanOperationId, eventType, createdAt, payloadJson]);
    SpreadsheetApp.flush();
    const savedRows = sheet.getLastRow() > 1
        ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues() : [];
    const saved = savedRows.find(row => String(row[0] || "").trim() === eventId);
    if (!saved || String(saved[1] || "").trim() !== cleanOperationId ||
        String(saved[2] || "").trim() !== eventType || String(saved[4] || "") !== payloadJson) {
        const pending = new Error("No se pudo confirmar el evento de aplicación de año; reintenta la operación.");
        pending.code = "FEEDBACK_YEAR_EVENT_APPEND_UNCONFIRMED";
        throw pending;
    }
    return { duplicate: false, eventId };
}

function getFeedbackYearApplicationEventState_(operationId, eventRows) {
    const events = Array.isArray(eventRows) ? eventRows : [];
    const matching = events.filter(row => String(row[1] || "").trim() === String(operationId || "").trim());
    const payloadByType = new Map();
    matching.forEach(row => {
        const eventType = String(row[2] || "").trim();
        const payloadJson = String(row[4] || "{}");
        if (payloadByType.has(eventType) && payloadByType.get(eventType) !== payloadJson) {
            throw new Error("La aplicación contiene eventos contradictorios del mismo tipo; requiere revisión.");
        }
        payloadByType.set(eventType, payloadJson);
    });
    const types = new Set(matching.map(row => String(row[2] || "").trim()));
    return {
        completed: types.has("completed"),
        requiresReview: types.has("requires_review"),
        activityAttempted: types.has("activity_attempted")
    };
}

function findPendingFeedbackYearApplication_(vehicleId) {
    const sheet = getFeedbackYearApplicationsSheet_(false);
    if (!sheet) return null;
    const rows = sheet.getDataRange().getValues();
    const eventSheet = getFeedbackYearApplicationEventsSheet_(false);
    const eventRows = eventSheet && eventSheet.getLastRow() > 1
        ? eventSheet.getRange(2, 1, eventSheet.getLastRow() - 1, 5).getValues() : [];
    const matches = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (String(row[1] || "").trim() !== String(vehicleId) ||
            String(row[8] || "").trim() !== "pending") continue;
        const eventState = getFeedbackYearApplicationEventState_(row[0], eventRows);
        if (eventState.completed || eventState.requiresReview) continue;
        matches.push({ rowIndex: i + 1, row, eventState });
    }
    if (!matches.length) return null;
    const byOperation = new Map();
    matches.forEach(entry => {
        const operationId = String(entry.row[0] || "").trim();
        if (!byOperation.has(operationId)) byOperation.set(operationId, []);
        byOperation.get(operationId).push(entry);
    });
    if (byOperation.size > 1) {
        throw new Error("Hay propuestas de ampliación distintas pendientes para el mismo vehículo; requiere revisión manual.");
    }
    const duplicateEntries = Array.from(byOperation.values())[0];
    const canonical = duplicateEntries[0].row;
    const sameProposal = entry => [1, 2, 3, 4, 5, 6, 12, 13, 14, 15].every(index =>
        String(entry.row[index] == null ? "" : entry.row[index]) ===
        String(canonical[index] == null ? "" : canonical[index])
    );
    if (!duplicateEntries.every(sameProposal)) {
        throw new Error("La misma identidad de aplicación contiene propuestas distintas; requiere revisión manual.");
    }
    const selected = duplicateEntries.reduce((best, entry) =>
        Number(entry.row[7]) > Number(best.row[7]) ? entry : best, duplicateEntries[0]);
    const row = selected.row;
    const numeric = row.slice(2, 8).map(Number);
    if (!String(row[0] || "").trim() || !numeric.every(Number.isFinite) ||
        numeric[0] < 1980 || numeric[0] > 2099 ||
        numeric[1] < 1980 || numeric[1] > 2099 || numeric[2] < numeric[1] || numeric[2] > 2099 ||
        numeric[3] < 1980 || numeric[3] > 2099 || numeric[4] < numeric[3] || numeric[4] > 2099 ||
        numeric[5] < 3 || ![true, false, "TRUE", "FALSE", ""].includes(row[9])) {
        throw new Error("La aplicación pendiente de año contiene datos inválidos; requiere revisión manual.");
    }
    return {
        sheet, rowIndex: selected.rowIndex, row,
        rowIndexes: duplicateEntries.map(entry => entry.rowIndex),
        activityAttempted: duplicateEntries.some(entry =>
            entry.eventState.activityAttempted || entry.row[9] === true || String(entry.row[9]).toUpperCase() === "TRUE"
        )
    };
}

function getFeedbackProjectedVehicleYearSnapshot_(vehicleId, baseRow) {
    const id = String(vehicleId || "").trim();
    if (!id || !Array.isArray(baseRow)) throw new Error("No se pudo preparar la versión del rango de años.");
    const fields = ["anoDesde", "anoHasta"];
    const positions = { anoDesde: COLS_CORTES.anoDesde - 1, anoHasta: COLS_CORTES.anoHasta - 1 };
    const values = {
        anoDesde: baseRow[positions.anoDesde] == null ? "" : baseRow[positions.anoDesde],
        anoHasta: baseRow[positions.anoHasta] == null ? "" : baseRow[positions.anoHasta]
    };
    const sources = { anoDesde: "", anoHasta: "" };
    const ledger = getSpreadsheet().getSheetByName("AportesVehiculo");
    if (!ledger) {
        const from = String(values.anoDesde || "").trim(), to = String(values.anoHasta || "").trim();
        return { rawFrom: values.anoDesde, rawTo: values.anoHasta, sourceFrom: "", sourceTo: "",
            anoDesde: from, anoHasta: to || from };
    }
    const headers = ["eventId", "opId", "vehicleId", "operationHash", "kind", "payloadJson",
        "actorId", "actorName", "createdAt", "status", "supersedesEventId"];
    if (ledger.getLastColumn() < headers.length || ledger.getLastRow() < 1) {
        throw new Error("AportesVehiculo tiene un esquema incompleto; no se aplicó la sugerencia de año.");
    }
    const actual = ledger.getRange(1, 1, 1, headers.length).getDisplayValues()[0]
        .map(value => String(value || "").trim());
    if (headers.some((header, index) => actual[index] !== header)) {
        throw new Error("El esquema AportesVehiculo no coincide; no se aplicó la sugerencia de año.");
    }
    const lastRow = ledger.getLastRow();
    const rows = lastRow > 1 ? ledger.getRange(2, 1, lastRow - 1, headers.length).getValues() : [];
    const allowedKinds = new Set(["cut", "opening", "feed", "vehicle", "vehicle_update"]);
    const allowedUpdateFields = new Set(["categoria", "modelo", "versionesAplicables", "tipoEncendido", "anoDesde", "anoHasta",
        "notaImportante", "apertura", "cableAlimen", "cableAlimen2", "cableAlimen3", "imagenVehiculo", "imgCorte1",
        "imgCorte2", "imgCorte3", "imgApertura", "imgCableAlimen", "imgCableAlimen2", "imgCableAlimen3",
        "tipoCorte1", "tipoCorte2", "tipoCorte3", "ubicacionCorte1", "ubicacionCorte2", "ubicacionCorte3",
        "colorCableCorte1", "colorCableCorte2", "colorCableCorte3", "configRelay1", "configRelay2", "configRelay3", "vin"]);
    const events = rows.map((row, index) => {
        const event = {
            rowIndex: index + 2, eventId: String(row[0] || "").trim(), opId: String(row[1] || "").trim(),
            vehicleId: String(row[2] || "").trim(), operationHash: String(row[3] || "").trim().toLowerCase(),
            kind: String(row[4] || "").trim(), payloadJson: String(row[5] || ""),
            actorId: String(row[6] || "").trim(), createdAt: String(row[8] || "").trim(),
            status: String(row[9] || "").trim().toLowerCase(), supersedesEventId: String(row[10] || "").trim()
        };
        if (!event.eventId || !/^OP-[A-Za-z0-9_-]{1,100}$/.test(event.opId) || !event.vehicleId ||
            !/^[a-f0-9]{64}$/.test(event.operationHash) || !allowedKinds.has(event.kind) ||
            !event.createdAt || Number.isNaN(Date.parse(event.createdAt)) ||
            !["accepted", "review", "retracted"].includes(event.status)) {
            throw new Error("AportesVehiculo contiene un evento inválido; no se aplicó la sugerencia de año.");
        }
        let payload;
        try { payload = JSON.parse(event.payloadJson); } catch (error) {
            throw new Error("AportesVehiculo contiene un payload JSON inválido; no se aplicó la sugerencia de año.");
        }
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
            throw new Error("AportesVehiculo contiene un payload no válido; no se aplicó la sugerencia de año.");
        }
        if (event.kind === "vehicle_update" &&
            (!event.actorId || !(event.opId.startsWith("OP-ADMIN-") ||
                (event.opId.startsWith("OP-YEAR-") && event.actorId === "SYSTEM:FEEDBACK_YEAR")) ||
                !allowedUpdateFields.has(String(payload.fieldName || "")) ||
                !Object.prototype.hasOwnProperty.call(payload, "expectedCurrentValue") ||
                !Object.prototype.hasOwnProperty.call(payload, "value"))) {
            throw new Error("AportesVehiculo contiene una actualización de campo inválida; no se aplicó la sugerencia de año.");
        }
        event.payload = payload;
        return event;
    });
    const operationIdentities = new Map(), conflictedOps = new Set();
    events.forEach(event => {
        const identity = JSON.stringify([event.vehicleId, event.operationHash, event.kind, event.payloadJson]);
        if (!operationIdentities.has(event.opId)) operationIdentities.set(event.opId, identity);
        else if (operationIdentities.get(event.opId) !== identity) conflictedOps.add(event.opId);
    });
    events.filter(event => event.vehicleId === id && event.status === "accepted")
        .sort((a, b) => a.rowIndex - b.rowIndex).forEach(event => {
        if (conflictedOps.has(event.opId)) return;
        const payload = event.payload;
        if (event.kind === "vehicle_update") {
            const field = String(payload.fieldName || "");
            if (!fields.includes(field) || !event.actorId ||
                !(event.opId.startsWith("OP-ADMIN-") || event.opId.startsWith("OP-YEAR-")) ||
                !Object.prototype.hasOwnProperty.call(payload, "expectedCurrentValue") ||
                !Object.prototype.hasOwnProperty.call(payload, "value")) return;
            const current = String(values[field] == null ? "" : values[field]);
            const expected = String(payload.expectedCurrentValue == null ? "" : payload.expectedCurrentValue);
            const sourceId = String(event.supersedesEventId || "");
            if (current !== expected || (sourceId && sources[field] !== sourceId)) return;
            values[field] = payload.value;
            sources[field] = event.eventId;
            return;
        }
        const metadata = event.kind === "vehicle" ? payload :
            (event.kind === "cut" && payload.vehicleData && typeof payload.vehicleData === "object" ? payload.vehicleData : null);
        if (!metadata) return;
        fields.forEach(field => {
            const incoming = metadata[field];
            if (incoming === undefined || incoming === null || String(incoming).trim() === "" ||
                String(values[field] == null ? "" : values[field]).trim() !== "") return;
            values[field] = incoming;
            sources[field] = event.eventId;
        });
    });
    const rawFrom = values.anoDesde, rawTo = values.anoHasta;
    const from = String(rawFrom == null ? "" : rawFrom).trim(), to = String(rawTo == null ? "" : rawTo).trim();
    return { rawFrom, rawTo, sourceFrom: sources.anoDesde, sourceTo: sources.anoHasta,
        anoDesde: from, anoHasta: to || from };
}

function appendFeedbackYearVehicleUpdateEvent_(application, vehicleId, fieldName, value, expectedCurrentValue, expectedSourceEventId) {
    const allowedFields = new Set(["anoDesde", "anoHasta"]);
    const cleanVehicleId = String(vehicleId || "").trim();
    const operationId = String(application && application.row && application.row[0] || "").trim();
    if (!/^[1-9]\d{0,14}$/.test(cleanVehicleId) || !allowedFields.has(fieldName) ||
        !/^YSA-[A-Za-z0-9_-]{20,80}$/.test(operationId)) {
        throw new Error("La aplicación de año no contiene una identidad válida para anexar el evento.");
    }
    const opId = "OP-YEAR-" + operationId + "-" + fieldName;
    const actorId = "SYSTEM:FEEDBACK_YEAR", actorName = "Sistema de validación por tres votos verificados";
    const payload = { fieldName, value, expectedCurrentValue: expectedCurrentValue == null ? "" : expectedCurrentValue };
    const payloadJson = JSON.stringify(payload), sourceEventId = String(expectedSourceEventId || "").trim();
    if (sourceEventId && !/^EV-[A-Za-z0-9_-]{8,100}$/.test(sourceEventId)) {
        throw new Error("La versión fuente del rango de años no es válida.");
    }
    const canonical = JSON.stringify({ vehicleId: cleanVehicleId, opId, payload, actorId, sourceEventId });
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, canonical, Utilities.Charset.UTF_8);
    const operationHash = digest.map(value => ("0" + (value & 255).toString(16)).slice(-2)).join("");
    const ledger = getSpreadsheet().getSheetByName("AportesVehiculo");
    if (!ledger) throw new Error("AportesVehiculo no existe; no se modificó el rango del catálogo.");
    const headers = ["eventId", "opId", "vehicleId", "operationHash", "kind", "payloadJson",
        "actorId", "actorName", "createdAt", "status", "supersedesEventId"];
    if (ledger.getLastColumn() < headers.length || ledger.getLastRow() < 1) {
        throw new Error("AportesVehiculo tiene un esquema incompleto; no se modificó el rango del catálogo.");
    }
    const actual = ledger.getRange(1, 1, 1, headers.length).getDisplayValues()[0]
        .map(value => String(value || "").trim());
    if (headers.some((header, index) => actual[index] !== header)) {
        throw new Error("El esquema AportesVehiculo no coincide; no se modificó el rango del catálogo.");
    }
    const lastRow = ledger.getLastRow();
    const existingMatches = lastRow > 1
        ? ledger.getRange(2, 2, lastRow - 1, 1)
            .createTextFinder(opId).matchCase(true).matchEntireCell(true).findAll()
        : [];
    const existing = existingMatches.map(match => ({
        rowIndex: match.getRow(),
        row: ledger.getRange(match.getRow(), 1, 1, headers.length).getValues()[0]
    }));
    if (existing.length) {
        const canonicalRows = existing.filter(entry => String(entry.row[3] || "").trim().toLowerCase() === operationHash &&
            String(entry.row[2] || "").trim() === cleanVehicleId && String(entry.row[4] || "") === "vehicle_update" &&
            String(entry.row[5] || "") === payloadJson && String(entry.row[6] || "") === actorId &&
            String(entry.row[10] || "").trim() === sourceEventId);
        if (canonicalRows.length !== existing.length) {
            throw new Error("La operación de ampliación de año ya existe con contenido distinto; requiere revisión.");
        }
        return { eventId: String(canonicalRows[0].row[0] || ""), opId, duplicate: true };
    }
    const eventId = "EV-" + String(Utilities.getUuid()).replace(/-/g, "");
    const createdAt = new Date().toISOString();
    ledger.appendRow([eventId, opId, cleanVehicleId, operationHash, "vehicle_update", payloadJson,
        actorId, actorName, createdAt, "accepted", sourceEventId]);
    SpreadsheetApp.flush();
    const savedMatches = ledger.getLastRow() > 1
        ? ledger.getRange(2, 1, ledger.getLastRow() - 1, 1)
            .createTextFinder(eventId).matchCase(true).matchEntireCell(true).findAll()
        : [];
    const savedRows = savedMatches.map(match =>
        ledger.getRange(match.getRow(), 1, 1, headers.length).getValues()[0]
    );
    const saved = savedRows.length === 1 ? savedRows[0] : null;
    if (!saved || String(saved[1] || "") !== opId || String(saved[2] || "") !== cleanVehicleId ||
        String(saved[3] || "").trim().toLowerCase() !== operationHash || String(saved[4] || "") !== "vehicle_update" ||
        String(saved[5] || "") !== payloadJson || String(saved[6] || "") !== actorId ||
        String(saved[10] || "").trim() !== sourceEventId) {
        const pending = new Error("No se pudo confirmar el evento de ampliación. Reintenta con la misma operación.");
        pending.code = "FEEDBACK_YEAR_APPEND_UNCONFIRMED";
        throw pending;
    }
    return { eventId, opId, duplicate: false };
}

function completeFeedbackYearApplication_(application, context) {
    const { cortesSheet, vehicleRowIndex, userId, userName } = context;
    const row = application.row;
    const operationId = String(row[0] || "").trim();
    const previousFrom = Number(row[3]), previousTo = Number(row[4]);
    const targetFrom = Number(row[5]), targetTo = Number(row[6]);
    const year = Number(row[2]), voteCount = Number(row[7]);
    const fromChanged = previousFrom !== targetFrom, toChanged = previousTo !== targetTo;
    if (fromChanged === toChanged || targetFrom !== Math.min(previousFrom, year) ||
        targetTo !== Math.max(previousTo, year)) {
        throw new Error("La aplicación pendiente no describe una ampliación válida; requiere revisión manual.");
    }
    const rawExpectedFrom = row[12] === undefined || row[12] === null ? previousFrom : row[12];
    const sourceExpectedFrom = String(row[13] || "");
    const rawExpectedTo = row[14] === undefined || row[14] === null ? (fromChanged ? "" : previousTo) : row[14];
    const sourceExpectedTo = String(row[15] || "");
    const operation = { row };
    if (fromChanged) {
        if (String(rawExpectedTo == null ? "" : rawExpectedTo).trim() === "") {
            appendFeedbackYearVehicleUpdateEvent_(operation, row[1], "anoHasta", previousTo, rawExpectedTo, sourceExpectedTo);
        }
        appendFeedbackYearVehicleUpdateEvent_(operation, row[1], "anoDesde", targetFrom, rawExpectedFrom, sourceExpectedFrom);
    } else if (toChanged) {
        appendFeedbackYearVehicleUpdateEvent_(operation, row[1], "anoHasta", targetTo, rawExpectedTo, sourceExpectedTo);
    }
    const projectedBaseRow = cortesSheet.getRange(
        vehicleRowIndex, 1, 1, cortesSheet.getLastColumn()
    ).getValues()[0];
    const projectedRange = getFeedbackProjectedVehicleYearSnapshot_(String(row[1]), projectedBaseRow);
    if (Number(projectedRange.anoDesde) !== targetFrom || Number(projectedRange.anoHasta) !== targetTo) {
        appendFeedbackYearApplicationEvent_(operationId, "requires_review", {
            vehicleId: String(row[1]), targetFrom, targetTo,
            projectedFrom: Number(projectedRange.anoDesde), projectedTo: Number(projectedRange.anoHasta)
        });
        return {
            status: "warning", recovered: false, candidateReviewPending: true,
            _catalogResetRequest: true,
            message: "La ampliación quedó registrada en AportesVehiculo, pero otra versión del rango prevalece. El evento se conserva como candidato para revisión ADMIN; el catálogo no se anunció como actualizado."
        };
    }
    const expectedImageUrl = String(cortesSheet.getRange(vehicleRowIndex, COLS_CORTES.imagenVehiculo).getValue() || "");
    let activityLogRequest = null;
    const activityAttempted = application.activityAttempted === true ||
        row[9] === true || String(row[9]).toUpperCase() === "TRUE";
    if (!activityAttempted) {
        appendFeedbackYearApplicationEvent_(operationId, "activity_attempted", {
            vehicleId: String(row[1]), activityType: "apply_year_suggestion"
        });
        activityLogRequest = {
            userId, userName, activityType: "apply_year_suggestion", associatedId: String(row[1]),
            details: "Rango actualizado a " + targetFrom + "-" + targetTo +
                " basado en " + voteCount + " aportantes distintos para el año " + year + "."
        };
        row[9] = true;
    }
    // Los votos son registros históricos inmutables. La aplicación se consulta
    // mediante su operationId determinista y sus eventos vehicle_update; no se
    // renombra ni reescribe la clave del aportante al completar la ampliación.
    appendFeedbackYearApplicationEvent_(operationId, "completed", {
        vehicleId: String(row[1]), targetFrom, targetTo, year
    });
    const eventSheet = getFeedbackYearApplicationEventsSheet_(false);
    const eventRows = eventSheet && eventSheet.getLastRow() > 1
        ? eventSheet.getRange(2, 1, eventSheet.getLastRow() - 1, 5).getValues() : [];
    if (!getFeedbackYearApplicationEventState_(operationId, eventRows).completed) {
        throw new Error("No se pudo confirmar el cierre de la aplicación de año; permanece pendiente.");
    }
    return {
        status: "success", recovered: false, folderSyncWarning: false,
        _activityLogRequest: activityLogRequest, _folderSyncRequest: {
            sheet: cortesSheet, rowNumber: vehicleRowIndex, vehicleId: String(row[1]), expectedImageUrl
        },
        _catalogResetRequest: true,
        message: "¡Gracias! Con " + voteCount + " aportantes distintos, el catálogo se ha actualizado a " +
            targetFrom + "-" + targetTo + "."
    };
}
function yearRangesOverlapInclusive_(startA, endA, startB, endB) {
    const aStart = Number(startA), aEnd = Number(endA);
    const bStart = Number(startB), bEnd = Number(endB);
    if (![aStart, aEnd, bStart, bEnd].every(Number.isFinite) ||
        aEnd < aStart || bEnd < bStart) return false;
    return aStart <= bEnd && aEnd >= bStart;
}

function handleSuggestYearLocked(payload) {
    const { vehicleId, newYear, response, userId, userName, suggestionActorKey } = payload || {};
    const normalizedVehicleId = String(vehicleId || "").trim();
    const normalizedResponse = String(response || "").trim();
    const actorKey = String(suggestionActorKey || "").trim();

    if (!normalizedVehicleId || !userId || !userName || !actorKey) throw new Error("Faltan datos verificados para registrar la sugerencia de año.");
    const isAnonymousActor = String(userId) === "0" && actorKey === "anon:unverified";
    const isVerifiedActor = actorKey === "user:" + String(userId);
    if (!isAnonymousActor && !isVerifiedActor) throw new Error("La identidad del aportante no coincide con la sesión validada.");
    if (isAnonymousActor) enforceFeedbackRateLimit_("anonymous_year_suggestion", 30, 3600);

    const yearText = String(newYear === null || newYear === undefined ? "" : newYear).trim();
    if (!/^\d{4}$/.test(yearText)) throw new Error("El año debe contener exactamente cuatro dígitos.");
    const year = Number(yearText);
    if (year < 1980 || year > 2099) throw new Error("El año proporcionado no es válido.");

    const otherYearMatch = normalizedResponse.match(/^Otro año:\s*(\d{4})$/);
    const allowedResponses = [
        "Sí (Funciona)", "Modelo confirmado", "No funciona", "No",
        "Es más antiguo", "No útil (Viejo)"
    ];
    if (!allowedResponses.includes(normalizedResponse) && !otherYearMatch) {
        throw new Error("La respuesta de validación no es reconocida.");
    }
    if (otherYearMatch && Number(otherYearMatch[1]) !== year) {
        throw new Error("El año de la respuesta no coincide con el año enviado.");
    }

    const cortesSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    if (!cortesSheet) throw new Error("Hoja Cortes no encontrada.");
    const allCortesData = cortesSheet.getDataRange().getValues().slice(1);
    const matchingVehicleIndexes = [];
    allCortesData.forEach((row, index) => {
        if (String(row[COLS_CORTES.id - 1] || "").trim() === normalizedVehicleId) matchingVehicleIndexes.push(index);
    });
    if (matchingVehicleIndexes.length === 0) throw new Error("Vehículo no encontrado para registrar la sugerencia.");
    if (matchingVehicleIndexes.length > 1) throw new Error("El vehículo tiene un ID duplicado; no se registró la sugerencia de año.");
    const vehicleRowIndex = matchingVehicleIndexes[0];
    const vehicleRow = allCortesData[vehicleRowIndex];
    const parseCatalogYear = value => {
        const text = String(value === null || value === undefined ? "" : value).trim();
        if (!/^[0-9]{4}$/.test(text)) return NaN;
        const parsed = Number(text);
        return parsed >= 1980 && parsed <= 2099 ? parsed : NaN;
    };
    const yearSnapshot = getFeedbackProjectedVehicleYearSnapshot_(normalizedVehicleId, vehicleRow);
    vehicleRow[COLS_CORTES.anoDesde - 1] = yearSnapshot.rawFrom;
    vehicleRow[COLS_CORTES.anoHasta - 1] = yearSnapshot.rawTo;
    const rawAnoDesde = yearSnapshot.rawFrom;
    const rawAnoHasta = yearSnapshot.rawTo;
    const anoDesde = parseCatalogYear(yearSnapshot.anoDesde);
    const anoHasta = parseCatalogYear(yearSnapshot.anoHasta);
    if (!Number.isFinite(anoDesde) || !Number.isFinite(anoHasta) || anoHasta < anoDesde) {
        throw new Error("El rango de años del vehículo es inválido; no se registró la sugerencia.");
    }

    const sheet = getSafeSheet(SHEET_NAMES.SUGERENCIAS_ANO);
    if (!sheet) throw new Error("Hoja Feedbacks no encontrada.");
    const actorColumn = ensureSuggestionActorColumn(sheet);

    let problema = "Sugerencia de año: " + year;
    let respuestaText = "La información funciona para el año " + year;
    let isPositive = false;
    if (normalizedResponse === "Sí (Funciona)") {
        problema = "Confirmación de funcionamiento para año " + year;
        respuestaText = "La información funciona para el año " + year + ".";
        isPositive = true;
    } else if (otherYearMatch) {
        problema = "Sugerencia de ampliar rango al año " + year;
        respuestaText = "La información funciona para el año " + year + ".";
        isPositive = true;
    } else if (normalizedResponse === "Es más antiguo") {
        problema = "Sugerencia de ampliar rango inferior al año " + year;
        respuestaText = "El usuario indicó que corresponde a un modelo anterior.";
        isPositive = true;
    } else if (normalizedResponse === "No funciona") {
        problema = "Reporte de información no funcional";
        respuestaText = "La información no funciona para el año " + year + ". El usuario fue dirigido para agregar un nuevo corte.";
    } else if (normalizedResponse === "No") {
        problema = "Reporte de información no funcional";
        respuestaText = "El usuario indicó que la información no fue útil.";
    } else if (normalizedResponse === "Modelo confirmado") {
        problema = "Modelo sin generaciones recientes registradas";
        respuestaText = "El usuario confirmó que se trata de una generación más reciente.";
        isPositive = true;
    } else if (normalizedResponse === "No útil (Viejo)") {
        problema = "Modelo sin generaciones recientes registradas";
        respuestaText = "El usuario indicó que la información no fue útil.";
    }

    const existingData = sheet.getDataRange().getValues().slice(1);
    const matchesActorAndSuggestion = row =>
        String(row[COLS_FEEDBACKS.ID_vehiculo - 1] || "").trim() === normalizedVehicleId &&
        Number(row[COLS_FEEDBACKS.anoSugerido - 1]) === year;
    const pendingApplication = findPendingFeedbackYearApplication_(normalizedVehicleId);
    if (pendingApplication) {
        const pendingYear = Number(pendingApplication.row[2]);
        const recovered = completeFeedbackYearApplication_(pendingApplication, {
            cortesSheet,
            vehicleRowIndex: vehicleRowIndex + 2,
            feedbackSheet: sheet,
            actorColumn,
            parseCatalogYear,
            userId,
            userName
        });
        const appliedActorKey = getAppliedSuggestionActorKey_(actorKey);
        const currentActorAlreadyReported = existingData.some(row =>
            matchesActorAndSuggestion(row) &&
            [actorKey, appliedActorKey].includes(String(row[actorColumn - 1] || "").trim())
        );
        if (pendingYear !== year || !currentActorAlreadyReported) {
            const message = pendingYear !== year
                ? "Se recuperó la ampliación pendiente del año " + pendingYear +
                    ". La sugerencia para el año " + year + " no se registró; vuelve a enviarla."
                : "Se recuperó la ampliación pendiente del año " + pendingYear +
                    ". Tu respuesta para ese año no se registró; vuelve a enviarla.";
            return { ...recovered, status: "info", recovered: true, recorded: false, message };
        }
        return {
            ...recovered,
            recovered: true,
            recorded: false,
            message: "Se recuperó una ampliación pendiente. " + recovered.message
        };
    }

    const alreadyApplied = existingData.some(row =>
        matchesActorAndSuggestion(row) &&
        String(row[actorColumn - 1] || "").trim() === getAppliedSuggestionActorKey_(actorKey)
    );
    if (alreadyApplied) {
        return { status: "info", recorded: false, message: "Esta sugerencia ya fue atendida; no se registró nuevamente." };
    }
    const alreadyReported = existingData.some(row =>
        matchesActorAndSuggestion(row) &&
        String(row[actorColumn - 1] || "").trim() === actorKey
    );

    let allData = existingData;
    if (!alreadyReported) {
        // Una fila completa por appendRow evita que dos solicitudes concurrentes
        // compartan getLastRow() y mezclen ID, respuesta y actor en filas distintas.
        const lastCol = Math.max(sheet.getLastColumn(), actorColumn, 9);
        const voteRow = new Array(lastCol).fill("");
        voteRow[COLS_FEEDBACKS.ID - 1] = getNextFormulaBasedId_(sheet, COLS_FEEDBACKS.ID);
        voteRow[COLS_FEEDBACKS.Usuario - 1] = userName;
        voteRow[COLS_FEEDBACKS.ID_vehiculo - 1] = normalizedVehicleId;
        voteRow[COLS_FEEDBACKS.Problema - 1] = problema;
        voteRow[COLS_FEEDBACKS.Respuesta - 1] = respuestaText;
        voteRow[COLS_FEEDBACKS.anoSugerido - 1] = year;
        voteRow[actorColumn - 1] = actorKey;
        sheet.appendRow(voteRow);
        SpreadsheetApp.flush();
        // Solo el append nuevo requiere una lectura posterior para incluir votos concurrentes.
        allData = sheet.getDataRange().getValues().slice(1);
        logUserActivity(userId, userName, "suggest_year", normalizedVehicleId,
            "Año sugerido: " + year + ". Respuesta: " + normalizedResponse);
    }
    const voteCount = countVerifiedPositiveYearSuggestionVotes_(allData, normalizedVehicleId, year, actorColumn);

    if (!isPositive) {
        return alreadyReported
            ? { status: "info", recorded: false, message: "Ya existe una respuesta de este aportante para ese vehículo y año; no se duplicó." }
            : { status: "success", message: "Respuesta registrada correctamente." };
    }
    const hasVerifiedPositiveVote = allData.some(row =>
        matchesActorAndSuggestion(row) &&
        String(row[actorColumn - 1] || "").trim() === actorKey &&
        isVerifiedSuggestionActorKey_(actorKey) &&
        isPositiveYearSuggestionRow(row)
    );
    if (alreadyReported && !hasVerifiedPositiveVote) {
        return {
            status: "info",
            recorded: false,
            message: "Ya existe una respuesta de este aportante para ese vehículo y año; no se modificó ni se contó como voto positivo."
        };
    }
    if (isAnonymousActor) {
        return { status: "info", recorded: true, message: "La sugerencia anónima quedó registrada para revisión manual; no cuenta para modificar automáticamente el catálogo." };
    }
    if (voteCount < YEAR_SUGGESTION_VOTE_THRESHOLD_) {
        const prefix = alreadyReported ? "Tu aporte ya estaba registrado." : "Sugerencia registrada.";
        return { status: "success", message: prefix + " Votos de usuarios verificados: " + voteCount + "/3." };
    }

    if (year >= anoDesde && year <= anoHasta) {
        return { status: "info", recorded: true, message: "El año " + year + " ya está dentro del rango actual." };
    }

    const normalizeIdentity = value => String(value === null || value === undefined ? "" : value)
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
    const marca = normalizeIdentity(vehicleRow[COLS_CORTES.marca - 1]);
    const modelo = normalizeIdentity(vehicleRow[COLS_CORTES.modelo - 1]);
    const categoria = normalizeIdentity(vehicleRow[COLS_CORTES.categoria - 1]);
    const tipoEncendido = normalizeIdentity(vehicleRow[COLS_CORTES.tipoEncendido - 1]);
    const normalizeV = value => (value || "").toString().toLowerCase()
        .replace(/[^a-z0-9]/g, " ").split(/\s+/).filter(Boolean).sort().join(" ");
    const versionNormalizada = normalizeV(vehicleRow[COLS_CORTES.versionesAplicables - 1]);
    const proposedAnoDesde = Math.min(year, anoDesde);
    const proposedAnoHasta = Math.max(year, anoHasta);

    for (const row of allCortesData) {
        if (String(row[COLS_CORTES.id - 1] || "").trim() === normalizedVehicleId) continue;
        const otherMarca = normalizeIdentity(row[COLS_CORTES.marca - 1]);
        const otherModelo = normalizeIdentity(row[COLS_CORTES.modelo - 1]);
        const otherCategoria = normalizeIdentity(row[COLS_CORTES.categoria - 1]);
        const otherTipoEncendido = normalizeIdentity(row[COLS_CORTES.tipoEncendido - 1]);
        const otherVersion = normalizeV(row[COLS_CORTES.versionesAplicables - 1]);
        if (otherMarca === marca && otherModelo === modelo && otherCategoria === categoria &&
            otherTipoEncendido === tipoEncendido && otherVersion === versionNormalizada) {
            const otherAnoDesde = parseCatalogYear(row[COLS_CORTES.anoDesde - 1]);
            const rawOtherAnoHasta = row[COLS_CORTES.anoHasta - 1];
            const otherAnoHasta = String(rawOtherAnoHasta === null || rawOtherAnoHasta === undefined ? "" : rawOtherAnoHasta).trim() === "" ? otherAnoDesde : parseCatalogYear(rawOtherAnoHasta);
            if (!Number.isFinite(otherAnoDesde) || !Number.isFinite(otherAnoHasta) || otherAnoHasta < otherAnoDesde) {
                if (!alreadyReported) {
                    logUserActivity(userId, userName, "suggest_year_range_review", normalizedVehicleId,
                        "La generación coincidente con ID " + row[COLS_CORTES.id - 1] + " tiene un rango de años inválido; se requiere revisión manual.");
                }
                return { status: "warning", message: "No se pudo validar la separación entre generaciones porque otra fila coincidente tiene un rango de años inválido. Se requiere revisión manual." };
            }
            if (yearRangesOverlapInclusive_(proposedAnoDesde, proposedAnoHasta, otherAnoDesde, otherAnoHasta)) {
                if (!alreadyReported) {
                    logUserActivity(userId, userName, "suggest_year_collision", normalizedVehicleId,
                        "Rango propuesto " + proposedAnoDesde + "-" + proposedAnoHasta +
                        " se superpone con rango de vehículo ID " + row[COLS_CORTES.id - 1] +
                        " (" + otherAnoDesde + "-" + otherAnoHasta + ")");
                }
                return {
                    status: "warning",
                    message: "La ampliación del rango " + proposedAnoDesde + "-" + proposedAnoHasta +
                        " se superpone con otra generación registrada (" + otherAnoDesde + "-" + otherAnoHasta +
                        "). Se requiere revisión manual."
                };
            }
        }
    }

    let newAnoDesde = anoDesde, newAnoHasta = anoHasta, updated = false;
    if (year < anoDesde) { newAnoDesde = year; updated = true; }
    if (year > anoHasta) { newAnoHasta = year; updated = true; }

    if (updated) {
        const ledger = getFeedbackYearApplicationsSheet_(true);
        const operationId = buildFeedbackYearApplicationId_({
            vehicleId: normalizedVehicleId, year, previousFrom: anoDesde, previousTo: anoHasta,
            targetFrom: newAnoDesde, targetTo: newAnoHasta,
            previousRawFrom: rawAnoDesde, previousSourceFromEventId: yearSnapshot.sourceFrom,
            previousRawTo: rawAnoHasta, previousSourceToEventId: yearSnapshot.sourceTo
        });
        const createdAt = new Date().toISOString();
        const applicationValues = [
            operationId, normalizedVehicleId, year, anoDesde, anoHasta,
            newAnoDesde, newAnoHasta, voteCount, "pending", false, createdAt, createdAt,
            rawAnoDesde, yearSnapshot.sourceFrom, rawAnoHasta, yearSnapshot.sourceTo
        ];
        ledger.appendRow(applicationValues);
        SpreadsheetApp.flush();
        const applicationLastRow = ledger.getLastRow();
        const applicationMatches = applicationLastRow > 1
            ? ledger.getRange(2, 1, applicationLastRow - 1, 1)
                .createTextFinder(operationId).matchCase(true).matchEntireCell(true).findAll()
            : [];
        const savedApplications = applicationMatches.map(match => ({
            rowIndex: match.getRow(),
            row: ledger.getRange(match.getRow(), 1, 1, 16).getValues()[0]
        }));
        if (savedApplications.length !== 1 ||
            String(savedApplications[0].row[8] || "") !== "pending") {
            throw new Error("No se pudo confirmar un registro único de recuperación de la ampliación; el catálogo no fue modificado.");
        }
        const application = {
            sheet: ledger,
            rowIndex: savedApplications[0].rowIndex,
            rowIndexes: savedApplications.map(entry => entry.rowIndex),
            row: savedApplications[0].row
        };
        return completeFeedbackYearApplication_(application, {
            cortesSheet,
            vehicleRowIndex: vehicleRowIndex + 2,
            feedbackSheet: sheet,
            actorColumn,
            parseCatalogYear,
            userId,
            userName
        });
    }
    return { status: "info", message: "No se realizaron cambios." };
}
function logUserActivity(userId, userName, activityType, associatedId, details) {
    try {
        const sheet = getSafeSheet(SHEET_NAMES.ACTIVIDAD_USUARIO);
        if (!sheet) {
            Logger.log("CRITICAL: No se encontró la hoja de actividad de usuario: " + SHEET_NAMES.ACTIVIDAD_USUARIO);
            return;
        }
        const pattern = getFormulaBasedIdPattern_(sheet, COLS_ACTIVIDAD_USUARIO.id);
        const row = [
            pattern.formula,
            new Date().toISOString(),
            userId,
            userName,
            activityType,
            associatedId,
            details
        ];
        // appendRow reserva la fila y escribe el ID por fórmula en una sola operación;
        // no calcula lastRow para después escribir celdas que otra ejecución podría ocupar.
        sheet.appendRow(row);
        SpreadsheetApp.flush();
    } catch (e) {
        Logger.log("CRITICAL: Fallo al registrar actividad de usuario. Error: " + e.message);
    }
}

function ensureFeedbackLikesSheet_() {
    const headers = ["actorKey", "vehicleId", "corteIndex", "previousCount", "targetCount", "status", "createdAt"];
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("FeedbackLikes");
    if (!sheet) { try { sheet = ss.insertSheet("FeedbackLikes"); } catch (createError) { sheet = ss.getSheetByName("FeedbackLikes"); if (!sheet) throw createError; } }
    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        SpreadsheetApp.flush();
    }
    const actual = sheet.getRange(1, 1, 1, headers.length).getValues()[0].map(value => String(value || "").trim());
    if (headers.some((header, index) => actual[index] !== header)) throw new Error("El esquema de FeedbackLikes no coincide con el contrato esperado.");

    return sheet;
}
function findFeedbackLikeRowsForActor_(ledger, actorKey, vehicleId, corteIndex) {
    if (!ledger || ledger.getLastRow() < 2) return [];
    const matches = ledger.getRange(2, 1, ledger.getLastRow() - 1, 1).createTextFinder(String(actorKey)).matchCase(true).findAll();
    const rows = [];
    matches.forEach(match => {
        const rowIndex = match.getRow(), row = ledger.getRange(rowIndex, 1, 1, 7).getValues()[0];
        if (String(row[0] || "").trim() === String(actorKey) && String(row[1] || "").trim() === String(vehicleId) && Number(row[2]) === Number(corteIndex)) rows.push({ row, rowIndex });
    });
    return rows;
}
function getFeedbackLikeEventCount_(ledger, vehicleId, corteIndex) {
    if (!ledger || ledger.getLastRow() < 2) return 0;
    const matches = ledger.getRange(2, 2, ledger.getLastRow() - 1, 1).createTextFinder(String(vehicleId)).matchCase(true).matchEntireCell(true).findAll();
    const actors = new Set();
    matches.forEach(match => {
        const row = ledger.getRange(match.getRow(), 1, 1, 7).getValues()[0];
        if (String(row[1] || "").trim() !== String(vehicleId) || Number(row[2]) !== Number(corteIndex) || String(row[5] || "") !== "event") return;
        const actorKey = String(row[0] || "").trim();
        if (!/^user:[A-Za-z0-9._@-]{1,200}$/.test(actorKey)) throw new Error("FeedbackLikes contiene un evento con actorKey inválido.");
        actors.add(actorKey);
    });
    return actors.size;
}
function getFeedbackLikeCountWithEvents_(cuts, vehicle, ledger, vehicleId, corteIndex, utilCol) {
    const raw = cuts.getRange(vehicle.rowIndex, utilCol).getValue();
    const base = raw === "" || raw === null || raw === undefined ? 0 : Number(raw);
    if (!Number.isSafeInteger(base) || base < 0) throw new Error("El contador de likes del corte no es un entero válido; requiere revisión.");
    return base + getFeedbackLikeEventCount_(ledger, vehicleId, corteIndex);
}
function readLikeActorReplaySnapshot_(actorKey, vehicleId, corteIndex) {
    try {
        const ledger = getSpreadsheet().getSheetByName("FeedbackLikes");
        if (!ledger || ledger.getLastRow() < 2 || ledger.getLastColumn() < 7) return null;
        const expected = ["actorKey", "vehicleId", "corteIndex", "previousCount", "targetCount", "status", "createdAt"];
        const headers = ledger.getRange(1, 1, 1, 7).getValues()[0].map(value => String(value || "").trim());
        if (expected.some((header, index) => headers[index] !== header)) return null;
        return { ledger, rows: findFeedbackLikeRowsForActor_(ledger, actorKey, vehicleId, corteIndex) };
    } catch (error) {
        return null;
    }
}

function findLikeEventReplayNoop_(cuts, vehicle, actorKey, vehicleId, corteIndex, utilCol, replaySnapshot) {
    try {
        const snapshot = replaySnapshot === undefined
            ? readLikeActorReplaySnapshot_(actorKey, vehicleId, corteIndex)
            : replaySnapshot;
        if (!snapshot || !snapshot.rows.some(item => String(item.row[5] || "") === "event")) return null;
        return { status: "success", alreadyLiked: true,
            likeCount: getFeedbackLikeCountWithEvents_(cuts, vehicle, snapshot.ledger, vehicleId, corteIndex, utilCol),
            message: "Este usuario ya había registrado su like." };
    } catch (error) { return null; }
}

function logLikeActivityAfterAppend_(userId, userName, vehicleId, corteIndex, likeCount) {
    try { logUserActivity(userId, userName, "like", vehicleId, "Like en corte " + corteIndex + ". Nuevo total: " + likeCount); }
    catch (logError) { console.error(logError); }
}

function findFeedbackVehicleRowForLike_(sheet, vehicleId) {
    const id = String(vehicleId || "").trim();
    if (!sheet || !id) throw new Error("No se pudo localizar el vehículo para registrar el like.");
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error("No se encontró el vehículo.");
    const matches = sheet.getRange(2, COLS_CORTES.id, lastRow - 1, 1)
        .createTextFinder(id).matchCase(true).findAll();
    const exact = matches.filter(match =>
        String(sheet.getRange(match.getRow(), COLS_CORTES.id).getValue() || "").trim() === id
    );
    if (exact.length !== 1) {
        throw new Error(exact.length
            ? "El vehículo tiene un ID duplicado; no se registró el like."
            : "No se encontró el vehículo.");
    }
    const rowIndex = exact[0].getRow();
    const row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (String(row[COLS_CORTES.id - 1] || "").trim() !== id) {
        throw new Error("El vehículo cambió durante la localización; no se registró el like.");
    }
    return { row, rowIndex };
}
function findCompletedLikeReplayNoop_(cuts, vehicle, actorKey, vehicleId, corteIndex, utilCol, replaySnapshot) {
    try {
        const snapshot = replaySnapshot === undefined
            ? readLikeActorReplaySnapshot_(actorKey, vehicleId, corteIndex)
            : replaySnapshot;
        if (!snapshot || snapshot.rows.length !== 1 ||
            String(snapshot.rows[0].row[5] || "") !== "completed") return null;
        const ledger = snapshot.ledger;
        const rawCount = cuts.getRange(vehicle.rowIndex, utilCol).getValue();
        const currentCount = rawCount === "" || rawCount === null || rawCount === undefined ? 0 : Number(rawCount);
        if (!Number.isSafeInteger(currentCount) || currentCount < 0) return null;
        return {
            status: "success", alreadyLiked: true, likeCount: currentCount + getFeedbackLikeEventCount_(ledger, vehicleId, corteIndex),
            message: "Este usuario ya había registrado su like."
        };
    } catch (error) {
        // El preflight es best-effort y de solo lectura; el flujo protegido conserva el resultado autoritativo.
        return null;
    }
}

function handleRecordLike(payload) {
    const vehicleId = String(payload && payload.vehicleId || "").trim();
    const corteIndex = Number(payload && payload.corteIndex);
    const userId = String(payload && payload.userId || "").trim();
    const userName = String(payload && payload.userName || "").trim();
    if (!vehicleId || !userId || !userName || !Number.isInteger(corteIndex) || corteIndex < 1 || corteIndex > 3) throw new Error("Faltan datos verificados para registrar el like.");
    const actorKey = "user:" + userId;
    const cuts = getSafeSheet(SHEET_NAMES.CORTES);
    if (!cuts) throw new Error("Hoja Cortes no encontrada.");
    const typeCol = COLS_CORTES["tipoCorte" + corteIndex], utilCol = COLS_CORTES["utilCorte" + corteIndex];
    const vehicle = findFeedbackVehicleRowForLike_(cuts, vehicleId);
    if (!typeCol || !utilCol || !String(vehicle.row[typeCol - 1] || "").trim()) throw new Error("El corte seleccionado no existe en el vehículo.");

    const replaySnapshot = readLikeActorReplaySnapshot_(actorKey, vehicleId, corteIndex);
    const completedReplay = findCompletedLikeReplayNoop_(cuts, vehicle, actorKey, vehicleId, corteIndex, utilCol, replaySnapshot);
    if (completedReplay) return completedReplay;
    const eventReplay = findLikeEventReplayNoop_(cuts, vehicle, actorKey, vehicleId, corteIndex, utilCol, replaySnapshot);
    if (eventReplay) return eventReplay;

    const ledger = replaySnapshot ? replaySnapshot.ledger : ensureFeedbackLikesSheet_();
    const existingRows = replaySnapshot
        ? replaySnapshot.rows
        : findFeedbackLikeRowsForActor_(ledger, actorKey, vehicleId, corteIndex);
    if (existingRows.some(item => String(item.row[5] || "") === "event")) {
        return { status: "success", alreadyLiked: true,
            likeCount: getFeedbackLikeCountWithEvents_(cuts, vehicle, ledger, vehicleId, corteIndex, utilCol),
            message: "Este usuario ya había registrado su like." };
    }
    if (existingRows.length > 1) throw new Error("El like tiene registros duplicados en FeedbackLikes; requiere revisión.");

    const rawCount = cuts.getRange(vehicle.rowIndex, utilCol).getValue();
    const currentCount = rawCount === "" || rawCount === null || rawCount === undefined ? 0 : Number(rawCount);
    if (!Number.isSafeInteger(currentCount) || currentCount < 0) throw new Error("El contador de likes del corte no es un entero válido; requiere revisión.");

    if (existingRows.length === 1) {
        const pending = existingRows[0].row;
        if (String(pending[5] || "") !== "pending") throw new Error("El registro previo del like tiene un estado desconocido.");
        const previous = Number(pending[3]), target = Number(pending[4]);
        if (!Number.isSafeInteger(previous) || previous < 0 || !Number.isSafeInteger(target) || target !== previous + 1) {
            throw new Error("El registro pendiente del like tiene contadores inválidos.");
        }
        if (currentCount === target) {
            return { status: "success", alreadyLiked: true,
                likeCount: getFeedbackLikeCountWithEvents_(cuts, vehicle, ledger, vehicleId, corteIndex, utilCol),
                message: "El like pendiente ya estaba reflejado en el contador." };
        }
        if (currentCount !== previous) throw new Error("El contador cambió fuera del intento pendiente; requiere reconciliación manual.");
        // El intento antiguo no alcanzó a incrementar Cortes. Se completa como evento,
        // sin mutar el contador ni cambiar el estado histórico pending.
        ledger.appendRow([actorKey, vehicleId, corteIndex, 0, 0, "event", new Date().toISOString()]);
        SpreadsheetApp.flush();
        const recovered = findLikeEventReplayNoop_(cuts, vehicle, actorKey, vehicleId, corteIndex, utilCol);
        if (!recovered) throw new Error("No se pudo confirmar la recuperación append-only del like pendiente.");
        logLikeActivityAfterAppend_(userId, userName, vehicleId, corteIndex, recovered.likeCount);
        return { status: "success", recovered: true, alreadyLiked: false, likeCount: recovered.likeCount,
            message: "Like pendiente recuperado como evento append-only." };
    }

    // Una acción ordinaria solo anexa el evento. Los contadores se proyectan desde
    // actores únicos en CATALOG; appendRow permite concurrencia sin lock global.
    ledger.appendRow([actorKey, vehicleId, corteIndex, 0, 0, "event", new Date().toISOString()]);
    SpreadsheetApp.flush();
    const committed = findLikeEventReplayNoop_(cuts, vehicle, actorKey, vehicleId, corteIndex, utilCol);
    if (!committed) throw new Error("No se pudo confirmar el evento append-only del like.");
    logLikeActivityAfterAppend_(userId, userName, vehicleId, corteIndex, committed.likeCount);
    return { status: "success", alreadyLiked: false, likeCount: committed.likeCount, message: "Like registrado correctamente." };
}

function findFeedbackRowById_(sheet, feedbackId, lastColumn) {
    const id = String(feedbackId || "").trim();
    const lastRow = sheet ? sheet.getLastRow() : 0;
    if (!id || lastRow < 2) return null;
    const matches = sheet.getRange(2, COLS_FEEDBACKS.ID, lastRow - 1, 1)
        .createTextFinder(id).matchCase(true).matchEntireCell(true).findAll();
    const exact = [];
    matches.forEach(match => {
        const rowIndex = match.getRow();
        const storedId = String(sheet.getRange(rowIndex, COLS_FEEDBACKS.ID).getValue() || "").trim();
        if (storedId !== id) return;
        exact.push({ rowIndex, row: sheet.getRange(rowIndex, 1, 1,
            Math.max(1, Number(lastColumn) || sheet.getLastColumn())).getValues()[0] });
    });
    if (exact.length > 1) throw new Error("El ID físico reservado aparece duplicado en Feedbacks; requiere revisión.");
    return exact[0] || null;
}

function findReportByReportId_(sheet, reportId, metadataColumn, imageEventsIndex) {
    const id = String(reportId || "").trim();
    const lastRow = sheet ? sheet.getLastRow() : 0;
    if (!id || !metadataColumn || lastRow < 2) return null;
    const lastColumn = Math.max(metadataColumn, COLS_FEEDBACKS.Problema);
    const candidates = sheet.getRange(2, metadataColumn, lastRow - 1, 1)
        .createTextFinder(id).matchCase(true).findAll();
    const matches = [];
    candidates.forEach(candidate => {
        const rowIndex = candidate.getRow();
        const rawMetadata = sheet.getRange(rowIndex, metadataColumn).getValue();
        let metadata = null;
        try {
            const parsed = JSON.parse(String(rawMetadata || ""));
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) metadata = parsed;
        } catch (error) {}
        if (!metadata || String(metadata.reportId || "") !== id) return;
        const imageMetadata = getFeedbackReportImageMetadata_(id, metadata, imageEventsIndex);
        if (imageMetadata) Object.assign(metadata, imageMetadata);
        const row = sheet.getRange(rowIndex, 1, 1, lastColumn).getValues()[0];
        matches.push({ rowIndex, row, metadata });
    });
    if (matches.length > 1) {
        const canonical = matches[0];
        const canonicalImageSha256 = String(canonical.metadata.imageSha256 || "");
        const sameLogicalReport = matches.every(item => {
            return String(item.row[COLS_FEEDBACKS.Usuario - 1] || "") === String(canonical.row[COLS_FEEDBACKS.Usuario - 1] || "") &&
                String(item.row[COLS_FEEDBACKS.ID_vehiculo - 1] || "") === String(canonical.row[COLS_FEEDBACKS.ID_vehiculo - 1] || "") &&
                String(item.row[COLS_FEEDBACKS.Problema - 1] || "") === String(canonical.row[COLS_FEEDBACKS.Problema - 1] || "") &&
                String(item.metadata.userId || "") === String(canonical.metadata.userId || "") &&
                String(item.metadata.vehicleId || "") === String(canonical.metadata.vehicleId || "") &&
                Number(item.metadata.corteIndex) === Number(canonical.metadata.corteIndex) &&
                item.metadata.activaTestigoMotor === canonical.metadata.activaTestigoMotor &&
                String(item.metadata.category || "") === String(canonical.metadata.category || "") &&
                String(item.metadata.subject || "") === String(canonical.metadata.subject || "") &&
                String(item.metadata.imageSha256 || "") === canonicalImageSha256;
        });
        if (!sameLogicalReport) throw new Error("El identificador del reporte tiene filas duplicadas con contenido contradictorio; requiere revisión.");
        canonical.duplicateCount = matches.length - 1;
    }
    return matches[0] || null;
}

const FEEDBACK_REPORT_IMAGE_EVENTS_SHEET = "FeedbackReportImageEvents";
const FEEDBACK_REPORT_IMAGE_EVENT_HEADERS = [
    "eventId", "reportId", "userId", "imageFileId", "imageUrl",
    "imageName", "imageMimeType", "imageSize", "imageSha256", "createdAt"
];

function ensureFeedbackReportImageEventsSheet_() {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(FEEDBACK_REPORT_IMAGE_EVENTS_SHEET);
    if (!sheet) {
        try { sheet = ss.insertSheet(FEEDBACK_REPORT_IMAGE_EVENTS_SHEET); }
        catch (error) {
            sheet = ss.getSheetByName(FEEDBACK_REPORT_IMAGE_EVENTS_SHEET);
            if (!sheet) throw error;
        }
    }
    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, FEEDBACK_REPORT_IMAGE_EVENT_HEADERS.length)
            .setValues([FEEDBACK_REPORT_IMAGE_EVENT_HEADERS]);
        SpreadsheetApp.flush();
    }
    const headers = sheet.getRange(1, 1, 1, FEEDBACK_REPORT_IMAGE_EVENT_HEADERS.length)
        .getValues()[0].map(value => String(value || "").trim());
    if (FEEDBACK_REPORT_IMAGE_EVENT_HEADERS.some((value, index) => headers[index] !== value)) {
        throw new Error("El esquema de FeedbackReportImageEvents no coincide con el contrato esperado.");
    }
    return sheet;
}

function readFeedbackReportImageEventsIndex_() {
    const index = new Map();
    const sheet = getSpreadsheet().getSheetByName(FEEDBACK_REPORT_IMAGE_EVENTS_SHEET);
    const lastRow = sheet ? sheet.getLastRow() : 0;
    if (lastRow < 2) return index;
    const rows = sheet.getRange(2, 1, lastRow - 1, FEEDBACK_REPORT_IMAGE_EVENT_HEADERS.length).getValues();
    rows.forEach((row, offset) => {
        const reportId = String(row[1] || "").trim();
        if (!reportId) return;
        const metadata = {
            imageFileId: String(row[3] || "").trim(), imageUrl: String(row[4] || "").trim(),
            imageName: String(row[5] || "").trim(), imageMimeType: String(row[6] || "").trim(),
            imageSize: Number(row[7]), imageSha256: String(row[8] || "").trim().toLowerCase()
        };
        const previous = index.get(reportId);
        if (previous) {
            if (previous.metadata.imageSha256 !== metadata.imageSha256) previous.conflict = true;
            else previous.duplicateCount++;
            return;
        }
        index.set(reportId, { rowNumber: offset + 2, eventId: String(row[0] || "").trim(), metadata, duplicateCount: 0, conflict: false });
    });
    return index;
}

function findFeedbackReportImageEventByReportId_(reportId) {
    const id = String(reportId || "").trim();
    const sheet = getSpreadsheet().getSheetByName(FEEDBACK_REPORT_IMAGE_EVENTS_SHEET);
    if (!id || !sheet || sheet.getLastRow() < 2) return null;
    const candidates = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1)
        .createTextFinder(id).matchCase(true).matchEntireCell(true).findAll();
    const matches = [];
    candidates.forEach(candidate => {
        const rowNumber = candidate.getRow();
        const row = sheet.getRange(rowNumber, 1, 1, FEEDBACK_REPORT_IMAGE_EVENT_HEADERS.length).getValues()[0];
        if (String(row[1] || "").trim() !== id) return;
        matches.push({
            rowNumber,
            eventId: String(row[0] || "").trim(),
            metadata: {
                imageFileId: String(row[3] || "").trim(), imageUrl: String(row[4] || "").trim(),
                imageName: String(row[5] || "").trim(), imageMimeType: String(row[6] || "").trim(),
                imageSize: Number(row[7]), imageSha256: String(row[8] || "").trim().toLowerCase()
            }
        });
    });
    if (!matches.length) return null;
    const canonical = matches[0];
    if (matches.some(item => item.metadata.imageSha256 !== canonical.metadata.imageSha256)) {
        throw new Error("El reporte tiene eventos de imagen contradictorios; requiere reconciliación.");
    }
    canonical.duplicateCount = matches.length - 1;
    return canonical;
}

function isFeedbackReportImageFileReferenced_(fileId) {
    const id = String(fileId || "").trim();
    const sheet = getSpreadsheet().getSheetByName(FEEDBACK_REPORT_IMAGE_EVENTS_SHEET);
    if (!id || !sheet || sheet.getLastRow() < 2) return false;
    const candidates = sheet.getRange(2, 4, sheet.getLastRow() - 1, 1)
        .createTextFinder(id).matchCase(true).matchEntireCell(true).findAll();
    return candidates.some(candidate =>
        String(sheet.getRange(candidate.getRow(), 4).getValue() || "").trim() === id);
}

function getFeedbackReportImageMetadata_(reportId, baseMetadata, imageEventsIndex) {
    const legacy = normalizeReportImageMetadata_(baseMetadata);
    if (legacy) return legacy;
    const id = String(reportId || "").trim();
    if (imageEventsIndex instanceof Map) {
        const event = imageEventsIndex.get(id);
        if (event && event.conflict) throw new Error("El reporte tiene eventos de imagen contradictorios; requiere reconciliación.");
        return event ? event.metadata : null;
    }
    const event = findFeedbackReportImageEventByReportId_(id);
    return event ? event.metadata : null;
}

function appendFeedbackReportImageEvent_(reportId, userId, upload) {
    const id = String(reportId || "").trim();
    if (!id || !upload || !upload.metadata) throw new Error("Faltan datos para asociar la imagen al reporte.");
    const image = upload.metadata;
    const existing = findFeedbackReportImageEventByReportId_(id);
    if (existing) {
        if (existing.metadata.imageSha256 !== image.imageSha256) {
            throw new Error("El reporte ya tiene una imagen distinta asociada; no se reemplazó.");
        }
        if (existing.metadata.imageFileId !== image.imageFileId) trashReportImageUpload_(upload);
        return existing;
    }
    const eventId = "RIMG-" + buildCutSuggestionRequestFingerprint_({
        reportId: id, imageSha256: image.imageSha256
    }).slice(0, 48);
    const sheet = ensureFeedbackReportImageEventsSheet_();
    const row = [eventId, id, String(userId || ""), image.imageFileId, image.imageUrl,
        image.imageName, image.imageMimeType, image.imageSize, image.imageSha256, new Date().toISOString()];
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    // La búsqueda posterior por reportId confirma el append y detecta eventos concurrentes;
    // no hace falta un segundo escaneo independiente de eventId.
    const canonical = findFeedbackReportImageEventByReportId_(id);
    if (!canonical) throw new Error("No se pudo recuperar el evento de imagen del reporte.");
    if (canonical.metadata.imageSha256 !== image.imageSha256) {
        throw new Error("El reporte recibió imágenes concurrentes distintas; se requiere reconciliación.");
    }
    if (canonical.metadata.imageFileId !== image.imageFileId) trashReportImageUpload_(upload);
    return canonical;
}

const REPORT_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
function validateReportImageAttachment_(source) {
    if (source == null) return null;
    if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error("El adjunto de imagen tiene un formato inválido.");
    const dataUrl = String(source.dataUrl || "").trim();
    const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i);
    const mimeType = String(source.mimeType || "").trim().toLowerCase();
    if (!match || match[1].toLowerCase() !== mimeType) throw new Error("El tipo MIME o el contenido Base64 de la imagen no es válido.");
    if (match[2].length > Math.ceil(REPORT_IMAGE_MAX_BYTES / 3) * 4) throw new Error("La imagen supera el tamaño máximo permitido de 3 MB.");
    let bytes;
    try { bytes = Utilities.base64Decode(match[2]); } catch (error) { throw new Error("No se pudo decodificar la imagen adjunta."); }
    if (!bytes || !bytes.length || bytes.length > REPORT_IMAGE_MAX_BYTES) throw new Error("La imagen está vacía o supera el tamaño máximo permitido de 3 MB.");
    if (Utilities.base64Encode(bytes) !== match[2]) throw new Error("La codificación Base64 de la imagen no es canónica.");
    const at = index => Number(bytes[index]) & 255;
    const signatureValid =
        (mimeType === "image/jpeg" && bytes.length >= 3 && at(0) === 255 && at(1) === 216 && at(2) === 255) ||
        (mimeType === "image/png" && bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((v,i)=>at(i)===v)) ||
        (mimeType === "image/webp" && bytes.length >= 12 && String.fromCharCode(at(0),at(1),at(2),at(3)) === "RIFF" && String.fromCharCode(at(8),at(9),at(10),at(11)) === "WEBP");
    if (!signatureValid) throw new Error("El contenido real del archivo no coincide con su tipo de imagen declarado.");
    const declaredSize = Number(source.size);
    if (!Number.isInteger(declaredSize) || declaredSize !== bytes.length) throw new Error("El tamaño declarado de la imagen no coincide con los bytes recibidos.");
    const name = String(source.name || "imagen").replace(/^.*[\\/]/, "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0,120);
    if (!name) throw new Error("El nombre del archivo de imagen no es válido.");
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes);
    const sha256 = Array.from(digest).map(v=>(v&255).toString(16).padStart(2,"0")).join("");
    return { bytes, name, mimeType, size: bytes.length, sha256 };
}
function saveReportImageAttachment_(image, reportId) {
    const extensions = { "image/jpeg":"jpg", "image/png":"png", "image/webp":"webp" };
    const extension = extensions[image.mimeType];
    if (!extension) throw new Error("El formato de imagen no está permitido.");
    const baseName = image.name.replace(/\.[^.]*$/,"").replace(/[^A-Za-z0-9_-]/g,"_").slice(0,60) || "imagen";
    const fileName = String(reportId) + "_" + Date.now() + "_" + baseName + "." + extension;
    const folder = findOrCreateSubFolder(getCortesRootFolder(), "Reportes individuales");
    const file = folder.createFile(Utilities.newBlob(image.bytes,image.mimeType,fileName));
    if (!file) throw new Error("Drive no confirmó la creación de la imagen del reporte.");
    const imageFileId = String(file.getId() || "").trim();
    if (!/^[A-Za-z0-9_-]{10,}$/.test(imageFileId)) {
        try { file.setTrashed(true); } catch (error) {}
        throw new Error("Drive no devolvió un identificador válido para la imagen.");
    }
    return { file, metadata: { imageFileId, imageUrl:"https://drive.google.com/file/d/"+imageFileId+"/view",
        imageName:image.name, imageMimeType:image.mimeType, imageSize:image.size, imageSha256:image.sha256 } };
}
function trashReportImageUpload_(upload) {
    if (!upload || !upload.file) return;
    try { upload.file.setTrashed(true); } catch (error) { console.error("No se pudo retirar una imagen no asociada a un reporte:",error); }
}
function handleReportProblem(payload) {
    payload = payload && typeof payload === "object" ? payload : {};
    const { vehicleId, problemText, userId, userName } = payload;
    if (!vehicleId || !userId || !userName) throw new Error("Faltan datos para reportar el problema (vehicleId, userId, userName).");
    const normalizedProblemText = normalizeFeedbackText_(problemText, "La descripción del reporte", FEEDBACK_REPORT_TEXT_MAX_LENGTH);
    const hasReportContext = payload.reportId !== undefined || payload.corteIndex !== undefined || payload.activaTestigoMotor !== undefined;
    let reportContext = null;
    if (hasReportContext) {
        const reportId = String(payload.reportId || "").trim(), corteIndex = Number(payload.corteIndex);
        if (!/^REP-[A-Za-z0-9_-]{1,80}$/.test(reportId)) throw new Error("El identificador del reporte no tiene un formato válido.");
        if (!Number.isInteger(corteIndex) || corteIndex < 1 || corteIndex > 3) throw new Error("El número de corte no es válido.");
        if (typeof payload.activaTestigoMotor !== "boolean") throw new Error("El indicador del testigo del motor debe ser booleano.");
        reportContext = { reportId, vehicleId: String(vehicleId), corteIndex, activaTestigoMotor: payload.activaTestigoMotor };
    }
    const validTicketCategories = new Set(["incidencia_tecnica", "instalacion", "acceso", "contenido", "otro"]);
    const ticketCategory = String(payload.category === undefined ? "incidencia_tecnica" : payload.category).trim().toLowerCase();
    if (!validTicketCategories.has(ticketCategory)) throw new Error("La categoría del reporte no es válida.");
    const defaultTicketSubject = reportContext
        ? "Reporte técnico de vehículo " + String(vehicleId) + " — Corte #" + String(reportContext.corteIndex)
        : "Reporte en Vehículo #" + String(vehicleId);
    const ticketSubject = normalizeFeedbackText_(payload.subject === undefined || payload.subject === null || payload.subject === ""
        ? defaultTicketSubject : payload.subject, "El asunto del reporte", 200);
    if (!reportContext && (payload.category !== undefined || payload.subject !== undefined)) {
        throw new Error("La categoría y el asunto requieren un reporte individual con identificador.");
    }
    if (reportContext) { reportContext.category = ticketCategory; reportContext.subject = ticketSubject; }
    const imageAttachment = validateReportImageAttachment_(payload.imageAttachment);
    if (imageAttachment && !reportContext) throw new Error("El adjunto requiere un identificador de reporte individual válido.");
    const feedbackSheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
    if (!feedbackSheet) throw new Error("Hoja Feedbacks no encontrada.");

    const matchesRequest = existing => String(existing.row[COLS_FEEDBACKS.Usuario - 1] || "") === String(userName) &&
        String(existing.row[COLS_FEEDBACKS.ID_vehiculo - 1] || "") === String(vehicleId) &&
        String(existing.row[COLS_FEEDBACKS.Problema - 1] || "") === normalizedProblemText &&
        String(existing.metadata.vehicleId || "") === String(vehicleId) &&
        Number(existing.metadata.corteIndex) === reportContext.corteIndex &&
        existing.metadata.activaTestigoMotor === reportContext.activaTestigoMotor &&
        String(existing.metadata.category || "incidencia_tecnica") === reportContext.category &&
        String(existing.metadata.subject || defaultTicketSubject) === reportContext.subject &&
        (!existing.metadata.userId || String(existing.metadata.userId) === String(userId));

    let uploadedImage = null;
    let imageEventAttempted = false;
    try {
        if (reportContext) {
            const existingMetadataColumn = getReportMetadataColumn(feedbackSheet);
            const existing = existingMetadataColumn
                ? findReportByReportId_(feedbackSheet, reportContext.reportId, existingMetadataColumn) : null;
            if (existing) {
                if (!matchesRequest(existing)) throw new Error("El identificador del reporte ya pertenece a un reporte distinto; no se creó otro registro.");
                const oldImage = normalizeReportImageMetadata_(existing.metadata);
                if (imageAttachment && oldImage && oldImage.imageSha256 !== imageAttachment.sha256) {
                    throw new Error("El reporte ya tiene una imagen distinta asociada; no se reemplazó.");
                }
                if (imageAttachment && !oldImage) {
                    uploadedImage = saveReportImageAttachment_(imageAttachment, reportContext.reportId);
                    imageEventAttempted = true;
                    const event = appendFeedbackReportImageEvent_(reportContext.reportId, userId, uploadedImage);
                    uploadedImage = null;
                    return {
                        status: "success", message: "El reporte ya estaba registrado; se asoció la imagen pendiente.",
                        reportId: reportContext.reportId, category: ticketCategory, subject: ticketSubject,
                        alreadyReported: true, imageAttached: true, imageUrl: event.metadata.imageUrl
                    };
                }
                return {
                    status: "success", message: "El reporte ya estaba registrado; se devolvió el identificador existente.",
                    reportId: reportContext.reportId, category: ticketCategory, subject: ticketSubject,
                    alreadyReported: true, imageAttached: Boolean(oldImage && oldImage.imageUrl),
                    imageUrl: oldImage ? oldImage.imageUrl : ""
                };
            }
        }

        const metadataColumn = reportContext ? ensureReportMetadataColumn(feedbackSheet) : 0;
        if (imageAttachment) uploadedImage = saveReportImageAttachment_(imageAttachment, reportContext.reportId);
        const lastRow = feedbackSheet.getLastRow();
        const lastColumn = reportContext
            ? Math.max(feedbackSheet.getLastColumn(), metadataColumn, 8)
            : (feedbackSheet.getLastColumn() || 8);
        if (lastRow >= 2) copyRowPresentationOnly_(feedbackSheet, 2, lastRow + 1, lastColumn);
        const reservedId = getNextFormulaBasedId_(feedbackSheet, COLS_FEEDBACKS.ID);
        const reportRow = new Array(lastColumn).fill("");
        reportRow[COLS_FEEDBACKS.ID - 1] = reservedId;
        reportRow[COLS_FEEDBACKS.Usuario - 1] = userName;
        reportRow[COLS_FEEDBACKS.ID_vehiculo - 1] = vehicleId;
        reportRow[COLS_FEEDBACKS.Problema - 1] = normalizedProblemText;
        if (reportContext) {
            const metadata = {
                reportId: reportContext.reportId, userId: String(userId), vehicleId: String(vehicleId),
                corteIndex: reportContext.corteIndex, activaTestigoMotor: reportContext.activaTestigoMotor,
                category: reportContext.category, subject: reportContext.subject
            };
            reportRow[metadataColumn - 1] = JSON.stringify(metadata);
        }
        feedbackSheet.appendRow(reportRow);
        SpreadsheetApp.flush();
        const persistedRow = findFeedbackRowById_(feedbackSheet, reservedId, lastColumn);
        const savedRow = persistedRow ? persistedRow.row : [];
        if (!persistedRow || String(savedRow[COLS_FEEDBACKS.Usuario - 1] || "") !== String(userName) ||
            String(savedRow[COLS_FEEDBACKS.ID_vehiculo - 1] || "") !== String(vehicleId) ||
            String(savedRow[COLS_FEEDBACKS.Problema - 1] || "") !== normalizedProblemText ||
            (reportContext && String(savedRow[metadataColumn - 1] || "") !== String(reportRow[metadataColumn - 1] || ""))) {
            throw new Error("No se pudo confirmar la fila completa del reporte; se conserva para reconciliación.");
        }

        let canonicalReport = null, duplicateReport = false;
        if (reportContext) {
            canonicalReport = findReportByReportId_(feedbackSheet, reportContext.reportId, metadataColumn);
            if (!canonicalReport || !matchesRequest(canonicalReport)) {
                throw new Error("El reporte persistido no coincide con la identidad lógica solicitada; requiere revisión.");
            }
            duplicateReport = Number(canonicalReport.rowIndex) !== Number(persistedRow.rowIndex);
        }

        let resolvedImageUrl = "";
        if (uploadedImage) {
            imageEventAttempted = true;
            const event = appendFeedbackReportImageEvent_(reportContext.reportId, userId, uploadedImage);
            resolvedImageUrl = event.metadata.imageUrl;
            uploadedImage = null;
        } else if (canonicalReport) {
            const image = normalizeReportImageMetadata_(canonicalReport.metadata);
            resolvedImageUrl = image ? image.imageUrl : "";
        }

        if (!duplicateReport) logUserActivity(userId, userName, "report_problem", vehicleId, normalizedProblemText);
        return {
            status: "success",
            message: duplicateReport ? "El reporte ya estaba registrado; se devolvió el identificador existente." : "Problema reportado.",
            reportId: reportContext ? reportContext.reportId : "REP-" + reservedId,
            category: ticketCategory, subject: ticketSubject, alreadyReported: duplicateReport,
            imageAttached: Boolean(resolvedImageUrl), imageUrl: resolvedImageUrl
        };
    } catch (error) {
        if (uploadedImage) {
            let referenced = false;
            try { referenced = imageEventAttempted && isFeedbackReportImageFileReferenced_(uploadedImage.metadata.imageFileId); }
            catch (lookupError) { referenced = true; }
            if (!referenced) trashReportImageUpload_(uploadedImage);
            else console.error("La imagen del reporte se conserva porque su evento pudo persistir y requiere reconciliación.");
        }
        throw error;
    }
}

function enforceFeedbackRateLimit_(scope, limit, windowSeconds) {
    const cache = CacheService.getScriptCache();
    const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
    const key = "feedback-rate:" + scope + ":" + bucket;
    const current = Number(cache.get(key) || 0);
    if (!Number.isFinite(current) || current < 0) throw new Error("El control de frecuencia no devolvió un estado válido.");
    if (current >= limit) throw new Error("Se alcanzó el límite temporal de solicitudes. Intenta nuevamente más tarde.");
    cache.put(key, String(current + 1), windowSeconds);
}
function handleSendContactForm(payload) {
    const name = String(payload && payload.name || "").trim();
    const email = String(payload && payload.email || "").trim();
    const message = String(payload && payload.message || "").trim();
    if (!name || !email || !message) throw new Error("Faltan datos para enviar el formulario de contacto.");
    if (name.length > 100 || email.length > 254 || message.length > 3000) throw new Error("El formulario de contacto supera la longitud permitida.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("La dirección de correo no tiene un formato válido.");
    enforceFeedbackRateLimit_("public_contact", 10, 3600);
    const sheet = getSafeSheet(SHEET_NAMES.CONTACTANOS);
    if (!sheet) throw new Error("Hoja Contactanos no encontrada.");

    // El lock global solo se usa dentro del asignador para reservar el ID secuencial.
    const contactId = getNextFormulaBasedId_(sheet, COLS_CONTACTANOS.Contacto_ID);
    const lastColumn = Math.max(sheet.getLastColumn() || 6, COLS_CONTACTANOS.ID_usuario_responde);
    const row = Array(lastColumn).fill("");
    row[COLS_CONTACTANOS.Contacto_ID - 1] = contactId;
    row[COLS_CONTACTANOS.User_ID - 1] = "N/A";
    row[COLS_CONTACTANOS.Asunto - 1] = "Contacto de " + name;
    row[COLS_CONTACTANOS.Mensaje - 1] = "De: " + email + "\n\n" + message;
    sheet.appendRow(row);
    SpreadsheetApp.flush();

    const matches = sheet.getRange(2, COLS_CONTACTANOS.Contacto_ID,
        Math.max(1, sheet.getLastRow() - 1), 1)
        .createTextFinder(contactId).matchCase(true).matchEntireCell(true).findAll();
    if (matches.length !== 1) {
        throw new Error(matches.length
            ? "El ID del formulario de contacto quedó duplicado; requiere revisión."
            : "No se pudo confirmar el registro del formulario de contacto.");
    }
    copyRowPresentationOnly_(sheet, 2, matches[0].getRow(), lastColumn);
    return { status: "success", message: "Formulario de contacto enviado." };
}

// ============================================================================
// HANDLERS FOR INBOX SYSTEM
// ============================================================================

const FEEDBACK_REPORT_TEXT_MAX_LENGTH = 2000;
const SUGGESTION_FIELD_MAX_LENGTHS = Object.freeze({
    tipo: 80, ubicacion: 300, colorCable: 120, configRelay: 120
});

function normalizeFeedbackText_(value, label, maxLength) {
    if (typeof value !== "string") throw new Error(label + " debe enviarse como texto.");
    const normalized = value.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").trim();
    if (!normalized) throw new Error(label + " no puede estar vacío.");
    if (normalized.length > maxLength) throw new Error(label + " supera el límite de " + maxLength + " caracteres.");
    return normalized;
}

const INBOX_VIDEO_TITLE_MAX_LENGTH=160,INBOX_VIDEO_DESCRIPTION_MAX_LENGTH=5000,INBOX_VIDEO_USER_MAX_LENGTH=100,INBOX_VIDEO_REFERENCE_MAX_LENGTH=120;
function normalizeInboxText_(value,label,maxLength,allowEmpty){
 if(typeof value!=="string")throw new Error(label+" debe enviarse como texto.");
 const normalized=value.replace(/\u0000/g,"").replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,"").replace(/\r\n?/g,"\n").replace(/[ \t]+/g," ").trim();
 if(!allowEmpty&&!normalized)throw new Error(label+" no puede estar vacío.");
 if(normalized.length>maxLength)throw new Error(label+" supera el límite de "+maxLength+" caracteres.");return normalized;
}
function normalizeInboxStoredText_(value,maxLength,fallback){
 if(typeof value!=="string"&&typeof value!=="number")return fallback||"";
 return String(value).replace(/\u0000/g,"").replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,"").replace(/\r\n?/g,"\n").slice(0,maxLength).trim();
}
function normalizeInboxVideoMetadata_(metadata,contentType){
 if(metadata===undefined||metadata===null)return {};
 if(typeof metadata!=="object"||Array.isArray(metadata))throw new Error("Los metadatos del vídeo deben enviarse como un objeto.");
 const schemas={corte:{marca:100,modelo:120,versionesAplicables:500,anoDesde:4,anoHasta:4,tipoEncendido:100},pys:{alcance:20,problemId:80},tutorial:{tutorialId:120,tema:160}};
 const schema=schemas[String(contentType||"")];if(!schema)throw new Error("No existe un esquema de metadatos para el contenido indicado.");
 const normalized={};
 Object.keys(schema).forEach(key=>{if(!Object.prototype.hasOwnProperty.call(metadata,key)||metadata[key]===null||metadata[key]===undefined)return;const value=metadata[key];if(typeof value!=="string"&&typeof value!=="number")throw new Error("El metadato "+key+" debe ser texto o número.");normalized[key]=normalizeInboxText_(String(value),"El metadato "+key,schema[key],true);});
 if(String(contentType)==="pys"&&Object.prototype.hasOwnProperty.call(metadata,"modelosAsociados")){
  if(!Array.isArray(metadata.modelosAsociados)||metadata.modelosAsociados.length>100)throw new Error("La lista de modelos asociados no es válida.");
  normalized.modelosAsociados=metadata.modelosAsociados.map(value=>{if(typeof value!=="string"&&typeof value!=="number")throw new Error("Cada modelo asociado debe tener un identificador textual.");return normalizeInboxText_(String(value),"El identificador de modelo",80,false);});
 }return normalized;
}
function normalizeInboxVideoUrl_(value,expectedVideoId){const videoId=getPysYouTubeVideoId_(value);if(!videoId||(expectedVideoId&&String(expectedVideoId).trim()!==videoId))return "";return "https://www.youtube.com/watch?v="+videoId;}

function normalizeSuggestionTextField_(value, field, maxLength) {
    if (typeof value !== "string") throw new Error("El campo propuesto " + field + " debe ser texto.");
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length > maxLength) throw new Error("El campo propuesto " + field + " supera el límite de " + maxLength + " caracteres.");
    return normalized;
}

function normalizeSuggestionActivaTestigo(value) {
    if (value === true || value === false) return value;
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized || ["no aplica", "no_aplica", "no aplica / no especificado", "no aplica/no especificado", "no especificado", "no especificada", "n/a", "na"].includes(normalized)) return null;
    if (["true", "sí", "si", "yes", "x", "1"].includes(normalized)) return true;
    if (["false", "no", "0"].includes(normalized)) return false;
    throw new Error("El valor histórico del testigo no es válido.");
}

function normalizeSuggestionActivaTestigoInput_(value) {
    if (value === true || value === false || value === null) return value;
    throw new Error("El valor propuesto para activaTestigo debe ser true, false o null.");
}

function normalizeSuggestionProposedValues(proposedValues) {
    if (proposedValues !== undefined && proposedValues !== null &&
        (typeof proposedValues !== "object" || Array.isArray(proposedValues))) {
        throw new Error("Los valores propuestos deben enviarse como un objeto.");
    }
    const source = proposedValues || {};
    const allowed = ["tipo", "ubicacion", "colorCable", "configRelay", "activaTestigo"];
    Object.keys(source).forEach(key => {
        if (!allowed.includes(key)) throw new Error("El campo propuesto " + key + " no está permitido.");
    });
    const normalized = {};
    Object.keys(SUGGESTION_FIELD_MAX_LENGTHS).forEach(field => {
        if (Object.prototype.hasOwnProperty.call(source, field)) {
            normalized[field] = normalizeSuggestionTextField_(source[field], field, SUGGESTION_FIELD_MAX_LENGTHS[field]);
        }
    });
    if (Object.prototype.hasOwnProperty.call(source, "activaTestigo")) {
        normalized.activaTestigo = normalizeSuggestionActivaTestigoInput_(source.activaTestigo);
    }
    return normalized;
}

function assertMeaningfulSuggestionChanges_(proposedValues, currentValues) {
    const proposed = proposedValues || {};
    const current = currentValues || {};
    const changed = Object.keys(proposed).some(key => {
        if (key === "activaTestigo") return proposed[key] !== current[key];
        return String(proposed[key] == null ? "" : proposed[key]).trim().toLowerCase() !==
            String(current[key] == null ? "" : current[key]).trim().toLowerCase();
    });
    if (!changed) throw new Error("La propuesta no modifica ningún campo del corte. Cambia al menos un valor antes de enviarla.");
    return true;
}
function normalizeStoredSuggestionProposedValues(proposedValues) {
    const source = proposedValues && typeof proposedValues === "object" && !Array.isArray(proposedValues) ? proposedValues : {};
    const normalized = Object.assign({}, source);
    try {
        if (Object.prototype.hasOwnProperty.call(source, "activaTestigo")) normalized.activaTestigo = normalizeSuggestionActivaTestigo(source.activaTestigo);
        else if (Object.prototype.hasOwnProperty.call(source, "activaCheckEngine")) normalized.activaTestigo = normalizeSuggestionActivaTestigo(source.activaCheckEngine);
        else normalized.activaTestigo = null;
    } catch (error) { normalized.activaTestigo = null; }
    delete normalized.activaCheckEngine;
    return normalized;
}
function parseCutSuggestionRecord(rawContent, vehicleId, userName) {
    const content = String(rawContent || "");
    if (!content) return null;
    if (content.trim().startsWith("{")) {
        try {
            const parsed = JSON.parse(content);
            if (parsed && parsed.subType === "suggestion_cut") {
                const parsedVehicleId = String(parsed.vehicleId || vehicleId || "");
                const parsedCorteIndex = Number(parsed.corteIndex);
                if (parsedVehicleId !== String(vehicleId || "") || !Number.isInteger(parsedCorteIndex) || parsedCorteIndex < 1 || parsedCorteIndex > 3) return null;
                return {
                    subType: "suggestion_cut", reportId: String(parsed.reportId || "N/A"),
                    vehicleId: parsedVehicleId, corteIndex: parsedCorteIndex,
                    userId: String(parsed.userId || ""), userName: String(parsed.userName || userName || ""),
                    createdAt: String(parsed.createdAt || ""), imageUrl: String(parsed.imageUrl || ""),
                    details: String(parsed.details || ""),
                    proposedValues: normalizeStoredSuggestionProposedValues(parsed.proposedValues),
                    status: String(parsed.status || "pendiente_revision")
                };
            }
        } catch (error) {}
    }
    if (!content.startsWith("[SUGERENCIA CORTE #")) return null;
    const headerMatch = content.match(/^\[SUGERENCIA CORTE #(\d+)\]\s+\(Reporte Origen: ([^)]+)\)\s+\(Fecha: ([^)]+)\)\s*/);
    const proposedMarker = " | Propuestos: ";
    const proposedMarkerIndex = content.lastIndexOf(proposedMarker);
    if (!headerMatch || proposedMarkerIndex < 0) return null;
    const corteIndex = Number(headerMatch[1]);
    if (!Number.isInteger(corteIndex) || corteIndex < 1 || corteIndex > 3) return null;
    const imageMarker = " | Img:";
    const imageMarkerIndex = content.lastIndexOf(imageMarker);
    const proposedEnd = imageMarkerIndex > proposedMarkerIndex ? imageMarkerIndex : content.length;
    let legacyProposedValues;
    try { legacyProposedValues = JSON.parse(content.slice(proposedMarkerIndex + proposedMarker.length, proposedEnd).trim()); }
    catch (error) { return null; }
    if (!legacyProposedValues || typeof legacyProposedValues !== "object" || Array.isArray(legacyProposedValues)) return null;
    return {
        subType: "suggestion_cut", reportId: String(headerMatch[2] || "N/A"),
        vehicleId: String(vehicleId || ""), corteIndex, userId: "", userName: String(userName || ""),
        createdAt: String(headerMatch[3] || ""),
        imageUrl: imageMarkerIndex > proposedMarkerIndex ? content.slice(imageMarkerIndex + imageMarker.length).trim() : "",
        details: content.slice(headerMatch[0].length, proposedMarkerIndex).trim(),
        proposedValues: normalizeStoredSuggestionProposedValues(legacyProposedValues),
        status: "pendiente_revision"
    };
}
function mapInboxFeedbackRow_(row, reportMetadataColumn, imageEventsIndex) {
 const rawContent=row[COLS_FEEDBACKS.Problema-1],rowVehicleId=normalizeInboxStoredText_(row[COLS_FEEDBACKS.ID_vehiculo-1],120,""),rowUserName=normalizeInboxStoredText_(row[COLS_FEEDBACKS.Usuario-1],INBOX_VIDEO_USER_MAX_LENGTH,"Usuario");
 const reportMetadata=reportMetadataColumn?parseReportMetadata(row[reportMetadataColumn-1],rowVehicleId):null;
 if(reportMetadata){const imageMetadata=getFeedbackReportImageMetadata_(reportMetadata.reportId,reportMetadata,imageEventsIndex);if(imageMetadata)Object.assign(reportMetadata,imageMetadata);}
 let videoMeta=null;
 if(typeof rawContent==="string"&&rawContent.trim().startsWith("{")){try{const parsed=JSON.parse(rawContent);if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed))videoMeta=parsed;}catch(error){}}
 if(videoMeta&&videoMeta.subType==="video_approval"){
  const videoId=normalizeInboxStoredText_(videoMeta.videoId,11,""),videoUrl=normalizeInboxVideoUrl_(videoMeta.videoUrl,videoId);
  const contentType=["corte","pys","tutorial"].includes(String(videoMeta.contentType||""))?String(videoMeta.contentType):"";
  let metadata={};try{metadata=normalizeInboxVideoMetadata_(videoMeta.metadata,contentType);}catch(error){}
  const title=normalizeInboxStoredText_(videoMeta.title,INBOX_VIDEO_TITLE_MAX_LENGTH,"Vídeo sin título"),description=normalizeInboxStoredText_(videoMeta.description,INBOX_VIDEO_DESCRIPTION_MAX_LENGTH,"");
  const status=["pending","approved","rejected"].includes(String(videoMeta.status||""))?String(videoMeta.status):"pending";
  return{type:"video_approval",id:normalizeInboxStoredText_(row[COLS_FEEDBACKS.ID-1],120,""),subject:"[Aprobación de Vídeo] "+title,content:description||"Sin descripción",videoUrl,videoId:videoUrl?videoId:"",contentType,metadata,user:rowUserName,vehicleId:rowVehicleId,approvalStatus:status,rejectionReason:normalizeInboxStoredText_(videoMeta.rejectReason,500,""),reply:normalizeInboxStoredText_(row[COLS_FEEDBACKS.Respuesta-1],5000,""),isResolved:row[COLS_FEEDBACKS["Se resolvio"]-1]===true,responder:normalizeInboxStoredText_(row[COLS_FEEDBACKS.Responde-1],INBOX_VIDEO_USER_MAX_LENGTH,"Admin")};
 }
 const suggestionData=parseCutSuggestionRecord(rawContent,rowVehicleId,rowUserName),isResolved=row[COLS_FEEDBACKS["Se resolvio"]-1]===true;
 if(suggestionData)suggestionData.status=isResolved?"resuelta":"pendiente_revision";
 const reportContent=suggestionData?normalizeInboxStoredText_(suggestionData.details,5000,"Sugerencia de cambio de corte."):normalizeInboxStoredText_(rawContent,5000,"");
 const reportCategory=suggestionData?"contenido":(reportMetadata&&reportMetadata.category||"incidencia_tecnica");
 const reportSubject=suggestionData?"Sugerencia de cambio — Corte #"+String(suggestionData.corteIndex):
  (reportMetadata&&reportMetadata.subject||"Reporte en Vehículo #"+rowVehicleId);
 return{type:"problem_report",id:normalizeInboxStoredText_(row[COLS_FEEDBACKS.ID-1],120,""),subject:reportSubject,category:reportCategory,content:reportContent,user:rowUserName,vehicleId:rowVehicleId,reportMetadata,suggestionData,reply:normalizeInboxStoredText_(row[COLS_FEEDBACKS.Respuesta-1],5000,""),isResolved,responder:normalizeInboxStoredText_(row[COLS_FEEDBACKS.Responde-1],INBOX_VIDEO_USER_MAX_LENGTH,"Admin")};
}
function mapInboxContactRow_(row) {
 return{type:"contact_form",id:normalizeInboxStoredText_(row[COLS_CONTACTANOS.Contacto_ID-1],120,""),subject:normalizeInboxStoredText_(row[COLS_CONTACTANOS.Asunto-1],200,"Mensaje de contacto"),content:normalizeInboxStoredText_(row[COLS_CONTACTANOS.Mensaje-1],5000,""),user:"Formulario de Contacto",vehicleId:null,reply:normalizeInboxStoredText_(row[COLS_CONTACTANOS.Respuesta_mensaje-1],5000,""),isResolved:null,responder:normalizeInboxStoredText_(row[COLS_CONTACTANOS.ID_usuario_responde-1],INBOX_VIDEO_USER_MAX_LENGTH,"Admin")};
}
function readInboxSheetPage_(sheet, offset, count) {
 if(!sheet||count<=0)return[];
 const lastColumn=Math.max(1,Number(sheet.getLastColumn())||1);
 return sheet.getRange(offset+2,1,count,lastColumn).getValues();
}
function isCanonicalFeedbackInboxRow_(sheet, row, rowIndex, reportMetadataColumn, imageEventsIndex, canonicalCache) {
    if (!sheet || !Array.isArray(row)) return true;
    const cache = canonicalCache instanceof Map ? canonicalCache : null;
    const vehicleId = String(row[COLS_FEEDBACKS.ID_vehiculo - 1] || "").trim();
    const userName = String(row[COLS_FEEDBACKS.Usuario - 1] || "").trim();
    const rawProblem = String(row[COLS_FEEDBACKS.Problema - 1] || "");
    const suggestion = parseCutSuggestionRecord(rawProblem, vehicleId, userName);
    if (suggestion) {
        const operationId = String(suggestion.suggestionOperationId || "").trim();
        const reportId = String(suggestion.reportId || "");
        const corteIndex = Number(suggestion.corteIndex);
        const userId = String(suggestion.userId || "");
        const cacheKey = operationId
            ? "suggestion-op:" + operationId
            : "suggestion-request:" + [reportId, vehicleId, corteIndex, userId].join("|");
        let canonical;
        if (cache && cache.has(cacheKey)) canonical = cache.get(cacheKey);
        else {
            canonical = operationId
                ? findCutSuggestionByOperation_(sheet, operationId)
                : findCutSuggestionByRequest_(sheet, reportId, vehicleId, corteIndex, userId);
            if (cache) cache.set(cacheKey, canonical);
        }
        return !canonical || Number(canonical.rowNumber) === Number(rowIndex);
    }
    if (reportMetadataColumn) {
        const metadata = parseReportMetadata(row[reportMetadataColumn - 1], vehicleId);
        if (metadata) {
            const cacheKey = "report:" + String(metadata.reportId || "");
            let canonical;
            if (cache && cache.has(cacheKey)) canonical = cache.get(cacheKey);
            else {
                canonical = findReportByReportId_(sheet, metadata.reportId, reportMetadataColumn, imageEventsIndex);
                if (cache) cache.set(cacheKey, canonical);
            }
            return !canonical || Number(canonical.rowIndex) === Number(rowIndex);
        }
    }
    return true;
}

function handleGetFeedbackItems(payload) {
 const source=payload&&typeof payload==="object"?payload:{};
 const rawCursor=source.cursor===undefined||source.cursor===null||source.cursor===""?"0":String(source.cursor).trim();
 if(!/^\d{1,9}$/.test(rawCursor))throw new Error("El cursor de Inbox no es válido.");
 const offset=Number(rawCursor);
 if(!Number.isSafeInteger(offset)||offset<0)throw new Error("El cursor de Inbox no es válido.");
 const requestedSize=Number(source.pageSize);
 const pageSize=Number.isFinite(requestedSize)?Math.max(1,Math.min(50,Math.floor(requestedSize))):40;
 const feedbackSheet=getSafeSheet(SHEET_NAMES.FEEDBACKS),contactSheet=getSafeSheet(SHEET_NAMES.CONTACTANOS);
 const feedbackCount=feedbackSheet?Math.max(0,feedbackSheet.getLastRow()-1):0;
 const contactCount=contactSheet?Math.max(0,contactSheet.getLastRow()-1):0;
 const total=feedbackCount+contactCount;
 let remaining=pageSize,feedbackRows=[],contactRows=[];
 if(offset<feedbackCount){
  const take=Math.min(remaining,feedbackCount-offset);
  feedbackRows=readInboxSheetPage_(feedbackSheet,offset,take);
  remaining-=feedbackRows.length;
 }
 const contactOffset=Math.max(0,offset-feedbackCount);
 if(remaining>0&&contactOffset<contactCount){
  const take=Math.min(remaining,contactCount-contactOffset);
  contactRows=readInboxSheetPage_(contactSheet,contactOffset,take);
 }
 const reportMetadataColumn=feedbackRows.length?getReportMetadataColumn(feedbackSheet):0;
 const needsImageEventIndex=feedbackRows.some(row=>{
  if(!reportMetadataColumn)return false;
  const vehicleId=normalizeInboxStoredText_(row[COLS_FEEDBACKS.ID_vehiculo-1],120,"");
  const metadata=parseReportMetadata(row[reportMetadataColumn-1],vehicleId);
  return Boolean(metadata&&!normalizeReportImageMetadata_(metadata));
 });
 const imageEventsIndex=needsImageEventIndex?readFeedbackReportImageEventsIndex_():null;
 const actor=payload&&payload.__feedbackActor?payload.__feedbackActor:null;
 const canSeeVideoApprovals=String(actor&&actor.role||"")==="Desarrollador";
 const canonicalCache=new Map();
 const mappedFeedback=feedbackRows
  .filter((row,index)=>isCanonicalFeedbackInboxRow_(feedbackSheet,row,offset+2+index,reportMetadataColumn,imageEventsIndex,canonicalCache))
  .map(row=>mapInboxFeedbackRow_(row,reportMetadataColumn,imageEventsIndex));
 const data=mappedFeedback.filter(item=>canSeeVideoApprovals||item.type!=="video_approval")
  .concat(contactRows.map(mapInboxContactRow_));
 const consumedCount=feedbackRows.length+contactRows.length;
 const nextOffset=offset+consumedCount,hasMore=nextOffset<total;
 return{status:"success",data,nextCursor:hasMore?String(nextOffset):null,hasMore,pageSize,total};
}

function handleGetMyProblemReports(payload) {
    const actor = getFeedbackActor_(payload,null);
    const isTechnician = ["tecnico","tecnico_exterior"].includes(normalizeFeedbackRole(actor.role));
    const source = payload && typeof payload === "object" ? payload : {};
    const cursor = source.cursor === undefined || source.cursor === null ? "" : String(source.cursor).trim();
    if (cursor.length > 120 || cursor.includes("\r") || cursor.includes("\n")) throw new Error("El cursor de tickets no es válido.");
    const requestedSize = Number(source.pageSize);
    const pageSize = Number.isFinite(requestedSize) ? Math.max(1,Math.min(50,Math.floor(requestedSize))) : 40;
    const sheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
    if (!sheet || sheet.getLastRow() < 2) return {status:"success",data:[],nextCursor:null,hasMore:false,pageSize,total:0};
    const metadataColumn = getReportMetadataColumn(sheet);
    const width = Math.max(metadataColumn || 0,9);
    const rows = sheet.getRange(2,1,sheet.getLastRow()-1,width).getValues();
    const ownedEntries = [];
    const seenReportIds = new Set();
    rows.forEach(row => {
        const rawContent = String(row[COLS_FEEDBACKS.Problema-1] || "");
        let videoData = null;
        try { videoData = JSON.parse(rawContent); } catch (error) {}
        if (videoData && videoData.subType === "video_approval") {
            if (isTechnician && String(videoData.createdByUserId || "").trim() === actor.userId) {
                const item = mapInboxFeedbackRow_(row,metadataColumn);
                item._cursor = "video:" + item.id;
                ownedEntries.push({ item });
            }
            return;
        }
        if (!metadataColumn) return;
        const vehicleId = normalizeInboxStoredText_(row[COLS_FEEDBACKS.ID_vehiculo-1],120,"");
        const rawMetadata = String(row[metadataColumn-1] || "");
        let storedMetadata = null;
        try { storedMetadata = JSON.parse(rawMetadata); } catch (error) {}
        if (!storedMetadata || String(storedMetadata.userId || "").trim() !== actor.userId) return;
        const parsedMetadata = parseReportMetadata(rawMetadata,vehicleId);
        if (!parsedMetadata) return;
        if (seenReportIds.has(parsedMetadata.reportId)) return;
        seenReportIds.add(parsedMetadata.reportId);
        ownedEntries.push({
            row,
            cursor: parsedMetadata.reportId
        });
    });
    const needsImageEventIndex = ownedEntries.some(entry => {
        if (!entry.row) return false;
        const vehicleId = normalizeInboxStoredText_(entry.row[COLS_FEEDBACKS.ID_vehiculo-1],120,"");
        const metadata = parseReportMetadata(String(entry.row[metadataColumn-1] || ""), vehicleId);
        return Boolean(metadata && !normalizeReportImageMetadata_(metadata));
    });
    const imageEventsIndex = needsImageEventIndex ? readFeedbackReportImageEventsIndex_() : null;
    const ownedReports = ownedEntries.map(entry => {
        if (entry.item) return entry.item;
        const item = mapInboxFeedbackRow_(entry.row, metadataColumn, imageEventsIndex);
        item._cursor = entry.cursor;
        return item;
    });
    // Se deduplica en orden físico ascendente (first-write-wins) y luego se conserva
    // la presentación más reciente primero para el listado paginado.
    ownedReports.reverse();
    const itemCursor = item => String(item && item._cursor || item && item.reportMetadata && item.reportMetadata.reportId || "");
    let startIndex = 0;
    if (cursor) {
        const anchorIndex = ownedReports.findIndex(item => itemCursor(item) === cursor);
        if (anchorIndex < 0) throw new Error("El cursor de tickets ya no es válido para esta cuenta.");
        startIndex = anchorIndex + 1;
    }
    const data = ownedReports.slice(startIndex,startIndex+pageSize);
    const hasMore = startIndex + data.length < ownedReports.length;
    const nextCursor = hasMore && data.length ? itemCursor(data[data.length-1]) || null : null;
    return {status:"success",data,nextCursor,hasMore,pageSize,total:ownedReports.length};
}

function ensureInboxAuditSheet_() {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(INBOX_AUDIT_SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(INBOX_AUDIT_SHEET_NAME);
    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, INBOX_AUDIT_HEADERS.length).setValues([INBOX_AUDIT_HEADERS]);
        SpreadsheetApp.flush();
    }
    const actual = sheet.getRange(1, 1, 1, INBOX_AUDIT_HEADERS.length).getValues()[0].map(value => String(value || "").trim());
    if (INBOX_AUDIT_HEADERS.some((header,index) => actual[index] !== header)) throw new Error("El esquema de InboxAuditLog no coincide con el contrato esperado.");
    return sheet;
}
function appendInboxAuditEvent_(payload, action, itemType, itemId) {
    const source = payload && typeof payload === "object" ? payload : {};
    const actorId = String(source.userId || "").trim(), actorName = String(source.userName || "").trim();
    const normalizedItemId = String(itemId === null || itemId === undefined ? "" : itemId).trim();
    if (!actorId || !actorName || !action || !itemType || !normalizedItemId) throw new Error("No se puede registrar la operación del Inbox sin identidad y referencia verificadas.");
    const sheet = ensureInboxAuditSheet_();
    const event = [Utilities.getUuid(),new Date().toISOString(),actorId,actorName,String(action),String(itemType),normalizedItemId,
        "Operación "+String(action)+" solicitada para "+String(itemType)+" "+normalizedItemId+" antes de la mutación."];
    const rowNumber = sheet.getLastRow()+1;
    sheet.getRange(rowNumber,1,1,event.length).setValues([event]);
    SpreadsheetApp.flush();
    const persisted = sheet.getRange(rowNumber,1,1,event.length).getValues()[0];
    if (event.some((value,index)=>String(persisted[index])!==String(value))) throw new Error("No se pudo confirmar el evento inmutable del Inbox; la operación no continuará.");
    return {eventId:event[0],timestamp:event[1]};
}


function handleReplyToFeedback(payload) {
    const source=payload&&typeof payload==="object"?payload:{};
    const itemId=String(source.itemId||"").trim(),itemType=String(source.itemType||"").trim();
    const replyText=source.replyText,responderName=String(source.responderName||"").trim();
    if(!itemId||!itemType||!replyText||!responderName)throw new Error("Datos insuficientes para enviar la respuesta.");
    const supportedItemTypes = new Set(["problem_report", "contact_form"]);
    if (!supportedItemTypes.has(itemType)) throw new Error("Tipo de mensaje no compatible para enviar una respuesta.");
    let sheet,idColumn,replyColumn,responderColumn;
    if(itemType==="problem_report"){sheet=getSafeSheet(SHEET_NAMES.FEEDBACKS);idColumn=COLS_FEEDBACKS.ID;replyColumn=COLS_FEEDBACKS.Respuesta;responderColumn=COLS_FEEDBACKS.Responde;}
    else {sheet=getSafeSheet(SHEET_NAMES.CONTACTANOS);idColumn=COLS_CONTACTANOS.Contacto_ID;replyColumn=COLS_CONTACTANOS.Respuesta_mensaje;responderColumn=COLS_CONTACTANOS.ID_usuario_responde;}
    if(!sheet)throw new Error("No se encontró la hoja correspondiente al mensaje.");
    const lastRow=sheet.getLastRow(),ids=lastRow>1?sheet.getRange(2,idColumn,lastRow-1,1).getValues().flat():[],matches=[];
    ids.forEach((id,index)=>{if(String(id===null||id===undefined?"":id).trim()===itemId)matches.push(index+2);});
    if(matches.length!==1)throw new Error(matches.length?"El identificador del Inbox está duplicado; no se respondió.":(itemType==="problem_report"?"No se encontró el reporte de problema.":"No se encontró el mensaje de contacto."));
    appendInboxAuditEvent_(source,"reply",itemType,itemId);
    sheet.getRange(matches[0],replyColumn).setValue(replyText);sheet.getRange(matches[0],responderColumn).setValue(responderName);SpreadsheetApp.flush();
    return {status:"success",message:"Respuesta enviada."};
}
function handleMarkAsResolved(payload) {
    const source=payload&&typeof payload==="object"?payload:{},itemId=String(source.itemId||"").trim();
    if(!itemId)throw new Error("ID del item es requerido.");
    const sheet=getSafeSheet(SHEET_NAMES.FEEDBACKS);if(!sheet)throw new Error("No se encontró la hoja de Feedbacks.");
    const lastRow=sheet.getLastRow(),ids=lastRow>1?sheet.getRange(2,COLS_FEEDBACKS.ID,lastRow-1,1).getValues().flat():[],matches=[];
    ids.forEach((id,index)=>{if(String(id===null||id===undefined?"":id).trim()===itemId)matches.push(index+2);});
    if(matches.length!==1)throw new Error(matches.length?"El identificador del reporte está duplicado; no se modificó.":"No se encontró el reporte de problema para marcar como resuelto.");
    appendInboxAuditEvent_(source,"resolve","problem_report",itemId);
    sheet.getRange(matches[0],COLS_FEEDBACKS["Se resolvio"]).setValue(true);SpreadsheetApp.flush();
    return {status:"success",message:"Reporte marcado como resuelto."};
}



function readActivityDashboardCutsSnapshot_() {
 const sheet=getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES),lastRow=sheet?sheet.getLastRow():0;
 const count=Math.max(0,lastRow-1);
 const slotColumns=[
  {type:COLS_CORTES.tipoCorte1,collaborator:COLS_CORTES.colaboradorCorte1,votes:COLS_CORTES.utilCorte1},
  {type:COLS_CORTES.tipoCorte2,collaborator:COLS_CORTES.colaboradorCorte2,votes:COLS_CORTES.utilCorte2},
  {type:COLS_CORTES.tipoCorte3,collaborator:COLS_CORTES.colaboradorCorte3,votes:COLS_CORTES.utilCorte3}
 ];
 if(!sheet||!count)return{sheet,count:0,baseRows:[],slotColumns,slotValues:[]};
 const baseWidth=Math.max(COLS_CORTES.id,COLS_CORTES.marca,COLS_CORTES.modelo);
 const baseRows=sheet.getRange(2,1,count,baseWidth).getValues();
 const slotValues=slotColumns.map(slot=>sheet.getRange(2,slot.type,count,slot.collaborator-slot.type+1).getValues());
 return{sheet,count,baseRows,slotColumns,slotValues};
}

function buildCutContributionSummary_(cutsSnapshot) {
 const snapshot=cutsSnapshot||readActivityDashboardCutsSnapshot_(),{sheet,count,baseRows=[],slotColumns=[],slotValues=[]}=snapshot||{};
 const ss=getSpreadsheet(),cleanName=value=>String(value||"").replace(/\s*\[OP-[A-Za-z0-9_-]+\]/gi,"").replace(/\s*\([^)]*\)/g," ").replace(/\s+/g," ").trim();
 const keyOf=value=>cleanName(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const usersSheet=ss.getSheetByName("Users"),userRows=usersSheet&&usersSheet.getLastRow()>1?usersSheet.getRange(2,1,usersSheet.getLastRow()-1,Math.max(8,usersSheet.getLastColumn())).getValues():[];
 const idsByName=new Map(),addAlias=(name,id)=>{const clean=cleanName(name),userId=String(id||"").trim();if(!clean||!userId)return;const key=keyOf(clean),ids=idsByName.get(key)||[];if(!ids.includes(userId))ids.push(userId);idsByName.set(key,ids);};
 userRows.forEach(row=>{const id=String(row[0]||"").trim(),username=String(row[1]||"").trim(),fullName=String(row[6]||username).trim();if(!id||!fullName||username.startsWith("__deleted__:"))return;addAlias(fullName,id);addAlias(username,id);});
 const stats=new Map(),resolveId=name=>{const ids=idsByName.get(keyOf(name))||[];return ids.length===1?ids[0]:"";};
 const add=(kind,vehicleId,name,userId)=>{
  const displayName=cleanName(name)||"Comunidad de técnicos",resolvedId=String(userId||"").trim()||resolveId(displayName),key=resolvedId?"user:"+resolvedId:"name:"+keyOf(displayName);
  let entry=stats.get(key);if(!entry){entry={userId:resolvedId,nombreUsuario:displayName,cortesAportados:0,aportesApertura:0,aportesAlimentacion:0,_vehicles:new Set()};stats.set(key,entry);}
  if(kind==="cut")entry.cortesAportados++;else if(kind==="opening")entry.aportesApertura++;else if(kind==="feed")entry.aportesAlimentacion++;
  const id=String(vehicleId||"").trim();if(id)entry._vehicles.add(id);
 };
 let acceptedEvents=[];
 try{
  const ledger=ss.getSheetByName("AportesVehiculo"),lastRow=ledger&&ledger.getLastRow?ledger.getLastRow():0,lastColumn=ledger&&ledger.getLastColumn?ledger.getLastColumn():0;
  if(lastRow>1&&lastColumn>=10){
   const headers=ledger.getRange(1,1,1,10).getValues()[0].map(value=>String(value||"").trim());
   const expected=["eventId","opId","vehicleId","operationHash","kind","payloadJson","actorId","actorName","createdAt","status"];
   if(expected.every((value,index)=>headers[index]===value)){
    const rows=ledger.getRange(2,1,lastRow-1,10).getValues(),byOpId=new Map(),conflicts=new Set();
    rows.forEach((row,index)=>{const opId=String(row[1]||"").trim(),kind=String(row[4]||"").trim().toLowerCase();if(!opId||!["cut","opening","feed"].includes(kind))return;
     const event={eventId:String(row[0]||"").trim(),opId,vehicleId:String(row[2]||"").trim(),hash:String(row[3]||"").toLowerCase(),kind,payloadJson:String(row[5]||""),actorId:String(row[6]||"").trim(),actorName:String(row[7]||"").trim(),status:String(row[9]||"").trim().toLowerCase(),rowIndex:index};
     const previous=byOpId.get(opId);if(previous&&(previous.vehicleId!==event.vehicleId||previous.hash!==event.hash||previous.kind!==event.kind||previous.payloadJson!==event.payloadJson||previous.actorId!==event.actorId||previous.actorName!==event.actorName))conflicts.add(opId);else if(!previous)byOpId.set(opId,event);
    });
    acceptedEvents=Array.from(byOpId.values()).filter(event=>!conflicts.has(event.opId)&&event.eventId&&event.vehicleId&&event.status==="accepted").sort((a,b)=>a.rowIndex-b.rowIndex);
    acceptedEvents.forEach(event=>{if(event.actorId&&event.actorName)addAlias(event.actorName,event.actorId);});
   }else if(typeof Logger!=="undefined"&&Logger.log)Logger.log("Activity Dashboard: esquema AportesVehiculo no reconocido; se muestran solo los cortes históricos.");
  }
 }catch(error){if(typeof Logger!=="undefined"&&Logger.log)Logger.log("Activity Dashboard: no se pudo leer AportesVehiculo: "+String(error&&error.message||error));}
 if(sheet&&Number(count)>0){for(let rowIndex=0;rowIndex<count;rowIndex++){const vehicleId=String(baseRows[rowIndex]&&baseRows[rowIndex][COLS_CORTES.id-1]||"").trim();
  for(let slot=0;slot<slotColumns.length;slot++){const column=slotColumns[slot],values=slotValues[slot]&&slotValues[slot][rowIndex]||[],type=String(values[0]||"").trim();if(!type)continue;
   const name=cleanName(values[column.collaborator-column.type])||"Comunidad de técnicos";add("cut",vehicleId,name,"");}}}
 acceptedEvents.forEach(event=>{if(event.kind==="opening"||event.kind==="feed")add(event.kind,event.vehicleId,event.actorName,event.actorId);});
 return Array.from(stats.values()).map(entry=>({userId:entry.userId,nombreUsuario:entry.nombreUsuario,cortesAportados:entry.cortesAportados,
  aportesApertura:entry.aportesApertura,aportesAlimentacion:entry.aportesAlimentacion,aportesRegistrados:entry.cortesAportados+entry.aportesApertura+entry.aportesAlimentacion,
  vehiculosConAportes:entry._vehicles.size})).sort((x,y)=>y.aportesRegistrados-x.aportesRegistrados||x.nombreUsuario.localeCompare(y.nombreUsuario,"es"));
}

function buildActivityDashboardInsights_(cutsSnapshot) {
 const ss=getSpreadsheet(),snapshot=cutsSnapshot||readActivityDashboardCutsSnapshot_();
 const {sheet:cuts,count,baseRows,slotColumns,slotValues}=snapshot;
 const summary={vehicles:0,cuts:0,usefulVotes:0,notUseful:0,notWorking:0},usefulByCut=new Map(),vehicleNames=new Map();
 if(cuts&&count>0){
  const vehicleIds=new Set();
  baseRows.forEach((base,index)=>{
   const vehicleId=String(base[COLS_CORTES.id-1]||"").trim(),brand=String(base[COLS_CORTES.marca-1]||"").trim(),model=String(base[COLS_CORTES.modelo-1]||"").trim();
   if(vehicleId){vehicleIds.add(vehicleId);vehicleNames.set(vehicleId,{brand,model});}
   for(let slot=0;slot<slotColumns.length;slot++){
    const values=slotValues[slot][index]||[],type=String(values[0]||"").trim();if(!type)continue;summary.cuts++;
    const voteOffset=slotColumns[slot].votes-slotColumns[slot].type,votes=Number(values[voteOffset]),countVotes=Number.isSafeInteger(votes)&&votes>0?votes:0;summary.usefulVotes+=countVotes;
    if(countVotes){const key=[brand,model,type].join("|"),entry=usefulByCut.get(key)||{brand,model,cutType:type,usefulVotes:0};entry.usefulVotes+=countVotes;usefulByCut.set(key,entry);}
   }
  });
  summary.vehicles=vehicleIds.size;
 }
 const feedback=ss.getSheetByName(SHEET_NAMES.FEEDBACKS),feedbackWindow=500;let feedbackRows=[],actorColumn=0,windowLimited=false;
 if(feedback&&feedback.getLastRow()>1){
  const lastColumn=Math.max(9,Math.min(20,feedback.getLastColumn()||9)),headers=feedback.getRange(1,1,1,lastColumn).getValues()[0];
  actorColumn=headers.findIndex(value=>String(value||"").trim()==="suggestionActorKey")+1;
  const lastRow=feedback.getLastRow(),startRow=Math.max(2,lastRow-feedbackWindow+1),rowCount=lastRow-startRow+1;
  feedbackRows=feedback.getRange(startRow,1,rowCount,Math.max(9,actorColumn)).getValues();windowLimited=lastRow-1>feedbackWindow;
 }
 const negativeByVehicle=new Map(),years={confirmations:0,suggestions:0,verified:0,anonymous:0,applied:0};
 feedbackRows.forEach(row=>{
  const problem=String(row[COLS_FEEDBACKS.Problema-1]||""),answer=String(row[COLS_FEEDBACKS.Respuesta-1]||""),vehicleId=String(row[COLS_FEEDBACKS.ID_vehiculo-1]||"").trim();
  const isYear=String(row[COLS_FEEDBACKS.anoSugerido-1]||"").trim()!==""&&Number.isFinite(Number(row[COLS_FEEDBACKS.anoSugerido-1]));
  if(isYear){
   if(/Confirmación de funcionamiento|Modelo sin generaciones recientes registradas/.test(problem)&&/confirmó que se trata de una generación más reciente|funciona para el año/i.test(answer))years.confirmations++;
   if(/Sugerencia de ampliar rango/.test(problem))years.suggestions++;
   if(actorColumn){const actor=String(row[actorColumn-1]||"").trim();if(/^user:[A-Za-z0-9_.-]{1,100}$/.test(actor))years.verified++;else if(actor==="anon:unverified")years.anonymous++;}
  }
  if(/Reporte de información no funcional|Modelo sin generaciones recientes registradas/.test(problem)&&/no fue útil|no funciona/i.test(answer)){
   const key=vehicleId||"sin-id",vehicle=vehicleNames.get(key)||{},entry=negativeByVehicle.get(key)||{brand:vehicle.brand||"",model:vehicle.model||("Vehículo "+(vehicleId||"sin ID")),cutType:"",reports:0,notUseful:0,notWorking:0};
   entry.reports++;if(/no fue útil/i.test(answer)){entry.notUseful++;summary.notUseful++;}if(/no funciona/i.test(answer)){entry.notWorking++;summary.notWorking++;}negativeByVehicle.set(key,entry);
  }
 });
 const applications=ss.getSheetByName("FeedbackYearApplications");
 if(applications&&applications.getLastRow()>1){const last=applications.getLastRow(),start=Math.max(2,last-feedbackWindow+1),rows=applications.getRange(start,1,last-start+1,12).getValues();years.applied=rows.filter(row=>String(row[8]||"").trim()==="completed").length;}
 return{summary,topUseful:Array.from(usefulByCut.values()).sort((a,b)=>b.usefulVotes-a.usefulVotes||a.brand.localeCompare(b.brand,"es")).slice(0,5),
  topNegative:Array.from(negativeByVehicle.values()).sort((a,b)=>b.reports-a.reports||a.model.localeCompare(b.model,"es")).slice(0,5),years,feedbackWindow,windowLimited};
}

function handleRecordVehicleView(payload) {
    const vehicleId = String(payload && payload.vehicleId !== undefined ? payload.vehicleId : "").trim();
    if (!vehicleId || vehicleId.length > 128) throw new Error("El ID del vehículo no es válido.");
    const actor = getFeedbackActor_(payload, null);
    const utilityCounters = {};
    ["utilCorte1", "utilCorte2", "utilCorte3"].forEach(field => {
        const rawValue = payload && payload[field];
        if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") return;
        const numericValue = Number(rawValue);
        if (Number.isFinite(numericValue) && numericValue >= 0) utilityCounters[field] = numericValue;
    });
    // Solo se persisten el ID y los tres contadores solicitados; actor/fecha son confiables del backend.
    logUserActivity(actor.userId, actor.userName, "view_vehicle", vehicleId, JSON.stringify(utilityCounters));
    return { status: "success" };
}

function handleGetActivityLogs(payload) {
 const pageSize=100;
 const readLatestRows=(sheet,columnCount)=>{if(!sheet)return[];const lastRow=sheet.getLastRow();if(lastRow<=1)return[];const startRow=Math.max(2,lastRow-pageSize+1),rowCount=lastRow-startRow+1;return sheet.getRange(startRow,1,rowCount,columnCount).getValues();};
 const result=[];let sequence=0;
 const addEntry=entry=>{const parsedTime=new Date(entry.timestamp).getTime();result.push({...entry,_sortTime:Number.isFinite(parsedTime)?parsedTime:0,_sequence:sequence++});};
 const activitySheet=getSafeSheet(SHEET_NAMES.ACTIVIDAD_USUARIO);
 readLatestRows(activitySheet,COLS_ACTIVIDAD_USUARIO.detalle).forEach(row=>addEntry({
  id:row[COLS_ACTIVIDAD_USUARIO.id-1],timestamp:row[COLS_ACTIVIDAD_USUARIO.timestamp-1],idUsuario:row[COLS_ACTIVIDAD_USUARIO.idUsuario-1],
  nombreUsuario:row[COLS_ACTIVIDAD_USUARIO.nombreUsuario-1],tipoActividad:row[COLS_ACTIVIDAD_USUARIO.tipoActividad-1],idElementoAsociado:row[COLS_ACTIVIDAD_USUARIO.idElementoAsociado-1],detalle:row[COLS_ACTIVIDAD_USUARIO.detalle-1]
 }));
 const auditSheet=getSpreadsheet().getSheetByName(INBOX_AUDIT_SHEET_NAME);
 readLatestRows(auditSheet,INBOX_AUDIT_HEADERS.length).forEach(row=>addEntry({
  id:row[0],timestamp:row[1],idUsuario:row[2],nombreUsuario:row[3],tipoActividad:"inbox_"+String(row[4]||""),idElementoAsociado:row[6],detalle:row[7]
 }));
 result.sort((x,y)=>(y._sortTime-x._sortTime)||(x._sequence-y._sequence));
 const cutsSnapshot=readActivityDashboardCutsSnapshot_();
 return{status:"success",data:result.slice(0,pageSize).map(({_sortTime,_sequence,...entry})=>entry),contributions:buildCutContributionSummary_(cutsSnapshot),insights:buildActivityDashboardInsights_(cutsSnapshot)};
}

/* TAREA 9 (2.3): ALMACENAMIENTO Y GESTIÓN INDEPENDIENTE DE SUGERENCIAS EN FEEDBACKS */
function buildCutSuggestionRequestFingerprint_(request) {
    const source = JSON.stringify({
        reportId: String(request.reportId || ""),
        vehicleId: String(request.vehicleId || ""),
        corteIndex: Number(request.corteIndex),
        userId: String(request.userId || ""),
        details: String(request.details || ""),
        proposedValues: request.proposedValues || {},
        imageSha256: String(request.imageSha256 || "")
    });
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, source);
    return Array.from(digest).map(value => (value & 255).toString(16).padStart(2, "0")).join("");
}

// Solo para reconocer registros creados antes de AUG-080; no se usa en operaciones nuevas.
function buildLegacyCutSuggestionRequestFingerprint_(details, proposedValues, imageDataUrl) {
    const source = JSON.stringify({
        details: String(details || ""),
        proposedValues: proposedValues || {},
        image: String(imageDataUrl || "")
    });
    let hashA = 2166136261, hashB = 2246822519;
    for (let i = 0; i < source.length; i++) {
        const code = source.charCodeAt(i);
        hashA = Math.imul(hashA ^ code, 16777619) >>> 0;
        hashB = Math.imul(hashB ^ (code + i), 3266489917) >>> 0;
    }
    return source.length + ":" + hashA.toString(16) + ":" + hashB.toString(16);
}

function findCutSuggestionByOperation_(sheet, operationId) {
    const id = String(operationId || "").trim();
    const lastRow = sheet ? sheet.getLastRow() : 0;
    if (!id || lastRow < 2) return null;
    const candidates = sheet.getRange(2, COLS_FEEDBACKS.Problema, lastRow - 1, 1)
        .createTextFinder(id).matchCase(true).findAll();
    const matches = [];
    candidates.forEach(candidate => {
        const rowNumber = candidate.getRow();
        const raw = String(sheet.getRange(rowNumber, COLS_FEEDBACKS.Problema).getValue() || "");
        if (!raw) return;
        let record;
        try { record = JSON.parse(raw); }
        catch (error) {
            if (raw.includes('"suggestionOperationId":"' + id + '"')) {
                throw new Error("La operación de sugerencia existe en un registro incompleto; requiere revisión antes de reintentar.");
            }
            return;
        }
        if (record && record.subType === "suggestion_cut" &&
            String(record.suggestionOperationId || "") === id) {
            matches.push({ rowNumber, record });
        }
    });
    if (matches.length > 1) {
        const canonical = matches[0].record;
        const equivalent = matches.every(item =>
            String(item.record.requestFingerprint || "") === String(canonical.requestFingerprint || "") &&
            String(item.record.reportId || "") === String(canonical.reportId || "") &&
            String(item.record.vehicleId || "") === String(canonical.vehicleId || "") &&
            Number(item.record.corteIndex) === Number(canonical.corteIndex) &&
            String(item.record.userId || "") === String(canonical.userId || ""));
        if (!equivalent) throw new Error("El identificador de operación aparece duplicado con contenido contradictorio; requiere revisión.");
        matches[0].duplicateCount = matches.length - 1;
    }
    return matches.length ? matches[0] : null;
}

function buildCutSuggestionReplayResponse_(existing, reportId) {
    return {
        status: "success",
        message: "La sugerencia ya estaba registrada; se devolvió el registro existente.",
        reportId: reportId,
        alreadySuggested: true,
        alreadyProcessed: true,
        suggestionOperationId: String(existing.record.suggestionOperationId || ""),
        imageAttached: Boolean(existing.record.imageUrl),
        imageUrl: String(existing.record.imageUrl || ""),
        suggestionData: existing.record
    };
}

function findCutSuggestionByRequest_(sheet, reportId, vehicleId, corteIndex, userId) {
    const id = String(reportId || "").trim();
    const lastRow = sheet ? sheet.getLastRow() : 0;
    if (!id || !sheet || lastRow < 2 || id === "N/A") return null;
    const candidates = sheet.getRange(2, COLS_FEEDBACKS.Problema, lastRow - 1, 1)
        .createTextFinder(id).matchCase(true).findAll();
    const matches = [];
    candidates.forEach(candidate => {
        const rowNumber = candidate.getRow();
        const raw = String(sheet.getRange(rowNumber, COLS_FEEDBACKS.Problema).getValue() || "");
        if (!raw.trim().startsWith("{")) return;
        let record;
        try { record = JSON.parse(raw); } catch (error) { return; }
        if (!record || record.subType !== "suggestion_cut") return;
        if (String(record.reportId || "N/A") === id &&
            String(record.vehicleId || "").trim() === vehicleId &&
            Number(record.corteIndex) === corteIndex &&
            String(record.userId || "") === userId) {
            matches.push({ rowNumber, record });
        }
    });
    if (matches.length > 1) {
        const canonical = matches[0].record;
        const equivalent = matches.every(item =>
            String(item.record.requestFingerprint || "") === String(canonical.requestFingerprint || "") &&
            String(item.record.reportId || "") === String(canonical.reportId || "") &&
            String(item.record.vehicleId || "") === String(canonical.vehicleId || "") &&
            Number(item.record.corteIndex) === Number(canonical.corteIndex) &&
            String(item.record.userId || "") === String(canonical.userId || ""));
        if (!equivalent) throw new Error("La sugerencia asociada al reporte aparece duplicada con contenido contradictorio; requiere revisión.");
        matches[0].duplicateCount = matches.length - 1;
    }
    return matches.length ? matches[0] : null;
}



function findExistingCutSuggestionForRequest_(sheet, request) {
    request = request && typeof request === "object" ? request : {};
    const operationId = String(request.suggestionOperationId || "").trim();
    const reportId = String(request.reportId || "").trim();
    const vehicleId = String(request.vehicleId || "").trim();
    const corteIndex = Number(request.corteIndex);
    const userId = String(request.userId || "");
    const requestFingerprint = String(request.requestFingerprint || "");
    const legacyRequestFingerprint = String(request.legacyRequestFingerprint || "");

    const existingByOperation = operationId ? findCutSuggestionByOperation_(sheet, operationId) : null;
    if (existingByOperation) {
        const record = existingByOperation.record;
        const sameOperation = String(record.reportId || "") === reportId &&
            String(record.vehicleId || "").trim() === vehicleId &&
            Number(record.corteIndex) === corteIndex &&
            String(record.userId || "") === userId &&
            String(record.requestFingerprint || "") === requestFingerprint;
        if (!sameOperation) throw new Error("El identificador de operación ya pertenece a una solicitud distinta; no se creó otra sugerencia.");
        return existingByOperation;
    }

    const existingByRequest = findCutSuggestionByRequest_(sheet, reportId, vehicleId, corteIndex, userId);
    if (existingByRequest) {
        const storedFingerprint = String(existingByRequest.record.requestFingerprint || "");
        if (storedFingerprint !== requestFingerprint && storedFingerprint !== legacyRequestFingerprint) {
            throw new Error("El reporte ya tiene una sugerencia con datos distintos; no se creó otra sugerencia.");
        }
        return existingByRequest;
    }
    return null;
}

function validateCutSuggestionReportContext_(reportId, vehicleId, corteIndex) {
    const normalizedReportId = String(reportId || "").trim();
    const normalizedVehicleId = String(vehicleId || "").trim();
    const normalizedCorteIndex = Number(corteIndex);
    if (!/^REP-[A-Za-z0-9_-]{1,80}$/.test(normalizedReportId)) {
        throw new Error("Se requiere el identificador real del reporte individual.");
    }
    if (!normalizedVehicleId || !Number.isInteger(normalizedCorteIndex) ||
        normalizedCorteIndex < 1 || normalizedCorteIndex > 3) {
        throw new Error("El vehículo o el número de corte no son válidos.");
    }

    const feedbackSheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
    if (!feedbackSheet) throw new Error("Hoja Feedbacks no encontrada.");
    const metadataColumn = getReportMetadataColumn(feedbackSheet);
    if (!metadataColumn) throw new Error("El reporte no tiene metadata verificable; no se aceptan sugerencias sin asociación real.");
    const report = findReportByReportId_(feedbackSheet, normalizedReportId, metadataColumn);
    if (!report) throw new Error("No existe un reporte individual único con ese identificador.");
    const metadata = report.metadata || {};
    const rowVehicleId = String(report.row[COLS_FEEDBACKS.ID_vehiculo - 1] || "").trim();
    if (String(metadata.reportId || "").trim() !== normalizedReportId ||
        String(metadata.vehicleId || "").trim() !== normalizedVehicleId ||
        rowVehicleId !== normalizedVehicleId ||
        Number(metadata.corteIndex) !== normalizedCorteIndex) {
        throw new Error("El reporte no corresponde al mismo vehículo y corte indicado en la sugerencia.");
    }

    const cutsSheet = getSafeSheet(SHEET_NAMES.CORTES);
    if (!cutsSheet) throw new Error("Hoja Cortes no encontrada.");
    const rows = cutsSheet.getDataRange().getValues();
    const vehicles = [];
    for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][COLS_CORTES.id - 1] || "").trim() === normalizedVehicleId) {
            vehicles.push({ row: rows[i], rowIndex: i + 1 });
        }
    }
    if (vehicles.length !== 1) {
        throw new Error(vehicles.length ? "El vehículo tiene un ID duplicado en el catálogo." : "El vehículo no existe en el catálogo.");
    }
    const vehicle = vehicles[0].row;
    const typeColumn = COLS_CORTES["tipoCorte" + normalizedCorteIndex];
    const locationColumn = COLS_CORTES["ubicacionCorte" + normalizedCorteIndex];
    if (!typeColumn || !locationColumn ||
        !String(vehicle[typeColumn - 1] || "").trim() ||
        !String(vehicle[locationColumn - 1] || "").trim()) {
        throw new Error("El corte indicado no está ocupado e identificado en el catálogo del vehículo.");
    }
    const currentValues = {
        tipo: String(vehicle[typeColumn - 1] || "").trim(),
        ubicacion: String(vehicle[locationColumn - 1] || "").trim(),
        colorCable: String(vehicle[COLS_CORTES["colorCableCorte" + normalizedCorteIndex] - 1] || "").trim(),
        configRelay: String(vehicle[COLS_CORTES["configRelay" + normalizedCorteIndex] - 1] || "").trim(),
        activaTestigo: typeof metadata.activaTestigoMotor === "boolean" ? metadata.activaTestigoMotor : null
    };
    return { reportId: normalizedReportId, vehicleId: normalizedVehicleId, corteIndex: normalizedCorteIndex, currentValues };
}

function normalizeSuggestionImageAttachment_(imageAttachment, legacyImgBase64) {
    if (imageAttachment != null && legacyImgBase64) throw new Error("Envía la imagen de sugerencia en un solo campo.");
    let source = imageAttachment;
    if (source == null && legacyImgBase64) {
        const dataUrl = String(legacyImgBase64).trim();
        const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,/i);
        if (!match) throw new Error("La imagen de sugerencia tiene un formato no permitido.");
        const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
        if (encoded.length > Math.ceil(REPORT_IMAGE_MAX_BYTES / 3) * 4) {
            throw new Error("La imagen supera el tamaño máximo permitido de 3 MB.");
        }
        let bytes;
        try { bytes = Utilities.base64Decode(encoded); }
        catch (error) { throw new Error("No se pudo decodificar la imagen de sugerencia."); }
        source = { dataUrl, mimeType: match[1].toLowerCase(), size: bytes.length, name: "sugerencia" };
    }
    return source == null ? null : validateReportImageAttachment_(source);
}
function saveSuggestionImageAttachment_(image, vehicleId, corteIndex) {
    const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    const extension = extensions[image.mimeType];
    if (!extension) throw new Error("El formato de imagen de sugerencia no está permitido.");
    const baseName = image.name.replace(/\.[^.]*$/, "").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 48) || "sugerencia";
    const fileName = "sug_" + String(vehicleId).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 48) +
        "_corte" + String(corteIndex) + "_" + Date.now() + "_" + baseName + "." + extension;
    const folder = findOrCreateSubFolder(getCortesRootFolder(), "SugerenciasCortes");
    let file = null;
    try {
        file = folder.createFile(Utilities.newBlob(image.bytes, image.mimeType, fileName));
        if (!file) throw new Error("Drive no confirmó la creación de la imagen de sugerencia.");
        if (typeof file.getSharingAccess !== "function") throw new Error("No se pudo verificar el acceso heredado de la imagen de sugerencia.");
        const access = file.getSharingAccess();
        const publicAccess = [DriveApp.Access.ANYONE, DriveApp.Access.ANYONE_WITH_LINK].filter(value => value !== undefined && value !== null);
        if (!access || publicAccess.includes(access)) throw new Error("La carpeta de sugerencias permite acceso público; se rechazó la carga.");
        const imageFileId = String(file.getId() || "").trim();
        if (!/^[A-Za-z0-9_-]{10,}$/.test(imageFileId)) throw new Error("Drive no devolvió un identificador válido para la imagen de sugerencia.");
        return { file, metadata: {
            imageFileId, imageUrl: "https://drive.google.com/file/d/" + imageFileId + "/view",
            imageName: image.name, imageMimeType: image.mimeType, imageSize: image.size, imageSha256: image.sha256
        }};
    } catch (error) {
        if (file) {
            try { file.setTrashed(true); }
            catch (cleanupError) { console.error("No se pudo retirar una imagen de sugerencia sin acceso verificable:", cleanupError); }
        }
        throw error;
    }
}
function handleSuggestCutChange(payload) {
    const { reportId, vehicleId, corteIndex, userId, userName, details, imgBase64, imageAttachment, proposedValues, suggestionOperationId } = payload || {};
    const normalizedVehicleId = String(vehicleId || "").trim();
    const normalizedCorteIndex = Number(corteIndex);
    if (!normalizedVehicleId || !userId || !userName || !Number.isInteger(normalizedCorteIndex) ||
        normalizedCorteIndex < 1 || normalizedCorteIndex > 3) {
        throw new Error("Faltan datos válidos para sugerir cambio (vehicleId, corteIndex 1–3, userId, userName).");
    }
    let normalizedOperationId = String(suggestionOperationId || "").trim();
    if (normalizedOperationId && !/^[A-Za-z0-9_-]{20,80}$/.test(normalizedOperationId)) {
        throw new Error("Identificador de operación de sugerencia inválido.");
    }
    const normalizedProposedValues = normalizeSuggestionProposedValues(proposedValues);
    const normalizedDetails = normalizeFeedbackText_(details, "La justificación de la sugerencia", FEEDBACK_REPORT_TEXT_MAX_LENGTH);
    const reportContext = validateCutSuggestionReportContext_(reportId, normalizedVehicleId, normalizedCorteIndex);
    assertMeaningfulSuggestionChanges_(normalizedProposedValues, reportContext.currentValues);
    const normalizedImage = normalizeSuggestionImageAttachment_(imageAttachment, imgBase64);
    const normalizedReportId = reportContext.reportId;
    const normalizedUserId = String(userId);
    const legacyImageDataUrl = normalizedImage
        ? String(imageAttachment != null ? imageAttachment.dataUrl || "" : imgBase64 || "") : "";
    const requestFingerprint = buildCutSuggestionRequestFingerprint_({
        reportId: normalizedReportId, vehicleId: normalizedVehicleId, corteIndex: normalizedCorteIndex,
        userId: normalizedUserId, details: normalizedDetails, proposedValues: normalizedProposedValues,
        imageSha256: normalizedImage ? normalizedImage.sha256 : ""
    });
    // Compatibilidad: clientes antiguos sin opId reciben una identidad estable derivada del payload.
    if (!normalizedOperationId) normalizedOperationId = "SUG-" + requestFingerprint;
    const legacyRequestFingerprint = buildLegacyCutSuggestionRequestFingerprint_(
        normalizedDetails, normalizedProposedValues, legacyImageDataUrl
    );
    const feedbackSheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
    if (!feedbackSheet) throw new Error("Hoja Feedbacks no encontrada.");
    const replayRequest = {
        suggestionOperationId: normalizedOperationId, reportId: normalizedReportId,
        vehicleId: normalizedVehicleId, corteIndex: normalizedCorteIndex, userId: normalizedUserId,
        requestFingerprint, legacyRequestFingerprint
    };
    // Replays confirmados se resuelven antes de Drive; las carreras se reconcilian
    // después del append usando first-write-wins por la identidad lógica.
    const preflightExisting = findExistingCutSuggestionForRequest_(feedbackSheet, replayRequest);
    if (preflightExisting) return buildCutSuggestionReplayResponse_(preflightExisting, normalizedReportId);

    let uploadedImage = normalizedImage ? saveSuggestionImageAttachment_(normalizedImage, normalizedVehicleId, normalizedCorteIndex) : null;
    let rowCommitted = false, appendAttempted = false, result = null, canonicalReplay = false;
    try {
        const sheet = feedbackSheet;
        const createdAt = new Date().toISOString();
        const lastRow = sheet.getLastRow();
        const FORMULA_ROW = 2, lastCol = Math.max(sheet.getLastColumn() || 8, COLS_FEEDBACKS["Se resolvio"] || 0);
        // La posición anticipada solo prepara formato; la confirmación se hace por ID.
        if (lastRow >= FORMULA_ROW) copyRowPresentationOnly_(sheet, FORMULA_ROW, lastRow + 1, lastCol);
        const reservedId = getNextFormulaBasedId_(sheet, COLS_FEEDBACKS.ID);
        const imageMetadata = uploadedImage ? uploadedImage.metadata : null;
        const suggestionRecord = {
            subType: "suggestion_cut", schemaVersion: 3,
            suggestionOperationId: normalizedOperationId,
            reportId: normalizedReportId,
            vehicleId: normalizedVehicleId, corteIndex: normalizedCorteIndex, userId: normalizedUserId,
            userName: String(userName), createdAt, imageUrl: imageMetadata ? imageMetadata.imageUrl : "",
            imageFileId: imageMetadata ? imageMetadata.imageFileId : "", imageName: imageMetadata ? imageMetadata.imageName : "",
            imageMimeType: imageMetadata ? imageMetadata.imageMimeType : "", imageSize: imageMetadata ? imageMetadata.imageSize : 0,
            imageSha256: imageMetadata ? imageMetadata.imageSha256 : "", details: normalizedDetails,
            proposedValues: normalizedProposedValues, requestFingerprint, status: "pendiente_revision"
        };
        const problemDesc = JSON.stringify(suggestionRecord);
        const suggestionRow = new Array(lastCol).fill("");
        suggestionRow[COLS_FEEDBACKS.ID - 1] = reservedId;
        suggestionRow[COLS_FEEDBACKS.Usuario - 1] = String(userName);
        suggestionRow[COLS_FEEDBACKS.ID_vehiculo - 1] = normalizedVehicleId;
        suggestionRow[COLS_FEEDBACKS.Problema - 1] = problemDesc;
        if (COLS_FEEDBACKS["Se resolvio"]) suggestionRow[COLS_FEEDBACKS["Se resolvio"] - 1] = false;
        appendAttempted = true;
        sheet.appendRow(suggestionRow);
        SpreadsheetApp.flush();
        const persistedRow = findFeedbackRowById_(sheet, reservedId, lastCol);
        const savedRow = persistedRow ? persistedRow.row : [];
        if (!persistedRow || String(savedRow[COLS_FEEDBACKS.ID - 1] || "").trim() !== reservedId ||
            String(savedRow[COLS_FEEDBACKS.Usuario - 1] || "") !== String(userName) ||
            String(savedRow[COLS_FEEDBACKS.ID_vehiculo - 1] || "") !== normalizedVehicleId ||
            String(savedRow[COLS_FEEDBACKS.Problema - 1] || "") !== problemDesc ||
            (COLS_FEEDBACKS["Se resolvio"] && savedRow[COLS_FEEDBACKS["Se resolvio"] - 1] !== false)) {
            throw new Error("No se pudo confirmar la fila completa de la sugerencia; la imagen se conserva para reconciliación.");
        }
        rowCommitted = true;

        // Dos solicitudes simultáneas pueden anexar filas físicas distintas.
        // Solo la primera fila idéntica representa la operación lógica; se limpia
        // la carga de la fila perdedora después de confirmar que no es la canónica.
        const canonical = findExistingCutSuggestionForRequest_(sheet, replayRequest);
        if (!canonical) throw new Error("La sugerencia persistida no pudo recuperarse por su identidad lógica.");
        if (Number(canonical.rowNumber) !== Number(persistedRow.rowIndex)) {
            if (uploadedImage) {
                trashReportImageUpload_(uploadedImage);
                uploadedImage = null;
            }
            result = buildCutSuggestionReplayResponse_(canonical, normalizedReportId);
            canonicalReplay = true;
        } else {
            result = {
                status: "success", message: "Sugerencia de cambio registrada correctamente como propuesta independiente.",
                reportId: normalizedReportId, suggestionOperationId: normalizedOperationId,
                imageAttached: Boolean(imageMetadata),
                imageUrl: imageMetadata ? imageMetadata.imageUrl : "", suggestionData: suggestionRecord
            };
            uploadedImage = null;
        }
    } catch (error) {
        if (!rowCommitted && uploadedImage && !appendAttempted) {
            trashReportImageUpload_(uploadedImage);
        } else if (!rowCommitted && uploadedImage) {
            console.error("La imagen de sugerencia se conserva porque appendRow pudo persistir la referencia y requiere reconciliación.");
        }
        throw error;
    }
    if (!canonicalReplay) logUserActivity(userId, userName, "suggest_cut_change", normalizedVehicleId, JSON.stringify(result.suggestionData));
    return result;
}

function parseModelosAsociados(rawVal) {
    if (rawVal === null || rawVal === undefined) return [];
    if (Array.isArray(rawVal)) return normalizeModelosAsociadosList_(rawVal);
    if (typeof rawVal !== "string" && typeof rawVal !== "number") {
        throw new Error("modelos_asociados tiene un formato incompatible.");
    }
    const str = String(rawVal).trim();
    if (!str) return [];
    if (str.startsWith("[") || str.endsWith("]")) {
        let parsed;
        try {
            parsed = JSON.parse(str);
        } catch (error) {
            throw new Error("modelos_asociados contiene una lista JSON inválida.");
        }
        if (!Array.isArray(parsed)) throw new Error("modelos_asociados debe contener una lista JSON.");
        return normalizeModelosAsociadosList_(parsed);
    }
    return normalizeModelosAsociadosList_(str.split(/[,/\\;]+/));
}

function normalizeModelosAsociadosList_(values) {
    if (!Array.isArray(values)) throw new Error("modelos_asociados debe ser una lista.");
    const normalized = [];
    const seen = new Set();
    values.forEach(value => {
        if (value === null || value === undefined) return;
        if (typeof value !== "string" && typeof value !== "number") {
            throw new Error("modelos_asociados contiene un identificador inválido.");
        }
        const id = String(value).trim();
        if (!id) return;
        if (id.length > 100 || /[,/\\;\[\]"'\u0000-\u001F\u007F]/.test(id)) {
            throw new Error("modelos_asociados contiene un identificador con formato inválido.");
        }
        if (!seen.has(id)) {
            seen.add(id);
            normalized.push(id);
        }
    });
    return normalized;
}

const PYS_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
const PYS_IMAGE_EXTENSIONS = Object.freeze({
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
});

function validatePysImageDataUrl_(value) {
    if (typeof value !== "string" || !value.trim()) throw new Error("La imagen del problema es obligatoria y debe enviarse como Data URL.");
    const match = value.trim().match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i);
    if (!match) throw new Error("La imagen debe ser JPEG, PNG o WebP codificada en Base64.");
    const mimeType = match[1].toLowerCase();
    const base64 = match[2];
    if (!Object.prototype.hasOwnProperty.call(PYS_IMAGE_EXTENSIONS, mimeType)) {
        throw new Error("El formato de imagen no está permitido.");
    }
    if (base64.length > Math.ceil(PYS_IMAGE_MAX_BYTES / 3) * 4) {
        throw new Error("La imagen supera el tamaño máximo permitido de 3 MB.");
    }

    let bytes;
    try {
        bytes = Utilities.base64Decode(base64);
    } catch (error) {
        throw new Error("No se pudo decodificar la imagen del problema.");
    }
    if (!bytes || !bytes.length || bytes.length > PYS_IMAGE_MAX_BYTES) {
        throw new Error("La imagen está vacía o supera el tamaño máximo permitido de 3 MB.");
    }
    if (Utilities.base64Encode(bytes) !== base64) {
        throw new Error("La codificación Base64 de la imagen no es válida o canónica.");
    }

    const byteAt = index => Number(bytes[index]) & 255;
    const signatureValid =
        (mimeType === "image/jpeg" && bytes.length >= 3 &&
            byteAt(0) === 0xff && byteAt(1) === 0xd8 && byteAt(2) === 0xff) ||
        (mimeType === "image/png" && bytes.length >= 8 &&
            [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => byteAt(index) === value)) ||
        (mimeType === "image/webp" && bytes.length >= 12 &&
            String.fromCharCode(byteAt(0), byteAt(1), byteAt(2), byteAt(3)) === "RIFF" &&
            String.fromCharCode(byteAt(8), byteAt(9), byteAt(10), byteAt(11)) === "WEBP");
    if (!signatureValid) {
        throw new Error("La firma binaria de la imagen no coincide con el tipo MIME declarado.");
    }

    return { bytes, mimeType, extension: PYS_IMAGE_EXTENSIONS[mimeType], sizeBytes: bytes.length };
}

function getPysImagesFolder_() {
    const rootFolder = getCortesRootFolder();
    const folder = findOrCreateSubFolder(rootFolder, "Problemas y Soluciones");
    if (!folder || String(folder.getId()) === String(rootFolder.getId()) ||
        getFolderCanonicalName(folder.getName()) !== getFolderCanonicalName("Problemas y Soluciones")) {
        throw new Error("No se pudo verificar la carpeta PyS dentro de la raíz autorizada de GPSpedia.");
    }

    const parents = folder.getParents();
    let isDirectChild = false;
    while (parents.hasNext()) {
        if (String(parents.next().getId()) === String(rootFolder.getId())) isDirectChild = true;
    }
    if (!isDirectChild) throw new Error("La carpeta PyS no pertenece directamente a la raíz autorizada de GPSpedia.");
    return { folder, rootFolder };
}

function assertPysImageFolderPermissions_(file, folder) {
    if (!file || !folder || typeof file.getSharingAccess !== "function" ||
        typeof folder.getSharingAccess !== "function" ||
        typeof file.getSharingPermission !== "function" ||
        typeof folder.getSharingPermission !== "function") {
        throw new Error("No se pudieron verificar los permisos heredados de la carpeta PyS.");
    }
    const folderAccess = String(folder.getSharingAccess());
    const fileAccess = String(file.getSharingAccess());
    const folderPermission = String(folder.getSharingPermission());
    const filePermission = String(file.getSharingPermission());
    if (fileAccess !== folderAccess || filePermission !== folderPermission) {
        throw new Error("El archivo PyS no conserva la política de acceso heredada de su carpeta.");
    }
}

function normalizePysImageReference_(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    let id = "";

    if (/^[A-Za-z0-9_-]{10,110}$/.test(raw)) {
        id = raw;
    } else {
        let match = raw.match(/^https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,110})(?:\/view)?(?:[?#].*)?$/i);
        if (!match) match = raw.match(/^https:\/\/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([A-Za-z0-9_-]{10,110})(?:&[^#]*)?(?:#.*)?$/i);
        if (!match) match = raw.match(/^https:\/\/lh3\.googleusercontent\.com\/d\/([A-Za-z0-9_-]{10,110})(?:=[^\s]*)?$/i);
        if (match) id = match[1];
        else if (/drive\.google\.com|googleusercontent\.com/i.test(raw)) return "";
        else if (/^https:\/\//i.test(raw)) return raw; // Compatibilidad con referencias HTTPS históricas ajenas a Drive.
        else return "";
    }

    return id ? "https://drive.google.com/file/d/" + id + "/view" : "";
}

function findPysImageReferences_(sheet, imageFileId, imageUrl) {
    if (!sheet) throw new Error("No se pudo comprobar la hoja PyS para recuperar la imagen.");
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    const values = sheet.getRange(2, 1, lastRow - 1, Math.max(7, sheet.getLastColumn())).getDisplayValues();
    const matches = [];
    values.forEach((row, index) => {
        const storedUrl = String(row[6] || "").trim();
        const normalizedUrl = normalizePysImageReference_(storedUrl);
        const storedIds = extractDriveFileIds(storedUrl);
        if ((imageUrl && normalizedUrl === imageUrl) || (imageFileId && storedIds.includes(String(imageFileId)))) {
            matches.push({ rowNumber: index + 2, problemId: String(row[0] || "").trim(), imageUrl: storedUrl });
        }
    });
    return matches;
}

function markPysImageForRecovery_(file, problemId, imageFileId, reason) {
    if (!file) return;
    const description = [
        "GPSpedia PyS — RECOVERY_REQUIRED",
        "problemId=" + String(problemId || ""),
        "fileId=" + String(imageFileId || ""),
        "reason=" + String(reason || "No se pudo confirmar la vinculación ni la compensación.").slice(0, 500),
        "updatedAt=" + new Date().toISOString()
    ].join("\n");
    try { file.setDescription(description); }
    catch (error) { console.error("No se pudo registrar metadata de recuperación para la imagen PyS:", error); }
}


const PYS_HEADERS=Object.freeze(["id_problem","Problema","Descripción","Se soluciono","Solucion","Prevenir","Imagen","Video","Colaborador","modelos_asociados"]);
const PYS_OPERATIONS_HEADERS=Object.freeze(["opId","payloadHash","problemId","status","imageFileId","imageUrl","createdAt","updatedAt"]);
const PYS_OPERATION_STATES=Object.freeze(["PENDING","UPLOAD_PENDING","LINKED","RECOVERY_REQUIRED"]);
function validatePysHeaders_(sheet,expected,label){if(sheet.getLastColumn()>expected.length)throw new Error("El esquema de "+label+" contiene columnas adicionales; no se modificó la hoja.");const a=sheet.getRange(1,1,1,expected.length).getDisplayValues()[0];if(expected.some((v,i)=>String(a[i]==null?"":a[i])!==v))throw new Error("Los encabezados/orden de "+label+" no coinciden con el esquema autorizado; no se modificó la hoja.");}
function validatePysRecords_(sheet) {
    const last = sheet.getLastRow(), seen = Object.create(null);
    let max = 0, duplicateRows = 0;
    const rows = last >= 2 ? sheet.getRange(2, 1, last - 1, 10).getValues() : [];
    rows.forEach((row, index) => {
        if (!row.some(value => value !== "" && value !== null && value !== undefined)) return;
        const id = String(row[0] == null ? "" : row[0]).trim(), match = id.match(/^isue-(\d+)$/i);
        if (!match) throw new Error("La fila " + (index + 2) + " de pys contiene un ID vacío o malformado; no se creó el problema.");
        const suffix = Number(match[1]), key = String(suffix);
        if (!Number.isSafeInteger(suffix) || suffix < 1) throw new Error("La fila " + (index + 2) + " de pys contiene un sufijo de ID inválido.");
        if (seen[key]) {
            if (JSON.stringify(seen[key].row) !== JSON.stringify(row)) {
                throw new Error("La hoja pys contiene IDs duplicados con contenido contradictorio; requiere revisión.");
            }
            duplicateRows++;
        } else {
            seen[key] = { rowNumber: index + 2, row: row.slice() };
        }
        max = Math.max(max, suffix);
    });
    return { maxSuffix: max, ids: seen, duplicateRows, rows };
}
function getPysSheet_(createIfMissing, includeSnapshot) {
    let sheet = getSafeSheet("pys");
    if (!sheet) {
        if (!createIfMissing) return includeSnapshot ? { sheet: null, rows: [] } : null;
        sheet = getSpreadsheet().insertSheet("pys");
    }
    if (sheet.getLastRow() === 0 && sheet.getLastColumn() === 0) {
        if (!createIfMissing) return includeSnapshot ? { sheet, rows: [] } : sheet;
        sheet.getRange(1, 1, 1, 10).setValues([PYS_HEADERS.slice()]);
        SpreadsheetApp.flush();
    }
    validatePysHeaders_(sheet, PYS_HEADERS, "pys");
    const validation = validatePysRecords_(sheet);
    return includeSnapshot ? { sheet, rows: validation.rows } : sheet;
}
function readPysOperations_(sheet) {
    const last = sheet.getLastRow();
    if (last < 2) return [];
    const byOperation = new Map(), byProblem = new Map();
    const rows = sheet.getRange(2, 1, last - 1, 8).getValues();
    rows.forEach((row, index) => {
        if (!row.some(value => value !== "" && value !== null && value !== undefined)) return;
        const rowNumber = index + 2;
        const opId = String(row[0] || "").trim(), hash = String(row[1] || "").trim().toLowerCase();
        const problemId = String(row[2] || "").trim(), status = String(row[3] || "").trim();
        const imageFileId = String(row[4] || "").trim(), imageUrl = String(row[5] || "").trim();
        const match = problemId.match(/^isue-(\d+)$/i), suffix = match ? Number(match[1]) : NaN;
        if (!/^[A-Za-z0-9_-]{20,80}$/.test(opId) || !/^[a-f0-9]{64}$/.test(hash) ||
            !match || !Number.isSafeInteger(suffix) || suffix < 1 || !PYS_OPERATION_STATES.includes(status)) {
            throw new Error("La hoja PysOperations contiene una fila incompatible; no se modificó.");
        }
        if ((status === "PENDING" && (imageFileId || imageUrl)) ||
            (["UPLOAD_PENDING", "LINKED"].includes(status) &&
                (!/^[A-Za-z0-9_-]{10,110}$/.test(imageFileId) || imageUrl !== "https://drive.google.com/file/d/" + imageFileId + "/view")) ||
            (Boolean(imageFileId) !== Boolean(imageUrl))) {
            throw new Error("La hoja PysOperations contiene referencias de imagen incompatibles con su estado.");
        }
        const item = { rowNumber, opId, payloadHash: hash, problemId, status, imageFileId, imageUrl,
            createdAt: String(row[6] || ""), updatedAt: String(row[7] || "") };
        if (byOperation.has(opId)) {
            const canonical = byOperation.get(opId);
            if (canonical.payloadHash !== hash) {
                canonical.conflictingPayloadCount = (canonical.conflictingPayloadCount || 0) + 1;
                return;
            }
            canonical.duplicateCount = (canonical.duplicateCount || 0) + 1;
            return;
        }
        const problemKey = String(suffix);
        if (byProblem.has(problemKey)) {
            throw new Error("PysOperations contiene un problemId reservado por operaciones distintas; requiere revisión.");
        }
        byOperation.set(opId, item);
        byProblem.set(problemKey, opId);
    });
    return Array.from(byOperation.values());
}
function getPysOperationsSheet_(){let sheet=getSafeSheet("PysOperations");if(!sheet)sheet=getSpreadsheet().insertSheet("PysOperations");if(sheet.getLastRow()===0&&sheet.getLastColumn()===0){sheet.getRange(1,1,1,8).setValues([PYS_OPERATIONS_HEADERS.slice()]);SpreadsheetApp.flush();}validatePysHeaders_(sheet,PYS_OPERATIONS_HEADERS,"PysOperations");readPysOperations_(sheet);return sheet;}
function writePysOperation_(sheet, rowNumber, record) {
    if (rowNumber) throw new Error("PysOperations es append-only; no se permiten cambios de estado in-place.");
    const values = [record.opId, record.payloadHash, record.problemId, record.status,
        record.imageFileId || "", record.imageUrl || "", record.createdAt, record.updatedAt];
    sheet.appendRow(values);
    SpreadsheetApp.flush();
    const last = sheet.getLastRow();
    const idRange = last > 1 ? sheet.getRange(2, 1, last - 1, 1) : null;
    let candidates = [];
    if (idRange && typeof idRange.createTextFinder === "function") {
        candidates = idRange.createTextFinder(String(record.opId)).matchCase(true).matchEntireCell(true).findAll();
    } else if (idRange) {
        idRange.getValues().forEach((value, index) => {
            if (String(value[0] || "").trim() === String(record.opId)) candidates.push({ getRow: () => index + 2 });
        });
    }
    const matches = [];
    candidates.forEach(candidate => {
        const rowNumber = candidate.getRow();
        const row = sheet.getRange(rowNumber, 1, 1, 8).getValues()[0];
        if (String(row[0] || "").trim() === String(record.opId) &&
            String(row[1] || "").trim().toLowerCase() === String(record.payloadHash).toLowerCase() &&
            String(row[2] || "").trim() === String(record.problemId) &&
            String(row[4] || "").trim() === String(record.imageFileId || "")) matches.push(rowNumber);
    });
    if (!matches.length) throw new Error("No se pudo confirmar la reserva append-only de la operación PyS.");
    return Object.assign({}, record, { rowNumber: matches[0], duplicateReservationCount: matches.length - 1 });
}
function findCanonicalPysRowsById_(sheet, id) {
    const last = sheet ? sheet.getLastRow() : 0, target = String(id || "").trim().toLowerCase();
    if (!target || last < 2) return [];
    const idRange = sheet.getRange(2, 1, last - 1, 1);
    let candidates = [];
    if (idRange && typeof idRange.createTextFinder === "function") {
        candidates = idRange.createTextFinder(target).matchCase(false).findAll();
    } else {
        idRange.getValues().forEach((value, index) => {
            if (String(value[0] || "").trim().toLowerCase().includes(target)) candidates.push({ getRow: () => index + 2 });
        });
    }
    const matches = [];
    candidates.forEach(candidate => {
        const rowNumber = candidate.getRow();
        const storedId = String(sheet.getRange(rowNumber, 1, 1, 1).getValues()[0][0] || "").trim().toLowerCase();
        if (storedId !== target) return;
        const row = sheet.getRange(rowNumber, 1, 1, 10).getValues()[0];
        matches.push({ rowNumber, row });
    });
    if (matches.length > 1) {
        const canonical = matches[0];
        if (matches.some(item => JSON.stringify(item.row) !== JSON.stringify(canonical.row))) {
            throw new Error("El ID del problema PyS tiene filas duplicadas con contenido contradictorio.");
        }
        canonical.duplicateCount = matches.length - 1;
        return [canonical];
    }
    return matches;
}
function findPysRowsById_(sheet, id) {
    const last = sheet ? sheet.getLastRow() : 0, target = String(id || "").trim().toLowerCase();
    if (!target || last < 2) return [];
    const range = sheet.getRange(2, 1, last - 1, 1), candidates = [];
    if (range && typeof range.createTextFinder === "function") {
        candidates.push(...range.createTextFinder(target).matchCase(false).findAll());
    } else {
        range.getValues().forEach((value, index) => {
            if (String(value[0] || "").trim().toLowerCase() === target) candidates.push({ getRow: () => index + 2 });
        });
    }
    const matches = [];
    candidates.forEach(candidate => {
        const rowNumber = candidate.getRow();
        const storedId = String(sheet.getRange(rowNumber, 1, 1, 1).getValues()[0][0] || "").trim().toLowerCase();
        if (storedId !== target) return;
        matches.push({ rowNumber, row: sheet.getRange(rowNumber, 1, 1, 10).getValues()[0] });
    });
    return matches;
}


function getPysNextId_(sheet,ops){let max=validatePysRecords_(sheet).maxSuffix;ops.forEach(o=>{const m=o.problemId.match(/^isue-(\d+)$/i),n=m?Number(m[1]):NaN;if(!Number.isSafeInteger(n)||n<1)throw new Error("La hoja PysOperations contiene un problemId inválido.");max=Math.max(max,n);});if(max>=Number.MAX_SAFE_INTEGER)throw new Error("Se agotó la secuencia segura de identificadores PyS.");return getNextFormulaBasedId_(sheet,1,max);}
function getPysSha256_(v){return Array.from(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,v)).map(b=>(b&255).toString(16).padStart(2,"0")).join("");}
function buildPysPayloadHash_(p,image,models){return getPysSha256_(JSON.stringify({titulo:p.titulo,descripcion:p.descripcion,sinSolucion:Boolean(p.sinSolucion),solucion:p.solucion,prevenir:p.prevenir,userId:String(p.userId).trim(),userName:String(p.userName).trim(),alcance:p.alcance==="especifico"?"especifico":"general",modelosAsociados:models,imageMimeType:image.mimeType,imageSha256:getPysSha256_(image.bytes)}));}
function buildPysExpectedRow_(id,p,url,models){return[id,p.titulo,p.descripcion,p.sinSolucion?"":"x",p.sinSolucion?"":p.solucion,p.prevenir,url,"",p.userName,models.length?JSON.stringify(models):""];}
function pysRowMatchesPayload_(row,expected){return expected.every((v,i)=>String(row[i]==null?"":row[i])===String(v));}
function verifyPendingPysImageFile_(r,image,folder){const file=DriveApp.getFileById(r.imageFileId);if(!file||(typeof file.isTrashed==="function"&&file.isTrashed()===true)||String(file.getMimeType())!==image.mimeType||Number(file.getSize())!==image.sizeBytes||r.imageUrl!=="https://drive.google.com/file/d/"+r.imageFileId+"/view")throw new Error("La imagen pendiente de la operación PyS no coincide con el contenido recibido; requiere revisión.");const d=String(file.getDescription()||"");if(!(d.includes("problemId="+r.problemId)||d.includes("opId="+r.opId))||!d.includes("fileId="+r.imageFileId))throw new Error("Los metadatos de la imagen pendiente PyS no permiten confirmar su asociación.");const parents=file.getParents();let direct=false;while(parents.hasNext())if(String(parents.next().getId())===String(folder.getId()))direct=true;if(!direct)throw new Error("La imagen pendiente no pertenece a la carpeta PyS autorizada.");assertPysImageFolderPermissions_(file,folder);return file;}
function handleGetCatalogChanges(payload) {
    // El feed solo contiene snapshots publicados del catálogo público; no requiere
    // identidad FEEDBACK ni una lease de usuario para una consulta de solo lectura.
    const result = getSharedCatalogChanges_(payload && payload.cursor, payload && payload.limit);
    return result && result.status === "success"
        ? result
        : { status: "error", message: "No se pudo consultar el feed incremental del catálogo." };
}

function handleGetPysData() {
    const snapshot = getPysSheet_(false, true), sheet = snapshot.sheet;
    if (!sheet || !snapshot.rows.length) return { status: "success", data: [] };
    const rows = snapshot.rows;
    const seen = new Set();
    const data = rows.filter(row => {
        if (!row.some(value => value !== "" && value !== null && value !== undefined)) return false;
        const key = String(row[0] || "").trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).map(row => ({
        id_problem: row[0], Problema: row[1], Descripcion: row[2], Se_soluciono: row[3],
        Solucion: row[4], Prevenir: row[5], Imagen: normalizePysImageReference_(row[6]),
        Video: row[7], Colaborador: row[8] || "", modelosAsociados: parseModelosAsociados(row[9] || "")
    }));
    return { status: "success", data };
}

function buildPysCatalogChange_(reference) {
    const sheet = getPysSheet_(false);
    if (!sheet) throw new Error("No se encontró la hoja PyS para publicar el cambio.");
    const matches = findCanonicalPysRowsById_(sheet, reference);
    if (matches.length !== 1) throw new Error(matches.length ? "El ID del problema PyS está duplicado." : "Problema PyS no encontrado.");
    const row = matches[0].row;
    const id = String(row[0] || "").trim();
    if (!/^isue-\d+$/i.test(id)) throw new Error("El problema PyS no tiene un ID persistente compatible con el feed.");
    const snapshot = {
        id_problem: id,
        Problema: row[1] === "" || row[1] === undefined ? null : row[1],
        Descripcion: row[2] === "" || row[2] === undefined ? null : row[2],
        Se_soluciono: row[3] === "" || row[3] === undefined ? null : row[3],
        Solucion: row[4] === "" || row[4] === undefined ? null : row[4],
        Prevenir: row[5] === "" || row[5] === undefined ? null : row[5],
        Imagen: normalizePysImageReference_(row[6]),
        Video: row[7] === "" || row[7] === undefined ? null : row[7],
        Colaborador: row[8] || "",
        modelosAsociados: parseModelosAsociados(row[9] || "")
    };
    return { collection: "pys", recordId: id, operation: "upsert", snapshot: snapshot };
}

function publishPysCatalogChange_(action, reference) {
    return publishFeedbackCatalogChange_(action, () => buildPysCatalogChange_(reference));
}

const PYS_TITLE_MAX_LENGTH=15;
const PYS_DESCRIPTION_MAX_LENGTH=200;
const PYS_SOLUTION_MAX_LENGTH=700;
function sanitizePysRichText_(value) {
 if(value===null||value===undefined)return "";
 const input=String(value).replace(/\r\n?/g,"\n"),allowed=new Set(["b","strong","span","br","p","div","i","em","u","s","strike","ol","ul","li","a","img","small","mark","font"]),voids=new Set(["br","img"]);
 const dropped=new Set(["script","style","iframe","object","embed","svg","math","template","form","textarea","select","option","button","input","meta","link","base","video","audio","source","canvas","applet","noscript"]),voidDropped=new Set(["input","meta","link","base","source","embed"]);
 const markers=new Set(["hyphen","arrow","check","bullet"]),fonts=new Set(["Arial, sans-serif","'Segoe UI', Roboto, sans-serif","'Courier New', monospace","Georgia, serif"]),sizes=new Set(["0.85em","1em","1.2em","1.5em"]),colors=new Set(["red","blue","green","black","white","orange","yellow","gray","grey","purple","teal","navy"]);
 const textSafe=s=>String(s).replace(/&(?!(?:#\d+|#x[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);)/gi,"&amp;").replace(/</g,"&lt;").replace(/\n/g,"<br>"),attrSafe=s=>String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
 const urlSafe=(v,img)=>{const u=String(v||"").trim();if(!u||/\s|[\u0000-\u001f\u007f]/.test(u))return "";if(/^https?:\/\/[^"'<>]+$/i.test(u))return u;if(!img&&/^(?:mailto|tel):[^"'<>]+$/i.test(u))return u;return "";};
 const styleSafe=s=>{const out=[],color=v=>/^#[0-9a-f]{3,8}$/i.test(v)||/^rgba?\([0-9.,%\s]+\)$/i.test(v)||colors.has(v.toLowerCase());String(s||"").split(";").forEach(d=>{const i=d.indexOf(":");if(i<0)return;const p=d.slice(0,i).trim().toLowerCase(),v=d.slice(i+1).trim();if(!v||/(?:url\s*\(|expression|javascript:|@import|behavior|binding)/i.test(v))return;if(p==="color"&&color(v))out.push("color:"+v);else if(p==="font-size"&&sizes.has(v))out.push("font-size:"+v);else if(p==="font-family"&&fonts.has(v))out.push("font-family:"+v);else if(p==="float"&&/^(left|right|none)$/i.test(v))out.push("float:"+v);else if(["height","width","margin-left"].includes(p)&&/^(auto|\d{1,3}px|\d{1,3}%|\d{1,2}(?:\.\d+)?em)$/i.test(v))out.push(p+":"+v);else if(p==="text-align"&&/^(left|right|center|justify)$/i.test(v))out.push("text-align:"+v);});return out.join(";");};
 const attrs=(tag,raw)=>{const out=[],re=/([^\s=\/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>\x60]+)))?/g;let m,blank=false;while((m=re.exec(raw||""))!==null){const n=String(m[1]||"").toLowerCase(),v=m[2]!==undefined?m[2]:m[3]!==undefined?m[3]:m[4]!==undefined?m[4]:"";if(!n||n.startsWith("on")||["srcdoc","formaction","xlink:href","srcset","xmlns"].includes(n))continue;if(n==="style"){const s=styleSafe(v);if(s)out.push('style="'+attrSafe(s)+'"');continue;}if(tag==="a"&&n==="href"){const u=urlSafe(v,false);if(u)out.push('href="'+attrSafe(u)+'"');continue;}if(tag==="a"&&n==="target"&&v==="_blank"){blank=true;out.push('target="_blank"');continue;}if(tag==="a"&&n==="title"){out.push('title="'+attrSafe(v)+'"');continue;}if(tag==="img"&&n==="src"){const u=urlSafe(v,true);if(u)out.push('src="'+attrSafe(u)+'"');continue;}if(tag==="img"&&n==="alt"){out.push('alt="'+attrSafe(v)+'"');continue;}if(tag==="img"&&["width","height"].includes(n)&&/^\d{1,4}$/.test(v)){out.push(n+'="'+v+'"');continue;}if(tag==="ul"&&n==="data-gp-marker"&&markers.has(v)){out.push('data-gp-marker="'+v+'"');continue;}if(tag==="ol"&&n==="start"&&/^\d{1,4}$/.test(v)){out.push('start="'+v+'"');continue;}if(tag==="font"&&n==="color"&&(/^#[0-9a-f]{3,8}$/i.test(v)||colors.has(v.toLowerCase()))){out.push('color="'+attrSafe(v)+'"');continue;}if(tag==="font"&&n==="face"&&fonts.has(v)){out.push('face="'+attrSafe(v)+'"');continue;}if(tag==="font"&&n==="size"&&/^[1-7]$/.test(v))out.push('size="'+v+'"');}if(tag==="a"&&blank)out.push('rel="noopener noreferrer"');return out.length?" "+out.join(" "):"";};
 let out="",cursor=0;const stack=[],suppressed=[],tokenRe=/<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][^>]*>|</gi;let m;
 while((m=tokenRe.exec(input))!==null){if(!suppressed.length)out+=textSafe(input.slice(cursor,m.index));const token=m[0];cursor=tokenRe.lastIndex;if(token.startsWith("<!--")||/^<!/i.test(token))continue;if(token==="<"){if(!suppressed.length)out+="&lt;";continue;}const t=token.match(/^<\s*(\/?)\s*([a-z][a-z0-9-]*)\b([\s\S]*?)>$/i);if(!t){if(!suppressed.length)out+=textSafe(token);continue;}const close=t[1]==="/",tag=t[2].toLowerCase();if(suppressed.length){if(close){const i=suppressed.lastIndexOf(tag);if(i>=0)suppressed.length=i;}else if(dropped.has(tag)&&!voidDropped.has(tag))suppressed.push(tag);continue;}if(dropped.has(tag)){if(!close&&!voidDropped.has(tag))suppressed.push(tag);continue;}if(close){if(!allowed.has(tag)||voids.has(tag))continue;const i=stack.lastIndexOf(tag);if(i<0)continue;for(let j=stack.length-1;j>=i;j--)out+="</"+stack[j]+">";stack.length=i;continue;}if(!allowed.has(tag))continue;out+="<"+tag+attrs(tag,t[3])+">";if(!voids.has(tag))stack.push(tag);}
 if(!suppressed.length)out+=textSafe(input.slice(cursor));for(let i=stack.length-1;i>=0;i--)out+="</"+stack[i]+">";return out;
}

function normalizePysField_(value,label,maxLength,required,richText){
    if(typeof value!=="string")throw new Error(label+" debe ser texto.");
    const normalized=value.replace(/\u00a0/g," ").replace(/[ \t\f\v]+/g," ").trim();
    if(normalized.length>maxLength)throw new Error(label+" no puede superar "+maxLength+" caracteres.");
    const safeValue=richText?sanitizePysRichText_(normalized):normalized;
    const visible=richText?safeValue.replace(/<br\s*\/?>/gi," ").replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;|&#xA0;/gi," ").replace(/&#(?:x([0-9a-f]+)|(\d+));/gi,(_,hex,dec)=>String.fromCharCode(parseInt(hex||dec,hex?16:10))).trim():safeValue;
    if(required&&!visible)throw new Error(label+" es obligatorio y no puede estar vacío.");
    return safeValue;
}
function getPysYouTubeVideoId_(value){
    if(typeof value!=="string")return "";
    const candidate=value.trim();if(!candidate)return "";
    const parts=candidate.match(/^https:\/\/([^/?#]+)(\/[^?#]*)?(?:\?([^#]*))?(?:#.*)?$/i);
    if(!parts)return "";
    const authority=parts[1].toLowerCase();
    if(authority.includes("@")||authority.includes(":"))return "";
    const host=authority,path=parts[2]||"/",query=parts[3]||"",idPattern=/^[A-Za-z0-9_-]{11}$/;
    if(host==="youtu.be"){const m=path.match(/^\/([A-Za-z0-9_-]{11})\/?$/);return m&&idPattern.test(m[1])?m[1]:"";}
    if(!["youtube.com","www.youtube.com","m.youtube.com","youtube-nocookie.com","www.youtube-nocookie.com"].includes(host))return "";
    if(path==="/watch"){
        const ids=[];
        try{query.split("&").filter(Boolean).forEach(part=>{const pair=part.split("="),key=decodeURIComponent(pair.shift().replace(/\+/g," "));if(key==="v")ids.push(decodeURIComponent(pair.join("=").replace(/\+/g," ")));});}
        catch(error){return "";}
        return ids.length===1&&idPattern.test(ids[0])?ids[0]:"";
    }
    const match=path.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})\/?$/);
    return match&&idPattern.test(match[1])?match[1]:"";
}
function getCanonicalPysYouTubeUrl_(value){const id=getPysYouTubeVideoId_(value);return id?"https://www.youtube.com/watch?v="+id:"";}

function isPysOperationImageReferenced_(opsSheet, fileId) {
    const id = String(fileId || "").trim();
    if (!id || !opsSheet || opsSheet.getLastRow() < 2) return false;
    return readPysOperations_(opsSheet).some(operation => operation.imageFileId === id);
}

function handleAddProblem(source) {
    source = source || {};
    const opId = String(source.opId || "").trim();
    if (!/^[A-Za-z0-9_-]{20,80}$/.test(opId)) {
        throw new Error("El identificador de operación PyS es obligatorio y debe ser válido.");
    }
    const titulo = normalizePysField_(source.titulo, "El título", PYS_TITLE_MAX_LENGTH, true, false);
    const descripcion = normalizePysField_(source.descripcion, "La descripción", PYS_DESCRIPTION_MAX_LENGTH, true, true);
    const sinSolucion = source.sinSolucion;
    if (typeof sinSolucion !== "boolean") throw new Error("El indicador «Sin solución» debe ser booleano.");
    const solucion = normalizePysField_(source.solucion === undefined && sinSolucion ? "" : source.solucion,
        "La solución", PYS_SOLUTION_MAX_LENGTH, !sinSolucion, true);
    const prevenir = normalizePysField_(source.prevenir === undefined ? "" : source.prevenir,
        "La prevención", PYS_SOLUTION_MAX_LENGTH, false, true);
    const userId = String(source.userId || "").trim();
    const userName = String(source.userName || "").trim();
    const videoUrl = source.videoUrl === undefined ? "" : source.videoUrl;
    if (typeof videoUrl !== "string") throw new Error("La URL de YouTube debe ser texto.");
    if (videoUrl.trim()) {
        if (!getPysYouTubeVideoId_(videoUrl)) throw new Error("La URL de YouTube no tiene un host, ruta o ID permitido.");
        throw new Error("El vídeo debe cargarse mediante el flujo de aprobación de YouTube; no se aceptan enlaces directos.");
    }
    if (!userId || !userName) throw new Error("La sesión verificada no proporcionó un colaborador válido.");

    const image = validatePysImageDataUrl_(source.imgBase64);
    const requestedModels = source.alcance === "especifico" && Array.isArray(source.modelosAsociados)
        ? parseModelosAsociados(source.modelosAsociados) : [];
    const p = { titulo, descripcion, sinSolucion, solucion, prevenir, userId, userName,
        alcance: source.alcance, modelosAsociados: [] };
    const sheet = getPysSheet_(true);
    validatePysRecords_(sheet);
    // Validar todas las asociaciones antes de crear/leer PysOperations o reservar recursos.
    const models = requestedModels.map(findUniqueCortesVehicleForPys_);
    p.modelosAsociados = models;
    const opsSheet = getPysOperationsSheet_();
    let ops = readPysOperations_(opsSheet);
    const hash = buildPysPayloadHash_(p, image, models);
    let op = ops.find(item => item.opId === opId) || null;
    if (op && op.payloadHash !== hash) {
        throw new Error("El identificador de operación ya pertenece a otro contenido PyS; no se creó otro problema.");
    }
    if (op && op.status === "RECOVERY_REQUIRED") {
        throw new Error("La operación PyS requiere recuperación manual; no se creó otro problema.");
    }
    if (op && op.status === "PENDING" && !op.imageFileId) {
        throw new Error("La operación PyS pertenece a una reserva histórica incompleta; requiere recuperación manual antes de reintentar.");
    }

    let problemId = op ? op.problemId : "";
    let file = null, fileId = op ? op.imageFileId : "", url = op ? op.imageUrl : "";
    let reservationConfirmed = Boolean(op);
    try {
        if (op) {
            const existing = findCanonicalPysRowsById_(sheet, problemId);
            if (existing.length > 1) throw new Error("El ID del problema aparece más de una vez; se detuvo la recuperación.");
            if (existing.length === 1) {
                const expected = buildPysExpectedRow_(problemId, p, normalizePysImageReference_(existing[0].row[6]), models);
                if (!normalizePysImageReference_(existing[0].row[6]) || !pysRowMatchesPayload_(existing[0].row, expected)) {
                    throw new Error("El registro PyS existente no coincide con la operación; requiere revisión.");
                }
                try {
                    const linkedFile = DriveApp.getFileById(op.imageFileId);
                    linkedFile.setDescription(["GPSpedia PyS — LINKED", "problemId=" + problemId, "fileId=" + op.imageFileId,
                        "recoveredAfterPartialFailure=true"].join("\\n"));
                } catch (metadataError) {
                    console.warn("No se pudo actualizar la metadata auxiliar de la imagen PyS:", metadataError);
                }
                return { status: "success", message: "Problema registrado correctamente.", problemId, recovered: true };
            }
            if (op.status === "LINKED") {
                throw new Error("La operación PyS figura vinculada, pero no existe su registro; requiere revisión.");
            }
            const folder = getPysImagesFolder_().folder;
            file = verifyPendingPysImageFile_(op, image, folder);
        } else {
            const folder = getPysImagesFolder_().folder;
            const fileName = "pys_" + opId + "_" + Date.now() + "." + image.extension;
            file = folder.createFile(Utilities.newBlob(image.bytes, image.mimeType, fileName));
            if (!file) throw new Error("Drive no confirmó la creación de la imagen.");
            fileId = String(file.getId() || "").trim();
            if (!/^[A-Za-z0-9_-]{10,110}$/.test(fileId)) throw new Error("Drive no devolvió un identificador válido para la imagen.");
            url = "https://drive.google.com/file/d/" + fileId + "/view";
            file.setDescription([
                "GPSpedia PyS — UPLOAD_PENDING", "opId=" + opId, "fileId=" + fileId,
                "mimeType=" + image.mimeType, "sizeBytes=" + image.sizeBytes
            ].join("\n"));
            assertPysImageFolderPermissions_(file, folder);

            problemId = getPysNextId_(sheet, ops);
            const now = new Date().toISOString();
            try {
                writePysOperation_(opsSheet, 0, {
                    opId, payloadHash: hash, problemId, status: "UPLOAD_PENDING",
                    imageFileId: fileId, imageUrl: url, createdAt: now, updatedAt: now
                });
                reservationConfirmed = true;
            } catch (reservationError) {
                try {
                    const persisted = readPysOperations_(opsSheet).find(item => item.opId === opId);
                    reservationConfirmed = Boolean(persisted && persisted.imageFileId === fileId);
                } catch (readError) {}
                throw reservationError;
            }
            ops = readPysOperations_(opsSheet);
            const canonical = ops.find(item => item.opId === opId);
            if (!canonical) throw new Error("No se pudo confirmar la reserva canónica de la operación PyS.");
            if (canonical.payloadHash !== hash) {
                const losingFile = file;
                file = null;
                if (!isPysOperationImageReferenced_(opsSheet, fileId) &&
                    findPysImageReferences_(sheet, fileId, url).length === 0) {
                    losingFile.setTrashed(true);
                } else {
                    markPysImageForRecovery_(losingFile, problemId, fileId,
                        "El opId ya pertenece a otro contenido y no se pudo demostrar que el archivo estuviera libre.");
                }
                throw new Error("El identificador de operación ya pertenece a otro contenido PyS; no se creó otro problema.");
            }
            op = canonical;
            if (canonical.imageFileId !== fileId || canonical.problemId !== problemId) {
                const losingFile = file;
                file = null;
                if (!isPysOperationImageReferenced_(opsSheet, fileId) &&
                    findPysImageReferences_(sheet, fileId, url).length === 0) {
                    losingFile.setTrashed(true);
                } else {
                    markPysImageForRecovery_(losingFile, problemId, fileId,
                        "La reserva concurrente eligió otro archivo canónico; no se pudo demostrar que el archivo perdedor estuviera libre.");
                }
                problemId = canonical.problemId;
                fileId = canonical.imageFileId;
                url = canonical.imageUrl;
                file = verifyPendingPysImageFile_(canonical, image, folder);
            }
        }

        const imageReferences = findPysImageReferences_(sheet, fileId, url);
        if (imageReferences.length) {
            throw new Error("La imagen está referenciada por un registro PyS distinto; se conservó para revisión manual.");
        }
        const expected = buildPysExpectedRow_(problemId, p, url, models);
        sheet.appendRow(expected);
        SpreadsheetApp.flush();
        const stored = findCanonicalPysRowsById_(sheet, problemId);
        if (stored.length !== 1 || !pysRowMatchesPayload_(stored[0].row, expected)) {
            throw new Error("No se pudo confirmar una única fila PyS con los datos enviados.");
        }
        try {
            file.setDescription(["GPSpedia PyS — LINKED", "problemId=" + problemId, "fileId=" + fileId,
                "mimeType=" + image.mimeType, "sizeBytes=" + image.sizeBytes].join("\n"));
        } catch (metadataError) {
            console.warn("No se pudo actualizar el estado auxiliar de la imagen PyS:", metadataError);
        }
        try { logUserActivity(userId, userName, "add_problem", problemId, titulo); }
        catch (logError) { console.error("No se pudo registrar la actividad de alta PyS:", logError); }
        return { status: "success", message: "Problema registrado correctamente.", problemId };
    } catch (error) {
        if (file && reservationConfirmed) {
            markPysImageForRecovery_(file, problemId, fileId,
                "La reserva de imagen PyS se conserva para reintento/reconciliación: " + String(error && error.message || error));
            throw new Error("La operación PyS conserva su imagen reservada para recuperación; no se eliminó ningún recurso. Detalle: " +
                String(error && error.message || error));
        }
        if (file && !reservationConfirmed) {
            let safeToTrash = false;
            try {
                safeToTrash = !isPysOperationImageReferenced_(opsSheet, fileId) &&
                    findPysImageReferences_(sheet, fileId, url).length === 0;
            } catch (referenceError) {
                markPysImageForRecovery_(file, problemId, fileId,
                    "No se pudo comprobar la referencia de la imagen después del fallo.");
            }
            if (safeToTrash) {
                try { file.setTrashed(true); } catch (cleanupError) {
                    markPysImageForRecovery_(file, problemId, fileId,
                        "No se pudo compensar una imagen sin reserva confirmada.");
                }
            } else {
                markPysImageForRecovery_(file, problemId, fileId,
                    "La imagen quedó referenciada por una reserva o fila PyS; se conserva para reconciliación.");
            }
        }
        throw error;
    }
}
function buildPysConflictResponse_(message) { return { status: "conflict", code: "PYS_CONFLICT", message }; }
function findPysMutationRow_(sheet, problemId) {
    const lastRow=sheet.getLastRow();
    if(lastRow<2)throw new Error("No hay problemas registrados.");
    const ids=sheet.getRange(2,1,lastRow-1,1).getValues().flat();
    const matches=ids.map((id,index)=>({id,index})).filter(item=>String(item.id)===String(problemId));
    if(matches.length!==1)throw new Error(matches.length?"El problema tiene un ID duplicado.":"Problema no encontrado.");
    return matches[0].index+2;
}
function handleAddSolution(payload) {
    const {problemId,solucion,userId,userName}=payload||{};
    const normalizedSolution=normalizePysField_(solucion,"La solución",PYS_SOLUTION_MAX_LENGTH,true,true);
    if(!problemId||!userId||!userName)throw new Error("problemId, solución y sesión verificada son requeridos.");
    const sheet=getPysSheet_(false);
    if(!sheet)throw new Error("Hoja pys no encontrada.");
    const row=findPysMutationRow_(sheet,problemId),current=sheet.getRange(row,4,1,2).getValues()[0];
    const marker=String(current[0]==null?"":current[0]).trim();
    const storedSolution=current[1]==null||current[1]===""?"":normalizePysField_(current[1],"La solución registrada",PYS_SOLUTION_MAX_LENGTH,false,true);
    const hasMarker=marker!=="",hasSolution=storedSolution!=="";
    if(hasMarker!==hasSolution)throw new Error("El registro PyS tiene un estado inconsistente entre «Se solucionó» y «Solución»; requiere revisión.");
    if(hasSolution){
        if(storedSolution===normalizedSolution)return{status:"success",recovered:true,message:"La misma solución ya estaba registrada; se confirmó el resultado anterior."};
        return buildPysConflictResponse_("Conflicto: otro colaborador ya registró una solución diferente. Actualiza los datos antes de continuar.");
    }
    sheet.getRange(row,4,1,2).setValues([["x",normalizedSolution]]);
    SpreadsheetApp.flush();
    const saved=sheet.getRange(row,4,1,2).getValues()[0];
    if(String(saved[0]==null?"":saved[0]).trim()!=="x"||String(saved[1]==null?"":saved[1])!==normalizedSolution)throw new Error("No se pudo confirmar la solución PyS. Puedes reintentar el mismo contenido.");
    try{logUserActivity(userId,userName,"add_solution",problemId,"Se agregó una solución.");}catch(logError){console.error("No se pudo registrar la actividad de solución:",logError);}
    return{status:"success",message:"Solución agregada con éxito."};
}
function handleAddPrevention(payload) {
    const {problemId,prevenir,userId,userName}=payload||{};
    const normalizedPrevention=normalizePysField_(prevenir,"La prevención",PYS_SOLUTION_MAX_LENGTH,true,true);
    if(!problemId||!userId||!userName)throw new Error("problemId, prevención y sesión verificada son requeridos.");
    const sheet=getPysSheet_(false);
    if(!sheet)throw new Error("Hoja pys no encontrada.");
    const row=findPysMutationRow_(sheet,problemId),current=sheet.getRange(row,6).getValue();
    const storedPrevention=current==null||current===""?"":normalizePysField_(current,"La prevención registrada",PYS_SOLUTION_MAX_LENGTH,false,true);
    if(storedPrevention){
        if(storedPrevention===normalizedPrevention)return{status:"success",recovered:true,message:"La misma prevención ya estaba registrada; se confirmó el resultado anterior."};
        return buildPysConflictResponse_("Conflicto: otro colaborador ya registró una prevención diferente. Actualiza los datos antes de continuar.");
    }
    sheet.getRange(row,6).setValue(normalizedPrevention);
    SpreadsheetApp.flush();
    const saved=sheet.getRange(row,6).getValue();
    if(String(saved==null?"":saved)!==normalizedPrevention)throw new Error("No se pudo confirmar la prevención PyS. Puedes reintentar el mismo contenido.");
    try{logUserActivity(userId,userName,"add_prevention",problemId,"Se agregó una prevención.");}catch(logError){console.error("No se pudo registrar la actividad de prevención:",logError);}
    return{status:"success",message:"Prevención agregada con éxito."};
}

const TUTORIAL_HEADERS = Object.freeze([
    "ID", "Tema", "Imagen", "comoIdentificarlo", "dondeEncontrarlo", "Detalles", "Video", "Colaborador"
]);

const TUTORIAL_TITLE_EVENTS_HEADERS = Object.freeze([
    "operationId", "eventHash", "tutorialId", "action", "titleKey", "previousTitleKey", "payloadHash", "createdAt"
]);

const TUTORIAL_EDIT_EVENTS_HEADERS = Object.freeze([
    "operationId", "payloadHash", "tutorialId", "expectedHash", "snapshotJson", "createdAt"
]);

const TUTORIAL_RENAME_EVENTS_HEADERS = Object.freeze([
    "operationId", "payloadHash", "tutorialId", "expectedTitleKey", "title", "createdAt"
]);

function getTutorialSheet_(createIfMissing) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("Tutorial");
    if (!sheet && createIfMissing) {
        try { sheet = ss.insertSheet("Tutorial"); }
        catch (insertError) {
            sheet = ss.getSheetByName("Tutorial");
            if (!sheet) throw insertError;
        }
    }
    if (!sheet) return null;

    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, TUTORIAL_HEADERS.length).setValues([TUTORIAL_HEADERS.slice()]);
        SpreadsheetApp.flush();
        return sheet;
    }

    const width = Math.max(TUTORIAL_HEADERS.length, sheet.getLastColumn());
    const headers = sheet.getRange(1, 1, 1, width).getDisplayValues()[0]
        .map(value => String(value || "").trim());
    if (TUTORIAL_HEADERS.slice(0, 7).some((header, index) => headers[index] !== header)) {
        throw new Error("El esquema A:G de la hoja Tutorial no coincide; no se modificaron registros.");
    }
    if (!headers[7]) {
        const lastRow = sheet.getLastRow();
        const existingExtensionData = lastRow > 1
            ? sheet.getRange(2, 8, lastRow - 1, 1).getDisplayValues().flat()
            : [];
        if (existingExtensionData.some(value => String(value || "").trim())) {
            throw new Error("La columna H contiene datos históricos sin encabezado; no se reinterpretaron como Colaborador.");
        }
        sheet.getRange(1, 8).setValue("Colaborador");
        SpreadsheetApp.flush();
    } else if (headers[7] !== "Colaborador") {
        throw new Error("La columna H de Tutorial debe estar vacía o llamarse Colaborador; no se modificó la hoja.");
    }
    return sheet;
}

function getTutorialTitleEventsSheet_(createIfMissing) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("TutorialTitleEvents");
    if (!sheet && createIfMissing) {
        try { sheet = ss.insertSheet("TutorialTitleEvents"); }
        catch (insertError) {
            sheet = ss.getSheetByName("TutorialTitleEvents");
            if (!sheet) throw insertError;
        }
    }
    if (!sheet) return null;
    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, TUTORIAL_TITLE_EVENTS_HEADERS.length).setValues([TUTORIAL_TITLE_EVENTS_HEADERS.slice()]);
        SpreadsheetApp.flush();
        return sheet;
    }
    const width = Math.max(TUTORIAL_TITLE_EVENTS_HEADERS.length, sheet.getLastColumn());
    const headers = sheet.getRange(1, 1, 1, width).getDisplayValues()[0].map(value => String(value || "").trim());
    if (width !== TUTORIAL_TITLE_EVENTS_HEADERS.length ||
        TUTORIAL_TITLE_EVENTS_HEADERS.some((header, index) => headers[index] !== header)) {
        throw new Error("El esquema de TutorialTitleEvents no coincide; no se modificó la hoja.");
    }
    return sheet;
}

function getTutorialEditEventsSheet_(createIfMissing) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("TutorialEditEvents");
    if (!sheet && createIfMissing) {
        try { sheet = ss.insertSheet("TutorialEditEvents"); }
        catch (insertError) {
            sheet = ss.getSheetByName("TutorialEditEvents");
            if (!sheet) throw insertError;
        }
    }
    if (!sheet) return null;
    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, TUTORIAL_EDIT_EVENTS_HEADERS.length).setValues([TUTORIAL_EDIT_EVENTS_HEADERS.slice()]);
        SpreadsheetApp.flush();
        return sheet;
    }
    const width = Math.max(TUTORIAL_EDIT_EVENTS_HEADERS.length, sheet.getLastColumn());
    const headers = sheet.getRange(1, 1, 1, width).getDisplayValues()[0].map(value => String(value || "").trim());
    if (width !== TUTORIAL_EDIT_EVENTS_HEADERS.length ||
        TUTORIAL_EDIT_EVENTS_HEADERS.some((header, index) => headers[index] !== header)) {
        throw new Error("El esquema de TutorialEditEvents no coincide; no se modificó la hoja.");
    }
    return sheet;
}

function getTutorialRenameEventsSheet_(createIfMissing) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("TutorialRenameEvents");
    if (!sheet && createIfMissing) {
        try { sheet = ss.insertSheet("TutorialRenameEvents"); }
        catch (insertError) { sheet = ss.getSheetByName("TutorialRenameEvents"); if (!sheet) throw insertError; }
    }
    if (!sheet) return null;
    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, TUTORIAL_RENAME_EVENTS_HEADERS.length).setValues([TUTORIAL_RENAME_EVENTS_HEADERS.slice()]);
        SpreadsheetApp.flush();
        return sheet;
    }
    const width = Math.max(TUTORIAL_RENAME_EVENTS_HEADERS.length, sheet.getLastColumn());
    const headers = sheet.getRange(1, 1, 1, width).getDisplayValues()[0].map(value => String(value || "").trim());
    if (width !== TUTORIAL_RENAME_EVENTS_HEADERS.length ||
        TUTORIAL_RENAME_EVENTS_HEADERS.some((header, index) => headers[index] !== header)) {
        throw new Error("El esquema de TutorialRenameEvents no coincide; no se modificó la hoja.");
    }
    return sheet;
}
function readTutorialRenameEvents_(sheet) {
    const last = sheet ? sheet.getLastRow() : 0, operations = new Map();
    if (last < 2) return [];
    const rows = sheet.getRange(2, 1, last - 1, TUTORIAL_RENAME_EVENTS_HEADERS.length).getValues();
    rows.forEach((row, index) => {
        if (!row.some(value => value !== "" && value !== null && value !== undefined)) return;
        const operationId = String(row[0] || "").trim(), payloadHash = String(row[1] || "").trim().toLowerCase();
        const tutorialId = String(row[2] || "").trim(), expectedTitleKey = String(row[3] || "").trim();
        const title = String(row[4] || "").trim();
        if (!/^tutorial-rename-[a-f0-9]{64}$/.test(operationId) || !/^[a-f0-9]{64}$/.test(payloadHash) ||
            !/^(?:tut-[A-Za-z0-9_-]{1,80}|legacy-[a-f0-9]{64})$/i.test(tutorialId) ||
            !expectedTitleKey || !title || title.length > 30 ||
            buildTutorialContentHash_([tutorialId, expectedTitleKey, title]) !== payloadHash ||
            operationId !== "tutorial-rename-" + payloadHash) {
            throw new Error("TutorialRenameEvents contiene una fila incompatible o un hash alterado; requiere revisión.");
        }
        const item = { rowNumber: index + 2, operationId, payloadHash, tutorialId, expectedTitleKey, title };
        if (operations.has(operationId) && operations.get(operationId).payloadHash !== payloadHash) {
            throw new Error("TutorialRenameEvents contiene un operationId contradictorio; requiere reconciliación.");
        }
        if (!operations.has(operationId)) operations.set(operationId, item);
    });
    return Array.from(operations.values());
}
function projectTutorialTitle_(tutorialId, baseTitle, renameEventsSnapshot) {
    const id = String(tutorialId || "").trim(), rowTitle = String(baseTitle || "");
    if (!id || !rowTitle) return rowTitle;
    let events = renameEventsSnapshot;
    if (!Array.isArray(events)) {
        const sheet = getTutorialRenameEventsSheet_(false);
        if (!sheet) return rowTitle;
        events = readTutorialRenameEvents_(sheet);
    }
    let current = rowTitle;
    events.filter(event => event.tutorialId === id).forEach(event => {
        if (event.expectedTitleKey === normalizeTutorialTitle_(current)) current = event.title;
    });
    return current;
}
function ensureTutorialTitleClaim_(tutorialId, title) {
    const id = String(tutorialId || "").trim(), titleKey = normalizeTutorialTitle_(title);
    if (!id || !titleKey) throw new Error("No se pudo identificar el tema actual del tutorial.");
    const sheet = getTutorialTitleEventsSheet_(true);
    const projection = readTutorialTitleEvents_(sheet);
    const owner = projection.owners.get(titleKey) || "";
    if (owner && owner !== id) throw new Error("El tema actual está reservado por otro tutorial; requiere revisión.");
    if (owner === id) return;
    const payloadHash = buildTutorialContentHash_([id, titleKey, "baseline"]);
    appendTutorialTitleEvent_({
        operationId: "tutorial-title-claim-" + payloadHash,
        tutorialId: id, action: "CLAIM", titleKey, previousTitleKey: "", payloadHash
    }, sheet, projection);
}
function appendTutorialRenameEvent_(tutorialId, previousTitle, nextTitle) {
    const id = String(tutorialId || "").trim(), expectedTitleKey = normalizeTutorialTitle_(previousTitle);
    const title = String(nextTitle || "").trim(), payloadHash = buildTutorialContentHash_([id, expectedTitleKey, title]);
    const operationId = "tutorial-rename-" + payloadHash, sheet = getTutorialRenameEventsSheet_(true);
    let existing = readTutorialRenameEvents_(sheet).find(event => event.operationId === operationId);
    if (existing && (existing.payloadHash !== payloadHash || existing.tutorialId !== id ||
        existing.expectedTitleKey !== expectedTitleKey || existing.title !== title)) {
        throw new Error("El identificador de renombrado ya pertenece a otro contenido.");
    }
    if (!existing) {
        sheet.appendRow([operationId, payloadHash, id, expectedTitleKey, title, new Date().toISOString()]);
        try { SpreadsheetApp.flush(); }
        catch (flushError) {
            existing = readTutorialRenameEvents_(sheet).find(event => event.operationId === operationId);
            if (!existing || existing.payloadHash !== payloadHash) throw flushError;
        }
    }
    if (normalizeTutorialTitle_(projectTutorialTitle_(id, previousTitle)) !== normalizeTutorialTitle_(title)) {
        throw new Error("Otra edición modificó el tema del tutorial; actualiza los datos y vuelve a intentarlo.");
    }
    return { operationId, tutorialId: id, title };
}

function normalizeTutorialTitle_(value) {
    const normalized = Array.from(String(value || "").normalize("NFD"))
        .filter(character => { const code = character.charCodeAt(0); return code < 768 || code > 879; }).join("");
    return normalized.trim().replace(new RegExp(String.fromCharCode(92) + "s+", "g"), " ").toLowerCase();
}

function normalizeTutorialField_(value, label, maxLength, required) {
    const text = String(value === null || value === undefined ? "" : value).trim();
    if (required && !text) throw new Error(label + " es obligatorio.");
    if (text.length > maxLength) throw new Error(label + " no puede exceder " + maxLength + " caracteres.");
    return text;
}

function normalizeTutorialCatalogImageId_(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const match = raw.match(/file\/d\/([A-Za-z0-9_-]+)|id=([A-Za-z0-9_-]+)|\/d\/([A-Za-z0-9_-]+)/i);
    if (match) {
        const id = match[1] || match[2] || match[3];
        return id && id.length > 20 ? id : null;
    }
    return raw.length > 20 && !raw.includes("/") && !raw.includes(":") ? raw : null;
}

function buildTutorialCatalogChange_(reference) {
    const sheet = getTutorialSheet_(false);
    if (!sheet) throw new Error("No se encontró la hoja Tutorial para publicar el cambio.");
    const record = findTutorialRow_(sheet, reference, true);
    const row = record.row;
    const id = String(row[0] || "").trim();
    if (!/^tut-[A-Za-z0-9_-]{20,80}$/i.test(id)) {
        throw new Error("El tutorial no tiene un ID persistente compatible con el feed.");
    }
    const snapshot = {
        ID: id,
        Tema: row[1] === "" || row[1] === undefined ? null : row[1],
        Imagen: normalizeTutorialCatalogImageId_(row[2]),
        comoIdentificarlo: row[3] === "" || row[3] === undefined ? null : row[3],
        dondeEncontrarlo: row[4] === "" || row[4] === undefined ? null : row[4],
        Detalles: row[5] === "" || row[5] === undefined ? null : row[5],
        Video: row[6] === "" || row[6] === undefined ? null : row[6],
        Colaborador: row[7] === "" || row[7] === undefined ? null : row[7]
    };
    return { collection: "tutoriales", recordId: id, operation: "upsert", snapshot: snapshot };
}

function publishTutorialCatalogChange_(action, reference) {
    return publishFeedbackCatalogChange_(action, () => buildTutorialCatalogChange_(reference));
}

function findTutorialRow_(sheet, reference, preferId) {
    const key = String(reference || "").trim();
    if (!key) throw new Error("Se requiere un ID o tema válido para identificar el tutorial.");
    let byId = null;
    try { byId = findTutorialById_(sheet, key); }
    catch (error) {
        if (String(error && error.message || error).includes("ID del tutorial aparece más de una vez")) {
            throw new Error("El ID del tutorial aparece más de una vez; no se modificó.");
        }
        throw error;
    }
    if (byId) {
        const projected = projectTutorialEditFields_(byId.row[0], byId.row);
        const identity = String(byId.row[0] || "").trim() || makeLegacyTutorialIdentity_(byId.row[1]);
        projected.row[1] = typeof projectTutorialTitle_ === "function"
            ? projectTutorialTitle_(identity, projected.row[1]) : projected.row[1];
        return Object.assign({}, byId, { row: projected.row, appliedEditOperations: projected.appliedOperations });
    }
    if (preferId && /^tut-[A-Za-z0-9_-]{20,80}$/.test(key)) throw new Error("Tutorial no encontrado.");
    if (preferId) {
        const lastRow = sheet.getLastRow();
        const titleValues = lastRow > 1 ? sheet.getRange(2, 2, lastRow - 1, 1).getValues() : [];
        const renameSheet = typeof getTutorialRenameEventsSheet_ === "function" ? getTutorialRenameEventsSheet_(false) : null;
        const renameEvents = renameSheet && typeof readTutorialRenameEvents_ === "function"
            ? readTutorialRenameEvents_(renameSheet) : [];
        const byTitle = [];
        titleValues.forEach((value, index) => {
            const rowIndex = index + 2;
            const row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
            const identity = String(row[0] || "").trim() || makeLegacyTutorialIdentity_(row[1]);
            const projectedTitle = typeof projectTutorialTitle_ === "function"
                ? projectTutorialTitle_(identity, row[1], renameEvents) : row[1];
            const normalizeLookupTitle = value => typeof normalizeTutorialTitle_ === "function"
                ? normalizeTutorialTitle_(value) : String(value || "").trim().toLowerCase();
            if (normalizeLookupTitle(projectedTitle) !== normalizeLookupTitle(key)) return;
            row[1] = projectedTitle;
            byTitle.push({ rowIndex, row, tutorialIdentity: identity });
        });
        if (byTitle.length > 1) {
            const first = byTitle[0], firstId = String(first.row[0] || "").trim();
            const sameIdentity = Boolean(firstId) && byTitle.every(item => String(item.row[0] || "").trim() === firstId);
            if (!sameIdentity) throw new Error("El tema del tutorial aparece más de una vez; no se modificó.");
            const firstIdentity = first.tutorialIdentity || firstId;
            const projected = projectTutorialEditFields_(firstIdentity, first.row);
            return Object.assign({}, first, { row: projected.row });
        }
        if (byTitle.length === 1) {
            const first = byTitle[0], id = String(first.row[0] || "").trim();
            const identity = first.tutorialIdentity || id || makeLegacyTutorialIdentity_(first.row[1]);
            const projected = projectTutorialEditFields_(identity, first.row);
            return Object.assign({}, first, { row: projected.row });
        }
    }
    throw new Error("Tutorial no encontrado.");
}
function findTutorialById_(sheet, tutorialId) {
    const id = String(tutorialId || "").trim();
    const lastRow = sheet ? sheet.getLastRow() : 0;
    if (!id || lastRow < 2) return null;
    const idRange = sheet.getRange(2, 1, lastRow - 1, 1);
    let candidates = [];
    if (idRange && typeof idRange.createTextFinder === "function") {
        candidates = idRange.createTextFinder(id).matchCase(false).findAll();
    } else {
        idRange.getValues().forEach((value, index) => {
            if (String(value[0] || "").toLowerCase().includes(id.toLowerCase())) candidates.push({ getRow: () => index + 2 });
        });
    }
    const matches = [];
    candidates.forEach(candidate => {
        const rowIndex = candidate.getRow();
        const storedId = String(sheet.getRange(rowIndex, 1).getValue() || "").trim();
        if (storedId.toLowerCase() !== id.toLowerCase()) return;
        matches.push({ rowIndex, row: sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0] });
    });
    if (matches.length > 1) {
        matches[0].duplicateRowCount = matches.length - 1;
        const width = Math.max(0, ...matches.map(match => match.row.length));
        matches[0].conflictingDuplicateCount = matches.slice(1).filter(match =>
            Array.from({ length: width }, (_, index) =>
                String(match.row[index] || "").trim() !== String(matches[0].row[index] || "").trim()).some(Boolean)).length;
    }
    return matches[0] || null;
}
function tutorialTitleExists_(sheet, title, excludedRowIndex, excludedTutorialId) {
    const lastRow = sheet ? sheet.getLastRow() : 0;
    if (lastRow < 2) return false;
    const titleKey = normalizeTutorialTitle_(title);
    const excluded = Number(excludedRowIndex) || 0;
    const rows = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    const renameSheet = typeof getTutorialRenameEventsSheet_ === "function" ? getTutorialRenameEventsSheet_(false) : null;
    const renameEvents = renameSheet && typeof readTutorialRenameEvents_ === "function"
        ? readTutorialRenameEvents_(renameSheet) : [];
    return rows.some((row, index) => {
        const rowIndex = index + 2, rowId = String(row[0] || "").trim();
        if (rowIndex === excluded || (excludedTutorialId && rowId.toLowerCase() === String(excludedTutorialId).toLowerCase())) return false;
        const identity = rowId || makeLegacyTutorialIdentity_(row[1]);
        const projectedTitle = typeof projectTutorialTitle_ === "function"
            ? projectTutorialTitle_(identity, row[1], renameEvents) : row[1];
        return normalizeTutorialTitle_(projectedTitle) === titleKey;
    });
}

function buildTutorialContentHash_(value) {
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(value));
    return digest.map(byte => ((byte < 0 ? byte + 256 : byte).toString(16).padStart(2, "0"))).join("");
}

function buildTutorialTitleEventHash_(record) {
    const payload = JSON.stringify([record.operationId, record.tutorialId, record.action, record.titleKey,
        record.previousTitleKey || "", record.payloadHash || ""]);
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, payload);
    return digest.map(byte => ((byte < 0 ? byte + 256 : byte).toString(16).padStart(2, "0"))).join("");
}

function readTutorialTitleEvents_(sheet) {
    const last = sheet ? sheet.getLastRow() : 0, operations = new Map(), owners = new Map(), applied = new Map();
    if (last < 2) return { operations: [], owners, applied };
    const rows = sheet.getRange(2, 1, last - 1, TUTORIAL_TITLE_EVENTS_HEADERS.length).getValues();
    rows.forEach((row, index) => {
        if (!row.some(value => value !== "" && value !== null && value !== undefined)) return;
        const operationId = String(row[0] || "").trim(), eventHash = String(row[1] || "").trim().toLowerCase();
        const tutorialId = String(row[2] || "").trim(), action = String(row[3] || "").trim();
        const titleKey = String(row[4] || "").trim(), previousTitleKey = String(row[5] || "").trim();
        const payloadHash = String(row[6] || "").trim().toLowerCase();
        if (!/^[a-z0-9_-]{20,120}$/.test(operationId) || !/^[a-f0-9]{64}$/.test(eventHash) ||
            !/^[a-f0-9]{64}$/.test(payloadHash) ||
            !/^(?:tut-[A-Za-z0-9_-]{1,80}|legacy-[a-f0-9]{64})$/i.test(tutorialId) ||
            !["CLAIM", "RENAME"].includes(action) || !titleKey || (action === "RENAME" && !previousTitleKey)) {
            throw new Error("TutorialTitleEvents contiene una fila incompatible; requiere revisión.");
        }
        const item = { rowNumber: index + 2, operationId, eventHash, payloadHash, tutorialId, action, titleKey, previousTitleKey };
        if (buildTutorialTitleEventHash_(item) !== eventHash) {
            throw new Error("TutorialTitleEvents contiene un eventHash que no coincide con su contenido; requiere revisión.");
        }
        if (operations.has(operationId)) {
            const canonical = operations.get(operationId);
            if (canonical.eventHash !== eventHash) {
                throw new Error("TutorialTitleEvents contiene el mismo operationId con eventos contradictorios; requiere reconciliación.");
            }
            canonical.duplicateCount = (canonical.duplicateCount || 0) + 1;
            return;
        }
        operations.set(operationId, item);
        const currentOwner = owners.get(titleKey);
        if (action === "CLAIM") {
            if (!currentOwner || currentOwner === tutorialId) { owners.set(titleKey, tutorialId); applied.set(operationId, true); }
            else applied.set(operationId, false);
        } else if (owners.get(previousTitleKey) === tutorialId &&
            (!currentOwner || currentOwner === tutorialId)) {
            if (owners.get(previousTitleKey) === tutorialId) owners.delete(previousTitleKey);
            owners.set(titleKey, tutorialId); applied.set(operationId, true);
        } else applied.set(operationId, false);
    });
    return { operations: Array.from(operations.values()), owners, applied };
}

function appendTutorialTitleEvent_(record, sheetSnapshot, projectionSnapshot) {
    const sheet = sheetSnapshot || getTutorialTitleEventsSheet_(true), payloadHash = buildTutorialTitleEventHash_(record);
    let projection = projectionSnapshot || readTutorialTitleEvents_(sheet);
    let existing = projection.operations.find(item => item.operationId === record.operationId);
    if (existing) {
        if (existing.eventHash !== payloadHash) throw new Error("El identificador de operación ya pertenece a otra reserva de título.");
        if (projection.applied.get(record.operationId) !== true || projection.owners.get(record.titleKey) !== record.tutorialId) {
            throw new Error("El tema del tutorial ya está reservado por otro registro.");
        }
        return existing;
    }
    sheet.appendRow([record.operationId, payloadHash, record.tutorialId, record.action,
        record.titleKey, record.previousTitleKey || "", record.payloadHash, new Date().toISOString()]);
    try { SpreadsheetApp.flush(); }
    catch (flushError) {
        projection = readTutorialTitleEvents_(sheet);
        existing = projection.operations.find(item => item.operationId === record.operationId);
        if (!existing || existing.eventHash !== payloadHash || projection.applied.get(record.operationId) !== true ||
            projection.owners.get(record.titleKey) !== record.tutorialId) throw flushError;
        return existing;
    }
    projection = readTutorialTitleEvents_(sheet);
    existing = projection.operations.find(item => item.operationId === record.operationId);
    if (!existing || existing.eventHash !== payloadHash) throw new Error("No se pudo confirmar la reserva append-only del tema del tutorial.");
    if (projection.applied.get(record.operationId) !== true || projection.owners.get(record.titleKey) !== record.tutorialId) {
        throw new Error("Ya existe un tutorial con ese tema; utiliza la edición del registro existente.");
    }
    return existing;
}

function getTutorialTitleOwner_(title) {
    const sheet = getTutorialTitleEventsSheet_(false);
    return sheet ? (readTutorialTitleEvents_(sheet).owners.get(normalizeTutorialTitle_(title)) || "") : "";
}

function makeLegacyTutorialIdentity_(title) {
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, normalizeTutorialTitle_(title));
    const hash = digest.map(byte => ((byte < 0 ? byte + 256 : byte).toString(16).padStart(2, "0"))).join("");
    return "legacy-" + hash;
}
function buildTutorialEditFieldsHash_(values) {
    return buildTutorialContentHash_((values || []).map(value => String(value || "")));
}

function readTutorialEditEvents_(sheet) {
    const last = sheet ? sheet.getLastRow() : 0, operations = new Map();
    if (last < 2) return [];
    const rows = sheet.getRange(2, 1, last - 1, TUTORIAL_EDIT_EVENTS_HEADERS.length).getValues();
    rows.forEach((row, index) => {
        if (!row.some(value => value !== "" && value !== null && value !== undefined)) return;
        const operationId = String(row[0] || "").trim(), payloadHash = String(row[1] || "").trim().toLowerCase();
        const tutorialId = String(row[2] || "").trim(), expectedHash = String(row[3] || "").trim().toLowerCase();
        let snapshot = null;
        try { snapshot = JSON.parse(String(row[4] || "")); } catch (error) {}
        if (!/^tutorial-edit-[a-f0-9]{64}$/.test(operationId) || !/^[a-f0-9]{64}$/.test(payloadHash) ||
            !/^(?:tut-[A-Za-z0-9_-]{20,80}|legacy-[a-f0-9]{64})$/i.test(tutorialId) || !/^[a-f0-9]{64}$/.test(expectedHash) ||
            buildTutorialContentHash_([tutorialId, expectedHash, snapshot]) !== payloadHash ||
            !Array.isArray(snapshot) || snapshot.length !== 3 || snapshot.some(value => typeof value !== "string")) {
            throw new Error("TutorialEditEvents contiene una fila incompatible; requiere revisión.");
        }
        const item = { rowNumber: index + 2, operationId, payloadHash, tutorialId, expectedHash, snapshot };
        if (!operations.has(operationId)) operations.set(operationId, item);
        else if (operations.get(operationId).payloadHash !== payloadHash) {
            operations.get(operationId).conflictingPayloadCount = (operations.get(operationId).conflictingPayloadCount || 0) + 1;
        } else {
            operations.get(operationId).duplicateCount = (operations.get(operationId).duplicateCount || 0) + 1;
        }
    });
    return Array.from(operations.values());
}

function projectTutorialEditFields_(tutorialId, baseRow) {
    const row = baseRow.slice();
    const eventsSheet = getTutorialEditEventsSheet_(false);
    if (!eventsSheet) return { row, appliedOperations: new Map() };
    const events = readTutorialEditEvents_(eventsSheet).filter(event => event.tutorialId === String(tutorialId || "").trim());
    let current = [row[3], row[4], row[5]].map(value => String(value || ""));
    const appliedOperations = new Map();
    events.forEach(event => {
        const currentHash = buildTutorialEditFieldsHash_(current);
        if (event.expectedHash === currentHash) {
            current = event.snapshot.slice();
            appliedOperations.set(event.operationId, true);
        } else if (event.snapshot.every((value, index) => value === current[index])) {
            appliedOperations.set(event.operationId, true);
        } else {
            appliedOperations.set(event.operationId, false);
        }
    });
    // Una versión posterior aceptada puede materializar una versión anterior en la fila base.
    // Si su expectedHash coincide con el snapshot de un evento anterior, ese evento también quedó aplicado.
    for (let index = events.length - 1; index >= 0; index--) {
        const event = events[index];
        if (appliedOperations.get(event.operationId) === true) continue;
        const snapshotHash = buildTutorialEditFieldsHash_(event.snapshot);
        const chained = events.slice(index + 1).some(later =>
            appliedOperations.get(later.operationId) === true && later.expectedHash === snapshotHash);
        if (chained) appliedOperations.set(event.operationId, true);
    }
    row[3] = current[0]; row[4] = current[1]; row[5] = current[2];
    return { row, appliedOperations };
}

function findTutorialByIdentity_(sheet, tutorialId) {
    const id = String(tutorialId || "").trim();
    if (/^tut-[A-Za-z0-9_-]{20,80}$/i.test(id)) return findTutorialById_(sheet, id);
    if (!/^legacy-[a-f0-9]{64}$/i.test(id)) return null;
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;
    const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    const matches = [];
    rows.forEach((row, index) => {
        if (!String(row[0] || "").trim() && makeLegacyTutorialIdentity_(row[1]) === id) matches.push({ rowIndex: index + 2, row });
    });
    if (matches.length > 1) throw new Error("La identidad histórica del tutorial es ambigua; no se modificó.");
    return matches[0] || null;
}

function appendTutorialEditEvent_(tutorialId, baseRow, snapshot) {
    const id = String(tutorialId || "").trim();
    if (!/^(?:tut-[A-Za-z0-9_-]{20,80}|legacy-[a-f0-9]{64})$/i.test(id)) throw new Error("La edición append-only requiere una identidad de tutorial válida.");
    const expectedHash = buildTutorialEditFieldsHash_([baseRow[3], baseRow[4], baseRow[5]]);
    const normalizedSnapshot = snapshot.map(value => String(value || ""));
    const payloadHash = buildTutorialContentHash_([id, expectedHash, normalizedSnapshot]);
    const operationId = "tutorial-edit-" + payloadHash;
    const sheet = getTutorialEditEventsSheet_(true);
    let existing = readTutorialEditEvents_(sheet).find(event => event.operationId === operationId);
    if (existing && existing.payloadHash !== payloadHash) throw new Error("El identificador de edición ya pertenece a otro contenido.");
    if (!existing) {
        sheet.appendRow([operationId, payloadHash, id, expectedHash, JSON.stringify(normalizedSnapshot), new Date().toISOString()]);
        try { SpreadsheetApp.flush(); }
        catch (flushError) {
            existing = readTutorialEditEvents_(sheet).find(event => event.operationId === operationId);
            if (!existing || existing.payloadHash !== payloadHash) throw flushError;
        }
    }
    const tutorialSheet = getTutorialSheet_(false);
    const raw = tutorialSheet ? findTutorialByIdentity_(tutorialSheet, id) : null;
    if (!raw) throw new Error("Tutorial no encontrado después de registrar la edición.");
    const projected = projectTutorialEditFields_(id, raw.row);
    if (projected.appliedOperations.get(operationId) !== true ||
        !normalizedSnapshot.every((value, index) => value === projected.row[index + 3])) {
        throw new Error("Otra edición modificó esta versión del tutorial; actualiza los datos y vuelve a intentarlo.");
    }
    return { operationId, tutorialId: id, snapshot: normalizedSnapshot };
}

function tutorialRowMatchesSubmission_(row, fields) {
    return String(row[1] || "").trim() === fields.title &&
        String(row[3] || "").trim() === fields.comoIdentificarlo &&
        String(row[4] || "").trim() === fields.dondeEncontrarlo &&
        String(row[5] || "").trim() === fields.detalles &&
        String(row[7] || "").trim() === fields.collaborator;
}

function handleAddTutorial(payload) {
    const source = payload && typeof payload === "object" ? payload : {};
    const title = normalizeTutorialField_(source.tema, "El tema del tutorial", 30, true);
    const comoIdentificarlo = normalizeTutorialField_(source.comoIdentificarlo, "Cómo identificarlo", 700, false);
    const dondeEncontrarlo = normalizeTutorialField_(source.dondeEncontrarlo, "Dónde encontrarlo", 700, false);
    const detalles = normalizeTutorialField_(source.detalles !== undefined ? source.detalles : source.descripcion,
        "Los detalles", 700, false);
    const collaborator = normalizeTutorialField_(source.userName, "El colaborador verificado", 120, true);
    const operationId = String(source.operationId || "").trim().toLowerCase();
    if (!/^[a-z0-9_-]{20,80}$/.test(operationId)) throw new Error("Identificador de operación de tutorial inválido.");
    if (String(source.videoUrl || "").trim()) {
        throw new Error("El vídeo debe cargarse mediante el flujo de aprobación de YouTube; no se aceptan enlaces directos.");
    }

    const tutorialId = "tut-" + operationId;
    const submission = { title, comoIdentificarlo, dondeEncontrarlo, detalles, collaborator };
    const createOperationId = "tutorial-create-" + operationId;
    const createPayloadHash = buildTutorialContentHash_([tutorialId, submission]);
    const titleEventsSheet = getTutorialTitleEventsSheet_(false);
    const existingReservation = titleEventsSheet
        ? readTutorialTitleEvents_(titleEventsSheet).operations.find(item => item.operationId === createOperationId)
        : null;
    if (existingReservation && existingReservation.payloadHash !== createPayloadHash) {
        throw new Error("El identificador de operación ya pertenece a otro tutorial.");
    }
    const sheet = getTutorialSheet_(true);
    const existing = findTutorialById_(sheet, tutorialId);
    if (existing) {
        if (existingReservation && existingReservation.payloadHash === createPayloadHash) {
            return { status: "success", referenceId: String(existing.row[0] || tutorialId).trim(), alreadyCreated: true,
                message: "El tutorial ya existía; se devolvió el registro original." };
        }
        if (!tutorialRowMatchesSubmission_(existing.row, submission)) {
            throw new Error("El identificador de operación ya pertenece a otro tutorial.");
        }
        return { status: "success", referenceId: String(existing.row[0] || tutorialId).trim(), alreadyCreated: true,
            message: "El tutorial ya existía; se devolvió el registro original." };
    }
    if (tutorialTitleExists_(sheet, title)) {
        throw new Error("Ya existe un tutorial con ese tema; utiliza la edición del registro existente.");
    }

    appendTutorialTitleEvent_({
        operationId: createOperationId,
        tutorialId, action: "CLAIM", titleKey: normalizeTutorialTitle_(title), previousTitleKey: "",
        payloadHash: createPayloadHash
    });
    if (getTutorialTitleOwner_(title) !== tutorialId) {
        throw new Error("Ya existe un tutorial con ese tema; utiliza la edición del registro existente.");
    }

    const newRow = [tutorialId, title, "", comoIdentificarlo, dondeEncontrarlo, detalles, "", collaborator];
    sheet.appendRow(newRow);
    try {
        SpreadsheetApp.flush();
    } catch (flushError) {
        const recovered = findTutorialById_(sheet, tutorialId);
        if (recovered && TUTORIAL_HEADERS.every((header, index) =>
            String(recovered.row[index] || "").trim() === String(newRow[index] || "").trim())) {
            return { status: "success", referenceId: tutorialId, recovered: true,
                message: "Tutorial registrado y verificado después de una respuesta de guardado incierta." };
        }
        throw flushError;
    }

    const saved = findTutorialById_(sheet, tutorialId);
    if (!saved || TUTORIAL_HEADERS.some((header, index) =>
        String(saved.row[index] || "").trim() !== String(newRow[index] || "").trim())) {
        throw new Error("La fila guardada del tutorial no coincide con los datos enviados.");
    }
    return { status: "success", referenceId: tutorialId,
        message: "Tutorial registrado. El vídeo debe enviarse a aprobación antes de publicarse." };
}
function extractYouTubeId(url) { return getPysYouTubeVideoId_(url); }


function handleDeleteFeedbackItem(payload) {
    const source=payload&&typeof payload==="object"?payload:{},id=String(source.id||"").trim(),type=String(source.type||"").trim();
    if(!id||!type)throw new Error("Se requieren ID y Tipo de mensaje para eliminar.");
    let sheet,idColumn,missing;
    if(type==="problem_report"){sheet=getSafeSheet(SHEET_NAMES.FEEDBACKS);idColumn=COLS_FEEDBACKS.ID;missing="No se encontró el reporte especificado.";}
    else if(type==="contact_form"){sheet=getSafeSheet(SHEET_NAMES.CONTACTANOS);idColumn=COLS_CONTACTANOS.Contacto_ID;missing="No se encontró el mensaje de contacto especificado.";}
    else throw new Error("Tipo de mensaje desconocido.");
    if(!sheet)throw new Error("No se encontró la hoja correspondiente al mensaje.");
    const data=sheet.getDataRange().getValues(),matches=[];
    for(let i=1;i<data.length;i++)if(String(data[i][idColumn-1]===null||data[i][idColumn-1]===undefined?"":data[i][idColumn-1]).trim()===id)matches.push(i+1);
    if(matches.length!==1)throw new Error(matches.length>1?"El identificador del Inbox está duplicado; no se eliminó.":missing);
    appendInboxAuditEvent_(source,"delete",type,id);sheet.deleteRow(matches[0]);SpreadsheetApp.flush();
    return {status:"success",message:type==="problem_report"?"Reporte de problema eliminado correctamente.":"Mensaje de contacto eliminado correctamente."};
}

function normalizePysAssociationId_(value, fieldName) {
    const normalized = normalizeModelosAsociadosList_([value])[0] || "";
    if (!normalized) throw new Error("Se requiere un " + fieldName + " válido.");
    return normalized;
}

function normalizePysProblemId_(value) {
    const problemId = normalizePysAssociationId_(value, "problemId");
    const match = problemId.match(/^isue-(\d+)$/i);
    if (!match || !Number.isSafeInteger(Number(match[1])) || Number(match[1]) < 1) {
        throw new Error("problemId tiene un formato inválido.");
    }
    return problemId.toLowerCase();
}

function findUniqueCortesVehicleForPys_(value) {
    const requestedId = normalizePysAssociationId_(value, "vehicleId");
    const sheet = getSafeSheet(SHEET_NAMES.CORTES);
    if (!sheet) throw new Error("Hoja Cortes no encontrada.");
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error("No hay vehículos registrados en Cortes.");

    const idHeader = String(sheet.getRange(1, COLS_CORTES.id).getDisplayValues()[0][0] || "").trim().toLowerCase();
    if (idHeader !== "id") throw new Error("El encabezado ID de Cortes no coincide; no se modificó la relación.");

    const matches = sheet.getRange(2, COLS_CORTES.id, lastRow - 1, 1).getValues()
        .map((row, index) => ({ id: String(row[0] === null || row[0] === undefined ? "" : row[0]).trim(), rowNumber: index + 2 }))
        .filter(entry => entry.id === requestedId);
    if (matches.length !== 1) {
        throw new Error("vehicleId debe corresponder a exactamente un registro de Cortes.");
    }
    return matches[0].id;
}

function persistModelosAsociados_(sheet, rowNumber, values) {
    const normalized = normalizeModelosAsociadosList_(values);
    const serialized = normalized.length ? JSON.stringify(normalized) : "";
    const cell = sheet.getRange(rowNumber, 10);
    const currentValue = cell.getValue();
    const currentSerialized = currentValue === null || currentValue === undefined ? "" : String(currentValue);
    if (currentSerialized !== serialized) {
        cell.setValue(serialized);
        SpreadsheetApp.flush();
    }

    const persisted = parseModelosAsociados(cell.getValue());
    if (JSON.stringify(persisted) !== JSON.stringify(normalized)) {
        throw new Error("No se pudo confirmar la colección de vehículos persistida en pys.");
    }
    return persisted;
}

/* TAREA 11 (12.3): ASOCIACIÓN DE VEHÍCULOS A PROBLEMAS EN HOJA PYS (COLUMNA 10) */
function handleAddVehicleToProblem(payload) {
    const source = payload && typeof payload === "object" ? payload : {};
    const problemId = normalizePysProblemId_(source.problemId);
    const vehicleId = findUniqueCortesVehicleForPys_(source.vehicleId);
    const sheet = getPysSheet_(false);
    if (!sheet) throw new Error("Hoja pys no encontrada.");
    const matches = findPysRowsById_(sheet, problemId);
    if (matches.length !== 1) throw new Error(matches.length ? "El problema tiene un ID ambiguo." : "Problema no encontrado.");
    const currentList = parseModelosAsociados(matches[0].row[9]);
    if (!currentList.includes(vehicleId)) currentList.push(vehicleId);
    const persisted = persistModelosAsociados_(sheet, matches[0].rowNumber, currentList);
    return { status: "success", message: "Vehículo asociado al problema correctamente.", modelosAsociados: persisted };
}

/* TAREA 6: ELIMINAR RELACIÓN ENTRE PROBLEMA Y MODELO DE VEHÍCULO */
function handleRemoveVehicleFromProblem(payload) {
    const source = payload && typeof payload === "object" ? payload : {};
    if (normalizeFeedbackRole(source.userRole) !== "desarrollador") throw new Error("No tienes permisos suficientes para eliminar relaciones.");
    const problemId = normalizePysProblemId_(source.problemId);
    const vehicleId = findUniqueCortesVehicleForPys_(source.vehicleId);
    const sheet = getPysSheet_(false);
    if (!sheet) throw new Error("Hoja pys no encontrada.");
    const matches = findPysRowsById_(sheet, problemId);
    if (matches.length !== 1) throw new Error(matches.length ? "El problema tiene un ID ambiguo." : "Problema no encontrado.");
    const currentList = parseModelosAsociados(matches[0].row[9]);
    const persisted = persistModelosAsociados_(sheet, matches[0].rowNumber, currentList.filter(id => id !== vehicleId));
    return { status: "success", message: "Relación retirada con éxito.", modelosAsociados: persisted };
}

function handleClearActivityLogs(payload) {
    const keepLastWeek = payload && payload.keepLastWeek === true;
    const sheet = getSafeSheet(SHEET_NAMES.ACTIVIDAD_USUARIO);
    if (!sheet) {
        return { status: "success", message: "No se encontró la hoja ActividadUsuario; no se realizó ninguna eliminación.", deletedCount: 0, unclassifiedCount: 0 };
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
        return { status: "success", message: "No hay registros de actividad para eliminar.", deletedCount: 0, unclassifiedCount: 0 };
    }

    if (!keepLastWeek) {
        // La acción explícita de vaciado total incluye también registros sin fecha clasificable.
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
        SpreadsheetApp.flush();
        return {
            status: "success",
            message: "Todos los registros de actividad han sido eliminados.",
            deletedCount: lastRow - 1,
            unclassifiedCount: 0
        };
    }

    // Solo se lee la columna temporal necesaria; las filas sin fecha válida se conservan para revisión.
    const timestampColumn = COLS_ACTIVIDAD_USUARIO.timestamp;
    const timestampRows = sheet.getRange(2, timestampColumn, lastRow - 1, 1).getValues();
    const now = new Date().getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const rowsToDelete = [];
    let unclassifiedCount = 0;

    for (let index = timestampRows.length - 1; index >= 0; index--) {
        const rawTimestamp = timestampRows[index] && timestampRows[index][0];
        let entryTime = null;
        if (rawTimestamp instanceof Date) {
            const parsed = rawTimestamp.getTime();
            if (Number.isFinite(parsed)) entryTime = parsed;
        } else if (typeof rawTimestamp === "string" && rawTimestamp.trim() &&
            !/^[+-]?\d+(?:\.\d+)?$/.test(rawTimestamp.trim())) {
            const parsed = new Date(rawTimestamp.trim()).getTime();
            if (Number.isFinite(parsed)) entryTime = parsed;
        }

        if (entryTime === null) {
            unclassifiedCount++;
            continue;
        }
        if ((now - entryTime) > sevenDaysMs) rowsToDelete.push(index + 2);
    }

    // Las filas se agrupan y eliminan de abajo hacia arriba para evitar desplazamientos de índices.
    let cursor = 0;
    while (cursor < rowsToDelete.length) {
        let groupStart = rowsToDelete[cursor];
        const highestRow = groupStart;
        let groupCount = 1;
        cursor++;
        while (cursor < rowsToDelete.length && rowsToDelete[cursor] === groupStart - 1) {
            groupStart = rowsToDelete[cursor];
            groupCount++;
            cursor++;
        }
        if (typeof sheet.deleteRows === "function") {
            sheet.deleteRows(groupStart, groupCount);
        } else {
            for (let row = highestRow; row >= groupStart; row--) sheet.deleteRow(row);
        }
    }

    SpreadsheetApp.flush();
    const deletedCount = rowsToDelete.length;
    const retainedMessage = unclassifiedCount
        ? " Se conservaron " + unclassifiedCount + " registros con fecha vacía o no válida para revisión; no se eliminan por antigüedad inferida."
        : "";
    const resultMessage = deletedCount > 0
        ? "Se eliminaron " + deletedCount + " registros con antigüedad mayor a una semana."
        : "No se encontraron registros con más de 7 días para eliminar.";
    return {
        status: "success",
        message: resultMessage + retainedMessage,
        deletedCount,
        unclassifiedCount,
        retainedUnclassifiedCount: unclassifiedCount
    };
}


// La purga de Logs se ejecuta exclusivamente en AUTH, junto con logToSheet().
// ============================================================================
// TAREA 8.1 & 8.2: SUBIDA DIRECTA DE VÍDEOS A YOUTUBE Y APROBACIÓN PREVIA
// ============================================================================

/**
 * Inicializa la sesión de subida de vídeo a YouTube (Resumable Upload)
 */
function handleInitYouTubeUpload(payload) {
    const { title, description, contentType, referenceId, fileName, fileSize, fileType, opVideoId } = payload;
    if (!title) throw new Error("El título del vídeo es obligatorio.");
    if (!['corte', 'pys', 'tutorial'].includes(String(contentType || ''))) throw new Error("Tipo de contenido no válido para la subida.");
    if (!String(referenceId || '').trim()) throw new Error("Debes guardar primero el contenido para asociar el vídeo a un destino válido.");
    if (!/^[A-Za-z0-9_-]{20,80}$/.test(String(opVideoId || ''))) throw new Error("Identificador de operación de vídeo inválido.");
    const feedbackSheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
    if (!feedbackSheet) throw new Error("Hoja Feedbacks no encontrada; no se iniciará una subida sin poder registrar la aprobación.");
    const pendingForTarget = findPendingVideoApprovalForTarget_(feedbackSheet, contentType, referenceId);
    if (pendingForTarget) throw new Error("Ya existe una solicitud de vídeo pendiente para este contenido; no se iniciará otra subida.");
    const destination = getVideoApprovalTarget_({ contentType, referenceId });
    if (!destination.record) throw new Error("El registro de destino no existe; guarda el contenido antes de subir el vídeo.");
    const existingDestinationVideo = String(destination.sheet.getRange(destination.record.rowIndex, destination.videoColumn).getValue() || "").trim();
    if (existingDestinationVideo) throw new Error("El contenido ya tiene un vídeo asociado; no se iniciará una segunda subida.");

    // Configuración permanente y obligatoria de publicación de YouTube:
    const metadata = {
        snippet: {
            title: title,
            description: description || '',
            tags: [], // Etiquetas: Ninguna
            categoryId: '28' // Ciencia y Tecnología / Categoría predeterminada estándar
        },
        status: {
            privacyStatus: 'unlisted', // Visibilidad: No listado
            selfDeclaredMadeForKids: false, // Audiencia: No es contenido para niños
            embeddable: true,
            publicStatsViewable: false
        }
    };

    let uploadUrl = null;
    let videoId = null;

    try {
        // En entorno Google Apps Script con token OAuth de la cuenta administradora:
        const token = ScriptApp.getOAuthToken();
        const youtubeEndpoint = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';

        const options = {
            method: 'post',
            contentType: 'application/json; charset=UTF-8',
            headers: {
                'Authorization': 'Bearer ' + token,
                'X-Upload-Content-Type': fileType || 'video/mp4',
                'X-Upload-Content-Length': String(fileSize || 0)
            },
            payload: JSON.stringify(metadata),
            muteHttpExceptions: true
        };

        const res = UrlFetchApp.fetch(youtubeEndpoint, options);
        const responseCode = Number(res.getResponseCode());
        const headers = res.getAllHeaders();
        // Solo se acepta una sesión creada por el endpoint oficial de YouTube.
        uploadUrl = headers['Location'] || headers['location'] || null;
        if (responseCode < 200 || responseCode >= 300) {
            throw new Error("YouTube rechazó la inicialización de la sesión (HTTP " + responseCode + ").");
        }
        if (!uploadUrl || !/^https:\/\/www\.googleapis\.com\/upload\/youtube\/v3\/videos\?upload_id=/.test(String(uploadUrl))) {
            uploadUrl = null;
            throw new Error("YouTube no devolvió una URL de sesión reanudable válida.");
        }
    } catch (e) {
        uploadUrl = null;
        Logger.log("Aviso de inicialización OAuth YouTube: " + e.message);
    }

    // Sin URL oficial de sesión no se autoriza la transferencia; opVideoId nunca sustituye videoId.
    return {
        status: uploadUrl ? 'success' : 'error',
        opVideoId: String(opVideoId),
        uploadUrl: uploadUrl,
        message: uploadUrl ? 'Sesión Resumable de YouTube obtenida.' : 'YouTube no devolvió una URL de sesión reanudable; no se inició la transferencia.'
    };
}

/**
 * Registra la solicitud de aprobación de un vídeo subido a YouTube
 */
function findVideoApprovalByOperation_(sheet, opVideoId) {
    const operationId = String(opVideoId || "").trim();
    const lastRow = sheet ? sheet.getLastRow() : 0;
    if (!operationId || lastRow < 2) return null;
    const problemRange = sheet.getRange(2, COLS_FEEDBACKS.Problema, lastRow - 1, 1);
    let candidates = [];
    if (problemRange && typeof problemRange.createTextFinder === "function") {
        candidates = problemRange.createTextFinder(operationId).matchCase(true).findAll();
    } else {
        // Fallback de compatibilidad limitado a la columna Problema.
        problemRange.getValues().forEach((value, index) => {
            if (String(value[0] || "").includes(operationId)) candidates.push({ getRow: () => index + 2 });
        });
    }
    const matches = [];
    const lastColumn = Math.max(COLS_FEEDBACKS.Problema, sheet.getLastColumn());
    candidates.forEach(candidate => {
        const rowIndex = candidate.getRow();
        let data = null;
        try {
            data = JSON.parse(String(sheet.getRange(rowIndex, COLS_FEEDBACKS.Problema, 1, 1).getValues()[0][0] || ""));
        } catch (error) {}
        if (data && data.subType === "video_approval" && String(data.opVideoId || "") === operationId) {
            const row = sheet.getRange(rowIndex, 1, 1, lastColumn).getValues()[0];
            matches.push({ rowIndex, row, data });
        }
    });
    if (matches.length > 1) throw new Error("El identificador de operación ya está duplicado en Feedbacks; requiere revisión.");
    return matches[0] || null;
}

function findPendingVideoApprovalForTarget_(sheet, contentType, referenceId) {
    const targetType = String(contentType || "");
    const targetId = String(referenceId || "").trim();
    if (!targetType || !targetId) throw new Error("Se requiere tipo e ID de destino para consultar solicitudes pendientes.");
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;
    const problemRange = sheet.getRange(2, COLS_FEEDBACKS.Problema, lastRow - 1, 1);
    let candidates = [];
    if (problemRange && typeof problemRange.createTextFinder === "function") {
        candidates = problemRange.createTextFinder(targetId).matchCase(true).findAll();
    } else {
        // Fallback de compatibilidad limitado a la columna Problema.
        problemRange.getValues().forEach((value, index) => {
            if (String(value[0] || "").includes(targetId)) candidates.push({ getRow: () => index + 2 });
        });
    }
    const matches = [];
    const lastColumn = Math.max(COLS_FEEDBACKS.Problema, sheet.getLastColumn());
    candidates.forEach(candidate => {
        const rowIndex = candidate.getRow();
        let data = null;
        try {
            data = JSON.parse(String(sheet.getRange(rowIndex, COLS_FEEDBACKS.Problema, 1, 1).getValues()[0][0] || ""));
        } catch (error) {}
        if (data && data.subType === "video_approval" && data.status === "pending" &&
            String(data.contentType || "") === targetType && String(data.referenceId || "") === targetId) {
            const row = sheet.getRange(rowIndex, 1, 1, lastColumn).getValues()[0];
            matches.push({ rowIndex, row, data });
        }
    });
    if (matches.length > 1) throw new Error("El destino ya tiene varias solicitudes de vídeo pendientes; requiere revisión.");
    return matches[0] || null;
}

function handleGetVideoApprovalByOperation(payload) {
    const { opVideoId, userId } = payload || {};
    const operationId = String(opVideoId || "").trim();
    if (!/^[A-Za-z0-9_-]{20,80}$/.test(operationId)) throw new Error("Identificador de operación de vídeo inválido.");
    if (!String(userId || "").trim()) throw new Error("La sesión no proporcionó una identidad válida.");
    const sheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
    if (!sheet) throw new Error("Hoja Feedbacks no encontrada.");
    const record = findVideoApprovalByOperation_(sheet, operationId);
    if (!record) return { status: "success", found: false, opVideoId: operationId };
    if (String(record.data.createdByUserId || "") !== String(userId)) {
        throw new Error("La operación de vídeo no pertenece al usuario autenticado.");
    }
    return {
        status: "success",
        found: true,
        id: String(record.row[COLS_FEEDBACKS.ID - 1] || ""),
        opVideoId: operationId,
        approvalStatus: String(record.data.status || ""),
        contentType: String(record.data.contentType || ""),
        referenceId: String(record.data.referenceId || ""),
        videoUrl: String(record.data.videoUrl || "")
    };
}

function handleSubmitVideoForApproval(payload) {
    return (() => {
 const source=payload&&typeof payload==="object"?payload:{}, {title,description,contentType,referenceId,metadata,videoId,userName,userId,opVideoId}=source,videoUrl=source.videoUrl;
 const operationId=String(opVideoId||"").trim(),actualVideoId=String(videoId||"").trim(),canonicalUrl=normalizeInboxVideoUrl_(videoUrl,actualVideoId);
 const normalizedTitle=normalizeInboxText_(title,"El título del vídeo",INBOX_VIDEO_TITLE_MAX_LENGTH,false);
 const normalizedDescription=description===undefined||description===null?"":normalizeInboxText_(description,"La descripción del vídeo",INBOX_VIDEO_DESCRIPTION_MAX_LENGTH,true);
 const normalizedContentType=String(contentType||""),normalizedReferenceId=normalizeInboxText_(String(referenceId===undefined||referenceId===null?"":referenceId),"La referencia del contenido",INBOX_VIDEO_REFERENCE_MAX_LENGTH,false);
 const normalizedUserName=normalizeInboxText_(String(userName||"Colaborador"),"El nombre del colaborador",INBOX_VIDEO_USER_MAX_LENGTH,false),normalizedMetadata=normalizeInboxVideoMetadata_(metadata,normalizedContentType);
 if(!/^[A-Za-z0-9_-]{20,80}$/.test(operationId))throw new Error("Identificador de operación de vídeo inválido.");
 if(!["corte","pys","tutorial"].includes(normalizedContentType))throw new Error("Tipo de contenido no válido para aprobación.");
 if(!/^[A-Za-z0-9_-]{11}$/.test(actualVideoId)||!canonicalUrl)throw new Error("YouTube no confirmó un ID real o la URL no coincide con el vídeo.");
 if(!String(userId||"").trim())throw new Error("La sesión no proporcionó una identidad válida.");
 const sheet=getSafeSheet(SHEET_NAMES.FEEDBACKS);if(!sheet)throw new Error("Hoja Feedbacks no encontrada.");
 const existing=findVideoApprovalByOperation_(sheet,operationId);
 if(existing){const data=existing.data,sameOperation=String(data.createdByUserId||"")===String(userId)&&String(data.contentType||"")===normalizedContentType&&String(data.referenceId||"")===normalizedReferenceId&&String(data.videoId||"")===actualVideoId&&String(data.videoUrl||"")===canonicalUrl&&String(data.title||"")===normalizedTitle&&String(data.description||"")===normalizedDescription;
  if(!sameOperation)throw new Error("El identificador de operación ya pertenece a una solicitud distinta; no se creó otra solicitud.");
  return{status:"success",id:String(existing.row[COLS_FEEDBACKS.ID-1]||""),opVideoId:operationId,videoUrl:canonicalUrl,approvalStatus:String(data.status||"pending"),message:"La solicitud de aprobación ya existía; se devolvió el registro original."};}
 const pendingForTarget=findPendingVideoApprovalForTarget_(sheet,normalizedContentType,normalizedReferenceId);
 if(pendingForTarget)throw new Error("Ya existe una solicitud de vídeo pendiente para este contenido. Revisa la bandeja de aprobación antes de enviar otra.");
 const destination=getVideoApprovalTarget_({contentType:normalizedContentType,referenceId:normalizedReferenceId});
 if(!destination.record)throw new Error("El registro de destino ya no existe; no se creó la solicitud.");
 const currentDestinationVideo=String(destination.sheet.getRange(destination.record.rowIndex,destination.videoColumn).getValue()||"").trim();
 if(currentDestinationVideo)throw new Error("El destino ya tiene un vídeo asociado; no se creó una solicitud duplicada.");
 const newId="vid-"+Utilities.getUuid().slice(0,8),dateStr=Utilities.formatDate(new Date(),Session.getScriptTimeZone()||"GMT-5","yyyy-MM-dd HH:mm:ss");
 const videoApprovalPayload={subType:"video_approval",opVideoId:operationId,createdByUserId:String(userId),title:normalizedTitle,description:normalizedDescription,videoUrl:canonicalUrl,videoId:actualVideoId,contentType:normalizedContentType,referenceId:normalizedReferenceId,metadata:normalizedMetadata,status:"pending",date:dateStr};
 const newRowNumber=sheet.getLastRow()+1,newRow=[newId,normalizedUserName,normalizedReferenceId,JSON.stringify(videoApprovalPayload),"pending",false,"","",""];
 sheet.getRange(newRowNumber,1,1,COLS_FEEDBACKS.anoSugerido).setValues([newRow]);SpreadsheetApp.flush();
 const saved=findVideoApprovalByOperation_(sheet,operationId);
 if(!saved||String(saved.row[COLS_FEEDBACKS.ID-1]||"")!==newId)throw new Error("No se pudo verificar la persistencia de la solicitud de aprobación. Reintenta con el mismo identificador de operación.");
 return{status:"success",id:newId,opVideoId:operationId,videoUrl:canonicalUrl,approvalStatus:"pending",message:"Vídeo enviado para aprobación interna."};
    })();
}

/**
 * Aprueba una solicitud de vídeo y lo asocia al elemento correspondiente en GPSpedia
 */
const VIDEO_APPROVAL_EVENTS_HEADERS_ = Object.freeze([
    "eventId", "payloadHash", "itemId", "decision", "snapshotJson", "createdAt"
]);
function getVideoApprovalEventsSheet_(createIfMissing) {
    if (typeof getSpreadsheet !== "function") return null;
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("VideoApprovalEvents");
    if (!sheet && createIfMissing) {
        try { sheet = ss.insertSheet("VideoApprovalEvents"); }
        catch (error) { sheet = ss.getSheetByName("VideoApprovalEvents"); if (!sheet) throw error; }
    }
    if (!sheet) return null;
    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, VIDEO_APPROVAL_EVENTS_HEADERS_.length).setValues([VIDEO_APPROVAL_EVENTS_HEADERS_.slice()]);
        SpreadsheetApp.flush();
        return sheet;
    }
    const width = Math.max(VIDEO_APPROVAL_EVENTS_HEADERS_.length, sheet.getLastColumn());
    const headers = sheet.getRange(1, 1, 1, width).getDisplayValues()[0].map(value => String(value || "").trim());
    if (width !== VIDEO_APPROVAL_EVENTS_HEADERS_.length ||
        VIDEO_APPROVAL_EVENTS_HEADERS_.some((header, index) => headers[index] !== header)) {
        throw new Error("El esquema de VideoApprovalEvents no coincide; no se modificó la hoja.");
    }
    return sheet;
}
function parseVideoApprovalEventRow_(row, rowNumber) {
    const eventId = String(row[0] || "").trim(), payloadHash = String(row[1] || "").trim().toLowerCase();
    const itemId = String(row[2] || "").trim(), decision = String(row[3] || "").trim();
    let snapshot = null;
    try { snapshot = JSON.parse(String(row[4] || "")); } catch (error) {}
    if (!/^video-approval-[a-f0-9]{64}$/.test(eventId) || !/^[a-f0-9]{64}$/.test(payloadHash) ||
        !/^[A-Za-z0-9_-]{1,100}$/.test(itemId) || !["approved", "rejected"].includes(decision) ||
        !snapshot || typeof snapshot !== "object" || Array.isArray(snapshot) ||
        !snapshot.videoData || snapshot.videoData.status !== decision ||
        snapshot.resolved !== true || !String(snapshot.responder || "").trim() ||
        String(snapshot.response || "") !== (decision === "approved" ? "approved" : "rejected: " + String(snapshot.videoData.rejectReason || ""))) {
        throw new Error("VideoApprovalEvents contiene una fila incompatible; requiere revisión.");
    }
    const expectedHash = buildTutorialContentHash_([itemId, decision, snapshot]);
    if (payloadHash !== expectedHash || eventId !== "video-approval-" + expectedHash) {
        throw new Error("VideoApprovalEvents contiene un hash alterado; requiere reconciliación.");
    }
    return { rowNumber, eventId, payloadHash, itemId, decision, snapshot };
}
function getVideoApprovalEventForItem_(itemId) {
    const id = String(itemId || "").trim();
    if (!id || typeof getSpreadsheet !== "function" || typeof SpreadsheetApp === "undefined") return null;
    const sheet = getVideoApprovalEventsSheet_(false);
    if (!sheet || sheet.getLastRow() < 2) return null;
    const last = sheet.getLastRow(), matches = [], column = sheet.getRange(2, 3, last - 1, 1);
    if (typeof column.createTextFinder === "function") {
        let finder = column.createTextFinder(id);
        if (finder.matchCase) finder = finder.matchCase(true);
        if (finder.matchEntireCell) finder = finder.matchEntireCell(true);
        matches.push(...finder.findAll().map(match => match.getRow()));
    } else {
        column.getValues().forEach((row, index) => { if (String(row[0] || "").trim() === id) matches.push(index + 2); });
    }
    if (!matches.length) return null;
    const events = matches.map(rowNumber =>
        parseVideoApprovalEventRow_(sheet.getRange(rowNumber, 1, 1, VIDEO_APPROVAL_EVENTS_HEADERS_.length).getValues()[0], rowNumber));
    const first = events[0];
    if (events.some(event => event.eventId !== first.eventId || event.payloadHash !== first.payloadHash || event.decision !== first.decision)) {
        throw new Error("La solicitud tiene transiciones de vídeo contradictorias; requiere reconciliación.");
    }
    return first;
}
function appendVideoApprovalEvent_(itemId, decision, snapshot) {
    const id = String(itemId || "").trim(), action = String(decision || "").trim();
    if (!id || !["approved", "rejected"].includes(action)) throw new Error("Transición de vídeo no válida.");
    const payloadHash = buildTutorialContentHash_([id, action, snapshot]), eventId = "video-approval-" + payloadHash;
    const existing = getVideoApprovalEventForItem_(id);
    if (existing) {
        if (existing.eventId !== eventId || existing.payloadHash !== payloadHash || existing.decision !== action) {
            throw new Error("La solicitud ya tiene una transición terminal diferente; no se sobrescribió.");
        }
        return existing;
    }
    const sheet = getVideoApprovalEventsSheet_(true);
    sheet.appendRow([eventId, payloadHash, id, action, JSON.stringify(snapshot), new Date().toISOString()]);
    try { SpreadsheetApp.flush(); }
    catch (flushError) {
        const recovered = getVideoApprovalEventForItem_(id);
        if (!recovered || recovered.eventId !== eventId) throw flushError;
        return recovered;
    }
    const saved = getVideoApprovalEventForItem_(id);
    if (!saved || saved.eventId !== eventId || saved.payloadHash !== payloadHash) {
        throw new Error("No se pudo confirmar el evento append-only de aprobación; reintenta la misma operación.");
    }
    return saved;
}
function materializeVideoApprovalEvent_(sheet, event) {
    if (!event) return null;
    const snapshot = event.snapshot, rowIndex = event.rowNumberFeedback;
    if (!snapshot || !snapshot.videoData || !Number.isInteger(rowIndex) || rowIndex < 2) {
        throw new Error("El evento de aprobación no contiene una fila de Feedbacks válida.");
    }
    sheet.getRange(rowIndex, COLS_FEEDBACKS.Problema, 1, 4).setValues([[
        JSON.stringify(snapshot.videoData), snapshot.response, true, snapshot.responder
    ]]);
    SpreadsheetApp.flush();
    const saved = sheet.getRange(rowIndex, 1, 1, COLS_FEEDBACKS.Responde).getValues()[0];
    let savedPayload = null;
    try { savedPayload = JSON.parse(String(saved[COLS_FEEDBACKS.Problema - 1] || "")); } catch (error) {}
    if (!savedPayload || savedPayload.status !== event.decision ||
        String(saved[COLS_FEEDBACKS.Respuesta - 1] || "") !== snapshot.response ||
        saved[COLS_FEEDBACKS["Se resolvio"] - 1] !== true ||
        String(saved[COLS_FEEDBACKS.Responde - 1] || "").trim() !== snapshot.responder) {
        throw new Error("El evento de vídeo existe, pero no se pudo materializar su estado en Feedbacks; reintenta.");
    }
    return savedPayload;
}


function findPendingVideoApproval_(sheet, itemId, options) {
    const requestId = String(itemId || "").trim();
    if (!requestId) throw new Error("ID de la solicitud requerido.");
    const rows = sheet.getDataRange().getValues(), matches = [];
    for (let index = 1; index < rows.length; index++) {
        if (String(rows[index][COLS_FEEDBACKS.ID - 1] || "").trim() === requestId) matches.push({ rowIndex: index + 1, row: rows[index].slice() });
    }
    if (matches.length !== 1) throw new Error(matches.length > 1
        ? "El ID de solicitud aparece más de una vez; requiere revisión." : "Solicitud de vídeo no encontrada.");
    let videoData = null;
    try { videoData = JSON.parse(String(matches[0].row[COLS_FEEDBACKS.Problema - 1] || "")); } catch (error) {}
    if (!videoData || typeof videoData !== "object" || Array.isArray(videoData)) throw new Error("El contenido de la solicitud no es un JSON de vídeo válido.");
    if (videoData.subType !== "video_approval") throw new Error("El registro no corresponde a una solicitud de aprobación de vídeo.");
    const event = getVideoApprovalEventForItem_(requestId);
    if (event) {
        const original = videoData, projected = event.snapshot.videoData;
        ["videoId", "videoUrl", "contentType", "referenceId", "opVideoId", "createdByUserId"].forEach(key => {
            if (String(original[key] || "") !== String(projected[key] || "")) throw new Error("El evento de vídeo no coincide con la solicitud original; requiere revisión.");
        });
        videoData = projected;
        matches[0].row[COLS_FEEDBACKS.Problema - 1] = JSON.stringify(videoData);
        matches[0].row[COLS_FEEDBACKS.Respuesta - 1] = event.snapshot.response;
        matches[0].row[COLS_FEEDBACKS["Se resolvio"] - 1] = true;
        matches[0].row[COLS_FEEDBACKS.Responde - 1] = event.snapshot.responder;
        event.rowNumberFeedback = matches[0].rowIndex;
    }
    const allowApprovedRetry = options && options.allowApprovedRetry === true;
    const allowRejectedRetry = options && options.allowRejectedRetry === true;
    const isPending = videoData.status === "pending";
    const isApprovedRetry = allowApprovedRetry && videoData.status === "approved";
    const isRejectedRetry = allowRejectedRetry && event && event.decision === "rejected" && videoData.status === "rejected";
    if (!isPending && !isApprovedRetry && !isRejectedRetry) throw new Error("La solicitud ya no está pendiente; no se permiten transiciones repetidas.");
    const videoId = String(videoData.videoId || "").trim();
    const canonicalUrl = /^[A-Za-z0-9_-]{11}$/.test(videoId) ? "https://www.youtube.com/watch?v=" + videoId : "";
    if (!canonicalUrl || String(videoData.videoUrl || "").trim() !== canonicalUrl) throw new Error("La solicitud contiene un ID o enlace de YouTube inconsistente.");
    if (!["corte", "pys", "tutorial"].includes(String(videoData.contentType || ""))) throw new Error("La solicitud contiene un tipo de contenido desconocido.");
    const referenceId = String(videoData.referenceId || "").trim();
    if (!referenceId) throw new Error("La solicitud no tiene un destino guardado para asociar el vídeo.");
    if (String(matches[0].row[COLS_FEEDBACKS.ID_vehiculo - 1] || "").trim() !== referenceId) throw new Error("El destino de la fila no coincide con el destino declarado en la solicitud de vídeo.");
    if (!String(videoData.title || "").trim()) throw new Error("La solicitud no contiene un título válido.");
    if (!String(videoData.createdByUserId || "").trim()) throw new Error("La solicitud no identifica al usuario que envió el vídeo.");
    if (videoData.opVideoId && !/^[A-Za-z0-9_-]{20,80}$/.test(String(videoData.opVideoId))) throw new Error("La solicitud contiene un identificador de operación inválido.");
    const row = matches[0].row, rowStatus = String(row[COLS_FEEDBACKS.Respuesta - 1] || "").trim();
    const rawResolved = row[COLS_FEEDBACKS["Se resolvio"] - 1];
    const rowResolved = rawResolved === true || String(rawResolved || "").trim().toLowerCase() === "true";
    if (isPending && (rowStatus !== "pending" || rowResolved)) throw new Error("El estado de la fila no coincide con una solicitud de vídeo pendiente.");
    if (isApprovedRetry && (rowStatus !== "approved" || !rowResolved ||
        String(row[COLS_FEEDBACKS.Responde - 1] || "").trim() !== String(videoData.approvedBy || "").trim())) {
        throw new Error("El estado de la fila no coincide con una aprobación de vídeo confirmada.");
    }
    if (isRejectedRetry && (rowStatus !== "rejected: " + String(videoData.rejectReason || "") || !rowResolved ||
        String(row[COLS_FEEDBACKS.Responde - 1] || "").trim() !== String(videoData.rejectedBy || "").trim())) {
        throw new Error("El estado de la fila no coincide con un rechazo de vídeo confirmado.");
    }
    return { rowIndex: matches[0].rowIndex, row, videoData, event };
}
function findUniqueVideoTargetRow_(sheet, id, idColumn, label) {
    if (!sheet) throw new Error("No se encontró el destino " + label + " de la solicitud.");
    const data = sheet.getDataRange().getValues();
    const matches = [];
    for (let index = 1; index < data.length; index++) {
        if (String(data[index][idColumn - 1] || "").trim() === String(id).trim()) {
            matches.push({ rowIndex: index + 1, row: data[index] });
        }
    }
    if (matches.length !== 1) {
        throw new Error(matches.length > 1
            ? "El destino " + label + " aparece más de una vez; no se modificó."
            : "No se encontró el destino " + label + " de la solicitud.");
    }
    return matches[0];
}

function getVideoApprovalTarget_(videoData) {
    const referenceId = String(videoData.referenceId || "").trim();
    if (!referenceId) throw new Error("La solicitud no tiene un destino válido.");
    if (videoData.contentType === "corte") {
        const sheet = getSafeSheet(SHEET_NAMES.CORTES);
        if (!sheet) throw new Error("Hoja Cortes no encontrada.");
        const width = Math.max(COLS_CORTES.videoGuiaDesarmeUrl, sheet.getLastColumn());
        const headers = sheet.getRange(1, 1, 1, width).getDisplayValues()[0];
        if (String(headers[COLS_CORTES.id - 1] || "").trim() !== "id" ||
            String(headers[COLS_CORTES.videoGuiaDesarmeUrl - 1] || "").trim() !== "videoGuiaDesarmeUrl") {
            throw new Error("El esquema de Cortes no permite identificar con seguridad el campo del vídeo.");
        }
        return { type: "corte", sheet, record: findUniqueVideoTargetRow_(sheet, referenceId, COLS_CORTES.id, "Cortes"), videoColumn: COLS_CORTES.videoGuiaDesarmeUrl };
    }
    if (videoData.contentType === "pys") {
        const sheet = getPysSheet_(false);
        if (!sheet) throw new Error("Hoja pys no encontrada.");
        const headers = sheet.getRange(1, 1, 1, Math.max(10, sheet.getLastColumn())).getDisplayValues()[0];
        if (String(headers[0] || "").trim() !== "id_problem" || String(headers[7] || "").trim() !== "Video") {
            throw new Error("El esquema de pys no coincide con las columnas id_problem/Video esperadas.");
        }
        return { type: "pys", sheet, record: findUniqueVideoTargetRow_(sheet, referenceId, 1, "PyS"), videoColumn: 8 };
    }
    if (videoData.contentType === "tutorial") {
        const sheet = getTutorialSheet_(false);
        if (!sheet) throw new Error("Hoja Tutorial no encontrada.");
        return { type: "tutorial", sheet, record: findTutorialRow_(sheet, referenceId, true), videoColumn: 7, imageColumn: 3 };
    }
    throw new Error("Tipo de destino de vídeo no reconocido.");
}

function publishApprovedVideo_(videoData) {
    const target = getVideoApprovalTarget_(videoData);
    if (!target.record) throw new Error("El registro de destino ya no existe; no se publicó el vídeo.");
    const url = String(videoData.videoUrl || "").trim();
    const current = String(target.record.row[target.videoColumn - 1] || "").trim();
    if (current && current !== url) throw new Error("El destino ya contiene otro vídeo; no se sobrescribió.");
    let expectedImage = null;
    if (target.type === "tutorial") {
        const imageColumn = target.imageColumn;
        const currentImage = String(target.record.row[imageColumn - 1] || "").trim();
        if (!currentImage) {
            expectedImage = "https://img.youtube.com/vi/" + String(videoData.videoId) + "/hqdefault.jpg";
            target.sheet.getRange(target.record.rowIndex, imageColumn).setValue(expectedImage);
        }
    }
    // La URL del vídeo es el punto de publicación: se escribe después de preparar la miniatura.
    if (current !== url) target.sheet.getRange(target.record.rowIndex, target.videoColumn).setValue(url);
    SpreadsheetApp.flush();
    const savedVideo = String(target.sheet.getRange(target.record.rowIndex, target.videoColumn).getValue() || "").trim();
    if (savedVideo !== url) throw new Error("La escritura del vídeo no pudo verificarse en el destino.");
    if (expectedImage !== null) {
        const savedImage = String(target.sheet.getRange(target.record.rowIndex, target.imageColumn).getValue() || "").trim();
        if (savedImage !== expectedImage) throw new Error("La miniatura del tutorial no pudo verificarse; la publicación requiere revisión.");
    }
    return { targetType: target.type, rowIndex: target.record.rowIndex };
}

function removeRejectedVideoFromDestination_(videoData) {
    const target = getVideoApprovalTarget_(videoData);
    if (!target.record) throw new Error("El registro de destino ya no existe; no se pudo verificar el rechazo.");
    const url = String(videoData.videoUrl || "").trim();
    const current = String(target.record.row[target.videoColumn - 1] || "").trim();
    if (current === url) target.sheet.getRange(target.record.rowIndex, target.videoColumn).setValue("");
    if (target.type === "tutorial") {
        const imageColumn = target.imageColumn;
        const thumbnail = "https://img.youtube.com/vi/" + String(videoData.videoId) + "/hqdefault.jpg";
        const currentImage = String(target.record.row[imageColumn - 1] || "").trim();
        if (currentImage === thumbnail) target.sheet.getRange(target.record.rowIndex, imageColumn).setValue("");
    }
    SpreadsheetApp.flush();
    const savedVideo = String(target.sheet.getRange(target.record.rowIndex, target.videoColumn).getValue() || "").trim();
    if (savedVideo === url) throw new Error("El enlace rechazado continúa visible en el destino.");
    return { targetType: target.type, rowIndex: target.record.rowIndex };
}

function handleApproveVideoUnlocked_(payload) {
    const { itemId, userName, userRole } = payload || {};
    const allowedRoles = ["Desarrollador", "Jefe", "Supervisor"];
    if (!userRole || !allowedRoles.includes(userRole)) throw new Error("No tienes permisos suficientes para aprobar vídeos.");
    const sheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
    if (!sheet) throw new Error("Hoja Feedbacks no encontrada.");
    const approvalRecord = findPendingVideoApproval_(sheet, itemId, { allowApprovedRetry: true });
    const rowIndex = approvalRecord.rowIndex;
    const videoData = approvalRecord.videoData;

    if (videoData.status === "approved") {
        if (approvalRecord.event) materializeVideoApprovalEvent_(sheet, approvalRecord.event);
        const responseState = String(approvalRecord.row[COLS_FEEDBACKS.Respuesta - 1] || "").trim();
        const responder = String(approvalRecord.row[COLS_FEEDBACKS.Responde - 1] || "").trim();
        const resolved = approvalRecord.row[COLS_FEEDBACKS["Se resolvio"] - 1] === true;
        if (responseState !== "approved" || !resolved ||
            !String(videoData.approvedBy || "").trim() ||
            !String(videoData.approvalDate || "").trim() ||
            responder !== String(videoData.approvedBy).trim()) {
            throw new Error("La solicitud figura aprobada, pero su registro de aprobación está incompleto; requiere revisión.");
        }
        // Una respuesta perdida puede dejar la aprobación guardada antes de publicar.
        // El reintento completa la publicación sin volver a cambiar el estado aprobado.
        const targetResult = publishApprovedVideo_(videoData);
        return {
            status: "success",
            alreadyApproved: true,
            message: "La solicitud ya estaba aprobada; se verificó o completó la publicación en el destino.",
            videoUrl: videoData.videoUrl,
            targetType: targetResult.targetType,
            contentType: videoData.contentType,
            referenceId: videoData.referenceId
        };
    }

    // Se valida el destino sin escribirlo: una solicitud inválida nunca queda aprobada.
    const destination = getVideoApprovalTarget_(videoData);
    const currentDestinationVideo = String(destination.record.row[destination.videoColumn - 1] || "").trim();
    if (currentDestinationVideo && currentDestinationVideo !== String(videoData.videoUrl || "").trim()) {
        throw new Error("El destino ya contiene otro vídeo; no se sobrescribió.");
    }

    // La decisión se persiste y verifica antes de publicar la URL.
    // Si falla la publicación, el estado aprobado permite reintentar sin exponer
    // un enlace mientras la solicitud todavía figure como pendiente.
    const actorName = String(userName || "Supervisor").trim() || "Supervisor";
    videoData.status = "approved";
    videoData.approvedBy = actorName;
    videoData.approvalDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT-5", "yyyy-MM-dd HH:mm:ss");
    const approvalEvent = appendVideoApprovalEvent_(itemId, "approved", {
        videoData: JSON.parse(JSON.stringify(videoData)), response: "approved", resolved: true, responder: actorName
    });
    materializeVideoApprovalEvent_(sheet, Object.assign({}, approvalEvent, { rowNumberFeedback: rowIndex }));

    const saved = sheet.getRange(rowIndex, 1, 1, COLS_FEEDBACKS.Responde).getValues()[0];
    let savedPayload = null;
    try { savedPayload = JSON.parse(String(saved[COLS_FEEDBACKS.Problema - 1] || "")); } catch (error) {}
    if (!savedPayload || savedPayload.subType !== "video_approval" ||
        savedPayload.status !== "approved" ||
        String(savedPayload.videoId || "") !== String(videoData.videoId || "") ||
        String(savedPayload.videoUrl || "") !== String(videoData.videoUrl || "") ||
        String(savedPayload.contentType || "") !== String(videoData.contentType || "") ||
        String(savedPayload.referenceId || "") !== String(videoData.referenceId || "") ||
        String(savedPayload.approvedBy || "").trim() !== actorName ||
        !String(savedPayload.approvalDate || "").trim() ||
        String(saved[COLS_FEEDBACKS.ID - 1] || "") !== String(itemId || "") ||
        String(saved[COLS_FEEDBACKS.Respuesta - 1] || "") !== "approved" ||
        saved[COLS_FEEDBACKS["Se resolvio"] - 1] !== true ||
        String(saved[COLS_FEEDBACKS.Responde - 1] || "").trim() !== actorName) {
        throw new Error("No se pudo confirmar la aprobación; el vídeo no se publicó. Reintenta la misma solicitud.");
    }

    const targetResult = publishApprovedVideo_(savedPayload);
    return {
        status: "success",
        message: "Vídeo aprobado y publicado en GPSpedia.",
        videoUrl: savedPayload.videoUrl,
        targetType: targetResult.targetType,
        contentType: savedPayload.contentType,
        referenceId: savedPayload.referenceId
    };
}


/**
 * Rechaza una solicitud de vídeo y elimina únicamente el enlace pendiente exacto si ya estuviera publicado.
 */
function handleRejectVideoUnlocked_(payload) {
    const { itemId, userName, reason, userRole } = payload || {};
    const allowedRoles = ["Desarrollador", "Jefe", "Supervisor"];
    if (!userRole || !allowedRoles.includes(userRole)) throw new Error("No tienes permisos suficientes para rechazar vídeos.");
    const sheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
    if (!sheet) throw new Error("Hoja Feedbacks no encontrada.");
    const approvalRecord = findPendingVideoApproval_(sheet, itemId, { allowRejectedRetry: true });
    const rowIndex = approvalRecord.rowIndex, videoData = approvalRecord.videoData;
    if (videoData.status === "rejected") {
        if (!approvalRecord.event || approvalRecord.event.decision !== "rejected") throw new Error("La solicitud ya no está pendiente; no se permiten transiciones repetidas.");
        materializeVideoApprovalEvent_(sheet, approvalRecord.event);
        const targetResult = removeRejectedVideoFromDestination_(videoData);
        return { status: "success", alreadyRejected: true, message: "El rechazo ya estaba registrado; se verificó la retirada del vídeo.",
            statusState: "rejected", targetType: targetResult.targetType, contentType: videoData.contentType, referenceId: videoData.referenceId };
    }
    const actorName = String(userName || "Supervisor").trim() || "Supervisor";
    const rejectionReason = String(reason || "Rechazado por el supervisor").trim().slice(0, 500);
    videoData.status = "rejected";
    videoData.rejectedBy = actorName;
    videoData.rejectReason = rejectionReason;
    videoData.rejectionDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT-5", "yyyy-MM-dd HH:mm:ss");
    const event = appendVideoApprovalEvent_(itemId, "rejected", {
        videoData: JSON.parse(JSON.stringify(videoData)), response: "rejected: " + rejectionReason, resolved: true, responder: actorName
    });
    const targetResult = removeRejectedVideoFromDestination_(videoData);
    materializeVideoApprovalEvent_(sheet, Object.assign({}, event, { rowNumberFeedback: rowIndex }));
    return { status: "success", message: "Vídeo rechazado.", statusState: "rejected",
        targetType: targetResult.targetType, contentType: videoData.contentType, referenceId: videoData.referenceId };
}

/**
 * Serializa aprobación/rechazo dentro de FEEDBACK. La lease compartida del router
 * coordina los recursos entre proyectos; este ScriptLock protege además las
 * ejecuciones concurrentes del mismo proyecto durante la transición completa.
 */
function handleApproveVideo(payload) {
    return handleApproveVideoUnlocked_(payload);
}

function handleRejectVideo(payload) {
    return handleRejectVideoUnlocked_(payload);
}

/* REVISIÓN IV: EDICIÓN IN-MODAL PARA DESARROLLADORES EN PROBLEMAS Y SOLUCIONES */
function handleUpdatePysItem(payload) {
    payload=payload&&typeof payload==="object"?payload:{};
    const { problemId, titulo, descripcion, solucion, prevenir, videoUrl, userRole } = payload;
    if (!problemId) throw new Error("problemId es obligatorio.");
    if (userRole !== "Desarrollador") throw new Error("No tienes permisos de Desarrollador para editar este problema.");
    const updates={};
    if (Object.prototype.hasOwnProperty.call(payload,"titulo")) updates.titulo=normalizePysField_(titulo,"El título",PYS_TITLE_MAX_LENGTH,true,false);
    if (Object.prototype.hasOwnProperty.call(payload,"descripcion")) updates.descripcion=normalizePysField_(descripcion,"La descripción",PYS_DESCRIPTION_MAX_LENGTH,true,true);
    if (Object.prototype.hasOwnProperty.call(payload,"solucion")) updates.solucion=normalizePysField_(solucion,"La solución",PYS_SOLUTION_MAX_LENGTH,false,true);
    if (Object.prototype.hasOwnProperty.call(payload,"prevenir")) updates.prevenir=normalizePysField_(prevenir,"La prevención",PYS_SOLUTION_MAX_LENGTH,false,true);
    if (videoUrl !== undefined && typeof videoUrl !== "string") throw new Error("La URL de YouTube debe ser texto.");
    const sheet=getPysSheet_(false);
    if(!sheet)throw new Error("Hoja pys no encontrada.");
    const lastRow=sheet.getLastRow();
    if(lastRow<2)throw new Error("No hay problemas registrados.");
    const ids=sheet.getRange(2,1,lastRow-1,1).getValues().flat(),matches=[];
    ids.forEach((id,index)=>{if(String(id)===String(problemId))matches.push(index+2);});
    if(matches.length!==1)throw new Error(matches.length>1?"El ID del problema está duplicado; no se modificó.":"Problema no encontrado.");
    const rowIndex=matches[0],currentVideo=String(sheet.getRange(rowIndex,8).getValue()||"").trim();
    if(videoUrl!==undefined){
        const requested=videoUrl.trim(),currentCanonical=currentVideo?getCanonicalPysYouTubeUrl_(currentVideo):"";
        if(requested&&!getPysYouTubeVideoId_(requested))throw new Error("La URL de YouTube no tiene un host, ruta o ID permitido.");
        if(currentVideo&&!currentCanonical)throw new Error("El vídeo existente de PyS no tiene una URL válida; requiere revisión.");
        if(requested!==currentVideo)throw new Error("El vídeo de PyS solo puede cambiarse mediante una solicitud de aprobación de YouTube.");
    }
    if(Object.prototype.hasOwnProperty.call(updates,"titulo"))sheet.getRange(rowIndex,2).setValue(updates.titulo);
    if(Object.prototype.hasOwnProperty.call(updates,"descripcion"))sheet.getRange(rowIndex,3).setValue(updates.descripcion);
    if(Object.prototype.hasOwnProperty.call(updates,"solucion")){sheet.getRange(rowIndex,5).setValue(updates.solucion);sheet.getRange(rowIndex,4).setValue(updates.solucion?"x":"");}
    if(Object.prototype.hasOwnProperty.call(updates,"prevenir"))sheet.getRange(rowIndex,6).setValue(updates.prevenir);
    SpreadsheetApp.flush();
    return {status:"success",message:"Problema actualizado exitosamente in-modal.",updated:{problemId,...updates,videoUrl:videoUrl===undefined?currentVideo:videoUrl.trim()}};
}

/* La autorización Desarrollador se valida en authorizeFeedbackAction_ antes de llegar aquí. */
function handleUpdateTutorialItem(payload) {
    const source = payload && typeof payload === "object" ? payload : {};
    const reference = String(source.tutorialId || source.originalTema || "").trim();
    if (!reference) throw new Error("Se requiere el ID del tutorial a editar.");
    if (source.videoUrl !== undefined && String(source.videoUrl || "").trim()) {
        const sheet = getTutorialSheet_(false);
        const target = sheet ? findTutorialRow_(sheet, reference, true) : null;
        const currentVideo = target ? String(target.row[6] || "").trim() : "";
        if (String(source.videoUrl || "").trim() !== currentVideo) {
            throw new Error("El vídeo del tutorial solo puede cambiarse mediante una solicitud de aprobación de YouTube.");
        }
    }

    const updates = {};
    if (source.tema !== undefined) updates.tema = normalizeTutorialField_(source.tema, "El tema del tutorial", 30, true);
    if (source.comoIdentificarlo !== undefined) updates.comoIdentificarlo = normalizeTutorialField_(source.comoIdentificarlo, "Cómo identificarlo", 700, false);
    if (source.dondeEncontrarlo !== undefined) updates.dondeEncontrarlo = normalizeTutorialField_(source.dondeEncontrarlo, "Dónde encontrarlo", 700, false);
    if (source.detalles !== undefined || source.descripcion !== undefined) {
        updates.detalles = normalizeTutorialField_(source.detalles !== undefined ? source.detalles : source.descripcion,
            "Los detalles", 700, false);
    }
    if (!Object.keys(updates).length) throw new Error("No se recibieron campos editables del tutorial.");

    // Un reintento que ya dejó todos los campos en el estado solicitado es de solo lectura:
    // resolverlo antes del lock evita bloquear otras escrituras sin introducir una carrera de escritura.
    const preflightSheet = getTutorialSheet_(false);
    let preflightTarget = null, preflightNext = null;
    if (preflightSheet) {
        preflightTarget = findTutorialRow_(preflightSheet, reference, true);
        const preflightCurrent = preflightTarget.row.slice(1, 6).map(value => String(value || ""));
        preflightNext = [
            updates.tema !== undefined ? updates.tema : String(preflightTarget.row[1] || ""),
            String(preflightTarget.row[2] || ""),
            updates.comoIdentificarlo !== undefined ? updates.comoIdentificarlo : String(preflightTarget.row[3] || ""),
            updates.dondeEncontrarlo !== undefined ? updates.dondeEncontrarlo : String(preflightTarget.row[4] || ""),
            updates.detalles !== undefined ? updates.detalles : String(preflightTarget.row[5] || "")
        ];
        if (preflightNext.every((value, index) => value === preflightCurrent[index])) {
            return {
                status: "success", alreadyUpdated: true,
                message: "El tutorial ya contiene los datos solicitados.",
                updated: { tutorialId: String(preflightTarget.row[0] || "").trim(), tema: preflightNext[0],
                    comoIdentificarlo: preflightNext[2], dondeEncontrarlo: preflightNext[3], detalles: preflightNext[4] }
            };
        }
    }

    const preflightId = preflightTarget ? String(preflightTarget.row[0] || "").trim() : "";
    const stableTutorialId = /^tut-[A-Za-z0-9_-]{20,80}$/i.test(preflightId);
    const legacyTutorial = Boolean(preflightTarget && !preflightId);
    if (preflightTarget && (stableTutorialId || legacyTutorial)) {
        const currentTitle = String(preflightTarget.row[1] || "").trim();
        const nextTitle = updates.tema !== undefined ? updates.tema : currentTitle;
        const tutorialIdentity = preflightId || makeLegacyTutorialIdentity_(currentTitle);
        const titleChanged = normalizeTutorialTitle_(nextTitle) !== normalizeTutorialTitle_(currentTitle);
        const nextSnapshot = [
            updates.comoIdentificarlo !== undefined ? updates.comoIdentificarlo : String(preflightTarget.row[3] || ""),
            updates.dondeEncontrarlo !== undefined ? updates.dondeEncontrarlo : String(preflightTarget.row[4] || ""),
            updates.detalles !== undefined ? updates.detalles : String(preflightTarget.row[5] || "")
        ];
        const currentSnapshot = [preflightTarget.row[3], preflightTarget.row[4], preflightTarget.row[5]].map(value => String(value || ""));
        if (titleChanged) {
            const feedbackSheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
            const hasPendingVideo = feedbackSheet && (
                findPendingVideoApprovalForTarget_(feedbackSheet, "tutorial", reference) ||
                (currentTitle && currentTitle !== reference && findPendingVideoApprovalForTarget_(feedbackSheet, "tutorial", currentTitle))
            );
            if (hasPendingVideo) throw new Error("No se puede cambiar el tema mientras exista una solicitud de vídeo pendiente para este tutorial.");
            if (tutorialTitleExists_(preflightSheet, nextTitle, preflightTarget.rowIndex, preflightId)) {
                throw new Error("Ya existe otro tutorial con ese tema; no se modificó el registro.");
            }
            const titlePayloadHash = buildTutorialContentHash_([tutorialIdentity,
                normalizeTutorialTitle_(currentTitle), normalizeTutorialTitle_(nextTitle)]);
            const titleOperationId = "tutorial-title-rename-" + titlePayloadHash;
            const titleLedger = getTutorialTitleEventsSheet_(false);
            const prior = titleLedger ? readTutorialTitleEvents_(titleLedger) : { operations: [], owners: new Map(), applied: new Map() };
            const priorEvent = prior.operations.find(event => event.operationId === titleOperationId);
            if (!(priorEvent && prior.applied.get(titleOperationId) === true && prior.owners.get(normalizeTutorialTitle_(nextTitle)) === tutorialIdentity)) {
                ensureTutorialTitleClaim_(tutorialIdentity, currentTitle);
                appendTutorialTitleEvent_({
                    operationId: titleOperationId, tutorialId: tutorialIdentity, action: "RENAME",
                    titleKey: normalizeTutorialTitle_(nextTitle), previousTitleKey: normalizeTutorialTitle_(currentTitle),
                    payloadHash: titlePayloadHash
                });
            }
            appendTutorialRenameEvent_(tutorialIdentity, currentTitle, nextTitle);
        }
        if (!nextSnapshot.every((value, index) => value === currentSnapshot[index])) {
            appendTutorialEditEvent_(tutorialIdentity, preflightTarget.row, nextSnapshot);
        }
        const saved = findTutorialRow_(preflightSheet, preflightId || nextTitle, true);
        if (normalizeTutorialTitle_(saved.row[1]) !== normalizeTutorialTitle_(nextTitle) ||
            !nextSnapshot.every((value, index) => value === String(saved.row[index + 3] || ""))) {
            throw new Error("La proyección append-only del tutorial no coincide con los cambios solicitados.");
        }
        return {
            status: "success",
            message: "Tutorial actualizado exitosamente.",
            updated: { tutorialId: preflightId, tema: String(saved.row[1] || ""),
                comoIdentificarlo: nextSnapshot[0], dondeEncontrarlo: nextSnapshot[1], detalles: nextSnapshot[2] }
        };
    }
    const titleUnchanged = preflightTarget &&
        (updates.tema === undefined || String(updates.tema) === String(preflightTarget.row[1] || ""));
    if (preflightTarget && /^tut-[A-Za-z0-9_-]{20,80}$/i.test(preflightId) && titleUnchanged) {
        const snapshot = [preflightNext[2], preflightNext[3], preflightNext[4]];
        appendTutorialEditEvent_(preflightId, preflightTarget.row, snapshot);
        const saved = findTutorialRow_(preflightSheet, preflightId, true);
        if (!snapshot.every((value, index) => value === String(saved.row[index + 3] || ""))) {
            throw new Error("La edición append-only del tutorial no coincide con los cambios solicitados.");
        }
        return {
            status: "success",
            message: "Tutorial actualizado exitosamente.",
            updated: { tutorialId: preflightId, tema: String(saved.row[1] || ""),
                comoIdentificarlo: snapshot[0], dondeEncontrarlo: snapshot[1], detalles: snapshot[2] }
        };
    }

    {
        const sheet = getTutorialSheet_(false);
        if (!sheet) throw new Error("Hoja Tutorial no encontrada.");
        const target = findTutorialRow_(sheet, reference, true);
        const titleKey = normalizeTutorialTitle_(updates.tema !== undefined ? updates.tema : target.row[1]);
        if (updates.tema !== undefined && titleKey !== normalizeTutorialTitle_(target.row[1])) {
            const feedbackSheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
            const currentTitle = String(target.row[1] || "").trim();
            const hasPendingVideo = feedbackSheet && (
                findPendingVideoApprovalForTarget_(feedbackSheet, "tutorial", reference) ||
                (currentTitle && currentTitle !== reference &&
                    findPendingVideoApprovalForTarget_(feedbackSheet, "tutorial", currentTitle))
            );
            if (hasPendingVideo) {
                throw new Error("No se puede cambiar el tema mientras exista una solicitud de vídeo pendiente para este tutorial.");
            }
        }
        if (updates.tema !== undefined && titleKey !== normalizeTutorialTitle_(target.row[1])) {
            const duplicate = tutorialTitleExists_(sheet, updates.tema, target.rowIndex, target.row[0]);
            if (duplicate) throw new Error("Ya existe otro tutorial con ese tema; no se modificó el registro.");
            const tutorialId = String(target.row[0] || "").trim() || makeLegacyTutorialIdentity_(target.row[1]);
            const reservedOwner = getTutorialTitleOwner_(updates.tema);
            if (reservedOwner && reservedOwner !== tutorialId) {
                throw new Error("Ya existe otro tutorial con ese tema; no se modificó el registro.");
            }
            ensureTutorialTitleClaim_(tutorialId, target.row[1]);
            const oldTitleKey = normalizeTutorialTitle_(target.row[1]);
            const newTitleKey = normalizeTutorialTitle_(updates.tema);
            const renamePayloadHash = buildTutorialContentHash_([tutorialId, target.row.slice(1, 6),
                [updates.tema, target.row[2], updates.comoIdentificarlo !== undefined ? updates.comoIdentificarlo : target.row[3],
                    updates.dondeEncontrarlo !== undefined ? updates.dondeEncontrarlo : target.row[4],
                    updates.detalles !== undefined ? updates.detalles : target.row[5]]]);
            const renameOperationId = "tutorial-rename-" + renamePayloadHash;
            appendTutorialTitleEvent_({
                operationId: renameOperationId, tutorialId, action: "RENAME",
                titleKey: newTitleKey, previousTitleKey: oldTitleKey, payloadHash: renamePayloadHash
            });
        }

        const nextFields = [
            updates.tema !== undefined ? updates.tema : String(target.row[1] || ""),
            String(target.row[2] || ""),
            updates.comoIdentificarlo !== undefined ? updates.comoIdentificarlo : String(target.row[3] || ""),
            updates.dondeEncontrarlo !== undefined ? updates.dondeEncontrarlo : String(target.row[4] || ""),
            updates.detalles !== undefined ? updates.detalles : String(target.row[5] || "")
        ];
        const currentFields = target.row.slice(1, 6).map(value => String(value || ""));
        const changed = nextFields.some((value, index) => value !== currentFields[index]);
        if (changed) sheet.getRange(target.rowIndex, 2, 1, 5).setValues([nextFields]);
        try {
            SpreadsheetApp.flush();
        } catch (flushError) {
            const recovered = sheet.getRange(target.rowIndex, 2, 1, 5).getValues()[0]
                .map(value => String(value || ""));
            if (!nextFields.every((value, index) => value === recovered[index])) throw flushError;
            return {
                status: "success", recovered: true,
                message: "Tutorial actualizado y verificado después de una respuesta de guardado incierta.",
                updated: { tutorialId: String(target.row[0] || "").trim(), tema: nextFields[0],
                    comoIdentificarlo: nextFields[2], dondeEncontrarlo: nextFields[3], detalles: nextFields[4] }
            };
        }
        const saved = sheet.getRange(target.rowIndex, 2, 1, 5).getValues()[0]
            .map(value => String(value || ""));
        if (!nextFields.every((value, index) => value === saved[index])) {
            throw new Error("La fila del tutorial no coincide con los cambios solicitados.");
        }

        return {
            status: "success",
            message: "Tutorial actualizado exitosamente.",
            updated: { tutorialId: String(target.row[0] || "").trim(), tema: nextFields[0],
                comoIdentificarlo: nextFields[2], dondeEncontrarlo: nextFields[3], detalles: nextFields[4] }
        };
    }
}
