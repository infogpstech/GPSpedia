// Cache público de configuración central. No persiste tokens ni datos backend/admin.
export const CENTRAL_CONFIG_FRESH_TTL_MS = 5 * 60 * 1000;
export const CENTRAL_CONFIG_STALE_TTL_MS = 15 * 60 * 1000;
const REQUIRED_SERVICES = ["AUTH", "CATALOG", "WRITE", "USERS", "FEEDBACK", "UTILITIES", "ADMIN"];
const ENDPOINT_PATTERN = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/;

function validatePublicSnapshot_(value) {
    if (!value || typeof value !== "object" || Array.isArray(value) ||
        value.status !== "success" || Number(value.schemaVersion) !== 1 ||
        !Number.isSafeInteger(Number(value.revision)) || Number(value.revision) < 1 ||
        !value.parameters || typeof value.parameters !== "object" || Array.isArray(value.parameters)) {
        throw new Error("La configuración central no contiene una revisión pública válida.");
    }
    if (value.routingAvailable === true) {
        if (!value.services || typeof value.services !== "object" || Array.isArray(value.services)) {
            throw new Error("El registro central de servicios no está disponible.");
        }
        const keys = Object.keys(value.services).sort();
        if (keys.join("|") !== REQUIRED_SERVICES.slice().sort().join("|")) {
            throw new Error("El registro central no contiene exactamente los servicios aprobados.");
        }
        for (const key of REQUIRED_SERVICES) {
            const item = value.services[key];
            if (!item || typeof item !== "object" || typeof item.enabled !== "boolean" ||
                !ENDPOINT_PATTERN.test(String(item.endpointUrl || "")) ||
                !VERSION_PATTERN.test(String(item.contractVersion || "")) ||
                (item.minClientVersion && !VERSION_PATTERN.test(String(item.minClientVersion)))) {
                throw new Error("El endpoint o contrato del servicio " + key + " no es válido.");
            }
        }
    } else if (value.services !== null && value.services !== undefined) {
        throw new Error("Una respuesta sin enrutamiento no puede incluir endpoints parciales.");
    }
    const params = value.parameters;
    for (const key of Object.keys(params)) {
        if (key !== "rich_text_mode" || !["strict", "advanced"].includes(params[key])) {
            throw new Error("La proyección pública contiene un parámetro desconocido o inválido.");
        }
    }
    return JSON.parse(JSON.stringify(value));
}

export function resolveCentralServiceEndpoint(snapshot, serviceKey) {
    const key = String(serviceKey || "").trim().toUpperCase();
    if (!snapshot || snapshot.status !== "success" || snapshot.routingAvailable !== true ||
        !snapshot.services || typeof snapshot.services !== "object" || Array.isArray(snapshot.services)) {
        throw new Error("La configuración central no permite enrutar solicitudes; no se utilizarán endpoints locales.");
    }
    if (!REQUIRED_SERVICES.includes(key)) throw new Error("Servicio desconocido en el registro central: " + key);
    const service = snapshot.services[key];
    if (!service || service.enabled !== true) throw new Error("El servicio " + key + " está deshabilitado en la configuración central.");
    const endpoint = String(service.endpointUrl || "");
    if (!ENDPOINT_PATTERN.test(endpoint)) throw new Error("El endpoint central de " + key + " no es válido.");
    return endpoint;
}

export function createCentralConfigurationCache(options = {}) {
    const now = typeof options.now === "function" ? options.now : () => Date.now();
    let cached = null;
    let inflight = null;

    async function load(fetcher, loadOptions = {}) {
        if (typeof fetcher !== "function") throw new TypeError("Se requiere un lector de configuración.");
        const current = now();
        const age = cached ? Math.max(0, current - cached.fetchedAtMs) : Infinity;
        if (!loadOptions.force && cached && age <= CENTRAL_CONFIG_FRESH_TTL_MS) {
            return projectCached_(cached.snapshot, age, false);
        }
        if (inflight) return inflight;
        inflight = (async () => {
            try {
                const response = validatePublicSnapshot_(await fetcher());
                if (response.routingAvailable !== true) {
                    throw new Error("La revisión recibida no permite enrutar servicios.");
                }
                cached = { snapshot: response, fetchedAtMs: now() };
                return projectCached_(response, 0, false);
            } catch (error) {
                if (!cached) throw error;
                const failedAge = Math.max(0, now() - cached.fetchedAtMs);
                if (failedAge > CENTRAL_CONFIG_STALE_TTL_MS) {
                    cached = null;
                    throw error;
                }
                if (failedAge > CENTRAL_CONFIG_FRESH_TTL_MS) {
                    return projectCached_(cached.snapshot, failedAge, true, false);
                }
                return projectCached_(cached.snapshot, failedAge, true, true);
            } finally {
                inflight = null;
            }
        })();
        return inflight;
    }

    function invalidate() {
        cached = null;
    }

    function peek() {
        if (!cached) return null;
        return projectCached_(cached.snapshot, Math.max(0, now() - cached.fetchedAtMs), true);
    }

    function projectCached_(snapshot, age, stale, includeRouting = true) {
        const result = JSON.parse(JSON.stringify(snapshot));
        result.stale = Boolean(stale);
        result.routingAvailable = Boolean(includeRouting && snapshot.routingAvailable && age <= CENTRAL_CONFIG_FRESH_TTL_MS);
        if (!result.routingAvailable) result.services = null;
        return result;
    }

    return Object.freeze({ load, invalidate, peek });
}
