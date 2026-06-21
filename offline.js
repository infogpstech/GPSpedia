// GPSpedia Offline & Persistence Module | Version: 1.0
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
}

/**
 * Generic helper to perform DB operations.
 */
async function performOp(storeName, mode, callback) {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([storeName], mode);
        const store = transaction.objectStore(storeName);
        const request = callback(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
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
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(['searchHistory'], 'readonly');
        const store = transaction.objectStore('searchHistory');
        const request = store.getAll();

        request.onsuccess = () => {
            const sorted = request.result.sort((a, b) => b.timestamp - a.timestamp);
            resolve(sorted.slice(0, limit));
        };
        request.onerror = () => reject(request.error);
    });
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
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(['viewedItems'], 'readonly');
        const store = transaction.objectStore('viewedItems');
        const request = store.getAll();

        request.onsuccess = () => {
            const sorted = request.result.sort((a, b) => b.timestamp - a.timestamp);
            resolve(sorted.slice(0, limit));
        };
        request.onerror = () => reject(request.error);
    });
}

// --- THUMBNAIL CACHE & COMPRESSION ---

/**
 * Compresses an image from a URL and stores it in IndexedDB.
 */
export async function compressAndStoreThumbnail(url, fileId) {
    if (!url || !fileId || url.includes('placehold.co')) return null;

    try {
        // 1. Check if already cached
        const cached = await performOp('thumbnails', 'readonly', (store) => store.get(fileId));
        if (cached) return cached;

        // 2. Fetch image
        const response = await fetch(url);
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

export async function getThumbnail(fileId) {
    return performOp('thumbnails', 'readonly', (store) => store.get(fileId));
}
