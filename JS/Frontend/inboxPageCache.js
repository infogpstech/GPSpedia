/**
 * Caché efímera de páginas del Inbox, aislada por identidad completa de sesión.
 * No persiste mensajes ni tokens fuera de memoria.
 */
export function createInboxPageCache({ ttlMs = 60000, maxEntries = 80, now = () => Date.now() } = {}) {
    const ttl = Number.isFinite(ttlMs) && ttlMs >= 0 ? ttlMs : 60000;
    const limit = Number.isInteger(maxEntries) && maxEntries > 0 ? maxEntries : 80;
    const entries = new Map();

    function getScopeKey(identity) {
        if (!identity || typeof identity !== "object") return "";
        const userId = String(identity.userId || "").trim();
        const role = String(identity.role || "").trim().toLowerCase();
        const sessionToken = String(identity.sessionToken || "").trim();
        if (!userId || !role || !sessionToken) return "";
        return JSON.stringify([userId, role, sessionToken]);
    }

    function normalizeFilterKey(filterKey) {
        if (filterKey === undefined || filterKey === null || filterKey === "") return "";
        if (typeof filterKey === "string") return filterKey;
        try { return JSON.stringify(filterKey); } catch (error) { return ""; }
    }

    function buildKey(identity, cursor, pageSize, filterKey) {
        const scope = getScopeKey(identity);
        if (!scope) return "";
        const normalizedCursor = cursor === null || cursor === undefined || cursor === "" ? "0" : String(cursor);
        const normalizedSize = Number.isInteger(Number(pageSize)) ? Math.max(1, Math.min(100, Number(pageSize))) : 40;
        const normalizedFilter = normalizeFilterKey(filterKey);
        return scope + "::" + encodeURIComponent(normalizedFilter) + "::" + normalizedSize + "::" + normalizedCursor;
    }

    function get(identity, cursor, options = {}) {
        const key = buildKey(identity, cursor, options.pageSize, options.filterKey);
        if (!key) return null;
        const entry = entries.get(key);
        if (!entry) return null;
        const stale = now() - entry.savedAt > ttl;
        if (stale && options.allowStale !== true) return null;
        entries.delete(key);
        entries.set(key, entry);
        return { value: entry.value, stale };
    }

    function set(identity, cursor, value, pageSize = 40, filterKey = "") {
        const key = buildKey(identity, cursor, pageSize, filterKey);
        if (!key || !value || !Array.isArray(value.data)) return false;
        entries.delete(key);
        entries.set(key, { value, savedAt: now() });
        while (entries.size > limit) entries.delete(entries.keys().next().value);
        return true;
    }

    function invalidate(identity, filterKey) {
        const scope = getScopeKey(identity);
        if (!scope) return false;
        const normalizedFilter = normalizeFilterKey(filterKey);
        const prefix = scope + "::" + (arguments.length > 1 ? encodeURIComponent(normalizedFilter) + "::" : "");
        let removed = 0;
        for (const key of entries.keys()) {
            if (key.startsWith(prefix)) {
                entries.delete(key);
                removed++;
            }
        }
        return removed;
    }

    function clear() {
        entries.clear();
    }

    function getStats() {
        return { entries: entries.size, maxEntries: limit, ttlMs: ttl };
    }

    return { getScopeKey, get, set, invalidate, clear, getStats };
}

/**
 * Combina páginas de mensajes manteniendo el orden canónico de inserción del servidor.
 * Las fechas no son una secuencia fiable: pueden coincidir o retroceder.
 * Los IDs repetidos actualizan el mensaje existente sin mover su posición.
 */
export function mergeInboxMessagePages(existingMessages, incomingMessages) {
    const merged = [];
    const positions = new Map();
    const upsert = message => {
        const id = String(message && message.messageId || "").trim();
        if (!id) {
            merged.push(message);
            return;
        }
        if (positions.has(id)) {
            merged[positions.get(id)] = message;
            return;
        }
        positions.set(id, merged.length);
        merged.push(message);
    };
    (Array.isArray(existingMessages) ? existingMessages : []).forEach(upsert);
    (Array.isArray(incomingMessages) ? incomingMessages : []).forEach(upsert);
    return merged;
}
