// auth.js

// --- CONSTANTES Y VARIABLES GLOBALES DE AUTENTICACIÓN ---
const SPREADSHEET_ID_AUTH = "1jEdC2NMc2a5F36xE2MJfgxMZiZFVfeDqnCdVizNGIMo";
const API_KEY_AUTH = "AIzaSyCooAsC52X4ccENCT6p3qh_82ErBxP47Lg";
const RANGE_USERS = "Users";
const SESSION_KEY = 'gpsepedia_session';
const SESSION_ID_KEY = 'gpsepedia_session_id';
let userData = [];
let currentUser = null;

// --- FUNCIONES DE AUTENTICACIÓN Y SESIÓN ---

/**
 * Sanitiza una cadena de entrada para prevenir inyecciones básicas de fórmulas de Excel y SQL.
 * @param {string} input - La cadena a sanitizar.
 * @returns {string} La cadena sanitizada.
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    let sanitized = input.trim();
    if (['=', '+', '-', '@', '\t', '\r'].includes(sanitized.charAt(0))) {
        sanitized = "'" + sanitized;
    }
    sanitized = sanitized.replace(/'/g, "''").replace(/--/g, "").replace(/;/g, "");
    return sanitized;
}

/**
 * Obtiene la lista de usuarios desde la hoja de Google Sheets.
 * @returns {Promise<Array>} Una promesa que se resuelve con la lista de usuarios.
 */
async function fetchUsers() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID_AUTH}/values/${encodeURIComponent(RANGE_USERS)}?key=${API_KEY_AUTH}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error de red al obtener usuarios: ${response.status}`);
        const data = await response.json();
        userData = data.values || [];
        return userData;
    } catch (error) {
        console.error("Fallo al obtener la lista de usuarios:", error);
        const loginError = document.getElementById('login-error');
        if (loginError) {
            loginError.textContent = "No se pudo conectar al servidor de autenticación.";
            loginError.style.display = 'block';
        }
        return [];
    }
}

/**
 * Verifica si existe una sesión activa y válida en el almacenamiento local.
 */
function checkSession() {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
        const { user, sessionId } = JSON.parse(session);
        const expectedSessionId = localStorage.getItem(SESSION_ID_KEY);

        if (sessionId === expectedSessionId) {
            currentUser = user;
            hideLoginShowApp();
        } else {
            logout("Se ha iniciado una nueva sesión en otro dispositivo o navegador.");
        }
    } else {
        showLoginHideApp();
    }
}

/**
 * Valida las credenciales del usuario y, si son correctas, inicia una sesión.
 * @param {string} username - El nombre de usuario.
 * @param {string} password - La contraseña.
 */
function login(username, password) {
    if (userData.length === 0) {
        const loginError = document.getElementById('login-error');
        loginError.textContent = 'Error de autenticación. Intente de nuevo.';
        loginError.style.display = 'block';
        return;
    }
    const header = userData[0];
    const users = userData.slice(1);
    const userRow = users.find(u => u[header.indexOf('Nombre_Usuario')] === username && u[header.indexOf('Password')] === password);

    if (userRow) {
        const sessionId = Date.now().toString();
        const userObject = {
            ID: userRow[header.indexOf('ID')],
            Nombre_Usuario: userRow[header.indexOf('Nombre_Usuario')],
            Privilegios: userRow[header.indexOf('Privilegios')],
            Nombre: userRow[header.indexOf('Nombre')],
        };
        const sessionData = { user: userObject, sessionId: sessionId };

        currentUser = userObject;
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        localStorage.setItem(SESSION_ID_KEY, sessionId);
        localStorage.setItem('session_update', Date.now()); // Notificar a otras pestañas

        hideLoginShowApp();
    } else {
        const loginError = document.getElementById('login-error');
        loginError.textContent = 'Usuario o contraseña incorrectos.';
        loginError.style.display = 'block';
    }
}

/**
 * Cierra la sesión activa del usuario.
 * @param {string|null} reason - Un mensaje opcional para mostrar al usuario.
 */
function logout(reason = null) {
    currentUser = null;
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_ID_KEY);
    showLoginHideApp(reason);
}

// --- FUNCIONES DE VISIBILIDAD DE LA UI ---

/**
 * Muestra el modal de inicio de sesión y oculta el contenido principal de la aplicación.
 * @param {string|null} reason - Un mensaje opcional para mostrar en el formulario de inicio de sesión.
 */
function showLoginHideApp(reason = null) {
    const splash = document.getElementById('splash-screen');
    const container = document.querySelector('.container');
    const footer = document.querySelector('.footer');
    const loginModal = document.getElementById('login-modal');
    const loginError = document.getElementById('login-error');

    if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => { splash.style.display = 'none'; }, 500);
    }

    if(container) container.style.display = 'none';
    if(footer) footer.style.display = 'none';

    if (loginModal) {
        loginModal.style.display = 'flex';
        if (reason) {
            loginError.textContent = reason;
            loginError.style.display = 'block';
        } else {
            loginError.style.display = 'none';
        }
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }
}

/**
 * Oculta el modal de inicio de sesión y muestra el contenido principal de la aplicación.
 */
function hideLoginShowApp() {
    const splash = document.getElementById('splash-screen');
    const loginModal = document.getElementById('login-modal');
    const container = document.querySelector('.container');
    const footer = document.querySelector('.footer');
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutButton = document.getElementById('logout-button');

    if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => { splash.style.display = 'none'; }, 500);
    }
    if(loginModal) loginModal.style.display = 'none';
    if(container) container.style.display = 'block';
    if(footer) footer.style.display = 'block';

    if (currentUser) {
        if (welcomeMessage) {
            welcomeMessage.textContent = `Bienvenido, ${currentUser.Nombre}`;
            welcomeMessage.style.display = 'block';
        }
        if (logoutButton) logoutButton.style.display = 'block';
    }

    // Disparamos un evento global para notificar a la página que la autenticación fue exitosa.
    // La página específica (index.html o agregar_corte.html) escuchará este evento.
    document.dispatchEvent(new CustomEvent('authSuccess'));
}

// --- INICIALIZACIÓN Y LISTENERS ---

/**
 * Función principal para inicializar la autenticación.
 */
async function inicializarAuth() {
    await fetchUsers();
    checkSession();
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const logoutButton = document.getElementById('logout-button');
    const forgotPasswordLink = document.getElementById('forgot-password-link');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = sanitizeInput(document.getElementById('username').value);
            const password = sanitizeInput(document.getElementById('password').value);
            if (userData.length === 0) {
                await fetchUsers();
            }
            login(username, password);
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => logout());
    }

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const message = encodeURIComponent(`Hola, necesito recuperar mi contraseña. Mi nombre de usuario es: ${username}`);
            const whatsappUrl = `https://wa.me/50488422786?text=${message}`;
            window.open(whatsappUrl, '_blank');
        });
    }

    // El proceso de autenticación ahora se inicia manualmente desde cada página (index.html, agregar_corte.html).
    // inicializarAuth();
});

// Listener para sincronizar sesiones entre pestañas.
window.addEventListener('storage', (event) => {
    if (event.key === 'session_update' || event.key === SESSION_ID_KEY) {
        checkSession();
    }
});
