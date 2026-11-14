// GPSpedia Authentication Module | Version: 2.1.6
// Responsibilities:
// - Manage the entire user authentication lifecycle (login, logout, session validation).
// - Interact with the API module for backend communication.
// - Update the user state.

import { setState, getState } from './state.js';
import { routeAction, fetchCatalogData, getCatalogChanges, login as apiLogin, validateSession as apiValidateSession, completeLoginRequest } from './api-config.js';
import { showLoginScreen, showApp, showGlobalError, performSilentSync } from './ui.js';
import * as offline from './offline.js';
import { loadPysData } from './pys-data.js';

async function getCatalogFeedHead_(user, signal) {
    const userId = String(user && (user.ID || user.id) || "").trim();
    const sessionToken = String(user && user.SessionToken || "").trim();
    if (!userId || !sessionToken) throw new Error("La sesión no permite consultar el feed incremental.");
    const page = await getCatalogChanges(0, 1, { userId, sessionToken }, { signal });
    const revision = Number(page && page.currentRevision);
    if (!page || page.status !== "success" || !Number.isSafeInteger(revision) || revision < 0) {
        throw new Error("El feed no devolvió una revisión inicial válida.");
    }
    return revision;
}

async function fetchCatalogDelta_(cursor, user, signal) {
    const userId = String(user && (user.ID || user.id) || "").trim();
    const sessionToken = String(user && user.SessionToken || "").trim();
    if (!userId || !sessionToken || !Number.isSafeInteger(cursor) || cursor < 0) {
        throw new Error("La sesión o el cursor no permiten sincronizar el catálogo.");
    }
    let nextCursor = cursor;
    let currentRevision = cursor;
    const changes = [];
    for (let pageNumber = 0; pageNumber < 5; pageNumber++) {
        const page = await getCatalogChanges(nextCursor, 50, { userId, sessionToken }, { signal });
        const pageRevision = Number(page && page.currentRevision);
        if (!page || page.status !== "success" || !Number.isSafeInteger(pageRevision) || pageRevision < nextCursor ||
            !Array.isArray(page.changes) || !Number.isSafeInteger(Number(page.nextCursor)) ||
            typeof page.hasMore !== "boolean") {
            throw new Error("El feed devolvió una página incremental inválida.");
        }
        currentRevision = Math.max(currentRevision, pageRevision);
        if (page.resetRequired === true) {
            return { resetRequired: true, cursor: currentRevision, currentRevision, changes: [] };
        }
        const previousCursor = nextCursor;
        for (const change of page.changes) {
            if (!change || !Number.isSafeInteger(change.revision) || change.revision !== nextCursor + 1) {
                return { resetRequired: true, cursor: currentRevision, currentRevision, changes: [] };
            }
            changes.push(change);
            nextCursor = change.revision;
        }
        if (Number(page.nextCursor) !== nextCursor ||
            (page.hasMore && nextCursor <= previousCursor) ||
            (!page.hasMore && nextCursor < pageRevision)) {
            throw new Error("El cursor del feed no coincide con la secuencia de revisiones.");
        }
        if (!page.hasMore) {
            return { resetRequired: false, cursor: nextCursor, currentRevision, changes };
        }
    }
    return { resetRequired: true, cursor: currentRevision, currentRevision, changes: [] };
}

const SESSION_KEY = 'gpsepedia_session';
let logoutGeneration_ = 0;
const VALIDATION_LOCK_NAME = 'gpsepedia-session-validation';
const VALIDATION_CACHE_TTL_MS = 60000;
const CATALOG_LAST_SYNC_KEY = 'gpsepedia_catalog_last_sync';
const CATALOG_REFRESH_TTL_MS = 60000;
function hasFreshCatalogSync_(){try{const t=Number(localStorage.getItem(CATALOG_LAST_SYNC_KEY));return Number.isFinite(t)&&t>0&&Date.now()-t>=0&&Date.now()-t<CATALOG_REFRESH_TTL_MS;}catch(e){return false;}}
function markCatalogSync_(){try{localStorage.setItem(CATALOG_LAST_SYNC_KEY,String(Date.now()));}catch(e){}}

const VALIDATION_TIMEOUT_MS = 8000;
const LOCK_WAIT_TIMEOUT_MS = 5000;
let catalogLoadController_ = null;
function cancelCatalogLoad_() { const controller = catalogLoadController_; catalogLoadController_ = null; if (controller && !controller.signal.aborted) controller.abort(); }

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
function isSessionProfileForUser_(user,profile){
 return Boolean(user&&profile&&typeof profile==='object'&&!Array.isArray(profile)&&
  String(profile.ID||'')===String(user.ID||user.id||''));
}
function persistSessionValidation(user,result){
 if(!result||result.valid!==true||!isCurrentSession(user))return;
 try{
  const latest=readStoredSession();
  if(!sameSession(latest,user))return;
  const profile=result.profile;
  if(profile&&!isSessionProfileForUser_(user,profile))return;
  const updated={...latest};
  if(profile)['ID','Nombre_Usuario','Nombre_Completo','Privilegios','Telefono','Correo_Electronico'].forEach(key=>{
   if(Object.prototype.hasOwnProperty.call(profile,key))updated[key]=profile[key];
  });
  if(profile&&Object.prototype.hasOwnProperty.call(profile,'Privilegios')){
   const role=String(profile.Privilegios||'').trim().toLowerCase();
   if(role==='jefe')updated.Privilegios='Jefe';
  }
  updated.SessionCreatedAt=result.createdAt||updated.SessionCreatedAt;
  updated.SessionLastActivityAt=result.lastActivityAt||updated.SessionLastActivityAt;
  if(Object.prototype.hasOwnProperty.call(result,'termsAcceptance'))updated.TermsAcceptance=result.termsAcceptance||null;
  updated.SessionValidatedAt=Date.now();
  if(!isCurrentSession(user))return;
  localStorage.setItem(SESSION_KEY,JSON.stringify(updated));
  const memoryUser=getState().currentUser;
  if(sameSession(memoryUser,latest))setState({currentUser:updated});
  return updated;
 }catch(e){console.warn('No se pudo actualizar el perfil y la vigencia local:',e.message);}
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
  // Un fallo interno de AUTH o de sus dependencias no demuestra que el token esté revocado.
  if(result&&result.valid===false&&(result.error||result.unavailable===true||['missing_sheet','role_revocation_pending'].includes(String(result.reason||'')))){
   return{valid:null,unavailable:true,reason:String(result.reason||'validation_unavailable')};
  }
  if(result&&result.valid===true&&Object.prototype.hasOwnProperty.call(result,'profile')&&!isSessionProfileForUser_(user,result.profile)){
   return{valid:false,reason:'profile_identity_mismatch'};
  }
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
function loadUserLocalActivity(user) {
    const ownerId = String(user && (user.ID || user.id) || '').trim();
    if (!ownerId || ownerId === '0') { setState({ searchHistory: [], viewedItems: [] }); return; }
    Promise.all([offline.getSearchHistory(ownerId), offline.getViewedItems(ownerId)]).then(([history, viewed]) => {
        const activeUser = getState().currentUser;
        const activeOwnerId = String(activeUser && (activeUser.ID || activeUser.id) || '').trim();
        if (!isCurrentSession(user) || activeOwnerId !== ownerId) return;
        setState({ searchHistory: history || [], viewedItems: viewed || [] });
    }).catch(error => console.warn("Error asíncrono cargando historial/vistos:", error));
}

function handleSessionStorageChange(event){
 if(!event||event.key!==SESSION_KEY)return;
 const current=getState().currentUser;
 const latest=readStoredSession();
 if(!latest){
  if(current){
   setState({currentUser:null,searchHistory:[],viewedItems:[]});
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
    cancelCatalogLoad_();
    logoutGeneration_ += 1;
    if (persist) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setState({ currentUser: user });
    const appReady = showApp(user) === true;
    loadUserLocalActivity(user);
    return appReady;
}

export async function loadInitialData(forceRefresh = false) {
    cancelCatalogLoad_();
    if (typeof AbortController !== 'function') {
        setState({ catalogLoadStatus: 'error', catalogLoadError: 'Este navegador no permite cancelar solicitudes del catálogo.' });
        showGlobalError('No se puede cargar el catálogo de forma segura porque el navegador no admite cancelación de solicitudes.');
        return;
    }
    const loadController = new AbortController();
    catalogLoadController_ = loadController;
    const isCurrentLoad = () => catalogLoadController_ === loadController && !loadController.signal.aborted;
    const currentUser = getState().currentUser;
    let catalogLoaded = false;
    let cachedCatalog = null;
    let cachedCursor = null;
    setState({ catalogLoadStatus: 'loading', catalogLoadError: null });

    // 1. Renderizar primero la instantánea local junto con su cursor persistido.
    try {
        const cachedState = await Promise.race([
            offline.getCatalogSyncState(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout local")), 3000))
        ]);
        if (!isCurrentLoad()) return;
        cachedCatalog = cachedState && cachedState.snapshot;
        cachedCursor = cachedState && Number.isSafeInteger(cachedState.cursor) ? cachedState.cursor : null;
        if (offline.isCompleteCatalogSnapshot(cachedCatalog)) {
            const normalizedCached = normalizeCatalogData(cachedCatalog);
            if (processCatalogData(normalizedCached) !== true) {
                throw new Error('No se confirmó el procesamiento del catálogo local.');
            }
            catalogLoaded = true;
            setState({ catalogLoadStatus: 'ready', catalogLoadError: null });
        } else if (cachedCatalog) {
            console.warn('Se descartó una caché de catálogo incompleta o con IDs inválidos.');
            cachedCatalog = null;
        }
    } catch (error) {
        if (!isCurrentLoad()) return;
        console.warn("Error o timeout al leer catálogo de IndexedDB:", error);
        try {
            cachedCatalog = await offline.getCatalog();
            if (offline.isCompleteCatalogSnapshot(cachedCatalog)) {
                const normalizedCached = normalizeCatalogData(cachedCatalog);
                if (processCatalogData(normalizedCached) !== true) throw new Error('No se confirmó el procesamiento del catálogo local.');
                catalogLoaded = true;
                cachedCursor = null;
                setState({ catalogLoadStatus: 'ready', catalogLoadError: null });
            } else cachedCatalog = null;
        } catch (fallbackError) {
            cachedCatalog = null;
            cachedCursor = null;
        }
    }

    if (!isCurrentLoad()) return;
    if (!forceRefresh && catalogLoaded && hasFreshCatalogSync_()) return;

    try {
        let snapshotToApply = null;
        let cursorToPersist = null;
        let requiresFullSnapshot = !catalogLoaded || !Number.isSafeInteger(cachedCursor);

        if (!requiresFullSnapshot) {
            try {
                const delta = await fetchCatalogDelta_(cachedCursor, currentUser, loadController.signal);
                if (!isCurrentLoad()) return;
                if (delta.resetRequired) {
                    requiresFullSnapshot = true;
                    cursorToPersist = delta.cursor;
                } else if (delta.changes.length === 0) {
                    if (delta.cursor > cachedCursor) await offline.saveCatalogCursor(delta.cursor);
                    if (!isCurrentLoad()) return;
                    markCatalogSync_();
                    setState({ catalogLoadStatus: 'ready', catalogLoadError: null });
                    return;
                } else {
                    const applied = offline.applyCatalogChangesToSnapshot(cachedCatalog, delta.changes);
                    if (applied.resetRequired) {
                        requiresFullSnapshot = true;
                        cursorToPersist = delta.currentRevision;
                    } else {
                        snapshotToApply = normalizeCatalogData(applied.snapshot);
                        cursorToPersist = delta.cursor;
                    }
                }
            } catch (feedError) {
                if (!isCurrentLoad()) return;
                console.warn("No se pudo aplicar el feed incremental; se solicitará una reconciliación completa:", feedError);
                requiresFullSnapshot = true;
                cursorToPersist = null;
            }
        } else {
            try {
                cursorToPersist = await getCatalogFeedHead_(currentUser, loadController.signal);
            } catch (headError) {
                if (!isCurrentLoad()) return;
                console.warn("No se pudo establecer el cursor inicial del catálogo:", headError);
                cursorToPersist = null;
            }
        }

        if (requiresFullSnapshot) {
            const apiResponse = await fetchCatalogData({ signal: loadController.signal, timeoutMs: 8000, retries: 2, baseDelayMs: 400 });
            if (!isCurrentLoad()) return;
            const rawCatalogData = apiResponse && apiResponse.data;
            if (!offline.isCompleteCatalogSnapshot(rawCatalogData)) {
                throw new Error('El servicio no devolvió una instantánea completa con colecciones válidas.');
            }
            snapshotToApply = normalizeCatalogData(rawCatalogData);
        }

        if (!isCurrentLoad()) return;
        if (catalogLoaded) {
            if (!isCurrentLoad()) return;
            if (await performSilentSync(snapshotToApply) !== true) {
                throw new Error('La sincronización del catálogo no confirmó su actualización.');
            }
        } else if (processCatalogData(snapshotToApply) !== true) {
            throw new Error('No se confirmó el procesamiento del catálogo recibido.');
        }
        if (!isCurrentLoad()) return;

        // El cursor se confirma en la misma transacción que el snapshot ya aplicado.
        if (Number.isSafeInteger(cursorToPersist)) {
            await offline.saveCatalogWithCursor(snapshotToApply, cursorToPersist);
        } else {
            await offline.saveCatalog(snapshotToApply);
        }
        if (!isCurrentLoad()) return;
        markCatalogSync_();
        catalogLoaded = true;
        setState({ catalogLoadStatus: 'ready', catalogLoadError: null });

        // PyS usa un endpoint/almacenamiento separado y se reconcilia tras un reset/bootstrap.
        if (requiresFullSnapshot) {
            loadPysData({ refresh: true }).catch(error => console.warn("Error precargando PyS en segundo plano:", error));
        }
    } catch (error) {
        if (!isCurrentLoad()) return;
        console.warn("Fallo al sincronizar el catálogo:", error);
        if (!catalogLoaded) {
            try {
                const fallbackCatalog = await offline.getCatalog();
                if (!isCurrentLoad()) return;
                if (offline.isCompleteCatalogSnapshot(fallbackCatalog)) {
                    const normalizedCached = normalizeCatalogData(fallbackCatalog);
                    if (processCatalogData(normalizedCached) !== true) throw new Error('No se confirmó la recuperación del catálogo local.');
                    catalogLoaded = true;
                    setState({ catalogLoadStatus: 'stale', catalogLoadError: error.message || 'La red no está disponible.' });
                    return;
                }
            } catch (fallbackError) {
                console.warn("No se pudo recuperar una instantánea válida de la caché:", fallbackError && fallbackError.message ? fallbackError.message : fallbackError);
            }
            if (!catalogLoaded) {
                setState({ catalogLoadStatus: 'error', catalogLoadError: error && error.message ? error.message : 'No se pudo cargar el catálogo.' });
                showGlobalError("No se pudo cargar el catálogo. Verifica tu conexión.");
                setState({ catalogData: { cortes: [], tutoriales: [], relay: [], logos: [], sortedCategories: [] } });
            }
        } else {
            setState({ catalogLoadStatus: 'stale', catalogLoadError: error && error.message ? error.message : 'No se pudo actualizar el catálogo desde la red.' });
        }
    } finally {
        if (catalogLoadController_ === loadController) catalogLoadController_ = null;
    }
}

/** Reintenta la carga del catálogo únicamente para la sesión que sigue activa. */
export async function retryCatalogLoad() {
    const currentUser = getState().currentUser;
    if (!currentUser || !isCurrentSession(currentUser)) return false;
    if (getState().catalogLoadStatus === 'loading') return false;
    await loadInitialData();
    return true;
}

function processCatalogData(catalogData) {
    if (!offline.isCompleteCatalogSnapshot(catalogData)) {
        throw new Error('No se puede procesar un catálogo incompleto o con elementos inválidos.');
    }
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
            sortedCategories
        }
    });
    return true;
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

function restoreSessionAfterValidationUnavailable_(user, error = null) {
    if (!user || !isCurrentSession(user)) return false;
    if (error) console.warn('La sesión se conserva mientras AUTH recupera disponibilidad:', error && error.message ? error.message : error);
    // La sesión local no se borra. showApp vuelve a aplicar el bloqueo de términos
    // usando la aceptación ya registrada; las operaciones protegidas siguen validándose en servidor.
    if (handleLoginSuccess(user, false)) loadInitialData();
    return true;
}

export async function checkSession() {
    setState({ currentUser: null, searchHistory: [], viewedItems: [] });
    try {
        const cachedPysRaw = localStorage.getItem('gpsepedia_pys_cache');
        if (cachedPysRaw) { const parsedPys = JSON.parse(cachedPysRaw); if (Array.isArray(parsedPys) && parsedPys.length) setState({ pysData: parsedPys }); }
    } catch (error) {}
    const sessionData = localStorage.getItem(SESSION_KEY);
    if (!sessionData) { setState({ currentUser: null, searchHistory: [], viewedItems: [] }); showLoginScreen(); return; }
    let user;
    try {
        user = JSON.parse(sessionData);
        if (!user || !user.SessionToken || !(user.ID || user.id)) throw new Error('Datos de sesión incompletos.');
    } catch (error) {
        console.error("Sesión local inválida:", error);
        if (localStorage.getItem(SESSION_KEY) !== sessionData) return checkSession();
        localStorage.removeItem(SESSION_KEY); setState({ currentUser: null, searchHistory: [], viewedItems: [] });
        showLoginScreen('La sesión local no es válida. Inicia sesión nuevamente.'); return;
    }
    const latestSession = readStoredSession();
    if (!sameSession(latestSession, user)) {
        if (latestSession) return checkSession();
        setState({ currentUser: null, searchHistory: [], viewedItems: [] }); showLoginScreen(); return;
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
        restoreSessionAfterValidationUnavailable_(user);
        return;
    }
    try {
        // Permite reutilizar una confirmación AUTH muy reciente tras una actualización rápida.
        const result = await validateSessionCoordinated(user, false);
        if (result && result.stale) return;
        if (result && result.valid === true) {
            const validatedUser = persistSessionValidation(user, result);
            if (!validatedUser || !sameSession(readStoredSession(), user)) return;
            if (handleLoginSuccess(validatedUser, false)) loadInitialData(); return;
        }
        if (result && result.valid === false) {
            logout("Tu sesión ha expirado o fue revocada. Inicia sesión nuevamente.", user);
            return;
        }
        restoreSessionAfterValidationUnavailable_(user);
    } catch (error) {
        if (!isCurrentSession(user)) return;
        restoreSessionAfterValidationUnavailable_(user, error);
    }
}

export async function login(username, password) {
    try {
        const result = await apiLogin(username, password);
        if (result && result.user) {
            const appReady = handleLoginSuccess(result.user);
            completeLoginRequest(username, result.loginRequestId);
            if (appReady) loadInitialData(); // Espera la aceptación de términos antes de cargar el catálogo
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
    cancelCatalogLoad_();
    const logoutGeneration = ++logoutGeneration_;
    setState({ currentUser: null, searchHistory: [], viewedItems: [], catalogLoadStatus: 'idle', catalogLoadError: null });
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
    if (!offline.isCompleteCatalogSnapshot(catalogData)) {
        throw new Error('El catálogo recibido no es una instantánea completa con colecciones válidas.');
    }

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
