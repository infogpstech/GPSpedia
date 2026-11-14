// Contrato estático entre ACTION_TO_SERVICE_MAP, routers versionados y consumidores.
// Se ejecuta con fuentes locales: no llama endpoints ni servicios externos.
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
        for (const match of block.matchAll(/([A-Za-z]+)\s*:\s*\{\s*service\s*:\s*['"]([^'"]+)['"]\s*,\s*consumer\s*:\s*['"]([^'"]+)['"]\s*,\s*source\s*:\s*['"]([^'"]+)['"]/g)) {
            result[match[1]] = { service: match[2], consumer: match[3], source: match[4] };
        }
        return result;
    }
    function hasFunction_(source, name) {
        return new RegExp("\\bfunction\\s+" + name + "\\s*\\(").test(String(source || ""));
    }
    function parseDispatcher_(source, name) {
        const match = String(source || "").match(/switch\s*\(\s*(?:request\.action|action)\s*\)\s*\{([\s\S]*?)\n\s*default\s*:/);
        assert_(!!match, "No se encontró dispatcher " + name + ".");
        const block = match[1], cases = [...block.matchAll(/case\s+['"]([^'"]+)['"]\s*:/g)];
        const actions = [], handlers = {};
        for (let i = 0; i < cases.length; i++) {
            const current = cases[i], end = i + 1 < cases.length ? cases[i + 1].index : block.length;
            const body = block.slice(current.index + current[0].length, end);
            const action = current[1], handlerNames = [...body.matchAll(/\b((?:handle|validate)[A-Z][A-Za-z0-9_]*)\s*\(/g)].map(x => x[1]);
            actions.push(action);
            if (handlerNames.length) handlers[action] = [...new Set(handlerNames)];
            else if (name === "ADMIN" && action === "ping" && /response\s*=\s*\{\s*status\s*:\s*['"]success['"]/.test(body)) handlers[action] = null;
            else handlers[action] = "";
        }
        assert_(new Set(actions).size === actions.length, "Acciones duplicadas en dispatcher " + name + ".");
        return { actions, handlers };
    }
    function parseConsumers_(sources) {
        const found = [];
        const patterns = [
            /routeAction\s*\(\s*['"]([^'"]+)['"]/g,
            /\baction\s*:\s*['"]([^'"]+)['"]/g,
            /['"]action['"]\s*:\s*['"]([^'"]+)['"]/g
        ];
        for (const [file, source] of Object.entries(sources || {})) {
            for (const pattern of patterns) {
                pattern.lastIndex = 0;
                for (const match of String(source || "").matchAll(pattern)) found.push({ action: match[1], file });
            }
        }
        return found;
    }

    const api = String(input.apiConfig || "");
    let actionMap = {}, compatibility = {}, external = {}, dispatchers = {};
    const endpointBlock = parseObject_(api, "API_ENDPOINTS");
    const endpoints = [...endpointBlock.matchAll(/([A-Z]+)\s*:\s*['"]([^'"]+)['"]/g)].map(x => x[1]);
    const consumerActions = parseConsumers_(input.consumerSources || {});

    run_("lee mapas, routers y consumidores versionados", () => {
        actionMap = parseMap_(api, "ACTION_TO_SERVICE_MAP");
        compatibility = parseCompatibility_(api);
        external = parseExternal_(api);
        for (const service of ["AUTH","USERS","CATALOG","WRITE","FEEDBACK","ADMIN"]) dispatchers[service] = parseDispatcher_(input[service], service);
        const utilitySource = String(input.UTILITIES || "");
        const utilityMatch = utilitySource.match(/body\.action\s*!==\s*['"]([^'"]+)['"]/);
        assert_(!!utilityMatch, "No se encontró el contrato de acción de UTILITIES.");
        const utilityHandler = utilitySource.match(/response\s*=\s*(migrate[A-Za-z0-9_]+)\s*\(/);
        assert_(!!utilityHandler, "UTILITIES no declara el handler de su acción.");
        dispatchers.UTILITIES = { actions: [utilityMatch[1]], handlers: { [utilityMatch[1]]: [utilityHandler[1]] } };
        assert_(consumerActions.length > 0, "No se proporcionaron fuentes de consumidores.");
    });
    run_("cada acción mapeada apunta a un endpoint, dispatcher y handler existentes", () => {
        for (const [action, service] of Object.entries(actionMap)) {
            assert_(endpoints.includes(service), action + " apunta a un servicio sin endpoint: " + service);
            if (service === "LEGACY") {
                assert_(external[action] && external[action].service === service, action + " no está declarado como externo.");
                continue;
            }
            const dispatcher = dispatchers[service];
            assert_(dispatcher && dispatcher.actions.includes(action), action + " no existe en dispatcher " + service + ".");
            const handler = dispatcher.handlers[action];
            if (handler === null) assert_(service === "ADMIN" && action === "ping", "Handler inline no permitido: " + service + "/" + action);
            else {
                assert_(Array.isArray(handler) && handler.length, service + "/" + action + " no enlaza con un handler.");
                for (const name of handler) assert_(hasFunction_(input[service], name), service + "/" + action + " referencia una función inexistente: " + name);
            }
        }
    });
    run_("cada handler público está mapeado o documentado como compatibilidad", () => {
        for (const [service, dispatcher] of Object.entries(dispatchers)) {
            for (const action of dispatcher.actions) {
                assert_(actionMap[action] === service || (compatibility[service] || []).includes(action),
                    service + "/" + action + " carece de mapa o declaración de compatibilidad.");
                const handler = dispatcher.handlers[action];
                if (handler) for (const name of handler) assert_(hasFunction_(input[service], name), service + "/" + action + " referencia una función inexistente: " + name);
            }
        }
    });
    run_("cada acción consumida por la interfaz está mapeada o declarada como externa", () => {
        for (const item of consumerActions) {
            assert_(Object.prototype.hasOwnProperty.call(actionMap, item.action),
                item.file + " consume " + item.action + " pero no existe en ACTION_TO_SERVICE_MAP.");
            const service = actionMap[item.action];
            assert_(service !== "LEGACY" || (external[item.action] && external[item.action].service === "LEGACY"),
                item.file + " consume una acción LEGACY sin declaración externa: " + item.action);
        }
    });
    run_("las compatibilidades corresponden a rutas reales no canónicas", () => {
        for (const [service, actions] of Object.entries(compatibility)) {
            assert_(!!dispatchers[service], "Servicio de compatibilidad desconocido: " + service);
            for (const action of actions) {
                assert_(dispatchers[service].actions.includes(action), service + "/" + action + " no existe.");
                assert_(actionMap[action] !== service, service + "/" + action + " debe usar el mapa canónico.");
            }
        }
    });
    run_("las acciones externas tienen servicio, consumidor y origen documentados", () => {
        for (const [action, entry] of Object.entries(external)) {
            assert_(actionMap[action] === entry.service, action + " no coincide con su servicio externo.");
            assert_(endpoints.includes(entry.service), action + " apunta a un endpoint externo inexistente.");
            assert_(!!entry.consumer && !!entry.source, action + " carece de consumidor u origen documentado.");
        }
        assert_(actionMap.logFrontend === "LEGACY", "logFrontend no apunta a LEGACY.");
        assert_(external.logFrontend && external.logFrontend.consumer.includes("users.html"), "Falta el consumidor documentado de logFrontend.");
        const legacy = (endpointBlock.match(/LEGACY\s*:\s*['"]([^'"]+)['"]/) || [])[1];
        const scriptUrl = (String(input.usersHtml || "").match(/const\s+SCRIPT_URL\s*=\s*['"]([^'"]+)['"]/) || [])[1];
        assert_(!!legacy && scriptUrl === legacy, "SCRIPT_URL de users.html no coincide con API_ENDPOINTS.LEGACY.");
    });
    run_("retira rutas sin consumidor o sustituidas", () => {
        for (const action of ["addCorte","migrateYearRanges","assignCollaborator"]) {
            assert_(!Object.prototype.hasOwnProperty.call(actionMap, action), action + " sigue mapeada.");
        }
    });
    run_("getHeaders está retirado del dispatcher y del mapa", () => {
        assert_(!Object.prototype.hasOwnProperty.call(actionMap, "getHeaders"), "getHeaders sigue mapeada.");
        assert_(!dispatchers.WRITE.actions.includes("getHeaders"), "getHeaders sigue expuesta por WRITE.");
    });
    run_("assignCollaborator no está expuesta por dispatcher", () => {
        for (const [service, dispatcher] of Object.entries(dispatchers)) assert_(!dispatcher.actions.includes("assignCollaborator"), service + " aún expone assignCollaborator.");
    });
    run_("routeAction falla cerrado ante un servicio no configurado", () => {
        assert_(/if\s*\(!targetUrl\)\s*throw new Error/.test(api), "routeAction aún redirige silenciosamente a LEGACY.");
        assert_(!/if\s*\(!targetUrl\)\s*targetUrl\s*=\s*API_ENDPOINTS\.LEGACY/.test(api), "Se conserva fallback a LEGACY.");
    });
    run_("ADMIN separa acciones de edición modal del resto de acciones exclusivas de Desarrollador", () => {
        const adminSource = String(input.ADMIN || "");
        assert_(adminSource.includes('const ADMIN_MODAL_EDIT_ACTIONS = new Set(["updateVehicleField","uploadAdminImage","getAdminImageUploadStatus"]);'),
            "La lista de acciones de Jefe debe limitarse a las tres operaciones del modal.");
        assert_(adminSource.includes("ADMIN_MODAL_EDIT_ACTIONS.has(action) ? assertModalEditSession(payload) : assertDeveloperSession(payload)"),
            "ADMIN debe exigir sesión Desarrollador para acciones ajenas al modal.");
        assert_(adminSource.includes('function assertModalEditSession(payload){return getAdminSessionContext_(payload,["desarrollador","jefe","supervisor"]);}'),
            "La sesión modal debe validar Supervisor, Jefe y Desarrollador desde el servidor.");
        assert_(adminSource.includes('function assertDeveloperSession(payload){return getAdminSessionContext_(payload,["desarrollador"]);}'),
            "La sesión administrativa general debe seguir siendo exclusiva de Desarrollador.");
    });
    run_("el mapa no contiene servicios duplicados o inválidos", () => {
        for (const service of Object.values(actionMap)) assert_(endpoints.includes(service), "Servicio sin endpoint: " + service);
        assert_(new Set(Object.keys(actionMap)).size === Object.keys(actionMap).length, "Acciones duplicadas en el mapa.");
    });
    return { status: failed === 0 ? "PASS" : "FAIL", passed, failed, results };
}