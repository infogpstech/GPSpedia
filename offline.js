// GPSpedia Offline & Persistence Module | Version: 2.1.6
// Responsibilities:
// - Manage IndexedDB for local storage of catalog, history, and thumbnails.
// - Implement image compression and local caching.
// - Provide a clean API for offline data access.

import { thumbnailCompressionQueue } from './thumbnailCompressionQueue.js';

const DB_NAME = 'GPSpedia_DB';
const DB_VERSION = 4; // Añade persistencia local del inventario administrativo.

let dbPromise = null;

/**
 * Abre IndexedDB y libera la conexión cuando otra pestaña solicita una versión
 * distinta. Un upgrade bloqueado falla de forma explícita en vez de dejar una
 * promesa pendiente hasta un timeout silencioso.
 */
export async function initDB() {
    if (dbPromise) return dbPromise;

    let openingPromise;
    openingPromise = new Promise((resolve, reject) => {
        let settled = false;
        let timeout = null;
        let request;

        const clearOpenState = () => {
            if (timeout !== null) clearTimeout(timeout);
            if (dbPromise === openingPromise) dbPromise = null;
        };
        const fail = (error) => {
            if (settled) return;
            settled = true;
            clearOpenState();
            reject(error instanceof Error ? error : new Error('IndexedDB no pudo inicializarse.'));
        };

        try {
            if (typeof indexedDB === 'undefined') throw new Error('IndexedDB no está disponible.');
            timeout = setTimeout(() => fail(new Error('IndexedDB initialization timed out.')), 5000);
            request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                fail(event && event.target && event.target.error || request.error || new Error('IndexedDB open failed.'));
            };

            request.onblocked = () => {
                console.warn('IndexedDB upgrade blocked by another open tab.');
                fail(new Error('La actualización de IndexedDB está bloqueada por otra pestaña. Ciérrala y vuelve a intentar.'));
            };

            request.onupgradeneeded = (event) => {
                const dbInstance = event.target.result;
                if (!dbInstance.objectStoreNames.contains('catalog')) dbInstance.createObjectStore('catalog');
                if (!dbInstance.objectStoreNames.contains('searchHistory')) dbInstance.createObjectStore('searchHistory', { keyPath: 'term' });
                if (!dbInstance.objectStoreNames.contains('viewedItems')) dbInstance.createObjectStore('viewedItems', { keyPath: 'id' });
                if (!dbInstance.objectStoreNames.contains('thumbnails')) dbInstance.createObjectStore('thumbnails');
                if (!dbInstance.objectStoreNames.contains('validationCache')) dbInstance.createObjectStore('validationCache', { keyPath: 'vehicleId' });
                if (!dbInstance.objectStoreNames.contains('adminLocalState')) dbInstance.createObjectStore('adminLocalState', { keyPath: 'key' });
            };

            request.onsuccess = (event) => {
                const database = event.target.result;
                if (settled) {
                    database.close();
                    return;
                }
                database.onversionchange = () => {
                    database.close();
                    if (dbPromise === openingPromise) dbPromise = null;
                };
                settled = true;
                clearOpenState();
                resolve(database);
            };
        } catch (error) {
            fail(error);
        }
    });

    dbPromise = openingPromise;
    openingPromise.catch(() => {
        if (dbPromise === openingPromise) dbPromise = null;
    });
    return openingPromise;
}

/**
 * Ejecuta una operación y solo confirma el resultado después de que finalice
 * la transacción completa. request.onsuccess no garantiza que el commit ocurra.
 */
async function performOp(storeName, mode, callback) {
    try {
        const database = await initDB();
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
        console.error(`Database operation failed on ${storeName}:`, err);
        return null;
    }
}

// --- ADMINISTRATIVE LOCAL STATE ---

const ADMIN_LOCAL_STATE_STORE = 'adminLocalState';
const DRIVE_AUDIT_STATE_LEGACY_KEY = 'driveAudit:last';
const DRIVE_AUDIT_STATE_KEY_PREFIX = 'driveAudit:user:'
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
        return localStorage.getItem(pendingKey) === '1';
    } catch (error) {
        return true;
    }
}
export async function saveDriveAuditState(state, userId) {
    const ownerId = String(userId === null || userId === undefined ? '' : userId).trim();
    const key = getDriveAuditStateKey(ownerId);
    if (!key || !state || typeof state !== 'object' || !Array.isArray(state.files)) return null;
    if (hasPendingDriveAuditClear(ownerId) && !(await clearDriveAuditState(ownerId))) return null;
    const generation = getDriveAuditClearGeneration(ownerId);
    if (generation === null) return null;
    const entry = {
        key, ownerId, files: state.files, cursor: state.cursor || null,
        complete: state.complete === true, status: String(state.status || 'partial'),
        totalAnalyzed: Math.max(0, Number(state.totalAnalyzed) || 0),
        foldersVisited: Math.max(0, Number(state.foldersVisited) || 0),
        batches: Math.max(0, Number(state.batches) || 0),
        lastBatchAnalyzed: Math.max(0, Number(state.lastBatchAnalyzed) || 0),
        unverifiableReferences: Math.max(0, Number(state.unverifiableReferences) || 0),
        rootFolderName: String(state.rootFolderName || ''),
        rootFolderId: String(state.rootFolderId || ''),
        resumeUnavailable: state.resumeUnavailable === true,
        inventoryStatus: String(state.inventoryStatus || ''),
        inventoryMessage: String(state.inventoryMessage || ''),
        lastError: String(state.lastError || ''),
        updatedAt: Date.now()
    };
    const result = await performAdminStateOp('readwrite', store => {
        store.delete(DRIVE_AUDIT_STATE_LEGACY_KEY);
        return store.put(entry);
    });
    if (result === null) return null;
    const latestGeneration = getDriveAuditClearGeneration(ownerId);
    if (latestGeneration === null || latestGeneration !== generation || hasPendingDriveAuditClear(ownerId)) {
        await clearDriveAuditState(ownerId);
        return null;
    }
    return key;
}
export async function getDriveAuditState(userId) {
    const key = getDriveAuditStateKey(userId);
    if (!key) return null;
    const ownerId = String(userId).trim();
    if (hasPendingDriveAuditClear(ownerId)) {
        const cleared = await clearDriveAuditState(ownerId);
        if (!cleared) return null;
        return null;
    }
    const generation = getDriveAuditClearGeneration(ownerId);
    if (generation === null) return null;
    const entry = await performAdminStateOp('readwrite', store => {
        store.delete(DRIVE_AUDIT_STATE_LEGACY_KEY);
        return store.get(key);
    });
    const latestGeneration = getDriveAuditClearGeneration(ownerId);
    if (latestGeneration === null || latestGeneration !== generation || hasPendingDriveAuditClear(ownerId)) {
        await clearDriveAuditState(ownerId);
        return null;
    }
    if (!entry || entry.key !== key || entry.ownerId !== ownerId || !Array.isArray(entry.files)) return null;
    return entry;
}
export async function clearDriveAuditState(userId) {
    const key = getDriveAuditStateKey(userId);
    const pendingKey = getDriveAuditClearPendingKey(userId);
    if (!key || !pendingKey) return false;
    const generationKey = getDriveAuditClearGenerationKey(userId);
    try {
        const currentGeneration = getDriveAuditClearGeneration(userId);
        if (!generationKey || currentGeneration === null || currentGeneration >= Number.MAX_SAFE_INTEGER) return false;
        localStorage.setItem(pendingKey, '1');
        localStorage.setItem(generationKey, String(currentGeneration + 1));
    } catch (error) {
        return false;
    }
    const result = await performAdminStateOp('readwrite', store => {
        store.delete(DRIVE_AUDIT_STATE_LEGACY_KEY);
        return store.delete(key);
    });
    if (result === null) return false;
    try {
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


const ADMIN_IMAGE_UPLOAD_PENDING_PREFIX = "adminImageUploadPending:";
const ADMIN_IMAGE_UPLOAD_FIELDS = new Set([
    "imagenVehiculo", "imgCorte1", "imgCorte2", "imgCorte3",
    "imgApertura", "imgCableAlimen", "imgCableAlimen2", "imgCableAlimen3"
]);

function getAdminImageUploadPendingKey(vehicleId, fieldName) {
    const cleanVehicleId = String(vehicleId === null || vehicleId === undefined ? "" : vehicleId).trim();
    const cleanFieldName = String(fieldName || "").trim();
    if (!cleanVehicleId || !ADMIN_IMAGE_UPLOAD_FIELDS.has(cleanFieldName)) return "";
    return ADMIN_IMAGE_UPLOAD_PENDING_PREFIX + encodeURIComponent(cleanVehicleId) + ":" + encodeURIComponent(cleanFieldName);
}

/**
 * Recupera un reemplazo pendiente sin tratar un fallo de IndexedDB como ausencia de operación.
 */
export async function getAdminImageUploadPendingOperation(vehicleId, fieldName) {
    const key = getAdminImageUploadPendingKey(vehicleId, fieldName);
    if (!key) return { available: true, operation: null };
    const entry = await performAdminStateOp("readonly", store => store.get(key));
    if (entry === null) return { available: false, operation: null };
    return {
        available: true,
        operation: entry && entry.key === key && entry.operation ? entry.operation : null
    };
}

/**
 * Persiste el payload antes de enviarlo. No almacena userId, sessionToken ni credenciales.
 * Una operación distinta no puede reemplazar una carga pendiente del mismo vehículo/campo.
 */
export async function saveAdminImageUploadPendingOperation(operation) {
    if (!operation || typeof operation !== "object" ||
        !/^[A-Za-z0-9_-]{20,80}$/.test(String(operation.id || "")) ||
        operation.vehicleId === null || operation.vehicleId === undefined ||
        !ADMIN_IMAGE_UPLOAD_FIELDS.has(String(operation.fieldName || "")) ||
        typeof operation.fileData !== "string" || !/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(operation.fileData) ||
        !String(operation.filename || "").trim() ||
        !/^image\//i.test(String(operation.mimeType || ""))) {
        return { saved: false, error: true };
    }

    const key = getAdminImageUploadPendingKey(operation.vehicleId, operation.fieldName);
    if (!key) return { saved: false, error: true };
    const savedOperation = {
        id: String(operation.id),
        vehicleId: String(operation.vehicleId),
        fieldName: String(operation.fieldName),
        fileData: operation.fileData,
        filename: String(operation.filename),
        mimeType: String(operation.mimeType),
        createdAt: Number(operation.createdAt) || Date.now()
    };

    try {
        const database = await initDB();
        return await new Promise((resolve, reject) => {
            const transaction = database.transaction([ADMIN_LOCAL_STATE_STORE], "readwrite");
            const store = transaction.objectStore(ADMIN_LOCAL_STATE_STORE);
            let result = { saved: false, error: true };

            transaction.oncomplete = () => resolve(result);
            transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed"));
            transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted"));

            const getRequest = store.get(key);
            getRequest.onsuccess = () => {
                const existing = getRequest.result;
                if (existing && existing.operation) {
                    const previous = existing.operation;
                    if (String(previous.id || "") !== savedOperation.id) {
                        result = { saved: false, conflict: true, operation: previous };
                        return;
                    }
                    if (previous.fileData !== savedOperation.fileData ||
                        previous.vehicleId !== savedOperation.vehicleId ||
                        previous.fieldName !== savedOperation.fieldName ||
                        previous.filename !== savedOperation.filename ||
                        previous.mimeType !== savedOperation.mimeType) {
                        result = { saved: false, conflict: true, operation: previous };
                        return;
                    }
                }

                const putRequest = store.put({ key, operation: savedOperation, updatedAt: Date.now() });
                putRequest.onsuccess = () => { result = { saved: true, key }; };
                putRequest.onerror = () => reject(putRequest.error || new Error("No se pudo guardar el reemplazo pendiente"));
            };
            getRequest.onerror = () => reject(getRequest.error || new Error("No se pudo consultar el reemplazo pendiente"));
        });
    } catch (error) {
        console.error("No se pudo persistir el reemplazo de imagen pendiente:", error);
        return { saved: false, error: true };
    }
}

/**
 * Elimina el intento únicamente si el opId coincide con el registro almacenado.
 */
export async function removeAdminImageUploadPendingOperation(vehicleId, fieldName, opId) {
    const key = getAdminImageUploadPendingKey(vehicleId, fieldName);
    const cleanOpId = String(opId || "").trim();
    if (!key || !cleanOpId) return false;

    try {
        const database = await initDB();
        return await new Promise((resolve, reject) => {
            const transaction = database.transaction([ADMIN_LOCAL_STATE_STORE], "readwrite");
            const store = transaction.objectStore(ADMIN_LOCAL_STATE_STORE);
            let removed = false;

            transaction.oncomplete = () => resolve(removed);
            transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed"));
            transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted"));

            const getRequest = store.get(key);
            getRequest.onsuccess = () => {
                const entry = getRequest.result;
                if (!entry || !entry.operation || String(entry.operation.id || "") !== cleanOpId) return;
                const deleteRequest = store.delete(key);
                deleteRequest.onsuccess = () => { removed = true; };
                deleteRequest.onerror = () => reject(deleteRequest.error || new Error("No se pudo retirar el reemplazo confirmado"));
            };
            getRequest.onerror = () => reject(getRequest.error || new Error("No se pudo verificar el reemplazo antes de retirarlo"));
        });
    } catch (error) {
        console.error("No se pudo retirar el reemplazo de imagen confirmado:", error);
        return null;
    }
}

 
// --- IDEMPOTENCIA LOCAL DEL MODAL DE AGREGADO DE CORTES ---
const ADD_CUT_PENDING_KEY_PREFIX = 'addCutPending:';

function getAddCutPendingKey(vehicleId) {
    const cleanVehicleId = String(vehicleId === null || vehicleId === undefined ? '' : vehicleId).trim();
    return cleanVehicleId ? ADD_CUT_PENDING_KEY_PREFIX + cleanVehicleId : '';
}

/**
 * Recupera la operación pendiente del modal (+) para un vehículo.
 * available=false indica que IndexedDB no pudo consultarse; no equivale a que no exista operación.
 */
export async function getAddCutPendingOperation(vehicleId) {
    const key = getAddCutPendingKey(vehicleId);
    if (!key) return { available: true, operation: null };
    const entry = await performAdminStateOp('readonly', store => store.get(key));
    if (entry === null) return { available: false, operation: null };
    return {
        available: true,
        operation: entry && entry.key === key && entry.operation ? entry.operation : null
    };
}

/**
 * Persiste el snapshot antes de enviar addOrUpdateCut.
 * Una operación distinta no puede sobrescribir una operación pendiente del mismo vehículo.
 */
export async function saveAddCutPendingOperation(operation) {
    if (!operation || typeof operation !== 'object' || !operation.id ||
        operation.vehicleId === null || operation.vehicleId === undefined ||
        !String(operation.userId || '').trim() ||
        !operation.cutData || typeof operation.cutData !== 'object') {
        return { saved: false, error: true };
    }

    const key = getAddCutPendingKey(operation.vehicleId);
    const opId = String(operation.id).trim();
    if (!key || !opId) return { saved: false, error: true };

    try {
        const database = await initDB();
        return await new Promise((resolve, reject) => {
            const transaction = database.transaction([ADMIN_LOCAL_STATE_STORE], 'readwrite');
            const store = transaction.objectStore(ADMIN_LOCAL_STATE_STORE);
            let result = null;

            transaction.oncomplete = () => resolve(result || { saved: false, error: true });
            transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed'));
            transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));

            const getRequest = store.get(key);
            getRequest.onsuccess = () => {
                const existing = getRequest.result;
                if (existing && (!existing.operation || String(existing.operation.id || '').trim() !== opId)) {
                    result = { saved: false, conflict: true, operation: existing.operation || null };
                    return;
                }

                const entry = {
                    key,
                    operation,
                    updatedAt: Date.now()
                };
                const putRequest = store.put(entry);
                putRequest.onsuccess = () => { result = { saved: true, key }; };
                putRequest.onerror = () => reject(putRequest.error || new Error('No se pudo guardar la operación pendiente'));
            };
            getRequest.onerror = () => reject(getRequest.error || new Error('No se pudo consultar la operación pendiente'));
        });
    } catch (error) {
        console.error('No se pudo persistir la operación pendiente de agregado de corte:', error);
        return { saved: false, error: true };
    }
}

/**
 * Elimina la operación solo si la clave opId coincide, evitando borrar una operación nueva.
 */
export async function removeAddCutPendingOperation(vehicleId, opId) {
    const key = getAddCutPendingKey(vehicleId);
    const cleanOpId = String(opId || '').trim();
    if (!key || !cleanOpId) return false;

    try {
        const database = await initDB();
        return await new Promise((resolve, reject) => {
            const transaction = database.transaction([ADMIN_LOCAL_STATE_STORE], 'readwrite');
            const store = transaction.objectStore(ADMIN_LOCAL_STATE_STORE);
            let removed = false;

            transaction.oncomplete = () => resolve(removed);
            transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed'));
            transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));

            const getRequest = store.get(key);
            getRequest.onsuccess = () => {
                const entry = getRequest.result;
                if (!entry || !entry.operation || String(entry.operation.id || '').trim() !== cleanOpId) return;
                const deleteRequest = store.delete(key);
                deleteRequest.onsuccess = () => { removed = true; };
                deleteRequest.onerror = () => reject(deleteRequest.error || new Error('No se pudo retirar la operación completada'));
            };
            getRequest.onerror = () => reject(getRequest.error || new Error('No se pudo verificar la operación antes de eliminarla'));
        });
    } catch (error) {
        console.error('No se pudo retirar la operación pendiente de agregado de corte:', error);
        return null;
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
        const rawId = item && item.id;
        const id = rawId === undefined || rawId === null ? '' : String(rawId).trim();
        if (!id) throw new Error(`Corte sin ID estable en la posición ${position}.`);
        if (index.has(id)) throw new Error(`ID de Corte duplicado: ${id}.`);
        index.set(id, item);
    });
    return index;
}

/** Una respuesta válida de getCatalogData contiene las cuatro colecciones completas. */
export function isCompleteCatalogSnapshot(data) {
    if (!data || typeof data !== 'object' || !CATALOG_SNAPSHOT_COLLECTIONS.every(key => Array.isArray(data[key]))) return false;
    try {
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
        const result = await performOp('catalog', 'readwrite', store => store.put(newData, 'current'));
        if (result === null || result === undefined) throw new Error('IndexedDB no confirmó la escritura del catálogo.');
        newData.cortes.slice(-15).forEach(item => cacheItemImages(item).catch(() => {}));
        return result;
    } catch (error) {
        console.warn('Error guardando la instantánea completa del catálogo:', error);
        throw error;
    }
}

export async function getCatalog() {
    return performOp('catalog', 'readonly', (store) => store.get('current'));
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
    return performOp('searchHistory', 'readwrite', store => store.put(entry));
}
export async function getSearchHistory(ownerId, limit = 10) {
    const owner = normalizeLocalOwnerId(ownerId);
    if (!owner) return [];
    const all = await performOp('searchHistory', 'readonly', store => store.getAll());
    if (!all) return [];
    const legacyVinTerms = all.filter(entry => entry && !entry.ownerId && isPotentialVinSearchTerm(entry.term)).map(entry => entry.term);
    if (legacyVinTerms.length) await Promise.all(legacyVinTerms.map(term => performOp('searchHistory', 'readwrite', store => store.delete(term))));
    return all.filter(entry => entry && entry.ownerId === owner && typeof entry.query === 'string')
        .sort((a,b) => b.timestamp-a.timestamp).slice(0,limit).map(entry => ({ ...entry, term: entry.query }));
}
// El backend conserva la respuesta colaborativa; este caché solo recuerda qué cuenta respondió.
export async function saveValidationResponse(vehicleId, response, ownerId) {
    const owner = normalizeLocalOwnerId(ownerId);
    const recordId = String(vehicleId === null || vehicleId === undefined ? '' : vehicleId).trim();
    if (!owner || !recordId) return null;
    const entry = { vehicleId: buildOwnerScopedKey(owner, recordId), ownerId: owner, recordId, timestamp: Date.now(), response };
    return performOp('validationCache', 'readwrite', store => store.put(entry));
}
export async function getValidationResponse(vehicleId, ownerId) {
    const owner = normalizeLocalOwnerId(ownerId);
    const recordId = String(vehicleId === null || vehicleId === undefined ? '' : vehicleId).trim();
    if (!owner || !recordId) return null;
    const entry = await performOp('validationCache', 'readonly', store => store.get(buildOwnerScopedKey(owner, recordId)));
    return entry && entry.ownerId === owner && entry.recordId === recordId ? entry : null;
}
export async function saveViewedItem(item, ownerId) {
    const owner = normalizeLocalOwnerId(ownerId);
    if (!owner || !item || item.id === undefined || item.id === null) return null;
    const itemId = String(item.id);
    const entry = { id: buildOwnerScopedKey(owner, itemId), ownerId: owner, itemId, timestamp: Date.now(), data: item };
    const result = await performOp('viewedItems', 'readwrite', store => store.put(entry));
    cacheItemImages(item).catch(err => console.warn("Error precargando imágenes de visto recientemente:", err));
    return result;
}
export async function cacheItemImages(item) {
    if (!item) return;
    const fieldsToCache=[item.imagenVehiculo,item.imgCorte1,item.imgCorte2,item.imgCorte3,item.imgApertura,item.imgCableAlimen,item.imgCableAlimen2,item.imgCableAlimen3,item.imagenRelay,item.imagen,item.Imagen];
    for (const field of fieldsToCache) if(field&&typeof field==='string'&&!field.startsWith('blob:')&&!field.includes('placehold.co')) compressAndStoreThumbnail(field,field,300).catch(()=>{});
}
export async function getViewedItems(ownerId, limit = 20) {
    const owner = normalizeLocalOwnerId(ownerId);
    if (!owner) return [];
    const all = await performOp('viewedItems','readonly',store=>store.getAll());
    if (!all) return [];
    return all.filter(entry=>entry&&entry.ownerId===owner&&entry.data).sort((a,b)=>b.timestamp-a.timestamp)
        .slice(0,limit).map(entry=>({id:entry.itemId,timestamp:entry.timestamp,data:entry.data}));
}

// --- THUMBNAIL CACHE & COMPRESSION ---

function normalizeThumbnailSize(size=400){
 const n=Number(size);if(!Number.isFinite(n)||n<=0)return 400;return Math.max(100,Math.min(1600,Math.round(n)));
}
function buildThumbnailCacheKey(fileId,size){return fileId+"::w"+normalizeThumbnailSize(size);}

// TTL persistente: 30 días desde la generación de cada variante.
const THUMBNAIL_TTL_MS = 30 * 24 * 60 * 60 * 1000;
function isThumbnailExpired(entry, now = Date.now()) {
 const cachedAt = entry && Number(entry.cachedAt);
 return !Number.isFinite(cachedAt) || cachedAt <= 0 || now - cachedAt >= THUMBNAIL_TTL_MS;
}
async function purgeExpiredThumbnailEntries(now = Date.now()) {
 const entries = await performOp("thumbnails", "readonly", store => store.getAll());
 if (!Array.isArray(entries) || !entries.length) return;
 const keys = entries.filter(entry => entry && typeof entry === "object" &&
  !(typeof Blob !== "undefined" && entry instanceof Blob) &&
  isThumbnailExpired(entry, now) && typeof entry.key === "string").map(entry => entry.key);
 await Promise.all(keys.map(key => performOp("thumbnails", "readwrite", store => store.delete(key))));
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

/** Actualiza la recencia en la misma transacción que recupera la variante. */
async function readFreshThumbnail(key) {
 return runThumbnailStoreTransaction(
  store => store.get(key),
  (store, entry) => {
   if (!entry) return null;
   if (isThumbnailExpired(entry)) {
    store.delete(key);
    return null;
   }
   if (entry && typeof entry === "object" && entry.key === key && entry.blob) {
    entry.lastAccessedAt = Date.now();
    store.put(entry, key);
    return entry.blob;
   }
   return entry.blob || entry;
  }
 );
}

/** Conserva las variantes más recientes y elimina primero las menos utilizadas. */
async function evictLeastRecentlyUsedThumbnails() {
 return runThumbnailStoreTransaction(
  store => store.getAll(),
  (store, entries) => {
   const cached = (Array.isArray(entries) ? entries : [])
    .filter(entry => entry && typeof entry === "object" && typeof entry.key === "string" &&
     entry.blob && !isThumbnailExpired(entry))
    .sort((a, b) =>
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

/** Compresión por variante; limita el trabajo costoso y conserva las claves antiguas. */
export async function compressAndStoreThumbnail(url,rawFileId,requestedSize=400){
 if(!rawFileId||(typeof rawFileId==="string"&&rawFileId.includes("placehold.co")))return null;
 const fileId=normalizeId(rawFileId);if(!fileId)return null;
 const width=normalizeThumbnailSize(requestedSize),cacheKey=buildThumbnailCacheKey(fileId,width);
 await purgeExpiredThumbnailEntries();
 const fetchUrl=fileId.length>20&&!fileId.includes("/")&&!fileId.includes("http")?`https://lh3.googleusercontent.com/d/${fileId}`:url;
 if(!fetchUrl||fetchUrl.includes("placehold.co"))return null;
 try{
  const cached=await readFreshThumbnail(cacheKey);if(cached)return cached;
  return await thumbnailCompressionQueue.run(async()=>{
   // Otra solicitud de la misma variante pudo completar mientras esta esperaba turno.
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
      .then(async saved=>{
       if(saved!==null)await evictLeastRecentlyUsedThumbnails();
       resolve(saved===null?null:blob);
      })
      .catch(error=>{
       console.warn("Thumbnail persistence failed for",fileId,error);
       resolve(null);
      });
    },"image/png"));
   }finally{if(typeof bitmap.close==="function")bitmap.close();}
  });
 }catch(error){console.warn("Thumbnail compression failed for",fileId,error);return null;}
}
export async function getThumbnail(rawFileId,requestedSize=400){
 const fileId=normalizeId(rawFileId);if(!fileId||typeof fileId!=="string")return null;
 await purgeExpiredThumbnailEntries();
 const cached=await readFreshThumbnail(buildThumbnailCacheKey(fileId,requestedSize));
 if(cached)return cached;
 // Los registros heredados sin fecha verificable se descartan al primer acceso.
 const legacy=await performOp("thumbnails","readonly",store=>store.get(fileId));
 if(!legacy)return null;
 if(isThumbnailExpired(legacy)){
  await performOp("thumbnails","readwrite",store=>store.delete(fileId));
  return null;
 }
 return legacy.blob||legacy;
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
