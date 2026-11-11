// Contrato estático entre ACTION_TO_SERVICE_MAP y los dispatchers versionados.
// Recibe los archivos fuente para ejecutarse sin endpoints ni servicios externos.
function runActionDispatchContractTests(sources) {
    const input = sources || {};
    const results = [];
    let passed = 0, failed = 0;
    function assert_(value, message) { if (!value) throw new Error(message || "Aserción fallida."); }
    function run_(name, callback) {
        try { callback(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    }
    function parseObject_(source, declaration) {
        const match = String(source || "").match(new RegExp("export\\s+const\\s+" + declaration + "\\s*=\\s*\\{([\\s\\S]*?)\\n\\};"));
        assert_(!!match, "No se encontró " + declaration + ".");
        return match[1];
    }
    function parseMap_(source, declaration) {
        const block = parseObject_(source, declaration), result = {};
        for (const match of block.matchAll(/['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/g)) {
            assert_(!Object.prototype.hasOwnProperty.call(result, match[1]), "Clave duplicada: " + match[1]);
            result[match[1]] = match[2];
        }
        return result;
    }
    function parseCompatibility_(source) {
        const block = parseObject_(source, "SERVICE_COMPATIBILITY_ACTIONS"), result = {};
        for (const match of block.matchAll(/([A-Z]+)\s*:\s*\[([^\]]*)\]/g)) {
            result[match[1]] = [...match[2].matchAll(/['"]([^'"]+)['"]/g)].map(x => x[1]);
        }
        return result;
    }
    function parseExternal_(source) {
        const block = parseObject_(source, "EXTERNAL_ACTIONS"), result = {};
        for (const match of block.matchAll(/([A-Za-z]+)\s*:\s*\{\s*service\s*:\s*['"]([^'"]+)['"]/g)) result[match[1]] = match[2];
        return result;
    }
    function parseDispatcher_(source, name) {
        const match = String(source || "").match(/switch\s*\(\s*(?:request\.action|action)\s*\)\s*\{([\s\S]*?)\n\s*default\s*:/);
        assert_(!!match, "No se encontró dispatcher " + name + ".");
        const actions = [...match[1].matchAll(/case\s+['"]([^'"]+)['"]\s*:/g)].map(x => x[1]);
        assert_(new Set(actions).size === actions.length, "Acciones duplicadas en dispatcher " + name + ".");
        return actions;
    }
    const api = String(input.apiConfig || "");
    let actionMap = {}, compatibility = {}, external = {};
    const dispatchers = {};
    const endpointBlock = parseObject_(api, "API_ENDPOINTS");
    const endpoints = [...endpointBlock.matchAll(/([A-Z]+)\s*:\s*['"]([^'"]+)['"]/g)].map(x => x[1]);
    run_("lee mapas y dispatchers versionados", () => {
        actionMap = parseMap_(api, "ACTION_TO_SERVICE_MAP");
        compatibility = parseCompatibility_(api);
        external = parseExternal_(api);
        for (const service of ["AUTH","USERS","CATALOG","WRITE","FEEDBACK","ADMIN"]) dispatchers[service] = parseDispatcher_(input[service], service);
        const utilityMatch = String(input.UTILITIES || "").match(/body\.action\s*!==\s*['"]([^'"]+)['"]/);
        assert_(!!utilityMatch, "No se encontró el contrato de acción de UTILITIES.");
        dispatchers.UTILITIES = [utilityMatch[1]];
    });
    run_("cada acción mapeada apunta a un endpoint y dispatcher válidos", () => {
        for (const [action, service] of Object.entries(actionMap)) {
            assert_(endpoints.includes(service), action + " apunta a un servicio sin endpoint: " + service);
            if (service === "LEGACY") assert_(external[action] === service, action + " no está declarado como externo.");
            else assert_(dispatchers[service] && dispatchers[service].includes(action), action + " no existe en dispatcher " + service + ".");
        }
    });
    run_("cada acción de dispatcher está mapeada o declarada como compatibilidad", () => {
        for (const [service, actions] of Object.entries(dispatchers)) {
            for (const action of actions) {
                assert_(actionMap[action] === service || (compatibility[service] || []).includes(action),
                    service + "/" + action + " carece de mapa o declaración de compatibilidad.");
            }
        }
    });
    run_("las compatibilidades corresponden a rutas reales no canónicas", () => {
        for (const [service, actions] of Object.entries(compatibility)) {
            assert_(!!dispatchers[service], "Servicio de compatibilidad desconocido: " + service);
            for (const action of actions) {
                assert_(dispatchers[service].includes(action), service + "/" + action + " no existe.");
                assert_(actionMap[action] !== service, service + "/" + action + " debe usar el mapa canónico.");
            }
        }
    });
    run_("logFrontend declara su dependencia externa y consumidor", () => {
        assert_(actionMap.logFrontend === "LEGACY", "logFrontend no apunta a LEGACY.");
        assert_(external.logFrontend === "LEGACY", "Falta la declaración externa de logFrontend.");
        const legacy = (endpointBlock.match(/LEGACY\s*:\s*['"]([^'"]+)['"]/) || [])[1];
        const scriptUrl = (String(input.usersHtml || "").match(/const\s+SCRIPT_URL\s*=\s*['"]([^'"]+)['"]/) || [])[1];
        assert_(!!legacy && scriptUrl === legacy, "SCRIPT_URL de users.html no coincide con API_ENDPOINTS.LEGACY.");
        assert_(/action:\s*['"]logFrontend['"]/.test(String(input.usersHtml || "")), "users.html ya no consume logFrontend.");
    });
    run_("retira rutas sin consumidor o sustituidas", () => {
        for (const action of ["addCorte","migrateYearRanges","assignCollaborator"]) {
            assert_(!Object.prototype.hasOwnProperty.call(actionMap, action), action + " sigue mapeada.");
        }
    });
    run_("getHeaders está retirado del dispatcher y del mapa", () => {
        assert_(!Object.prototype.hasOwnProperty.call(actionMap, "getHeaders"), "getHeaders sigue mapeada.");
        assert_(!dispatchers.WRITE.includes("getHeaders"), "getHeaders sigue expuesta por WRITE.");
    });
    run_("assignCollaborator no está expuesta por dispatcher", () => {
        for (const [service, actions] of Object.entries(dispatchers)) assert_(!actions.includes("assignCollaborator"), service + " aún expone assignCollaborator.");
    });
    run_("routeAction falla cerrado ante un servicio no configurado", () => {
        assert_(/if\s*\(!targetUrl\)\s*throw new Error/.test(api), "routeAction aún redirige silenciosamente a LEGACY.");
        assert_(!/if\s*\(!targetUrl\)\s*targetUrl\s*=\s*API_ENDPOINTS\.LEGACY/.test(api), "Se conserva fallback a LEGACY.");
    });
    run_("ADMIN separa acciones de edición modal del resto de acciones exclusivas de Desarrollador", () => {
        const adminSource = String(input.ADMIN || "");
        assert_(/const ADMIN_MODAL_EDIT_ACTIONS = new Set\\(\\["updateVehicleField","uploadAdminImage","getAdminImageUploadStatus"\\]\\)/.test(adminSource),
            "La lista de acciones Gefe debe limitarse a las tres operaciones del modal.");
        assert_(/ADMIN_MODAL_EDIT_ACTIONS\\.has\\(action\\) \\? assertModalEditSession\\(payload\\) : assertDeveloperSession\\(payload\\)/.test(adminSource),
            "ADMIN debe exigir sesión Desarrollador para acciones ajenas al modal.");
        assert_(/function assertModalEditSession\\(payload\\)\\{return getAdminSessionContext_\\(payload,\\["desarrollador","gefe"\\]\\);\\}/.test(adminSource),
            "La sesión modal debe validar roles desde el servidor.");
        assert_(/function assertDeveloperSession\\(payload\\)\\{return getAdminSessionContext_\\(payload,\\["desarrollador"\\]\\);\\}/.test(adminSource),
            "La sesión administrativa general debe seguir siendo exclusiva de Desarrollador.");
    });
    run_("el mapa no contiene servicios duplicados o inválidos", () => {
        for (const service of Object.values(actionMap)) assert_(endpoints.includes(service), "Servicio sin endpoint: " + service);
        assert_(new Set(Object.keys(actionMap)).size === Object.keys(actionMap).length, "Acciones duplicadas en el mapa.");
    });
    return { status: failed === 0 ? "PASS" : "FAIL", passed, failed, results };
}
