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

    function createRuntime_(sleepHook, fetchHook, fetchAllHook) {
        const store = {};
        let clock = 1700000000000;
        let sequence = 0;
        const properties = {
            getProperty: key => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
            setProperty: (key, value) => { store[key] = String(value); return properties; },
            deleteProperty: key => { delete store[key]; return properties; },
            getProperties: () => Object.assign({}, store)
        };
        const lock = { tryLock: () => true, releaseLock: () => {} };
        const lockService = { getScriptLock: () => lock };
        const uuid = () => {
            sequence++;
            return "00000000-0000-4000-8000-" + String(sequence).padStart(12, "0");
        };
        const secrets = {
            ADMIN: "A".repeat(40), WRITE: "W".repeat(40), FEEDBACK: "F".repeat(40),
            AUTH: "H".repeat(40), USERS: "U".repeat(40), UTILITIES: "T".repeat(40), CATALOG: "C".repeat(40)
        };
        Object.keys(secrets).forEach(service => properties.setProperty("GPSpedia_COORDINATOR_SECRET_" + service, secrets[service]));
        const coordinator = createSharedMutationCoordinator_({
            properties: properties,
            lockService: lockService,
            now: () => clock,
            uuid: uuid,
            sleep: milliseconds => { clock += milliseconds; if (typeof sleepHook === "function") sleepHook(milliseconds); },
            fetch: fetchHook,
            fetchAll: fetchAllHook
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

    test_("El inventario ADMIN no bloquea cortes ni login; su estado se serializa aparte", function() {
        const cutsRuntime = createRuntime_();
        const inventory = acquire_(cutsRuntime, "ADMIN", "saveUnusedImagesInventory");
        const write = acquire_(cutsRuntime, "WRITE", "addOrUpdateCut");
        assert_(inventory.status === "success" && write.status === "success",
            "IMAGE_INVENTORY debe coexistir con CORTES/DRIVE de WRITE.");
        release_(cutsRuntime, "ADMIN", "saveUnusedImagesInventory", inventory.token);
        release_(cutsRuntime, "WRITE", "addOrUpdateCut", write.token);
        const loginRuntime = createRuntime_();
        const inventoryLogin = acquire_(loginRuntime, "ADMIN", "saveUnusedImagesInventory");
        const login = acquire_(loginRuntime, "AUTH", "login");
        assert_(inventoryLogin.status === "success" && login.status === "success",
            "IMAGE_INVENTORY debe coexistir con login AUTH.");
        release_(loginRuntime, "ADMIN", "saveUnusedImagesInventory", inventoryLogin.token);
        release_(loginRuntime, "AUTH", "login", login.token);
    });

    test_("La auditoría ADMIN reserva solo su estado y no bloquea WRITE ni login", function() {
        const cutsRuntime = createRuntime_();
        const audit = acquire_(cutsRuntime, "ADMIN", "auditDriveImagesInCortes");
        const write = acquire_(cutsRuntime, "WRITE", "addOrUpdateCut");
        assert_(audit.status === "success" && write.status === "success",
            "La lease IMAGE_AUDIT_STATE debe coexistir con CORTES/DRIVE de WRITE.");
        const duplicateAudit = acquire_(cutsRuntime, "ADMIN", "auditDriveImagesInCortes");
        assert_(duplicateAudit.status === "error" && duplicateAudit.code === "busy",
            "Dos continuaciones de auditoría no deben modificar simultáneamente el mismo estado.");
        release_(cutsRuntime, "ADMIN", "auditDriveImagesInCortes", audit.token);
        release_(cutsRuntime, "WRITE", "addOrUpdateCut", write.token);

        const loginRuntime = createRuntime_();
        const auditLogin = acquire_(loginRuntime, "ADMIN", "auditDriveImagesInCortes");
        const login = acquire_(loginRuntime, "AUTH", "login");
        assert_(auditLogin.status === "success" && login.status === "success",
            "La lease IMAGE_AUDIT_STATE debe coexistir con login AUTH.");
        release_(loginRuntime, "ADMIN", "auditDriveImagesInCortes", auditLogin.token);
        release_(loginRuntime, "AUTH", "login", login.token);
    });

    test_("La auditoría ADMIN no bloquea Inbox ni consultas de salud/tráfico", function() {
        const r = createRuntime_();
        const audit = acquire_(r, "ADMIN", "auditDriveImagesInCortes");
        assert_(audit.status === "success", "La auditoría debe reservar IMAGE_AUDIT_STATE.");

        const inbox = acquire_(r, "FEEDBACK", "sendInboxMessage");
        assert_(inbox.status === "success",
            "La auditoría no debe bloquear el envío/consulta operativa del Inbox.");
        const traffic = acquire_(r, "ADMIN", "getServiceTraffic");
        assert_(traffic.status === "success",
            "La auditoría no debe bloquear la consulta de telemetría/estado del servicio.");

        const duplicateAudit = acquire_(r, "ADMIN", "auditDriveImagesInCortes");
        assert_(duplicateAudit.status === "error" && duplicateAudit.code === "busy",
            "La exclusión debe mantenerse entre dos auditorías sobre IMAGE_AUDIT_STATE.");

        release_(r, "ADMIN", "getServiceTraffic", traffic.token);
        release_(r, "FEEDBACK", "sendInboxMessage", inbox.token);
        release_(r, "ADMIN", "auditDriveImagesInCortes", audit.token);
    });

    test_("FEEDBACK y WRITE comparten solo lectura de contexto y permiten operaciones independientes", function() {
        const r = createRuntime_();
        const feedback = acquire_(r, "FEEDBACK", "reportProblem");
        const write = acquire_(r, "WRITE", "addOrUpdateCut");
        assert_(feedback.status === "success" && write.status === "success",
            "Las operaciones con contexto de sesión en lectura y recursos de negocio distintos deben coexistir.");
        release_(r, "FEEDBACK", "reportProblem", feedback.token);
        release_(r, "WRITE", "addOrUpdateCut", write.token);
    });

    test_("validateSession usa contexto central y touchSession no bloquea lecturas de perfil", function() {
        const r = createRuntime_();
        expectThrow_(() => coordinatorPolicy_("AUTH", "validateSession"), "no está habilitada");
        const touch = acquire_(r, "AUTH", "touchSession");
        assert_(touch.status === "success", "touchSession debe adquirir lease para sincronizar actividad.");
        const profile = acquire_(r, "USERS", "updateProfile");
        assert_(profile.status === "success", "El toque de actividad no debe bloquear operaciones que solo leen SESSION_CONTEXTS.");
        const logout = acquire_(r, "AUTH", "logout");
        assert_(logout.status === "error" && logout.code === "busy", "Logout debe esperar mientras una operación autenticada conserva el contexto.");
        release_(r, "USERS", "updateProfile", profile.token);
        release_(r, "AUTH", "touchSession", touch.token);
        const retry = acquire_(r, "AUTH", "logout");
        assert_(retry.status === "success", "Logout debe continuar tras finalizar las operaciones protegidas.");
        release_(r, "AUTH", "logout", retry.token);
    });

    test_("AUTH acceptTerms mantiene la protección del login sin depender de leases ADMIN", function() {
        const r = createRuntime_();
        const terms = coordinatorPolicy_("AUTH", "acceptTerms");
        assert_(terms.readResources.includes("SESSION_CONTEXTS"), "acceptTerms debe leer el contexto central de sesión.");
        assert_(terms.writeResources.includes("USERS"), "acceptTerms debe persistir el registro por usuario.");
        assert_(!terms.writeResources.includes("ACTIVE_SESSIONS"), "acceptTerms no debe actualizar actividad durante la aceptación.");
        assert_(!terms.writeResources.includes("SESSION_CONTEXTS"), "acceptTerms no debe revocar el contexto compartido.");
        const acceptance = acquire_(r, "AUTH", "acceptTerms");
        assert_(acceptance.status === "success", "Aceptar términos debe adquirir su protección AUTH.");
        const login = acquire_(r, "AUTH", "login");
        assert_(login.status === "error" && login.code === "busy", "El login sí debe esperar porque modifica ActiveSessions.");
        release_(r, "AUTH", "acceptTerms", acceptance.token);
        const retry = acquire_(r, "AUTH", "login");
        assert_(retry.status === "success", "El login debe continuar al terminar acceptTerms.");
        release_(r, "AUTH", "login", retry.token);
        expectThrow_(() => coordinatorPolicy_("ADMIN", "sessionActivity"), "no está habilitada");
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
        assert_(serialized.status === "success",
            "FEEDBACK puede coexistir con WRITE cuando ambos solo leen SESSION_CONTEXTS y escriben recursos distintos.");
        release_(r, "FEEDBACK", "reportProblem", serialized.token);
        release_(r, "WRITE", "addOrUpdateCut", write.token);
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
            assert_(policy.readResources.includes("SESSION_CONTEXTS"), action + " debe validar el contexto de sesión compartido.");
            const r = createRuntime_();
            const lease = acquire_(r, "ADMIN", action);
            assert_(lease.status === "success", action + " debe adquirir la ventana exclusiva.");
            const concurrent = acquire_(r, "WRITE", "addOrUpdateCut");
            assert_(concurrent.status === "error" && concurrent.code === "busy", action + " debe bloquear escrituras concurrentes.");
            release_(r, "ADMIN", action, lease.token);
        });
    });

    test_("ADMIN→WRITE asigna IDs con su propia sesión, sin sublease anidada", function() {
        const adminPolicy = coordinatorPolicy_("ADMIN", "addOrUpdateCut");
        assert_(Object.keys(adminPolicy.nestedActions || {}).length === 0,
            "ADMIN ya no declara operaciones WRITE anidadas dentro de una lease.");
        const writePolicy = coordinatorPolicy_("WRITE", "allocateVehicleId");
        assert_(writePolicy.writeResources.includes("CORTES"),
            "WRITE conserva la política propia del asignador.");
    });

    test_("ADMIN reorganizeDatabase congela IDs sin sublease de Coordinator", function() {
        const adminPolicy = coordinatorPolicy_("ADMIN", "reorganizeDatabase");
        assert_(Object.keys(adminPolicy.nestedActions || {}).length === 0,
            "La acción ADMIN no debe encadenar una lease WRITE.");
        assert_(coordinatorPolicy_("WRITE", "freezeCortesIds").writeResources.includes("CORTES"),
            "WRITE conserva su propia protección funcional para congelar IDs.");
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

    test_("Cliente falla cerrado sin configuración; ADMIN→WRITE no requiere lease anidada", function() {
        const adminPolicy = coordinatorPolicy_("ADMIN", "addOrUpdateCut");
        assert_(Object.keys(adminPolicy.nestedActions || {}).length === 0,
            "ADMIN no debe requerir ni transportar un token de lease hacia WRITE.");
        const missingClient = createSharedMutationClient_({
            properties: { getProperty: () => null },
            fetch: () => { throw new Error("fetch no debe ejecutarse"); },
            uuid: () => "request-id",
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

    test_("FEEDBACK recordLike conserva sus recursos sin depender de actividad ADMIN", function() {
        const policy = coordinatorPolicy_("FEEDBACK", "recordLike");
        ["CORTES", "FEEDBACK", "ACTIVITY"].forEach(function(resource) {
            assert_(policy.writeResources.includes(resource), "recordLike debe reservar " + resource + ".");
        });
        const r = createRuntime_();
        const like = acquire_(r, "FEEDBACK", "recordLike");
        assert_(like.status === "success", "recordLike debe obtener su lease.");
        release_(r, "FEEDBACK", "recordLike", like.token);
        expectThrow_(() => coordinatorPolicy_("ADMIN", "sessionActivity"), "no está habilitada");
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
        assert_(policy.readResources.includes("SESSION_CONTEXTS") && policy.writeResources.length === 0,
            "La lectura protegida debe usar el contexto central sin escribir ActiveSessions.");
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

    test_("AUTH acceptTerms valida contexto central en solo lectura y serializa la escritura de Users", function() {
        const r = createRuntime_();
        const policy = coordinatorPolicy_("AUTH", "acceptTerms");
        assert_(policy.writeResources.includes("USERS"), "acceptTerms debe reservar Users.");
        assert_(!policy.writeResources.includes("ACTIVE_SESSIONS"), "acceptTerms no debe escribir actividad por solicitud.");
        assert_(policy.readResources.includes("SESSION_CONTEXTS"), "acceptTerms debe validar el contexto central.");
        assert_(!policy.writeResources.includes("SESSION_CONTEXTS"), "acceptTerms no debe revocar sesiones.");
        const acceptance = acquire_(r, "AUTH", "acceptTerms");
        assert_(acceptance.status === "success", "acceptTerms debe obtener una lease autorizada.");
        const profile = acquire_(r, "USERS", "updateProfile");
        assert_(profile.status === "error" && profile.code === "busy", "La aceptación debe serializarse con cambios de Users.");
        const login = acquire_(r, "AUTH", "login");
        assert_(login.status === "error" && login.code === "busy", "La aceptación debe impedir una mutación concurrente de ActiveSessions.");
        release_(r, "AUTH", "acceptTerms", acceptance.token);
    });


    test_("Migración batch de contraseñas reserva Users y ActiveSessions", function() {
        const policy = coordinatorPolicy_("AUTH", "migrateLegacyPasswords");
        assert_(policy.writeResources.includes("USERS"), "La migración debe reservar Users.");
        assert_(policy.writeResources.includes("ACTIVE_SESSIONS"), "La migración debe serializar actividad con logout y revocaciones.");
    });

    test_("AUTH serializa actividad de sesiones en todas las mutaciones autenticadas", function() {
        ["changePassword","resetUserPassword","resetUserSessions","clearSensitiveLogs","deleteUser","updateUser","logout"].forEach(action => {
            const policy = coordinatorPolicy_("AUTH", action);
            assert_(policy.writeResources.includes("ACTIVE_SESSIONS"),
                "AUTH/" + action + " debe sincronizar actividad ocasional en ActiveSessions.");
            if (["changePassword","resetUserPassword","resetUserSessions","deleteUser","updateUser","logout"].includes(action)) {
                assert_(policy.writeResources.includes("SESSION_CONTEXTS"),
                    "AUTH/" + action + " debe bloquear el contexto compartido durante la revocación.");
            }
        });
    });

    test_("UTILITIES usa contexto central y conserva exclusión sobre identidad, Cortes y Drive", function() {
        const policy = coordinatorPolicy_("UTILITIES", "migrateTimestamps");
        ["SESSION_CONTEXTS", "CORTES", "DRIVE"].forEach(resource =>
            assert_(policy.readResources.includes(resource), "UTILITIES debe reservar lectura de " + resource + "."));
        assert_(!policy.readResources.includes("ACTIVE_SESSIONS") && !policy.readResources.includes("USERS"),
            "La identidad ya procede del contexto central y no requiere reservar hojas de sesión o perfil.");
        assert_(policy.writeResources.includes("UTILITIES") && !policy.writeResources.includes("ACTIVE_SESSIONS"),
            "La migración debe reservar su recurso lógico sin escribir LastActivityAt en cada operación.");
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


    test_("ADMIN no conserva sessionActivity ni bloquea logout por lecturas ordinarias", function() {
        expectThrow_(() => coordinatorPolicy_("ADMIN", "sessionActivity"), "no está habilitada");
        const readPolicy = coordinatorPolicy_("ADMIN", "getReplacedImages");
        assert_(readPolicy.readResources.includes("DRIVE") && readPolicy.readResources.includes("CORTES"),
            "El metadato de recursos conserva el alcance funcional del inventario.");
        assert_(!readPolicy.writeResources.includes("ACTIVE_SESSIONS"),
            "El inventario no debe escribir actividad de sesión.");
    });

    test_("Inicializar historial tiene política mínima y conflicto por IMAGE_INVENTORY", function() {
        const policy = coordinatorPolicy_("ADMIN", "migrateReplacedImagesSchema");
        assert_(policy.writeResources.length === 1 && policy.writeResources[0] === "IMAGE_INVENTORY",
            "La migración solo debe escribir el recurso lógico IMAGE_INVENTORY.");
        assert_(policy.readResources.includes("SESSION_CONTEXTS"),
            "La migración debe conservar la lectura del contexto central.");
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

    test_("AUTH/requestPasswordRecovery no requiere sesión ni bloquea el login", function() {
        const policy = coordinatorPolicy_("AUTH", "requestPasswordRecovery");
        assert_(policy.writeResources.includes("PASSWORD_RECOVERY"), "La solicitud debe reservar el estado temporal.");
        assert_(!policy.readResources.includes("SESSION_CONTEXTS") && !policy.writeResources.includes("SESSION_CONTEXTS"),
            "La solicitud no debe exigir ni reservar una sesión autenticada.");
        assert_(!policy.writeResources.includes("ACTIVE_SESSIONS"), "Solicitar código no debe modificar ni bloquear sesiones.");
        const r = createRuntime_();
        const recovery = acquire_(r, "AUTH", "requestPasswordRecovery");
        const login = acquire_(r, "AUTH", "login");
        assert_(recovery.status === "success" && login.status === "success", "Login debe coexistir con la solicitud de recuperación.");
        const duplicate = acquire_(r, "AUTH", "requestPasswordRecovery");
        assert_(duplicate.status === "error" && duplicate.code === "busy", "Las solicitudes simultáneas deben serializarse.");
        release_(r, "AUTH", "login", login.token);
        release_(r, "AUTH", "requestPasswordRecovery", recovery.token);
    });

    test_("AUTH/completePasswordRecovery protege identidad y consumo del código", function() {
        const policy = coordinatorPolicy_("AUTH", "completePasswordRecovery");
        ["USERS","ACTIVE_SESSIONS","LOGS","SESSION_CONTEXTS","PASSWORD_RECOVERY"].forEach(resource =>
            assert_(policy.writeResources.includes(resource), "La finalización debe reservar " + resource + "."));
        const r = createRuntime_();
        const completion = acquire_(r, "AUTH", "completePasswordRecovery");
        assert_(completion.status === "success", "La recuperación debe adquirir lease sin sesión previa.");
        const login = acquire_(r, "AUTH", "login");
        assert_(login.status === "error" && login.code === "busy", "Login debe serializarse con revocación y cambio de contraseña.");
        const profile = acquire_(r, "USERS", "updateProfile");
        assert_(profile.status === "error" && profile.code === "busy", "El perfil no debe competir con la recuperación.");
        const request = acquire_(r, "AUTH", "requestPasswordRecovery");
        assert_(request.status === "error" && request.code === "busy", "No debe reemplazarse el código durante su consumo.");
        release_(r, "AUTH", "completePasswordRecovery", completion.token);
        const loginAfter = acquire_(r, "AUTH", "login");
        assert_(loginAfter.status === "success", "Login debe continuar tras la recuperación.");
        release_(r, "AUTH", "login", loginAfter.token);
    });

    test_("ADMIN/getCortesImageFolders conserva metadatos sin lease ni bloqueo del login", function() {
        const policy = coordinatorPolicy_("ADMIN", "getCortesImageFolders");
        assert_(policy.readResources.includes("DRIVE"), "La consulta conserva su alcance funcional sobre Drive.");
        assert_(!policy.readResources.includes("USERS") && !policy.readResources.includes("SESSION_CONTEXTS"),
            "La enumeración de Drive no debe reservar recursos de identidad ya validados por el actor central.");
        assert_(!policy.writeResources.includes("ACTIVE_SESSIONS"),
            "La consulta no debe actualizar LastActivityAt.");
    });

    test_("ADMIN inventario y escáner conservan sus recursos y bloqueos locales, sin leases por acción", function() {
        const inventory = coordinatorPolicy_("ADMIN", "getReplacedImages");
        const scan = coordinatorPolicy_("ADMIN", "auditDriveImagesInCortes");
        const write = coordinatorPolicy_("ADMIN", "saveUnusedImagesInventory");
        assert_(inventory.readResources.includes("IMAGE_INVENTORY") && inventory.readResources.includes("DRIVE"));
        assert_(scan.writeResources.includes("IMAGE_AUDIT_STATE"));
        assert_(write.writeResources.includes("IMAGE_INVENTORY"));
        assert_(Object.keys(scan.nestedActions || {}).length === 0);
        assert_(Object.keys(write.nestedActions || {}).length === 0);
    });


    test_("El contexto compartido registra sesiones y entrega el actor confiable dentro de la lease", function() {
        const r = createRuntime_();
        const createdAt = 1700000000000;
        const registered = r.request("registerSession", "AUTH", "registerSession", {
            userId: "USR-1001", sessionToken: "session-token-0000000000000001",
            role: "supervisor", fullName: "Técnico de prueba",
            createdAt: createdAt, lastActivityAt: createdAt
        });
        assert_(registered.status === "success" && registered.registered, "AUTH debe registrar el contexto.");
        const lease = r.request("acquire", "FEEDBACK", "reportProblem", {
            requestId: r.uuid(), waitMs: 0,
            sessionToken: "session-token-0000000000000001"
        });
        assert_(lease.status === "success" && lease.actor && lease.actor.userId === "USR-1001",
            "La lease debe transportar el actor verificado.");
        assert_(lease.actor.role === "supervisor" && lease.actor.epoch === 1,
            "El rol y epoch deben proceder del contexto central.");
        const nested = r.request("validate", "FEEDBACK", "reportProblem", { token: lease.token });
        assert_(nested.status === "success" && nested.actor.role === "supervisor",
            "La validación de una lease anidada debe conservar el actor.");
        release_(r, "FEEDBACK", "reportProblem", lease.token);
    });

    test_("SharedMutationClient transmite sesión y devuelve el actor sin una segunda llamada", function() {
        const r = createRuntime_();
        r.request("registerSession", "AUTH", "registerSession", {
            userId: "USR-1005", sessionToken: "session-token-0000000000000006",
            role: "jefe", fullName: "Jefe de prueba",
            createdAt: 1700000000000, lastActivityAt: 1700000000000
        });
        const client = r.makeClient("FEEDBACK");
        const actor = client.withLease("FEEDBACK", "reportProblem", function(token, verifiedActor) {
            assert_(/^[A-Za-z0-9_-]{40,100}$/.test(token), "El cliente debe recibir la lease.");
            return verifiedActor;
        }, { session: { sessionToken: "session-token-0000000000000006" } });
        assert_(actor && actor.userId === "USR-1005" && actor.role === "jefe",
            "El cliente debe reutilizar la respuesta de acquire para entregar el actor.");
    });

    test_("El registro de sesión es idempotente y no permite cambiar el rol de un token existente", function() {
        const r = createRuntime_();
        const payload = {
            userId: "USR-1002", sessionToken: "session-token-0000000000000002",
            role: "tecnico", fullName: "Técnico", createdAt: 1700000000000, lastActivityAt: 1700000000000
        };
        const first = r.request("registerSession", "AUTH", "registerSession", payload);
        const retry = r.request("registerSession", "AUTH", "registerSession", payload);
        assert_(first.status === "success" && retry.status === "success" && retry.recovered,
            "El reintento debe recuperar la misma sesión sin duplicarla.");
        expectThrow_(() => r.request("registerSession", "AUTH", "registerSession",
            Object.assign({}, payload, { role: "desarrollador" })), "no coincide");
    });

    test_("La revocación individual conserva otras sesiones y la revocación global incrementa el epoch", function() {
        const r = createRuntime_();
        const base = { userId: "USR-1003", role: "tecnico", fullName: "Técnico", createdAt: 1700000000000, lastActivityAt: 1700000000000 };
        const firstToken = "session-token-0000000000000003";
        const secondToken = "session-token-0000000000000004";
        r.request("registerSession", "AUTH", "registerSession", Object.assign({}, base, { sessionToken: firstToken }));
        r.request("registerSession", "AUTH", "registerSession", Object.assign({}, base, { sessionToken: secondToken }));
        r.request("revokeSession", "AUTH", "revokeSession", { userId: base.userId, sessionToken: firstToken });
        expectThrow_(() => r.request("acquire", "FEEDBACK", "reportProblem", {
            requestId: r.uuid(), waitMs: 0, userId: base.userId, sessionToken: firstToken
        }), "revocada");
        const valid = r.request("acquire", "FEEDBACK", "reportProblem", {
            requestId: r.uuid(), waitMs: 0, userId: base.userId, sessionToken: secondToken
        });
        assert_(valid.status === "success", "La otra sesión debe seguir activa.");
        release_(r, "FEEDBACK", "reportProblem", valid.token);
        const revoked = r.request("revokeUserSessions", "AUTH", "revokeUserSessions", { userId: base.userId });
        assert_(revoked.status === "success" && revoked.epoch === 2, "La revocación global debe avanzar el epoch.");
        expectThrow_(() => r.request("acquire", "FEEDBACK", "reportProblem", {
            requestId: r.uuid(), waitMs: 0, userId: base.userId, sessionToken: secondToken
        }), "revocada");
    });

    test_("La sincronización preserva sesiones activas y elimina tokens que ya no están en ActiveSessions", function() {
        const r = createRuntime_();
        const base = { userId: "USR-1006", role: "tecnico", fullName: "Técnico", createdAt: 1700000000000, lastActivityAt: 1700000000000 };
        const firstToken = "session-token-0000000000000007";
        const secondToken = "session-token-0000000000000008";
        r.request("syncUserSessions", "AUTH", "syncUserSessions", {
            userId: base.userId, role: base.role, fullName: base.fullName,
            sessions: [
                { token: firstToken, createdAt: base.createdAt, lastActivityAt: base.lastActivityAt },
                { token: secondToken, createdAt: base.createdAt, lastActivityAt: base.lastActivityAt }
            ]
        });
        const synced = r.request("syncUserSessions", "AUTH", "syncUserSessions", {
            userId: base.userId, role: base.role, fullName: base.fullName,
            sessions: [{ token: secondToken, createdAt: base.createdAt, lastActivityAt: base.lastActivityAt }]
        });
        assert_(synced.synced === 1 && synced.acceptedTokens[0] === secondToken,
            "La sincronización debe conservar solo las sesiones presentes en ActiveSessions.");
        expectThrow_(() => r.request("acquire", "FEEDBACK", "reportProblem", {
            requestId: r.uuid(), waitMs: 0, userId: base.userId, sessionToken: firstToken
        }), "revocada");
    });


    test_("Desarrollador puede sincronizar más de cinco sesiones y el contexto segmentado las conserva", function() {
        const r = createRuntime_();
        const userId = "USR-UNLIMITED-1";
        const createdAt = 1700000000000;
        const sessions = Array.from({ length: 100 }, function(_, index) {
            return { token: "session-token-unlimited-" + String(index).padStart(4, "0"),
                createdAt: createdAt, lastActivityAt: createdAt };
        });
        const synced = r.request("syncUserSessions", "AUTH", "syncUserSessions", {
            userId: userId, role: "desarrollador", fullName: "Developer", sessions: sessions
        });
        assert_(synced.status === "success" && synced.synced === 100 && synced.acceptedTokens.length === 100,
            "Coordinator debe aceptar y sincronizar las 100 sesiones sin un tope artificial.");
        const prefix = "GPSpedia_AUTH_SESSIONS_V1_" + encodeURIComponent(userId) + "_";
        const chunkKeys = Object.keys(r.properties.getProperties()).filter(key => key.startsWith(prefix));
        assert_(chunkKeys.length > 1, "El contexto debe repartirse en varios bloques.");
        chunkKeys.forEach(function(key) {
            const rawChunk = r.properties.getProperty(key);
            const utf8Length = encodeURIComponent(rawChunk).replace(/%[0-9A-F]{2}/g, "x").length;
            assert_(utf8Length <= 7000, "Cada bloque debe respetar el tamaño máximo en bytes UTF-8.");
        });
        const lease = r.request("acquire", "FEEDBACK", "reportProblem", {
            requestId: r.uuid(), waitMs: 0, sessionToken: sessions[99].token
        });
        assert_(lease.status === "success" && lease.actor.userId === userId,
            "Una sesión del último bloque debe poder autenticarse.");
        release_(r, "FEEDBACK", "reportProblem", lease.token);
        r.request("revokeUserSessions", "AUTH", "revokeUserSessions", { userId: userId });
        assert_(Object.keys(r.properties.getProperties()).filter(key => key.startsWith(prefix)).length === 0,
            "La revocación global debe limpiar todos los bloques.");
    });

    test_("El epoch de revocación impide volver a registrar tokens anteriores al reset", function() {
        const r = createRuntime_();
        const userId = "USR-1007", oldToken = "session-token-0000000000000009";
        const oldCreatedAt = 1700000000000;
        r.request("registerSession", "AUTH", "registerSession", {
            userId, sessionToken: oldToken, role: "tecnico", fullName: "Técnico",
            createdAt: oldCreatedAt, lastActivityAt: oldCreatedAt
        });
        r.request("revokeUserSessions", "AUTH", "revokeUserSessions", { userId });
        const sync = r.request("syncUserSessions", "AUTH", "syncUserSessions", {
            userId, role: "tecnico", fullName: "Técnico",
            sessions: [{ token: oldToken, createdAt: oldCreatedAt, lastActivityAt: oldCreatedAt }]
        });
        assert_(sync.acceptedTokens.length === 0 && sync.rejectedTokens.includes(oldToken),
            "Una sesión anterior a revokedBefore debe quedar excluida aunque siga en la hoja.");
        const newToken = "session-token-0000000000000010", newCreatedAt = oldCreatedAt + 1;
        const fresh = r.request("syncUserSessions", "AUTH", "syncUserSessions", {
            userId, role: "tecnico", fullName: "Técnico",
            sessions: [{ token: newToken, createdAt: newCreatedAt, lastActivityAt: newCreatedAt }]
        });
        assert_(fresh.acceptedTokens.includes(newToken), "Una sesión creada después de la revocación puede registrarse.");
        expectThrow_(() => r.request("acquire", "FEEDBACK", "reportProblem", {
            requestId: r.uuid(), waitMs: 0, userId, sessionToken: oldToken
        }), "revocada");
    });

    test_("El contexto central aplica expiración absoluta y por inactividad", function() {
        const r = createRuntime_();
        const createdAt = 1700000000000;
        r.request("registerSession", "AUTH", "registerSession", {
            userId: "USR-1004", sessionToken: "session-token-0000000000000005",
            role: "tecnico", fullName: "Técnico", createdAt: createdAt, lastActivityAt: createdAt
        });
        r.advance(32 * 24 * 60 * 60 * 1000);
        expectThrow_(() => r.request("acquire", "WRITE", "addOrUpdateCut", {
            requestId: r.uuid(), waitMs: 0, userId: "USR-1004",
            sessionToken: "session-token-0000000000000005"
        }), "expiró");
    });


    test_("Coordinator centraliza los cinco contadores directos y conserva los siete servicios", function() {
        const services = ["CATALOG", "AUTH", "USERS", "WRITE", "FEEDBACK"];
        const r = createRuntime_(null, null, requests => requests.map(request => {
            const service = services.find(name => request.url.includes("/" + name + "/"));
            const count = 2;
            const startAt = Math.floor(1700000000000 / (60 * 60 * 1000)) * (60 * 60 * 1000);
            return {
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify({
                    status: "success", service,
                    scope: service === "CATALOG" ? "catalog_post_requests" : "direct_post_requests",
                    accuracy: "best_effort_nonblocking",
                    buckets: [{ startAt, count }],
                    totals: { lastHour: count, last6Hours: count, last24Hours: count }
                })
            };
        }));
        services.forEach(service => {
            r.properties.setProperty("GPSpedia_SERVICE_URL_" + service, "https://script.google.com/macros/s/" + service + "/exec");
            r.properties.setProperty("GPSpedia_COORDINATOR_SECRET_" + service, r.secrets[service]);
        });
        acquire_(r, "AUTH", "login", "traffic-central-auth-0001");
        r.coordinator.getPublicCatalogChanges({ cursor: 0, limit: 10 });
        r.request("getCatalogChanges", "FEEDBACK", "getCatalogChanges", { cursor: 0, limit: 10 });
        const traffic = r.request("getServiceTraffic", "ADMIN", "getServiceTraffic");
        assert_(traffic.scope === "global_service_traffic", "Coordinator debe devolver el agregado global final.");
        assert_(traffic.services.length === 7 && !traffic.services.includes("LEGACY"),
            "El inventario debe incluir los siete servicios activos y excluir LEGACY.");
        assert_(traffic.totals.last24Hours.AUTH === 3, "AUTH debe combinar lease y contador directo.");
        assert_(traffic.totals.last24Hours.CATALOG === 3, "CATALOG debe combinar feed Coordinator y contador directo.");
        assert_(traffic.totals.last24Hours.FEEDBACK === 3, "FEEDBACK debe combinar feed interno y contador directo.");
        assert_(traffic.totals.last24Hours.USERS === 2 && traffic.totals.last24Hours.WRITE === 2,
            "USERS y WRITE deben sumar sus contadores directos.");
        assert_(traffic.totals.last24Hours.UTILITIES === 0 && traffic.totals.last24Hours.ADMIN === 0,
            "No se deben duplicar servicios sin contador directo.");
        services.forEach(service => assert_(traffic.sources[service].directRequestsAvailable === true,
            service + " debe confirmar su fuente directa."));
        assert_(traffic.sources.CATALOG.feedRequests === "coordinator",
            "El feed público debe conservar su atribución a Coordinator.");
    });

    test_("Coordinator ignora buckets directos inválidos y duplicados sin contaminar la gráfica", function() {
        const r = createRuntime_(null, null, requests => requests.map(request => {
            const service = request.url.includes("/AUTH/") ? "AUTH" : "OTHER";
            const startAt = Math.floor(1700000000000 / (60 * 60 * 1000)) * (60 * 60 * 1000);
            return {
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify({
                    status: "success", service, scope: "direct_post_requests",
                    totals: { lastHour: 3, last6Hours: 3, last24Hours: 3 },
                    buckets: [{ startAt, count: 1 }, { startAt, count: 99 }, { startAt: "invalid", count: 50 }]
                })
            };
        }));
        r.properties.setProperty("GPSpedia_SERVICE_URL_AUTH", "https://script.google.com/macros/s/AUTH/exec");
        r.properties.setProperty("GPSpedia_COORDINATOR_SECRET_AUTH", r.secrets.AUTH);
        const traffic = r.request("getServiceTraffic", "ADMIN", "getServiceTraffic");
        assert_(traffic.sources.AUTH.accuracy === "partial" &&
            traffic.sources.AUTH.reason === "invalid_or_duplicate_buckets_ignored",
            "La fuente debe declararse parcial si contiene buckets repetidos o corruptos.");
        const currentStartAt = Math.floor(1700000000000 / (60 * 60 * 1000)) * (60 * 60 * 1000);
        const currentBucket = traffic.buckets.find(bucket => bucket.startAt === currentStartAt);
        assert_(currentBucket && currentBucket.counts.AUTH === 1,
            "Solo debe agregarse el primer bucket válido.");
        assert_(traffic.totals.last24Hours.AUTH === 3,
            "Los totales directos siguen conservando la cifra declarada por la fuente.");
    });

    test_("La falta de una fuente directa conserva el agregado y declara cobertura parcial", function() {
        const r = createRuntime_();
        r.properties.setProperty("GPSpedia_SERVICE_URL_AUTH", "https://script.google.com/macros/s/AUTH/exec");
        r.properties.setProperty("GPSpedia_COORDINATOR_SECRET_AUTH", r.secrets.AUTH);
        const traffic = r.request("getServiceTraffic", "ADMIN", "getServiceTraffic");
        assert_(traffic.status === "success" && traffic.scope === "global_service_traffic",
            "Un servicio sin configuración directa no debe romper la consulta global.");
        assert_(traffic.sources.AUTH.directRequestsAvailable === false &&
            traffic.sources.AUTH.reason === "fetch_unavailable",
            "La fuente sin respuesta debe declararse parcial.");
        assert_(traffic.totals.last24Hours.AUTH === 0,
            "Una fuente no disponible no debe inventar conteos.");
    });

    test_("La telemetría global cuenta leases por servicio y deduplica reintentos de requestId", function() {
        const r = createRuntime_();
        const requestId = "traffic-dedupe-request-0001";
        const first = acquire_(r, "AUTH", "login", requestId);
        const retry = acquire_(r, "AUTH", "login", requestId);
        assert_(first.status === "success" && retry.status === "success" && first.token === retry.token,
            "El reintento debe reutilizar la lease existente.");
        const traffic = r.request("getServiceTraffic", "ADMIN", "getServiceTraffic");
        assert_(traffic.status === "success" && traffic.scope === "global_service_traffic",
            "ADMIN debe obtener el agregado global coordinado.");
        assert_(traffic.totals.last24Hours.AUTH === 1,
            "Un requestId idempotente solo debe incrementar una vez.");
        assert_(traffic.totals.last24Hours.ADMIN === 0,
            "La consulta interna de telemetría no debe duplicar el conteo de la lease.");
        assert_(!JSON.stringify(traffic).includes("sessionToken") && !JSON.stringify(traffic).includes("userId"),
            "La telemetría no debe exponer datos de sesión o identidad.");
    });

    test_("La publicación por lotes conserva orden de revisiones y reintentos idempotentes", function() {
        const r = createRuntime_();
        const changes = [
            { collection: "cortes", recordId: "VEH-1", operation: "upsert", snapshot: { id: "VEH-1", nombre: "Uno" }, sourceVersion: 1 },
            { collection: "cortes", recordId: "VEH-2", operation: "delete", sourceVersion: 2 }
        ];
        const requestId = "catalog-batch-request-0001";
        const first = r.request("publishCatalogChanges", "ADMIN", "normalizeImages", { requestId, changes });
        assert_(first.status === "success" && first.count === 2 && first.firstRevision === 1 && first.lastRevision === 2,
            "El lote debe publicar dos revisiones consecutivas en una operación.");
        const retry = r.request("publishCatalogChanges", "ADMIN", "normalizeImages", { requestId, changes });
        assert_(retry.status === "success" && retry.duplicate === true && retry.lastRevision === 2,
            "Repetir requestId debe devolver la publicación existente sin crear revisiones nuevas.");
        const feed = r.coordinator.getPublicCatalogChanges({ cursor: 0, limit: 50 });
        assert_(feed.changes.length === 2 && feed.changes[0].recordId === "VEH-1" &&
            feed.changes[1].recordId === "VEH-2" && feed.currentRevision === 2,
            "El feed debe conservar el orden y no duplicar eventos.");
        const single = r.request("publishCatalogChange", "ADMIN", "updateVehicleField", {
            requestId: "catalog-single-request-0001",
            change: { collection: "cortes", recordId: "VEH-3", operation: "upsert", snapshot: { id: "VEH-3" }, sourceVersion: 3 }
        });
        assert_(single.status === "success" && single.revision === 3,
            "La publicación individual debe conservar su contrato anterior.");
    });

    test_("Un lote inválido se rechaza completo y un lote parcial recupera con reset", function() {
        const r = createRuntime_();
        const valid = { collection: "cortes", recordId: "VEH-1", operation: "upsert", snapshot: { id: "VEH-1" }, sourceVersion: 1 };
        expectThrow_(() => r.request("publishCatalogChanges", "ADMIN", "normalizeImages", {
            requestId: "catalog-invalid-request-0001",
            changes: [valid, { collection: "unknown", recordId: "VEH-2", operation: "delete" }]
        }), "colección");
        assert_(r.coordinator.getPublicCatalogChanges({ cursor: 0, limit: 50 }).changes.length === 0,
            "Un elemento inválido no debe dejar eventos parciales.");
        const tooMany = Array.from({ length: 51 }, (_, index) => ({
            collection: "cortes", recordId: "VEH-" + index, operation: "delete"
        }));
        expectThrow_(() => r.request("publishCatalogChanges", "ADMIN", "normalizeImages", {
            requestId: "catalog-too-many-request-0001", changes: tooMany
        }), "1 y 50");
        assert_(r.coordinator.getPublicCatalogChanges({ cursor: 0, limit: 50 }).changes.length === 0,
            "Un lote que excede el límite no debe publicar ningún evento.");

        const requestId = "catalog-partial-request-0001";
        r.properties.setProperty("GPSpedia_CATALOG_CHANGE_REVISION", "1");
        r.properties.setProperty("GPSpedia_CATALOG_CHANGE_EVENT_1", JSON.stringify({
            revision: 1, collection: "cortes", recordId: "VEH-1", operation: "upsert",
            snapshot: { id: "VEH-1" }, sourceRequestId: requestId, batchIndex: 0, batchCount: 2
        }));
        const recovered = r.request("publishCatalogChanges", "ADMIN", "normalizeImages", {
            requestId,
            changes: [valid, { collection: "cortes", recordId: "VEH-2", operation: "delete" }]
        });
        assert_(recovered.status === "success" && recovered.recoveredPartial === true && recovered.resetRequired === true,
            "Un lote parcialmente persistido debe recuperarse con un evento reset, no con snapshots potencialmente antiguos.");
        const feed = r.coordinator.getPublicCatalogChanges({ cursor: 1, limit: 50 });
        assert_(feed.changes.length === 1 && feed.changes[0].operation === "reset",
            "El feed debe ordenar una reconstrucción completa después de un lote parcial.");
    });

    test_("El cliente reutiliza requestId cuando se pierde la primera respuesta de publicación", function() {
        const r = createRuntime_();
        r.properties.setProperty("GPSpedia_COORDINATOR_URL", "https://script.google.com/macros/s/TEST_DEPLOYMENT/exec");
        r.properties.setProperty("GPSpedia_COORDINATOR_SECRET", r.secrets.ADMIN);
        let calls = 0;
        const client = createSharedMutationClient_({
            properties: r.properties, uuid: r.uuid, logger: function() {},
            fetch: function(url, options) {
                calls++;
                const result = r.coordinator.handleRequest(JSON.parse(options.payload));
                if (calls === 1) throw new Error("simulated lost response");
                return { getResponseCode: () => 200, getContentText: () => JSON.stringify(result) };
            }
        });
        const response = client.publishCatalogChanges("ADMIN", "normalizeImages", [
            { collection: "cortes", recordId: "VEH-4", operation: "upsert", snapshot: { id: "VEH-4" } },
            { collection: "cortes", recordId: "VEH-5", operation: "delete" }
        ]);
        const feed = r.coordinator.getPublicCatalogChanges({ cursor: 0, limit: 50 });
        assert_(calls === 2 && response.duplicate === true && feed.changes.length === 2 && feed.currentRevision === 2,
            "La respuesta perdida debe recuperarse con el mismo requestId sin duplicar el lote.");
    });

    test_("El feed público del catálogo se cuenta dentro del lock existente y sin lease adicional", function() {
        const r = createRuntime_();
        const response = r.coordinator.getPublicCatalogChanges({ cursor: 0, limit: 50 });
        assert_(response.status === "success", "El feed público debe conservar su contrato.");
        const traffic = r.request("getServiceTraffic", "ADMIN", "getServiceTraffic");
        assert_(traffic.totals.last24Hours.CATALOG === 1,
            "Una consulta pública válida del feed debe contabilizarse como CATALOG.");
        assert_(traffic.totals.last24Hours.ADMIN === 0,
            "La consulta de telemetría no debe contar como tráfico ADMIN.");
    });

    test_("El feed solicitado por FEEDBACK conserva la clasificación de ese servicio", function() {
        const r = createRuntime_();
        const response = r.request("getCatalogChanges", "FEEDBACK", "getCatalogChanges", { cursor: 0, limit: 50 });
        assert_(response.status === "success", "FEEDBACK debe conservar el contrato del feed.");
        const traffic = r.request("getServiceTraffic", "ADMIN", "getServiceTraffic");
        assert_(traffic.totals.last24Hours.FEEDBACK === 1,
            "El feed interno debe atribuirse al servicio autenticado FEEDBACK.");
    });

    test_("La telemetría separa ventanas de una hora, seis horas y veinticuatro horas", function() {
        const r = createRuntime_();
        acquire_(r, "AUTH", "login", "traffic-window-request-0001");
        r.advance(2 * 60 * 60 * 1000);
        acquire_(r, "FEEDBACK", "reportProblem", "traffic-window-request-0002");
        const traffic = r.request("getServiceTraffic", "ADMIN", "getServiceTraffic");
        assert_(traffic.buckets.length === 24, "La respuesta debe contener 24 buckets horarios.");
        assert_(traffic.totals.lastHour.FEEDBACK === 1 && traffic.totals.lastHour.AUTH === 0,
            "La ventana de una hora debe excluir el bucket anterior.");
        assert_(traffic.totals.last6Hours.AUTH === 1 && traffic.totals.last6Hours.FEEDBACK === 1,
            "La ventana de seis horas debe agregar ambos servicios.");
        assert_(traffic.totals.last24Hours.AUTH === 1 && traffic.totals.last24Hours.FEEDBACK === 1,
            "La ventana de 24 horas debe conservar ambos eventos.");
    });

    test_("La consulta global de telemetría solo está disponible para ADMIN", function() {
        const r = createRuntime_();
        expectThrow_(() => r.request("getServiceTraffic", "WRITE", "getServiceTraffic"), "Solo ADMIN");
        const policy = coordinatorPolicy_("ADMIN", "getServiceTraffic");
        assert_(policy.readResources.includes("SERVICE_TRAFFIC") && policy.writeResources.length === 0,
            "La consulta debe reservar solo lectura del recurso de telemetría.");
    });

    test_("La retención elimina buckets fuera de 24 horas", function() {
        const r = createRuntime_();
        acquire_(r, "AUTH", "login", "traffic-old-request-0001");
        r.advance(25 * 60 * 60 * 1000);
        acquire_(r, "WRITE", "addOrUpdateCut", "traffic-new-request-0001");
        const traffic = r.request("getServiceTraffic", "ADMIN", "getServiceTraffic");
        assert_(traffic.buckets.length === 24, "La respuesta debe limitarse a 24 buckets.");
        assert_(traffic.totals.last24Hours.AUTH === 0 && traffic.totals.last24Hours.WRITE === 1,
            "No debe incluirse tráfico de más de 24 horas.");
        const keys = Object.keys(r.properties.getProperties()).filter(key => key.startsWith("GPSpedia_SERVICE_TRAFFIC_HOUR_"));
        assert_(keys.length === 1, "Los buckets expirados deben eliminarse del almacenamiento.");
    });

    test_("Un fallo al guardar telemetría nunca bloquea la lease protegida", function() {
        const r = createRuntime_();
        const originalSet = r.properties.setProperty;
        r.properties.setProperty = (key, value) => {
            if (String(key).startsWith("GPSpedia_SERVICE_TRAFFIC_HOUR_")) throw new Error("quota telemetry");
            return originalSet(key, value);
        };
        const lease = acquire_(r, "AUTH", "login", "traffic-best-effort-request-0001");
        assert_(lease.status === "success", "La operación debe continuar aunque falle la telemetría.");
    });

    test_("El actor se consulta una vez y las acciones siguientes usan caché local", function() {
        const store = new Map(); let validations = 0, storedTtl = 0;
        const cache = { get: key => store.has(key) ? store.get(key) : null, put: (key, value, ttl) => { store.set(key, value); storedTtl = ttl; }, remove: key => store.delete(key) };
        const deps = { cache, validate: userId => { validations++; return { status: "success", valid: true, actor: { userId, role: "tecnico", epoch: 7 } }; }, keyFor: (userId, token) => userId + ":" + token, ttlSeconds: 15 };
        const first = getCachedSharedSessionActor_("U-1", "token-1", deps), second = getCachedSharedSessionActor_("U-1", "token-1", deps);
        assert_(first.role === "tecnico" && second.userId === "U-1" && validations === 1 && storedTtl === 15);
    });
    test_("La caché separa usuarios y tokens diferentes", function() {
        const store = new Map(), cache = { get: key => store.get(key) || null, put: (key, value) => store.set(key, value), remove: key => store.delete(key) };
        let validations = 0;
        const deps = { cache, keyFor: (userId, token) => userId + ":" + token, validate: userId => { validations++; return { status: "success", valid: true, actor: { userId, role: "jefe", epoch: 2 } }; } };
        getCachedSharedSessionActor_("U-1", "token-1", deps); getCachedSharedSessionActor_("U-2", "token-1", deps); getCachedSharedSessionActor_("U-1", "token-2", deps);
        assert_(validations === 3);
    });
    test_("La caché rechaza sesiones revocadas y actores de otra identidad", function() {
        const store = new Map(), cache = { get: key => store.get(key) || null, put: (key, value) => store.set(key, value), remove: key => store.delete(key) };
        expectThrow_(() => getCachedSharedSessionActor_("U-1", "token-1", { cache, keyFor: () => "revoked", validate: () => ({ status: "success", valid: false }) }), "revocada");
        expectThrow_(() => getCachedSharedSessionActor_("U-1", "token-2", { cache, keyFor: () => "wrong", validate: () => ({ status: "success", valid: true, actor: { userId: "U-2", role: "tecnico", epoch: 1 } }) }), "revocada");
        assert_(store.size === 0);
    });

    test_("El cliente AUTH conserva revocación individual y global usando invalidación central", function() {
        const remoteCalls = [];
        const r = createRuntime_(null, function(url, options) {
            const request = JSON.parse(options.payload);
            const target = url.includes("WRITE") ? "WRITE" : url.includes("FEEDBACK") ? "FEEDBACK" : "ADMIN";
            remoteCalls.push({ target, tokens: request.payload.sessionTokens.slice() });
            return { getResponseCode: () => 200,
                getContentText: () => JSON.stringify({ status: "success", invalidated: request.payload.sessionTokens.length }) };
        });
        r.properties.setProperty("GPSpedia_SERVICE_URL_WRITE", "https://script.google.com/macros/s/WRITE/exec");
        r.properties.setProperty("GPSpedia_SERVICE_URL_FEEDBACK", "https://script.google.com/macros/s/FEEDBACK/exec");
        r.properties.setProperty("GPSpedia_SERVICE_URL_ADMIN", "https://script.google.com/macros/s/ADMIN/exec");
        const client = r.makeClient("AUTH");
        const userId = "USR-REMOTE-REVOKE", token = "session-token-remote-revoke-0001", createdAt = 1700000000000;
        r.request("registerSession", "AUTH", "registerSession", {
            userId, sessionToken: token, role: "tecnico", fullName: "Técnico", createdAt, lastActivityAt: createdAt
        });
        const individual = client.revokeSession(userId, token);
        assert_(individual.status === "success" && individual.revoked === true,
            "La revocación individual debe conservar su resultado.");
        expectThrow_(() => r.request("validateSessionContext", "AUTH", "validateSessionContext", {
            userId, sessionToken: token
        }), "revocada");

        const sessions = Array.from({ length: 7 }, (_, index) => ({
            token: "session-token-remote-bulk-" + String(index).padStart(4, "0"),
            createdAt: createdAt + index + 1, lastActivityAt: createdAt + index + 1
        }));
        r.request("syncUserSessions", "AUTH", "syncUserSessions", {
            userId, role: "desarrollador", fullName: "Developer", sessions
        });
        const bulk = client.revokeUserSessions(userId, sessions.map(item => item.token));
        assert_(bulk.status === "success" && bulk.revoked === true,
            "La revocación global debe conservar su resultado.");
        expectThrow_(() => r.request("validateSessionContext", "AUTH", "validateSessionContext", {
            userId, sessionToken: sessions[6].token
        }), "revocada");
        assert_(remoteCalls.length === 9, "Las invalidaciones individual y global deben llegar a WRITE, FEEDBACK y ADMIN.");
    });

    test_("Coordinator centraliza invalidación remota por lotes para WRITE, FEEDBACK y ADMIN", function() {
        const calls = [];
        const r = createRuntime_(null, function(url, options) {
            const request = JSON.parse(options.payload);
            calls.push({ url, request });
            const target = url.includes("WRITE") ? "WRITE" : url.includes("FEEDBACK") ? "FEEDBACK" : "ADMIN";
            assert_(request.action === "__invalidateSessionActorCache", "Debe usar el endpoint interno de invalidación.");
            assert_(request.payload.secret === r.secrets[target], "Debe usar el secreto propio de " + target + ".");
            return {
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify({ status: "success", invalidated: request.payload.sessionTokens.length })
            };
        });
        r.properties.setProperty("GPSpedia_SERVICE_URL_WRITE", "https://script.google.com/macros/s/WRITE/exec");
        r.properties.setProperty("GPSpedia_SERVICE_URL_FEEDBACK", "https://script.google.com/macros/s/FEEDBACK/exec");
        r.properties.setProperty("GPSpedia_SERVICE_URL_ADMIN", "https://script.google.com/macros/s/ADMIN/exec");
        const tokens = Array.from({ length: 7 }, (_, index) => "session-token-cache-" + String(index).padStart(4, "0"));
        const result = r.request("invalidateSessionActorCaches", "AUTH", "invalidateSessionActorCaches", {
            userId: "USR-CACHE-1", sessionTokens: tokens
        });
        assert_(result.status === "success" && result.invalidated === 7, "Debe confirmar todos los tokens.");
        assert_(result.confirmed.WRITE === 7 && result.confirmed.FEEDBACK === 7 && result.confirmed.ADMIN === 7, "Los tres servicios deben confirmar cada token.");
        assert_(calls.length === 6, "Siete tokens deben dividirse en dos lotes por cada uno de los tres servicios.");
        assert_(calls.every(call => call.request.payload.userId === "USR-CACHE-1"), "Debe conservar la identidad objetivo.");
        assert_(!JSON.stringify(result).includes("session-token-cache"), "La respuesta no debe exponer tokens.");
    });

    test_("Una invalidación parcial falla de forma explícita y admite reintento idempotente", function() {
        let failFeedback = true;
        const calls = [];
        const r = createRuntime_(null, function(url, options) {
            const request = JSON.parse(options.payload);
            const target = url.includes("WRITE") ? "WRITE" : url.includes("FEEDBACK") ? "FEEDBACK" : "ADMIN";
            calls.push(target);
            const invalidated = request.payload.sessionTokens.length;
            if (target === "FEEDBACK" && failFeedback) {
                return { getResponseCode: () => 503, getContentText: () => JSON.stringify({ status: "error" }) };
            }
            return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ status: "success", invalidated }) };
        });
        r.properties.setProperty("GPSpedia_SERVICE_URL_WRITE", "https://script.google.com/macros/s/WRITE/exec");
        r.properties.setProperty("GPSpedia_SERVICE_URL_FEEDBACK", "https://script.google.com/macros/s/FEEDBACK/exec");
        r.properties.setProperty("GPSpedia_SERVICE_URL_ADMIN", "https://script.google.com/macros/s/ADMIN/exec");
        const payload = { userId: "USR-CACHE-2", sessionTokens: ["session-token-cache-retry-0001"] };
        expectThrow_(() => r.request("invalidateSessionActorCaches", "AUTH", "invalidateSessionActorCaches", payload), "FEEDBACK");
        assert_(calls.join(",") === "WRITE,FEEDBACK", "La primera ejecución debe detectar el fallo parcial.");
        failFeedback = false;
        const retry = r.request("invalidateSessionActorCaches", "AUTH", "invalidateSessionActorCaches", payload);
        assert_(retry.status === "success" && retry.invalidated === 1, "El mismo lote debe poder repetirse sin duplicar efectos.");
        assert_(calls.join(",") === "WRITE,FEEDBACK,WRITE,FEEDBACK,ADMIN", "El reintento debe confirmar los tres destinos.");
    });

    test_("La invalidación remota de caché permanece reservada a AUTH", function() {
        const r = createRuntime_();
        expectThrow_(() => r.request("invalidateSessionActorCaches", "WRITE", "invalidateSessionActorCaches", {
            userId: "USR-CACHE-3", sessionTokens: ["session-token-cache-denied-0001"]
        }), "Solo AUTH");
    });

    test_("Coordinator conserva compatibilidad con clientes legacy y rechaza protocolos desconocidos", function() {
        const r = createRuntime_();
        const legacy = r.request("getServiceTraffic", "ADMIN", "getServiceTraffic");
        assert_(legacy.status === "success", "Los clientes sin protocolVersion deben conservar el contrato v1.");
        const explicitV1 = r.coordinator.handleRequest({
            protocolVersion: 1,
            action: "getServiceTraffic",
            payload: { service: "ADMIN", operation: "getServiceTraffic", secret: r.secrets.ADMIN }
        });
        assert_(explicitV1.status === "success", "Los clientes actuales deben conservar v1 aunque cambie la versión interna de Coordinator.");
        expectThrow_(() => r.coordinator.handleRequest({
            protocolVersion: 99,
            action: "getServiceTraffic",
            payload: { service: "ADMIN", operation: "getServiceTraffic", secret: r.secrets.ADMIN }
        }), "protocolo no compatible");
        expectThrow_(() => r.coordinator.handleRequest({
            protocolVersion: "invalid",
            action: "getServiceTraffic",
            payload: { service: "ADMIN", operation: "getServiceTraffic", secret: r.secrets.ADMIN }
        }), "protocolo no compatible");
    });

    test_("SharedMutationClient declara protocolo v1 sin cambiar la semántica de la operación", function() {
        const r = createRuntime_();
        r.properties.setProperty("GPSpedia_COORDINATOR_URL", "https://script.google.com/macros/s/TEST_DEPLOYMENT/exec");
        r.properties.setProperty("GPSpedia_COORDINATOR_SECRET", r.secrets.ADMIN);
        let captured = null;
        const client = createSharedMutationClient_({
            properties: r.properties, uuid: r.uuid, logger: function() {},
            fetch: function(url, options) {
                captured = JSON.parse(options.payload);
                const result = r.coordinator.handleRequest(captured);
                return { getResponseCode: () => 200, getContentText: () => JSON.stringify(result) };
            }
        });
        const result = client.getServiceTraffic();
        assert_(captured && captured.protocolVersion === 1,
            "El cliente actual debe declarar protocolVersion 1.");
        assert_(result.status === "success" && result.scope === "global_service_traffic",
            "La versión de protocolo no debe cambiar el resultado funcional.");
    });

    test_("Cada servicio valida sesiones con su propia identidad y secreto", function() {
        const r = createRuntime_();
        const userId = "USR-SERVICE-VALIDATION";
        const token = "session-token-service-validation-0001";
        const createdAt = 1700000000000;
        r.request("registerSession", "AUTH", "registerSession", {
            userId, sessionToken: token, role: "tecnico", fullName: "Técnico",
            createdAt, lastActivityAt: createdAt
        });
        const services = ["AUTH", "USERS", "WRITE", "ADMIN", "FEEDBACK", "UTILITIES"];
        services.forEach(service => {
            const client = r.makeClient(service);
            const result = client.validateSessionContext(userId, token, service);
            assert_(result.status === "success" && result.valid === true &&
                result.actor.userId === userId && result.actor.role === "tecnico",
                service + " debe validar con su propio secreto.");
        });
        const traffic = r.request("getServiceTraffic", "ADMIN", "getServiceTraffic");
        services.forEach(service => {
            assert_(traffic.totals.last24Hours[service] >= 1,
                "La validación debe atribuirse al servicio solicitante " + service + ".");
        });
        expectThrow_(() => r.makeClient("FEEDBACK").validateSessionContext(userId, token, "CATALOG"), "no autorizado");
    });

    test_("El cliente antiguo conserva la validación AUTH por defecto", function() {
        const r = createRuntime_();
        const userId = "USR-AUTH-DEFAULT", token = "session-token-auth-default-0001", createdAt = 1700000000000;
        r.request("registerSession", "AUTH", "registerSession", {
            userId, sessionToken: token, role: "jefe", fullName: "Jefe",
            createdAt, lastActivityAt: createdAt
        });
        const result = r.makeClient("AUTH").validateSessionContext(userId, token);
        assert_(result.status === "success" && result.actor.userId === userId,
            "Los consumidores antiguos deben conservar el comportamiento por defecto AUTH.");
    });

    test_("La lease de carpetas Drive no bloquea una mutación independiente de Cortes", function() {
        const r = createRuntime_();
        const client = r.makeClient("WRITE");
        const result = client.withLease("WRITE", "ensureSupplementaryVehicleFolder", function() {
            return client.withLease("WRITE", "addOrUpdateCut", function() {
                return "Cortes pudo avanzar mientras la carpeta tenía su lease.";
            });
        });
        assert_(result === "Cortes pudo avanzar mientras la carpeta tenía su lease.",
            "La operación de carpeta debe coordinar solo DRIVE_FOLDER, sin bloquear CORTES.");
    });

    test_("WRITE publica snapshots fuera de orden como reset y nunca permite regresión del catálogo", function() {
        const r = createRuntime_();
        const newer = r.request("publishCatalogChange", "WRITE", "addOrUpdateCut", {
            requestId: "write-catalog-version-0002",
            change: { collection: "cortes", recordId: "42", operation: "upsert",
                snapshot: { id: "42", marca: "Nuevo" }, sourceVersion: 2 }
        });
        const stale = r.request("publishCatalogChange", "WRITE", "addOrUpdateCut", {
            requestId: "write-catalog-version-0001",
            change: { collection: "cortes", recordId: "42", operation: "upsert",
                snapshot: { id: "42", marca: "Antiguo" }, sourceVersion: 1 }
        });
        const feed = r.coordinator.getPublicCatalogChanges({ cursor: 0, limit: 50 });
        assert_(newer.status === "success" && stale.status === "success",
            "Ambas publicaciones deben terminar con respuesta controlada.");
        assert_(feed.changes.length === 2 && feed.changes[0].snapshot.marca === "Nuevo" &&
            feed.changes[1].operation === "reset" && feed.changes[1].staleSourceVersion === true,
            "Una versión atrasada debe forzar reset y nunca publicar un snapshot antiguo.");
        assert_(feed.resetRequired === true && feed.currentRevision === 2,
            "El feed debe solicitar reconciliación completa al detectar una publicación atrasada.");
    });

    test_("WRITE convierte publicaciones legacy sin versión en reset seguro", function() {
        const r = createRuntime_();
        const result = r.request("publishCatalogChange", "WRITE", "addOrUpdateCut", {
            requestId: "write-catalog-legacy-0001",
            change: { collection: "cortes", recordId: "77", operation: "upsert", snapshot: { id: "77" } }
        });
        const feed = r.coordinator.getPublicCatalogChanges({ cursor: 0, limit: 50 });
        assert_(result.status === "success" && feed.changes.length === 1 &&
            feed.changes[0].operation === "reset" && feed.resetRequired === true,
            "Las publicaciones antiguas de WRITE no deben sobrescribir snapshots versionados.");
    });

    const summary = { status: failed === 0 ? "PASS" : "FAIL", passed, failed, results };
    return summary;
}
