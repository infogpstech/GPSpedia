// AUG-055: contratos de persistencia durable e idempotencia vinculada al contenido.
function runAddCutOperationIntegrityTests(sources) {
    const write = String(sources.write || ''), admin = String(sources.admin || ''), frontend = String(sources.frontend || ''), offline = String(sources.offline || '');
    const results = []; let passed = 0, failed = 0;
    function assert_(value, message) { if (!value) throw new Error(message || 'Aserción fallida.'); }
    function run_(name, fn) { try { fn(); passed++; results.push({ name, status: 'PASS' }); } catch (error) { failed++; results.push({ name, status: 'FAIL', message: String(error.message || error) }); } }
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
    function getClientCanonical() {
        const script = frontend.match(/<script type="module">([\s\S]*?)<\/script>/);
        assert_(!!script, 'No se encontró el módulo de add_cortes');
        return new Function(extract_(script[1], 'clientFingerprintValue') + ';' +
            extract_(script[1], 'buildClientCutOperationFingerprintPayload') +
            ';return buildClientCutOperationFingerprintPayload;')();
    }
    function makeRecordOpIdHarness(source) {
        const rows = [];
        const sheet = {
            appendRow(row) { rows.push(row.slice()); },
            getRange(rowIndex, column) {
                return { setValue(value) { rows[rowIndex - 2][column - 1] = value; } };
            }
        };
        const readEntries = () => {
            const byOpId = new Map();
            rows.forEach((row, index) => byOpId.set(row[0], {
                opId: row[0], vehicleId: row[1], slotIndex: Number(row[2]),
                timestamp: row[3], status: row[4], operationHash: row[5] || '', rowIndex: index + 2
            }));
            return { byOpId };
        };
        const helpers = {
            normalizeIdempotenciaOpId_: value => { const v = String(value || '').trim(); assert_(/^OP-[A-Za-z0-9_-]{1,100}$/.test(v)); return v; },
            normalizeIdempotenciaVehicleId_: value => { const v = String(value || '').trim(); assert_(!!v); return v; },
            normalizeIdempotenciaSlotIndex_: value => { const v = Number(value); assert_([1, 2, 3].includes(v)); return v; },
            isValidIdempotenciaTimestamp_: value => !!String(value || '').trim(),
            normalizeIdempotenciaStatus_: value => { const v = String(value || '').toLowerCase(); assert_(v === 'pending' || v === 'completed'); return v; },
            normalizeIdempotenciaOperationHash_: value => { const v = String(value || '').toLowerCase(); assert_(/^[a-f0-9]{64}$/.test(v)); return v; }
        };
        const fn = new Function(
            'normalizeIdempotenciaOpId_', 'normalizeIdempotenciaVehicleId_', 'normalizeIdempotenciaSlotIndex_',
            'isValidIdempotenciaTimestamp_', 'normalizeIdempotenciaStatus_', 'normalizeIdempotenciaOperationHash_',
            'getIdempotenciaSheet', 'readIdempotenciaEntries_', 'SpreadsheetApp',
            extract_(source, 'recordOpId') + ';return recordOpId;'
        )(
            helpers.normalizeIdempotenciaOpId_, helpers.normalizeIdempotenciaVehicleId_, helpers.normalizeIdempotenciaSlotIndex_,
            helpers.isValidIdempotenciaTimestamp_, helpers.normalizeIdempotenciaStatus_, helpers.normalizeIdempotenciaOperationHash_,
            () => sheet, readEntries, { flush() {} }
        );
        return { record: fn, rows };
    }
    const sampleNew = {
        vehicleId: null,
        vehicleData: { categoria: 'Camioneta', marca: 'Toyota', modelo: 'Hilux', versionesAplicables: '2.8', anoDesde: '2024', anoHasta: '2025', tipoEncendido: 'Llave', imagenVehiculo: 'data:image/png;base64,VEHICLE' },
        cutData: { tipoCorte1: 'Ignición', configRelay1: 'Normal', ubicacionCorte1: '<p>Arnés</p>', colorCableCorte1: 'Azul', activaTestigo1: true, imgCorte1: 'data:image/png;base64,CUT', vin: '1HGCM82633A004352' },
        silent: false
    };
    const sampleExisting = { ...sampleNew, vehicleId: '204', vehicleData: null, silent: true };
    run_('WRITE y ADMIN declaran el esquema A:F con operationHash', () => {
        for (const source of [write, admin]) assert_(/IDEMPOTENCIA_HEADERS\s*=\s*\["opId",\s*"vehicleId",\s*"slotIndex",\s*"timestamp",\s*"status",\s*"operationHash"\]/.test(source));
    });
    run_('WRITE y ADMIN migran A:E a A:F sin aceptar hojas truncadas inseguras', () => {
        for (const source of [write, admin]) {
            assert_(/maxColumns < IDEMPOTENCIA_HEADERS\.length - 1 && lastRow > 1/.test(source));
            assert_(/sheet\.insertColumnsAfter\(maxColumns, IDEMPOTENCIA_HEADERS\.length - maxColumns\)/.test(source));
            assert_(/row\[5\].*normalizeIdempotenciaOperationHash_/.test(source));
        }
    });
    run_('WRITE y ADMIN leen hojas históricas A:E y completan F en memoria sin rango fuera de cuadrícula', () => {
        for (const source of [write, admin]) {
            assert_(/Math\.min\(IDEMPOTENCIA_HEADERS\.length, Math\.max\(0, Number\(sheet\.getMaxColumns\(\)\) \|\| 0\)\)/.test(source));
            assert_(/sourceRow\.concat\(Array\(Math\.max\(0, IDEMPOTENCIA_HEADERS\.length - sourceRow\.length\)\)\.fill\(""\)\)/.test(source));
        }
    });
    run_('canonicalización del cliente coincide con WRITE y ADMIN para vehículo nuevo', () => {
        const client = getClientCanonical();
        for (const source of [write, admin]) {
            const server = new Function(extract_(source, 'fingerprintValue_') + ';' + extract_(source, 'buildCutOperationFingerprintPayload_') + ';return buildCutOperationFingerprintPayload_;')();
            assert_(client(sampleNew) === server(sampleNew), 'El payload canónico de vehículo nuevo difiere entre cliente y backend.');
        }
    });
    run_('canonicalización coincide para vehículo existente y modo silencioso', () => {
        const client = getClientCanonical();
        for (const source of [write, admin]) {
            const server = new Function(extract_(source, 'fingerprintValue_') + ';' + extract_(source, 'buildCutOperationFingerprintPayload_') + ';return buildCutOperationFingerprintPayload_;')();
            assert_(client(sampleExisting) === server(sampleExisting), 'El payload canónico de vehículo existente difiere.');
        }
    });
    run_('la huella cambia si cambia vehículo, slot de destino o contenido', () => {
        const client = getClientCanonical(), base = client(sampleNew);
        assert_(base !== client({ ...sampleNew, vehicleId: '204', vehicleData: null }));
        assert_(base !== client({ ...sampleNew, cutData: { ...sampleNew.cutData, ubicacionCorte1: 'Otra ubicación' } }));
        assert_(base !== client({ ...sampleNew, cutData: { ...sampleNew.cutData, imgCorte1: 'data:image/png;base64,OTHER' } }));
        assert_(base !== client({ ...sampleNew, vehicleData: { ...sampleNew.vehicleData, imagenVehiculo: 'data:image/png;base64,OTHER' } }));
    });
    run_('el digest de servidor recibe exactamente el canonical compartido y produce 64 hex', () => {
        const client = getClientCanonical();
        for (const source of [write, admin]) {
            let captured = null;
            const Utilities = {
                DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF-8' },
                computeDigest(algorithm, value, charset) {
                    assert_(algorithm === 'SHA_256' && charset === 'UTF-8');
                    captured = value;
                    return Array.from({ length: 32 }, (_, index) => index - 128);
                }
            };
            const server = new Function('Utilities', extract_(source, 'fingerprintValue_') + ';' +
                extract_(source, 'buildCutOperationFingerprintPayload_') + ';' +
                extract_(source, 'computeCutOperationFingerprint_') + ';return computeCutOperationFingerprint_;')(Utilities);
            const hash = server(sampleNew);
            assert_(captured === client(sampleNew));
            assert_(hash === Array.from({ length: 32 }, (_, index) => (index + 128).toString(16).padStart(2, '0')).join(''));
        }
    });
    run_('el cliente calcula SHA-256 con WebCrypto y no usa hash débil', () => {
        const script = frontend.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
        const fn = extract_(script, 'computeClientCutOperationFingerprint');
        assert_(/subtle\.digest\('SHA-256'/.test(fn));
        assert_(/TextEncoder/.test(fn));
        assert_(!/Math\.random|btoa|encodeURIComponent/.test(fn));
    });
    run_('migración ADMIN escribe seis columnas y deja huella vacía solo para registros históricos', () => {
        assert_(/entriesToWrite\.push\(\[e\.opId,String\(e\.vehicleId\)\.trim\(\),String\(e\.slotIndex\),e\.timestamp,"completed",""\]\)/.test(admin));
        assert_(/readIdempotenciaEntries_\(s,true\)/.test(admin));
    });
    run_('recordOpId WRITE y ADMIN guardan seis columnas y verifican la huella', () => {
        for (const source of [write, admin]) {
            const harness = makeRecordOpIdHarness(source), hash = 'a'.repeat(64);
            const saved = harness.record('OP-100', 'VEH-100', 1, '11/11/2026 10:00:00', 'pending', hash);
            assert_(saved.operationHash === hash);
            assert_(harness.rows.length === 1 && harness.rows[0].length === 6 && harness.rows[0][5] === hash);
        }
    });
    run_('recordOpId permite completar solo el mismo vehículo, slot y huella', () => {
        for (const source of [write, admin]) {
            const harness = makeRecordOpIdHarness(source), hash = 'b'.repeat(64);
            harness.record('OP-101', 'VEH-101', 2, '11/11/2026 10:00:00', 'pending', hash);
            const updated = harness.record('OP-101', 'VEH-101', 2, '11/11/2026 10:00:00', 'completed', hash);
            assert_(updated.status === 'completed' && updated.operationHash === hash);
        }
    });
    run_('recordOpId rechaza otro contenido o asociación', () => {
        for (const source of [write, admin]) {
            const harness = makeRecordOpIdHarness(source), hash = 'c'.repeat(64);
            harness.record('OP-102', 'VEH-102', 1, '11/11/2026 10:00:00', 'pending', hash);
            let wrongHash = false, wrongVehicle = false, wrongSlot = false;
            try { harness.record('OP-102', 'VEH-102', 1, '11/11/2026 10:00:00', 'completed', 'd'.repeat(64)); } catch (_) { wrongHash = true; }
            try { harness.record('OP-102', 'VEH-999', 1, '11/11/2026 10:00:00', 'completed', hash); } catch (_) { wrongVehicle = true; }
            try { harness.record('OP-102', 'VEH-102', 2, '11/11/2026 10:00:00', 'completed', hash); } catch (_) { wrongSlot = true; }
            assert_(wrongHash && wrongVehicle && wrongSlot);
        }
    });
    run_('WRITE y ADMIN recalculan SHA-256 en servidor y exigen coincidencia con cliente', () => {
        for (const source of [write, admin]) {
            assert_(/Utilities\.computeDigest\(Utilities\.DigestAlgorithm\.SHA_256/.test(source));
            assert_(/normalizeIdempotenciaOperationHash_\(payload\.operationHash/.test(source));
            assert_(/!== operationHash/.test(source));
        }
    });
    run_('WRITE y ADMIN rechazan reintento con otro vehículo o huella', () => {
        for (const source of [write, admin]) {
            assert_(/!match\.operationHash \|\| match\.operationHash !== operationHash/.test(source));
            assert_(/storedVehicleId !== normalizeIdempotenciaVehicleId_\(vehicleId/.test(source));
            assert_(/no coincide con la huella del contenido original/.test(source));
        }
    });
    run_('todos los registros pending/completed conservan la huella', () => {
        for (const source of [write, admin]) {
            const calls = source.match(/recordOpId\(opId,[^\n]+/g) || [];
            assert_(calls.length >= 5);
            assert_(calls.every(line => /operationHash\)/.test(line)), 'Hay una llamada recordOpId sin operationHash.');
            assert_(/appendRow\(\[cleanOpId, cleanVehicleId, cleanSlotIndex, cleanTimestamp, targetStatus, cleanOperationHash\]\)/.test(source));
        }
    });
    run_('checkOperation devuelve huella y rechaza la esperada si no coincide', () => {
        for (const source of [write, admin]) {
            assert_(/match\.operationHash !== expectedHash/.test(source));
            assert_(/operationHash: match\.operationHash/.test(source));
        }
    });
    run_('add_cortes usa IndexedDB como snapshot y no conserva el store anterior en localStorage', () => {
        assert_(/import \{[^}]*getAddCutOperationPendingOperation[^}]*\} from '\.\/offline\.js'/.test(frontend));
        assert_(!/createPendingOperationStore|getPendingOperationStore/.test(frontend));
        assert_(/PENDING_OPERATION_STORAGE_UNAVAILABLE/.test(frontend));
    });
    run_('snapshot durable valida owner, tipo, etapa, estado, id, huella y vehículo', () => {
        const valid = extract_(offline, 'isValidAddCutOperationSnapshot_');
        for (const pattern of [/ownerId/, /operationType !== 'addOrUpdateCut'/, /stage !== 2/, /processing.*failed.*completed/, /OP-\[A-Za-z0-9_-\]/, /\[a-f0-9\]\{64\}/, /requestData\.vehicleId/, /requestData\.cutData/]) assert_(pattern.test(valid), 'Falta validación: ' + pattern);
    });
    run_('IndexedDB guarda, verifica, aísla por owner y no sobrescribe otro opId/huella', () => {
        assert_(/ADD_CUT_OPERATION_KEY_PREFIX = 'addCutOperation:'/.test(offline));
        assert_(/JSON\.stringify\(saved\) === JSON\.stringify\(snapshot\)/.test(offline));
        assert_(/previous\.operation\.id[\s\S]*?snapshot\.id/.test(offline));
        assert_(/previous\.operation\.operationHash[\s\S]*?snapshot\.operationHash/.test(offline));
    });
    run_('submit no consulta ni envía al backend antes de snapshot verificado', () => {
        const submit = extract_(frontend, 'handleStage2Submit');
        const save = submit.indexOf('saveAddCutOperationPendingOperation(pendingOp)');
        const check = submit.indexOf("routeAction('checkOperation'");
        const send = submit.indexOf("routeAction('addOrUpdateCut'");
        assert_(save >= 0 && check > save && send > check);
        assert_(/if \(!saved \|\| saved\.saved !== true\) throw/.test(submit));
    });
    run_('respuesta de guardado exige success, huella y vehicleId antes de limpiar', () => {
        const submit = extract_(frontend, 'handleStage2Submit');
        const validate = submit.indexOf("result.status !== 'success'");
        const remove = submit.indexOf('removeAddCutOperationPendingOperation(pendingOp.ownerId, opId, operationHash)', validate);
        const clear = submit.indexOf('state.opId = null', remove);
        const stage3 = submit.indexOf('proceedToStage3(result.vehicleId)', remove);
        assert_(validate >= 0 && remove > validate && clear > remove && stage3 > remove);
        assert_(/result\.operationHash !== operationHash/.test(submit));
        assert_(/!isValidCutVehicleId\(result\.vehicleId\)/.test(submit));
    });
    run_('getOrGenerateOpId bloquea snapshots completed y comprueba siempre IndexedDB', () => {
        const script = frontend.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
        const fn = extract_(script, 'getOrGenerateOpId');
        assert_(/getAddCutOperationPendingOperation/.test(fn));
        assert_(/status === 'completed'/.test(fn));
        assert_(/COMPLETED_OPERATION_REQUIRES_RECOVERY/.test(fn));
        assert_(/state\.opId = null/.test(fn));
    });
    run_('una respuesta perdida antes del commit conserva snapshot failed para reintentar mismo opId', () => {
        const submit = extract_(frontend, 'handleStage2Submit');
        const recovery = extract_(frontend, 'checkAndRecoverPendingOperation');
        assert_(/pendingOp\.status = serverConfirmed \? 'completed' : 'failed'/.test(submit));
        assert_(/state\.opId = pendingOp\.id/.test(recovery));
        assert_(/checkRes\.exists === true/.test(recovery));
    });
    run_('una respuesta perdida después del commit se reconcilia por huella antes de limpiar', () => {
        const recovery = extract_(frontend, 'checkAndRecoverPendingOperation');
        assert_(/checkRes\.exists === true/.test(recovery));
        assert_(/checkRes\.operationHash !== pendingOp\.operationHash/.test(recovery));
        assert_(/removeAddCutOperationPendingOperation\(pendingOp\.ownerId, pendingOp\.id, pendingOp\.operationHash\)/.test(recovery));
        assert_(/COMPLETED_SNAPSHOT_UNRESOLVED/.test(recovery));
    });
    run_('fallo de limpieza conserva snapshot y no libera opId', () => {
        const submit = extract_(frontend, 'handleStage2Submit');
        assert_(/if \(!removed \|\| removed\.removed !== true\) throw new Error\('PENDING_CLEANUP_UNCONFIRMED'\)/.test(submit));
        assert_(/pendingOp\.status = serverConfirmed \? 'completed' : 'failed'/.test(submit));
        assert_(/saveAddCutOperationPendingOperation\(pendingOp\)/.test(submit));
    });
    run_('recuperación comprueba status, huella y vehicleId antes de eliminar snapshot', () => {
        const recovery = extract_(frontend, 'checkAndRecoverPendingOperation');
        assert_(/checkRes\.status !== 'success'/.test(recovery));
        assert_(/checkRes\.operationHash !== pendingOp\.operationHash/.test(recovery));
        assert_(/pendingOp\.vehicleId !== null/.test(recovery));
        assert_(/removeAddCutOperationPendingOperation\(pendingOp\.ownerId, pendingOp\.id, pendingOp\.operationHash\)/.test(recovery));
    });
    return { status: failed ? 'FAIL' : 'PASS', passed, failed, results };
}
