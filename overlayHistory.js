// Centralized browser-history stack for dynamically mounted overlays.
const OVERLAY_HISTORY_KEY = "__gpOverlayStack";

function normalizeState(state) {
    return state && typeof state === "object" ? state : {};
}

export function selectTopmostOverlay(candidates) {
    if (!Array.isArray(candidates)) return null;
    return candidates
        .filter(candidate => candidate && Number.isFinite(Number(candidate.zIndex)))
        .slice()
        .sort((a, b) =>
            Number(b.zIndex) - Number(a.zIndex) ||
            Number(b.order || 0) - Number(a.order || 0) ||
            Number(b.domOrder || 0) - Number(a.domOrder || 0)
        )[0] || null;
}

export function createOverlayHistoryManager(historyApi, onError = null) {
    const entries = [];

    function publishState(method, extraState = {}) {
        if (!historyApi || typeof historyApi[method] !== "function") return false;
        const current = normalizeState(historyApi.state);
        const next = {
            ...current,
            ...extraState,
            [OVERLAY_HISTORY_KEY]: entries.map(entry => entry.id)
        };
        historyApi[method](next, "");
        return true;
    }

    function invokeClose(entry, reason) {
        try {
            return entry.close({ id: entry.id, reason }) !== false;
        } catch (error) {
            if (typeof onError === "function") onError(error, entry.id, reason);
            else if (typeof console !== "undefined" && console.error) {
                console.error("No se pudo cerrar el overlay:", entry.id, error);
            }
            return true;
        }
    }

    function register(id, close) {
        const normalizedId = String(id || "").trim();
        if (!normalizedId) throw new TypeError("El overlay requiere un identificador.");
        if (typeof close !== "function") throw new TypeError("El overlay requiere una función de cierre.");
        if (entries.some(entry => entry.id === normalizedId)) {
            throw new Error("El overlay ya está registrado: " + normalizedId);
        }

        entries.push({ id: normalizedId, close });
        publishState("pushState");
        return normalizedId;
    }

    function replaceTop(id, close) {
        const normalizedId = String(id || "").trim();
        if (!normalizedId) throw new TypeError("El overlay requiere un identificador.");
        if (typeof close !== "function") throw new TypeError("El overlay requiere una función de cierre.");
        if (entries.some(entry => entry.id === normalizedId)) {
            throw new Error("El overlay ya está registrado: " + normalizedId);
        }

        if (entries.length) entries.pop();
        entries.push({ id: normalizedId, close });
        publishState("replaceState");
        return normalizedId;
    }

    function close(id) {
        const normalizedId = String(id || "").trim();
        const index = entries.findIndex(entry => entry.id === normalizedId);
        if (index < 0) return false;

        const distance = entries.length - index;
        if (historyApi && distance === 1 && typeof historyApi.back === "function") {
            historyApi.back();
            return true;
        }

        // Un cierre manual solicitado sobre un padre sí retira sus descendientes;
        // la regla de una capa aplica a cada evento popstate, no a esta acción explícita.
        for (let cursor = entries.length - 1; cursor >= index; cursor--) {
            const entry = entries.pop();
            if (!invokeClose(entry, "manual")) {
                entries.push(entry);
                publishState("replaceState");
                return false;
            }
        }
        publishState("replaceState");
        if (historyApi && distance > 1 && typeof historyApi.go === "function") {
            historyApi.go(-distance);
        }
        return true;
    }

    function handlePopState(state) {
        const targetIds = normalizeState(state)[OVERLAY_HISTORY_KEY];
        const target = Array.isArray(targetIds) ? targetIds : [];
        const top = entries[entries.length - 1];
        if (!top || target.includes(top.id)) return entries.length;

        // Un popstate cierra únicamente la capa superior. Si el destino del navegador
        // omitió varias capas, las inferiores permanecen y se reconstruye su estado.
        const entry = entries.pop();
        if (!invokeClose(entry, "popstate")) {
            // El usuario canceló el cierre; restaurar exactamente la capa rechazada.
            entries.push(entry);
            publishState("pushState");
            return entries.length;
        }

        if (entries.length && !target.includes(entries[entries.length - 1].id)) {
            publishState("pushState");
        }
        return entries.length;
    }

    function getStack() {
        return entries.map(entry => entry.id);
    }

    function clear(reason = "clear") {
        while (entries.length) invokeClose(entries.pop(), reason);
        publishState("replaceState");
    }

    return Object.freeze({ register, replaceTop, close, handlePopState, getStack, clear });
}

export const overlayHistoryStateKey = OVERLAY_HISTORY_KEY;
