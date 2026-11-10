// Pruebas lógicas aisladas del ledger de cargas generales. Requiere cargar Services/admin.js.
function runImageUploadLedgerTests() {
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
        if (expectedText) assert_(String(thrown.message || thrown).includes(expectedText),
            "Mensaje inesperado: " + String(thrown.message || thrown));
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
    function iterator_(items) {
        let index = 0;
        return { hasNext: () => index < items.length, next: () => items[index++] };
    }
    function fakeLedgerSheet_(rows) {
        const data = (rows || []).map(row => row.slice());
        function range_(row, column, rowCount, columnCount) {
            return {
                getValues: () => Array.from({ length: rowCount }, (_, r) =>
                    Array.from({ length: columnCount }, (_, c) => ((data[row - 1 + r] || [])[column - 1 + c] ?? ""))),
                getDisplayValues: () => Array.from({ length: rowCount }, (_, r) =>
                    Array.from({ length: columnCount }, (_, c) => String(((data[row - 1 + r] || [])[column - 1 + c] ?? "")))),
                setValues: values => values.forEach((line, r) => line.forEach((value, c) => {
                    data[row - 1 + r] = data[row - 1 + r] || [];
                    data[row - 1 + r][column - 1 + c] = value;
                }))
            };
        }
        return {
            getLastRow: () => data.length,
            getLastColumn: () => Math.max(0, ...data.map(row => row.length)),
            getRange: range_,
            _data: data
        };
    }
    function fakeFile_(id, bytes, mime, folderId, description) {
        return {
            getId: () => id,
            getName: () => "image.png",
            setName: () => {},
            isTrashed: () => false,
            getMimeType: () => mime,
            getSize: () => bytes.length,
            getBlob: () => ({ getBytes: () => bytes.slice() }),
            getParents: () => iterator_([{ getId: () => folderId }]),
            getDescription: () => description || "",
            setDescription: () => {}
        };
    }

    run_("descripción Drive conserva metadatos y referencias", function() {
        const record = {
            operationKey: "OP-123|17|imgCorte1", token: "abc123",
            folderId: "folder-1", mimeType: "image/png", sizeBytes: 3,
            contentHash: "deadbeef", fileName: "foto.png"
        };
        const description = buildImageUploadDescription_(record, "pending", "[]");
        const parsed = parseImageUploadDescription_(description);
        assert_(parsed.v === "2" && parsed.operationKey === record.operationKey &&
            parsed.token === record.token && parsed.folderId === record.folderId &&
            parsed.contentHash === record.contentHash && parsed.state === "pending");
    });
    run_("extrae fileId de URL Drive", function() {
        assert_(getImageUploadFileId_("https://drive.google.com/uc?export=view&id=abc_123-xy") === "abc_123-xy");
        assert_(getImageUploadFileId_("https://drive.google.com/file/d/abc_123-xy/view") === "abc_123-xy");
    });
    run_("hash de contenido es estable", function() {
        const bytes = [1, 2, 3, 4];
        assert_(calculateImageUploadContentHash_(bytes) === calculateImageUploadContentHash_(bytes.slice()));
    });
    run_("verifica archivo, carpeta, MIME, tamaño y hash", function() {
        const folder = { getId: () => "folder-1" };
        const blob = Utilities.newBlob([1, 2, 3], "image/png");
        const operationKey = "OP-123|17|imgCorte1";
        const contentHash = calculateImageUploadContentHash_([1, 2, 3]);
        const token = buildImageUploadToken(operationKey, blob, folder, "image/png");
        const expected = { operationKey, folderId: "folder-1", mimeType: "image/png", sizeBytes: 3, contentHash, token };
        const file = fakeFile_("file-1", [1, 2, 3], "image/png", "folder-1",
            buildImageUploadDescription_({ ...expected, fileName: "foto.png" }, "pending", "[]"));
        assert_(verifyImageUploadFile_(file, folder, expected) === true);
    });
    run_("rechaza archivo alterado", function() {
        const folder = { getId: () => "folder-1" };
        const blob = Utilities.newBlob([1, 2, 3], "image/png");
        const operationKey = "OP-123|17|imgCorte1";
        const contentHash = calculateImageUploadContentHash_([1, 2, 3]);
        const token = buildImageUploadToken(operationKey, blob, folder, "image/png");
        const expected = { operationKey, folderId: "folder-1", mimeType: "image/png", sizeBytes: 3, contentHash, token };
        expectThrow_(() => verifyImageUploadFile_(fakeFile_("file-1", [1, 2, 4], "image/png", "folder-1"), folder, expected), "hash");
    });
    run_("rechaza archivo en carpeta distinta", function() {
        const folder = { getId: () => "folder-1" };
        const blob = Utilities.newBlob([1, 2, 3], "image/png");
        const operationKey = "OP-123|17|imgCorte1";
        const contentHash = calculateImageUploadContentHash_([1, 2, 3]);
        const token = buildImageUploadToken(operationKey, blob, folder, "image/png");
        const expected = { operationKey, folderId: "folder-1", mimeType: "image/png", sizeBytes: 3, contentHash, token };
        expectThrow_(() => verifyImageUploadFile_(fakeFile_("file-1", [1, 2, 3], "image/png", "folder-2"), folder, expected), "carpeta");
    });
    run_("rechaza MIME o tamaño distinto", function() {
        const folder = { getId: () => "folder-1" };
        const blob = Utilities.newBlob([1, 2, 3], "image/png");
        const operationKey = "OP-123|17|imgCorte1";
        const contentHash = calculateImageUploadContentHash_([1, 2, 3]);
        const token = buildImageUploadToken(operationKey, blob, folder, "image/png");
        const expected = { operationKey, folderId: "folder-1", mimeType: "image/png", sizeBytes: 3, contentHash, token };
        expectThrow_(() => verifyImageUploadFile_(fakeFile_("file-1", [1, 2, 3], "image/jpeg", "folder-1"), folder, expected), "MIME");
        expectThrow_(() => verifyImageUploadFile_({
            ...fakeFile_("file-1", [1, 2, 3], "image/png", "folder-1"), getSize: () => 4
        }, folder, expected), "tamaño");
    });
    run_("encuentra un archivo único por token y rechaza duplicados", function() {
        const folder = { getId: () => "folder-1" };
        const blob = Utilities.newBlob([1, 2, 3], "image/png");
        const operationKey = "OP-123|17|imgCorte1";
        const contentHash = calculateImageUploadContentHash_([1, 2, 3]);
        const token = buildImageUploadToken(operationKey, blob, folder, "image/png");
        const expected = { operationKey, folderId: "folder-1", mimeType: "image/png", sizeBytes: 3, contentHash, token };
        const description = buildImageUploadDescription_({ ...expected, fileName: "foto.png" }, "pending", "[]");
        const file = fakeFile_("file-1", [1, 2, 3], "image/png", "folder-1", description);
        const one = {
            getFilesByName: () => iterator_([]),
            getFiles: () => iterator_([file])
        };
        assert_(findExistingImageUpload(one, "__GPSpediaUpload_" + token + ".png", expected, token).getId() === "file-1");
        const two = {
            getFilesByName: () => iterator_([]),
            getFiles: () => iterator_([file, fakeFile_("file-2", [1, 2, 3], "image/png", "folder-1", description)])
        };
        expectThrow_(() => findExistingImageUpload(two, "temp.png", expected, token), "varios archivos");
    });
    run_("busca un token único en ImageUploadLedger", function() {
        const values = Array(IMAGE_UPLOAD_LEDGER_HEADERS.length).fill("");
        values[0] = "token-1";
        const sheet = fakeLedgerSheet_([IMAGE_UPLOAD_LEDGER_HEADERS, values]);
        assert_(findImageUploadLedgerRecord_(sheet, "token-1").rowIndex === 2);
        const duplicate = fakeLedgerSheet_([IMAGE_UPLOAD_LEDGER_HEADERS, values, values]);
        expectThrow_(() => findImageUploadLedgerRecord_(duplicate, "token-1"), "duplicado");
    });
    run_("guarda y verifica todos los campos del ledger", function() {
        const sheet = fakeLedgerSheet_([IMAGE_UPLOAD_LEDGER_HEADERS]);
        const values = ["t", "op", "f", "image/png", 3, "hash", "id", "url", "pending", "", "", "", "[]", "name.png", "created", "updated", ""];
        const saved = saveImageUploadLedgerRecord_(sheet, { rowIndex: 0, values: values });
        assert_(saved.rowIndex === 2 && sheet._data[1][8] === "pending" && sheet._data[1][12] === "[]");
    });
    run_("clasifica referencia presente como linked incluso tras respuesta perdida", function() {
        assert_(classifyImageUploadReconciliation_("pending", "valid", 1) === "linked");
    });
    run_("conserva como pending los archivos sin referencia", function() {
        assert_(classifyImageUploadReconciliation_("pending", "valid", 0) === "pending_unreferenced");
    });
    run_("clasifica archivo faltante y alterado sin eliminarlo", function() {
        assert_(classifyImageUploadReconciliation_("pending", "missing", 1) === "file_missing");
        assert_(classifyImageUploadReconciliation_("pending", "altered", 1) === "requires_review");
    });
    run_("un linked sin referencia pasa a orphan_candidate", function() {
        assert_(classifyImageUploadReconciliation_("linked", "valid", 0) === "orphan_candidate");
    });
    run_("no crea archivo Drive si no puede persistir el intento local", function() {
        const originalGetSpreadsheet = getSpreadsheet;
        let created = 0;
        getSpreadsheet = function() { throw new Error("Spreadsheet no disponible"); };
        try {
            const folder = { getId: () => "folder-1", createFile: () => { created++; throw new Error("No debía crear"); } };
            expectThrow_(() => uploadImageToDrive("data:image/png;base64,AQ==", "foto", folder, "OP-123|17|imgCorte1"), "Spreadsheet no disponible");
            assert_(created === 0, "Drive no debe recibir archivos si el ledger no se puede persistir.");
        } finally {
            getSpreadsheet = originalGetSpreadsheet;
        }
    });

    return { status: failed === 0 ? "PASS" : "FAIL", passed: passed, failed: failed, results: results };
}