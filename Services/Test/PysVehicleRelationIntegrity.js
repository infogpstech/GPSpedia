import assert from "node:assert/strict";
import vm from "node:vm";

const extract = (source, start, end) => {
    const i = source.indexOf(start), j = source.indexOf(end, i + start.length);
    if (i < 0 || j < 0) throw new Error("No se encontró el bloque " + start);
    return source.slice(i, j);
};

const HEADERS = ["id_problem","Problema","Descripción","Se soluciono","Solucion","Prevenir","Imagen","Video","Colaborador","modelos_asociados"];
const DEFAULT_PYS = ["isue-001","Falla","Detalle","","","","","","Técnico",""];
const DEFAULT_CORTES = [["id"],["V-1"],["V-2"],["V-3"]];

function makeSheet(rows, name, state, options = {}) {
    return {
        getLastRow() {
            state.reads.push({ name, operation: "getLastRow", locked: state.locked });
            for (let i = rows.length - 1; i >= 0; i--) {
                if (rows[i] && rows[i].some(value => value !== "" && value !== null && value !== undefined)) return i + 1;
            }
            return 0;
        },
        getLastColumn() {
            state.reads.push({ name, operation: "getLastColumn", locked: state.locked });
            let max = 0;
            rows.forEach(row => {
                if (!row) return;
                for (let i = row.length - 1; i >= 0; i--) {
                    if (row[i] !== "" && row[i] !== null && row[i] !== undefined) { max = Math.max(max, i + 1); break; }
                }
            });
            return max;
        },
        getRange(row, col, numRows = 1, numCols = 1) {
            return {
                getValues() {
                    state.reads.push({ name, operation: "getValues", locked: state.locked });
                    return Array.from({ length: numRows }, (_, r) =>
                        Array.from({ length: numCols }, (_, c) => ((rows[row - 1 + r] || [])[col - 1 + c] ?? ""))
                    );
                },
                getDisplayValues() {
                    state.reads.push({ name, operation: "getDisplayValues", locked: state.locked });
                    return Array.from({ length: numRows }, (_, r) =>
                        Array.from({ length: numCols }, (_, c) => String((rows[row - 1 + r] || [])[col - 1 + c] ?? ""))
                    );
                },
                getValue() {
                    state.reads.push({ name, operation: "getValue", locked: state.locked });
                    return (rows[row - 1] || [])[col - 1] ?? "";
                },
                setValue(value) {
                    state.reads.push({ name, operation: "setValue", locked: state.locked });
                    state.writes++;
                    if (!options.ignoreWrites) (rows[row - 1] || (rows[row - 1] = []))[col - 1] = value;
                }
            };
        },
        rows
    };
}

function buildHarness(feedback, options = {}) {
    const state = {
        pysRows: (options.pysRows || [HEADERS.slice(), DEFAULT_PYS.slice()]).map(row => row.slice()),
        cortesRows: (options.cortesRows || DEFAULT_CORTES).map(row => row.slice()),
        locked: Boolean(options.lockAlreadyHeld),
        lockWaits: 0,
        lockReleases: 0,
        writes: 0,
        flushes: 0,
        reads: []
    };
    const pysSheet = options.noPys ? null : makeSheet(state.pysRows, "pys", state, options);
    const cortesSheet = options.noCortes ? null : makeSheet(state.cortesRows, "Cortes", state, options);
    const lock = {
        hasLock: () => state.locked,
        waitLock(milliseconds) {
            state.lockWaits++;
            if (options.failLock) throw new Error("Lock timeout");
            if (state.locked) throw new Error("Lock already held");
            state.locked = true;
        },
        releaseLock() { state.lockReleases++; state.locked = false; }
    };
    const context = {
        console: console, Date: Date, JSON: JSON, Math: Math, Number: Number, String: String, Object: Object, Array: Array, RegExp: RegExp, Error: Error, Set: Set, Map: Map,
        SHEET_NAMES: { CORTES: "Cortes" },
        COLS_CORTES: { id: 1 },
        LockService: { getScriptLock: () => lock },
        SpreadsheetApp: {
            flush() {
                state.flushes++;
                if (options.failFlushAt === state.flushes) throw new Error("Spreadsheet flush failed");
            }
        },
        getSafeSheet(name) {
            if (name === "pys") return pysSheet;
            if (name === "Cortes") return cortesSheet;
            return null;
        },
        getSpreadsheet: () => ({})
    };
    const roleHelper = extract(feedback, "function normalizeFeedbackRole(role) {", "function getSessionExpirationStatus_");
    const relationHelpers = extract(feedback, "function normalizeModelosAsociadosList_(values) {", "function handleClearActivityLogs(payload) {");
    vm.runInNewContext(
        roleHelper + "\n" + relationHelpers +
        "\nthis.api = { add: handleAddVehicleToProblem, remove: handleRemoveVehicleFromProblem, parse: parseModelosAsociados };",
        context
    );
    return { api: context.api, state };
}

export function runPysVehicleRelationIntegrityTests({ feedback }) {
    const results = [];
    let passed = 0, failed = 0;
    function test(name, callback) {
        try { callback(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    }
    const list = value => Array.from(value || []);

    test("normaliza JSON y formatos heredados sin duplicados", () => {
        const h = buildHarness(feedback);
        assert.deepEqual(list(h.api.parse('V-1/V-1; V-2, V-2')), ["V-1", "V-2"]);
        assert.deepEqual(list(h.api.parse('[" V-1 ","V-1",2]')), ["V-1", "2"]);
        assert.deepEqual(list(h.api.parse("")), []);
        assert.throws(() => h.api.parse('["V-1"'), /JSON inválida/);
        assert.throws(() => h.api.parse('["V-1/V-2"]'), /formato inválido/);
    });

    test("alta valida ambos IDs, normaliza la colección y devuelve lo persistido", () => {
        const h = buildHarness(feedback, { pysRows: [HEADERS.slice(), DEFAULT_PYS.slice(0, 9).concat("V-1/V-1; V-2")] });
        const result = h.api.add({ problemId: " isue-001 ", vehicleId: "V-3" });
        assert.deepEqual(list(result.modelosAsociados), ["V-1", "V-2", "V-3"]);
        assert.equal(h.state.pysRows[1][9], '["V-1","V-2","V-3"]');
        assert.equal(h.state.writes, 1);
        assert.equal(h.state.flushes, 1);
    });

    test("dos altas repetidas son idempotentes y no duplican asociaciones", () => {
        const h = buildHarness(feedback, { pysRows: [HEADERS.slice(), DEFAULT_PYS.slice(0, 9).concat('["V-1"]')] });
        const first = h.api.add({ problemId: "isue-001", vehicleId: "V-1" });
        const retry = h.api.add({ problemId: "isue-001", vehicleId: "V-1" });
        assert.deepEqual(list(first.modelosAsociados), ["V-1"]);
        assert.deepEqual(list(retry.modelosAsociados), ["V-1"]);
        assert.equal(h.state.writes, 0);
        assert.equal(h.state.lockWaits, 2);
        assert.equal(h.state.lockReleases, 2);
    });

    test("baja elimina todas las apariciones y devuelve la colección final persistida", () => {
        const h = buildHarness(feedback, { pysRows: [HEADERS.slice(), DEFAULT_PYS.slice(0, 9).concat('["V-1","V-1","V-2"]')] });
        const result = h.api.remove({ problemId: "isue-001", vehicleId: "V-2", userRole: "Desarrollador" });
        assert.deepEqual(list(result.modelosAsociados), ["V-1"]);
        assert.equal(h.state.pysRows[1][9], '["V-1"]');
        assert.equal(h.state.writes, 1);
    });

    test("baja repetida no escribe de nuevo", () => {
        const h = buildHarness(feedback, { pysRows: [HEADERS.slice(), DEFAULT_PYS.slice(0, 9).concat('["V-1"]')] });
        h.api.remove({ problemId: "isue-001", vehicleId: "V-2", userRole: "Desarrollador" });
        h.api.remove({ problemId: "isue-001", vehicleId: "V-2", userRole: "Desarrollador" });
        assert.equal(h.state.pysRows[1][9], '["V-1"]');
        assert.equal(h.state.writes, 0);
    });

    test("rechaza IDs de problema malformados y problemas inexistentes", () => {
        const h = buildHarness(feedback);
        assert.throws(() => h.api.add({ problemId: "isue-x", vehicleId: "V-1" }), /problemId.*formato inválido/);
        assert.throws(() => h.api.add({ problemId: "isue-999", vehicleId: "V-1" }), /Problema no encontrado/);
        assert.equal(h.state.writes, 0);
    });

    test("rechaza IDs de vehículo ausentes o duplicados en Cortes", () => {
        const missing = buildHarness(feedback);
        assert.throws(() => missing.api.add({ problemId: "isue-001", vehicleId: "V-404" }), /exactamente un registro/);
        const duplicate = buildHarness(feedback, { cortesRows: [["id"], ["V-1"], ["V-1"]] });
        assert.throws(() => duplicate.api.add({ problemId: "isue-001", vehicleId: "V-1" }), /exactamente un registro/);
        assert.equal(missing.state.writes + duplicate.state.writes, 0);
    });

    test("rechaza IDs duplicados en la hoja pys y no elige una fila arbitraria", () => {
        const duplicateRows = [HEADERS.slice(), DEFAULT_PYS.slice(), ["ISUE-1","Otra falla","Detalle","","","","","","Técnico",""]];
        const h = buildHarness(feedback, { pysRows: duplicateRows });
        assert.throws(() => h.api.add({ problemId: "isue-001", vehicleId: "V-1" }), /IDs duplicados/);
        assert.equal(h.state.writes, 0);
    });

    test("rechaza hoja Cortes ausente o encabezado ID incompatible", () => {
        const missing = buildHarness(feedback, { noCortes: true });
        assert.throws(() => missing.api.add({ problemId: "isue-001", vehicleId: "V-1" }), /Cortes no encontrada/);
        const wrongHeader = buildHarness(feedback, { cortesRows: [["vehiculo_id"], ["V-1"]] });
        assert.throws(() => wrongHeader.api.add({ problemId: "isue-001", vehicleId: "V-1" }), /encabezado ID/);
    });

    test("serializa todas las lecturas y escrituras bajo ScriptLock y libera en finally", () => {
        const h = buildHarness(feedback);
        h.api.add({ problemId: "isue-001", vehicleId: "V-3" });
        assert.equal(h.state.lockWaits, 1);
        assert.equal(h.state.lockReleases, 1);
        assert.equal(h.state.locked, false);
        assert.ok(h.state.reads.length > 0);
        assert.ok(h.state.reads.every(access => access.locked), "Se detectó una lectura/escritura fuera del lock.");
    });

    test("libera el lock cuando la validación de Cortes falla", () => {
        const h = buildHarness(feedback);
        assert.throws(() => h.api.add({ problemId: "isue-001", vehicleId: "V-404" }), /exactamente un registro/);
        assert.equal(h.state.lockWaits, 1);
        assert.equal(h.state.lockReleases, 1);
        assert.equal(h.state.locked, false);
    });

    test("mantiene la restricción de Desarrollador para desvincular", () => {
        const h = buildHarness(feedback);
        assert.throws(() => h.api.remove({ problemId: "isue-001", vehicleId: "V-1", userRole: "Técnico" }), /permisos suficientes/);
        assert.equal(h.state.lockWaits, 0);
        const allowed = h.api.remove({ problemId: "isue-001", vehicleId: "V-1", userRole: "DESARROLLADOR" });
        assert.equal(allowed.status, "success");
        assert.deepEqual(list(allowed.modelosAsociados), []);
    });

    test("verifica el valor de retorno contra el valor realmente persistido", () => {
        const h = buildHarness(feedback, { ignoreWrites: true });
        assert.throws(() => h.api.add({ problemId: "isue-001", vehicleId: "V-3" }), /No se pudo confirmar/);
        assert.equal(h.state.lockReleases, 1);
        assert.equal(h.state.locked, false);
    });

    test("reintenta de forma segura si falla flush después de escribir", () => {
        const h = buildHarness(feedback, { failFlushAt: 1 });
        assert.throws(() => h.api.add({ problemId: "isue-001", vehicleId: "V-3" }), /flush failed/);
        assert.equal(h.state.lockReleases, 1);
        const retry = h.api.add({ problemId: "isue-001", vehicleId: "V-3" });
        assert.deepEqual(list(retry.modelosAsociados), ["V-3"]);
        assert.equal(h.state.writes, 1);
        assert.equal(h.state.lockReleases, 2);
    });

    test("alta y baja intercaladas conservan el conjunto final sin duplicados", () => {
        const h = buildHarness(feedback);
        h.api.add({ problemId: "isue-001", vehicleId: "V-3" });
        h.api.remove({ problemId: "isue-001", vehicleId: "V-3", userRole: "Desarrollador" });
        assert.equal(h.state.pysRows[1][9], "");
        assert.equal(h.state.lockWaits, 2);
        assert.equal(h.state.lockReleases, 2);
    });

    return { status: failed === 0 ? "PASS" : "FAIL", passed, failed, results };
}
