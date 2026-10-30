// GPSpedia Unified API Module | Version: 2.1.6
// ============================================================================
// ÚNICA FUENTE DE VERDAD PARA LA CONFIGURACIÓN Y LÓGICA DE LA API
// ============================================================================

// 1. CONFIGURACIÓN
export const API_ENDPOINTS = {
    LEGACY: "https://script.google.com/macros/s/AKfycbwpIFH1nX2BZEjAKbpq9HJpEGNlo_0LqD1CwxWsWFo5J0AJDdbfMrKpcsAV4ZFJzFWd/exec",
    AUTH:     "https://script.google.com/macros/s/AKfycbwATstMSSnuYZMeGEjI7Q5cznO6kA8rqLo7zNZLmu_f29qwcyt4Fucn5VIBdB9tMoRg/exec",
    CATALOG:  "https://script.google.com/macros/s/AKfycbxtqkdUfXAEmbPz7zfE4kZCie8sql4SM43kxkBw__5iGwXVyzzYsIFG5jpWkQc7-Ug9/exec",
    WRITE:    "https://script.google.com/macros/s/AKfycbz1qZSAExI_JEoLfxYiszD93tcPPWIju5tMJ9l5wexmkXM0Bx1Wgw0MyxGfyY0gjUCnDg/exec",
    USERS:    "https://script.google.com/macros/s/AKfycbz6KfY_E2d-efAYBXir_UGjUUPIggDJkJGUboqedO4eWFF9y3vr4IQzveeg563FLjs/exec",
    FEEDBACK: "https://script.google.com/macros/s/AKfycby1s6gb64qI0LO55jgPKEIrxlpVw4mBaFWY6CCct8aBim8h7Ah_qu9gQlie_7DoyCZT_g/exec",
    UTILITIES: "https://script.google.com/macros/s/AKfycbzkGXk_kSm3rN7K5PM0RntiPAn7DlH78RkH66a2vuwZwU8KgwDufkOiPjXoUKzuHAgG/exec",
    ADMIN: "https://script.google.com/macros/s/AKfycbwvYQKoT04N4KLZIMLGQB42zaO5cdz4bIY3rFKJ0Nx6ePDi8IxHyTP2Fmvknsz9SvckYg/exec"
};

/* TAREA 1.1: RECUPERACIÓN DE LA COMUNICACIÓN CON EL MICROSERVICIO DE ADMINISTRACIÓN */
export const ACTION_TO_SERVICE_MAP = {
    'login': 'AUTH', 'validateSession': 'AUTH',
    'getNavigationData': 'CATALOG', 'getCatalogData': 'CATALOG', 'getDropdownData': 'CATALOG',
    'getSuggestion': 'WRITE', 'checkVehicle': 'WRITE', 'addCorte': 'WRITE', 'checkOperation': 'WRITE', 'addOrUpdateCut': 'WRITE', 'addSupplementaryInfo': 'WRITE', 'checkVinDuplicate': 'WRITE', 'addVinToVehicle': 'WRITE',
    'getUsers': 'USERS', 'createUser': 'USERS', 'updateUser': 'USERS', 'deleteUser': 'USERS', 'changePassword': 'USERS', 'updateProfile': 'USERS',
    'recordLike': 'FEEDBACK', 'reportProblem': 'FEEDBACK', 'sendContactForm': 'FEEDBACK', 'addTutorial': 'FEEDBACK', 'suggestYear': 'FEEDBACK', 'suggestCutChange': 'FEEDBACK', 'getPysData': 'FEEDBACK', 'addProblem': 'FEEDBACK', 'addSolution': 'FEEDBACK', 'addPrevention': 'FEEDBACK', 'addVehicleToProblem': 'FEEDBACK',
    'getFeedbackItems': 'FEEDBACK', 'replyToFeedback': 'FEEDBACK', 'markAsResolved': 'FEEDBACK', 'getActivityLogs': 'FEEDBACK', 'deleteFeedbackItem': 'FEEDBACK', 'clearActivityLogs': 'FEEDBACK',
    'migrateYearRanges': 'UTILITIES', 'migrateTimestamps': 'UTILITIES',
    'ping': 'ADMIN',
    'backupDatabase': 'ADMIN', 'backupDrive': 'ADMIN', 'restoreDatabase': 'ADMIN', 'restoreDrive': 'ADMIN',
    'reorganizeDatabase': 'ADMIN', 'normalizeImages': 'ADMIN', 'reorganizeImagesInDrive': 'ADMIN', 'restoreAllTrashedImages': 'ADMIN', 'addLogo': 'ADMIN', 'createSheet': 'ADMIN', 'addColumn': 'ADMIN', 'driveCommand': 'ADMIN',
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

export async function deleteFeedbackItem(id, type) {
    return await routeAction('deleteFeedbackItem', { id, type });
}

export async function clearActivityLogs(keepLastWeek = false) {
    return await routeAction('clearActivityLogs', { keepLastWeek });
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

export async function suggestCutChange(data) {
    return await routeAction("suggestCutChange", data);
}

export async function addTutorial(data) {
    return await routeAction("addTutorial", data);
}

export async function checkAllServicesHealth() {
    const services = Object.keys(API_ENDPOINTS);
    const results = {};

    await Promise.all(services.map(async (srvKey) => {
        const url = API_ENDPOINTS[srvKey];
        const start = Date.now();
        try {
            const res = await fetch(`${url}?debug=true`, {
                method: 'GET',
                redirect: 'follow'
            });
            const duration = Date.now() - start;
            if (res.ok) {
                results[srvKey] = { status: 'online', latency: duration };
            } else {
                results[srvKey] = { status: 'error', latency: duration, code: res.status };
            }
        } catch (err) {
            results[srvKey] = { status: 'offline', latency: Date.now() - start, error: err.message };
        }
    }));

    return results;
}
