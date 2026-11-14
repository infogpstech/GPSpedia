// ============================================================================
// Pruebas aisladas del coordinador compartido GPSpedia.
// No accede a deployments, Spreadsheet ni Drive.
// ============================================================================

function runSharedMutationCoordinatorTests() {
    const results = [];
    let passed = 0;
    let failed = 0;

    function assert_(condition, message) {
        if (!condition) throw new Error(message || "Aserción fallida.");
    }

    function expectThrow_(callback, expectedText) {
        let thrown = null;
        try { callback(); } catch (error) { thrown = error; }
        assert_(!!thrown, "Se esperaba que la operación fuera rechazada.");
        if (expectedText) assert_(String(thrown.message || thrown).includes(expectedText), "Error inesperado: " + String(thrown.message || thrown));
    }

    function createRuntime_(sleepHook) {
        const store = {};
        let clock = 1700000000000;
        let sequence = 0;
        const properties = {
            getProperty: key => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
            setProperty: (key, value) => { store[key] = String(value); return properties; },
            deleteProperty: key => { delete store[key]; return properties; }
        };
        const lock = { tryLock: () => true, releaseLock: () => {} };
        const lockService = { getScriptLock: () => lock };
        const uuid = () => {
            sequence++;
            return "00000000-0000-4000-8000-" + String(sequence).padStart(12, "0");
        };
        const secrets = {
            ADMIN: "A".repeat(40), WRITE: "W".repeat(40), FEEDBACK: "F".repeat(40),
            AUTH: "H".repeat(40), USERS: "U".repeat(40), UTILITIES: "T".repeat(40)
        };
        Object.keys(secrets).forEach(service => properties.setProperty("GPSpedia_COORDINATOR_SECRET_" + service, secrets[service]));
        const coordinator = createSharedMutationCoordinator_({
            properties: properties,
            lockService: lockService,
            now: () => clock,
            uuid: uuid,
            sleep: milliseconds => { clock += milliseconds; if (typeof sleepHook === "function") sleepHook(milliseconds); }
        });

        function request(action, service, operation, extra) {
            return coordinator.handleRequest({
                action: action,
                payload: Object.assign({ service, operation, secret: secrets[service] }, extra || {})
            });
        }

        return {
            properties, secrets, coordinator, request, uuid,
            advance: milliseconds => { clock += milliseconds; },
            makeClient: function(service) {
                properties.setProperty("GPSpedia_COORDINATOR_URL", "https://script.google.com/macros/s/TEST_DEPLOYMENT/exec");
                properties.setProperty("GPSpedia_COORDINATOR_SECRET", secrets[service]);
                return createSharedMutationClient_({
                    properties,
                    uuid,
                    logger: function() {},
                    fetch: function(url, options) {
                        let result;
                        try { result = coordinator.handleRequest(JSON.parse(options.payload)); }
                        catch (error) { result = { status: "error", message: error.message }; }
                        return { getResponseCode: () => 200, getContentText: () => JSON.stringify(result) };
                    }
                });
            }
        };
    }

    function test_(name, callback) {
        try {
            callback();
            passed++;
            results.push({ name, status: "PASS" });
        } catch (error) {
            failed++;
            results.push({ name, status: "FAIL", message: String(error.message || error) });
        }
    }

    function acquire_(runtime, service, operation, requestId, waitMs) {
        return runtime.request("acquire", service, operation, {
            requestId: requestId || runtime.uuid(),
            waitMs: waitMs === undefined ? 0 : waitMs
        });
    }

    function release_(runtime, service, operation, token) {
        return runtime.request("release", service, operation, { token });
    }

    test_("Rechaza secretos incorrectos y servicios no autorizados", function() {
        const r = createRuntime_();
        expectThrow_(() => r.coordinator.handleRequest({
            action: "acquire",
            payload: { service: "WRITE", operation: "addOrUpdateCut", secret: "incorrecto", requestId: r.uuid(), waitMs: 0 }
        }), "no autorizado");
        expectThrow_(() => r.coordinator.handleRequest({
            action: "acquire",
            payload: { service: "UTILITIES", operation: "migrateTimestamps", secret: "U".repeat(40), requestId: r.uuid(), waitMs: 0 }
        }), "no autorizado");
    });

    test_("Deny-by-default: rechaza operaciones no registradas", function() {
        const r = createRuntime_();
        expectThrow_(() => acquire_(r, "WRITE", "migrateYearRanges"), "política");
        expectThrow_(() => acquire_(r, "FEEDBACK", "unknownMutation"), "política");
    });

    test_("WRITE y FEEDBACK no pueden mutar Cortes simultáneamente", function() {
        const r = createRuntime_();
        const write = acquire_(r, "WRITE", "addOrUpdateCut");
        assert_(write.status === "success", "WRITE debía obtener lease.");
        const feedback = acquire_(r, "FEEDBACK", "suggestYear");
        assert_(feedback.status === "error" && feedback.code === "busy", "FEEDBACK debía esperar por Cortes.");
        release_(r, "WRITE", "addOrUpdateCut", write.token);
    });

    test_("ADMIN y FEEDBACK no pueden mutar el mismo árbol Drive simultáneamente", function() {
        const r = createRuntime_();
        const admin = acquire_(r, "ADMIN", "restoreDrive");
        assert_(admin.status === "success", "ADMIN debía obtener lease.");
        const feedback = acquire_(r, "FEEDBACK", "addProblem");
        assert_(feedback.status === "error" && feedback.code === "busy", "FEEDBACK debía esperar por Drive.");
        release_(r, "ADMIN", "restoreDrive", admin.token);
    });

    test_("FEEDBACK actualiza actividad y serializa escrituras con lecturas de identidad", function() {
        const r = createRuntime_();
        const feedback = acquire_(r, "FEEDBACK", "reportProblem");
        assert_(feedback.status === "success", "FEEDBACK debía obtener lease.");
        const write = acquire_(r, "WRITE", "addOrUpdateCut");
        assert_(write.status === "error" && write.code === "busy",
            "WRITE debe esperar mientras FEEDBACK actualiza LastActivityAt y WRITE lee ActiveSessions.");
        release_(r, "FEEDBACK", "reportProblem", feedback.token);
        const retry = acquire_(r, "WRITE", "addOrUpdateCut");
        assert_(retry.status === "success", "WRITE debe continuar tras liberar la actualización de actividad.");
        release_(r, "WRITE", "addOrUpdateCut", retry.token);
    });

    test_("validateSession es de solo lectura; touchSession sigue serializando cambios de identidad", function() {
        const r = createRuntime_();
        expectThrow_(() => coordinatorPolicy_("AUTH", "validateSession"), "no está habilitada");
        const touch = acquire_(r, "AUTH", "touchSession");
        assert_(touch.status === "success", "touchSession debe adquirir lease para actualizar ActiveSessions.");
        const profile = acquire_(r, "USERS", "updateProfile");
        assert_(profile.status === "error" && profile.code === "busy", "USERS debe esperar mientras AUTH actualiza ActiveSessions.");
        release_(r, "AUTH", "touchSession", touch.token);
    });

    test_("Cambio de rol/sesión AUTH bloquea mutaciones protegidas activas", function() {
        const r = createRuntime_();
        const feedback = acquire_(r, "FEEDBACK", "approveVideo");
        assert_(feedback.status === "success", "FEEDBACK debía obtener lease.");
        const auth = acquire_(r, "AUTH", "updateUser");
        assert_(auth.status === "error" && auth.code === "busy", "AUTH debía esperar por USERS/ActiveSessions.");
        release_(r, "FEEDBACK", "approveVideo", feedback.token);
    });

    test_("Las mutaciones Inbox serializan identidad y escrituras FEEDBACK", function() {
        const actions = ["createInboxConversation","sendInboxMessage","markInboxRead","archiveInboxConversation"];
        actions.forEach((operation,index) => {
            const r = createRuntime_();
            const inbox = acquire_(r,"FEEDBACK",operation);
            assert_(inbox.status === "success","FEEDBACK/"+operation+" debe obtener lease.");
            const auth = acquire_(r,"AUTH","updateUser");
            assert_(auth.status === "error" && auth.code === "busy","AUTH no debe cambiar identidad mientras corre "+operation+".");
            const competingOperation = actions[(index + 1) % actions.length];
            const competing = acquire_(r,"FEEDBACK",competingOperation);
            assert_(competing.status === "error" && competing.code === "busy","Las mutaciones Inbox no deben escribir FEEDBACK simultáneamente.");
            release_(r,"FEEDBACK",operation,inbox.token);
        });
    });

    test_("Mutación USERS bloquea lectura de identidad de WRITE", function() {
        const r = createRuntime_();
        const users = acquire_(r, "USERS", "updateProfile");
        assert_(users.status === "success", "USERS debía obtener lease.");
        const write = acquire_(r, "WRITE", "addOrUpdateCut");
        assert_(write.status === "error" && write.code === "busy", "WRITE debía esperar por USERS.");
        release_(r, "USERS", "updateProfile", users.token);
    });

    test_("Mantenimiento exclusivo bloquea operaciones activas y nuevas", function() {
        const r = createRuntime_();
        const write = acquire_(r, "WRITE", "addOrUpdateCut");
        const maintenance = acquire_(r, "ADMIN", "restoreDatabase");
        assert_(maintenance.status === "error" && maintenance.code === "busy", "Mantenimiento no debe iniciar con escrituras activas.");
        release_(r, "WRITE", "addOrUpdateCut", write.token);
        const acquired = acquire_(r, "ADMIN", "restoreDatabase");
        assert_(acquired.status === "success", "Mantenimiento debía obtener exclusividad.");
        const auth = acquire_(r, "AUTH", "login");
        assert_(auth.status === "error" && auth.code === "busy", "Mantenimiento debe bloquear nuevas mutaciones.");
        release_(r, "ADMIN", "restoreDatabase", acquired.token);
    });

    test_("La migración reserva mantenimiento, drena operaciones activas y bloquea nuevas mutaciones", function() {
        let runtime;
        let writeLease;
        let blockedDuringDrain = false;
        let rejectedDuringDrain = false;
        let sleepCount = 0;
        runtime = createRuntime_(() => {
            sleepCount++;
            const attempt = acquire_(runtime, "ADMIN", "addOrUpdateCut");
            blockedDuringDrain = attempt.status === "error" && attempt.code === "busy";
            const leases = JSON.parse(runtime.properties.getProperty("GPSpedia_SHARED_MUTATION_LEASES"));
            const reservation = leases.find(lease => lease.operation === "migrateCortesOperationIds");
            try {
                runtime.request("validate", "ADMIN", "migrateCortesOperationIds", { token: reservation.token });
            } catch (error) {
                rejectedDuringDrain = String(error.message || error).includes("drenando");
            }
            if (sleepCount === 1) release_(runtime, "WRITE", "addOrUpdateCut", writeLease.token);
        });
        writeLease = acquire_(runtime, "WRITE", "addOrUpdateCut");
        const migration = acquire_(runtime, "ADMIN", "migrateCortesOperationIds", runtime.uuid(), 1000);
        assert_(blockedDuringDrain, "Una nueva mutación ADMIN debe quedar bloqueada desde que se reserva la ventana.");
        assert_(rejectedDuringDrain, "La reserva no debe autorizar el handler antes de drenar.");
        assert_(migration.status === "success", "La migración debe iniciar después de que finalice la operación activa.");
        const adminWrite = acquire_(runtime, "ADMIN", "addOrUpdateCut");
        const write = acquire_(runtime, "WRITE", "addOrUpdateCut");
        const vin = acquire_(runtime, "WRITE", "addVinToVehicle");
        assert_([adminWrite, write, vin].every(result => result.status === "error" && result.code === "busy"),
            "La migración debe bloquear mutaciones ADMIN y WRITE durante la ventana exclusiva.");
        release_(runtime, "ADMIN", "migrateCortesOperationIds", migration.token);
    });

    test_("La migración también drena una alta ADMIN que ya estaba en curso", function() {
        let runtime;
        let adminLease;
        runtime = createRuntime_(() => release_(runtime, "ADMIN", "addOrUpdateCut", adminLease.token));
        adminLease = acquire_(runtime, "ADMIN", "addOrUpdateCut");
        const migration = acquire_(runtime, "ADMIN", "migrateCortesOperationIds", runtime.uuid(), 1000);
        assert_(migration.status === "success", "La migración debe esperar a que finalice una alta ADMIN previa.");
        release_(runtime, "ADMIN", "migrateCortesOperationIds", migration.token);
    });

    test_("La espera de mantenimiento identifica operaciones activas y libera la reserva al agotar el plazo", function() {
        const r = createRuntime_();
        const write = acquire_(r, "WRITE", "addOrUpdateCut");
        const migration = acquire_(r, "ADMIN", "migrateCortesOperationIds", r.uuid(), 250);
        assert_(migration.status === "error" && migration.code === "busy", "La migración debe detenerse si la operación activa no termina.");
        assert_(migration.message.includes("WRITE/addOrUpdateCut"), "La respuesta debe identificar el servicio y acción que impiden el mantenimiento.");
        const stored = JSON.parse(r.properties.getProperty("GPSpedia_SHARED_MUTATION_LEASES"));
        assert_(!stored.some(lease => lease.maintenance && lease.operation === "migrateCortesOperationIds"),
            "La reserva de mantenimiento debe retirarse cuando la migración no logra drenar.");
        const serialized = acquire_(r, "FEEDBACK", "reportProblem");
        assert_(serialized.status === "error" && serialized.code === "busy",
            "FEEDBACK debe esperar mientras WRITE mantiene lectura de ActiveSessions.");
        release_(r, "WRITE", "addOrUpdateCut", write.token);
        const independent = acquire_(r, "FEEDBACK", "reportProblem");
        assert_(independent.status === "success", "FEEDBACK debe continuar tras liberar la lectura de identidad.");
        release_(r, "FEEDBACK", "reportProblem", independent.token);
    });

    test_("Una reserva de drenaje abandonada se recupera a los 60 segundos", function() {
        const r = createRuntime_();
        r.properties.setProperty("GPSpedia_SHARED_MUTATION_LEASES", JSON.stringify([{
            token: r.uuid() + r.uuid(), service: "ADMIN", operation: "migrateCortesOperationIds",
            requestId: r.uuid(), readResources: [], writeResources: [], maintenance: true,
            nestedActions: {}, phase: "draining", createdAt: 1700000000000,
            expiresAt: 1700000060000
        }]));
        r.advance(60001);
        const write = acquire_(r, "WRITE", "addOrUpdateCut");
        assert_(write.status === "success", "Una reserva de drenaje abandonada debe expirar sin bloquear indefinidamente.");
        release_(r, "WRITE", "addOrUpdateCut", write.token);
    });

    test_("Las leases existentes sin campo phase siguen siendo compatibles", function() {
        const r = createRuntime_();
        const token = r.uuid() + r.uuid();
        r.properties.setProperty("GPSpedia_SHARED_MUTATION_LEASES", JSON.stringify([{
            token: token, service: "WRITE", operation: "addOrUpdateCut",
            requestId: r.uuid(), readResources: ["USERS", "ACTIVE_SESSIONS"],
            writeResources: ["CORTES", "DRIVE", "IDEMPOTENCIA"], maintenance: false,
            nestedActions: {}, createdAt: 1700000000000,
            expiresAt: 1700000000000 + 45 * 60 * 1000
        }]));
        const blocked = acquire_(r, "FEEDBACK", "suggestYear");
        assert_(blocked.status === "error" && blocked.code === "busy", "La lease antigua debe seguir protegiendo sus recursos.");
        const valid = r.request("validate", "WRITE", "addOrUpdateCut", { token: token });
        assert_(valid.status === "success" && valid.valid, "La lease antigua debe seguir validándose durante una actualización.");
    });

    test_("Una lease de mantenimiento interrumpida se recupera al expirar", function() {
        const r = createRuntime_();
        const migration = acquire_(r, "ADMIN", "migrateCortesOperationIds");
        assert_(migration.status === "success", "La migración debe adquirir mantenimiento cuando no hay operaciones activas.");
        r.advance(45 * 60 * 1000 + 1);
        const write = acquire_(r, "WRITE", "addOrUpdateCut");
        assert_(write.status === "success", "La expiración debe liberar una ventana de mantenimiento abandonada.");
        release_(r, "WRITE", "addOrUpdateCut", write.token);
    });

    test_("La reconciliación de cargas usa mantenimiento exclusivo y las altas reservan el ledger", function() {
        const reconciliation = coordinatorPolicy_("ADMIN", "reconcilePendingImageUploads");
        const adminCut = coordinatorPolicy_("ADMIN", "addOrUpdateCut");
        const adminSupplementary = coordinatorPolicy_("ADMIN", "addSupplementaryInfo");
        const writeCut = coordinatorPolicy_("WRITE", "addOrUpdateCut");
        const writeSupplementary = coordinatorPolicy_("WRITE", "addSupplementaryInfo");
        assert_(reconciliation.maintenance === true, "La reconciliación debe drenar operaciones activas.");
        [adminCut, adminSupplementary, writeCut, writeSupplementary].forEach(policy => {
            assert_(policy.writeResources.includes("IMAGE_UPLOAD_LEDGER"), "La acción debe reservar IMAGE_UPLOAD_LEDGER.");
        });
    });

    test_("La política de migración VIN exige mantenimiento exclusivo", function() {
        const policy = coordinatorPolicy_("ADMIN", "migrateCortesOperationIds");
        assert_(policy.maintenance === true, "La migración debe declararse como mantenimiento exclusivo.");
    });
    test_("La migración de IDs y su rollback exigen mantenimiento exclusivo", function() {
        ["migrateIdentifiers", "rollbackIdentifiers"].forEach(action => {
            const policy = coordinatorPolicy_("ADMIN", action);
            assert_(policy.maintenance === true, action + " debe drenar operaciones activas.");
            assert_(policy.sharedWriteResources.includes("ACTIVE_SESSIONS"), action + " debe coordinar la actividad de sesión como escritura cooperativa.");
            const r = createRuntime_();
            const lease = acquire_(r, "ADMIN", action);
            assert_(lease.status === "success", action + " debe adquirir la ventana exclusiva.");
            const concurrent = acquire_(r, "WRITE", "addOrUpdateCut");
            assert_(concurrent.status === "error" && concurrent.code === "busy", action + " debe bloquear escrituras concurrentes.");
            release_(r, "ADMIN", action, lease.token);
        });
    });

    test_("ADMIN addOrUpdateCut autoriza solo allocateVehicleId anidado", function() {
        const r = createRuntime_();
        const admin = acquire_(r, "ADMIN", "addOrUpdateCut");
        const valid = r.request("validate", "WRITE", "allocateVehicleId", { token: admin.token });
        assert_(valid.status === "success" && valid.valid, "allocateVehicleId debía estar permitido.");
        expectThrow_(() => r.request("validate", "WRITE", "freezeCortesIds", { token: admin.token }), "no autoriza");
        expectThrow_(() => release_(r, "WRITE", "allocateVehicleId", admin.token), "propietaria");
        release_(r, "ADMIN", "addOrUpdateCut", admin.token);
    });

    test_("ADMIN reorganizeDatabase autoriza solo freezeCortesIds anidado", function() {
        const r = createRuntime_();
        const admin = acquire_(r, "ADMIN", "reorganizeDatabase");
        const valid = r.request("validate", "WRITE", "freezeCortesIds", { token: admin.token });
        assert_(valid.status === "success" && valid.valid, "freezeCortesIds debía estar permitido.");
        expectThrow_(() => r.request("validate", "WRITE", "allocateVehicleId", { token: admin.token }), "no autoriza");
        release_(r, "ADMIN", "reorganizeDatabase", admin.token);
    });

    test_("Reintento acquire con requestId devuelve la misma lease", function() {
        const r = createRuntime_();
        const requestId = r.uuid();
        const first = acquire_(r, "WRITE", "addVinToVehicle", requestId);
        const retry = acquire_(r, "WRITE", "addVinToVehicle", requestId);
        assert_(first.status === "success" && retry.status === "success" && first.token === retry.token, "El reintento debe recuperar la misma lease.");
        expectThrow_(() => acquire_(r, "WRITE", "freezeCortesIds", requestId), "otra operación");
        release_(r, "WRITE", "addVinToVehicle", first.token);
    });

    test_("Leases expiradas se recuperan tras el límite de ejecución", function() {
        const r = createRuntime_();
        const first = acquire_(r, "WRITE", "addVinToVehicle");
        assert_(first.status === "success", "Primera lease debía obtenerse.");
        r.advance(45 * 60 * 1000 + 1);
        const second = acquire_(r, "FEEDBACK", "suggestYear");
        assert_(second.status === "success", "Lease expirada debía liberar los recursos.");
        release_(r, "FEEDBACK", "suggestYear", second.token);
    });

    test_("Release valida propietario y operación", function() {
        const r = createRuntime_();
        const lease = acquire_(r, "WRITE", "addVinToVehicle");
        expectThrow_(() => release_(r, "WRITE", "freezeCortesIds", lease.token), "propietaria");
        expectThrow_(() => release_(r, "ADMIN", "addVinToVehicle", lease.token), "propietaria");
        release_(r, "WRITE", "addVinToVehicle", lease.token);
    });

    test_("Estado corrupto bloquea nuevas operaciones", function() {
        const r = createRuntime_();
        r.properties.setProperty("GPSpedia_SHARED_MUTATION_LEASES", "{estado-inválido");
        expectThrow_(() => acquire_(r, "WRITE", "addVinToVehicle"), "dañado");
    });

    test_("Cliente libera lease aunque la acción falle", function() {
        const r = createRuntime_();
        const client = r.makeClient("WRITE");
        expectThrow_(() => client.withLease("WRITE", "addVinToVehicle", function() {
            throw new Error("fallo-controlado");
        }), "fallo-controlado");
        assert_(!r.properties.getProperty("GPSpedia_SHARED_MUTATION_LEASES"), "Lease debía liberarse tras excepción.");
    });

    test_("Cliente falla cerrado sin configuración y valida lease anidada", function() {
        const r = createRuntime_();
        const admin = acquire_(r, "ADMIN", "addOrUpdateCut");
        const client = r.makeClient("WRITE");
        const nested = client.withLease("WRITE", "allocateVehicleId", () => "nested", { nestedToken: admin.token });
        assert_(nested === "nested", "Acción anidada debía ejecutarse después de validar lease.");
        release_(r, "ADMIN", "addOrUpdateCut", admin.token);

        const missingClient = createSharedMutationClient_({
            properties: { getProperty: () => null },
            fetch: () => { throw new Error("fetch no debe ejecutarse"); },
            uuid: r.uuid,
            logger: function() {}
        });
        expectThrow_(() => missingClient.withLease("WRITE", "addVinToVehicle", () => "no"), "no está configurada");
    });

    test_("FEEDBACK PyS vehicle relations read Cortes and conflict with vehicle writes", function() {
        ["addProblem", "addVehicleToProblem", "removeVehicleFromProblem"].forEach(function(action) {
            const policy = coordinatorPolicy_("FEEDBACK", action);
            assert_(policy.readResources.includes("CORTES"), action + " debe reservar lectura de Cortes.");
            assert_(policy.writeResources.includes("FEEDBACK"), action + " debe serializar la hoja pys.");
            assert_(policy.writeResources.includes("ACTIVITY"), action + " debe conservar el recurso de actividad.");
        });

        const concurrent = createRuntime_();
        const firstAdd = acquire_(concurrent, "FEEDBACK", "addVehicleToProblem");
        const secondAdd = acquire_(concurrent, "FEEDBACK", "addVehicleToProblem");
        assert_(secondAdd.status === "error" && secondAdd.code === "busy",
            "Dos altas simultáneas deben compartir el bloqueo de FEEDBACK.");
        release_(concurrent, "FEEDBACK", "addVehicleToProblem", firstAdd.token);
        const addRetry = acquire_(concurrent, "FEEDBACK", "addVehicleToProblem");
        assert_(addRetry.status !== "error", "El reintento debe poder adquirir el recurso tras liberar el lease.");
        release_(concurrent, "FEEDBACK", "addVehicleToProblem", addRetry.token);

        const mixed = createRuntime_();
        const addLease = acquire_(mixed, "FEEDBACK", "addVehicleToProblem");
        const removeLease = acquire_(mixed, "FEEDBACK", "removeVehicleFromProblem");
        assert_(removeLease.status === "error" && removeLease.code === "busy",
            "Alta y baja concurrentes deben serializarse sobre FEEDBACK.");
        release_(mixed, "FEEDBACK", "addVehicleToProblem", addLease.token);
        const removeRetry = acquire_(mixed, "FEEDBACK", "removeVehicleFromProblem");
        assert_(removeRetry.status !== "error", "La baja debe poder reintentarse tras liberar el lease.");
        release_(mixed, "FEEDBACK", "removeVehicleFromProblem", removeRetry.token);

        const first = createRuntime_();
        const cutWrite = acquire_(first, "WRITE", "addOrUpdateCut");
        const relationRead = acquire_(first, "FEEDBACK", "addVehicleToProblem");
        assert_(relationRead.status === "error" && relationRead.code === "busy",
            "Una relación PyS no debe leer Cortes mientras se modifica un vehículo.");
        release_(first, "WRITE", "addOrUpdateCut", cutWrite.token);

        const second = createRuntime_();
        const relationLease = acquire_(second, "FEEDBACK", "removeVehicleFromProblem");
        const concurrentCutWrite = acquire_(second, "WRITE", "addOrUpdateCut");
        assert_(concurrentCutWrite.status === "error" && concurrentCutWrite.code === "busy",
            "Una modificación de Cortes debe esperar mientras se valida/desvincula una relación PyS.");
        release_(second, "FEEDBACK", "removeVehicleFromProblem", relationLease.token);
    });

    test_("FEEDBACK recordLike reserves CORTES, FEEDBACK ledger and ACTIVITY", function() {
        const policy = coordinatorPolicy_("FEEDBACK", "recordLike");
        assert_(policy.writeResources.includes("CORTES"), "recordLike debe reservar Cortes.");
        assert_(policy.writeResources.includes("FEEDBACK"), "recordLike debe reservar FeedbackLikes.");
        assert_(policy.writeResources.includes("ACTIVITY"), "recordLike debe reservar Activity.");
    });
    test_("FEEDBACK suggestYear y approveVideo reservan Cortes, Feedback y Activity", function() {
        ["suggestYear", "approveVideo"].forEach(function(action) {
            const policy = coordinatorPolicy_("FEEDBACK", action);
            ["CORTES", "FEEDBACK", "ACTIVITY"].forEach(function(resource) {
                assert_(policy.writeResources.includes(resource), action + " debe reservar " + resource + ".");
            });
        });
    });

    test_("FEEDBACK serializa altas, edición y publicación de Tutorial sobre el mismo recurso", function() {
        ["addTutorial", "updateTutorialItem", "approveVideo", "rejectVideo"].forEach(function(action) {
            const policy = coordinatorPolicy_("FEEDBACK", action);
            assert_(policy.writeResources.includes("TUTORIAL"), action + " debe reservar Tutorial para escritura.");
        });
        const r = createRuntime_();
        const create = acquire_(r, "FEEDBACK", "addTutorial");
        const approval = acquire_(r, "FEEDBACK", "approveVideo");
        assert_(approval.status === "error" && approval.code === "busy",
            "La aprobación de vídeo debe esperar mientras se registra un Tutorial.");
        release_(r, "FEEDBACK", "addTutorial", create.token);
        const retry = acquire_(r, "FEEDBACK", "approveVideo");
        assert_(retry.status === "success", "La aprobación debe reintentarse al liberar Tutorial.");
        release_(r, "FEEDBACK", "approveVideo", retry.token);

        const submitPolicy = coordinatorPolicy_("FEEDBACK", "submitVideoForApproval");
        assert_(submitPolicy.readResources.includes("TUTORIAL"),
            "El envío de vídeo debe reservar lectura de Tutorial para validar el destino.");
    });

    test_("approveVideo y rejectVideo no pueden decidir simultáneamente la misma cola FEEDBACK", function() {
        const r = createRuntime_();
        const approval = acquire_(r, "FEEDBACK", "approveVideo");
        const rejection = acquire_(r, "FEEDBACK", "rejectVideo");
        assert_(approval.status === "success", "La primera decisión debe adquirir el lease.");
        assert_(rejection.status === "error" && rejection.code === "busy",
            "La decisión opuesta debe esperar a que termine la primera.");
        release_(r, "FEEDBACK", "approveVideo", approval.token);
        const retry = acquire_(r, "FEEDBACK", "rejectVideo");
        assert_(retry.status === "success", "La segunda decisión debe reintentarse tras liberar el lease.");
        release_(r, "FEEDBACK", "rejectVideo", retry.token);
    });

    test_("FEEDBACK ya no habilita assignCollaborator obsoleto", function() {
        expectThrow_(() => coordinatorPolicy_("FEEDBACK", "assignCollaborator"), "política");
    });

    test_("FEEDBACK touch de actividad serializa sesiones con logout y revocaciones AUTH", function() {
        const policy = coordinatorPolicy_("FEEDBACK", "sessionActivity");
        assert_(policy.writeResources.length === 1 && policy.writeResources[0] === "ACTIVE_SESSIONS",
            "La lectura protegida debe reservar escritura exclusiva de ActiveSessions.");
        const r = createRuntime_();
        const activity = acquire_(r, "FEEDBACK", "sessionActivity");
        assert_(activity.status === "success", "La acción protegida debe adquirir lease de actividad.");
        const logout = acquire_(r, "AUTH", "logout");
        assert_(logout.status === "error" && logout.code === "busy",
            "Logout no debe invalidar la sesión mientras una operación autenticada la actualiza.");
        const profile = acquire_(r, "USERS", "updateProfile");
        assert_(profile.status === "error" && profile.code === "busy",
            "Cambios de perfil no deben competir con la actualización de actividad.");
        release_(r, "FEEDBACK", "sessionActivity", activity.token);
        const retry = acquire_(r, "AUTH", "logout");
        assert_(retry.status === "success", "Logout debe continuar tras terminar la operación protegida.");
        release_(r, "AUTH", "logout", retry.token);
    });

    test_("AUTH acceptTerms serializa la aceptación con las mutaciones de identidad", function() {
        const r = createRuntime_();
        const policy = coordinatorPolicy_("AUTH", "acceptTerms");
        assert_(policy.writeResources.includes("USERS"), "acceptTerms debe reservar Users.");
        assert_(policy.writeResources.includes("ACTIVE_SESSIONS"), "acceptTerms debe reservar ActiveSessions para verificar/reconciliar identidad.");
        const acceptance = acquire_(r, "AUTH", "acceptTerms");
        assert_(acceptance.status === "success", "acceptTerms debe obtener una lease autorizada.");
        const profile = acquire_(r, "USERS", "updateProfile");
        assert_(profile.status === "error" && profile.code === "busy", "La aceptación debe serializarse con cambios de Users.");
        release_(r, "AUTH", "acceptTerms", acceptance.token);
    });


    test_("Migración batch de contraseñas reserva Users y ActiveSessions", function() {
        const policy = coordinatorPolicy_("AUTH", "migrateLegacyPasswords");
        assert_(policy.writeResources.includes("USERS"), "La migración debe reservar Users.");
        assert_(policy.writeResources.includes("ACTIVE_SESSIONS"), "La migración debe serializar actividad con logout y revocaciones.");
    });

    test_("AUTH serializa actividad de sesiones en todas las mutaciones autenticadas", function() {
        ["acceptTerms","changePassword","resetUserPassword","resetUserSessions","clearSensitiveLogs","deleteUser","updateUser","logout"].forEach(action => {
            const policy = coordinatorPolicy_("AUTH", action);
            assert_(policy.writeResources.includes("ACTIVE_SESSIONS"),
                "AUTH/" + action + " debe reservar ActiveSessions mientras renueva o invalida la sesión.");
        });
    });

    test_("UTILITIES migra timestamps con lease sobre identidad, Cortes y Drive", function() {
        const policy = coordinatorPolicy_("UTILITIES", "migrateTimestamps");
        ["USERS", "ACTIVE_SESSIONS", "CORTES", "DRIVE"].forEach(resource =>
            assert_(policy.readResources.includes(resource), "UTILITIES debe reservar lectura de " + resource + "."));
        assert_(policy.writeResources.includes("UTILITIES") && policy.writeResources.includes("ACTIVE_SESSIONS"),
            "La migración debe reservar su recurso lógico y ActiveSessions para actualizar actividad.");
        const r = createRuntime_();
        const utility = acquire_(r, "UTILITIES", "migrateTimestamps");
        assert_(utility.status === "success", "UTILITIES debe autenticarse con su secreto independiente.");
        [
            ["AUTH", "logout"],
            ["WRITE", "addOrUpdateCut"],
            ["ADMIN", "backupDrive"],
            ["ADMIN", "backupDatabase"]
        ].forEach(([service, operation]) => {
            const blocked = acquire_(r, service, operation);
            assert_(blocked.status === "error" && blocked.code === "busy",
                service + "/" + operation + " debe esperar mientras UTILITIES lee o migra recursos compartidos.");
        });
        release_(r, "UTILITIES", "migrateTimestamps", utility.token);
        const maintenance = acquire_(r, "ADMIN", "backupDatabase");
        assert_(maintenance.status === "success", "El mantenimiento debe poder iniciar tras liberar UTILITIES.");
        const blockedUtility = acquire_(r, "UTILITIES", "migrateTimestamps");
        assert_(blockedUtility.status === "error" && blockedUtility.code === "busy",
            "La migración debe esperar durante el mantenimiento de la base completa.");
        release_(r, "ADMIN", "backupDatabase", maintenance.token);
    });


    test_("ADMIN permite consultas concurrentes con actualización cooperativa de actividad", function() {
        const r = createRuntime_();
        const policy = coordinatorPolicy_("ADMIN", "sessionActivity");
        assert_(policy.sharedWriteResources.includes("ACTIVE_SESSIONS"), "ADMIN debe declarar LastActivityAt como escritura cooperativa.");
        assert_(!policy.writeResources.includes("ACTIVE_SESSIONS"), "La actividad cooperativa no debe declararse como escritura exclusiva.");
        const first = acquire_(r, "ADMIN", "sessionActivity");
        const second = acquire_(r, "ADMIN", "sessionActivity");
        assert_(first.status === "success" && second.status === "success",
            "Dos consultas ADMIN protegidas deben poder coexistir mientras solo actualizan LastActivityAt.");
        const logout = acquire_(r, "AUTH", "logout");
        assert_(logout.status === "error" && logout.code === "busy",
            "La escritura cooperativa ADMIN debe seguir bloqueando logout y revocaciones AUTH.");
        release_(r, "ADMIN", "sessionActivity", first.token);
        release_(r, "ADMIN", "sessionActivity", second.token);
        const retry = acquire_(r, "AUTH", "logout");
        assert_(retry.status === "success", "AUTH debe continuar al terminar las operaciones ADMIN.");
        release_(r, "AUTH", "logout", retry.token);
    });

    test_("Inicializar historial tiene política mínima y conflicto por IMAGE_INVENTORY", function() {
        const policy = coordinatorPolicy_("ADMIN", "migrateReplacedImagesSchema");
        assert_(policy.writeResources.length === 1 && policy.writeResources[0] === "IMAGE_INVENTORY",
            "La migración solo debe escribir el recurso lógico IMAGE_INVENTORY.");
        assert_(policy.sharedWriteResources.includes("ACTIVE_SESSIONS"),
            "La migración debe conservar la actualización protegida de actividad.");
        assert_(policy.maintenance === false, "La inicialización no debe reservar mantenimiento global.");
        const r = createRuntime_();
        const migration = acquire_(r, "ADMIN", "migrateReplacedImagesSchema");
        assert_(migration.status === "success", "La acción de inicialización debe estar habilitada.");
        const competing = acquire_(r, "ADMIN", "deleteReplacedImage");
        assert_(competing.status === "error" && competing.code === "busy",
            "La migración debe serializarse con cambios del mismo inventario.");
        release_(r, "ADMIN", "migrateReplacedImagesSchema", migration.token);
        expectThrow_(() => acquire_(r, "ADMIN", "unknownImageAction"), "política");
    });

    const summary = { status: failed === 0 ? "PASS" : "FAIL", passed, failed, results };
    return summary;
}
