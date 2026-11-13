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

    function buildKey(identity, cursor, pageSize) {
        const scope = getScopeKey(identity);
        if (!scope) return "";
        const normalizedCursor = cursor === null || cursor === undefined || cursor === "" ? "0" : String(cursor);
        const normalizedSize = Number.isInteger(Number(pageSize)) ? Math.max(1, Math.min(100, Number(pageSize))) : 40;
        return scope + "::" + normalizedSize + "::" + normalizedCursor;
    }

    function get(identity, cursor, options = {}) {
        const key = buildKey(identity, cursor, options.pageSize);
        if (!key) return null;
        const entry = entries.get(key);
        if (!entry) return null;
        const stale = now() - entry.savedAt > ttl;
        if (stale && options.allowStale !== true) return null;
        entries.delete(key);
        entries.set(key, entry);
        return { value: entry.value, stale };
    }

    function set(identity, cursor, value, pageSize = 40) {
        const key = buildKey(identity, cursor, pageSize);
        if (!key || !value || !Array.isArray(value.data)) return false;
        entries.delete(key);
        entries.set(key, { value, savedAt: now() });
        while (entries.size > limit) entries.delete(entries.keys().next().value);
        return true;
    }

    function invalidate(identity) {
        const scope = getScopeKey(identity);
        if (!scope) return false;
        const prefix = scope + "::";
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
