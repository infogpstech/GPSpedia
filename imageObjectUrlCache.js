/**
 * Administra ObjectURL de miniaturas mientras existen elementos img consumidores.
 * Cada URL se revoca al quedar sin consumidores o cuando su elemento sale del DOM.
 */
export function createObjectUrlRegistry({
    urlApi = URL,
    MutationObserverCtor = globalThis.MutationObserver,
    observationRoot = null
} = {}) {
    const entries = new Map();
    const elementEntries = new WeakMap();
    const generations = new WeakMap();
    let observer = null;

    function release(element) {
        const cacheKey = elementEntries.get(element);
        if (cacheKey === undefined) return false;
        elementEntries.delete(element);
        const entry = entries.get(cacheKey);
        if (!entry) return false;
        entry.elements.delete(element);
        if (entry.elements.size === 0) {
            urlApi.revokeObjectURL(entry.url);
            entries.delete(cacheKey);
        }
        return true;
    }

    function releaseRemovedNode(node) {
        if (!node) return;
        if (node.nodeType === 1 && String(node.tagName || "").toLowerCase() === "img" && !node.isConnected) {
            release(node);
        }
        if (typeof node.querySelectorAll === "function") {
            node.querySelectorAll("img").forEach(img => {
                if (!img.isConnected) release(img);
            });
        }
    }

    function observe() {
        const root = observationRoot || (typeof document !== "undefined" ? document.documentElement : null);
        if (observer || !root || typeof MutationObserverCtor !== "function") return;
        observer = new MutationObserverCtor(records => {
            records.forEach(record => record.removedNodes.forEach(releaseRemovedNode));
        });
        observer.observe(root, { childList: true, subtree: true });
    }

    function begin(element) {
        if (!element || (typeof element !== "object" && typeof element !== "function")) {
            throw new TypeError("Se requiere un elemento de imagen válido.");
        }
        const token = (generations.get(element) || 0) + 1;
        generations.set(element, token);
        release(element);
        observe();
        return token;
    }

    function isCurrent(element, token) {
        return generations.get(element) === token;
    }

    function attach(cacheKey, blob, element, token) {
        if (!isCurrent(element, token)) return null;
        if ("isConnected" in element && !element.isConnected) return null;
        const existingKey = elementEntries.get(element);
        if (existingKey !== undefined && existingKey !== cacheKey) release(element);

        let entry = entries.get(cacheKey);
        if (!entry) {
            entry = { url: urlApi.createObjectURL(blob), elements: new Set() };
            entries.set(cacheKey, entry);
        }

        entry.elements.add(element);
        elementEntries.set(element, cacheKey);
        element.src = entry.url;
        return entry.url;
    }

    function dispose() {
        if (observer) observer.disconnect();
        observer = null;
        for (const entry of entries.values()) urlApi.revokeObjectURL(entry.url);
        entries.clear();
    }

    return { begin, isCurrent, attach, release, dispose };
}

export const thumbnailObjectUrls = createObjectUrlRegistry();
