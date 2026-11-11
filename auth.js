// GPSpedia Authentication Module | Version: 2.1.6
// Responsibilities:
// - Manage the entire user authentication lifecycle (login, logout, session validation).
// - Interact with the API module for backend communication.
// - Update the user state.

import { setState, getState } from './state.js';
import { routeAction, fetchCatalogData, login as apiLogin, validateSession as apiValidateSession, completeLoginRequest } from './api-config.js';
import { showLoginScreen, showApp, showGlobalError } from './ui.js';
import * as offline from './offline.js';
import { loadPysData } from './pys-data.js';

const SESSION_KEY = 'gpsepedia_session';
let logoutGeneration_ = 0;
const VALIDATION_LOCK_NAME = 'gpsepedia-session-validation';
const VALIDATION_CACHE_TTL_MS = 10000;
const VALIDATION_TIMEOUT_MS = 8000;
const LOCK_WAIT_TIMEOUT_MS = 5000;

function addSessionCalendarMonthsUTC(date,months){const d=new Date(date.getTime()),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d;}
function getLocalSessionExpiry(user,now=new Date()){
 const created=user&&user.SessionCreatedAt?new Date(user.SessionCreatedAt):null,activity=user&&user.SessionLastActivityAt?new Date(user.SessionLastActivityAt):created;
 if(!created||Number.isNaN(created.getTime())||!activity||Number.isNaN(activity.getTime()))return null;
 if(now.getTime()>=addSessionCalendarMonthsUTC(created,3).getTime())return'absolute_expiration';
 if(now.getTime()>=addSessionCalendarMonthsUTC(activity,1).getTime())return'inactivity_expiration';
 return null;
}
function readStoredSession(){
 try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}catch(e){return null;}
}
function sameSession(a,b){
 return Boolean(a&&b&&String(a.ID||a.id||'')===String(b.ID||b.id||'')&&a.SessionToken&&a.SessionToken===b.SessionToken);
}
function isCurrentSession(user){
 return sameSession(readStoredSession(),user);
}
// Caché de coordinación, no es autorización: AUTH y los servicios siguen validando cada operación.
function getRecentValidation(user){
 const latest=readStoredSession();
 const validatedAt=latest&&latest.SessionValidatedAt;
 return sameSession(latest,user)&&Number.isFinite(validatedAt)&&
  Date.now()-validatedAt>=0&&Date.now()-validatedAt<VALIDATION_CACHE_TTL_MS;
}
function persistSessionValidation(user,result){
 if(!result||result.valid!==true||!isCurrentSession(user))return;
 try{
  const latest=readStoredSession();
  if(!sameSession(latest,user))return;
  latest.SessionCreatedAt=result.createdAt||latest.SessionCreatedAt;
  latest.SessionLastActivityAt=result.lastActivityAt||latest.SessionLastActivityAt;
  latest.TermsAcceptance=result.termsAcceptance||null;
  latest.SessionValidatedAt=Date.now();
  localStorage.setItem(SESSION_KEY,JSON.stringify(latest));
  return latest;
 }catch(e){console.warn('No se pudo actualizar la vigencia local:',e.message);}
}
async function validateSessionCoordinated(user, force = false){
 const validate=async()=>{
  if(!isCurrentSession(user))return{stale:true};
  if(!force && getRecentValidation(user))return{valid:true,cached:true};
  const requestController=typeof AbortController!=='undefined'?new AbortController():null;
  let timer=null,result;
  try{
   if(requestController){
    timer=setTimeout(()=>requestController.abort(),VALIDATION_TIMEOUT_MS);
    result=await apiValidateSession(user.ID||user.id,user.SessionToken,requestController.signal);
   }else{
    result=await Promise.race([
     apiValidateSession(user.ID||user.id,user.SessionToken),
     new Promise(resolve=>{timer=setTimeout(()=>resolve({validationTimeout:true}),VALIDATION_TIMEOUT_MS);})
    ]);
    if(result&&result.validationTimeout)return{timeout:true};
   }
  }catch(error){
   if(requestController&&requestController.signal.aborted)return{timeout:true};
   throw error;
  }finally{if(timer)clearTimeout(timer);}
  if(!isCurrentSession(user))return{stale:true,result};
  if(result&&result.valid===true)persistSessionValidation(user,result);
  return result;
 };
 if(!navigator.locks||typeof navigator.locks.request!=='function'||typeof AbortController==='undefined')return validate();
 const controller=new AbortController();
 let lockTimer=setTimeout(()=>controller.abort(),LOCK_WAIT_TIMEOUT_MS);
 try{
  return await navigator.locks.request(VALIDATION_LOCK_NAME,{mode:'exclusive',signal:controller.signal},async()=>{
   clearTimeout(lockTimer);
   return validate();
  });
 }catch(error){
  if(error&&error.name==='AbortError')return{timeout:true};
  throw error;
 }finally{clearTimeout(lockTimer);}
}
function handleSessionStorageChange(event){
 if(!event||event.key!==SESSION_KEY)return;
 const current=getState().currentUser;
 const latest=readStoredSession();
 if(!latest){
  if(current){
   setState({currentUser:null});
   showLoginScreen('La sesión se cerró en otra pestaña. Inicia sesión nuevamente.');
  }
  return;
 }
 if(current&&sameSession(current,latest)){
  setState({currentUser:latest});
  return;
 }
 checkSession().catch(error=>console.warn('No se pudo sincronizar la sesión entre pestañas:',error));
}
if(typeof window!=='undefined')window.addEventListener('storage',handleSessionStorageChange);

function handleLoginSuccess(user, persist = true) {
    logoutGeneration_ += 1;
    if (persist) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setState({ currentUser: user });
    showApp(user); // Muestra la UI principal inmediatamente
}

async function loadInitialData() {
    let catalogLoaded = false;

    // 1. Intentar cargar desde caché local inmediatamente (Cache-First)
    try {
        // Phase 3.3: Usar Promise.race para no bloquear indefinidamente si IndexedDB está lento
        const cachedCatalog = await Promise.race([
            offline.getCatalog(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout local")), 3000))
        ]);

        if (offline.isCompleteCatalogSnapshot(cachedCatalog)) {
            console.log("Cargando catálogo desde caché local...");
            const normalizedCached = normalizeCatalogData(cachedCatalog);
            processCatalogData(normalizedCached);
            catalogLoaded = true;
        } else if (cachedCatalog) {
            console.warn('Se descartó una caché de catálogo incompleta o con IDs inválidos.');
        }
    } catch (e) {
        console.warn("Error o timeout al leer catálogo de IndexedDB:", e);
    }

    // 2. Cargar desde la red en segundo plano
    try {
        const apiResponse = await fetchCatalogData();
        const catalogData = normalizeCatalogData(apiResponse && apiResponse.data);
        if (!offline.isCompleteCatalogSnapshot(catalogData)) {
            throw new Error('El servicio no devolvió una instantánea completa del catálogo.');
        }

        // Guardar en caché local para futuros usos (silencioso)
        offline.saveCatalog(catalogData).catch(e => console.warn("Error guardando catálogo en caché:", e));

        if (catalogLoaded) {
            // Sincronización silenciosa si ya se cargó desde la caché
            const { performSilentSync } = await import('./ui.js');
            performSilentSync(catalogData);
        } else {
            processCatalogData(catalogData);
        }
        catalogLoaded = true;

        // Precarga compartida de Problemas y Soluciones; búsqueda y modales reutilizan esta misma petición.
        loadPysData({ refresh: true }).catch(e => console.warn("Error precargando PyS en segundo plano:", e));

    } catch (error) {
        console.warn("Fallo al cargar catálogo desde red:", error);

        // Phase 3.3/3.4: Solo mostrar error si REALMENTE no hay nada cargado ni se pudo cargar del caché tras el fallo de red
        if (!catalogLoaded) {
            try {
                const cachedCatalog = await offline.getCatalog();
                if (offline.isCompleteCatalogSnapshot(cachedCatalog) && cachedCatalog.cortes.length > 0) {
                    const normalizedCached = normalizeCatalogData(cachedCatalog);
                    processCatalogData(normalizedCached);
                    catalogLoaded = true;
                    console.log("Catalog rehydrated from cache after network failure.");
                    return;
                }
            } catch (e) { /* silent */ }

            // Si llegamos aquí, no hay datos locales ni de red.
            showGlobalError("No se pudo cargar el catálogo. Verifica tu conexión.");

            // Aseguramos que el estado refleje un catálogo vacío para limpiar skeletons si los hubiera
            setState({
                catalogData: {
                    cortes: [],
                    tutoriales: [],
                    relay: [],
                    sortedCategories: []
                }
            });
        }
    }
}

function processCatalogData(catalogData) {
    try {
        const categoryCounts = catalogData.cortes.reduce((acc, item) => {
            if (item.categoria) {
                acc[item.categoria] = (acc[item.categoria] || 0) + 1;
            }
            return acc;
        }, {});

        const sortedCategories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]);

        setState({
            catalogData: {
                ...catalogData,
                sortedCategories: sortedCategories
            }
        });
    } catch (e) {
        console.error("Error procesando datos del catálogo:", e);
    }
}


/**
 * Revalida la sesión actual contra AUTH. Devuelve true si sigue vigente,
 * false si se confirmó su invalidez y null si no fue posible verificarla.
 */
export async function validateActiveSession(force = false) {
    const user = readStoredSession();
    if (!user || !isCurrentSession(user)) {
        if (!user) {
            setState({ currentUser: null });
            showLoginScreen();
        }
        return false;
    }
    const memoryUser = getState().currentUser;
    if (!sameSession(memoryUser, user)) handleLoginSuccess(user, false);
    const expiration = getLocalSessionExpiry(user);
    if (expiration) {
        logout(expiration === 'absolute_expiration'
            ? 'Tu sesión alcanzó su vigencia máxima. Inicia sesión nuevamente.'
            : 'Tu sesión expiró por inactividad. Inicia sesión nuevamente.', user);
        return false;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
    try {
        const result = await validateSessionCoordinated(user, force === true);
        if (!isCurrentSession(user)) return false;
        if (result && result.valid === true) return true;
        if (result && result.valid === false) {
            logout('Tu sesión ya no está vigente. Inicia sesión nuevamente.', user);
            return false;
        }
        return null;
    } catch (error) {
        if (!isCurrentSession(user)) return false;
        console.warn('No se pudo revalidar la sesión activa:', error && error.message ? error.message : error);
        return null;
    }
}

export async function checkSession() {
    try {
        const historyPromise = offline.getSearchHistory(), viewedPromise = offline.getViewedItems();
        try {
            const cachedPysRaw = localStorage.getItem('gpsepedia_pys_cache');
            if (cachedPysRaw) { const parsedPys = JSON.parse(cachedPysRaw); if (Array.isArray(parsedPys) && parsedPys.length) setState({ pysData: parsedPys }); }
        } catch (error) {}
        Promise.all([historyPromise, viewedPromise]).then(([history, viewed]) => {
            if (history || viewed) setState({ searchHistory: history || [], viewedItems: viewed || [] });
        }).catch(error => console.warn("Error asíncrono cargando historial/vistos:", error));
    } catch (error) { console.warn("Error en el flujo de rehidratación:", error); }

    const sessionData = localStorage.getItem(SESSION_KEY);
    if (!sessionData) { setState({ currentUser: null }); showLoginScreen(); return; }
    let user;
    try {
        user = JSON.parse(sessionData);
        if (!user || !user.SessionToken || !(user.ID || user.id)) throw new Error('Datos de sesión incompletos.');
    } catch (error) {
        console.error("Sesión local inválida:", error);
        if (localStorage.getItem(SESSION_KEY) !== sessionData) return checkSession();
        localStorage.removeItem(SESSION_KEY); setState({ currentUser: null });
        showLoginScreen('La sesión local no es válida. Inicia sesión nuevamente.'); return;
    }
    const latestSession = readStoredSession();
    if (!sameSession(latestSession, user)) {
        if (latestSession) return checkSession();
        setState({ currentUser: null }); showLoginScreen(); return;
    }
    user = latestSession;
    const localExpiration = getLocalSessionExpiry(user);
    if (localExpiration) {
        logout(localExpiration === 'absolute_expiration'
            ? 'Tu sesión alcanzó su vigencia máxima. Inicia sesión nuevamente.'
            : 'Tu sesión expiró por inactividad. Inicia sesión nuevamente.', user);
        return;
    }
    if (!isCurrentSession(user)) return;
    if (window.navigator && window.navigator.onLine === false) {
        setState({ currentUser: null });
        showLoginScreen('Conéctate a Internet para verificar tu sesión y la aceptación vigente de los términos.');
        return;
    }
    try {
        const result = await validateSessionCoordinated(user, true);
        if (result && result.stale) return;
        if (result && result.valid === true) {
            const validatedUser = persistSessionValidation(user, result);
            if (!validatedUser || !sameSession(readStoredSession(), user)) return;
            handleLoginSuccess(validatedUser, false); loadInitialData(); return;
        }
        if (result && result.valid === false) { logout("Tu sesión ha expirado. Por favor, inicia sesión de nuevo.", user); return; }
        setState({ currentUser: null });
        showLoginScreen('No se pudo verificar la sesión ni la aceptación de términos. Intenta nuevamente.');
    } catch (error) {
        if (!isCurrentSession(user)) return;
        console.warn("Fallo validación de sesión:", error && error.message ? error.message : error);
        const message = String(error && error.message || '').toLowerCase();
        if (message.includes('expirada') || message.includes('inválida') || message.includes('expired')) {
            showGlobalError('Error de sesión: ' + error.message); logout(null, user); return;
        }
        setState({ currentUser: null });
        showLoginScreen('No se pudo verificar la sesión ni la aceptación de términos. Intenta nuevamente.');
    }
}

export async function login(username, password) {
    try {
        const result = await apiLogin(username, password);
        if (result && result.user) {
            handleLoginSuccess(result.user);
            completeLoginRequest(username, result.loginRequestId);
            loadInitialData(); // Carga en segundo plano sin bloquear
        } else {
            throw new Error("Respuesta de login inválida.");
        }
    } catch (error) {
        showGlobalError(error.message || "Credenciales inválidas.");
    }
}

export function logout(reason = null, expectedSession = null) {
    const currentSession = readStoredSession();
    const inMemorySession = getState().currentUser;
    const guardedSession = expectedSession || inMemorySession;
    if (guardedSession && !sameSession(currentSession, guardedSession)) {
        console.info('Se ignoró un cierre de sesión obsoleto porque la sesión local ya cambió.');
        return false;
    }

    const session = guardedSession || currentSession;
    const userId = session ? String(session.ID || session.id || '').trim() : '';
    const sessionToken = session && typeof session.SessionToken === 'string' ? session.SessionToken : null;

    // Nunca borrar una sesión que haya sustituido a la que originó esta operación.
    if (guardedSession && !isCurrentSession(guardedSession)) return false;
    const logoutGeneration = ++logoutGeneration_;
    setState({ currentUser: null });
    if (!guardedSession || sameSession(readStoredSession(), guardedSession)) {
        localStorage.removeItem(SESSION_KEY);
    }
    showLoginScreen(reason);

    if (!sessionToken) return true;
    if (!userId) {
        console.warn('La sesión local se cerró, pero no se pudo solicitar la revocación remota porque falta userId.');
        showGlobalError('La sesión local se cerró, pero no se pudo solicitar la revocación remota: falta la identidad de la cuenta.');
        return true;
    }

    const shouldReportLogoutResult = () => logoutGeneration === logoutGeneration_ &&
        !readStoredSession() && !getState().currentUser;
    routeAction('logout', { userId, sessionToken })
        .then(result => {
            if (!shouldReportLogoutResult()) return;
            if (result && (result.revoked === true || result.alreadyRevoked === true)) {
                if (result.userSessionTokenMatched === true && result.userSessionTokenCleared !== true) {
                    console.warn('La sesión fue revocada, pero no se pudo limpiar Users.SessionToken.');
                    showGlobalError('La sesión fue revocada, pero no se pudo limpiar el token de referencia en Users. Requiere revisión.');
                }
                return;
            }
            console.warn('La sesión local se cerró, pero AUTH no confirmó la revocación remota.');
            showGlobalError('Cierre local completado, pero no se pudo confirmar la revocación en el servidor. La revocación queda pendiente.');
        })
        .catch(error => {
            if (!shouldReportLogoutResult()) return;
            console.warn('La sesión local se cerró; la revocación backend quedó pendiente:', error.message);
            showGlobalError('La sesión se cerró en este dispositivo, pero no se pudo confirmar su revocación en el servidor. Puede seguir activa en otros dispositivos.');
        });
    return true;
}

/**
 * Normaliza y homogeneiza la información de marcas, categorías y modelos del catálogo
 * para evitar intermitencias, duplicidades e inconsistencias debido a diferencias de espaciado o capitalización.
 */
export function normalizeCatalogData(catalogData) {
    if (!catalogData || !Array.isArray(catalogData.cortes)) return catalogData;

    const brandCasingMap = new Map(); // lowercase -> original
    const modelCasingMap = new Map(); // brandLowercase|modelLowercase -> original
    const categoryCasingMap = new Map(); // lowercase -> original

    catalogData.cortes.forEach(item => {
        if (item.marca) {
            const trimmed = String(item.marca).trim();
            const lower = trimmed.toLowerCase();
            // Preferimos una capitalización que no sea puramente todo minúscula o todo mayúscula
            if (!brandCasingMap.has(lower) || (trimmed !== lower && trimmed !== trimmed.toUpperCase())) {
                brandCasingMap.set(lower, trimmed);
            }
        }
        if (item.categoria) {
            const trimmed = String(item.categoria).trim();
            const lower = trimmed.toLowerCase();
            if (!categoryCasingMap.has(lower) || (trimmed !== lower && trimmed !== trimmed.toUpperCase())) {
                categoryCasingMap.set(lower, trimmed);
            }
        }
    });

    catalogData.cortes.forEach(item => {
        if (item.marca) {
            const trimmed = String(item.marca).trim();
            const lower = trimmed.toLowerCase();
            item.marca = brandCasingMap.get(lower) || trimmed;
        }
        if (item.categoria) {
            const trimmed = String(item.categoria).trim();
            const lower = trimmed.toLowerCase();
            item.categoria = categoryCasingMap.get(lower) || trimmed;
        }

        if (item.modelo && item.marca) {
            const trimmed = String(item.modelo).trim();
            const lower = trimmed.toLowerCase();
            const key = `${item.marca.toLowerCase()}|${lower}`;
            if (!modelCasingMap.has(key) || (trimmed !== lower && trimmed !== trimmed.toUpperCase())) {
                modelCasingMap.set(key, trimmed);
            }
        }
    });

    catalogData.cortes.forEach(item => {
        if (item.modelo && item.marca) {
            const trimmed = String(item.modelo).trim();
            const lower = trimmed.toLowerCase();
            const key = `${item.marca.toLowerCase()}|${lower}`;
            item.modelo = modelCasingMap.get(key) || trimmed;
        }
    });

    return catalogData;
}
