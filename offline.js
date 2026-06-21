// GPSpedia Offline & Persistence Module | Version: 1.1
// Responsibilities:
// - Manage IndexedDB for local storage of catalog, history, and thumbnails.
// - Implement image compression and local caching.
// - Provide a clean API for offline data access.

const DB_NAME = 'GPSpedia_DB';
const DB_VERSION = 2; // Incremented for Phase 2 robustness

let dbPromise = null;

/**
 * Initializes the IndexedDB database.
 */
export async function initDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("IndexedDB error:", event.target.error);
            dbPromise = null;
            reject(event.target.error);
        };

        request.onblocked = () => {
            console.warn("IndexedDB update blocked. Please close other tabs.");
        };

        request.onsuccess = (event) => {
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
 * Phase 3.2: Normalize fileId to ensure consistency between save/load.
 */
export async function compressAndStoreThumbnail(url, rawFileId) {
    if (!url || !rawFileId || url.includes('placehold.co')) return null;

    // Normalizar el ID para usarlo como clave consistente
    const fileId = normalizeId(rawFileId);

    try {
        // 1. Check if already cached
        const cached = await performOp('thumbnails', 'readonly', (store) => store.get(fileId));
        if (cached) return cached;

        // 2. Fetch image
        const response = await fetch(url);
        if (!response.ok) return null;

        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);

        // 3. Create Canvas and compress
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const MAX_WIDTH = 300;
        const scale = MAX_WIDTH / bitmap.width;
        canvas.width = MAX_WIDTH;
        canvas.height = bitmap.height * scale;

        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

        return new Promise((resolve) => {
            canvas.toBlob(async (compressedBlob) => {
                if (compressedBlob) {
                    await performOp('thumbnails', 'readwrite', (store) => store.put(compressedBlob, fileId));
                    resolve(compressedBlob);
                } else {
                    resolve(null);
                }
            }, 'image/jpeg', 0.6);
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
 */
function normalizeId(id) {
    if (!id || typeof id !== 'string') return id;
    const match = id.match(/[\/&]id=([a-zA-Z0-9_-]+)/) || id.match(/file\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : id;
}
