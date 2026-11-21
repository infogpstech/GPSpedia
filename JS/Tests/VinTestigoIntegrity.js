// Pruebas lógicas aisladas del contrato VIN/AT:AV. Requiere cargar Services/admin.js.
function runVinTestigoIntegrityTests() {
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
        if (expectedText) {
            assert_(String(thrown.message || thrown).includes(expectedText),
                "Mensaje inesperado: " + String(thrown.message || thrown));
        }
    }
    function fakeSheet_(headers, rows, maxColumns) {
        const data = [headers.slice()].concat((rows || []).map(row => row.slice()));
        let columns = maxColumns || Math.max(48, headers.length);
        function getRange_(row, column, rowCount, columnCount) {
            return {
                getValues: function() {
                    const values = [];
                    for (let r = 0; r < rowCount; r++) {
                        const line = [];
                        for (let c = 0; c < columnCount; c++) {
                            line.push((data[row - 1 + r] || [])[column - 1 + c] ?? "");
                        }
                        values.push(line);
                    }
                    return values;
                },
                setValue: function(value) {
                    data[row - 1] = data[row - 1] || [];
                    data[row - 1][column - 1] = value;
                },
                setValues: function(values) {
                    values.forEach((line, r) => line.forEach((value, c) => {
                        data[row - 1 + r] = data[row - 1 + r] || [];
                        data[row - 1 + r][column - 1 + c] = value;
                    }));
                }
            };
        }
        return {
            getLastColumn: function() {
                let last = 0;
                data.forEach(row => row.forEach((value, index) => {
                    if (value !== "" && value !== null && value !== undefined) last = Math.max(last, index + 1);
                }));
                return last;
            },
            getLastRow: function() {
                for (let index = data.length - 1; index >= 0; index--) {
                    if (data[index].some(value => value !== "" && value !== null && value !== undefined)) return index + 1;
                }
                return 0;
            },
            getMaxColumns: () => columns,
            getRange: getRange_,
            insertColumnsAfter: function(after, count) {
                data.forEach(row => row.splice(after, 0, ...Array(count).fill("")));
                columns += count;
            },
            setFrozenRows: function() {},
            _data: data,
            _columns: () => columns
        };
    }
    function run_(name, callback) {
        try {
            callback();
            passed++;
            results.push({ name: name, status: "PASS" });
        } catch (error) {
            failed++;
            results.push({ name: name, status: "FAIL", message: String(error.message || error) });
        }
    }

    run_("AT:AV se conserva aunque existan columnas adicionales", function() {
        const headers = Array(55).fill("");
        headers[0] = "id";
        headers[54] = "campoExtra";
        const sheet = fakeSheet_(headers, [Array(55).fill("")], 60);
        const result = ensureTestigoColumns(sheet, true);
        assert_(result.activaTestigo1 === 46 && result.activaTestigo2 === 47 && result.activaTestigo3 === 48);
        assert_(sheet._data[0][45] === "activaTestigo1");
        assert_(sheet._data[0][46] === "activaTestigo2");
        assert_(sheet._data[0][47] === "activaTestigo3");
        assert_(sheet._data[0][54] === "campoExtra" && sheet._columns() === 60);
    });
    run_("AT:AV se crean cuando la hoja termina en AS", function() {
        const headers = Array(45).fill("");
        headers[0] = "id";
        const sheet = fakeSheet_(headers, [], 45);
        const result = ensureTestigoColumns(sheet, true);
        assert_(result.activaTestigo1 === 46 && result.activaTestigo3 === 48);
        assert_(sheet._columns() === 48);
    });
    run_("rechaza encabezados testigo duplicados", function() {
        const headers = Array(50).fill("");
        headers[0] = "id";
        headers[45] = "activaTestigo1";
        headers[49] = "activaTestigo1";
        expectThrow_(() => ensureTestigoColumns(fakeSheet_(headers, [], 50), true), "duplicado");
    });
    run_("rechaza encabezado testigo fuera de AT:AV", function() {
        const headers = Array(50).fill("");
        headers[0] = "id";
        headers[48] = "activaTestigo1";
        expectThrow_(() => ensureTestigoColumns(fakeSheet_(headers, [], 50), true), "contrato requiere");
    });
    run_("rechaza datos en AT sin encabezado", function() {
        const headers = Array(48).fill("");
        headers[0] = "id";
        const row = Array(48).fill("");
        row[45] = true;
        expectThrow_(() => ensureTestigoColumns(fakeSheet_(headers, [row], 48), true), "contiene datos sin encabezado");
    });
    run_("resuelve una única columna VIN", function() {
        const headers = Array(50).fill("");
        headers[42] = "VIN";
        assert_(getVinColumnIndex(fakeSheet_(headers, [], 50)) === 43);
    });
    run_("ensureTestigoColumns no modifica AT:AV si VIN está duplicado", function() {
        const headers = Array(50).fill("");
        headers[0] = "id";
        headers[42] = "VIN";
        headers[48] = "vin";
        const sheet = fakeSheet_(headers, [], 50);
        expectThrow_(() => ensureTestigoColumns(sheet, true), "duplicados");
        assert_(sheet._data[0][45] === "" && sheet._data[0][46] === "" && sheet._data[0][47] === "");
    });
    run_("rechaza encabezados VIN duplicados", function() {
        const headers = Array(50).fill("");
        headers[42] = "VIN";
        headers[48] = "vin";
        expectThrow_(() => getVinColumnIndex(fakeSheet_(headers, [], 50)), "duplicados");
    });
    run_("lee JSON canónico y conserva posiciones vacías", function() {
        const values = parseVinCollection('["ABC123","","DEF456"]');
        assert_(values.length === 3 && values[1] === "" && values[2] === "DEF456");
    });
    run_("acepta delimitadores heredados incluidos punto y coma", function() {
        assert_(JSON.stringify(parseVinCollection("abc123;DEF456/GHI789")) === JSON.stringify(["ABC123", "DEF456", "GHI789"]));
        assert_(JSON.stringify(parseVinCollection("abc123\\\\DEF456")) === JSON.stringify(["ABC123", "DEF456"]));
        assert_(JSON.stringify(parseVinCollection("abc123,DEF456")) === JSON.stringify(["ABC123", "DEF456"]));
    });
    run_("filtra opId heredados sin desplazar posiciones JSON", function() {
        const values = parseVinCollection('["OP-123","","ABC123"]');
        assert_(values.length === 3 && values[0] === "" && values[2] === "ABC123");
    });
    run_("rechaza JSON mal formado", function() {
        expectThrow_(() => parseVinCollection('["ABC123"'), "JSON mal formado");
    });
    run_("rechaza VIN repetido y más de tres posiciones", function() {
        expectThrow_(() => parseVinCollection('["ABC123","ABC123"]'), "duplicado");
        expectThrow_(() => parseVinCollection('["ABC123","DEF456","GHI789","JKL012"]'), "tres posiciones");
    });
    run_("serializa JSON canónico preservando slots vacíos", function() {
        const serialized = serializeVinCollection(["ABC123", "", "DEF456"]);
        assert_(serialized === '["ABC123","","DEF456"]');
        assert_(JSON.stringify(parseVinCollection(serialized)) === JSON.stringify(["ABC123", "", "DEF456"]));
    });

    return { status: failed === 0 ? "PASS" : "FAIL", passed: passed, failed: failed, results: results };
}