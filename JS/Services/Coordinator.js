// ============================================================================
// GPSpedia — Coordinador compartido de mutaciones entre proyectos Apps Script
// No accede a Spreadsheet ni Drive. El estado de leases vive en ScriptProperties.
// ============================================================================

const SHARED_MUTATION_COORDINATOR_VERSION = "1.3.0";
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
const SHARED_AUTH_IDLE_MONTHS_ = 1;
const SHARED_AUTH_ABSOLUTE_MONTHS_ = 3;
const SHARED_AUTH_TOUCH_INTERVAL_MS_ = 5 * 60 * 1000;
const CATALOG_CHANGE_ALLOWED_WRITERS_ = Object.freeze({
    WRITE: new Set(["addOrUpdateCut","addSupplementaryInfo","addVinToVehicle","freezeCortesIds"]),
    FEEDBACK: new Set(["recordLike","suggestYear","addProblem","addSolution","addPrevention","addVehicleToProblem","removeVehicleFromProblem","updatePysItem","addTutorial","updateTutorialItem","approveVideo","rejectVideo"]),
    ADMIN: new Set(["addLogo","updateVehicleField","uploadAdminImage","normalizeImages","organizePrimaryVehicleImages","recoverReplacedImage","deleteReplacedImage","restoreReplacedImageFromTrash","moveReplacedImage","applyCortesImageReconciliation","restoreDatabase","reorganizeDatabase","migrateIdentifiers","rollbackIdentifiers","reconcilePendingImageUploads"])
});

function coordinatorPolicy_(service, operation) {
    const identityRead = ["USERS", "ACTIVE_SESSIONS"];
    const identityWrite = ["USERS", "ACTIVE_SESSIONS", "LOGS"];
    const feedbackRead = identityRead;
    const feedbackWrite = ["ACTIVE_SESSIONS", "FEEDBACK", "ACTIVITY"];

    const policies = {
        AUTH: {
            login: { write: identityWrite },
            // AUTH valida ActiveSessions en modo cooperativo, sin tocar LastActivityAt, y guarda la aceptación en Users.
            // Puede coexistir con ADMIN/sessionActivity, pero no con escrituras exclusivas de sesión.
            acceptTerms: { read: ["ACTIVE_SESSIONS"], write: ["USERS"], sharedWrite: ["ACTIVE_SESSIONS"] },
            touchSession: { write: identityWrite },
            changePassword: { write: identityWrite },
            resetUserPassword: { write: identityWrite },
            resetUserSessions: { write: ["ACTIVE_SESSIONS", "LOGS"] },
            clearSensitiveLogs: { read: identityRead, write: ["LOGS"] },
            deleteUser: { write: identityWrite },
            updateUser: { write: identityWrite },
            logout: { write: identityWrite },
            migrateLegacyPasswords: { write: identityWrite },
            migrateLegacyRoleRevocationMarkersToSharedState: { write: ["USERS", "LOGS"] }
        },
        USERS: {
            sessionActivity: { write: ["ACTIVE_SESSIONS"] },
            createUser: { read: ["ACTIVE_SESSIONS"], write: ["ACTIVE_SESSIONS", "USERS"] },
            updateProfile: { read: ["ACTIVE_SESSIONS"], write: ["ACTIVE_SESSIONS", "USERS"] }
        },
        UTILITIES: {
            migrateTimestamps: { read: ["ACTIVE_SESSIONS", "CORTES", "DRIVE"], write: ["UTILITIES"] }
        },
        WRITE: {
            sessionActivity: { write: ["ACTIVE_SESSIONS"] },
            addOrUpdateCut: { read: identityRead, write: ["ACTIVE_SESSIONS", "CORTES", "DRIVE", "IDEMPOTENCIA", "IMAGE_UPLOAD_LEDGER"] },
            addSupplementaryInfo: { read: identityRead, write: ["ACTIVE_SESSIONS", "CORTES", "DRIVE", "IMAGE_UPLOAD_LEDGER"] },
            addVinToVehicle: { read: identityRead, write: ["ACTIVE_SESSIONS", "CORTES"] },
            allocateVehicleId: { read: identityRead, write: ["ACTIVE_SESSIONS", "CORTES"] },
            freezeCortesIds: { read: identityRead, write: ["ACTIVE_SESSIONS", "CORTES"] }
        },
        ADMIN: {
            sessionActivity: { sharedWrite: ["ACTIVE_SESSIONS"] },
            // Las consultas y el escáner comparten la actualización cooperativa de LastActivityAt.
            // Sus lecturas prolongadas no deben quedar etiquetadas como ADMIN/sessionActivity.
            getReplacedImages: { read: ["USERS", "CORTES", "DRIVE", "IMAGE_INVENTORY", "TUTORIAL", "FEEDBACK", "LOGOS"], sharedWrite: ["ACTIVE_SESSIONS"] },
            getDriveStorage: { read: ["USERS", "DRIVE"], sharedWrite: ["ACTIVE_SESSIONS"] },
            getCortesImageFolders: { read: ["USERS", "DRIVE"], sharedWrite: ["ACTIVE_SESSIONS"] },
            auditDriveImagesInCortes: {
                read: ["USERS", "CORTES", "DRIVE", "IMAGE_INVENTORY", "TUTORIAL", "FEEDBACK", "LOGOS"],
                sharedWrite: ["ACTIVE_SESSIONS"],
                write: ["IMAGE_AUDIT_STATE"]
            },
            migrateReplacedImagesSchema: { read: ["USERS"], sharedWrite: ["ACTIVE_SESSIONS"], write: ["IMAGE_INVENTORY"] },
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
                write: ["ACTIVE_SESSIONS", "CORTES", "DRIVE", "IDEMPOTENCIA", "IMAGE_UPLOAD_LEDGER"],
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
            getReplacedImageDownloadUrl: { read: [...identityRead, "DRIVE"], write: ["ACTIVITY"] }
        },
        FEEDBACK: {
            sessionActivity: { write: ["ACTIVE_SESSIONS"] },
            recordLike: { read: feedbackRead, write: [...feedbackWrite, "CORTES"] },
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
            replyToFeedback: { read: feedbackRead, write: feedbackWrite },
            markAsResolved: { read: feedbackRead, write: feedbackWrite },
            deleteFeedbackItem: { read: feedbackRead, write: feedbackWrite },
            clearActivityLogs: { read: feedbackRead, write: ["ACTIVITY"] },
            submitVideoForApproval: { read: [...feedbackRead, "TUTORIAL"], write: feedbackWrite },
            approveVideo: { read: [...feedbackRead, "TUTORIAL"], write: ["CORTES", "TUTORIAL", ...feedbackWrite] },
            rejectVideo: { read: [...feedbackRead, "TUTORIAL"], write: ["TUTORIAL", ...feedbackWrite] },
            createInboxConversation: { read: feedbackRead, write: ["ACTIVE_SESSIONS", "FEEDBACK"] },
            sendInboxMessage: { read: feedbackRead, write: ["ACTIVE_SESSIONS", "FEEDBACK"] },
            markInboxRead: { read: feedbackRead, write: ["ACTIVE_SESSIONS", "FEEDBACK"] },
            archiveInboxConversation: { read: feedbackRead, write: ["ACTIVE_SESSIONS", "FEEDBACK"] },
            closeInboxConversation: { read: feedbackRead, write: ["ACTIVE_SESSIONS", "FEEDBACK"] }
        }
    };

    const servicePolicies = policies[service];
    const policy = servicePolicies && servicePolicies[operation];
    if (!policy) throw new Error("La acción no está habilitada en la política del coordinador.");

    const writeResources = (policy.write || []).slice();
    const sharedWriteResources = (policy.sharedWrite || []).slice();
    if (service === "ADMIN" && !writeResources.includes("ACTIVE_SESSIONS") &&
        !sharedWriteResources.includes("ACTIVE_SESSIONS")) {
        sharedWriteResources.push("ACTIVE_SESSIONS");
    }
    if (service === "AUTH" && operation !== "acceptTerms" && !writeResources.includes("ACTIVE_SESSIONS")) {
        writeResources.push("ACTIVE_SESSIONS");
    }
    return {
        readResources: (policy.read || []).slice(),
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
                return { kind: "success", token: ownLease.token, expiresAt: ownLease.expiresAt };
            }
            const active = pruned.leases.filter(lease => lease.token !== ownLease.token);
            if (!active.length) {
                ownLease.phase = "active";
                ownLease.expiresAt = now() + SHARED_MUTATION_LEASE_TTL_MS;
                saveLeases_(pruned.leases);
                return { kind: "success", token: ownLease.token, expiresAt: ownLease.expiresAt };
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

    function readAuthContext_(userId) {
        const raw = properties.getProperty(authContextKey_(userId));
        if (!raw) return null;
        let context;
        try { context = JSON.parse(raw); }
        catch (error) { throw new Error("El contexto compartido de sesión está dañado; el acceso permanece denegado."); }
        if (!context || typeof context !== "object" || Array.isArray(context) ||
            context.schemaVersion !== 1 || context.userId !== String(userId) ||
            !Number.isSafeInteger(context.epoch) || context.epoch < 1 ||
            !Array.isArray(context.sessions) || context.sessions.length > 5) {
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

    function saveAuthContext_(context) {
        const serialized = JSON.stringify(context);
        if (serialized.length > SHARED_AUTH_CONTEXT_MAX_LENGTH_) {
            throw new Error("El contexto compartido de sesión superó el tamaño permitido; no se concedió acceso.");
        }
        properties.setProperty(authContextKey_(context.userId), serialized);
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
            const priorSessions = context.sessions.slice();
            context.sessions = context.sessions.filter(session =>
                currentTime < addUtcMonths_(session.createdAt, SHARED_AUTH_ABSOLUTE_MONTHS_) &&
                currentTime < addUtcMonths_(session.lastActivityAt, SHARED_AUTH_IDLE_MONTHS_));
            const activeTokens = new Set(context.sessions.map(session => session.token));
            priorSessions.forEach(session => {
                if (!activeTokens.has(session.token) &&
                    String(properties.getProperty(authTokenIndexKey_(session.token)) || "") === userId) {
                    properties.deleteProperty(authTokenIndexKey_(session.token));
                }
            });
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
            if (context.sessions.length >= 5) {
                throw new Error("El contexto compartido alcanzó el límite seguro de sesiones activas.");
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
            if (!context) return { status: "success", revoked: false, alreadyRevoked: true };
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


    function validateSessionContext_(service, operation, payload) {
        if (service !== "AUTH" || operation !== "validateSessionContext") {
            throw new Error("Solo AUTH puede consultar la restauración de sesión.");
        }
        const userId = String(payload.userId || "").trim();
        const token = String(payload.sessionToken || "");
        if (!userId || !token) throw new Error("La validación requiere userId y sessionToken.");
        return withCoordinatorLock_(() => ({
            status: "success",
            valid: true,
            actor: authorizeSession_(userId, token, now())
        }));
    }

    function authorizeSession_(userId, token, currentTime) {
        const context = readAuthContext_(userId);
        if (!context) throw new Error("La sesión no está registrada en el contexto compartido; inicia sesión nuevamente.");
        const matches = context.sessions.filter(session => constantTimeEquals_(session.token, token));
        if (matches.length !== 1) throw new Error("La sesión fue revocada, no existe o no es única.");
        const session = matches[0];
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
                return { kind: "success", token: token, expiresAt: lease.expiresAt, actor: lease.actor || null };
            });

            if (outcome.kind === "success") {
                return { status: "success", token: outcome.token, expiresAt: outcome.expiresAt, actor: outcome.actor || null };
            }
            if (now() >= deadline) {
                if (maintenanceRequest) {
                    const finalOutcome = settleMaintenanceTimeout_(service, operation, requestId);
                    if (finalOutcome.kind === "success") {
                        return { status: "success", token: finalOutcome.token, expiresAt: finalOutcome.expiresAt };
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
        const allowed = CATALOG_CHANGE_ALLOWED_WRITERS_[service];
        if (!allowed || !allowed.has(operation)) throw new Error("La operación no puede publicar cambios del catálogo.");
        const source = payload.change && typeof payload.change === "object" ? payload.change : {};
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
        const event = { collection, recordId, operation: changeOperation, snapshot, createdAt: new Date(now()).toISOString(), sourceService: service, sourceOperation: operation };
        let serialized = JSON.stringify(event);
        let resetRequired = false;
        if (serialized.length > CATALOG_CHANGE_MAX_EVENT_LENGTH_) {
            event.collection = "*"; event.recordId = "*"; event.operation = "reset"; event.snapshot = null;
            serialized = JSON.stringify(event); resetRequired = true;
        }
        return withCoordinatorLock_(() => {
            const revisions = catalogChangeRevisions_();
            const storedRevision = Number(properties.getProperty(CATALOG_CHANGE_REVISION_PROPERTY_) || 0);
            const currentRevision = Math.max(Number.isSafeInteger(storedRevision) ? storedRevision : 0, revisions.length ? revisions[revisions.length - 1] : 0);
            const revision = currentRevision + 1;
            properties.setProperty(CATALOG_CHANGE_EVENT_PREFIX_ + revision, JSON.stringify({ revision, ...event, resetRequired }));
            properties.setProperty(CATALOG_CHANGE_REVISION_PROPERTY_, String(revision));
            const after = catalogChangeRevisions_();
            while (after.length > CATALOG_CHANGE_MAX_EVENTS_) {
                const oldest = after.shift();
                properties.deleteProperty(CATALOG_CHANGE_EVENT_PREFIX_ + oldest);
            }
            return { status: "success", revision, resetRequired };
        });
    }

    function getCatalogChanges_(service, operation, payload) {
        if (service !== "FEEDBACK" || operation !== "getCatalogChanges") {
            throw new Error("La consulta incremental solo está habilitada para FEEDBACK.");
        }
        const cursor = payload.cursor === undefined || payload.cursor === null || payload.cursor === "" ? 0 : Number(payload.cursor);
        const requestedLimit = payload.limit === undefined ? 50 : Number(payload.limit);
        if (!Number.isSafeInteger(cursor) || cursor < 0) throw new Error("El cursor del catálogo no es válido.");
        if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 50) throw new Error("El límite de cambios debe estar entre 1 y 50.");
        return withCoordinatorLock_(() => {
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
        if (!request || typeof request !== "object") throw new Error("Solicitud inválida.");
        const action = String(request.action || "").trim();
        const payload = request.payload && typeof request.payload === "object" ? request.payload : {};
        const service = authenticate_(payload);
        const operation = String(payload.operation || "").trim();

        if (action === "acquire") return acquire_(service, operation, payload);
        if (action === "release") return release_(service, operation, payload);
        if (action === "validate") return validate_(service, operation, payload);
        if (action === "publishCatalogChange") return publishCatalogChange_(service, operation, payload);
        if (action === "getCatalogChanges") return getCatalogChanges_(service, operation, payload);
        if (action === "registerSession") return registerSession_(service, operation, payload);
        if (action === "revokeSession") return revokeSession_(service, operation, payload);
        if (action === "revokeUserSessions") return revokeUserSessions_(service, operation, payload);
        if (action === "validateSessionContext") return validateSessionContext_(service, operation, payload);
        throw new Error("Acción interna desconocida para el coordinador.");
    }

    return { handleRequest: handleRequest };
}

function doGet() {
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
            sleep: function(milliseconds) { Utilities.sleep(milliseconds); }
        });
        response = coordinator.handleRequest(request);
    } catch (error) {
        response = { status: "error", message: error && error.message ? error.message : "Solicitud rechazada." };
    }
    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}
