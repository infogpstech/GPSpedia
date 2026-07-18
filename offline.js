// GPSpedia Offline & Persistence Module | Version: 2.1.5
// Responsibilities:
// - Manage IndexedDB for local storage of catalog, history, and thumbnails.
// - Implement image compression and local caching.
// - Provide a clean API for offline data access.

const DB_NAME = 'GPSpedia_DB';
const DB_VERSION = 3; // Incremented for Phase 2 robustness and Validation Cache

let dbPromise = null;

/**
 * Initializes the IndexedDB database.
 * Phase 3.3: Added timeout and robustness to prevent startup hangs.
 */
export async function initDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        // Timeout de seguridad: Si la DB no responde en 5 segundos, fallamos para no bloquear el splash screen
        const timeout = setTimeout(() => {
            console.error("IndexedDB initialization timed out.");
            dbPromise = null;
            reject(new Error("IndexedDB timeout"));
        }, 5000);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            clearTimeout(timeout);
            console.error("IndexedDB error:", event.target.error);
            dbPromise = null;
            reject(event.target.error);
        };

        request.onblocked = () => {
            console.warn("IndexedDB update blocked. Please close other tabs.");
            // No rechazamos aquí, pero avisamos. El timeout eventualmente actuará si sigue bloqueado.
        };

        request.onsuccess = (event) => {
            clearTimeout(timeout);
            resolve(event.target.result);
        };

        request.onupgradeneeded = (event) => {
            const dbInstance = event.target.result;

            // Catalog Store: Stores the full catalog data object
            if (!dbInstance.objectStoreNames.contains('catalog')) {
                dbInstance.createObjectStore('catalog');
            }

            // Search History: Normalized search terms
            if (!dbInstance.objectStoreNames.contains('searchHistory')) {
                dbInstance.createObjectStore('searchHistory', { keyPath: 'term' });
            }

            // Viewed Items: Vehicles already consulted
            if (!dbInstance.objectStoreNames.contains('viewedItems')) {
                dbInstance.createObjectStore('viewedItems', { keyPath: 'id' });
            }

            // Thumbnails: Compressed images as Blobs
            if (!dbInstance.objectStoreNames.contains('thumbnails')) {
                dbInstance.createObjectStore('thumbnails');
            }

            // Validation Cache: Stores user responses to vehicle year validations
            if (!dbInstance.objectStoreNames.contains('validationCache')) {
                dbInstance.createObjectStore('validationCache', { keyPath: 'vehicleId' });
            }
        };
    });
    return dbPromise;
}

/**
 * Generic helper to perform DB operations.
 * Phase 3.2: Improved robustness and error handling.
 */
async function performOp(storeName, mode, callback) {
    try {
        const database = await initDB();
        if (!database) throw new Error("Could not initialize IndexedDB");

        return new Promise((resolve, reject) => {
            try {
                const transaction = database.transaction([storeName], mode);
                const store = transaction.objectStore(storeName);
                const request = callback(store);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (e) {
                reject(e);
            }
        });
    } catch (err) {
        console.error(`Database operation failed on ${storeName}:`, err);
        return null;
    }
}

// --- CATALOG PERSISTENCE ---

export async function saveCatalog(data) {
    return performOp('catalog', 'readwrite', (store) => store.put(data, 'current'));
}

export async function getCatalog() {
    return performOp('catalog', 'readonly', (store) => store.get('current'));
}

// --- SEARCH HISTORY ---

export async function saveSearch(term, metadata = {}) {
    const entry = {
        term: term.toLowerCase().trim(),
        timestamp: Date.now(),
        metadata
    };
    return performOp('searchHistory', 'readwrite', (store) => store.put(entry));
}

export async function getSearchHistory(limit = 10) {
    const all = await performOp('searchHistory', 'readonly', (store) => store.getAll());
    if (!all) return [];
    return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

// --- VALIDATION CACHE ---

export async function saveValidationResponse(vehicleId, response) {
    const entry = {
        vehicleId: String(vehicleId),
        timestamp: Date.now(),
        response: response
    };
    return performOp('validationCache', 'readwrite', (store) => store.put(entry));
}

export async function getValidationResponse(vehicleId) {
    return performOp('validationCache', 'readonly', (store) => store.get(String(vehicleId)));
}

// --- VIEWED ITEMS ---

export async function saveViewedItem(item) {
    const entry = {
        id: String(item.id),
        timestamp: Date.now(),
        data: item
    };
    return performOp('viewedItems', 'readwrite', (store) => store.put(entry));
}

export async function getViewedItems(limit = 20) {
    const all = await performOp('viewedItems', 'readonly', (store) => store.getAll());
    if (!all) return [];
    return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

// --- THUMBNAIL CACHE & COMPRESSION ---

/**
 * Compresses an image from a URL and stores it in IndexedDB.
 * Phase 3.3: Improved CORS handling using lh3.googleusercontent.com and normalization.
 */
export async function compressAndStoreThumbnail(url, rawFileId) {
    if (!rawFileId || (typeof rawFileId === 'string' && rawFileId.includes('placehold.co'))) return null;

    // Normalizar el ID para usarlo como clave consistente
    const fileId = normalizeId(rawFileId);
    if (!fileId) return null;

    // Phase 3.3: Usar URL de lh3 para evitar problemas de CORS y redirecciones en el fetch.
    // Solo si el fileId parece ser un ID real de Google Drive.
    const fetchUrl = (fileId.length > 20 && !fileId.includes('/') && !fileId.includes('http'))
        ? `https://lh3.googleusercontent.com/d/${fileId}=s400`
        : url;

    if (!fetchUrl || fetchUrl.includes('placehold.co')) return null;

    try {
        // 1. Check if already cached
        const cached = await performOp('thumbnails', 'readonly', (store) => store.get(fileId));
        if (cached) return cached;

        // 2. Fetch image
        const response = await fetch(fetchUrl, { mode: 'cors' });
        if (!response.ok) return null;

        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);

        // 3. Create Canvas and compress
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const MAX_WIDTH = 400; // Phase 3.4: Incrementar un poco para mejor calidad offline
        const scale = MAX_WIDTH / bitmap.width;
        canvas.width = MAX_WIDTH;
        canvas.height = bitmap.height * scale;

        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

        return new Promise((resolve) => {
            // Phase 3.4: Intentar usar webp (que soporta alpha) si el navegador lo permite,
            // de lo contrario usar png para asegurar transparencia si es necesario.
            // Para ahorrar espacio, seguimos usando jpeg para la mayoría, pero png es el fallback seguro.
            const mimeType = 'image/png'; // Cambiado a PNG para preservar transparencias en el catálogo

            canvas.toBlob(async (compressedBlob) => {
                if (compressedBlob) {
                    await performOp('thumbnails', 'readwrite', (store) => store.put(compressedBlob, fileId));
                    resolve(compressedBlob);
                } else {
                    resolve(null);
                }
            }, mimeType);
        });
    } catch (e) {
        console.warn("Thumbnail compression failed for", fileId, e);
        return null;
    }
}

export async function getThumbnail(rawFileId) {
    const fileId = normalizeId(rawFileId);
    return performOp('thumbnails', 'readonly', (store) => store.get(fileId));
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
