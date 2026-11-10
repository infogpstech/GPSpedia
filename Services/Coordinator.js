// ============================================================================
// GPSpedia — Coordinador compartido de mutaciones entre proyectos Apps Script
// No accede a Spreadsheet ni Drive. El estado de leases vive en ScriptProperties.
// ============================================================================

const SHARED_MUTATION_COORDINATOR_VERSION = "1.1.0";
const SHARED_MUTATION_LEASES_PROPERTY = "GPSpedia_SHARED_MUTATION_LEASES";
const SHARED_MUTATION_LEASE_TTL_MS = 45 * 60 * 1000;
const SHARED_MUTATION_MAX_WAIT_MS = 15000;
const SHARED_MUTATION_MAX_ACTIVE_LEASES = 20;
const SHARED_MUTATION_MAX_STATE_LENGTH = 8000;

function coordinatorPolicy_(service, operation) {
    const identityRead = ["USERS", "ACTIVE_SESSIONS"];
    const identityWrite = ["USERS", "ACTIVE_SESSIONS", "LOGS"];
    const feedbackRead = identityRead;
    const feedbackWrite = ["FEEDBACK", "ACTIVITY"];

    const policies = {
        AUTH: {
            login: { write: identityWrite },
            validateSession: { write: identityWrite },
            touchSession: { write: identityWrite },
            changePassword: { write: identityWrite },
            resetUserPassword: { write: identityWrite },
            resetUserSessions: { write: ["ACTIVE_SESSIONS", "LOGS"] },
            clearSensitiveLogs: { read: identityRead, write: ["LOGS"] },
            deleteUser: { write: identityWrite },
            updateUser: { write: identityWrite },
            logout: { write: identityWrite },
            migrateLegacyRoleRevocationMarkersToSharedState: { write: ["USERS", "LOGS"] }
        },
        USERS: {
            createUser: { read: ["ACTIVE_SESSIONS"], write: ["USERS"] },
            updateProfile: { read: ["ACTIVE_SESSIONS"], write: ["USERS"] }
        },
        WRITE: {
            addOrUpdateCut: { read: identityRead, write: ["CORTES", "DRIVE", "IDEMPOTENCIA"] },
            addSupplementaryInfo: { read: identityRead, write: ["CORTES", "DRIVE"] },
            addVinToVehicle: { read: identityRead, write: ["CORTES"] },
            allocateVehicleId: { read: identityRead, write: ["CORTES"] },
            freezeCortesIds: { read: identityRead, write: ["CORTES"] }
        },
        ADMIN: {
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
            migrateCortesOperationIds: { read: identityRead, write: ["CORTES", "IDEMPOTENCIA"] },
            addOrUpdateCut: {
                read: identityRead,
                write: ["CORTES", "DRIVE", "IDEMPOTENCIA"],
                nestedActions: { WRITE: ["allocateVehicleId"] }
            },
            addSupplementaryInfo: { read: identityRead, write: ["CORTES", "DRIVE"] },
            createSheet: { maintenance: true },
            addColumn: { maintenance: true },
            driveCommand: { read: identityRead, write: ["DRIVE"] },
            recoverReplacedImage: { read: identityRead, write: ["CORTES", "DRIVE", "IMAGE_INVENTORY"] },
            deleteReplacedImage: { read: identityRead, write: ["CORTES", "DRIVE", "IMAGE_INVENTORY", "ACTIVITY"] },
            saveUnusedImagesInventory: { read: identityRead, write: ["DRIVE", "IMAGE_INVENTORY", "ACTIVITY"] },
            createCortesImageFolder: { read: identityRead, write: ["DRIVE", "ACTIVITY"] },
            moveReplacedImage: { read: identityRead, write: ["CORTES", "DRIVE", "IMAGE_INVENTORY", "ACTIVITY"] },
            getReplacedImageDownloadUrl: { read: [...identityRead, "DRIVE"], write: ["ACTIVITY"] }
        },
        FEEDBACK: {
            recordLike: { read: feedbackRead, write: ["CORTES", "ACTIVITY"] },
            reportProblem: { read: feedbackRead, write: feedbackWrite },
            addProblem: { read: feedbackRead, write: [...feedbackWrite, "DRIVE"] },
            addSolution: { read: feedbackRead, write: feedbackWrite },
            addPrevention: { read: feedbackRead, write: feedbackWrite },
            addVehicleToProblem: { read: feedbackRead, write: feedbackWrite },
            removeVehicleFromProblem: { read: feedbackRead, write: feedbackWrite },
            updatePysItem: { read: feedbackRead, write: feedbackWrite },
            updateTutorialItem: { read: feedbackRead, write: feedbackWrite },
            suggestCutChange: { read: feedbackRead, write: [...feedbackWrite, "DRIVE"] },
            assignCollaborator: { read: feedbackRead, write: ["CORTES", ...feedbackWrite] },
            suggestYear: { read: feedbackRead, write: ["CORTES", ...feedbackWrite] },
            addTutorial: { read: feedbackRead, write: feedbackWrite },
            sendContactForm: { write: ["FEEDBACK"] },
            replyToFeedback: { read: feedbackRead, write: feedbackWrite },
            markAsResolved: { read: feedbackRead, write: feedbackWrite },
            deleteFeedbackItem: { read: feedbackRead, write: feedbackWrite },
            clearActivityLogs: { read: feedbackRead, write: ["ACTIVITY"] },
            submitVideoForApproval: { read: feedbackRead, write: feedbackWrite },
            approveVideo: { read: feedbackRead, write: ["CORTES", ...feedbackWrite] },
            rejectVideo: { read: feedbackRead, write: feedbackWrite }
        }
    };

    const servicePolicies = policies[service];
    const policy = servicePolicies && servicePolicies[operation];
    if (!policy) throw new Error("La acción no está habilitada en la política del coordinador.");

    return {
        readResources: (policy.read || []).slice(),
        writeResources: (policy.write || []).slice(),
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
        if (!["ADMIN", "WRITE", "FEEDBACK", "AUTH", "USERS"].includes(service)) {
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
                !Array.isArray(lease.writeResources) || typeof lease.maintenance !== "boolean" ||
                typeof lease.expiresAt !== "number" || !lease.nestedActions ||
                typeof lease.nestedActions !== "object") {
                throw new Error("El estado del coordinador contiene una lease inválida; las operaciones permanecen bloqueadas.");
            }
            if (![...lease.readResources, ...lease.writeResources].every(item => typeof item === "string")) {
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
        if (intersects_(requested.writeResources, [...active.readResources, ...active.writeResources])) return true;
        if (intersects_(requested.readResources, active.writeResources)) return true;
        return false;
    }

    function acquire_(service, operation, payload) {
        const policy = coordinatorPolicy_(service, operation);
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
                const current = readLeases_();
                const pruned = pruneExpiredLeases_(current, currentTime);
                const leases = pruned.leases;
                const existing = leases.find(lease => lease.service === service && lease.requestId === requestId);

                if (existing) {
                    if (existing.operation !== operation) {
                        throw new Error("El identificador de solicitud ya pertenece a otra operación.");
                    }
                    if (pruned.changed) saveLeases_(leases);
                    return { kind: "success", token: existing.token, expiresAt: existing.expiresAt };
                }

                const conflict = leases.some(lease => hasConflict_(policy, lease));
                if (conflict || leases.length >= SHARED_MUTATION_MAX_ACTIVE_LEASES) {
                    if (pruned.changed) saveLeases_(leases);
                    return { kind: "busy" };
                }

                const token = uuid() + uuid();
                const lease = {
                    token: token,
                    service: service,
                    operation: operation,
                    requestId: requestId,
                    readResources: policy.readResources,
                    writeResources: policy.writeResources,
                    maintenance: policy.maintenance,
                    nestedActions: policy.nestedActions,
                    createdAt: currentTime,
                    expiresAt: currentTime + SHARED_MUTATION_LEASE_TTL_MS
                };
                leases.push(lease);
                saveLeases_(leases);
                return { kind: "success", token: token, expiresAt: lease.expiresAt };
            });

            if (outcome.kind === "success") {
                return { status: "success", token: outcome.token, expiresAt: outcome.expiresAt };
            }
            if (now() >= deadline) {
                return {
                    status: "error",
                    code: "busy",
                    message: "El recurso solicitado está ocupado por otra operación. Reintenta cuando finalice."
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
                expiresAt: lease.expiresAt
            };
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
