// GPSpedia Unified API Module | Version: 2.1.6
// ============================================================================
// ÚNICA FUENTE DE VERDAD PARA LA CONFIGURACIÓN Y LÓGICA DE LA API
// ============================================================================

// 1. CONFIGURACIÓN
export const API_ENDPOINTS = {
    LEGACY: "https://script.google.com/macros/s/AKfycbwpIFH1nX2BZEjAKbpq9HJpEGNlo_0LqD1CwxWsWFo5J0AJDdbfMrKpcsAV4ZFJzFWd/exec",
    AUTH:     "https://script.google.com/macros/s/AKfycbwATstMSSnuYZMeGEjI7Q5cznO6kA8rqLo7zNZLmu_f29qwcyt4Fucn5VIBdB9tMoRg/exec",
    CATALOG:  "https://script.google.com/macros/s/AKfycbzZ3dBoUuYquNYxYjAZJgPhj11g9r1chLFEJna9_6V9Y2-QZ0_3NsINtHvIYe29LHcZyQ/exec",
    WRITE:    "https://script.google.com/macros/s/AKfycbzn0Pid4ztnekMq5I8YW03tCSGdd67QPlsN1HQhhqkp1qbJRiOnrEl_JIjGJ66MePcK/exec",
    USERS:    "https://script.google.com/macros/s/AKfycbxpDSLvKqb2taxKS0PbGqhTPxgO01lJyGsDn1Tgpe4zxZii8QWnvlvj5Xltrn6Vmkf6/exec",
    FEEDBACK: "https://script.google.com/macros/s/AKfycbyL5vgD0atgXM1Mdf5k9wqhGLpuBjDXBXv_a7BUeitw_Fu9h8UWZOuDpZUCCsCAXXux/exec",
    UTILITIES: "https://script.google.com/macros/s/AKfycbzkGXk_kSm3rN7K5PM0RntiPAn7DlH78RkH66a2vuwZwU8KgwDufkOiPjXoUKzuHAgG/exec",
    ADMIN: "https://script.google.com/macros/s/AKfycby9nSdXq-KUJBw9p6On-LKUhCISqmg0fXB510JRScu3I5QoiNxsbZRsvABXNcBMQxcO/exec"
};

export const ACTION_TO_SERVICE_MAP = {
    'login': 'AUTH', 'validateSession': 'AUTH',
    'getNavigationData': 'CATALOG', 'getCatalogData': 'CATALOG', 'getDropdownData': 'CATALOG',
    'getSuggestion': 'WRITE', 'checkVehicle': 'WRITE', 'addCorte': 'WRITE', 'checkOperation': 'WRITE', 'addOrUpdateCut': 'WRITE', 'addSupplementaryInfo': 'WRITE',
    'getUsers': 'USERS', 'createUser': 'USERS', 'updateUser': 'USERS', 'deleteUser': 'USERS', 'changePassword': 'USERS', 'updateProfile': 'USERS',
    'recordLike': 'FEEDBACK', 'reportProblem': 'FEEDBACK', 'sendContactForm': 'FEEDBACK', 'suggestYear': 'FEEDBACK',
    'getFeedbackItems': 'FEEDBACK', 'replyToFeedback': 'FEEDBACK', 'markAsResolved': 'FEEDBACK', 'getActivityLogs': 'FEEDBACK',
    'migrateYearRanges': 'UTILITIES', 'migrateTimestamps': 'UTILITIES',
    'ping': 'ADMIN',
    'backupDatabase': 'ADMIN', 'backupDrive': 'ADMIN', 'restoreDatabase': 'ADMIN', 'restoreDrive': 'ADMIN',
    'reorganizeDatabase': 'ADMIN', 'normalizeImages': 'ADMIN', 'reorganizeImagesInDrive': 'ADMIN', 'addLogo': 'ADMIN',
    'updateVehicleField': 'ADMIN', 'uploadAdminImage': 'ADMIN',
    'logFrontend': 'LEGACY'
};

// 2. LÓGICA DE RUTEO CENTRAL
export async function routeAction(action, payload = {}, serviceOverride = null) {
    const service = serviceOverride || ACTION_TO_SERVICE_MAP[action];
    if (!service) throw new Error(`Acción no definida: ${action}`);

    let targetUrl = API_ENDPOINTS[service];
    if (!targetUrl) targetUrl = API_ENDPOINTS.LEGACY;

    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action, payload }),
            redirect: 'follow'
        });

        if (!response.ok) throw new Error(`Error de red: ${response.status} ${response.statusText}`);

        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            throw new Error("La respuesta del servidor no tiene un formato válido.");
        }

        if (result.status === 'error') {
            const errorMessage = result.details ? `${result.message}: ${result.details.errorMessage}` : result.message;
            throw new Error(errorMessage);
        }
        return result;
    } catch (error) {
        throw error;
    }
}

// 3. FUNCIONES DE CONVENIENCIA (HELPERS)
export async function login(username, password) {
    return await routeAction('login', { username, password });
}

export async function validateSession(userId, sessionToken) {
    return await routeAction('validateSession', { userId, sessionToken });
}

export async function fetchCatalogData() {
    return await routeAction('getCatalogData');
}

export async function getFeedbackItems() {
    return await routeAction('getFeedbackItems');
}

export async function replyToFeedback(itemId, itemType, replyText, responderName) {
    return await routeAction('replyToFeedback', { itemId, itemType, replyText, responderName });
}

export async function markAsResolved(itemId) {
    return await routeAction('markAsResolved', { itemId });
}

export async function getActivityLogs() {
    return await routeAction('getActivityLogs');
}

export async function recordLike(vehicleId, corteIndex, userId, userName) {
    return await routeAction('recordLike', { vehicleId, corteIndex, userId, userName });
}

export async function reportProblem(vehicleId, problemDescription, userId, userName) {
    return await routeAction('reportProblem', { vehicleId, problemText: problemDescription, userId, userName });
}

export async function suggestYear(vehicleId, newYear, responseText, userId, userName) {
    return await routeAction('suggestYear', { vehicleId, newYear, response: responseText, userId, userName });
}

export async function sendContactForm(formData) {
    return await routeAction('sendContactForm', formData);
}
