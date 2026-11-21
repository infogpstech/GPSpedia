// GPSpedia Offline & Persistence Module | Version: 2.1.6
// Responsibilities:
// - Manage IndexedDB for local storage of catalog, history, and thumbnails.
// - Implement image compression and local caching.
// - Provide a clean API for offline data access.

import { thumbnailCompressionQueue } from './thumbnailCompressionQueue.js';
import { getAdminImageUploadPendingKey, getLegacyAdminImageUploadPendingKey, getQuarantinedAdminImageUploadPendingKey, createAdminImageUploadPendingSnapshot, isAdminImageUploadPendingOwnedBy } from './adminImageUploadIsolation.js';

const DB_NAME = 'GPSpedia_DB';
const DB_VERSION = 5; // Añade índice por cuenta para recuperar vistos recientes sin escanear toda la base.

let dbPromise = null;
let dbRetryAfter = 0;
let dbRetryError = null;
const DB_OPEN_RETRY_DELAY_MS = 15000;
const DB_OPEN_TIMEOUT_MS = 10000;

function waitForDatabaseOpen_(openingPromise, options = {}) {
    const requestedTimeout = Number(options && options.timeoutMs);
    const timeoutMs = Number.isFinite(requestedTimeout) && requestedTimeout > 0
        ? Math.min(30000, Math.max(100, Math.round(requestedTimeout))) : DB_OPEN_TIMEOUT_MS;
    let timeoutId = null;
    const timeoutPromise = new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => {
            const error = new Error('La apertura de IndexedDB sigue pendiente después de ' + timeoutMs + ' ms; se conserva la solicitud activa y no se abre otra en paralelo.');
            error.code = 'IDB_UNAVAILABLE';
            error.name = 'IndexedDBPendingError';
            reject(error);
        }, timeoutMs);
    });
    // "blocked" no es un fallo definitivo: la solicitud sigue activa y puede
    // resolverse cuando otra pestaña cierre la conexión que impide la migración.
    return Promise.race([openingPromise, timeoutPromise])
        .finally(() => { if (timeoutId !== null) clearTimeout(timeoutId); });
}

/** Mantiene una sola apertura pendiente incluso si el consumidor agota su espera. */
export async function initDB(options = {}) {
    const silent = options && options.silent === true;
    if (dbPromise) return waitForDatabaseOpen_(dbPromise, options);
    if (Date.now() < dbRetryAfter) return Promise.reject(dbRetryError || new Error('IndexedDB no está disponible temporalmente.'));

    let openingPromise;
    openingPromise = new Promise((resolve, reject) => {
        const fail = error => {
            const failure = new Error(error && error.message ? error.message : 'IndexedDB no pudo inicializarse.');
            failure.code = 'IDB_UNAVAILABLE';
            if (error && error.name) failure.name = error.name;
            if (dbPromise === openingPromise) dbPromise = null;
            dbRetryError = failure;
            dbRetryAfter = Date.now() + DB_OPEN_RETRY_DELAY_MS;
            if (!silent) console.warn('IndexedDB no está disponible temporalmente; se reintentará más adelante:', failure.message);
            reject(failure);
        };
        try {
            if (typeof indexedDB === 'undefined') throw new Error('IndexedDB no está disponible.');
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = event => fail(event && event.target && event.target.error || request.error || new Error('IndexedDB open failed.'));
            let wasBlocked = false;
            request.onblocked = () => {
                if (wasBlocked) return;
                wasBlocked = true;
                if (!silent) console.warn('IndexedDB espera que otra pestaña cierre su conexión; se mantiene la misma solicitud de apertura.');
            };
            request.onupgradeneeded = event => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('catalog')) db.createObjectStore('catalog');
                if (!db.objectStoreNames.contains('searchHistory')) db.createObjectStore('searchHistory', { keyPath: 'term' });
                const viewedStore = db.objectStoreNames.contains('viewedItems')
                    ? (request.transaction && typeof request.transaction.objectStore === 'function'
                        ? request.transaction.objectStore('viewedItems') : null)
                    : db.createObjectStore('viewedItems', { keyPath: 'id' });
                if (viewedStore && viewedStore.indexNames && typeof viewedStore.createIndex === 'function' &&
                    !viewedStore.indexNames.contains('ownerId')) {
                    viewedStore.createIndex('ownerId', 'ownerId', { unique: false });
                }
                if (!db.objectStoreNames.contains('thumbnails')) db.createObjectStore('thumbnails');
                if (!db.objectStoreNames.contains('validationCache')) db.createObjectStore('validationCache', { keyPath: 'vehicleId' });
                if (!db.objectStoreNames.contains('adminLocalState')) db.createObjectStore('adminLocalState', { keyPath: 'key' });
            };
            request.onsuccess = event => {
                const database = event.target.result;
                const readyPromise = Promise.resolve(database);
                database.onversionchange = () => {
                    database.close();
                    if (dbPromise === readyPromise) dbPromise = null;
                };
                dbRetryAfter = 0;
                dbRetryError = null;
                dbPromise = readyPromise;
                resolve(database);
            };
        } catch (error) { fail(error); }
    });
    dbPromise = openingPromise;
    openingPromise.catch(() => { if (dbPromise === openingPromise) dbPromise = null; });
    return waitForDatabaseOpen_(openingPromise, options);
}
/**
 * Ejecuta una operación y solo confirma el resultado después de que finalice
 * la transacción completa. request.onsuccess no garantiza que el commit ocurra.
 */
async function performOp(storeName, mode, callback, options = {}) {
    try {
        const database = await initDB({ silent: options && options.silent === true, timeoutMs: options && options.timeoutMs });
        if (!database) throw new Error('Could not initialize IndexedDB');

        return await new Promise((resolve, reject) => {
            let transaction;
            let requestResult;
            let requestSucceeded = false;
            let settled = false;

            const fail = (error) => {
                if (settled) return;
                settled = true;
                reject(error instanceof Error ? error : new Error('IndexedDB transaction failed.'));
            };

            try {
                transaction = database.transaction([storeName], mode);
                const store = transaction.objectStore(storeName);

                transaction.oncomplete = () => {
                    if (settled) return;
                    if (!requestSucceeded) {
                        fail(new Error('La transacción terminó sin confirmar la solicitud.'));
                        return;
                    }
                    settled = true;
                    resolve(requestResult);
                };
                transaction.onerror = () => fail(transaction.error || new Error('IndexedDB transaction failed.'));
                transaction.onabort = () => fail(transaction.error || new Error('IndexedDB transaction aborted'));

                const request = callback(store);
                if (!request || typeof request !== 'object') {
                    throw new Error('La operación IndexedDB no devolvió una solicitud válida.');
                }
                request.onsuccess = () => {
                    requestResult = request.result;
                    requestSucceeded = true;
                };
                request.onerror = () => fail(request.error || new Error('IndexedDB request failed.'));
            } catch (error) {
                try {
                    if (transaction) transaction.abort();
                } catch (abortError) {}
                fail(error);
            }
        });
    } catch (err) {
        if (!(options && options.silent)) console.error(`Database operation failed on ${storeName}:`, err);
        return null;
    }
}


const REBUILDABLE_CLIENT_CACHE_STORES = Object.freeze([
    'catalog', 'searchHistory', 'viewedItems', 'thumbnails', 'validationCache'
]);

/**
 * Vacía únicamente datos reconstruibles del cliente. Conserva adminLocalState,
 * donde pueden existir auditorías y operaciones administrativas recuperables.
 */
export async function clearRebuildableClientCache(ownerId = null) {
    let database;
    try {
        database = await initDB();
        if (!database) throw new Error('No se pudo abrir GPSpedia_DB.');
    } catch (error) {
        return { status: 'error', stores: [], message: error && error.message ? error.message : 'No se pudo abrir GPSpedia_DB.' };
    }
    const stores = REBUILDABLE_CLIENT_CACHE_STORES.filter(name =>
        database.objectStoreNames && typeof database.objectStoreNames.contains === 'function' &&
        database.objectStoreNames.contains(name)
    );
    if (!stores.length) return { status: 'success', stores: [], viewedItemsCleared: false };
    return new Promise(resolve => {
        let transaction;
        let settled = false;
        const finish = result => { if (settled) return; settled = true; resolve(result); };
        try {
            transaction = database.transaction(stores, 'readwrite');
            transaction.oncomplete = () => finish({ status: 'success', stores, viewedItemsCleared: stores.includes('viewedItems') });
            transaction.onerror = () => finish({ status: 'error', stores: [], message: transaction.error && transaction.error.message ? transaction.error.message : 'Falló la transacción de limpieza IndexedDB.' });
            transaction.onabort = () => finish({ status: 'error', stores: [], message: transaction.error && transaction.error.message ? transaction.error.message : 'La transacción de limpieza IndexedDB fue cancelada.' });
            stores.forEach(name => transaction.objectStore(name).clear());
        } catch (error) {
            try { if (transaction) transaction.abort(); } catch (abortError) {}
            finish({ status: 'error', stores: [], message: error && error.message ? error.message : 'No se pudieron limpiar los almacenes IndexedDB.' });
        }
    });
}

// --- ADMINISTRATIVE LOCAL STATE ---

const ADMIN_LOCAL_STATE_STORE = 'adminLocalState';
const DRIVE_AUDIT_STATE_LEGACY_KEY = 'driveAudit:last';
const DRIVE_AUDIT_STATE_KEY_PREFIX = 'driveAudit:user:';
const DRIVE_AUDIT_META_KEY_PREFIX = 'driveAudit:meta:';
const DRIVE_AUDIT_PAGE_KEY_PREFIX = 'driveAudit:page:';
const DRIVE_AUDIT_CONFIRMED_KEY_PREFIX = 'driveAudit:confirmed:';
const DRIVE_AUDIT_LATEST_KEY_PREFIX = 'driveAudit:latest:';
const DRIVE_AUDIT_PAGE_SIZE = 100;
const REPLACED_IMAGES_VIEW_KEY = 'replacedImages:view';

async function performAdminStateOp(mode, callback) {
    try {
        const database = await initDB();
        if (!database) throw new Error("Could not initialize IndexedDB");

        return await new Promise((resolve, reject) => {
            const transaction = database.transaction([ADMIN_LOCAL_STATE_STORE], mode);
            const store = transaction.objectStore(ADMIN_LOCAL_STATE_STORE);
            let requestResult;

            transaction.oncomplete = () => resolve(requestResult);
            transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed"));
            transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted"));

            const request = callback(store);
            request.onsuccess = () => { requestResult = request.result; };
            request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
        });
    } catch (error) {
        console.error("Administrative IndexedDB operation failed:", error);
        return null;
    }
}

/**
 * La auditoría local de Drive pertenece a una cuenta concreta.
 * Nunca se recupera el registro legado global porque no contiene ownerId.
 */
function getDriveAuditStateKey(userId) {
    const ownerId = String(userId === null || userId === undefined ? '' : userId).trim();
    return ownerId ? DRIVE_AUDIT_STATE_KEY_PREFIX + encodeURIComponent(ownerId) : '';
}
function getDriveAuditMetaKey(userId, auditId) {
    const ownerId = String(userId || '').trim(), id = String(auditId || '').trim();
    return ownerId && id ? DRIVE_AUDIT_META_KEY_PREFIX + encodeURIComponent(ownerId) + ':' + encodeURIComponent(id) : '';
}
function getDriveAuditPageKey(userId, auditId, pageIndex) {
    const ownerId = String(userId || '').trim(), id = String(auditId || '').trim();
    return ownerId && id && Number.isInteger(pageIndex) && pageIndex >= 0
        ? DRIVE_AUDIT_PAGE_KEY_PREFIX + encodeURIComponent(ownerId) + ':' + encodeURIComponent(id) + ':' + pageIndex
        : '';
}
function getDriveAuditConfirmedKey(userId, auditId) {
    const ownerId = String(userId || '').trim(), id = String(auditId || '').trim();
    return ownerId && id ? DRIVE_AUDIT_CONFIRMED_KEY_PREFIX + encodeURIComponent(ownerId) + ':' + encodeURIComponent(id) : '';
}
function getDriveAuditLatestKey(userId) {
    const ownerId = String(userId || '').trim();
    return ownerId ? DRIVE_AUDIT_LATEST_KEY_PREFIX + encodeURIComponent(ownerId) : '';
}
function getDriveAuditMetaPrefix(userId) {
    const ownerId = String(userId || '').trim();
    return ownerId ? DRIVE_AUDIT_META_KEY_PREFIX + encodeURIComponent(ownerId) + ':' : '';
}
function getDriveAuditPagePrefix(userId) {
    const ownerId = String(userId || '').trim();
    return ownerId ? DRIVE_AUDIT_PAGE_KEY_PREFIX + encodeURIComponent(ownerId) + ':' : '';
}
function getDriveAuditConfirmedPrefix(userId) {
    const ownerId = String(userId || '').trim();
    return ownerId ? DRIVE_AUDIT_CONFIRMED_KEY_PREFIX + encodeURIComponent(ownerId) + ':' : '';
}
function getDriveAuditClearPendingKey(userId) {
    const ownerId = String(userId === null || userId === undefined ? '' : userId).trim();
    return ownerId ? 'driveAudit:pending-clear:' + encodeURIComponent(ownerId) : '';
}
function getDriveAuditClearGenerationKey(userId) {
    const ownerId = String(userId === null || userId === undefined ? '' : userId).trim();
    return ownerId ? 'driveAudit:clear-generation:' + encodeURIComponent(ownerId) : '';
}
function getDriveAuditClearGeneration(userId) {
    const generationKey = getDriveAuditClearGenerationKey(userId);
    if (!generationKey) return null;
    try {
        const raw = localStorage.getItem(generationKey);
        if (raw === null) return 0;
        const value = Number(raw);
        return Number.isSafeInteger(value) && value >= 0 ? value : null;
    } catch (error) {
        return null;
    }
}
export function hasPendingDriveAuditClear(userId) {
    const pendingKey = getDriveAuditClearPendingKey(userId);
    if (!pendingKey) return true;
    try {
        return !!localStorage.getItem(pendingKey);
    } catch (error) {
        return true;
    }
}
async function performAdminAuditTransaction(callback) {
    const database = await initDB();
    if (!database) throw new Error('IndexedDB no pudo inicializarse.');
    return await new Promise((resolve, reject) => {
        let transaction, result, failure = null, settled = false;
        const rejectOnce = error => {
            if (settled) return;
            settled = true;
            reject(error instanceof Error ? error : new Error('La transacción de auditoría local falló.'));
        };
        try {
            transaction = database.transaction([ADMIN_LOCAL_STATE_STORE], 'readwrite');
            transaction.oncomplete = () => {
                if (failure) rejectOnce(failure);
                else if (!settled) { settled = true; resolve(result); }
            };
            transaction.onerror = () => {
                if (!failure) failure = transaction.error || new Error('La transacción de auditoría local falló.');
            };
            transaction.onabort = () => rejectOnce(failure || transaction.error || new Error('La transacción de auditoría local fue cancelada.'));
            const control = {
                setResult(value) { result = value; },
                abort(error) {
                    failure = error instanceof Error ? error : new Error(String(error || 'La transacción fue cancelada.'));
                    try { transaction.abort(); } catch (abortError) { rejectOnce(failure); }
                }
            };
            callback(transaction.objectStore(ADMIN_LOCAL_STATE_STORE), control);
        } catch (error) {
            failure = error;
            try { if (transaction) transaction.abort(); else rejectOnce(error); }
            catch (abortError) { rejectOnce(error); }
        }
    });
}
function normalizeDriveAuditLocalFiles(files) {
    if (!Array.isArray(files)) throw new Error('La página de auditoría local no contiene una lista de archivos.');
    const unique = new Map();
    files.forEach(file => {
        if (!file || typeof file !== 'object') throw new Error('La página de auditoría local contiene un resultado inválido.');
        const fileId = String(file.fileId || '').trim();
        if (!/^[a-zA-Z0-9_-]{20,}$/.test(fileId)) throw new Error('La página de auditoría local contiene un ID de Drive inválido.');
        if (!unique.has(fileId)) unique.set(fileId, file);
    });
    return Array.from(unique.values());
}
function normalizeDriveAuditLocalIds(ids) {
    if (!Array.isArray(ids)) return [];
    return Array.from(new Set(ids.map(id => String(id || '').trim()).filter(id => /^[a-zA-Z0-9_-]{20,}$/.test(id)))).sort();
}
function getDriveAuditLocalPageSignature(files) {
    return JSON.stringify(files);
}
function buildDriveAuditMetaEntry(state, ownerId, auditId, key, pageCount, revision) {
    return {
        key, ownerId, auditId,
        createdAt: Math.max(0, Number(state.createdAt) || Date.now()),
        serverAuditId: String(state.serverAuditId || (state.cursor && state.cursor.referenceCacheId) || state.inventoryAuditId || ''),
        revision, pageCount,
        cursor: state.cursor || null,
        complete: state.complete === true,
        status: String(state.status || 'partial'),
        totalDiscovered: Math.max(0, Number(state.totalDiscovered) || 0),
        totalAnalyzed: Math.max(0, Number(state.totalAnalyzed) || 0),
        foldersVisited: Math.max(1, Number(state.foldersVisited) || 1),
        pendingFolderCount: Math.max(0, Number(state.pendingFolderCount) || 0),
        errorCount: Math.max(0, Number(state.errorCount) || 0),
        duplicateFileCount: Math.max(0, Number(state.duplicateFileCount) || 0),
        duplicateFolderCount: Math.max(0, Number(state.duplicateFolderCount) || 0),
        uiDuplicateFileCount: Math.max(0, Number(state.uiDuplicateFileCount) || 0),
        lastScanAt: Math.max(0, Number(state.lastScanAt) || 0),
        serviceVersion: String(state.serviceVersion || ''),
        batches: Math.max(0, Number(state.batches) || 0),
        lastBatchAnalyzed: Math.max(0, Number(state.lastBatchAnalyzed) || 0),
        unverifiableReferences: Math.max(0, Number(state.unverifiableReferences) || 0),
        rootFolderName: String(state.rootFolderName || ''),
        rootFolderId: String(state.rootFolderId || ''),
        resumeUnavailable: state.resumeUnavailable === true,
        inventoryStatus: String(state.inventoryStatus || ''),
        inventoryMessage: String(state.inventoryMessage || ''),
        inventoryAuditId: String(state.inventoryAuditId || ''),
        inventoryOperationId: String(state.inventoryOperationId || ''),
        lastError: String(state.lastError || ''),
        updatedAt: Date.now()
    };
}
async function migrateLegacyDriveAuditState_(ownerId, legacy) {
    if (!legacy || legacy.ownerId !== ownerId || !Array.isArray(legacy.files)) return false;
    const auditId = String(legacy.auditId || (legacy.cursor && legacy.cursor.referenceCacheId) ||
        legacy.inventoryAuditId || ('legacy-' + String(legacy.updatedAt || Date.now()) + '-' + Math.random().toString(36).slice(2, 10)));
    const legacyKey = getDriveAuditStateKey(ownerId), latestKey = getDriveAuditLatestKey(ownerId);
    const metaKey = getDriveAuditMetaKey(ownerId, auditId), confirmedKey = getDriveAuditConfirmedKey(ownerId, auditId);
    const files = normalizeDriveAuditLocalFiles(legacy.files), pages = [];
    const legacyDuplicateCount = Math.max(0, legacy.files.length - files.length);
    for (let index = 0; index < files.length; index += DRIVE_AUDIT_PAGE_SIZE) pages.push(files.slice(index, index + DRIVE_AUDIT_PAGE_SIZE));
    const meta = Object.assign({}, legacy, { key: metaKey, ownerId, auditId,
        createdAt: Math.max(0, Number(legacy.createdAt) || Number(legacy.lastScanAt) || Number(legacy.updatedAt) || Date.now()),
        serverAuditId: String((legacy.cursor && legacy.cursor.referenceCacheId) || legacy.inventoryAuditId || ''),
        revision: 1, pageCount: pages.length, updatedAt: Date.now() });
    meta.uiDuplicateFileCount = Math.max(0, Number(meta.uiDuplicateFileCount) || 0) + legacyDuplicateCount;
    delete meta.files;
    delete meta.inventoryConfirmedFileIds;
    const confirmedIds = normalizeDriveAuditLocalIds(legacy.inventoryConfirmedFileIds);
    const result = await performAdminAuditTransaction((store, control) => {
        const latestRequest = store.get(latestKey);
        latestRequest.onsuccess = () => {
            if (latestRequest.result) { control.setResult({ status: 'exists' }); return; }
            const legacyRequest = store.get(legacyKey);
            legacyRequest.onsuccess = () => {
                const current = legacyRequest.result;
                if (!current || current.ownerId !== ownerId || !Array.isArray(current.files) ||
                    Number(current.updatedAt) !== Number(legacy.updatedAt) ||
                    JSON.stringify(current.files) !== JSON.stringify(legacy.files)) {
                    control.abort(new Error('El estado legado cambió durante la migración; no se eliminó.'));
                    return;
                }
                pages.forEach((page, pageIndex) => {
                    store.put({ key: getDriveAuditPageKey(ownerId, auditId, pageIndex), ownerId, auditId,
                        pageIndex, files: page, signature: getDriveAuditLocalPageSignature(page), updatedAt: Date.now() });
                });
                store.put(meta);
                store.put({ key: latestKey, ownerId, auditId, createdAt: meta.createdAt, updatedAt: Date.now() });
                if (confirmedIds.length) store.put({ key: confirmedKey, ownerId, auditId, ids: confirmedIds,
                    signature: JSON.stringify(confirmedIds), updatedAt: Date.now() });
                store.delete(legacyKey);
                store.delete(DRIVE_AUDIT_STATE_LEGACY_KEY);
                control.setResult({ status: 'migrated', auditId });
            };
        };
    });
    return !!result && (result.status === 'migrated' || result.status === 'exists');
}
export async function saveDriveAuditState(state, userId) {
    const ownerId = String(userId === null || userId === undefined ? '' : userId).trim();
    const auditId = String(state && (state.auditId || (state.cursor && state.cursor.referenceCacheId) || state.inventoryAuditId) || '').trim();
    if (!ownerId || !auditId || !state || typeof state !== 'object') return null;
    if (hasPendingDriveAuditClear(ownerId)) return null;
    const generation = getDriveAuditClearGeneration(ownerId);
    if (generation === null) return null;
    const batchIndex = state.batchIndex === null || state.batchIndex === undefined ? null : Number(state.batchIndex);
    if (batchIndex !== null && (!Number.isSafeInteger(batchIndex) || batchIndex < 0)) return null;
    const batchFiles = batchIndex === null ? [] : normalizeDriveAuditLocalFiles(state.batchFiles);
    const expectedRevision = Number.isSafeInteger(Number(state.revision)) && state.revision !== undefined ? Number(state.revision) : 0;
    const metaKey = getDriveAuditMetaKey(ownerId, auditId), latestKey = getDriveAuditLatestKey(ownerId);
    const legacyKey = getDriveAuditStateKey(ownerId), confirmedKey = getDriveAuditConfirmedKey(ownerId, auditId);
    const confirmedIds = normalizeDriveAuditLocalIds(state.inventoryConfirmedFileIds);
    const result = await performAdminAuditTransaction((store, control) => {
        const metaRequest = store.get(metaKey);
        metaRequest.onsuccess = () => {
            const current = metaRequest.result;
            if (current && (current.ownerId !== ownerId || current.auditId !== auditId)) {
                control.abort(new Error('La auditoría local no coincide con su propietario o identificador.'));
                return;
            }
            const currentRevision = current ? Number(current.revision) : 0;
            const currentPageCount = current ? Number(current.pageCount) : 0;
            if (!Number.isSafeInteger(currentRevision) || currentRevision < 0 ||
                !Number.isSafeInteger(currentPageCount) || currentPageCount < 0) {
                control.abort(new Error('Los metadatos de la auditoría local están dañados.'));
                return;
            }
            if (currentRevision !== expectedRevision) {
                control.abort(new Error('La auditoría local cambió en otra pestaña. Cierra y vuelve a abrir el modal para recuperar el progreso más reciente.'));
                return;
            }
            const saveMeta = pageCount => {
                const nextMeta = buildDriveAuditMetaEntry(state, ownerId, auditId, metaKey, pageCount, currentRevision + 1);
                store.put(nextMeta);
                if (!current) {
                    const latestRequest = store.get(latestKey);
                    latestRequest.onsuccess = () => {
                        const latest = latestRequest.result;
                        const latestCreatedAt = Number(latest && latest.createdAt) || 0;
                        if (!latest || nextMeta.createdAt > latestCreatedAt ||
                            (nextMeta.createdAt === latestCreatedAt && String(latest.auditId || '') < auditId)) {
                            store.put({ key: latestKey, ownerId, auditId, revision: nextMeta.revision,
                                createdAt: nextMeta.createdAt, updatedAt: Date.now() });
                        }
                    };
                }
                const confirmedRequest = store.get(confirmedKey);
                confirmedRequest.onsuccess = () => {
                    const existingConfirmed = confirmedRequest.result;
                    const confirmedSignature = JSON.stringify(confirmedIds);
                    if (confirmedIds.length) {
                        if (!existingConfirmed || existingConfirmed.signature !== confirmedSignature) {
                            store.put({ key: confirmedKey, ownerId, auditId, ids: confirmedIds,
                                signature: confirmedSignature, updatedAt: Date.now() });
                        }
                    } else if (existingConfirmed) store.delete(confirmedKey);
                    store.delete(legacyKey);
                    store.delete(DRIVE_AUDIT_STATE_LEGACY_KEY);
                    control.setResult({ key: metaKey, auditId, revision: nextMeta.revision, pageCount });
                };
            };
            if (batchIndex === null) { saveMeta(currentPageCount); return; }
            if (batchIndex > currentPageCount) {
                control.abort(new Error('La persistencia local recibió un lote fuera de secuencia.'));
                return;
            }
            const pageKey = getDriveAuditPageKey(ownerId, auditId, batchIndex);
            const pageRequest = store.get(pageKey);
            pageRequest.onsuccess = () => {
                const existing = pageRequest.result;
                const signature = getDriveAuditLocalPageSignature(batchFiles);
                const existingIsValid = !!existing && existing.ownerId === ownerId && existing.auditId === auditId &&
                    existing.pageIndex === batchIndex && Array.isArray(existing.files) &&
                    existing.signature === getDriveAuditLocalPageSignature(existing.files);
                if (batchIndex < currentPageCount) {
                    if (!existingIsValid || existing.signature !== signature) {
                        control.abort(new Error('El lote ya existe con otro contenido o estructura; no se sobrescribió el progreso de otra pestaña.'));
                        return;
                    }
                    saveMeta(currentPageCount);
                    return;
                }
                if (existing && (!existingIsValid || existing.signature !== signature)) {
                    control.abort(new Error('La página local pendiente ya contiene otros resultados o una estructura inválida; no se sobrescribió.'));
                    return;
                }
                if (!existing) store.put({ key: pageKey, ownerId, auditId, pageIndex: batchIndex,
                    files: batchFiles, signature, updatedAt: Date.now() });
                saveMeta(currentPageCount + 1);
            };
        };
    });
    if (!result) return null;
    const latestGeneration = getDriveAuditClearGeneration(ownerId);
    if (latestGeneration === null || latestGeneration !== generation || hasPendingDriveAuditClear(ownerId)) return null;
    return result;
}
export async function getDriveAuditState(userId, requestedAuditId = '') {
    const ownerId = String(userId === null || userId === undefined ? '' : userId).trim();
    if (!ownerId || hasPendingDriveAuditClear(ownerId)) return null;
    const generation = getDriveAuditClearGeneration(ownerId);
    if (generation === null) return null;
    const entries = await performAdminStateOp('readonly', store => store.getAll());
    if (!Array.isArray(entries)) return null;
    const entriesByKey = new Map(entries.filter(entry => entry && typeof entry.key === 'string').map(entry => [entry.key, entry]));
    const latestKey = getDriveAuditLatestKey(ownerId);
    const pointer = entriesByKey.get(latestKey);
    let auditId = String(requestedAuditId || (pointer && pointer.ownerId === ownerId ? pointer.auditId : '') || '').trim();
    if (!auditId) {
        const legacy = entriesByKey.get(getDriveAuditStateKey(ownerId));
        if (!legacy) return null;
        if (!(await migrateLegacyDriveAuditState_(ownerId, legacy))) return null;
        return getDriveAuditState(ownerId);
    }
    const metaKey = getDriveAuditMetaKey(ownerId, auditId);
    const meta = entriesByKey.get(metaKey);
    if (!meta || meta.ownerId !== ownerId || meta.auditId !== auditId ||
        !Number.isSafeInteger(Number(meta.pageCount)) || Number(meta.pageCount) < 0 ||
        !Number.isSafeInteger(Number(meta.revision)) || Number(meta.revision) < 1) return null;
    const files = [], seen = new Set();
    let duplicateCount = 0, missingPage = false;
    for (let pageIndex = 0; pageIndex < Number(meta.pageCount); pageIndex++) {
        const pageKey = getDriveAuditPageKey(ownerId, auditId, pageIndex);
        const page = entriesByKey.get(pageKey);
        if (!page || page.ownerId !== ownerId || page.auditId !== auditId || page.pageIndex !== pageIndex ||
            !Array.isArray(page.files) || page.signature !== getDriveAuditLocalPageSignature(page.files)) {
            missingPage = true;
            continue;
        }
        page.files.forEach(file => {
            const fileId = String(file && file.fileId || '').trim();
            if (!/^[a-zA-Z0-9_-]{20,}$/.test(fileId)) { missingPage = true; return; }
            if (seen.has(fileId)) { duplicateCount++; return; }
            seen.add(fileId); files.push(file);
        });
    }
    const confirmedEntry = entriesByKey.get(getDriveAuditConfirmedKey(ownerId, auditId));
    const state = Object.assign({}, meta, {
        files,
        inventoryConfirmedFileIds: confirmedEntry && confirmedEntry.ownerId === ownerId && confirmedEntry.auditId === auditId &&
            Array.isArray(confirmedEntry.ids) ? normalizeDriveAuditLocalIds(confirmedEntry.ids) : [],
        uiDuplicateFileCount: Math.max(0, Number(meta.uiDuplicateFileCount) || 0) + duplicateCount
    });
    if (missingPage) {
        state.resumeUnavailable = true;
        state.cursor = null;
        state.complete = false;
        state.status = 'partial';
        state.lastError = 'Falta una página local o contiene resultados inválidos; inicia una auditoría nueva para evitar continuar con progreso incompleto.';
    }
    const latestGeneration = getDriveAuditClearGeneration(ownerId);
    if (latestGeneration === null || latestGeneration !== generation || hasPendingDriveAuditClear(ownerId)) return null;
    return state;
}
export async function clearDriveAuditState(userId, recoverPending = false) {
    const ownerId = String(userId === null || userId === undefined ? '' : userId).trim();
    const pendingKey = getDriveAuditClearPendingKey(ownerId);
    if (!ownerId || !pendingKey) return false;
    const generationKey = getDriveAuditClearGenerationKey(ownerId);
    let clearToken = '';
    try {
        const existingPending = localStorage.getItem(pendingKey);
        if (existingPending && recoverPending !== true) return false;
        const currentGeneration = getDriveAuditClearGeneration(ownerId);
        if (!generationKey || currentGeneration === null || currentGeneration >= Number.MAX_SAFE_INTEGER) return false;
        clearToken = Date.now() + '-' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(pendingKey, clearToken);
        localStorage.setItem(generationKey, String(currentGeneration + 1));
    } catch (error) {
        return false;
    }
    let result;
    try {
        result = await performAdminAuditTransaction((store, control) => {
            const allRequest = store.getAll();
            allRequest.onsuccess = () => {
                if (localStorage.getItem(pendingKey) !== clearToken) {
                    control.abort(new Error('Otra pestaña asumió la limpieza del estado de auditoría.'));
                    return;
                }
                allRequest.result.forEach(entry => {
                    const key = String(entry && entry.key || '');
                    if (key === getDriveAuditStateKey(ownerId) || key === getDriveAuditLatestKey(ownerId) ||
                        key === DRIVE_AUDIT_STATE_LEGACY_KEY || key.startsWith(getDriveAuditMetaPrefix(ownerId)) ||
                        key.startsWith(getDriveAuditPagePrefix(ownerId)) || key.startsWith(getDriveAuditConfirmedPrefix(ownerId))) {
                        store.delete(key);
                    }
                });
                control.setResult(true);
            };
        });
    } catch (error) {
        return false;
    }
    if (result !== true) return false;
    try {
        if (localStorage.getItem(pendingKey) !== clearToken) return false;
        localStorage.removeItem(pendingKey);
    } catch (error) {
        return false;
    }
    return true;
}
export async function saveReplacedImagesView(view) {
    if (view !== 'grid' && view !== 'list') return null;
    const entry = { key: REPLACED_IMAGES_VIEW_KEY, value: view, updatedAt: Date.now() };
    const result = await performAdminStateOp('readwrite', store => store.put(entry));
    return result === null ? null : view;
}

export async function getReplacedImagesView() {
    const entry = await performAdminStateOp('readonly', store => store.get(REPLACED_IMAGES_VIEW_KEY));
    return entry && (entry.value === 'grid' || entry.value === 'list') ? entry.value : 'grid';
}


const ADMIN_IMAGE_UPLOAD_FIELDS = new Set(["imagenVehiculo","imgCorte1","imgCorte2","imgCorte3","imgApertura","imgCableAlimen","imgCableAlimen2","imgCableAlimen3"]);
export async function getAdminImageUploadPendingOperation(vehicleId,fieldName,ownerId){
 const owner=String(ownerId??"").trim(),key=getAdminImageUploadPendingKey(owner,vehicleId,fieldName),legacyKey=getLegacyAdminImageUploadPendingKey(vehicleId,fieldName);
 if(!key||!legacyKey)return {available:false,operation:null};
 try{
  const database=await initDB();
  return await new Promise((resolve,reject)=>{
   const tx=database.transaction([ADMIN_LOCAL_STATE_STORE],"readwrite"),store=tx.objectStore(ADMIN_LOCAL_STATE_STORE);
   let ownerEntry,legacyEntry,ownerReady=false,legacyReady=false,result={available:false,operation:null};
   const finish=()=>{
    if(!ownerReady||!legacyReady)return;
    if(legacyEntry&&legacyEntry.operation){
     const legacy=legacyEntry.operation,q=getQuarantinedAdminImageUploadPendingKey(vehicleId,fieldName,legacy.id,"owner-missing");
     if(q){store.put({key:q,operation:legacy,reason:"owner-missing",quarantinedAt:Date.now()});store.delete(legacyKey);}
    }
    if(ownerEntry&&ownerEntry.operation){
     if(isAdminImageUploadPendingOwnedBy(ownerEntry.operation,owner))result={available:true,operation:ownerEntry.operation};
     else{
      const q=getQuarantinedAdminImageUploadPendingKey(vehicleId,fieldName,ownerEntry.operation.id,"owner-mismatch");
      if(q){store.put({key:q,operation:ownerEntry.operation,reason:"owner-mismatch",quarantinedAt:Date.now()});store.delete(key);}
      result={available:true,operation:null};
     }
    }else result={available:true,operation:null};
   };
   tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||new Error("IndexedDB transaction failed"));tx.onabort=()=>reject(tx.error||new Error("IndexedDB transaction aborted"));
   const ownerReq=store.get(key);ownerReq.onsuccess=()=>{ownerEntry=ownerReq.result;ownerReady=true;finish();};ownerReq.onerror=()=>reject(ownerReq.error||new Error("No se pudo consultar el reemplazo del propietario"));
   const legacyReq=store.get(legacyKey);legacyReq.onsuccess=()=>{legacyEntry=legacyReq.result;legacyReady=true;finish();};legacyReq.onerror=()=>reject(legacyReq.error||new Error("No se pudo consultar el reemplazo legado"));
  });
 }catch(error){console.error("No se pudo consultar el reemplazo pendiente:",error&&error.name||"StorageError");return {available:false,operation:null};}
}
export async function saveAdminImageUploadPendingOperation(operation){
 const snapshot=createAdminImageUploadPendingSnapshot(operation);if(!snapshot)return {saved:false,error:true};
 const key=getAdminImageUploadPendingKey(snapshot.ownerId,snapshot.vehicleId,snapshot.fieldName);if(!key)return {saved:false,error:true};
 try{
  const database=await initDB();
  return await new Promise((resolve,reject)=>{
   const tx=database.transaction([ADMIN_LOCAL_STATE_STORE],"readwrite"),store=tx.objectStore(ADMIN_LOCAL_STATE_STORE);let result={saved:false,error:true};
   tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||new Error("IndexedDB transaction failed"));tx.onabort=()=>reject(tx.error||new Error("IndexedDB transaction aborted"));
   const getReq=store.get(key);getReq.onsuccess=()=>{
    const previous=getReq.result&&getReq.result.operation;
    if(previous&&(!isAdminImageUploadPendingOwnedBy(previous,snapshot.ownerId)||String(previous.id||"")!==snapshot.id||
     previous.fileData!==snapshot.fileData||previous.vehicleId!==snapshot.vehicleId||previous.fieldName!==snapshot.fieldName||
     previous.filename!==snapshot.filename||previous.mimeType!==snapshot.mimeType)){result={saved:false,conflict:true};return;}
    const putReq=store.put({key,operation:snapshot,updatedAt:Date.now()});putReq.onsuccess=()=>{result={saved:true,key};};putReq.onerror=()=>reject(putReq.error||new Error("No se pudo guardar el reemplazo pendiente"));
   };getReq.onerror=()=>reject(getReq.error||new Error("No se pudo consultar el reemplazo pendiente"));
  });
 }catch(error){console.error("No se pudo persistir el reemplazo de imagen pendiente:",error&&error.name||"StorageError");return {saved:false,error:true};}
}
export async function removeAdminImageUploadPendingOperation(vehicleId,fieldName,opId,ownerId){
 const owner=String(ownerId??"").trim(),key=getAdminImageUploadPendingKey(owner,vehicleId,fieldName),id=String(opId||"").trim();if(!key||!id)return false;
 try{
  const database=await initDB();
  return await new Promise((resolve,reject)=>{
   const tx=database.transaction([ADMIN_LOCAL_STATE_STORE],"readwrite"),store=tx.objectStore(ADMIN_LOCAL_STATE_STORE);let removed=false;
   tx.oncomplete=()=>resolve(removed);tx.onerror=()=>reject(tx.error||new Error("IndexedDB transaction failed"));tx.onabort=()=>reject(tx.error||new Error("IndexedDB transaction aborted"));
   const getReq=store.get(key);getReq.onsuccess=()=>{
    const entry=getReq.result;if(!entry||!entry.operation||!isAdminImageUploadPendingOwnedBy(entry.operation,owner)||String(entry.operation.id||"")!==id)return;
    const del=store.delete(key);del.onsuccess=()=>{removed=true;};del.onerror=()=>reject(del.error||new Error("No se pudo retirar el reemplazo confirmado"));
   };getReq.onerror=()=>reject(getReq.error||new Error("No se pudo verificar el reemplazo antes de retirarlo"));
  });
 }catch(error){console.error("No se pudo retirar el reemplazo de imagen confirmado:",error&&error.name||"StorageError");return null;}
}

 
// --- IDEMPOTENCIA LOCAL DEL MODAL DE AGREGADO DE CORTES ---
const ADD_CUT_PENDING_KEY_PREFIX = 'addCutPending:';
function getAddCutPendingKey(vehicleId,userId){const v=String(vehicleId==null?'':vehicleId).trim(),u=String(userId==null?'':userId).trim();return v&&u?ADD_CUT_PENDING_KEY_PREFIX+encodeURIComponent(u)+':'+encodeURIComponent(v):'';}
function getLegacyAddCutPendingKey(vehicleId){const v=String(vehicleId==null?'':vehicleId).trim();return v?ADD_CUT_PENDING_KEY_PREFIX+v:'';}
function getQuarantinedAddCutPendingKey(vehicleId,operationId){const v=String(vehicleId==null?'':vehicleId).trim();return v?ADD_CUT_PENDING_KEY_PREFIX+'quarantine:'+encodeURIComponent(v)+':'+encodeURIComponent(String(operationId||'legacy')):'';}
async function migrateLegacyAddCutPendingOperation_(vehicleId){
 const legacyKey=getLegacyAddCutPendingKey(vehicleId);if(!legacyKey)return true;
 try{const database=await initDB();if(!database)return false;return await new Promise((resolve,reject)=>{
  const tx=database.transaction([ADMIN_LOCAL_STATE_STORE],'readwrite'),store=tx.objectStore(ADMIN_LOCAL_STATE_STORE);let migrationError=null;
  tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error||migrationError||new Error('IndexedDB transaction failed'));tx.onabort=()=>reject(tx.error||migrationError||new Error('IndexedDB transaction aborted'));
  const legacyReq=store.get(legacyKey);legacyReq.onsuccess=()=>{
   const legacy=legacyReq.result;if(!legacy||!legacy.operation)return;
   const op=legacy.operation,owner=String(op.userId||'').trim(),target=owner?getAddCutPendingKey(vehicleId,owner):getQuarantinedAddCutPendingKey(vehicleId,op.id);if(!target)return;
   const targetReq=store.get(target);targetReq.onsuccess=()=>{
    const existing=targetReq.result;if(!existing){store.put({...legacy,key:target,migratedAt:Date.now()});store.delete(legacyKey);return;}
    const same=String(existing.operation&&existing.operation.id||'')===String(op.id||'')&&String(existing.operation&&existing.operation.userId||'')===owner;
    if(same){store.delete(legacyKey);return;}
    const quarantine=getQuarantinedAddCutPendingKey(vehicleId,op.id);if(!quarantine||quarantine===target)return;
    const q=store.get(quarantine);q.onsuccess=()=>{if(!q.result){store.put({...legacy,key:quarantine,quarantinedAt:Date.now()});store.delete(legacyKey);}};
    q.onerror=()=>{migrationError=q.error||new Error('No se pudo aislar el registro legado');try{tx.abort();}catch(error){}};
   };
   targetReq.onerror=()=>{migrationError=targetReq.error||new Error('No se pudo consultar la clave del propietario');try{tx.abort();}catch(error){}};
  };
  legacyReq.onerror=()=>{migrationError=legacyReq.error||new Error('No se pudo consultar la operación legada');try{tx.abort();}catch(error){}};
 });}catch(error){console.error('No se pudo aislar la operación legada de agregado de corte.');return false;}
}
export async function getAddCutPendingOperation(vehicleId,userId){
 const owner=String(userId||'').trim(),key=getAddCutPendingKey(vehicleId,owner);if(!key)return{available:false,operation:null};
 if(!await migrateLegacyAddCutPendingOperation_(vehicleId))return{available:false,operation:null};
 const entry=await performAdminStateOp('readonly',store=>store.get(key));if(entry===null)return{available:false,operation:null};
 const op=entry&&entry.key===key&&entry.operation?entry.operation:null;if(op&&String(op.userId||'').trim()!==owner)return{available:false,operation:null};
 return{available:true,operation:op};
}
export async function saveAddCutPendingOperation(operation){
 if(!operation||typeof operation!=='object'||!operation.id||operation.vehicleId===null||operation.vehicleId===undefined||!String(operation.userId||'').trim()||!operation.cutData||typeof operation.cutData!=='object')return{saved:false,error:true};
 const vehicle=String(operation.vehicleId).trim(),owner=String(operation.userId).trim(),key=getAddCutPendingKey(vehicle,owner),opId=String(operation.id).trim();
 if(!key||!opId||!await migrateLegacyAddCutPendingOperation_(vehicle))return{saved:false,error:true};
 const saved={...operation,vehicleId:vehicle,userId:owner};delete saved.sessionToken;delete saved.SessionToken;
 try{const database=await initDB();return await new Promise((resolve,reject)=>{
  const tx=database.transaction([ADMIN_LOCAL_STATE_STORE],'readwrite'),store=tx.objectStore(ADMIN_LOCAL_STATE_STORE);let result=null;
  tx.oncomplete=()=>resolve(result||{saved:false,error:true});tx.onerror=()=>reject(tx.error||new Error('IndexedDB transaction failed'));tx.onabort=()=>reject(tx.error||new Error('IndexedDB transaction aborted'));
  const get=store.get(key);get.onsuccess=()=>{const existing=get.result;
   if(existing&&(!existing.operation||String(existing.operation.userId||'').trim()!==owner||String(existing.operation.id||'').trim()!==opId)){result={saved:false,conflict:true,operation:existing.operation||null};return;}
   const put=store.put({key,operation:saved,updatedAt:Date.now()});put.onsuccess=()=>{result={saved:true,key};};put.onerror=()=>reject(put.error||new Error('No se pudo guardar la operación pendiente'));
  };get.onerror=()=>reject(get.error||new Error('No se pudo consultar la operación pendiente'));
 });}catch(error){console.error('No se pudo persistir la operación pendiente de agregado de corte.');return{saved:false,error:true};}
}
export async function removeAddCutPendingOperation(vehicleId,userId,opId){
 const owner=String(userId||'').trim(),key=getAddCutPendingKey(vehicleId,owner),id=String(opId||'').trim();if(!key||!id)return false;
 try{const database=await initDB();return await new Promise((resolve,reject)=>{
  const tx=database.transaction([ADMIN_LOCAL_STATE_STORE],'readwrite'),store=tx.objectStore(ADMIN_LOCAL_STATE_STORE);let removed=false;
  tx.oncomplete=()=>resolve(removed);tx.onerror=()=>reject(tx.error||new Error('IndexedDB transaction failed'));tx.onabort=()=>reject(tx.error||new Error('IndexedDB transaction aborted'));
  const get=store.get(key);get.onsuccess=()=>{const entry=get.result;if(!entry||!entry.operation||String(entry.operation.userId||'').trim()!==owner||String(entry.operation.id||'').trim()!==id)return;
   const del=store.delete(key);del.onsuccess=()=>{removed=true;};del.onerror=()=>reject(del.error||new Error('No se pudo retirar la operación completada'));
  };get.onerror=()=>reject(get.error||new Error('No se pudo verificar la operación antes de eliminarla'));
 });}catch(error){console.error('No se pudo retirar la operación pendiente de agregado de corte.');return null;}
}



// --- OPERACIÓN DURABLE DE ALTA DE CORTES (AUG-055) ---
const ADD_CUT_OPERATION_KEY_PREFIX = 'addCutOperation:';
function getAddCutOperationKey_(ownerId) {
    const owner = String(ownerId || '').trim();
    return owner ? ADD_CUT_OPERATION_KEY_PREFIX + encodeURIComponent(owner) : '';
}
function sanitizeAddCutOperation_(value) {
    if (Array.isArray(value)) return value.map(sanitizeAddCutOperation_);
    if (!value || typeof value !== 'object') return value;
    const clean = {};
    Object.keys(value).forEach(key => {
        if (/token|password|credential|authorization/i.test(key)) return;
        clean[key] = sanitizeAddCutOperation_(value[key]);
    });
    return clean;
}
function isValidAddCutOperationSnapshot_(operation, ownerId) {
    if (!operation || typeof operation !== 'object' || Array.isArray(operation)) return false;
    const owner = String(ownerId || '').trim();
    const id = String(operation.id || '').trim();
    if (!owner || String(operation.ownerId || '').trim() !== owner) return false;
    if (!/^OP-[A-Za-z0-9_-]{1,100}$/.test(id)) return false;
    if (operation.operationType !== 'addOrUpdateCut' || operation.stage !== 2) return false;
    if (!['processing', 'failed', 'completed'].includes(operation.status)) return false;
    if (!/^[a-f0-9]{64}$/i.test(String(operation.operationHash || ''))) return false;
    if (!operation.requestData || typeof operation.requestData !== 'object' || Array.isArray(operation.requestData)) return false;
    if (!operation.requestData.cutData || typeof operation.requestData.cutData !== 'object' || Array.isArray(operation.requestData.cutData)) return false;
    const requestVehicleId = operation.requestData.vehicleId == null || operation.requestData.vehicleId === ''
        ? null : String(operation.requestData.vehicleId).trim();
    const snapshotVehicleId = operation.vehicleId == null || operation.vehicleId === ''
        ? null : String(operation.vehicleId).trim();
    if (requestVehicleId !== snapshotVehicleId) return false;
    if (requestVehicleId === null && (!operation.requestData.vehicleData || typeof operation.requestData.vehicleData !== 'object')) return false;
    if (requestVehicleId !== null && operation.requestData.vehicleData !== null) return false;
    return true;
}
export async function getAddCutOperationPendingOperation(ownerId) {
    const owner = String(ownerId || '').trim(), key = getAddCutOperationKey_(owner);
    if (!key) return { available: false, operation: null };
    try {
        const database = await initDB();
        return await new Promise((resolve, reject) => {
            const transaction = database.transaction([ADMIN_LOCAL_STATE_STORE], 'readonly');
            const request = transaction.objectStore(ADMIN_LOCAL_STATE_STORE).get(key);
            let entry = null, requestError = null;
            request.onsuccess = () => { entry = request.result || null; };
            request.onerror = () => { requestError = request.error || new Error('No se pudo leer la operación durable.'); };
            transaction.oncomplete = () => {
                if (requestError) { resolve({ available: false, operation: null }); return; }
                if (!entry) { resolve({ available: true, operation: null }); return; }
                const operation = entry.operation;
                if (entry.key !== key || !isValidAddCutOperationSnapshot_(operation, owner)) {
                    resolve({ available: false, operation: null, invalid: true });
                    return;
                }
                resolve({ available: true, operation: sanitizeAddCutOperation_(operation) });
            };
            transaction.onerror = () => reject(transaction.error || requestError || new Error('Lectura IndexedDB fallida.'));
            transaction.onabort = () => reject(transaction.error || requestError || new Error('Lectura IndexedDB abortada.'));
        });
    } catch (error) {
        console.error('No se pudo consultar la operación durable de cortes:', error && error.name || 'StorageError');
        return { available: false, operation: null };
    }
}
export async function saveAddCutOperationPendingOperation(operation) {
    if (!operation || typeof operation !== 'object') return { saved: false, error: true };
    const owner = String(operation.ownerId || '').trim(), key = getAddCutOperationKey_(owner);
    const snapshot = sanitizeAddCutOperation_(operation);
    if (!key || !isValidAddCutOperationSnapshot_(snapshot, owner)) return { saved: false, error: true, reason: 'invalid-snapshot' };
    try {
        const database = await initDB();
        return await new Promise((resolve, reject) => {
            const transaction = database.transaction([ADMIN_LOCAL_STATE_STORE], 'readwrite');
            const store = transaction.objectStore(ADMIN_LOCAL_STATE_STORE);
            let result = null, operationError = null;
            transaction.oncomplete = () => resolve(result || { saved: false, error: true });
            transaction.onerror = () => reject(transaction.error || operationError || new Error('Escritura IndexedDB fallida.'));
            transaction.onabort = () => reject(transaction.error || operationError || new Error('Escritura IndexedDB abortada.'));
            const get = store.get(key);
            get.onsuccess = () => {
                const previous = get.result;
                if (previous && (!isValidAddCutOperationSnapshot_(previous.operation, owner) ||
                    String(previous.operation.id || '').trim() !== snapshot.id ||
                    String(previous.operation.operationHash || '').toLowerCase() !== snapshot.operationHash.toLowerCase() ||
                    (previous.operation.status === 'completed' && snapshot.status !== 'completed'))) {
                    result = { saved: false, conflict: true };
                    return;
                }
                const put = store.put({ key, operation: snapshot, updatedAt: Date.now() });
                put.onerror = () => { operationError = put.error || new Error('No se pudo guardar la operación durable.'); try { transaction.abort(); } catch (_) {} };
                put.onsuccess = () => {
                    const verify = store.get(key);
                    verify.onerror = () => { operationError = verify.error || new Error('No se pudo verificar la operación durable.'); try { transaction.abort(); } catch (_) {} };
                    verify.onsuccess = () => {
                        const saved = verify.result && verify.result.operation;
                        result = saved && isValidAddCutOperationSnapshot_(saved, owner) &&
                            saved.id === snapshot.id && saved.operationHash === snapshot.operationHash &&
                            JSON.stringify(saved) === JSON.stringify(snapshot)
                            ? { saved: true, key, operation: saved }
                            : { saved: false, verificationFailed: true };
                    };
                };
            };
            get.onerror = () => { operationError = get.error || new Error('No se pudo comprobar la operación existente.'); try { transaction.abort(); } catch (_) {} };
        });
    } catch (error) {
        console.error('No se pudo persistir la operación durable de cortes:', error && error.name || 'StorageError');
        return { saved: false, error: true };
    }
}
export async function removeAddCutOperationPendingOperation(ownerId, operationId, operationHash) {
    const owner = String(ownerId || '').trim(), key = getAddCutOperationKey_(owner);
    const id = String(operationId || '').trim(), hash = String(operationHash || '').toLowerCase();
    if (!key || !id || !/^[a-f0-9]{64}$/.test(hash)) return { removed: false, error: true };
    try {
        const database = await initDB();
        return await new Promise((resolve, reject) => {
            const transaction = database.transaction([ADMIN_LOCAL_STATE_STORE], 'readwrite');
            const store = transaction.objectStore(ADMIN_LOCAL_STATE_STORE);
            let result = null, operationError = null;
            transaction.oncomplete = () => resolve(result || { removed: false, error: true });
            transaction.onerror = () => reject(transaction.error || operationError || new Error('Limpieza IndexedDB fallida.'));
            transaction.onabort = () => reject(transaction.error || operationError || new Error('Limpieza IndexedDB abortada.'));
            const get = store.get(key);
            get.onsuccess = () => {
                const entry = get.result;
                if (!entry) { result = { removed: true, missing: true }; return; }
                const op = entry.operation;
                if (!op || String(op.ownerId || '').trim() !== owner || String(op.id || '').trim() !== id ||
                    String(op.operationHash || '').toLowerCase() !== hash) {
                    result = { removed: false, conflict: true };
                    return;
                }
                const del = store.delete(key);
                del.onerror = () => { operationError = del.error || new Error('No se pudo retirar la operación confirmada.'); try { transaction.abort(); } catch (_) {} };
                del.onsuccess = () => {
                    const verify = store.get(key);
                    verify.onerror = () => { operationError = verify.error || new Error('No se pudo verificar la limpieza.'); try { transaction.abort(); } catch (_) {} };
                    verify.onsuccess = () => { result = verify.result ? { removed: false, verificationFailed: true } : { removed: true }; };
                };
            };
            get.onerror = () => { operationError = get.error || new Error('No se pudo verificar la operación antes de limpiarla.'); try { transaction.abort(); } catch (_) {} };
        });
    } catch (error) {
        console.error('No se pudo retirar la operación durable confirmada:', error && error.name || 'StorageError');
        return { removed: false, error: true };
    }
}

// --- CATALOG PERSISTENCE ---

const CATALOG_SNAPSHOT_COLLECTIONS = ['cortes', 'tutoriales', 'relay', 'logos'];

/**
 * Indexa Cortes por su ID persistente. No genera claves alternativas: un ID
 * ausente o duplicado invalida la instantánea para evitar colisiones silenciosas.
 */
export function indexCatalogItemsById(items) {
    if (!Array.isArray(items)) throw new TypeError('La colección Cortes debe ser un arreglo.');
    const index = new Map();
    items.forEach((item, position) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
            throw new TypeError(`Corte inválido en la posición ${position}.`);
        }
        const rawId = item.id;
        const id = rawId === undefined || rawId === null ? '' : String(rawId).trim();
        if (!id) throw new Error(`Corte sin ID estable en la posición ${position}.`);
        if (index.has(id)) throw new Error(`ID de Corte duplicado: ${id}.`);
        index.set(id, item);
    });
    return index;
}

/** Una respuesta válida de getCatalogData contiene las cuatro colecciones completas. */
export function isCompleteCatalogSnapshot(data) {
    try {
        if (!data || typeof data !== 'object' || Array.isArray(data) ||
            !CATALOG_SNAPSHOT_COLLECTIONS.every(key => Array.isArray(data[key]))) return false;
        if (!CATALOG_SNAPSHOT_COLLECTIONS.every(key =>
            data[key].every(item => item !== null && typeof item === 'object' && !Array.isArray(item)))) return false;
        indexCatalogItemsById(data.cortes);
        return true;
    } catch (error) {
        return false;
    }
}

function stableCatalogValue(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return `array:[${value.map(stableCatalogValue).join(',')}]`;
    if (typeof value === 'object') {
        return `object:{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableCatalogValue(value[key])}`).join(',')}}`;
    }
    if (typeof value === 'number' && !Number.isFinite(value)) return `number:${String(value)}`;
    return `${typeof value}:${JSON.stringify(value)}`;
}

/** Compara contenido completo y orden de una colección, no solo su cardinalidad. */
export function areCatalogCollectionsEqual(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    return stableCatalogValue(left) === stableCatalogValue(right);
}

export function compareCatalogSnapshots(previous, next) {
    if (!isCompleteCatalogSnapshot(previous) || !isCompleteCatalogSnapshot(next)) {
        throw new Error('No se pueden comparar catálogos incompletos o con IDs de Corte inválidos.');
    }
    const previousCuts = indexCatalogItemsById(previous.cortes);
    const nextCuts = indexCatalogItemsById(next.cortes);
    const cortes = { added: [], modified: [], removed: [] };

    for (const [id, newItem] of nextCuts) {
        const oldItem = previousCuts.get(id);
        if (!oldItem) cortes.added.push({ id, item: newItem });
        else if (!areCatalogCollectionsEqual([oldItem], [newItem])) cortes.modified.push({ id, oldItem, newItem });
    }
    for (const id of previousCuts.keys()) {
        if (!nextCuts.has(id)) cortes.removed.push({ id });
    }

    const collections = {
        tutoriales: !areCatalogCollectionsEqual(previous.tutoriales, next.tutoriales),
        relay: !areCatalogCollectionsEqual(previous.relay, next.relay),
        logos: !areCatalogCollectionsEqual(previous.logos, next.logos)
    };
    const hasChanges = cortes.added.length > 0 || cortes.modified.length > 0 || cortes.removed.length > 0 || Object.values(collections).some(Boolean);
    return { cortes, collections, hasChanges };
}

/**
 * getCatalogData entrega una instantánea completa, no un delta. Cada escritura
 * sustituye el snapshot anterior para que los registros retirados no sobrevivan.
 */
export async function saveCatalog(newData) {
    if (!isCompleteCatalogSnapshot(newData)) {
        throw new Error('No se guardó el catálogo: la respuesta no es una instantánea completa o contiene IDs de Corte inválidos.');
    }
    try {
        const result = await performCatalogSyncTransaction('readwrite', store => {
            store.put(newData, 'current');
            // Un snapshot sin revisión del feed invalida cualquier cursor anterior.
            store.put(null, CATALOG_SYNC_CURSOR_KEY);
            return newData;
        }, { silent: true });
        if (result === null || result === undefined) return { saved: false, storage: 'indexeddb' };
        newData.cortes.slice(-15).forEach(item => cacheItemImages(item).catch(() => {}));
        return result;
    } catch (error) {
        console.warn('Error guardando la instantánea completa del catálogo:', error);
        throw error;
    }
}

export async function getCatalog() {
    return performOp('catalog', 'readonly', (store) => store.get('current'), { silent: true });
}

const CATALOG_FALLBACK_CACHE_NAME = 'gpsepedia-catalog-fallback-v1';
const CATALOG_FALLBACK_CACHE_PATH = '/__gpsepedia_local__/catalog-snapshot.json';
function getCatalogFallbackCacheUrl_() {
    const origin = typeof location !== 'undefined' && location.origin ? location.origin : '';
    return origin ? origin + CATALOG_FALLBACK_CACHE_PATH : CATALOG_FALLBACK_CACHE_PATH;
}

/**
 * Copia independiente del snapshot público del catálogo. Permite arrancar
 * desde CacheStorage si IndexedDB está bloqueado/no disponible en el navegador.
 * No contiene sesión, historial, datos administrativos ni tokens.
 */
export async function getCatalogFallbackCache() {
    if (typeof caches === 'undefined' || typeof Response === 'undefined') return null;
    try {
        const cache = await caches.open(CATALOG_FALLBACK_CACHE_NAME);
        const response = await cache.match(getCatalogFallbackCacheUrl_());
        if (!response) return null;
        const stored = await response.json();
        if (!stored || !isCompleteCatalogSnapshot(stored.snapshot)) return null;
        return {
            snapshot: stored.snapshot,
            cursor: Number.isSafeInteger(stored.cursor) && stored.cursor >= 0 ? stored.cursor : null,
            savedAt: Number.isFinite(stored.savedAt) ? stored.savedAt : 0
        };
    } catch (error) {
        return null;
    }
}

/** Guarda solo la instantánea pública completa; el fallo de esta caché es opcional. */
export async function saveCatalogFallbackCache(snapshot, cursor = null) {
    if (typeof caches === 'undefined' || typeof Response === 'undefined') return false;
    if (!isCompleteCatalogSnapshot(snapshot)) return false;
    try {
        const cache = await caches.open(CATALOG_FALLBACK_CACHE_NAME);
        await cache.put(getCatalogFallbackCacheUrl_(), new Response(JSON.stringify({
            snapshot,
            cursor: Number.isSafeInteger(cursor) && cursor >= 0 ? cursor : null,
            savedAt: Date.now()
        }), { headers: { 'Content-Type': 'application/json' } }));
        return true;
    } catch (error) {
        return false;
    }
}


const CATALOG_SYNC_CURSOR_KEY = 'syncCursor';

function performCatalogSyncTransaction(mode, callback, options = {}) {
    const silent = options && options.silent === true;
    return initDB({ silent }).catch(error => {
        if (silent && error && error.code === 'IDB_UNAVAILABLE') return null;
        throw error;
    }).then(database => {
        if (!database) return null;
        return new Promise((resolve, reject) => {
        let transaction;
        let result;
        let failure = null;
        try {
            transaction = database.transaction(['catalog'], mode);
            const store = transaction.objectStore('catalog');
            transaction.oncomplete = () => resolve(result);
            transaction.onerror = () => reject(transaction.error || failure || new Error('La transacción del catálogo falló.'));
            transaction.onabort = () => reject(transaction.error || failure || new Error('La transacción del catálogo fue cancelada.'));
            result = callback(store, transaction);
        } catch (error) {
            failure = error;
            try { if (transaction) transaction.abort(); } catch (abortError) {}
            reject(error);
        }
        });
    });
}

/** Lee snapshot y cursor desde la misma transacción para evitar pares incoherentes. */
export async function getCatalogSyncState() {
    const state = await performCatalogSyncTransaction('readonly', (store, transaction) => {
        let snapshot, cursor, completed = 0;
        const result = { snapshot: null, cursor: null };
        const finish = () => {
            completed++;
            if (completed === 2) {
                result.snapshot = snapshot === undefined ? null : snapshot;
                result.cursor = Number.isSafeInteger(cursor) && cursor >= 0 ? cursor : null;
            }
        };
        const snapshotRequest = store.get('current');
        const cursorRequest = store.get(CATALOG_SYNC_CURSOR_KEY);
        snapshotRequest.onsuccess = () => { snapshot = snapshotRequest.result; finish(); };
        cursorRequest.onsuccess = () => { cursor = cursorRequest.result; finish(); };
        snapshotRequest.onerror = () => {
            failure = snapshotRequest.error || new Error('No se pudo leer el snapshot local.');
            try { transaction.abort(); } catch (abortError) {}
        };
        cursorRequest.onerror = () => {
            failure = cursorRequest.error || new Error('No se pudo leer el cursor local.');
            try { transaction.abort(); } catch (abortError) {}
        };
        return result;
    }, { silent: true });
    return state || { snapshot: null, cursor: null };
}

/** Persiste snapshot y cursor en una única transacción; el cursor nunca adelanta al snapshot. */
export async function saveCatalogWithCursor(newData, cursor) {
    if (!isCompleteCatalogSnapshot(newData)) {
        throw new Error('No se guardó el catálogo: la respuesta no es una instantánea completa.');
    }
    if (!Number.isSafeInteger(cursor) || cursor < 0) throw new TypeError('El cursor del catálogo no es válido.');
    const result = await performCatalogSyncTransaction('readwrite', store => {
        store.put(newData, 'current');
        store.put(cursor, CATALOG_SYNC_CURSOR_KEY);
        return { saved: true, cursor };
    }, { silent: true });
    if (!result) return { saved: false, storage: 'indexeddb', cursor };
    newData.cortes.slice(-15).forEach(item => cacheItemImages(item).catch(() => {}));
    return result;
}

/** Actualiza solo el cursor cuando una página vacía confirma que no hay cambios. */
export async function saveCatalogCursor(cursor) {
    if (!Number.isSafeInteger(cursor) || cursor < 0) throw new TypeError('El cursor del catálogo no es válido.');
    const result = await performCatalogSyncTransaction('readwrite', store => {
        store.put(cursor, CATALOG_SYNC_CURSOR_KEY);
        return { saved: true, cursor };
    }, { silent: true });
    return result || { saved: false, storage: 'indexeddb', cursor };
}

/**
 * Indexa una colección catalogal solo cuando todos sus registros tienen un ID
 * persistente único. No inventa claves para filas heredadas: en esos casos el
 * consumidor solicita el reset seguro y conserva el snapshot anterior.
 */
function indexCatalogCollectionById_(items, collection) {
    if (!Array.isArray(items)) throw new TypeError('La colección ' + collection + ' debe ser un arreglo.');
    const idField = collection === 'cortes' || collection === 'logos' ? 'id' : 'ID';
    const indexed = new Map();
    items.forEach((item, position) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
            throw new TypeError('Registro inválido en ' + collection + ', posición ' + position + '.');
        }
        const id = String(item[idField] === null || item[idField] === undefined ? '' : item[idField]).trim();
        if (!id) throw new Error('Registro sin ID estable en ' + collection + ', posición ' + position + '.');
        if (indexed.has(id)) throw new Error('ID duplicado en ' + collection + ': ' + id + '.');
        indexed.set(id, item);
    });
    return indexed;
}

/**
 * Aplica deltas por ID estable a las colecciones que forman getCatalogData.
 * Las colecciones heredadas sin IDs completos, los resets y los tipos ajenos
 * al snapshot requieren reconciliación completa; nunca se adivinan claves.
 */
export function applyCatalogChangesToSnapshot(previous, changes) {
    if (!isCompleteCatalogSnapshot(previous) || !Array.isArray(changes)) {
        throw new Error('No se puede aplicar un delta sobre una instantánea inválida.');
    }
    const supported = ['cortes', 'tutoriales', 'relay', 'logos'];
    const indexes = new Map();
    for (const change of changes) {
        if (!change || !Number.isSafeInteger(change.revision) || change.revision < 1) {
            throw new Error('El feed contiene una revisión inválida.');
        }
        if (change.operation === 'reset' || change.resetRequired === true) return { resetRequired: true, snapshot: null };
        const collection = String(change.collection || '');
        // PyS tiene caché propia; el consumidor principal avanza su cursor sin reconstruir el catálogo.
        if (collection === 'pys') continue;
        if (!supported.includes(collection)) return { resetRequired: true, snapshot: null };
        if (!indexes.has(collection)) {
            try {
                indexes.set(collection, indexCatalogCollectionById_(previous[collection], collection));
            } catch (error) {
                return { resetRequired: true, snapshot: null };
            }
        }
        const index = indexes.get(collection);
        const recordId = String(change.recordId || '').trim();
        if (!recordId) throw new Error('El feed contiene un ID vacío en ' + collection + '.');
        if (change.operation === 'delete') {
            index.delete(recordId);
            continue;
        }
        const idField = collection === 'cortes' || collection === 'logos' ? 'id' : 'ID';
        if (change.operation !== 'upsert' || !change.snapshot || typeof change.snapshot !== 'object' ||
            Array.isArray(change.snapshot) || String(change.snapshot[idField] || '').trim() !== recordId) {
            throw new Error('El feed contiene un upsert inválido en ' + collection + '.');
        }
        index.set(recordId, change.snapshot);
    }
    const snapshot = { ...previous };
    indexes.forEach((index, collection) => { snapshot[collection] = Array.from(index.values()); });
    if (indexes.has("cortes")) {
        const categoryCounts = {};
        snapshot.cortes.forEach(item => {
            if (item && item.categoria) categoryCounts[item.categoria] = (categoryCounts[item.categoria] || 0) + 1;
        });
        snapshot.categoryCounts = categoryCounts;
        snapshot.sortedCategories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]);
    }
    if (!isCompleteCatalogSnapshot(snapshot)) throw new Error('El delta produjo un catálogo inválido.');
    return { resetRequired: false, snapshot };
}

// --- ACCOUNT-SCOPED LOCAL ACTIVITY ---
function normalizeLocalOwnerId(ownerId) {
    const value = String(ownerId === null || ownerId === undefined ? '' : ownerId).trim();
    return value && value !== '0' ? value : '';
}
function buildOwnerScopedKey(ownerId, recordId) { return JSON.stringify([ownerId, String(recordId)]); }
function isPotentialVinSearchTerm(term) {
    const value = String(term === null || term === undefined ? '' : term).trim();
    if (!/^[A-HJ-NPR-Z0-9]{6,18}$/i.test(value)) return false;
    return /\d/.test(value) || value.length >= 12;
}
export async function saveSearch(term, ownerId, metadata = {}) {
    const owner = normalizeLocalOwnerId(ownerId);
    const normalizedTerm = String(term === null || term === undefined ? '' : term).toLowerCase().trim();
    if (!owner || !normalizedTerm || isPotentialVinSearchTerm(normalizedTerm)) return null;
    const entry = { term: buildOwnerScopedKey(owner, normalizedTerm), ownerId: owner, query: normalizedTerm, timestamp: Date.now(), metadata };
    return performOp('searchHistory', 'readwrite', store => store.put(entry), { silent: true });
}
export async function getSearchHistory(ownerId, limit = 10) {
    const owner = normalizeLocalOwnerId(ownerId);
    if (!owner) return [];
    const all = await performOp('searchHistory', 'readonly', store => store.getAll(), { silent: true });
    if (!all) return [];
    const legacyVinTerms = all.filter(entry => entry && !entry.ownerId && isPotentialVinSearchTerm(entry.term)).map(entry => entry.term);
    if (legacyVinTerms.length) await Promise.all(legacyVinTerms.map(term => performOp('searchHistory', 'readwrite', store => store.delete(term), { silent: true })));
    return all.filter(entry => entry && entry.ownerId === owner && typeof entry.query === 'string')
        .sort((a,b) => b.timestamp-a.timestamp).slice(0,limit).map(entry => ({ ...entry, term: entry.query }));
}
// El backend conserva la respuesta colaborativa; este caché solo recuerda qué cuenta respondió.
export async function saveValidationResponse(vehicleId, response, ownerId) {
    const owner = normalizeLocalOwnerId(ownerId);
    const recordId = String(vehicleId === null || vehicleId === undefined ? '' : vehicleId).trim();
    if (!owner || !recordId) return null;
    const entry = { vehicleId: buildOwnerScopedKey(owner, recordId), ownerId: owner, recordId, timestamp: Date.now(), response };
    return performOp('validationCache', 'readwrite', store => store.put(entry), { silent: true, timeoutMs: 2500 });
}
export async function getValidationResponse(vehicleId, ownerId) {
    const owner = normalizeLocalOwnerId(ownerId);
    const recordId = String(vehicleId === null || vehicleId === undefined ? '' : vehicleId).trim();
    if (!owner || !recordId) return null;
    const entry = await performOp('validationCache', 'readonly', store => store.get(buildOwnerScopedKey(owner, recordId)), { silent: true, timeoutMs: 2500 });
    return entry && entry.ownerId === owner && entry.recordId === recordId ? entry : null;
}
async function pruneViewedItems_(ownerId, records) {
    const owner = normalizeLocalOwnerId(ownerId);
    if (!owner || !Array.isArray(records) || records.length <= 20) return true;
    const obsolete = records.slice().sort((a, b) => Number(b && b.timestamp || 0) - Number(a && a.timestamp || 0)).slice(20);
    if (!obsolete.length) return true;
    let database;
    try { database = await initDB({ silent: true }); } catch (error) { return false; }
    return new Promise(resolve => {
        let transaction;
        try {
            transaction = database.transaction(['viewedItems'], 'readwrite');
            const store = transaction.objectStore('viewedItems');
            obsolete.forEach(entry => {
                if (entry && entry.id !== undefined && entry.ownerId === owner) store.delete(entry.id);
            });
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => resolve(false);
            transaction.onabort = () => resolve(false);
        } catch (error) { resolve(false); }
    });
}

export async function saveViewedItem(item, ownerId) {
    const owner = normalizeLocalOwnerId(ownerId);
    if (!owner || !item || item.id === undefined || item.id === null) return null;
    const itemId = String(item.id);
    const entry = { id: buildOwnerScopedKey(owner, itemId), ownerId: owner, itemId, timestamp: Date.now(), data: item };
    const result = await performOp('viewedItems', 'readwrite', store => store.put(entry), { silent: true });
    if (result !== null) {
        const records = await performOp('viewedItems', 'readonly', store =>
            typeof store.index === 'function' ? store.index('ownerId').getAll(owner) : store.getAll(), { silent: true });
        if (Array.isArray(records)) await pruneViewedItems_(owner, records);
    }
    cacheItemImages(item).catch(err => console.warn("Error precargando imágenes de visto recientemente:", err));
    return result;
}
export async function cacheItemImages(item) {
    if (!item) return;
    const fieldsToCache=[item.imagenVehiculo,item.imgCorte1,item.imgCorte2,item.imgCorte3,item.imgApertura,item.imgCableAlimen,item.imgCableAlimen2,item.imgCableAlimen3,item.imagenRelay,item.imagen,item.Imagen];
    for (const field of fieldsToCache) if(field&&typeof field==='string'&&!field.startsWith('blob:')&&!field.includes('placehold.co')) compressAndStoreThumbnail(field,field,300).catch(()=>{});
}
export async function getViewedItemsResult(ownerId, limit = 20) {
    const owner = normalizeLocalOwnerId(ownerId);
    if (!owner) return { available: true, items: [] };
    const all = await performOp('viewedItems', 'readonly', store =>
        typeof store.index === 'function' ? store.index('ownerId').getAll(owner) : store.getAll(), { silent: true });
    if (all === null) return { available: false, items: [] };
    const safeLimit = Number.isFinite(Number(limit)) ? Math.max(0, Math.min(20, Math.floor(Number(limit)))) : 20;
    const valid = all.filter(entry => entry && entry.ownerId === owner && entry.itemId !== undefined &&
        entry.data && typeof entry.data === 'object' && !Array.isArray(entry.data))
        .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
    if (valid.length > 20) pruneViewedItems_(owner, valid).catch(() => {});
    return {
        available: true,
        items: valid.slice(0, safeLimit).map(entry => ({ id: String(entry.itemId), timestamp: Number(entry.timestamp) || 0, data: entry.data }))
    };
}
export async function getViewedItems(ownerId, limit = 20) {
    const result = await getViewedItemsResult(ownerId, limit);
    return result.items;
}

// --- THUMBNAIL CACHE & COMPRESSION ---

function normalizeThumbnailSize(size=400){
 const n=Number(size);if(!Number.isFinite(n)||n<=0)return 400;return Math.max(100,Math.min(1600,Math.round(n)));
}
function buildThumbnailCacheKey(fileId,size){return fileId+"::w"+normalizeThumbnailSize(size);}

/** Clave compartida por IndexedDB y el registro de ObjectURL en memoria. */
export function getThumbnailCacheKey(rawFileId,requestedSize=400){
 const fileId=normalizeId(rawFileId);
 return typeof fileId==="string"&&fileId?buildThumbnailCacheKey(fileId,requestedSize):null;
}

// TTL persistente: 30 días desde la generación de cada variante.
const THUMBNAIL_TTL_MS = 30 * 24 * 60 * 60 * 1000;
function isThumbnailExpired(entry, now = Date.now()) {
 const cachedAt = entry && Number(entry.cachedAt);
 return !Number.isFinite(cachedAt) || cachedAt <= 0 || now - cachedAt >= THUMBNAIL_TTL_MS;
}
// Límite de variantes persistidas; la cuota global de IndexedDB se trata en otra iteración.
const MAX_THUMBNAIL_ENTRIES = 200;

/**
 * Ejecuta una lectura-modificación dentro de una única transacción readwrite.
 * El resultado solo se entrega cuando IndexedDB confirma el commit.
 */
async function runThumbnailStoreTransaction(requestFactory, onSuccess) {
 const database = await initDB();
 return new Promise((resolve, reject) => {
  let transaction, result = null, settled = false;
  const fail = error => {
   if (settled) return;
   settled = true;
   reject(error instanceof Error ? error : new Error("IndexedDB thumbnail transaction failed."));
  };
  try {
   transaction = database.transaction(["thumbnails"], "readwrite");
   const store = transaction.objectStore("thumbnails");
   transaction.oncomplete = () => {
    if (settled) return;
    settled = true;
    resolve(result);
   };
   transaction.onerror = () => fail(transaction.error || new Error("IndexedDB thumbnail transaction failed."));
   transaction.onabort = () => fail(transaction.error || new Error("IndexedDB thumbnail transaction aborted."));
   const request = requestFactory(store);
   request.onsuccess = () => {
    try { result = onSuccess(store, request.result); }
    catch (error) {
     try { transaction.abort(); } catch (abortError) {}
     fail(error);
    }
   };
   request.onerror = () => fail(request.error || new Error("IndexedDB thumbnail request failed."));
  } catch (error) {
   try { if (transaction) transaction.abort(); } catch (abortError) {}
   fail(error);
  }
 });
}

/** Actualiza recencia y valida la identidad completa de la variante solicitada. */
async function readFreshThumbnail(key){
 const match=String(key||"").match(/^(.*)::w(\d+)$/);
 const expected=match?{fileId:match[1],width:Number(match[2])}:null;
 return runThumbnailStoreTransaction(
  store=>store.get(key),
  (store,entry)=>{
   if(!entry)return null;
   const compatible=!!expected&&entry&&typeof entry==="object"&&entry.key===key&&
    entry.fileId===expected.fileId&&Number(entry.width)===expected.width&&
    entry.blob&&typeof entry.blob.size==="number";
   if(isThumbnailExpired(entry)||!compatible){store.delete(key);return null;}
   entry.lastAccessedAt=Date.now();store.put(entry,key);return entry.blob;
  }
 );
}

/** Conserva las variantes más recientes y elimina primero las menos utilizadas. */
async function evictLeastRecentlyUsedThumbnails() {
 return runThumbnailStoreTransaction(
  store => store.getAll(),
  (store, entries) => {
   const cached = [];
   (Array.isArray(entries) ? entries : []).forEach(entry => {
    if (!entry || typeof entry !== "object" || typeof entry.key !== "string") return;
    if (isThumbnailExpired(entry)) {
     store.delete(entry.key);
     return;
    }
    if (entry.blob) cached.push(entry);
   });
   cached.sort((a, b) =>
    (Number(a.lastAccessedAt) || Number(a.cachedAt) || 0) -
    (Number(b.lastAccessedAt) || Number(b.cachedAt) || 0) ||
    (Number(a.cachedAt) || 0) - (Number(b.cachedAt) || 0) ||
    a.key.localeCompare(b.key));
   const excess = cached.length - MAX_THUMBNAIL_ENTRIES;
   for (let index = 0; index < excess; index += 1) store.delete(cached[index].key);
   return Math.max(0, excess);
  }
 );
}

/** Identifica agotamiento de cuota de almacenamiento sin confundir otros abortos. */
function isThumbnailQuotaError(error) {
 return !!error && (error.name === "QuotaExceededError" || error.code === 22 || error.code === 1014);
}

/** Libera el 25 % más antiguo de las miniaturas persistidas para recuperar cuota. */
async function evictOldestThumbnailBatch() {
 return runThumbnailStoreTransaction(
  store => store.getAll(),
  (store, entries) => {
   const cached = (Array.isArray(entries) ? entries : [])
    .filter(entry => entry && typeof entry === "object" &&
     typeof entry.key === "string" && entry.blob)
    .sort((a, b) =>
     (Number(a.lastAccessedAt) || Number(a.cachedAt) || 0) -
     (Number(b.lastAccessedAt) || Number(b.cachedAt) || 0) ||
     (Number(a.cachedAt) || 0) - (Number(b.cachedAt) || 0) ||
     a.key.localeCompare(b.key));
   const count = cached.length ? Math.max(1, Math.ceil(cached.length * 0.25)) : 0;
   for (let index = 0; index < count; index += 1) store.delete(cached[index].key);
   return count;
  }
 );
}

/** Si solo quedan registros heredados, libera una parte de sus claves antiguas. */
async function evictLegacyThumbnailBatch() {
 return runThumbnailStoreTransaction(
  store => store.getAllKeys(),
  (store, keys) => {
   const legacyKeys = Array.isArray(keys) ? keys : [];
   const count = legacyKeys.length ? Math.max(1, Math.ceil(legacyKeys.length * 0.25)) : 0;
   for (let index = 0; index < count; index += 1) store.delete(legacyKeys[index]);
   return count;
  }
 );
}

/**
 * Ante QuotaExceededError, descarta progresivamente miniaturas LRU y reintenta.
 * Solo afecta al almacén de miniaturas; si la cuota sigue agotada, omite la caché.
 */
async function storeThumbnailWithQuotaRecovery(entry, key) {
 const save = () => runThumbnailStoreTransaction(
  store => store.put(entry, key),
  (store, result) => result
 );
 try {
  return await save();
 } catch (error) {
  if (!isThumbnailQuotaError(error)) throw error;
 }
 while (true) {
  let removed = await evictOldestThumbnailBatch();
  if (!removed) removed = await evictLegacyThumbnailBatch();
  if (!removed) return null;
  try {
   return await save();
  } catch (error) {
   if (!isThumbnailQuotaError(error)) throw error;
  }
 }
}

const THUMBNAIL_FAILURE_BACKOFF_MS = 5 * 60 * 1000;
const thumbnailCompressionFailures_ = new Map();
/** Compresión opcional por variante; nunca condiciona la visualización de la imagen original. */
const thumbnailCompressionInFlight_ = new Map();

export async function compressAndStoreThumbnail(url, rawFileId, requestedSize = 400) {
 if (!rawFileId || (typeof rawFileId === "string" && rawFileId.includes("placehold.co"))) return null;
 const fileId = normalizeId(rawFileId);
 if (!fileId) return null;
 const width = normalizeThumbnailSize(requestedSize);
 const cacheKey = buildThumbnailCacheKey(fileId, width);
 const pending = thumbnailCompressionInFlight_.get(cacheKey);
 if (pending) return pending;

 const operation = Promise.resolve().then(() => compressAndStoreThumbnailOnce_(url, fileId, width));
 thumbnailCompressionInFlight_.set(cacheKey, operation);
 try {
  return await operation;
 } finally {
  if (thumbnailCompressionInFlight_.get(cacheKey) === operation) {
   thumbnailCompressionInFlight_.delete(cacheKey);
  }
 }
}

async function compressAndStoreThumbnailOnce_(url,fileId,width){
 if(!rawFileId||(typeof rawFileId==="string"&&rawFileId.includes("placehold.co")))return null;

 const cacheKey=buildThumbnailCacheKey(fileId,width);
 if(Date.now()<dbRetryAfter)return null;
 const retryAfter=thumbnailCompressionFailures_.get(cacheKey)||0;
 if(retryAfter>Date.now())return null;
 if(retryAfter)thumbnailCompressionFailures_.delete(cacheKey);
 const fetchUrl=fileId.length>20&&!fileId.includes("/")&&!fileId.includes("http")?`https://lh3.googleusercontent.com/d/${fileId}`:url;
 if(!fetchUrl||fetchUrl.includes("placehold.co"))return null;
 try{
  const cached=await readFreshThumbnail(cacheKey);if(cached)return cached;
  return await thumbnailCompressionQueue.run(async()=>{
   const queuedCached=await readFreshThumbnail(cacheKey);if(queuedCached)return queuedCached;
   const response=await fetch(fetchUrl,{mode:"cors"});if(!response.ok)return null;
   const bitmap=await createImageBitmap(await response.blob());
   try{
    if(!bitmap.width||!bitmap.height)return null;
    const scale=Math.min(1,width/bitmap.width),canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");
    if(!ctx)return null;
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    return await new Promise(resolve=>canvas.toBlob(blob=>{
     if(!blob){resolve(null);return;}
     const now=Date.now(),entry={key:cacheKey,fileId,width,blob,cachedAt:now,lastAccessedAt:now};
     storeThumbnailWithQuotaRecovery(entry,cacheKey)
      .then(async saved=>{if(saved!==null)await evictLeastRecentlyUsedThumbnails();resolve(saved===null?null:blob);})
      .catch(error=>{console.debug("Se omitió la persistencia de la miniatura opcional:",fileId,error&&error.message?error.message:error&&error.name||"error");resolve(null);});
    },"image/png"));
   }finally{if(typeof bitmap.close==="function")bitmap.close();}
  });
 }catch(error){
  thumbnailCompressionFailures_.set(cacheKey,Date.now()+THUMBNAIL_FAILURE_BACKOFF_MS);
  if(thumbnailCompressionFailures_.size>300)thumbnailCompressionFailures_.delete(thumbnailCompressionFailures_.keys().next().value);
  if(Date.now()>=dbRetryAfter)console.debug("Se omitió la compresión opcional de miniatura:",fileId,error&&error.message?error.message:error&&error.name||"error");
  return null;
 }
}
export async function getThumbnail(rawFileId,requestedSize=400){
 const fileId=normalizeId(rawFileId);if(!fileId||typeof fileId!=="string"||Date.now()<dbRetryAfter)return null;
 try{
  const cacheKey=buildThumbnailCacheKey(fileId,requestedSize);
  const cached=await readFreshThumbnail(cacheKey);
  if(cached)return cached;
  // Un registro histórico indexado solo por ID no declara la resolución del Blob.
  // Se elimina en lugar de reutilizarlo como una variante compatible.
  const legacy=await performOp("thumbnails","readonly",store=>store.get(fileId),{silent:true});
  if(legacy)await performOp("thumbnails","readwrite",store=>store.delete(fileId),{silent:true});
 }catch(error){
  if(Date.now()>=dbRetryAfter)console.debug("Se omitió la lectura de miniatura local:",error&&error.message?error.message:error&&error.name||"error");
 }
 return null;
}

/**
 * Normalizador interno para asegurar que las claves de IndexedDB sean IDs limpios.
 * Phase 3.3: Soporte para patrones adicionales de lh3 y drive.
 */
function normalizeId(id) {
    if (!id || typeof id !== 'string') return id;
    // Intenta extraer el ID de varios formatos de URL de Google
    const match = id.match(/[\/&]id=([a-zA-Z0-9_-]+)/) ||
                  id.match(/file\/d\/([a-zA-Z0-9_-]+)/) ||
                  id.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : id;
}


// Estado independiente para reanudar la simulación Drive ↔ Cortes sin mezclar
// cuentas ni sobrescribir el estado paginado de la auditoría recursiva.
function getCortesImageReconciliationStateKey(userId) {
    const ownerId = String(userId === null || userId === undefined ? '' : userId).trim();
    return ownerId ? 'cortesImageReconciliation:' + encodeURIComponent(ownerId) : '';
}
function getCortesImageReconciliationStateSignature(state) {
    const snapshot = Object.assign({}, state);
    delete snapshot.signature;
    return JSON.stringify(snapshot);
}
export async function saveCortesImageReconciliationState(state, userId) {
    const ownerId = String(userId === null || userId === undefined ? '' : userId).trim();
    const key = getCortesImageReconciliationStateKey(ownerId);
    if (!key || !state || typeof state !== 'object') return null;
    const auditId = String(state.auditId || '').trim();
    const fileSignature = String(state.fileSignature || '');
    const sourceDigest = String(state.sourceDigest || '');
    const nextBatchIndex = Number(state.nextBatchIndex);
    const expectedRevision = Number(state.revision);
    if (!/^[0-9a-f-]{36}$/i.test(auditId) ||
        !/^[a-f0-9]{64}$/i.test(fileSignature) ||
        (sourceDigest && !/^[a-f0-9]{64}$/i.test(sourceDigest)) ||
        !Number.isSafeInteger(nextBatchIndex) || nextBatchIndex < 0 ||
        !Number.isSafeInteger(expectedRevision) || expectedRevision < 0 ||
        !Array.isArray(state.results) || !Array.isArray(state.invalidFiles) ||
        !Array.isArray(state.rowIssues) || !state.counts || typeof state.counts !== 'object') return null;
    const next = {
        key, ownerId, auditId, fileSignature, sourceDigest,
        referenceCheckStatus: String(state.referenceCheckStatus || ''),
        nextBatchIndex, revision: expectedRevision + 1,
        results: state.results, invalidFiles: state.invalidFiles,
        rowIssues: state.rowIssues, counts: state.counts,
        status: ['running', 'partial', 'complete'].includes(state.status) ? state.status : 'partial',
        updatedAt: Date.now()
    };
    if (JSON.stringify(next).length > 8 * 1024 * 1024) return null;
    next.signature = getCortesImageReconciliationStateSignature(next);
    try {
        return await performAdminAuditTransaction((store, control) => {
            const request = store.get(key);
            request.onsuccess = () => {
                const current = request.result;
                if (current && (current.ownerId !== ownerId || current.key !== key ||
                    !Number.isSafeInteger(Number(current.revision)) ||
                    Number(current.revision) !== expectedRevision)) {
                    control.abort(new Error('La simulación local cambió en otra pestaña; vuelve a abrir el panel para recuperar el estado más reciente.'));
                    return;
                }
                if (!current && expectedRevision !== 0) {
                    control.abort(new Error('El estado de simulación local ya no existe; no se sobrescribirá el progreso.'));
                    return;
                }
                store.put(next);
                control.setResult(next);
            };
        });
    } catch (error) {
        console.error('No se pudo guardar el progreso de conciliación:', error);
        return null;
    }
}
export async function getCortesImageReconciliationState(userId, auditId) {
    const ownerId = String(userId === null || userId === undefined ? '' : userId).trim();
    const key = getCortesImageReconciliationStateKey(ownerId);
    const requestedAuditId = String(auditId || '').trim();
    if (!key || !/^[0-9a-f-]{36}$/i.test(requestedAuditId)) return null;
    const entry = await performAdminStateOp('readonly', store => store.get(key));
    if (!entry || entry.key !== key || entry.ownerId !== ownerId || entry.auditId !== requestedAuditId ||
        !Number.isSafeInteger(Number(entry.revision)) || Number(entry.revision) < 1 ||
        !Number.isSafeInteger(Number(entry.nextBatchIndex)) || entry.nextBatchIndex < 0 ||
        !/^[a-f0-9]{64}$/i.test(String(entry.fileSignature || '')) ||
        (entry.sourceDigest && !/^[a-f0-9]{64}$/i.test(String(entry.sourceDigest))) ||
        !Array.isArray(entry.results) || !Array.isArray(entry.invalidFiles) ||
        !Array.isArray(entry.rowIssues) || !entry.counts ||
        entry.signature !== getCortesImageReconciliationStateSignature(entry)) return null;
    return entry;
}
export async function clearCortesImageReconciliationState(userId, auditId) {
    const ownerId = String(userId === null || userId === undefined ? '' : userId).trim();
    const key = getCortesImageReconciliationStateKey(ownerId);
    if (!key) return false;
    const requestedAuditId = String(auditId || '').trim();
    try {
        return await performAdminAuditTransaction((store, control) => {
            const request = store.get(key);
            request.onsuccess = () => {
                const entry = request.result;
                if (entry && entry.ownerId === ownerId && (!requestedAuditId || entry.auditId === requestedAuditId)) {
                    store.delete(key);
                }
                control.setResult(true);
            };
        }) === true;
    } catch (error) {
        return false;
    }
}
