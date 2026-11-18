// GPSpedia Authentication Module | Version: 2.1.6
// Responsibilities:
// - Manage the entire user authentication lifecycle (login, logout, session validation).
// - Interact with the API module for backend communication.
// - Update the user state.

import { setState, getState } from './state.js';
import { routeAction, fetchCatalogData, getCatalogChanges, login as apiLogin, validateSession as apiValidateSession, completeLoginRequest } from './api-config.js';
import { showLoginScreen, showApp, showGlobalError, performSilentSync, loadRichTextModePreference } from './ui.js';
import * as offline from './offline.js';
import { loadPysData, applyPysCatalogChanges, getPysDataCursor, setPysDataCursor, getPysDataFreshness } from './pys-data.js';

async function requestCatalogFeedPage_(cursor, limit, sessionPayload, parentSignal) {
    if (typeof AbortController !== "function") throw new Error("AbortController no está disponible para limitar el feed.");
    const controller = new AbortController();
    const abortFromParent = () => controller.abort();
    if (parentSignal) {
        if (parentSignal.aborted) controller.abort();
        else parentSignal.addEventListener("abort", abortFromParent, { once: true });
    }
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
        return await getCatalogChanges(cursor, limit, sessionPayload, { signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
        if (parentSignal) parentSignal.removeEventListener("abort", abortFromParent);
    }
}

async function getCatalogFeedHead_(user, signal) {
    const userId = String(user && (user.ID || user.id) || "").trim();
    const sessionToken = String(user && user.SessionToken || "").trim();
    if (!userId || !sessionToken) throw new Error("La sesión no permite consultar el feed incremental.");
    const page = await requestCatalogFeedPage_(0, 1, { userId, sessionToken }, signal);
    const revision = Number(page && page.currentRevision);
    if (!page || page.status !== "success" || !Number.isSafeInteger(revision) || revision < 0) {
        throw new Error("El feed no devolvió una revisión inicial válida.");
    }
    return revision;
}

function createPysRefreshTask_() {
    let pending = null;
    return function refreshPys() {
        if (!pending) {
            try {
                pending = Promise.resolve(loadPysData({ refresh: true })).then(
                    data => ({ ok: true, data }),
                    error => ({ ok: false, error })
                );
            } catch (error) {
                pending = Promise.resolve({ ok: false, error });
            }
        }
        return pending;
    };
}

async function refreshPysAndSyncCursor_(refreshPys, cursor) {
    const result = await refreshPys();
    const freshness = getPysDataFreshness();
    if (!result || result.ok !== true || !freshness.hasCache || freshness.stale || freshness.error) {
        const error = result && result.error || freshness.error;
        if (error) console.warn("PyS no pudo actualizarse; el catálogo continuará disponible:", error && error.message ? error.message : error);
        return false;
    }
    if (!Number.isSafeInteger(cursor) || cursor < 0) return false;
    return setPysDataCursor(cursor);
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
        const page = await requestCatalogFeedPage_(nextCursor, 50, { userId, sessionToken }, signal);
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
const CATALOG_POLL_INTERVAL_MS = 45000;
const CATALOG_POLL_MAX_INTERVAL_MS = 300000;
const CATALOG_POLL_LEASE_KEY = "gpsepedia_catalog_poll_lease";
const CATALOG_POLL_LEASE_MS = 60000;
const CATALOG_SYNC_SIGNAL_KEY = "gpsepedia_catalog_sync_signal";
let catalogLoadController_ = null;
let catalogPollTimer_ = null;
let catalogPollInterval_ = CATALOG_POLL_INTERVAL_MS;
let catalogPollInFlight_ = false;
let catalogPollListenersAttached_ = false;
let catalogSyncChannel_ = null;
let catalogSyncChannelAttached_ = false;
const catalogTabId_ = (() => {
    try {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    } catch (error) {}
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
})();

function cancelCatalogLoad_() {
    const controller = catalogLoadController_;
    catalogLoadController_ = null;
    if (controller && !controller.signal.aborted) controller.abort();
}
function clearCatalogPollTimer_() {
    if (catalogPollTimer_ !== null) clearTimeout(catalogPollTimer_);
    catalogPollTimer_ = null;
}
function stopCatalogPolling_() {
    clearCatalogPollTimer_();
    catalogPollInterval_ = CATALOG_POLL_INTERVAL_MS;
}

function getCatalogPollLeaseStorageKey_(user) {
    const userId = String(user && (user.ID || user.id) || "").trim();
    return userId ? CATALOG_POLL_LEASE_KEY + ":" + encodeURIComponent(userId) : CATALOG_POLL_LEASE_KEY;
}
function tryAcquireCatalogPollLease_(user) {
    try {
        if (typeof localStorage === "undefined") return true;
        const key = getCatalogPollLeaseStorageKey_(user);
        const now = Date.now();
        let current = null;
        try { current = JSON.parse(localStorage.getItem(key) || "null"); } catch (error) {}
        if (current && current.owner !== catalogTabId_ && Number(current.expiresAt) > now) return false;
        localStorage.setItem(key, JSON.stringify({ owner: catalogTabId_, expiresAt: now + CATALOG_POLL_LEASE_MS }));
        const verified = JSON.parse(localStorage.getItem(key) || "null");
        return Boolean(verified && verified.owner === catalogTabId_);
    } catch (error) {
        // Si el almacenamiento está bloqueado, se prefiere sincronizar a omitir cambios.
        return true;
    }
}
function releaseCatalogPollLease_(user) {
    try {
        if (typeof localStorage === "undefined") return;
        const key = getCatalogPollLeaseStorageKey_(user);
        const current = JSON.parse(localStorage.getItem(key) || "null");
        if (current && current.owner === catalogTabId_) localStorage.removeItem(key);
    } catch (error) {}
}
async function handleCatalogSyncMessage_(message) {
    if (!message || message.type !== "catalog-updated" || message.source === catalogTabId_) return;
    const user = getState().currentUser;
    const userId = String(user && (user.ID || user.id) || "").trim();
    if (!userId || !isCurrentSession(user) || String(message.userId || "") !== userId) return;
    try {
        const localState = await offline.getCatalogSyncState();
        if (message.refreshPys === true) {
            const cursor = localState && Number.isSafeInteger(localState.cursor) ? localState.cursor : null;
            loadPysData({ refresh: true })
                .then(() => setPysDataCursor(cursor))
                .catch(error => console.warn("No se pudo refrescar PyS desde otra pestaña:", error));
        }
        if (!localState || !offline.isCompleteCatalogSnapshot(localState.snapshot)) return;
        const incoming = normalizeCatalogData(localState.snapshot);
        const current = getState().catalogData;
        const changed = !offline.isCompleteCatalogSnapshot(current) ||
            offline.compareCatalogSnapshots(current, incoming).hasChanges;
        if (!changed || !isCurrentSession(user)) return;
        if (await performSilentSync(incoming) === true) markCatalogSync_();
    } catch (error) {
        console.warn("No se pudo aplicar la sincronización recibida de otra pestaña:", error && error.message ? error.message : error);
    }
}
function ensureCatalogSyncChannel_() {
    if (catalogSyncChannelAttached_) return;
    catalogSyncChannelAttached_ = true;
    if (typeof BroadcastChannel === "function") {
        try {
            catalogSyncChannel_ = new BroadcastChannel("gpsepedia-catalog-sync");
            catalogSyncChannel_.addEventListener("message", event => handleCatalogSyncMessage_(event && event.data));
            return;
        } catch (error) {
            catalogSyncChannel_ = null;
        }
    }
    if (typeof window !== "undefined" && window && typeof window.addEventListener === "function") {
        window.addEventListener("storage", event => {
            if (!event || event.key !== CATALOG_SYNC_SIGNAL_KEY || !event.newValue) return;
            try { handleCatalogSyncMessage_(JSON.parse(event.newValue)); } catch (error) {}
        });
    }
}
function broadcastCatalogSync_(user, refreshPys = false) {
    const userId = String(user && (user.ID || user.id) || "").trim();
    if (!userId) return;
    const message = { type: "catalog-updated", source: catalogTabId_, userId, refreshPys: refreshPys === true, timestamp: Date.now() };
    ensureCatalogSyncChannel_();
    try {
        if (catalogSyncChannel_) catalogSyncChannel_.postMessage(message);
        else if (typeof localStorage !== "undefined") localStorage.setItem(CATALOG_SYNC_SIGNAL_KEY, JSON.stringify(message));
    } catch (error) {}
}
function ensureCatalogPollListeners_() {
    if (catalogPollListenersAttached_) return;
    catalogPollListenersAttached_ = true;
    ensureCatalogSyncChannel_();
    if (typeof document !== "undefined" && document && typeof document.addEventListener === "function") {
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") clearCatalogPollTimer_();
            else scheduleCatalogPoll_(1000);
        });
    }
    if (typeof window !== "undefined" && window && typeof window.addEventListener === "function") {
        window.addEventListener("online", () => scheduleCatalogPoll_(1000));
        window.addEventListener("offline", clearCatalogPollTimer_);
    }
}
function scheduleCatalogPoll_(delayMs = catalogPollInterval_) {
    clearCatalogPollTimer_();
    const user = getState().currentUser;
    if (!user || !user.SessionToken || !isCurrentSession(user)) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    ensureCatalogPollListeners_();
    catalogPollTimer_ = setTimeout(() => {
        catalogPollTimer_ = null;
        runCatalogPoll_();
    }, Math.max(0, Number(delayMs) || 0));
}
async function runCatalogPoll_() {
    if (catalogPollInFlight_) return;
    const user = getState().currentUser;
    if (!user || !user.SessionToken || !isCurrentSession(user)) {
        stopCatalogPolling_();
        return;
    }
    if (getState().catalogLoadStatus === "loading") {
        scheduleCatalogPoll_(5000);
        return;
    }
    if (!tryAcquireCatalogPollLease_(user)) {
        scheduleCatalogPoll_(catalogPollInterval_);
        return;
    }
    catalogPollInFlight_ = true;
    try {
        const synced = await loadInitialData(true, { silent: true, fromPoll: true });
        catalogPollInterval_ = synced === true
            ? CATALOG_POLL_INTERVAL_MS
            : Math.min(CATALOG_POLL_MAX_INTERVAL_MS, Math.max(CATALOG_POLL_INTERVAL_MS, catalogPollInterval_ * 2));
    } catch (error) {
        catalogPollInterval_ = Math.min(CATALOG_POLL_MAX_INTERVAL_MS, Math.max(CATALOG_POLL_INTERVAL_MS, catalogPollInterval_ * 2));
        console.warn("Falló la sincronización automática del catálogo:", error && error.message ? error.message : error);
    } finally {
        releaseCatalogPollLease_(user);
        catalogPollInFlight_ = false;
        scheduleCatalogPoll_(catalogPollInterval_);
    }
}

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
function endSessionForReauthentication_(expectedSession = null) {
    const storedSession = readStoredSession();
    const activeSession = getState().currentUser;
    if (!storedSession) return false;
    if (expectedSession && !sameSession(storedSession, expectedSession)) return false;
    // Una respuesta tardía de una sesión anterior nunca cierra la sesión nueva.
    if (activeSession && !sameSession(activeSession, storedSession)) return false;
    stopCatalogPolling_();
    cancelCatalogLoad_();
    logoutGeneration_ += 1;
    if (sameSession(readStoredSession(), storedSession)) localStorage.removeItem(SESSION_KEY);
    setState({
        currentUser: null,
        searchHistory: [],
        viewedItems: [],
        catalogLoadStatus: 'idle',
        catalogLoadError: null
    });
    showLoginScreen('Sesión terminada');
    return true;
}

function handleConfirmedSessionInvalidation_(event) {
    const rejectedToken = String(event && event.detail && event.detail.sessionToken || '').trim();
    const currentSession = readStoredSession();
    if (!rejectedToken || !currentSession ||
        String(currentSession.SessionToken || '') !== rejectedToken) return false;
    return endSessionForReauthentication_(currentSession);
}

if (typeof window !== 'undefined') {
    window.addEventListener('gpsepedia:session-invalid', handleConfirmedSessionInvalidation_);
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
    // Nunca conservar en memoria el carrusel de la sesión/cuenta anterior mientras carga el propietario actual.
    setState({ searchHistory: [], viewedItems: [] });
    if (!ownerId || ownerId === '0') return;
    const isOwnerCurrent = () => {
        const activeUser = getState().currentUser;
        return isCurrentSession(user) && String(activeUser && (activeUser.ID || activeUser.id) || '').trim() === ownerId;
    };
    offline.getSearchHistory(ownerId).then(history => {
        if (isOwnerCurrent()) setState({ searchHistory: history || [] });
    }).catch(error => console.warn("No se pudo cargar el historial de búsqueda local:", error));

    // El historial es opcional: un fallo temporal de IndexedDB no equivale a una lista vacía.
    // Se reintenta en segundo plano y cada respuesta tardía vuelve a comprobar la sesión/propietario.
    const retryDelays = [1500, 5000, 15000];
    const loadViewedItems = attempt => {
        offline.getViewedItemsResult(ownerId).then(result => {
            if (!isOwnerCurrent()) return;
            if (!result || result.available !== true) {
                if (attempt < retryDelays.length) {
                    setTimeout(() => { if (isOwnerCurrent()) loadViewedItems(attempt + 1); }, retryDelays[attempt]);
                } else {
                    console.warn("No se pudo recuperar Vistos Recientemente; se conserva el estado en memoria.");
                }
                return;
            }
            // La fuente del carrusel es únicamente el historial local filtrado por ownerId.
            setState({ viewedItems: Array.isArray(result.items) ? result.items.slice(0, 20) : [] });
        }).catch(error => {
            if (!isOwnerCurrent()) return;
            if (attempt < retryDelays.length) {
                setTimeout(() => { if (isOwnerCurrent()) loadViewedItems(attempt + 1); }, retryDelays[attempt]);
            } else {
                console.warn("No se pudo recuperar Vistos Recientemente desde IndexedDB:", error);
            }
        });
    };
    loadViewedItems(0);
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
    const previousOwnerId = String(getState().currentUser && (getState().currentUser.ID || getState().currentUser.id) || '').trim();
    const nextOwnerId = String(user && (user.ID || user.id) || '').trim();
    setState({
        currentUser: user,
        ...(previousOwnerId && previousOwnerId !== nextOwnerId ? { searchHistory: [], viewedItems: [] } : {})
    });
    const appReady = showApp(user) === true;
    loadUserLocalActivity(user);
    if (appReady) loadRichTextModePreference(user);
    return appReady;
}

export async function loadInitialData(forceRefresh = false, options = {}) {
    const settings = options && typeof options === "object" ? options : {};
    const silent = settings.silent === true;
    cancelCatalogLoad_();
    if (typeof AbortController !== 'function') {
        if (!silent) {
            setState({ catalogLoadStatus: 'error', catalogLoadError: 'Este navegador no permite cancelar solicitudes del catálogo.' });
            showGlobalError('No se puede cargar el catálogo de forma segura porque el navegador no admite cancelación de solicitudes.');
        }
        return false;
    }
    const loadController = new AbortController();
    catalogLoadController_ = loadController;
    const isCurrentLoad = () => catalogLoadController_ === loadController && !loadController.signal.aborted;
    const currentUser = getState().currentUser;
    ensureCatalogSyncChannel_();
    let catalogLoaded = false;
    let cachedCatalog = null;
    let cachedCursor = null;
    let pysDeltaChanges = [];

    // 1. Renderizar primero la instantánea local junto con su cursor persistido.
    try {
        const idbRead = offline.getCatalogSyncState().catch(() => null);
        const fallbackRead = typeof offline.getCatalogFallbackCache === "function"
            ? offline.getCatalogFallbackCache().catch(() => null)
            : Promise.resolve(null);
        const combinedCacheRead = Promise.all([idbRead, fallbackRead]).then(([idbState, fallbackState]) => {
            if (offline.isCompleteCatalogSnapshot(idbState && idbState.snapshot)) return { source: "indexeddb", state: idbState };
            if (offline.isCompleteCatalogSnapshot(fallbackState && fallbackState.snapshot)) return { source: "cache-storage", state: fallbackState };
            return { source: "empty", state: null };
        });
        const idbFastCandidate = idbRead.then(state =>
            offline.isCompleteCatalogSnapshot(state && state.snapshot)
                ? { source: "indexeddb", state } : combinedCacheRead
        );
        const fallbackFastCandidate = fallbackRead.then(state =>
            offline.isCompleteCatalogSnapshot(state && state.snapshot)
                ? { source: "cache-storage", state } : combinedCacheRead
        );
        const cachedResult = await Promise.race([
            idbFastCandidate,
            fallbackFastCandidate,
            combinedCacheRead,
            new Promise(resolve => setTimeout(() => resolve({ source: "timeout", state: null }), 3000))
        ]);
        const cachedState = cachedResult && cachedResult.state;
        if (!isCurrentLoad()) return;
        cachedCatalog = cachedState && cachedState.snapshot;
        cachedCursor = cachedState && Number.isSafeInteger(cachedState.cursor) ? cachedState.cursor : null;
        if (offline.isCompleteCatalogSnapshot(cachedCatalog)) {
            const normalizedCached = normalizeCatalogData(cachedCatalog);
            const currentCatalog = getState().catalogData;
            const shouldRehydrate = !silent || !offline.isCompleteCatalogSnapshot(currentCatalog) ||
                offline.compareCatalogSnapshots(currentCatalog, normalizedCached).hasChanges;
            if (shouldRehydrate && processCatalogData(normalizedCached) !== true) {
                throw new Error('No se confirmó el procesamiento del catálogo local.');
            }
            catalogLoaded = true;
            if (!silent) setState({ catalogLoadStatus: 'ready', catalogLoadError: null });
        } else if (cachedCatalog) {
            console.warn('Se descartó una caché de catálogo incompleta o con IDs inválidos.');
            cachedCatalog = null;
        }
    } catch (error) {
        if (!isCurrentLoad()) return;
        console.warn("Error o timeout al leer catálogo de IndexedDB:", error);
        // Solo mostramos carga cuando la lectura local no entregó una caché utilizable.
        if (!silent && !offline.isCompleteCatalogSnapshot(getState().catalogData)) {
            setState({ catalogLoadStatus: 'loading', catalogLoadError: null });
        }
        try {
            // CacheStorage es independiente de IndexedDB y puede recuperar el snapshot
            // incluso cuando el open de la base local permanece pendiente.
            const fallbackState = typeof offline.getCatalogFallbackCache === "function"
                ? await offline.getCatalogFallbackCache() : null;
            if (fallbackState && offline.isCompleteCatalogSnapshot(fallbackState.snapshot)) {
                cachedCatalog = fallbackState.snapshot;
                cachedCursor = Number.isSafeInteger(fallbackState.cursor) ? fallbackState.cursor : null;
            } else {
                cachedCursor = null;
                // Un timeout del primer open comparte la misma promesa pendiente;
                // no repetir inmediatamente la misma apertura desde getCatalog().
                if (String(error && error.message || "").includes("Timeout local")) throw error;
                cachedCatalog = await offline.getCatalog();
            }
            if (offline.isCompleteCatalogSnapshot(cachedCatalog)) {
                const normalizedCached = normalizeCatalogData(cachedCatalog);
                const currentCatalog = getState().catalogData;
                const shouldRehydrate = !silent || !offline.isCompleteCatalogSnapshot(currentCatalog) ||
                    offline.compareCatalogSnapshots(currentCatalog, normalizedCached).hasChanges;
                if (shouldRehydrate && processCatalogData(normalizedCached) !== true) throw new Error('No se confirmó el procesamiento del catálogo local.');
                catalogLoaded = true;
                if (!silent) setState({ catalogLoadStatus: 'ready', catalogLoadError: null });
            } else cachedCatalog = null;
        } catch (fallbackError) {
            cachedCatalog = null;
            cachedCursor = null;
        }
    }

    if (!isCurrentLoad()) return;
    if (!catalogLoaded && !silent) setState({ catalogLoadStatus: 'loading', catalogLoadError: null });
    if (!forceRefresh && catalogLoaded && hasFreshCatalogSync_()) return;

    try {
        let snapshotToApply = null;
        let cursorToPersist = null;
        let requiresFullSnapshot = !catalogLoaded || !Number.isSafeInteger(cachedCursor);
        const refreshPys = createPysRefreshTask_();

        if (!requiresFullSnapshot) {
            try {
                const delta = await fetchCatalogDelta_(cachedCursor, currentUser, loadController.signal);
                if (!isCurrentLoad()) return;
                if (delta.resetRequired) {
                    requiresFullSnapshot = true;
                    cursorToPersist = delta.cursor;
                } else if (delta.changes.length === 0) {
                    const pysFreshness = getPysDataFreshness();
                    if (!pysFreshness.hasCache || pysFreshness.updatedAt <= 0 ||
                        getPysDataCursor() !== cachedCursor || pysFreshness.error) {
                        await refreshPysAndSyncCursor_(refreshPys, delta.cursor);
                    } else {
                        setPysDataCursor(delta.cursor);
                    }
                    if (delta.cursor > cachedCursor) await offline.saveCatalogCursor(delta.cursor);
                    if (!isCurrentLoad()) return;
                    markCatalogSync_();
                    if (!silent) setState({ catalogLoadStatus: 'ready', catalogLoadError: null });
                    return true;
                } else {
                    pysDeltaChanges = delta.changes.filter(change => change && change.collection === "pys");
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
                const transientFeedFailure = feedError && (
                    feedError.kind === "network" || feedError.kind === "abort" ||
                    feedError.code === "CATALOG_FEED_NETWORK_ERROR" ||
                    feedError.code === "REQUEST_ABORTED" ||
                    feedError.name === "CatalogRequestTimeoutError"
                );
                if (transientFeedFailure && catalogLoaded &&
                    offline.isCompleteCatalogSnapshot(cachedCatalog) && Number.isSafeInteger(cachedCursor)) {
                    if (!silent) setState({ catalogLoadStatus: 'ready', catalogLoadError: null });
                    return false;
                }
                requiresFullSnapshot = true;
                cursorToPersist = null;
            }
        } else {
            // PyS es independiente del cursor y del snapshot del catálogo; iniciar
            // su lectura ahora evita encadenar tres viajes de red en el primer arranque.
            refreshPys();
            try {
                cursorToPersist = await getCatalogFeedHead_(currentUser, loadController.signal);
            } catch (headError) {
                if (!isCurrentLoad()) return;
                console.warn("No se pudo establecer el cursor inicial del catálogo:", headError);
                cursorToPersist = null;
            }
        }

        if (requiresFullSnapshot) {
            // También cubre reset del feed o caché inconsistente: la misma promesa
            // evita duplicar la lectura si ya comenzó junto al cursor inicial.
            refreshPys();
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
        } else {
            if (processCatalogData(snapshotToApply) !== true) {
                throw new Error('No se confirmó el procesamiento del catálogo recibido.');
            }
            // Desde este punto el catálogo remoto ya es utilizable en memoria.
            // El almacenamiento local y los datos auxiliares no deben retener el arranque.
            catalogLoaded = true;
            if (!silent) setState({ catalogLoadStatus: 'ready', catalogLoadError: null });
        }
        if (!isCurrentLoad()) return;

        // PyS comparte las revisiones del feed, pero conserva su caché independiente.
        // Aplicar sus eventos antes de confirmar el cursor evita perder cambios si falla la caché.
        const pysFreshness = getPysDataFreshness();
        const pysCacheAligned = pysFreshness.hasCache && pysFreshness.updatedAt > 0 &&
            Number.isSafeInteger(getPysDataCursor()) && getPysDataCursor() === cachedCursor && !pysFreshness.error;
        if (requiresFullSnapshot || !pysCacheAligned) {
            await refreshPysAndSyncCursor_(refreshPys, cursorToPersist);
        } else if (pysDeltaChanges.length) {
            const pysResult = applyPysCatalogChanges(pysDeltaChanges, cursorToPersist);
            if (!pysResult || pysResult.needsRefresh) {
                await refreshPysAndSyncCursor_(refreshPys, cursorToPersist);
            } else if (Number.isSafeInteger(cursorToPersist) && !getPysDataFreshness().error) {
                // applyPysCatalogChanges escribe el cursor cuando hay cambios;
                // los deletes idempotentes también deben avanzar la revisión.
                setPysDataCursor(cursorToPersist);
            }
        } else if (Number.isSafeInteger(cursorToPersist) && !getPysDataFreshness().error) {
            setPysDataCursor(cursorToPersist);
        }

        // La caché local es secundaria: una indisponibilidad de IndexedDB no debe
        // descartar el catálogo remoto que ya se procesó correctamente en memoria.
        const persistenceTasks = [];
        const indexedDbSave = Number.isSafeInteger(cursorToPersist)
            ? offline.saveCatalogWithCursor(snapshotToApply, cursorToPersist)
            : offline.saveCatalog(snapshotToApply);
        persistenceTasks.push(Promise.resolve(indexedDbSave).catch(storageError => {
            console.warn("El catálogo se actualizó en memoria, pero no pudo persistirse en IndexedDB:", storageError);
        }));
        if (typeof offline.saveCatalogFallbackCache === "function") {
            persistenceTasks.push(Promise.resolve(offline.saveCatalogFallbackCache(snapshotToApply, cursorToPersist)).catch(fallbackStorageError => {
                console.warn("No se pudo actualizar la caché alternativa del catálogo:", fallbackStorageError && fallbackStorageError.name || "CacheStorageError");
            }));
        }
        await Promise.all(persistenceTasks);
        if (!isCurrentLoad()) return;
        markCatalogSync_();
        broadcastCatalogSync_(currentUser, requiresFullSnapshot || pysDeltaChanges.length > 0);
        catalogLoaded = true;
        if (!silent) setState({ catalogLoadStatus: 'ready', catalogLoadError: null });
        return true;
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
                    if (!silent) setState({ catalogLoadStatus: 'stale', catalogLoadError: error.message || 'La red no está disponible.' });
                    return false;
                }
            } catch (fallbackError) {
                console.warn("No se pudo recuperar una instantánea válida de la caché:", fallbackError && fallbackError.message ? fallbackError.message : fallbackError);
            }
            if (!catalogLoaded) {
                if (!silent) setState({ catalogLoadStatus: 'error', catalogLoadError: error && error.message ? error.message : 'No se pudo cargar el catálogo.' });
                if (!silent) showGlobalError("No se pudo cargar el catálogo. Verifica tu conexión.");
                if (!silent) setState({ catalogData: { cortes: [], tutoriales: [], relay: [], logos: [], sortedCategories: [] } });
            }
            return false;
        } else {
            if (!silent) setState({ catalogLoadStatus: 'stale', catalogLoadError: error && error.message ? error.message : 'No se pudo actualizar el catálogo desde la red.' });
            return false;
        }
    } finally {
        if (catalogLoadController_ === loadController) {
            catalogLoadController_ = null;
            if (settings.fromPoll !== true && typeof scheduleCatalogPoll_ === "function") scheduleCatalogPoll_();
        }
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
    handleLoginSuccess(user, false);
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
    // La identidad y el rol se verificaron al iniciar sesión. La restauración utiliza
    // ese perfil local sin otro viaje de red a AUTH. El backend sigue autorizando cada
    // solicitud protegida mediante el token y el contexto central de sesión/revocación;
    // nunca confía en el rol enviado por el navegador.
    const normalizedRole = String(user.Privilegios || "")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, "_");
    if (!["desarrollador", "jefe", "supervisor", "tecnico", "tecnico_exterior"].includes(normalizedRole)) {
        if (localStorage.getItem(SESSION_KEY) === sessionData) localStorage.removeItem(SESSION_KEY);
        setState({ currentUser: null, searchHistory: [], viewedItems: [] });
        showLoginScreen("La sesión no contiene un rol válido. Inicia sesión nuevamente.");
        return;
    }
    handleLoginSuccess(user, false);
}

export async function login(username, password) {
    try {
        const result = await apiLogin(username, password);
        if (result && result.user) {
            handleLoginSuccess(result.user);
            completeLoginRequest(username, result.loginRequestId);
            
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
    stopCatalogPolling_();
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

export async function requestPasswordRecovery(username, email) {
    const result = await routeAction("requestPasswordRecovery", { username, email });
    if (!result || result.status !== "success") throw new Error("No se pudo procesar la solicitud de recuperación.");
    return result;
}

export async function completePasswordRecovery(username, email, code, newPassword) {
    const result = await routeAction("completePasswordRecovery", { username, email, code, newPassword });
    if (!result || result.status !== "success") throw new Error(result && result.message || "No se pudo actualizar la contraseña.");
    return result;
}
