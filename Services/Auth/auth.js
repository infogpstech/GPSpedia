// ============================================================================
// GPSPEDIA-AUTH SERVICE (COMPATIBLE WITH DB V2.0)
// ============================================================================
// COMPONENT VERSION: 2.2.1

// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================
const SPREADSHEET_ID = "1M6zAVch_EGKGGRXIo74Nbn_ihH1APZ7cdr2kNdWfiDs"; // <-- ACTUALIZADO A DB V2.0
const SHEET_NAMES = {
    USERS: "Users",
    ACTIVE_SESSIONS: "ActiveSessions",
    LOGS: "Logs"
};

// Mapas de columnas corregidos para coincidir con la hoja de cálculo real
const COLS_USERS = {
    ID: 1,
    Nombre_Usuario: 2,
    Password: 3,
    Privilegios: 4,
    Telefono: 5,
    Correo_Electronico: 6,
    Nombre_Completo: 7,
    SessionToken: 8
};

const COLS_ACTIVE_SESSIONS = {
    ID_Usuario: 1,
    Usuario: 2,
    ActiveSessions: 3,
    date: 4,
    Logs: 5
};

const SESSION_LIMITS = {
    'desarrollador': 999, // Unlimited
    'jefe': 3,
    'supervisor': 2,
    'tecnico': 1,
    'tecnico_exterior': 1
};

// ============================================================================
// MÓDULO DE DEPURACIÓN
// ============================================================================
function logToSheet(level, message, details = {}) {
    try {
        const logSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.LOGS);
        const timestamp = new Date().toISOString();
        const detailsString = Object.keys(details).length > 0 ? JSON.stringify(details) : '';
        logSheet.appendRow([timestamp, level, message, detailsString]);
    } catch (e) {
        console.error("Fallo al escribir en la hoja de logs:", e.message);
    }
}

// ============================================================================
// ROUTER PRINCIPAL
// ============================================================================
function doGet(e) {
    if (e.parameter.debug === 'true') {
        const serviceState = {
            service: 'GPSpedia-Auth',
            version: '2.2.2', // Mantener sincronizado con la versión del componente
            spreadsheetId: SPREADSHEET_ID,
            sheetsAccessed: [SHEET_NAMES.USERS, SHEET_NAMES.ACTIVE_SESSIONS, SHEET_NAMES.LOGS]
        };
        return ContentService.createTextOutput(JSON.stringify(serviceState, null, 2))
            .setMimeType(ContentService.MimeType.TEXT);
    }
    // Comportamiento por defecto si no está en modo de depuración
    const defaultResponse = {
        status: 'success',
        message: 'GPSpedia Auth-SERVICE v2.0 is active.'
    };
    return ContentService.createTextOutput(JSON.stringify(defaultResponse))
        .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
    let response;
    try {
        logToSheet('INFO', 'doPost received a request.');
        const request = JSON.parse(e.postData.contents);
        logToSheet('DEBUG', `Request parsed. Action: ${request.action}`, { payload: request.payload });

        switch (request.action) {
            case 'login':
                response = handleLogin(request.payload);
                break;
            case 'validateSession':
                response = handleValidateSession(request.payload);
                break;
            default:
                throw new Error(`Acción desconocida: ${request.action}`);
        }
    } catch (error) {
        logToSheet('ERROR', `Error in doPost: ${error.message}`, { stack: error.stack });
        response = { status: 'error', message: error.message };
    }
    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================================
// LÓGICA DE AUTENTICACIÓN
// ============================================================================
function handleLogin(payload) {
    try {
        const { username, password } = payload;
        logToSheet('INFO', 'handleLogin started.', { username: username });

        if (!username || !password) {
            throw new Error("Usuario y contraseña son requeridos.");
        }

        const userSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.USERS);
        const data = userSheet.getDataRange().getValues();
        data.shift(); // Remove headers

        let foundUserRow = null;
        let foundUserIndex = -1;

        for (let i = 0; i < data.length; i++) {
            const sheetUsername = (data[i][COLS_USERS.Nombre_Usuario - 1] || '').toString();
            if (sheetUsername.trim().toLowerCase() === username.trim().toLowerCase()) {
                foundUserRow = data[i];
                foundUserIndex = i;
                break;
            }
        }

        if (!foundUserRow) {
            throw new Error("Credenciales inválidas.");
        }

        const sheetPassword = foundUserRow[COLS_USERS.Password - 1];
        logToSheet('DEBUG', 'Password comparison', { fromSheet: sheetPassword, fromClient: password });
        const isPasswordMatch = String(sheetPassword).trim() === String(password).trim();

        if (!isPasswordMatch) {
            throw new Error("Credenciales inválidas.");
        }

        const userRole = (foundUserRow[COLS_USERS.Privilegios - 1] || '').toString().toLowerCase().trim();
        const userId = foundUserRow[COLS_USERS.ID - 1];
        const sessionLimit = SESSION_LIMITS[userRole] || 1;

        // Manage sessions
        const activeSessionsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        const sessionsData = activeSessionsSheet.getDataRange().getValues();
        sessionsData.shift(); // Remove header

        const userSessionRows = sessionsData
            .map((row, index) => ({
                userId: row[COLS_ACTIVE_SESSIONS.ID_Usuario - 1],
                rowIndex: index + 2 // +2 because sheet is 1-indexed and we removed the header
            }))
            .filter(session => String(session.userId).trim() == String(userId).trim());

        logToSheet('DEBUG', `Found ${userSessionRows.length} sessions for user ${userId}. Limit is ${sessionLimit}.`);

        if (userSessionRows.length >= sessionLimit) {
            // Sort sessions by rowIndex to find the oldest ones (smallest rowIndex)
            userSessionRows.sort((a, b) => a.rowIndex - b.rowIndex);

            // Determine how many sessions to remove to make space for the new one
            const sessionsToRemoveCount = userSessionRows.length - sessionLimit + 1;
            const sessionsToRemove = userSessionRows.slice(0, sessionsToRemoveCount);

            logToSheet('INFO', `Session limit reached. Removing ${sessionsToRemove.length} oldest session(s).`, { sessionsToRemove });

            // Delete rows from the bottom up (highest rowIndex first) to avoid shifting issues
            sessionsToRemove.sort((a, b) => b.rowIndex - a.rowIndex).forEach(session => {
                try {
                   activeSessionsSheet.deleteRow(session.rowIndex);
                } catch(e) {
                   logToSheet('ERROR', `Failed to delete row ${session.rowIndex}`, { error: e.message });
                }
            });
        }

        // Always generate a new token for a new session. This implicitly invalidates the old one.
        const sessionToken = Utilities.getUuid();
        userSheet.getRange(foundUserIndex + 2, COLS_USERS.SessionToken).setValue(sessionToken);

        // Escribir en la hoja de sesiones activas usando el nuevo schema
        const newSessionRow = [];
        newSessionRow[COLS_ACTIVE_SESSIONS.ID_Usuario - 1] = userId;
        newSessionRow[COLS_ACTIVE_SESSIONS.Usuario - 1] = username;
        newSessionRow[COLS_ACTIVE_SESSIONS.ActiveSessions - 1] = sessionToken;
        newSessionRow[COLS_ACTIVE_SESSIONS.date - 1] = new Date().toISOString();
        activeSessionsSheet.appendRow(newSessionRow);

        const user = {
            ID: userId,
            Nombre_Usuario: foundUserRow[COLS_USERS.Nombre_Usuario - 1],
            Nombre_Completo: foundUserRow[COLS_USERS.Nombre_Completo - 1], // <-- FIX: Add missing field
            Privilegios: foundUserRow[COLS_USERS.Privilegios - 1],
            Telefono: foundUserRow[COLS_USERS.Telefono - 1],
            Correo_Electronico: foundUserRow[COLS_USERS.Correo_Electronico - 1],
            SessionToken: sessionToken
        };

        return { status: 'success', user: user };

    } catch (error) {
        logToSheet('ERROR', `Error in handleLogin: ${error.message}`, { stack: error.stack });
        return { status: 'error', message: error.message };
    }
}

function handleValidateSession(payload) {
    try {
        const { userId, sessionToken } = payload;
        if (!userId || !sessionToken) {
            return { valid: false };
        }

        const activeSessionsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        const data = activeSessionsSheet.getDataRange().getValues();
        data.shift(); // Remove headers

        for (const row of data) {
            // Compare userId and sessionToken from the ActiveSessions sheet
            if (row[COLS_ACTIVE_SESSIONS.ID_Usuario - 1] == userId && row[COLS_ACTIVE_SESSIONS.ActiveSessions - 1] === sessionToken) {
                return { valid: true };
            }
        }

        return { valid: false };
    } catch (error) {
        logToSheet('ERROR', `Error in handleValidateSession: ${error.message}`, { stack: error.stack });
        return { valid: false, error: error.message };
    }
}
