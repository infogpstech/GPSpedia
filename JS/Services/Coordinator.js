// ============================================================================
// GPSpedia — Coordinador compartido de mutaciones entre proyectos Apps Script
// No accede a Spreadsheet ni Drive. El estado de leases vive en ScriptProperties.
// ============================================================================

const SHARED_MUTATION_COORDINATOR_VERSION = "1.4.4";
const SHARED_MUTATION_PROTOCOL_VERSION = 1;
const SHARED_MUTATION_LEASES_PROPERTY = "GPSpedia_SHARED_MUTATION_LEASES";
const SHARED_MUTATION_LEASE_TTL_MS = 45 * 60 * 1000;
const SHARED_MUTATION_DRAIN_RESERVATION_TTL_MS = 60 * 1000;
const SHARED_MUTATION_MAX_WAIT_MS = 15000;
const SHARED_MUTATION_MAX_ACTIVE_LEASES = 20;
const SHARED_MUTATION_MAX_STATE_LENGTH = 8000;
const CATALOG_CHANGE_REVISION_PROPERTY_ = "GPSpedia_CATALOG_CHANGE_REVISION";
const CATALOG_CHANGE_EVENT_PREFIX_ = "GPSpedia_CATALOG_CHANGE_EVENT_";
const CATALOG_CHANGE_MAX_EVENTS_ = 100;
const CATALOG_CHANGE_MAX_EVENT_LENGTH_ = 4000;
const CATALOG_CHANGE_COLLECTIONS_ = new Set(["cortes", "pys", "tutoriales", "logos", "relay"]);
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
const SERVICE_TRAFFIC_SERVICES_ = Object.freeze(["AUTH", "CATALOG", "WRITE", "USERS", "FEEDBACK", "UTILITIES", "ADMIN"]);
const CATALOG_CHANGE_ALLOWED_WRITERS_ = Object.freeze({
    WRITE: new Set(["addOrUpdateCut","addSupplementaryInfo","addVinToVehicle","freezeCortesIds"]),
    FEEDBACK: new Set(["recordLike","suggestYear","addProblem","addSolution","addPrevention","addVehicleToProblem","removeVehicleFromProblem","updatePysItem","addTutorial","updateTutorialItem","approveVideo","rejectVideo"]),
    ADMIN: new Set(["addLogo","updateVehicleField","uploadAdminImage","normalizeImages","organizePrimaryVehicleImages","recoverReplacedImage","deleteReplacedImage","restoreReplacedImageFromTrash","moveReplacedImage","applyCortesImageReconciliation","restoreDatabase","reorganizeDatabase","migrateIdentifiers","rollbackIdentifiers","reconcilePendingImageUploads"])
});

function coordinatorPolicy_(service, operation) {
    const identityRead = ["USERS", "SESSION_CONTEXTS"];
    const identityWrite = ["USERS", "ACTIVE_SESSIONS", "LOGS"];
    const feedbackRead = identityRead;
    const feedbackWrite = ["FEEDBACK", "ACTIVITY"];

    const policies = {
        AUTH: {
            login: { write: [...identityWrite, "SESSION_CONTEXTS"] },
            requestPasswordRecovery: { write: ["PASSWORD_RECOVERY"], trackActivity: false },
            completePasswordRecovery: { write: [...identityWrite, "SESSION_CONTEXTS", "PASSWORD_RECOVERY"], trackActivity: false },
            acceptTerms: { read: ["SESSION_CONTEXTS"], write: ["USERS"], trackActivity: false },
            touchSession: { read: ["SESSION_CONTEXTS"], write: ["ACTIVE_SESSIONS"] },
            changePassword: { write: [...identityWrite, "SESSION_CONTEXTS"] },
            resetUserPassword: { write: [...identityWrite, "SESSION_CONTEXTS"] },
            resetUserSessions: { write: ["ACTIVE_SESSIONS", "LOGS", "SESSION_CONTEXTS"] },
            clearSensitiveLogs: { read: identityRead, write: ["LOGS"] },
            deleteUser: { write: [...identityWrite, "SESSION_CONTEXTS"] },
            updateUser: { write: [...identityWrite, "SESSION_CONTEXTS"] },
            logout: { write: [...identityWrite, "SESSION_CONTEXTS"] },
            migrateLegacyPasswords: { write: identityWrite },
            migrateLegacyRoleRevocationMarkersToSharedState: { write: ["USERS", "LOGS", "SESSION_CONTEXTS"] }
        },
        USERS: {
            createUser: { read: identityRead, write: ["USERS"] },
            updateProfile: { read: identityRead, write: ["USERS"] }
        },
        UTILITIES: {
            migrateTimestamps: { read: ["SESSION_CONTEXTS", "CORTES", "DRIVE"], write: ["UTILITIES"] }
        },
        WRITE: {
            sessionActivity: { read: identityRead },
            addOrUpdateCut: { read: identityRead, write: ["CORTES", "DRIVE", "IDEMPOTENCIA", "IMAGE_UPLOAD_LEDGER"] },
            addSupplementaryInfo: { read: identityRead, write: ["CORTES", "DRIVE", "IMAGE_UPLOAD_LEDGER"] },
            addVinToVehicle: { read: identityRead, write: ["CORTES"] },
            allocateVehicleId: { read: identityRead, write: ["CORTES"] },
            freezeCortesIds: { read: identityRead, write: ["CORTES"] }
        },
        ADMIN: {
            sessionActivity: { read: ["SESSION_CONTEXTS"] },
            getServiceTraffic: { read: ["SERVICE_TRAFFIC"] },
            // Las acciones ADMIN leen el contexto central; no escriben LastActivityAt por cada solicitud.
            getReplacedImages: { read: ["USERS", "CORTES", "DRIVE", "IMAGE_INVENTORY", "TUTORIAL", "FEEDBACK", "LOGOS", "RELAY"] },
            getDriveStorage: { read: ["USERS", "DRIVE"] },
            getCortesImageFolders: { read: ["DRIVE"] },
            auditIdentifiers: { read: ["USERS", "CORTES", "TUTORIAL", "FEEDBACK", "LOGOS", "RELAY"] },
            checkOperation: { read: [...identityRead, "CORTES", "IDEMPOTENCIA"] },
            getAdminImageUploadStatus: { read: [...identityRead, "CORTES", "DRIVE"], write: ["IMAGE_UPLOAD_LEDGER"] },
            previewCortesImageReconciliation: { read: [...identityRead, "CORTES", "DRIVE", "IMAGE_INVENTORY", "IMAGE_AUDIT_STATE", "TUTORIAL", "FEEDBACK", "LOGOS", "RELAY"] },
            previewCortesImageOrganizer: { read: [...identityRead, "CORTES", "DRIVE", "IMAGE_INVENTORY", "IMAGE_AUDIT_STATE", "TUTORIAL", "FEEDBACK", "LOGOS", "RELAY"] },
            auditDriveImagesInCortes: {
                read: ["USERS", "CORTES", "DRIVE", "IMAGE_INVENTORY", "TUTORIAL", "FEEDBACK", "LOGOS", "RELAY"],
                write: ["IMAGE_AUDIT_STATE"]
            },
            migrateReplacedImagesSchema: { read: ["USERS"], write: ["IMAGE_INVENTORY"] },
            backupDatabase: { maintenance: true },
            backupDrive: { read: identityRead, write: ["DRIVE"] },
            restoreDatabase: { maintenance: true },
            restoreDrive: { read: identityRead, write: ["DRIVE"] },
            reorganizeDatabase: {
                maintenance: true,
                nestedActions: { WRITE: ["freezeCortesIds"] }
            },
            normalizeImages: { read: identityRead, write: ["CORTES", "DRIVE"] },
            organizePrimaryVehicleImages: { read: identityRead, write: ["CORTES", "DRIVE"] },
            restoreAllTrashedImages: { maintenance: true },
            addLogo: { read: identityRead, write: ["LOGOS", "DRIVE"] },
            updateVehicleField: { read: identityRead, write: ["CORTES", "DRIVE"] },
            uploadAdminImage: { read: identityRead, write: ["CORTES", "DRIVE", "IMAGE_INVENTORY"] },
            migrateCortesOperationIds: { maintenance: true }, // Dry-run y confirmación comparten la ventana exclusiva.
            migrateIdentifiers: { maintenance: true },
            rollbackIdentifiers: { maintenance: true },
            reconcilePendingImageUploads: { maintenance: true },
            addOrUpdateCut: {
                read: identityRead,
                write: ["CORTES", "DRIVE", "IDEMPOTENCIA", "IMAGE_UPLOAD_LEDGER"],
                nestedActions: { WRITE: ["allocateVehicleId"] }
            },
            addSupplementaryInfo: { read: identityRead, write: ["CORTES", "DRIVE", "IMAGE_UPLOAD_LEDGER"] },
            createSheet: { maintenance: true },
            addColumn: { maintenance: true },
            driveCommand: { read: identityRead, write: ["DRIVE"] },
            recoverReplacedImage: { read: identityRead, write: ["CORTES", "DRIVE", "IMAGE_INVENTORY"] },
            deleteReplacedImage: { read: identityRead, write: ["CORTES", "DRIVE", "IMAGE_INVENTORY", "ACTIVITY"] },
            restoreReplacedImageFromTrash: { read: identityRead, write: ["DRIVE", "IMAGE_INVENTORY", "ACTIVITY"] },
            permanentlyDeleteReplacedImage: { read: identityRead, write: ["DRIVE", "IMAGE_INVENTORY", "ACTIVITY"] },
            saveUnusedImagesInventory: { read: [...identityRead, "CORTES"], write: ["DRIVE", "IMAGE_INVENTORY", "ACTIVITY"] },
            createCortesImageFolder: { read: identityRead, write: ["DRIVE", "ACTIVITY"] },
            moveReplacedImage: { read: identityRead, write: ["CORTES", "DRIVE", "IMAGE_INVENTORY", "ACTIVITY"] },
            getReplacedImageDownloadUrl: { read: [...identityRead, "DRIVE"], write: ["ACTIVITY"] },
            // Operaciones añadidas al dispatcher ADMIN: cada una debe tener una política explícita.
            markReplacedImageInUse: { read: [...identityRead, "DRIVE", "IMAGE_INVENTORY"], write: ["IMAGE_INVENTORY", "ACTIVITY"] },
            applyCortesImageReconciliation: { read: [...identityRead, "CORTES", "DRIVE", "IMAGE_AUDIT_STATE"], write: ["CORTES", "ACTIVITY"] },
            // La congelación de fórmulas recorre varias hojas y requiere exclusión global.
            freezeIdentifierFormulas: { maintenance: true }
        },
        FEEDBACK: {
            sessionActivity: { read: feedbackRead },
            getRichTextMode: { read: feedbackRead },
            setRichTextMode: { read: feedbackRead, write: ["RICH_TEXT_CONFIG"] },
            recordLike: { read: feedbackRead, write: [...feedbackWrite, "CORTES"] },
            recordVehicleView: { read: feedbackRead, write: ["ACTIVITY"] },
            reportProblem: { read: feedbackRead, write: feedbackWrite },
            addProblem: { read: [...feedbackRead, "CORTES"], write: [...feedbackWrite, "DRIVE"] },
            addSolution: { read: feedbackRead, write: feedbackWrite },
            addPrevention: { read: feedbackRead, write: feedbackWrite },
            addVehicleToProblem: { read: [...feedbackRead, "CORTES"], write: feedbackWrite },
            removeVehicleFromProblem: { read: [...feedbackRead, "CORTES"], write: feedbackWrite },
            updatePysItem: { read: feedbackRead, write: feedbackWrite },
            updateTutorialItem: { read: [...feedbackRead, "TUTORIAL"], write: [...feedbackWrite, "TUTORIAL"] },
            suggestCutChange: { read: feedbackRead, write: [...feedbackWrite, "DRIVE"] },
            suggestYear: { read: feedbackRead, write: ["CORTES", ...feedbackWrite] },
            addTutorial: { read: [...feedbackRead, "TUTORIAL"], write: [...feedbackWrite, "TUTORIAL"] },
            sendContactForm: { write: ["FEEDBACK"] },
            notifyDevelopersDriveCritical: { read: feedbackRead, write: ["FEEDBACK"] },
            replyToFeedback: { read: feedbackRead, write: feedbackWrite },
            markAsResolved: { read: feedbackRead, write: feedbackWrite },
            deleteFeedbackItem: { read: feedbackRead, write: feedbackWrite },
            clearActivityLogs: { read: feedbackRead, write: ["ACTIVITY"] },
            submitVideoForApproval: { read: [...feedbackRead, "TUTORIAL"], write: feedbackWrite },
            approveVideo: { read: [...feedbackRead, "TUTORIAL"], write: ["CORTES", "TUTORIAL", ...feedbackWrite] },
            rejectVideo: { read: [...feedbackRead, "TUTORIAL"], write: ["TUTORIAL", ...feedbackWrite] },
            createInboxConversation: { read: feedbackRead, write: ["FEEDBACK"] },
            sendInboxMessage: { read: feedbackRead, write: ["FEEDBACK"] },
            markInboxRead: { read: feedbackRead, write: ["FEEDBACK"] },
            markInboxUnread: { read: feedbackRead, write: ["FEEDBACK"] },
            deleteInboxConversation: { read: feedbackRead, write: ["FEEDBACK"] },
            archiveInboxConversation: { read: feedbackRead, write: ["FEEDBACK"] },
            closeInboxConversation: { read: feedbackRead, write: ["FEEDBACK"] }
        }
    };

    const servicePolicies = policies[service];
    const policy = servicePolicies && servicePolicies[operation];
    if (!policy) throw new Error("La acción no está habilitada en la política del coordinador.");

    const readResources = (policy.read || []).slice();
    const writeResources = (policy.write || []).slice();
    const sharedWriteResources = (policy.sharedWrite || []).slice();
    // La enumeración prolongada de Drive ya autentica al actor central al adquirir
    // la lease. No debe reservar USERS ni SESSION_CONTEXTS durante el recorrido:
    // el login escribe ambos recursos y debe poder continuar en paralelo.
    if (((service === "AUTH" && operation !== "requestPasswordRecovery") || (service === "ADMIN" && operation !== "getCortesImageFolders")) &&
        !readResources.includes("SESSION_CONTEXTS") && !writeResources.includes("SESSION_CONTEXTS")) {
        readResources.push("SESSION_CONTEXTS");
    }
    if (service === "AUTH" && policy.trackActivity !== false && !writeResources.includes("ACTIVE_SESSIONS")) {
        writeResources.push("ACTIVE_SESSIONS");
    }
    return {
        readResources: readResources,
        writeResources,
        sharedWriteResources,
        maintenance: policy.maintenance === true,
        nestedActions: policy.nestedActions || {}
    };
}

function createSharedMutationCoordinator_(dependencies) {
    const properties = dependencies.properties;
    const lockService = dependencies.lockService;
    const now = dependencies.now;
    const uuid = dependencies.uuid;
    const sleep = dependencies.sleep;
    const fetch = dependencies.fetch;
    const fetchAll = dependencies.fetchAll;

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
        if (!["ADMIN", "WRITE", "FEEDBACK", "AUTH", "USERS", "UTILITIES"].includes(service)) {
            throw new Error("Servicio no autorizado para el coordinador compartido.");
        }
        const expected = String(properties.getProperty("GPSpedia_COORDINATOR_SECRET_" + service) || "");
        const supplied = String(payload.secret || "");
        if (expected.length < 32 || !constantTimeEquals_(expected, supplied)) {
            throw new Error("Servicio no autorizado para el coordinador compartido.");
        }
        return service;
    }

    function readLeases_() {
        const raw = properties.getProperty(SHARED_MUTATION_LEASES_PROPERTY);
        if (!raw) return [];
        let leases;
        try {
            leases = JSON.parse(raw);
        } catch (error) {
            throw new Error("El estado del coordinador está dañado; las operaciones permanecen bloqueadas.");
        }
        if (!Array.isArray(leases)) {
            throw new Error("El estado del coordinador está dañado; las operaciones permanecen bloqueadas.");
        }
        leases.forEach(lease => {
            if (!lease || typeof lease.token !== "string" ||
                typeof lease.service !== "string" || typeof lease.operation !== "string" ||
                typeof lease.requestId !== "string" || !Array.isArray(lease.readResources) ||
                !Array.isArray(lease.writeResources) ||
                (lease.sharedWriteResources !== undefined && !Array.isArray(lease.sharedWriteResources)) ||
                typeof lease.maintenance !== "boolean" ||
                typeof lease.expiresAt !== "number" || !lease.nestedActions ||
                typeof lease.nestedActions !== "object" ||
                (lease.phase !== undefined && lease.phase !== "active" && lease.phase !== "draining")) {
                throw new Error("El estado del coordinador contiene una lease inválida; las operaciones permanecen bloqueadas.");
            }
            if (![...lease.readResources, ...lease.writeResources, ...(lease.sharedWriteResources || [])].every(item => typeof item === "string")) {
                throw new Error("El estado del coordinador contiene recursos inválidos; las operaciones permanecen bloqueadas.");
            }
        });
        return leases;
    }

    function saveLeases_(leases) {
        if (!leases.length) {
            properties.deleteProperty(SHARED_MUTATION_LEASES_PROPERTY);
            return;
        }
        const serialized = JSON.stringify(leases);
        if (serialized.length > SHARED_MUTATION_MAX_STATE_LENGTH) {
            throw new Error("Se alcanzó el límite seguro de estado del coordinador; no se concedieron más leases.");
        }
        properties.setProperty(SHARED_MUTATION_LEASES_PROPERTY, serialized);
    }

    function pruneExpiredLeases_(leases, currentTime) {
        const active = leases.filter(lease => lease.expiresAt > currentTime);
        return { leases: active, changed: active.length !== leases.length };
    }

    function intersects_(left, right) {
        const rightSet = new Set(right || []);
        return (left || []).some(value => rightSet.has(value));
    }

    function hasConflict_(requested, active) {
        if (requested.maintenance || active.maintenance) return true;
        const requestedSharedWrite = requested.sharedWriteResources || [];
        const activeSharedWrite = active.sharedWriteResources || [];
        const requestedExclusiveReads = (requested.readResources || []).filter(resource => !requestedSharedWrite.includes(resource));
        const activeExclusiveReads = (active.readResources || []).filter(resource => !activeSharedWrite.includes(resource));
        if (intersects_(requested.writeResources, [...active.readResources, ...active.writeResources, ...activeSharedWrite])) return true;
        if (intersects_(requestedExclusiveReads, [...active.writeResources, ...activeSharedWrite])) return true;
        if (intersects_(requestedSharedWrite, [...activeExclusiveReads, ...active.writeResources])) return true;
        return false;
    }

    function describeOperations_(leases, excludeToken) {
        const labels = [];
        (leases || []).forEach(lease => {
            if (!lease || lease.token === excludeToken) return;
            labels.push(String(lease.service) + "/" + String(lease.operation));
        });
        return Array.from(new Set(labels)).sort();
    }

    function busyOutcome_(leases, excludeToken, maintenanceRequest) {
        const activeOperations = describeOperations_(leases, excludeToken);
        let message;
        if (maintenanceRequest) {
            message = activeOperations.length
                ? "Mantenimiento en espera; deben finalizar estas operaciones: " + activeOperations.join(", ") + "."
                : "Otra ventana de mantenimiento está activa.";
        } else if ((leases || []).some(lease => lease && lease.maintenance)) {
            message = "El sistema está en una ventana de mantenimiento; la operación fue detenida por seguridad.";
        } else {
            message = activeOperations.length
                ? "El recurso está ocupado por operaciones activas: " + activeOperations.join(", ") + "."
                : "El coordinador alcanzó el límite seguro de operaciones simultáneas.";
        }
        return { kind: "busy", activeOperations: activeOperations, message: message };
    }

    function settleMaintenanceTimeout_(service, operation, requestId) {
        return withCoordinatorLock_(() => {
            const current = readLeases_();
            const pruned = pruneExpiredLeases_(current, now());
            const index = pruned.leases.findIndex(lease =>
                lease.service === service && lease.operation === operation &&
                lease.requestId === requestId && lease.maintenance === true);
            if (index === -1) {
                if (pruned.changed) saveLeases_(pruned.leases);
                return busyOutcome_(pruned.leases, null, true);
            }
            const ownLease = pruned.leases[index];
            if (ownLease.phase !== "draining") {
                if (pruned.changed) saveLeases_(pruned.leases);
                return { kind: "success", token: ownLease.token, expiresAt: ownLease.expiresAt, actor: ownLease.actor || null };
            }
            const active = pruned.leases.filter(lease => lease.token !== ownLease.token);
            if (!active.length) {
                ownLease.phase = "active";
                ownLease.expiresAt = now() + SHARED_MUTATION_LEASE_TTL_MS;
                saveLeases_(pruned.leases);
                return { kind: "success", token: ownLease.token, expiresAt: ownLease.expiresAt, actor: ownLease.actor || null };
            }
            const busy = busyOutcome_(active, null, true);
            pruned.leases.splice(index, 1);
            saveLeases_(pruned.leases);
            return busy;
        });
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



    function invalidateSessionActorCaches_(service, operation, payload) {
        if (service !== "AUTH" || operation !== "invalidateSessionActorCaches") {
            throw new Error("Solo AUTH puede solicitar la invalidación remota de caché de sesión.");
        }
        const userId = String(payload.userId || "").trim();
        const suppliedTokens = Array.isArray(payload.sessionTokens) ? payload.sessionTokens : [];
        if (!userId || userId.length > 128 || !suppliedTokens.length || suppliedTokens.length > 25 ||
            suppliedTokens.some(token => typeof token !== "string" || token.length < 16 || token.length > 200)) {
            throw new Error("La invalidación remota requiere un usuario y entre 1 y 25 tokens válidos.");
        }
        const tokens = Array.from(new Set(suppliedTokens));
        if (tokens.length !== suppliedTokens.length) {
            throw new Error("La invalidación remota contiene tokens duplicados.");
        }
        if (typeof fetch !== "function") {
            throw new Error("La comunicación remota de invalidación no está disponible en Coordinator.");
        }
        const targets = ["WRITE", "FEEDBACK"];
        const batchSize = 5;
        targets.forEach(target => {
            const url = String(properties.getProperty("GPSpedia_SERVICE_URL_" + target) || "").trim();
            const secret = String(properties.getProperty("GPSpedia_COORDINATOR_SECRET_" + target) || "");
            if (!url.startsWith("https://script.google.com/macros/s/") || !url.endsWith("/exec") ||
                secret.length < 32) {
                throw new Error("La configuración de invalidación remota de " + target + " está incompleta.");
            }
        });
        const confirmed = { WRITE: 0, FEEDBACK: 0 };
        for (let offset = 0; offset < tokens.length; offset += batchSize) {
            const batch = tokens.slice(offset, offset + batchSize);
            targets.forEach(target => {
                const url = String(properties.getProperty("GPSpedia_SERVICE_URL_" + target) || "").trim();
                const secret = String(properties.getProperty("GPSpedia_COORDINATOR_SECRET_" + target) || "");
                let response;
                try {
                    response = fetch(url, {
                        method: "post",
                        contentType: "application/json",
                        muteHttpExceptions: true,
                        followRedirects: true,
                        payload: JSON.stringify({
                            action: "__invalidateSessionActorCache",
                            payload: { secret, userId, sessionTokens: batch }
                        })
                    });
                } catch (error) {
                    throw new Error("No se pudo contactar el servicio " + target + " para invalidar su caché.");
                }
                let result = null;
                try { result = JSON.parse(response.getContentText()); } catch (error) {}
                const status = response.getResponseCode();
                if (status < 200 || status >= 300 || !result || result.status !== "success" ||
                    result.invalidated !== batch.length) {
                    throw new Error("El servicio " + target + " no confirmó la invalidación remota de caché.");
                }
                confirmed[target] += result.invalidated;
            });
        }
        return {
            status: "success",
            invalidated: tokens.length,
            services: targets.slice(),
            confirmed
        };
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
        return withCoordinatorLock_(() => {
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
    }

    function validateSessionContext_(service, operation, payload) {
        if (!["AUTH", "USERS", "WRITE", "ADMIN", "FEEDBACK", "UTILITIES"].includes(service) ||
            operation !== "validateSessionContext") {
            throw new Error("El servicio no está autorizado para validar un contexto de sesión.");
        }
        const userId = String(payload.userId || "").trim();
        const token = String(payload.sessionToken || "");
        if (!userId || !token) throw new Error("La validación requiere userId y sessionToken.");
        return withCoordinatorLock_(() => {
            const currentTime = now();
            const actor = authorizeSession_(userId, token, currentTime);
            try { recordServiceTrafficEvent_(service, currentTime, "validateSessionContext"); }
            catch (trafficError) { /* La telemetría nunca debe bloquear la restauración de sesión. */ }
            return { status: "success", valid: true, actor };
        });
    }

    function recordServiceTrafficEvent_(service, capturedAt, operation) {
        if (!SERVICE_TRAFFIC_SERVICES_.includes(service)) return false;
        if (service === "ADMIN" && operation === "getServiceTraffic") return false;
        const bucketStart = Math.floor(Number(capturedAt) / SERVICE_TRAFFIC_BUCKET_MS_) * SERVICE_TRAFFIC_BUCKET_MS_;
        if (!Number.isSafeInteger(bucketStart) || bucketStart <= 0) return false;
        const key = SERVICE_TRAFFIC_BUCKET_PREFIX_ + bucketStart;
        let bucket = { version: 1, startAt: bucketStart, counts: {} };
        const raw = properties.getProperty(key);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.version === 1 && parsed.startAt === bucketStart &&
                    parsed.counts && typeof parsed.counts === "object" && !Array.isArray(parsed.counts)) {
                    bucket = parsed;
                }
            } catch (error) { /* Un bucket dañado se reemplaza sin afectar la operación protegida. */ }
        }
        const current = Number(bucket.counts[service] || 0);
        bucket.counts[service] = Number.isSafeInteger(current) && current >= 0
            ? Math.min(Number.MAX_SAFE_INTEGER, current + 1) : 1;
        properties.setProperty(key, JSON.stringify(bucket));
        return true;
    }

    function readDirectServiceTrafficBatch_() {
        const specs = [
            { service: "CATALOG", scope: "catalog_post_requests" },
            { service: "AUTH", scope: "direct_post_requests" },
            { service: "USERS", scope: "direct_post_requests" },
            { service: "WRITE", scope: "direct_post_requests" },
            { service: "FEEDBACK", scope: "direct_post_requests" }
        ];
        const results = {};
        const requests = [];
        const requestSpecs = [];
        specs.forEach(spec => {
            const url = String(properties.getProperty("GPSpedia_SERVICE_URL_" + spec.service) || "").trim();
            const secret = String(properties.getProperty("GPSpedia_COORDINATOR_SECRET_" + spec.service) || "");
            if (!url.startsWith("https://script.google.com/macros/s/") || !url.endsWith("/exec") ||
                secret.length < 32) {
                results[spec.service] = { status: "unavailable", reason: "not_configured" };
                return;
            }
            requests.push({
                url,
                method: "post",
                contentType: "text/plain",
                payload: JSON.stringify({ action: "getServiceTraffic", payload: { secret } }),
                muteHttpExceptions: true,
                followRedirects: true
            });
            requestSpecs.push(spec);
        });
        if (!requests.length) return results;
        if (typeof fetchAll !== "function" && typeof fetch !== "function") {
            requestSpecs.forEach(spec => { results[spec.service] = { status: "unavailable", reason: "fetch_unavailable" }; });
            return results;
        }
        let responses = null;
        if (typeof fetchAll === "function") {
            try { responses = fetchAll(requests); } catch (error) { responses = null; }
        }
        if (!Array.isArray(responses) || responses.length !== requests.length) {
            responses = requests.map(request => {
                if (typeof fetch !== "function") return null;
                const options = Object.assign({}, request);
                delete options.url;
                try { return fetch(request.url, options); } catch (error) { return null; }
            });
        }
        requestSpecs.forEach((spec, index) => {
            try {
                const response = responses[index];
                if (!response || typeof response.getResponseCode !== "function" ||
                    typeof response.getContentText !== "function") throw new Error("request_failed");
                const status = response.getResponseCode();
                if (status < 200 || status >= 300) throw new Error("request_failed");
                const result = JSON.parse(response.getContentText() || "{}");
                const validTotals = result && result.totals &&
                    ["lastHour", "last6Hours", "last24Hours"].every(period =>
                        Number.isSafeInteger(result.totals[period]) && result.totals[period] >= 0);
                if (!result || result.status !== "success" || result.service !== spec.service ||
                    result.scope !== spec.scope || !Array.isArray(result.buckets) || !validTotals) {
                    throw new Error("invalid_response");
                }
                const validBuckets = result.buckets.filter(bucket => bucket &&
                    Number.isSafeInteger(bucket.startAt) && bucket.startAt > 0 &&
                    Number.isSafeInteger(bucket.count) && bucket.count >= 0);
                results[spec.service] = Object.assign({}, result, {
                    buckets: validBuckets,
                    accuracy: validBuckets.length === result.buckets.length
                        ? String(result.accuracy || "best_effort_nonblocking") : "partial",
                    reason: validBuckets.length === result.buckets.length ? null : "invalid_buckets_ignored"
                });
            } catch (error) {
                results[spec.service] = {
                    status: "unavailable",
                    reason: String(error && error.message || error) === "invalid_response" ? "invalid_response" : "request_failed"
                };
            }
        });
        return results;
    }

    function mergeServiceTrafficSources_(source, directResults) {
        const expectedServices = SERVICE_TRAFFIC_SERVICES_.slice();
        if (!source || source.status !== "success" || source.scope !== "coordinator_protected_operations" ||
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
        const sources = { coordinator: { available: true, scope: "protected_operations" } };
        const directServices = ["CATALOG", "AUTH", "USERS", "WRITE", "FEEDBACK"];
        const bucketsByStart = new Map(result.buckets.map(bucket => [bucket.startAt, bucket]));
        directServices.forEach(service => {
            const direct = directResults && directResults[service];
            const expectedScope = service === "CATALOG" ? "catalog_post_requests" : "direct_post_requests";
            const available = Boolean(direct && direct.status === "success" &&
                direct.service === service && direct.scope === expectedScope &&
                Array.isArray(direct.buckets) && direct.totals &&
                ["lastHour", "last6Hours", "last24Hours"].every(period =>
                    Number.isSafeInteger(direct.totals[period]) && direct.totals[period] >= 0));
            if (available) {
                direct.buckets.forEach(bucket => {
                    let target = bucketsByStart.get(bucket.startAt);
                    if (!target) {
                        const counts = {};
                        expectedServices.forEach(name => { counts[name] = 0; });
                        target = { startAt: bucket.startAt, counts };
                        result.buckets.push(target);
                        bucketsByStart.set(bucket.startAt, target);
                    }
                    target.counts[service] += bucket.count;
                });
                ["lastHour", "last6Hours", "last24Hours"].forEach(period => {
                    result.totals[period][service] += direct.totals[period];
                });
            }
            sources[service] = {
                coordinatorScope: "protected_operations",
                directRequestsAvailable: available,
                directRequestScope: available ? direct.scope : null,
                accuracy: available ? String(direct.accuracy || "best_effort_nonblocking") : "partial",
                mayUndercount: true,
                reason: available ? (direct.reason || null) : String(direct && direct.reason || "not_configured")
            };
            if (service === "CATALOG") sources[service].feedRequests = "coordinator";
        });
        result.buckets.sort((left, right) => left.startAt - right.startAt);
        result.scope = "global_service_traffic";
        result.sources = sources;
        result.coverage = {
            description: "Agregado de operaciones protegidas de los siete servicios activos, más solicitudes directas de lectura CATALOG y rutas directas instrumentadas de AUTH, WRITE, USERS y FEEDBACK cuando sus contadores están configurados.",
            excludes: ["sondeos de salud", "solicitudes HTTP que no atraviesan las rutas instrumentadas"]
        };
        result.excluded = result.coverage.excludes.slice();
        return result;
    }

    function readServiceTraffic_(service, operation) {
        if (service !== "ADMIN" || operation !== "getServiceTraffic") {
            throw new Error("Solo ADMIN puede consultar la telemetría global.");
        }
        const coordinatorResult = withCoordinatorLock_(() => {
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
                    properties.deleteProperty(key);
                    return;
                }
                const counts = {};
                SERVICE_TRAFFIC_SERVICES_.forEach(keyName => {
                    const value = Number(parsed.counts[keyName] || 0);
                    counts[keyName] = Number.isSafeInteger(value) && value >= 0 ? value : 0;
                });
                stored.set(startAt, counts);
            });
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
            return {
                status: "success",
                scope: "coordinator_protected_operations",
                capturedAt,
                windowMs: SERVICE_TRAFFIC_WINDOW_MS_,
                bucketMs: SERVICE_TRAFFIC_BUCKET_MS_,
                services: SERVICE_TRAFFIC_SERVICES_.slice(),
                buckets,
                totals,
                excluded: ["lecturas públicas no coordinadas", "feed público del catálogo", "sondeos de salud"]
            };
        });
        return mergeServiceTrafficSources_(coordinatorResult, readDirectServiceTrafficBatch_());
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

    function acquire_(service, operation, payload) {
        const policy = coordinatorPolicy_(service, operation);
        const maintenanceRequest = policy.maintenance === true;
        const requestId = String(payload.requestId || "").trim();
        if (!/^[A-Za-z0-9_-]{20,80}$/.test(requestId)) {
            throw new Error("Identificador de solicitud inválido para el coordinador.");
        }
        const requestedWait = Number(payload.waitMs);
        const waitMs = Number.isFinite(requestedWait)
            ? Math.max(0, Math.min(SHARED_MUTATION_MAX_WAIT_MS, requestedWait))
            : 0;
        const deadline = now() + waitMs;

        while (true) {
            const outcome = withCoordinatorLock_(() => {
                const currentTime = now();
                let sessionUserId = String(payload.userId || "").trim();
                const sessionToken = String(payload.sessionToken || "");
                if (sessionToken && !sessionUserId) {
                    sessionUserId = String(properties.getProperty(authTokenIndexKey_(sessionToken)) || "");
                    if (!sessionUserId) throw new Error("La sesión fue revocada, no existe o no es única.");
                }
                if (Boolean(sessionUserId) !== Boolean(sessionToken)) throw new Error("La identidad de sesión está incompleta.");
                const actor = sessionToken && !(service === "AUTH" && operation === "logout")
                    ? authorizeSession_(sessionUserId, sessionToken, currentTime) : null;
                const current = readLeases_();
                const pruned = pruneExpiredLeases_(current, currentTime);
                const leases = pruned.leases;
                const existing = leases.find(lease => lease.service === service && lease.requestId === requestId);

                if (existing) {
                    if (existing.operation !== operation) {
                        throw new Error("El identificador de solicitud ya pertenece a otra operación.");
                    }
                    if (maintenanceRequest) {
                        if (existing.maintenance !== true) {
                            throw new Error("El identificador de solicitud ya pertenece a una lease no exclusiva.");
                        }
                        if (existing.phase === "draining") {
                            const active = leases.filter(lease => lease.token !== existing.token);
                            if (!active.length) {
                                existing.phase = "active";
                                existing.expiresAt = currentTime + SHARED_MUTATION_LEASE_TTL_MS;
                                saveLeases_(leases);
                                try { recordServiceTrafficEvent_(service, currentTime, operation); }
                                catch (trafficError) { /* Métrica best-effort: no afecta la lease. */ }
                                return { kind: "success", token: existing.token, expiresAt: existing.expiresAt, actor: existing.actor || actor };
                            }
                            if (pruned.changed) saveLeases_(leases);
                            return busyOutcome_(active, null, true);
                        }
                    } else if (existing.phase === "draining") {
                        throw new Error("La lease de mantenimiento aún no está activa.");
                    }
                    if (pruned.changed) saveLeases_(leases);
                    return { kind: "success", token: existing.token, expiresAt: existing.expiresAt, actor: existing.actor || actor };
                }

                if (maintenanceRequest) {
                    const otherMaintenance = leases.find(lease => lease.maintenance === true);
                    if (otherMaintenance) {
                        if (pruned.changed) saveLeases_(leases);
                        return busyOutcome_(leases, null, true);
                    }
                    const token = uuid() + uuid();
                    const lease = {
                        token: token,
                        service: service,
                        operation: operation,
                        requestId: requestId,
                        readResources: policy.readResources,
                        writeResources: policy.writeResources,
                        sharedWriteResources: policy.sharedWriteResources,
                        maintenance: true,
                        nestedActions: policy.nestedActions,
                        actor: actor,
                        phase: "draining",
                        createdAt: currentTime,
                        expiresAt: currentTime + SHARED_MUTATION_DRAIN_RESERVATION_TTL_MS
                    };
                    leases.push(lease);
                    const active = leases.filter(item => item.token !== token);
                    if (!active.length) {
                        lease.phase = "active";
                        lease.expiresAt = currentTime + SHARED_MUTATION_LEASE_TTL_MS;
                        saveLeases_(leases);
                        try { recordServiceTrafficEvent_(service, currentTime); }
                        catch (trafficError) { /* Métrica best-effort: no afecta la lease. */ }
                        return { kind: "success", token: token, expiresAt: lease.expiresAt, actor: lease.actor || null };
                    }
                    saveLeases_(leases);
                    return busyOutcome_(active, null, true);
                }

                const conflicts = leases.filter(lease => hasConflict_(policy, lease));
                if (conflicts.length || leases.length >= SHARED_MUTATION_MAX_ACTIVE_LEASES) {
                    if (pruned.changed) saveLeases_(leases);
                    return busyOutcome_(conflicts.length ? conflicts : leases, null, false);
                }
                const token = uuid() + uuid();
                const lease = {
                    token: token,
                    service: service,
                    operation: operation,
                    requestId: requestId,
                    readResources: policy.readResources,
                    writeResources: policy.writeResources,
                    sharedWriteResources: policy.sharedWriteResources,
                    maintenance: policy.maintenance,
                    nestedActions: policy.nestedActions,
                    actor: actor,
                    phase: "active",
                    createdAt: currentTime,
                    expiresAt: currentTime + SHARED_MUTATION_LEASE_TTL_MS
                };
                leases.push(lease);
                saveLeases_(leases);
                try { recordServiceTrafficEvent_(service, currentTime); }
                catch (trafficError) { /* Métrica best-effort: no afecta la lease. */ }
                return { kind: "success", token: token, expiresAt: lease.expiresAt, actor: lease.actor || null };
            });

            if (outcome.kind === "success") {
                return { status: "success", token: outcome.token, expiresAt: outcome.expiresAt, actor: outcome.actor || null };
            }
            if (now() >= deadline) {
                if (maintenanceRequest) {
                    const finalOutcome = settleMaintenanceTimeout_(service, operation, requestId);
                    if (finalOutcome.kind === "success") {
                        return { status: "success", token: finalOutcome.token, expiresAt: finalOutcome.expiresAt, actor: finalOutcome.actor || null };
                    }
                    return {
                        status: "error",
                        code: "busy",
                        activeOperations: finalOutcome.activeOperations || [],
                        message: finalOutcome.message || "No se pudo completar el drenaje de operaciones antes de iniciar mantenimiento."
                    };
                }
                return {
                    status: "error",
                    code: "busy",
                    activeOperations: outcome.activeOperations || [],
                    message: outcome.message || "El recurso solicitado está ocupado por otra operación. Reintenta cuando finalice."
                };
            }
            sleep(250);
        }
    }

    function release_(service, operation, payload) {
        const token = String(payload.token || "").trim();
        if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) throw new Error("Token de lease inválido.");
        return withCoordinatorLock_(() => {
            const currentTime = now();
            const current = readLeases_();
            const pruned = pruneExpiredLeases_(current, currentTime);
            const index = pruned.leases.findIndex(lease => lease.token === token);
            if (index === -1) {
                if (pruned.changed) saveLeases_(pruned.leases);
                return { status: "success", released: false, alreadyReleasedOrExpired: true };
            }
            const lease = pruned.leases[index];
            if (lease.service !== service || lease.operation !== operation) {
                throw new Error("La operación no es propietaria de esta lease.");
            }
            pruned.leases.splice(index, 1);
            saveLeases_(pruned.leases);
            return { status: "success", released: true };
        });
    }

    function validate_(service, operation, payload) {
        const token = String(payload.token || "").trim();
        if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
            throw new Error("La autorización interna de coordinación no es válida.");
        }
        return withCoordinatorLock_(() => {
            const currentTime = now();
            const current = readLeases_();
            const pruned = pruneExpiredLeases_(current, currentTime);
            const lease = pruned.leases.find(item => item.token === token);
            if (pruned.changed) saveLeases_(pruned.leases);
            if (!lease) throw new Error("La autorización interna de coordinación no es válida o expiró.");
            if (lease.phase === "draining") throw new Error("La ventana de mantenimiento aún está drenando operaciones y no autoriza acciones.");

            const isOwnerAction = lease.service === service && lease.operation === operation;
            const allowedNested = Array.isArray(lease.nestedActions[service])
                && lease.nestedActions[service].includes(operation);
            if (!isOwnerAction && !allowedNested) {
                throw new Error("La lease no autoriza esta acción anidada.");
            }
            return {
                status: "success",
                valid: true,
                ownerService: lease.service,
                ownerOperation: lease.operation,
                expiresAt: lease.expiresAt,
                actor: lease.actor || null
            };
        });
    }


    function catalogChangeRevisions_() {
        const all = properties.getProperties();
        return Object.keys(all || {}).filter(key => key.indexOf(CATALOG_CHANGE_EVENT_PREFIX_) === 0)
            .map(key => Number(key.slice(CATALOG_CHANGE_EVENT_PREFIX_.length)))
            .filter(value => Number.isSafeInteger(value) && value > 0)
            .sort((a, b) => a - b);
    }

    function publishCatalogChange_(service, operation, payload) {
        const result = publishCatalogChanges_(service, operation, {
            requestId: payload && payload.requestId,
            changes: [payload && payload.change]
        });
        return {
            status: "success",
            revision: result.lastRevision,
            resetRequired: result.resetRequired,
            duplicate: result.duplicate === true,
            recoveredPartial: result.recoveredPartial === true
        };
    }

    function publishCatalogChanges_(service, operation, payload) {
        const allowed = CATALOG_CHANGE_ALLOWED_WRITERS_[service];
        if (!allowed || !allowed.has(operation)) throw new Error("La operación no puede publicar cambios del catálogo.");
        const sourcePayload = payload && typeof payload === "object" ? payload : {};
        const changes = Array.isArray(sourcePayload.changes) ? sourcePayload.changes : [];
        if (!changes.length || changes.length > 50) throw new Error("El lote de cambios del catálogo debe contener entre 1 y 50 registros.");
        const requestId = String(sourcePayload.requestId || "").trim();
        if (requestId && !/^[A-Za-z0-9_-]{8,128}$/.test(requestId)) {
            throw new Error("El identificador de la publicación del catálogo no es válido.");
        }
        const events = changes.map((sourceValue, index) => {
            const source = sourceValue && typeof sourceValue === "object" && !Array.isArray(sourceValue) ? sourceValue : {};
            let collection = String(source.collection || "").trim().toLowerCase();
            let recordId = String(source.recordId || "").trim();
            let changeOperation = String(source.operation || "").trim().toLowerCase();
            let snapshot = source.snapshot === undefined ? null : source.snapshot;
            if (changeOperation === "reset") {
                collection = "*"; recordId = "*"; snapshot = null;
            } else {
                if (!CATALOG_CHANGE_COLLECTIONS_.has(collection)) throw new Error("La colección del cambio de catálogo no es válida.");
                if (!recordId || recordId.length > 160) throw new Error("El ID del registro de catálogo no es válido.");
                if (changeOperation === "upsert") {
                    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) throw new Error("El cambio upsert requiere un snapshot de registro.");
                } else if (changeOperation === "delete") {
                    snapshot = null;
                } else {
                    throw new Error("La operación del cambio de catálogo no es válida.");
                }
            }
            const event = { collection, recordId, operation: changeOperation, snapshot,
                createdAt: new Date(now()).toISOString(), sourceService: service, sourceOperation: operation };
            if (requestId) {
                event.sourceRequestId = requestId;
                event.batchIndex = index;
                event.batchCount = changes.length;
            }
            let serialized = JSON.stringify(event), resetRequired = false;
            if (serialized.length > CATALOG_CHANGE_MAX_EVENT_LENGTH_) {
                event.collection = "*"; event.recordId = "*"; event.operation = "reset"; event.snapshot = null;
                serialized = JSON.stringify(event); resetRequired = true;
            }
            return { event, resetRequired };
        });

        return withCoordinatorLock_(() => {
            const revisions = catalogChangeRevisions_();
            const storedRevision = Number(properties.getProperty(CATALOG_CHANGE_REVISION_PROPERTY_) || 0);
            let currentRevision = Math.max(Number.isSafeInteger(storedRevision) ? storedRevision : 0,
                revisions.length ? revisions[revisions.length - 1] : 0);

            // UrlFetch puede perder la respuesta después de que el evento quedó guardado.
            // requestId hace idempotentes tanto el reintento de un evento como el lote.
            if (requestId) {
                const existing = [];
                revisions.forEach(revision => {
                    const raw = properties.getProperty(CATALOG_CHANGE_EVENT_PREFIX_ + revision);
                    if (!raw) return;
                    try {
                        const event = JSON.parse(raw);
                        if (event && event.sourceRequestId === requestId) existing.push(event);
                    } catch (error) { /* Un evento corrupto ya fuerza reset al leer el feed. */ }
                });
                const recovered = existing.find(event => event.recoveredPartial === true);
                if (recovered) {
                    return { status: "success", count: changes.length, firstRevision: recovered.revision,
                        lastRevision: recovered.revision, resetRequired: true, duplicate: true, recoveredPartial: true };
                }
                if (existing.length) {
                    const expectedCount = changes.length;
                    const batchCount = Number(existing[0].batchCount || 1);
                    const indexes = new Set(existing.map(event => Number(event.batchIndex)));
                    const complete = batchCount === expectedCount && existing.length === expectedCount &&
                        existing.every(event => Number(event.batchCount || 1) === expectedCount) &&
                        Array.from({ length: expectedCount }, (_, index) => indexes.has(index)).every(Boolean);
                    if (complete) {
                        const foundRevisions = existing.map(event => Number(event.revision));
                        return { status: "success", count: expectedCount,
                            firstRevision: Math.min.apply(null, foundRevisions),
                            lastRevision: Math.max.apply(null, foundRevisions),
                            resetRequired: existing.some(event => event.resetRequired === true),
                            duplicate: true, recoveredPartial: false };
                    }

                    // Un lote parcialmente persistido no se completa con snapshots antiguos:
                    // se publica reset para que el consumidor lea el estado actual completo.
                    if (!Number.isSafeInteger(currentRevision + 1)) throw new Error("La revisión del catálogo alcanzó su límite seguro.");
                    currentRevision++;
                    const resetEvent = {
                        revision: currentRevision, collection: "*", recordId: "*", operation: "reset", snapshot: null,
                        createdAt: new Date(now()).toISOString(), sourceService: service, sourceOperation: operation,
                        sourceRequestId: requestId, batchIndex: -1, batchCount: expectedCount,
                        recoveredPartial: true, resetRequired: true
                    };
                    properties.setProperty(CATALOG_CHANGE_EVENT_PREFIX_ + currentRevision, JSON.stringify(resetEvent));
                    properties.setProperty(CATALOG_CHANGE_REVISION_PROPERTY_, String(currentRevision));
                    const recoveredEvents = catalogChangeRevisions_();
                    while (recoveredEvents.length > CATALOG_CHANGE_MAX_EVENTS_) {
                        const oldest = recoveredEvents.shift();
                        properties.deleteProperty(CATALOG_CHANGE_EVENT_PREFIX_ + oldest);
                    }
                    return { status: "success", count: expectedCount, firstRevision: currentRevision,
                        lastRevision: currentRevision, resetRequired: true, duplicate: true, recoveredPartial: true };
                }
            }

            if (!Number.isSafeInteger(currentRevision + events.length)) {
                throw new Error("La revisión del catálogo alcanzó su límite seguro.");
            }
            const firstRevision = currentRevision + 1;
            events.forEach((item, index) => {
                currentRevision++;
                const storedEvent = Object.assign({}, item.event, { revision: currentRevision, resetRequired: item.resetRequired });
                properties.setProperty(CATALOG_CHANGE_EVENT_PREFIX_ + currentRevision, JSON.stringify(storedEvent));
            });
            properties.setProperty(CATALOG_CHANGE_REVISION_PROPERTY_, String(currentRevision));
            const after = catalogChangeRevisions_();
            while (after.length > CATALOG_CHANGE_MAX_EVENTS_) {
                const oldest = after.shift();
                properties.deleteProperty(CATALOG_CHANGE_EVENT_PREFIX_ + oldest);
            }
            return {
                status: "success", count: events.length, firstRevision, lastRevision: currentRevision,
                resetRequired: events.some(item => item.resetRequired),
                duplicate: false, recoveredPartial: false
            };
        });
    }

    function getCatalogChanges_(service, operation, payload) {
        if (!((service === "FEEDBACK" || service === "PUBLIC") && operation === "getCatalogChanges")) {
            throw new Error("La consulta incremental no está habilitada para este origen.");
        }
        const cursor = payload.cursor === undefined || payload.cursor === null || payload.cursor === "" ? 0 : Number(payload.cursor);
        const requestedLimit = payload.limit === undefined ? 50 : Number(payload.limit);
        if (!Number.isSafeInteger(cursor) || cursor < 0) throw new Error("El cursor del catálogo no es válido.");
        if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 50) throw new Error("El límite de cambios debe estar entre 1 y 50.");
        return withCoordinatorLock_(() => {
            // La lectura pública del feed ya está dentro del lock del coordinador:
            // se contabiliza aquí sin otro viaje de red ni un bloqueo adicional.
            try {
                const trafficService = service === "PUBLIC" ? "CATALOG" : service;
                recordServiceTrafficEvent_(trafficService, now(), operation);
            } catch (trafficError) { /* Telemetría best-effort: nunca bloquea el feed. */ }
            const revisions = catalogChangeRevisions_();
            const storedRevision = Number(properties.getProperty(CATALOG_CHANGE_REVISION_PROPERTY_) || 0);
            const currentRevision = Math.max(Number.isSafeInteger(storedRevision) ? storedRevision : 0, revisions.length ? revisions[revisions.length - 1] : 0);
            const minRevision = revisions.length ? revisions[0] : currentRevision + 1;
            if (cursor > currentRevision || (revisions.length && cursor < minRevision - 1)) {
                return { status: "success", resetRequired: true, changes: [], currentRevision, minRevision, nextCursor: currentRevision, hasMore: false };
            }
            const changes = [];
            const endRevision = Math.min(currentRevision, cursor + requestedLimit);
            for (let revision = cursor + 1; revision <= endRevision; revision++) {
                const raw = properties.getProperty(CATALOG_CHANGE_EVENT_PREFIX_ + revision);
                if (!raw) return { status: "success", resetRequired: true, changes: [], currentRevision, minRevision, nextCursor: currentRevision, hasMore: false };
                let event;
                try { event = JSON.parse(raw); } catch (error) {
                    return { status: "success", resetRequired: true, changes: [], currentRevision, minRevision, nextCursor: currentRevision, hasMore: false };
                }
                if (!event || event.revision !== revision) {
                    return { status: "success", resetRequired: true, changes: [], currentRevision, minRevision, nextCursor: currentRevision, hasMore: false };
                }
                changes.push(event);
            }
            const nextCursor = changes.length ? changes[changes.length - 1].revision : cursor;
            return { status: "success", resetRequired: changes.some(change => change.operation === "reset" || change.resetRequired === true), changes, currentRevision, minRevision, nextCursor, hasMore: nextCursor < currentRevision };
        });
    }

    function handleRequest(request) {
        if (!request || typeof request !== "object" || Array.isArray(request)) throw new Error("Solicitud inválida.");
        const protocolVersion = request.protocolVersion === undefined || request.protocolVersion === null
            ? SHARED_MUTATION_PROTOCOL_VERSION : Number(request.protocolVersion);
        if (!Number.isSafeInteger(protocolVersion) || protocolVersion !== SHARED_MUTATION_PROTOCOL_VERSION) {
            throw new Error("Versión de protocolo no compatible con este Coordinator.");
        }
        const action = String(request.action || "").trim();
        const payload = request.payload && typeof request.payload === "object" && !Array.isArray(request.payload)
            ? request.payload : {};
        const service = authenticate_(payload);
        const operation = String(payload.operation || "").trim();

        if (action === "acquire") return acquire_(service, operation, payload);
        if (action === "release") return release_(service, operation, payload);
        if (action === "validate") return validate_(service, operation, payload);
        if (action === "publishCatalogChange") return publishCatalogChange_(service, operation, payload);
        if (action === "publishCatalogChanges") return publishCatalogChanges_(service, operation, payload);
        if (action === "getCatalogChanges") return getCatalogChanges_(service, operation, payload);
        if (action === "registerSession") return registerSession_(service, operation, payload);
        if (action === "syncUserSessions") return syncUserSessions_(service, operation, payload);
        if (action === "revokeSession") return revokeSession_(service, operation, payload);
        if (action === "revokeUserSessions") return revokeUserSessions_(service, operation, payload);
        if (action === "validateSessionContext") return validateSessionContext_(service, operation, payload);
        if (action === "invalidateSessionActorCaches") return invalidateSessionActorCaches_(service, operation, payload);
        if (action === "getServiceTraffic") return readServiceTraffic_(service, operation);
        throw new Error("Acción interna desconocida para el coordinador.");
    }

    return {
        handleRequest: handleRequest,
        // Feed público: solo expone los eventos ya publicados de colecciones del catálogo.
        // Las escrituras y las operaciones de sesión continúan en el canal POST autenticado.
        getPublicCatalogChanges: function(payload) {
            return getCatalogChanges_("PUBLIC", "getCatalogChanges", payload || {});
        }
    };
}

function doGet(e) {
    const parameters = e && e.parameter && typeof e.parameter === "object" ? e.parameter : {};
    if (String(parameters.catalogFeed || "") === "1") {
        let response;
        try {
            const coordinator = createSharedMutationCoordinator_({
                properties: PropertiesService.getScriptProperties(),
                lockService: LockService,
                now: function() { return Date.now(); },
                uuid: function() { return Utilities.getUuid(); },
                sleep: function(milliseconds) { Utilities.sleep(milliseconds); }
            });
            response = coordinator.getPublicCatalogChanges({
                cursor: parameters.cursor,
                limit: parameters.limit
            });
        } catch (error) {
            response = { status: "error", message: error && error.message ? error.message : "No se pudo consultar el catálogo." };
        }
        return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        service: "GPSpedia-SharedMutationCoordinator",
        version: SHARED_MUTATION_COORDINATOR_VERSION
    })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
    let response;
    try {
        const request = JSON.parse(e && e.postData && e.postData.contents || "{}");
        const coordinator = createSharedMutationCoordinator_({
            properties: PropertiesService.getScriptProperties(),
            lockService: LockService,
            now: function() { return Date.now(); },
            uuid: function() { return Utilities.getUuid(); },
            sleep: function(milliseconds) { Utilities.sleep(milliseconds); },
            fetch: function(url, options) { return UrlFetchApp.fetch(url, options); },
            fetchAll: function(requests) { return UrlFetchApp.fetchAll(requests); }
        });
        response = coordinator.handleRequest(request);
    } catch (error) {
        response = { status: "error", message: error && error.message ? error.message : "Solicitud rechazada." };
    }
    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}
