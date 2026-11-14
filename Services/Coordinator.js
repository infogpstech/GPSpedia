// ============================================================================
// GPSpedia — Coordinador compartido de mutaciones entre proyectos Apps Script
// No accede a Spreadsheet ni Drive. El estado de leases vive en ScriptProperties.
// ============================================================================

const SHARED_MUTATION_COORDINATOR_VERSION = "1.1.2";
const SHARED_MUTATION_LEASES_PROPERTY = "GPSpedia_SHARED_MUTATION_LEASES";
const SHARED_MUTATION_LEASE_TTL_MS = 45 * 60 * 1000;
const SHARED_MUTATION_DRAIN_RESERVATION_TTL_MS = 60 * 1000;
const SHARED_MUTATION_MAX_WAIT_MS = 15000;
const SHARED_MUTATION_MAX_ACTIVE_LEASES = 20;
const SHARED_MUTATION_MAX_STATE_LENGTH = 8000;

function coordinatorPolicy_(service, operation) {
    const identityRead = ["USERS", "ACTIVE_SESSIONS"];
    const identityWrite = ["USERS", "ACTIVE_SESSIONS", "LOGS"];
    const feedbackRead = identityRead;
    const feedbackWrite = ["ACTIVE_SESSIONS", "FEEDBACK", "ACTIVITY"];

    const policies = {
        AUTH: {
            login: { write: identityWrite },
            acceptTerms: { write: identityWrite },
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
        UTILITIES: {
            migrateTimestamps: { read: [...identityRead, "CORTES", "DRIVE"], write: ["UTILITIES"] }
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
            recordLike: { read: feedbackRead, write: ["CORTES", "FEEDBACK", "ACTIVITY"] },
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
            archiveInboxConversation: { read: feedbackRead, write: ["ACTIVE_SESSIONS", "FEEDBACK"] }
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
                !Array.isArray(lease.writeResources) || typeof lease.maintenance !== "boolean" ||
                typeof lease.expiresAt !== "number" || !lease.nestedActions ||
                typeof lease.nestedActions !== "object" ||
                (lease.phase !== undefined && lease.phase !== "active" && lease.phase !== "draining")) {
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
                                return { kind: "success", token: existing.token, expiresAt: existing.expiresAt };
                            }
                            if (pruned.changed) saveLeases_(leases);
                            return busyOutcome_(active, null, true);
                        }
                    } else if (existing.phase === "draining") {
                        throw new Error("La lease de mantenimiento aún no está activa.");
                    }
                    if (pruned.changed) saveLeases_(leases);
                    return { kind: "success", token: existing.token, expiresAt: existing.expiresAt };
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
                        return { kind: "success", token: token, expiresAt: lease.expiresAt };
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
                    maintenance: policy.maintenance,
                    nestedActions: policy.nestedActions,
                    phase: "active",
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
