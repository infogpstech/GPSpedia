// ============================================================================
// GPSpedia — Servicio transitorio de contexto de sesión y telemetría histórica.
// MIG-024 retiró SharedMutation, sus leases y la publicación del catálogo.
// La retirada total de este servicio, incluido doGet/health, corresponde a MIG-025.
// No realiza llamadas HTTP a otros servicios GPSpedia.
// ============================================================================

const COORDINATOR_VERSION_ = "1.4.9";
const COORDINATOR_SESSION_PROTOCOL_VERSION_ = 1;
const COORDINATOR_SESSION_SUPPORTED_PROTOCOL_VERSIONS_ = Object.freeze([1]);
const COORDINATOR_SESSION_LEGACY_PROTOCOL_VERSION_ = 1;
// Solo lectura temporal de buckets históricos de operaciones protegidas; no se escriben leases.
const LEGACY_COORDINATOR_TRAFFIC_STATE_PROPERTY_ = "GPSpedia_SHARED_MUTATION_LEASES";
const SHARED_AUTH_CONTEXT_PREFIX_ = "GPSpedia_AUTH_CONTEXT_V1_";
const SHARED_AUTH_TOKEN_INDEX_PREFIX_ = "GPSpedia_AUTH_TOKEN_V1_";
const SHARED_AUTH_CONTEXT_MAX_LENGTH_ = 8000;
const SHARED_AUTH_SESSION_CHUNK_PREFIX_ = "GPSpedia_AUTH_SESSIONS_V1_";
const SHARED_AUTH_SESSION_CHUNK_LENGTH_ = 7000; // bytes UTF-8; below the Apps Script per-property limit.
const SHARED_AUTH_IDLE_MONTHS_ = 1;
const SHARED_AUTH_ABSOLUTE_MONTHS_ = 3;
const SHARED_AUTH_TOUCH_INTERVAL_MS_ = 5 * 60 * 1000;
const SERVICE_TRAFFIC_BUCKET_PREFIX_ = "GPSpedia_SERVICE_TRAFFIC_HOUR_";
const SERVICE_TRAFFIC_BUCKET_MS_ = 60 * 60 * 1000;
const SERVICE_TRAFFIC_WINDOW_MS_ = 24 * 60 * 60 * 1000;
const SERVICE_TRAFFIC_SERVICES_ = Object.freeze(["AUTH", "CATALOG", "WRITE", "FEEDBACK", "UTILITIES", "ADMIN"]);


function createCoordinatorService_(dependencies) {
    const properties = dependencies.properties;
    const lockService = dependencies.lockService;
    const now = dependencies.now;
    const uuid = dependencies.uuid;
                let serviceTrafficBuckets_ = {};

    function constantTimeEquals_(left, right) {
        left = String(left || "");
        right = String(right || "");
        if (!left || left.length !== right.length) return false;
        let difference = 0;
        for (let i = 0; i < left.length; i++) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
        return difference === 0;
    }

    function withCoordinatorLock_(callback) {
        const lock = lockService.getScriptLock();
        if (!lock.tryLock(5000)) throw new Error("No se pudo obtener el bloqueo interno del coordinador.");
        try {
            return callback();
        } finally {
            lock.releaseLock();
        }
    }

    function authenticate_(payload) {
        const service = String(payload.service || "").trim().toUpperCase();
        if (!["ADMIN", "WRITE", "FEEDBACK", "AUTH", "UTILITIES"].includes(service)) {
            throw new Error("Servicio no autorizado para el coordinador compartido.");
        }
        const expected = String(properties.getProperty("GPSpedia_COORDINATOR_SECRET_" + service) || "");
        const supplied = String(payload.secret || "");
        if (expected.length < 32 || !constantTimeEquals_(expected, supplied)) {
            throw new Error("Servicio no autorizado para el coordinador compartido.");
        }
        return service;
    }











    function addUtcMonths_(timestamp, months) {
        const source = new Date(Number(timestamp));
        if (!Number.isFinite(source.getTime())) return NaN;
        const day = source.getUTCDate();
        source.setUTCDate(1);
        source.setUTCMonth(source.getUTCMonth() + Number(months));
        const lastDay = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + 1, 0)).getUTCDate();
        source.setUTCDate(Math.min(day, lastDay));
        return source.getTime();
    }

    function authContextKey_(userId) {
        return SHARED_AUTH_CONTEXT_PREFIX_ + encodeURIComponent(String(userId));
    }

    function authTokenIndexKey_(token) {
        return SHARED_AUTH_TOKEN_INDEX_PREFIX_ + encodeURIComponent(String(token));
    }

    function authSessionChunkPrefix_(userId, generation) {
        return SHARED_AUTH_SESSION_CHUNK_PREFIX_ + encodeURIComponent(String(userId)) + "_" + generation + "_";
    }

    function readAuthContext_(userId) {
        const raw = properties.getProperty(authContextKey_(userId));
        if (!raw) return null;
        let context;
        try { context = JSON.parse(raw); }
        catch (error) { throw new Error("El contexto compartido de sesión está dañado; el acceso permanece denegado."); }
        if (!context || typeof context !== "object" || Array.isArray(context) ||
            context.schemaVersion !== 1 || context.userId !== String(userId) ||
            !Number.isSafeInteger(context.epoch) || context.epoch < 1 ||
            (context.revokedBefore !== undefined && (!Number.isFinite(context.revokedBefore) || context.revokedBefore < 0))) {
            throw new Error("El contexto compartido de sesión tiene un esquema inválido; el acceso permanece denegado.");
        }
        if (context.sessionStorageVersion === 2) {
            if (typeof context.sessionGeneration !== "string" || !context.sessionGeneration ||
                !Number.isSafeInteger(context.sessionChunkCount) || context.sessionChunkCount < 0) {
                throw new Error("El índice de sesiones compartidas está dañado; el acceso permanece denegado.");
            }
            const prefix = authSessionChunkPrefix_(userId, context.sessionGeneration);
            context.sessions = [];
            for (let index = 0; index < context.sessionChunkCount; index++) {
                const chunkRaw = properties.getProperty(prefix + index);
                if (!chunkRaw) throw new Error("Falta un bloque del contexto compartido; el acceso permanece denegado.");
                let chunk;
                try { chunk = JSON.parse(chunkRaw); }
                catch (error) { throw new Error("Un bloque del contexto compartido está dañado; el acceso permanece denegado."); }
                if (!Array.isArray(chunk)) throw new Error("Un bloque del contexto compartido tiene un formato inválido; el acceso permanece denegado.");
                context.sessions.push(...chunk);
            }
        }
        if (!Array.isArray(context.sessions)) {
            throw new Error("El contexto compartido de sesión tiene un esquema inválido; el acceso permanece denegado.");
        }
        context.sessions.forEach(session => {
            if (!session || typeof session.token !== "string" || session.token.length < 16 || session.token.length > 128 ||
                typeof session.role !== "string" ||
                !["desarrollador", "jefe", "supervisor", "tecnico", "tecnico_exterior"].includes(session.role) ||
                typeof session.fullName !== "string" || session.fullName.length > 120 ||
                !Number.isFinite(session.createdAt) || !Number.isFinite(session.lastActivityAt) ||
                session.createdAt <= 0 || session.lastActivityAt < session.createdAt) {
                throw new Error("El contexto compartido contiene una sesión inválida; el acceso permanece denegado.");
            }
        });
        return context;
    }

    function sharedAuthUtf8Length_(value) {
        return encodeURIComponent(String(value)).replace(/%[0-9A-F]{2}/g, "x").length;
    }

    function saveAuthContext_(context) {
        const sessions = Array.isArray(context.sessions) ? context.sessions : [];
        const chunks = [];
        let currentChunk = [];
        sessions.forEach(session => {
            const candidate = currentChunk.concat([session]);
            if (sharedAuthUtf8Length_(JSON.stringify(candidate)) > SHARED_AUTH_SESSION_CHUNK_LENGTH_) {
                if (!currentChunk.length) throw new Error("Una sesión individual supera el tamaño de bloque permitido.");
                chunks.push(currentChunk);
                currentChunk = [session];
                if (sharedAuthUtf8Length_(JSON.stringify(currentChunk)) > SHARED_AUTH_SESSION_CHUNK_LENGTH_) {
                    throw new Error("Una sesión individual supera el tamaño de bloque permitido.");
                }
            } else currentChunk = candidate;
        });
        if (currentChunk.length) chunks.push(currentChunk);

        const previousGeneration = context.sessionGeneration;
        const previousChunkCount = context.sessionChunkCount;
        const generation = uuid();
        const prefix = authSessionChunkPrefix_(context.userId, generation);
        chunks.forEach((chunk, index) => properties.setProperty(prefix + index, JSON.stringify(chunk)));

        const metadata = Object.assign({}, context);
        delete metadata.sessions;
        metadata.sessionStorageVersion = 2;
        metadata.sessionGeneration = generation;
        metadata.sessionChunkCount = chunks.length;
        const serialized = JSON.stringify(metadata);
        if (serialized.length > SHARED_AUTH_CONTEXT_MAX_LENGTH_) {
            throw new Error("Los metadatos del contexto compartido superaron el tamaño permitido.");
        }
        properties.setProperty(authContextKey_(context.userId), serialized);

        if (previousGeneration && Number.isSafeInteger(previousChunkCount) && previousChunkCount > 0) {
            const previousPrefix = authSessionChunkPrefix_(context.userId, previousGeneration);
            for (let index = 0; index < previousChunkCount; index++) {
                try { properties.deleteProperty(previousPrefix + index); }
                catch (cleanupError) { /* La nueva generación ya está publicada; limpiar una generación vieja es best-effort. */ }
            }
        }
    }

    function registerSession_(service, operation, payload) {
        if (service !== "AUTH" || operation !== "registerSession") {
            throw new Error("Solo AUTH puede registrar contextos de sesión.");
        }
        const userId = String(payload.userId || "").trim();
        const token = String(payload.sessionToken || "");
        const role = String(payload.role || "").trim().toLowerCase();
        const fullName = String(payload.fullName || "");
        const createdAt = Number(payload.createdAt);
        const lastActivityAt = Number(payload.lastActivityAt);
        if (!userId || userId.length > 128 || token.length < 16 || token.length > 128 ||
            !["desarrollador", "jefe", "supervisor", "tecnico", "tecnico_exterior"].includes(role) ||
            fullName.length > 120 || !Number.isFinite(createdAt) || !Number.isFinite(lastActivityAt) ||
            createdAt <= 0 || lastActivityAt < createdAt) {
            throw new Error("Los datos del contexto de sesión no son válidos.");
        }
        return withCoordinatorLock_(() => {
            const currentTime = now();
            const context = readAuthContext_(userId) || {
                schemaVersion: 1, userId: userId, epoch: 1, sessions: []
            };
            context.revokedBefore = Number(context.revokedBefore || 0);
            const priorSessions = context.sessions.slice();
            context.sessions = context.sessions.filter(session =>
                session.createdAt > context.revokedBefore &&
                currentTime < addUtcMonths_(session.createdAt, SHARED_AUTH_ABSOLUTE_MONTHS_) &&
                currentTime < addUtcMonths_(session.lastActivityAt, SHARED_AUTH_IDLE_MONTHS_));
            const activeTokens = new Set(context.sessions.map(session => session.token));
            priorSessions.forEach(session => {
                if (!activeTokens.has(session.token) &&
                    String(properties.getProperty(authTokenIndexKey_(session.token)) || "") === userId) {
                    properties.deleteProperty(authTokenIndexKey_(session.token));
                }
            });
            if (createdAt <= Number(context.revokedBefore || 0)) throw new Error("La sesión fue revocada antes de registrarse.");
            const indexedOwner = String(properties.getProperty(authTokenIndexKey_(token)) || "");
            if (indexedOwner && indexedOwner !== userId) throw new Error("El token ya está asociado a otra cuenta.");
            const existing = context.sessions.filter(session => constantTimeEquals_(session.token, token));
            if (existing.length > 1) throw new Error("El token aparece duplicado en el contexto compartido.");
            if (existing.length === 1) {
                const session = existing[0];
                if (session.role !== role || session.fullName !== fullName || session.createdAt !== createdAt) {
                    throw new Error("El contexto existente no coincide con la sesión; inicia sesión nuevamente.");
                }
                session.lastActivityAt = Math.max(session.lastActivityAt, lastActivityAt);
                properties.setProperty(authTokenIndexKey_(token), userId);
                saveAuthContext_(context);
                return { status: "success", registered: true, recovered: true, epoch: context.epoch };
            }
            context.sessions.push({ token, role, fullName, createdAt, lastActivityAt });
            properties.setProperty(authTokenIndexKey_(token), userId);
            saveAuthContext_(context);
            return { status: "success", registered: true, recovered: false, epoch: context.epoch };
        });
    }

    function revokeSession_(service, operation, payload) {
        if (service !== "AUTH" || operation !== "revokeSession") {
            throw new Error("Solo AUTH puede revocar una sesión individual.");
        }
        const userId = String(payload.userId || "").trim();
        const token = String(payload.sessionToken || "");
        if (!userId || !token) throw new Error("La revocación requiere userId y sessionToken.");
        return withCoordinatorLock_(() => {
            const context = readAuthContext_(userId);
            if (!context) {
                if (String(properties.getProperty(authTokenIndexKey_(token)) || "") === userId) {
                    properties.deleteProperty(authTokenIndexKey_(token));
                }
                return { status: "success", revoked: false, alreadyRevoked: true };
            }
            const previous = context.sessions.length;
            context.sessions = context.sessions.filter(session => !constantTimeEquals_(session.token, token));
            saveAuthContext_(context);
            if (String(properties.getProperty(authTokenIndexKey_(token)) || "") === userId) {
                properties.deleteProperty(authTokenIndexKey_(token));
            }
            return { status: "success", revoked: context.sessions.length !== previous, alreadyRevoked: context.sessions.length === previous };
        });
    }

    function revokeUserSessions_(service, operation, payload) {
        if (service !== "AUTH" || operation !== "revokeUserSessions") {
            throw new Error("Solo AUTH puede revocar todas las sesiones de una cuenta.");
        }
        const userId = String(payload.userId || "").trim();
        if (!userId || userId.length > 128) throw new Error("La revocación requiere un userId válido.");
        return withCoordinatorLock_(() => {
            const context = readAuthContext_(userId) || {
                schemaVersion: 1, userId: userId, epoch: 0, sessions: []
            };
            if (context.epoch >= Number.MAX_SAFE_INTEGER) throw new Error("Se agotó el contador de epoch de sesión.");
            context.epoch += 1;
            context.revokedBefore = now();
            const revokedTokens = context.sessions.map(session => session.token);
            context.sessions = [];
            saveAuthContext_(context);
            revokedTokens.forEach(token => {
                if (String(properties.getProperty(authTokenIndexKey_(token)) || "") === userId) {
                    properties.deleteProperty(authTokenIndexKey_(token));
                }
            });
            return { status: "success", revoked: true, epoch: context.epoch };
        });
    }





    function syncUserSessions_(service, operation, payload) {
        if (service !== "AUTH" || operation !== "syncUserSessions") {
            throw new Error("Solo AUTH puede sincronizar las sesiones activas de una cuenta.");
        }
        const userId = String(payload.userId || "").trim();
        const role = String(payload.role || "").trim().toLowerCase();
        const fullName = String(payload.fullName || "");
        const inputSessions = payload.sessions;
        if (!userId || userId.length > 128 ||
            !["desarrollador", "jefe", "supervisor", "tecnico", "tecnico_exterior"].includes(role) ||
            fullName.length > 120 || !Array.isArray(inputSessions)) {
            throw new Error("La sincronización de sesiones contiene datos inválidos.");
        }
        const synchronized = withCoordinatorLock_(() => {
            const currentTime = now();
            const context = readAuthContext_(userId) || {
                schemaVersion: 1, userId: userId, epoch: 1, revokedBefore: 0, sessions: []
            };
            context.revokedBefore = Number(context.revokedBefore || 0);
            const accepted = [];
            const rejectedTokens = [];
            const seen = new Set();
            inputSessions.forEach(item => {
                const token = String(item && item.token || "");
                const createdAt = Number(item && item.createdAt);
                const lastActivityAt = Number(item && item.lastActivityAt);
                if (token.length < 16 || token.length > 128 || !Number.isFinite(createdAt) ||
                    !Number.isFinite(lastActivityAt) || createdAt <= 0 || lastActivityAt < createdAt ||
                    seen.has(token)) {
                    throw new Error("La lista de sesiones contiene un token, fecha o duplicado inválido.");
                }
                seen.add(token);
                if (createdAt <= context.revokedBefore ||
                    currentTime >= addUtcMonths_(createdAt, SHARED_AUTH_ABSOLUTE_MONTHS_) ||
                    currentTime >= addUtcMonths_(lastActivityAt, SHARED_AUTH_IDLE_MONTHS_)) {
                    rejectedTokens.push(token);
                    return;
                }
                const indexedOwner = String(properties.getProperty(authTokenIndexKey_(token)) || "");
                if (indexedOwner && indexedOwner !== userId) throw new Error("Un token de sesión pertenece a otra cuenta.");
                const previous = context.sessions.find(session => constantTimeEquals_(session.token, token));
                if (previous && (previous.role !== role || previous.createdAt !== createdAt)) throw new Error("El rol o la fecha de una sesión existente cambió; debe iniciar sesión nuevamente.");
                accepted.push({
                    token: token,
                    role: role,
                    fullName: fullName,
                    createdAt: createdAt,
                    lastActivityAt: Math.max(lastActivityAt, previous ? previous.lastActivityAt : 0)
                });
            });
            const acceptedTokens = new Set(accepted.map(session => session.token));
            context.sessions.forEach(session => {
                if (!acceptedTokens.has(session.token) &&
                    String(properties.getProperty(authTokenIndexKey_(session.token)) || "") === userId) {
                    properties.deleteProperty(authTokenIndexKey_(session.token));
                }
            });
            rejectedTokens.forEach(token => {
                if (String(properties.getProperty(authTokenIndexKey_(token)) || "") === userId) {
                    properties.deleteProperty(authTokenIndexKey_(token));
                }
            });
            accepted.forEach(session => properties.setProperty(authTokenIndexKey_(session.token), userId));
            context.sessions = accepted;
            saveAuthContext_(context);
            return {
                status: "success",
                synced: accepted.length,
                acceptedTokens: accepted.map(session => session.token),
                rejectedTokens: rejectedTokens,
                revokedBefore: context.revokedBefore,
                epoch: context.epoch
            };
        });
        // Las cachés de servicio se preparan después de liberar el lock de Coordinator.
        return synchronized;
    }

    function validateSessionContext_(service, operation, payload) {
        if (!["AUTH", "WRITE", "ADMIN", "FEEDBACK", "UTILITIES"].includes(service) ||
            operation !== "validateSessionContext") {
            throw new Error("El servicio no está autorizado para validar un contexto de sesión.");
        }
        const userId = String(payload.userId || "").trim();
        const token = String(payload.sessionToken || "");
        if (!userId || !token) throw new Error("La validación requiere userId y sessionToken.");
        return withCoordinatorLock_(() => {
            const currentTime = now();
            const actor = authorizeSession_(userId, token, currentTime);
            return { status: "success", valid: true, actor };
        });
    }


    function mergeServiceTrafficSources_(source) {
        const expectedServices = SERVICE_TRAFFIC_SERVICES_.slice();
        if (!source || source.status !== "success" || source.scope !== "coordinator_legacy_protected_operations" ||
            !Array.isArray(source.services) || !Array.isArray(source.buckets) || !source.totals) {
            throw new Error("Coordinator no pudo normalizar su agregado de tráfico.");
        }
        const reported = source.services.map(value => String(value || "").toUpperCase());
        if (reported.length !== expectedServices.length ||
            expectedServices.some(service => !reported.includes(service)) ||
            reported.some(service => !expectedServices.includes(service))) {
            throw new Error("El agregado central no contiene exactamente los servicios activos.");
        }
        const normalizeCounts = input => {
            if (!input || typeof input !== "object" || Array.isArray(input)) {
                throw new Error("El agregado central contiene conteos inválidos.");
            }
            const counts = {};
            expectedServices.forEach(service => {
                if (!Number.isSafeInteger(input[service]) || input[service] < 0) {
                    throw new Error("El conteo central de " + service + " no es válido.");
                }
                counts[service] = input[service];
            });
            return counts;
        };
        const result = Object.assign({}, source, {
            services: expectedServices.slice(),
            totals: {
                lastHour: normalizeCounts(source.totals.lastHour),
                last6Hours: normalizeCounts(source.totals.last6Hours),
                last24Hours: normalizeCounts(source.totals.last24Hours)
            },
            buckets: source.buckets.map((bucket, index) => {
                if (!bucket || !Number.isSafeInteger(bucket.startAt) || bucket.startAt <= 0) {
                    throw new Error("El bucket central " + index + " no contiene una marca temporal válida.");
                }
                return { startAt: bucket.startAt, counts: normalizeCounts(bucket.counts) };
            })
        });
        const sources = { coordinator: { available: true, scope: "coordinator_recorded_events" } };
        expectedServices.forEach(service => {
            sources[service] = {
                available: true,
                coordinatorScope: "coordinator_recorded_events",
                directRequestsAvailable: false,
                accuracy: "not_collected",
                mayUndercount: true,
                reason: "direct_requests_not_collected"
            };
        });
        result.scope = "global_service_traffic";
        result.sources = sources;
        result.coverage = {
            description: "Conteo histórico best-effort de operaciones protegidas registradas por Coordinator antes de MIG-024. No recoge tráfico nuevo ni representa el total de solicitudes HTTP.",
            excludes: [
                "lecturas directas no coordinadas de AUTH, CATALOG, WRITE y FEEDBACK",
                "sondeos de salud",
                "solicitudes HTTP no instrumentadas"
            ]
        };
        result.excluded = result.coverage.excludes.slice();
        return result;
    }

    function readServiceTraffic_(service, operation) {
        if (service !== "ADMIN" || operation !== "getServiceTraffic") {
            throw new Error("Solo ADMIN puede consultar la telemetría global.");
        }
        // Los buckets independientes y el estado combinado se leen solo como historial legado.
        // MIG-024 retiró el escritor de leases; no se generan nuevos buckets de operaciones protegidas.
        const capturedAt = now();
        const currentBucket = Math.floor(capturedAt / SERVICE_TRAFFIC_BUCKET_MS_) * SERVICE_TRAFFIC_BUCKET_MS_;
        const firstBucket = currentBucket - SERVICE_TRAFFIC_WINDOW_MS_ + SERVICE_TRAFFIC_BUCKET_MS_;
        const all = properties.getProperties() || {};
        const stored = new Map();
        Object.keys(all).forEach(key => {
            if (!key.startsWith(SERVICE_TRAFFIC_BUCKET_PREFIX_)) return;
            const startAt = Number(key.slice(SERVICE_TRAFFIC_BUCKET_PREFIX_.length));
            if (!Number.isSafeInteger(startAt) || startAt < firstBucket || startAt > currentBucket) {
                properties.deleteProperty(key);
                return;
            }
            let parsed;
            try { parsed = JSON.parse(all[key]); } catch (error) { parsed = null; }
            if (!parsed || parsed.version !== 1 || parsed.startAt !== startAt ||
                !parsed.counts || typeof parsed.counts !== "object" || Array.isArray(parsed.counts)) {
                // Solo los buckets fuera de ventana se eliminan. Una entrada vigente
                // puede estar siendo reemplazada por el escritor best-effort.
                return;
            }
            const counts = {};
            SERVICE_TRAFFIC_SERVICES_.forEach(keyName => {
                const value = Number(parsed.counts[keyName] || 0);
                counts[keyName] = Number.isSafeInteger(value) && value >= 0 ? value : 0;
            });
            stored.set(startAt, counts);
        });
        const leaseStateRaw = all[LEGACY_COORDINATOR_TRAFFIC_STATE_PROPERTY_];
        if (leaseStateRaw) {
            try {
                const leaseState = JSON.parse(leaseStateRaw);
                const embedded = leaseState && !Array.isArray(leaseState) && leaseState.version === 2 &&
                    leaseState.trafficBuckets && typeof leaseState.trafficBuckets === "object" ? leaseState.trafficBuckets : {};
                Object.keys(embedded).forEach(key => {
                    const startAt = Number(key), values = embedded[key];
                    if (!Number.isSafeInteger(startAt) || startAt < firstBucket || startAt > currentBucket || !Array.isArray(values)) return;
                    const counts = stored.get(startAt) || Object.fromEntries(SERVICE_TRAFFIC_SERVICES_.map(name => [name, 0]));
                    SERVICE_TRAFFIC_SERVICES_.forEach((serviceName, index) => {
                        const value = Number(values[index] || 0);
                        if (Number.isSafeInteger(value) && value >= 0) counts[serviceName] = Math.min(Number.MAX_SAFE_INTEGER, counts[serviceName] + value);
                    });
                    stored.set(startAt, counts);
                });
            } catch (error) { /* Estado combinado inválido: se omite sin afectar operaciones. */ }
        }
        const zeroCounts = () => Object.fromEntries(SERVICE_TRAFFIC_SERVICES_.map(key => [key, 0]));
        const totals = { lastHour: zeroCounts(), last6Hours: zeroCounts(), last24Hours: zeroCounts() };
        const buckets = [];
        for (let startAt = firstBucket; startAt <= currentBucket; startAt += SERVICE_TRAFFIC_BUCKET_MS_) {
            const counts = stored.get(startAt) || zeroCounts();
            buckets.push({ startAt, counts });
            SERVICE_TRAFFIC_SERVICES_.forEach(key => {
                const value = counts[key] || 0;
                if (startAt + SERVICE_TRAFFIC_BUCKET_MS_ > capturedAt - 60 * 60 * 1000) totals.lastHour[key] += value;
                if (startAt + SERVICE_TRAFFIC_BUCKET_MS_ > capturedAt - 6 * 60 * 60 * 1000) totals.last6Hours[key] += value;
                totals.last24Hours[key] += value;
            });
        }
        const coordinatorResult = {
            status: "success",
            scope: "coordinator_legacy_protected_operations",
            capturedAt,
            windowMs: SERVICE_TRAFFIC_WINDOW_MS_,
            bucketMs: SERVICE_TRAFFIC_BUCKET_MS_,
            services: SERVICE_TRAFFIC_SERVICES_.slice(),
            buckets,
            totals,
            excluded: ["lecturas directas no coordinadas", "sondeos de salud"]
        };
        return mergeServiceTrafficSources_(coordinatorResult);
    }


    function authorizeSession_(userId, token, currentTime) {
        const context = readAuthContext_(userId);
        if (!context) throw new Error("La sesión no está registrada en el contexto compartido; inicia sesión nuevamente.");
        const matches = context.sessions.filter(session => constantTimeEquals_(session.token, token));
        if (matches.length !== 1) throw new Error("La sesión fue revocada, no existe o no es única.");
        const session = matches[0];
        if (session.createdAt <= Number(context.revokedBefore || 0)) {
            context.sessions = context.sessions.filter(item => item !== session);
            saveAuthContext_(context);
            if (String(properties.getProperty(authTokenIndexKey_(token)) || "") === userId) {
                properties.deleteProperty(authTokenIndexKey_(token));
            }
            throw new Error("La sesión fue revocada; inicia sesión nuevamente.");
        }
        const absoluteExpiry = addUtcMonths_(session.createdAt, SHARED_AUTH_ABSOLUTE_MONTHS_);
        const idleExpiry = addUtcMonths_(session.lastActivityAt, SHARED_AUTH_IDLE_MONTHS_);
        if (!Number.isFinite(absoluteExpiry) || !Number.isFinite(idleExpiry) ||
            currentTime >= absoluteExpiry || currentTime >= idleExpiry) {
            context.sessions = context.sessions.filter(item => item !== session);
            saveAuthContext_(context);
            if (String(properties.getProperty(authTokenIndexKey_(token)) || "") === userId) {
                properties.deleteProperty(authTokenIndexKey_(token));
            }
            throw new Error("La sesión expiró; inicia sesión nuevamente.");
        }
        if (currentTime - session.lastActivityAt >= SHARED_AUTH_TOUCH_INTERVAL_MS_) {
            session.lastActivityAt = currentTime;
            saveAuthContext_(context);
        }
        return {
            userId: context.userId,
            role: session.role,
            fullName: session.fullName,
            createdAt: session.createdAt,
            lastActivityAt: session.lastActivityAt,
            epoch: context.epoch
        };
    }








    function getServiceTrafficFromBrowser_(payload) {
        const source = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
        const userId = String(source.userId || "").trim();
        const sessionToken = String(source.sessionToken || "");
        if (!userId || !sessionToken) throw new Error("La telemetría global requiere una sesión autenticada.");
        const actor = authorizeSession_(userId, sessionToken, now());
        const role = String(actor && actor.role || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
        if (role !== "desarrollador") throw new Error("Acceso denegado: la telemetría global está reservada a Desarrollador.");
        return readServiceTraffic_("ADMIN", "getServiceTraffic");
    }

    function handleRequest(request) {
        if (!request || typeof request !== "object" || Array.isArray(request)) throw new Error("Solicitud inválida.");
        const protocolVersion = request.protocolVersion === undefined || request.protocolVersion === null
            ? COORDINATOR_SESSION_LEGACY_PROTOCOL_VERSION_ : Number(request.protocolVersion);
        if (!Number.isSafeInteger(protocolVersion) ||
            !COORDINATOR_SESSION_SUPPORTED_PROTOCOL_VERSIONS_.includes(protocolVersion)) {
            throw new Error("Versión de protocolo no compatible con este Coordinator.");
        }
        const action = String(request.action || "").trim();
        const payload = request.payload && typeof request.payload === "object" && !Array.isArray(request.payload)
            ? request.payload : {};
        const service = authenticate_(payload);
        const operation = String(payload.operation || "").trim();

        if (action === "registerSession") return registerSession_(service, operation, payload);
        if (action === "syncUserSessions") return syncUserSessions_(service, operation, payload);
        if (action === "revokeSession") return revokeSession_(service, operation, payload);
        if (action === "revokeUserSessions") return revokeUserSessions_(service, operation, payload);
        if (action === "validateSessionContext") return validateSessionContext_(service, operation, payload);
        if (action === "getServiceTraffic") return readServiceTraffic_(service, operation);
        throw new Error("Acción interna desconocida para el coordinador.");
    }

    return {
        handleRequest: handleRequest,
        getServiceTrafficFromBrowser: getServiceTrafficFromBrowser_,
    };
}

function doGet(e) {
    const parameters = e && e.parameter && typeof e.parameter === "object" ? e.parameter : {};
    return ContentService.createTextOutput(JSON.stringify({
        status: "available",
        service: "GPSpedia-Coordinator",
        version: COORDINATOR_VERSION_
    })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
    let response;
    try {
        const request = JSON.parse(e && e.postData && e.postData.contents || "{}");
        const coordinator = createCoordinatorService_({
            properties: PropertiesService.getScriptProperties(),
            lockService: LockService,
            now: function() { return Date.now(); },
            uuid: function() { return Utilities.getUuid(); },
        });
        if (request && request.action === "getServiceTraffic") {
            response = coordinator.getServiceTrafficFromBrowser(request.payload);
        } else {
            response = coordinator.handleRequest(request);
        }
    } catch (error) {
        response = { status: "error", message: error && error.message ? error.message : "Solicitud rechazada." };
    }
    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}
