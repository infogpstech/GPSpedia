// AUG-055: pruebas conductuales de pérdida de respuesta y reconciliación del flujo de add_cortes.
async function runAddCutOperationRecoveryFlowTests(sources) {
    const frontend = String(sources.frontend || '');
    function assert_(value, message) { if (!value) throw new Error(message || 'Aserción fallida.'); }
    function extract_(source, name) {
        let start = source.indexOf('async function ' + name + '(');
        if (start < 0) start = source.indexOf('function ' + name + '(');
        assert_(start >= 0, 'No se encontró ' + name);
        const open = source.indexOf('{', start); let depth = 0, quote = '', escaped = false, line = false, block = false;
        for (let i = open; i < source.length; i++) {
            const ch = source[i], next = source[i + 1];
            if (line) { if (ch === '\n') line = false; continue; }
            if (block) { if (ch === '*' && next === '/') { block = false; i++; } continue; }
            if (quote) { if (escaped) escaped = false; else if (ch === '\\') escaped = true; else if (ch === quote) quote = ''; continue; }
            if (ch === '/' && next === '/') { line = true; i++; continue; }
            if (ch === '/' && next === '*') { block = true; i++; continue; }
            if (ch === "'" || ch === '"' || ch === '\`') { quote = ch; continue; }
            if (ch === '{') depth++;
            if (ch === '}' && --depth === 0) return source.slice(start, i + 1);
        }
        throw new Error('Bloque incompleto: ' + name);
    }
    const module = frontend.match(/<script type="module">([\s\S]*?)<\/script>/);
    assert_(!!module, 'No se encontró módulo frontend');
    const submitCode = extract_(module[1], 'handleStage2Submit');
    const workerCode = extract_(module[1], 'performPendingOperationRecovery');
    const recoveryCode = extract_(module[1], 'checkAndRecoverPendingOperation');
    const hash = 'a'.repeat(64);
    function makeContext(mode, initialSnapshot, removeFailures, options = {}) {
        const calls = [], alerts = [], stages = [], logs = [];
        const state = {
            userId: 'OWNER-1', sessionToken: 'session', opId: null, selectedVehicleId: null,
            vehicleInfo: { marca: 'Toyota', modelo: 'Hilux', categoria: 'Camioneta', versionesAplicables: '2.8', anoDesde: '2024', tipoEncendido: 'Llave' },
            savedFiles: { imagenVehiculo: null, imgCorte1: null }, restoredFiles: { imagenVehiculo: null, imgCorte1: null }, timestamp: null
        };
        const elements = {
            silentRegister: { checked: false }, testigoMotor: { checked: false },
            tipoCorte1: { value: 'Ignición' }, configRelay1: { value: 'Normal' },
            ubicacionCorte1: { value: 'Arnés principal' }, ubicacionCorte2: { value: '' }, ubicacionCorte3: { value: '' },
            colorCableCorte1: { value: 'Azul' }, imagenVehiculo: { files: options.imageData ? [{}] : [] }, imgCorte1: { files: options.imageData ? [{}] : [] },
            'form-stage-2': {}
        };
        const document = { getElementById(id) { return Object.prototype.hasOwnProperty.call(elements, id) ? elements[id] : null; } };
        const button = { classList: { add() {}, remove() {} } };
        const event = { preventDefault() {}, target: { querySelector() { return button; } } };
        let snapshot = initialSnapshot ? JSON.parse(JSON.stringify(initialSnapshot)) : null;
        let server = null, addCount = 0, checkCount = 0, pendingWrites = 0;
        async function save(operation) {
            if (options.quotaFailure) { const quotaError = new Error('simulated storage quota'); quotaError.name = 'QuotaExceededError'; throw quotaError; }
            pendingWrites++;
            if (snapshot && (snapshot.id !== operation.id || snapshot.operationHash !== operation.operationHash ||
                (snapshot.status === 'completed' && operation.status !== 'completed'))) {
                pendingWrites--; return { saved: false, conflict: true };
            }
            snapshot = JSON.parse(JSON.stringify(operation));
            pendingWrites--; return { saved: true };
        }
        async function read() { return { available: true, operation: snapshot ? JSON.parse(JSON.stringify(snapshot)) : null }; }
        async function remove(ownerId, opId, operationHash) {
            if (removeFailures > 0) { removeFailures--; return { removed: false, error: true }; }
            if (!snapshot) return { removed: true, missing: true };
            if (snapshot.ownerId !== ownerId || snapshot.id !== opId || snapshot.operationHash !== operationHash) return { removed: false, conflict: true };
            snapshot = null; return { removed: true };
        }
        async function routeAction(action, payload) {
            if (action === 'checkOperation') {
                checkCount++;
                if (server) return { status: 'success', exists: true, pending: false, vehicleId: server.vehicleId, timestamp: 'server-time', operationHash: server.operationHash };
                return { status: 'success', exists: false, pending: false };
            }
            if (action === 'addOrUpdateCut') {
                addCount++; calls.push({ opId: payload.opId, operationHash: payload.operationHash });
                if (mode === 'before' && addCount === 1) throw new Error('network lost before commit');
                server = { vehicleId: 'VEH-42', operationHash: payload.operationHash };
                if (mode === 'after' && addCount === 1) throw new Error('network lost after commit');
                return { status: 'success', vehicleId: server.vehicleId, timestamp: 'server-time', operationHash: server.operationHash };
            }
            throw new Error('Unexpected action: ' + action);
        }
        const dependencies = {
            state, document, window: { location: { replace() {} } }, navigator: { onLine: options.online !== false },
            console: { log() {}, warn() {}, error() {} }, showConciseAlert_(message) { alerts.push(message); }, diagnostics: Object.fromEntries(['debug','info','warn','error'].map(level => [level, (event, context) => logs.push({level,event,context})])), alert(message) { alerts.push(message); },
            toggleLoading() {}, toggleNoRecomendado() {}, showPhase() {}, proceedToStage3(id) { stages.push(id); },
            isSubmittingStage1:false, isSubmittingStage2:false, isSubmittingStage3:false, pendingOperationRecoveryPromise:null, pendingOperationRecoveryRequested:false, resumePendingOperationRecovery:async()=>false, refreshSelectedVehicleMatch:async()=>{}, getCurrentSessionForOwner(owner) { return { userId: owner, sessionToken: 'session' }; },
            getOrGenerateOpId: async () => {
                const current = await read();
                if (!current.available) throw new Error('PENDING_OPERATION_STORAGE_UNAVAILABLE');
                if (current.operation) {
                    if (current.operation.status === 'completed') throw new Error('COMPLETED_OPERATION_REQUIRES_RECOVERY');
                    return current.operation.id;
                }
                return 'OP-100';
            },
            computeClientCutOperationFingerprint: async () => hash,
            saveAddCutOperationPendingOperation: save,
            getAddCutOperationPendingOperation: read,
            removeAddCutOperationPendingOperation: remove,
            routeAction, fileToBase64: async () => options.imageData || null, isNoRecomendadoValue: () => false,
            isValidCutVehicleId: value => /^VEH-[A-Z0-9-]+$/.test(String(value || ''))
        };
        const names = Object.keys(dependencies);
        const submit = new Function(...names, submitCode + ';return handleStage2Submit;')(...names.map(name => dependencies[name]));
        const recovery = new Function(...names, workerCode + ';' + recoveryCode + ';return checkAndRecoverPendingOperation;')(...names.map(name => dependencies[name]));
        return { submit: () => submit(event), recover: recovery, state, calls, alerts, stages, logs, read, getAddCount: () => addCount, getCheckCount: () => checkCount, getServer: () => server };
    }
    const results = [];
    async function run(name, fn) { try { await fn(); results.push({ name, status: 'PASS' }); } catch (error) { results.push({ name, status: 'FAIL', message: String(error.message || error) }); } }

    await run('respuesta perdida antes del commit restaura el mismo snapshot/opId y permite reintentar', async () => {
        const ctx = makeContext('before', null, 0);
        await ctx.submit();
        const first = await ctx.read();
        assert_(first.operation && first.operation.status === 'failed', 'El snapshot no quedó como failed.');
        const firstId = first.operation.id, firstHash = first.operation.operationHash;
        await ctx.recover();
        assert_(ctx.state.opId === firstId, 'No restauró el mismo opId.');
        await ctx.submit();
        assert_(ctx.getAddCount() === 2, 'No ejecutó el reintento esperado.');
        assert_(ctx.calls[0].opId === firstId && ctx.calls[1].opId === firstId, 'Cambió el opId entre intentos.');
        assert_(ctx.calls.every(call => call.operationHash === firstHash), 'Cambió la huella entre intentos.');
        assert_((await ctx.read()).operation === null && ctx.stages.length === 1 && ctx.stages[0] === 'VEH-42', 'No limpió o no avanzó tras el reintento confirmado.');
    });

    await run('respuesta perdida después del commit se recupera sin repetir addOrUpdateCut', async () => {
        const ctx = makeContext('after', null, 0);
        await ctx.submit();
        const pending = await ctx.read();
        assert_(pending.operation && pending.operation.status === 'failed', 'No conservó snapshot tras respuesta perdida.');
        await ctx.recover();
        assert_(ctx.getAddCount() === 1, 'Repitió addOrUpdateCut aunque el servidor ya había confirmado.');
        assert_((await ctx.read()).operation === null && ctx.stages.length === 1 && ctx.stages[0] === 'VEH-42', 'No recuperó el resultado confirmado.');
    });

    await run('limpieza fallida tras commit deja completed terminal y recupera sin reutilizar opId', async () => {
        const ctx = makeContext('success', null, 1);
        await ctx.submit();
        const completed = await ctx.read();
        assert_(completed.operation && completed.operation.status === 'completed', 'No dejó snapshot completed.');
        await ctx.submit();
        assert_(ctx.getAddCount() === 1, 'Reutilizó el opId completed para otro envío.');
        assert_((await ctx.read()).operation.status === 'completed', 'Degradó el snapshot completed.');
        await ctx.recover();
        assert_((await ctx.read()).operation === null && ctx.stages.length === 1, 'No reconcilió y limpió el snapshot terminal.');
    });

    await run('recuperación offline conserva snapshot y no consulta el servicio', async () => {
        const snapshot={id:'OP-100',ownerId:'OWNER-1',operationHash:hash,status:'failed',vehicleId:null,vehicleInfo:{marca:'Toyota'},formData:{tipoCorte1:'Ignición'},requestData:{silent:false,vehicleData:{},cutData:{tipoCorte1:'Ignición'}}};
        const ctx=makeContext('success',snapshot,0,{online:false}); await ctx.recover();
        assert_(ctx.getCheckCount()===0,'Se consultó backend estando offline.');
        assert_((await ctx.read()).operation.status==='failed','Se alteró snapshot offline.');
        assert_(ctx.logs.some(log=>log.event==='pending-recovery.offline'),'No se registró estado offline resumido.');
    });
    await run('error de cuota no envía operación ni registra Base64', async () => {
        const imageData='data:image/png;base64,SENSITIVE_IMAGE_PAYLOAD';
        const ctx=makeContext('success',null,0,{quotaFailure:true,imageData}); await ctx.submit();
        assert_(ctx.getAddCount()===0&&ctx.getCheckCount()===0,'Se llamó al servicio sin snapshot durable verificado.');
        assert_((await ctx.read()).operation===null,'Se persistió snapshot no verificado.');
        const entry=ctx.logs.find(log=>log.event==='cut-operation.submit-failed');
        assert_(entry&&entry.context.errorCode==='QuotaExceededError','No se identificó el error de cuota de forma segura.');
        assert_(!JSON.stringify(ctx.logs).includes('SENSITIVE_IMAGE_PAYLOAD'),'Se filtró Base64 en logs.');
    });
    return { status: results.some(result => result.status === 'FAIL') ? 'FAIL' : 'PASS', passed: results.filter(result => result.status === 'PASS').length, failed: results.filter(result => result.status === 'FAIL').length, results };
}
