import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const extract = (source, start, end) => {
    const i = source.indexOf(start);
    const j = source.indexOf(end, i + start.length);
    if (i < 0 || j < 0) throw new Error("No se encontró el bloque " + start);
    return source.slice(i, j);
};

const HEADER = ["id_problem", "Problema", "Descripción", "Se soluciono", "Solucion", "Prevenir", "Imagen", "Video", "Colaborador", "modelos_asociados"];
const FILE_ID = "FILEID12345678901234567890";
const signatures = {
    "image/jpeg": Buffer.from([255, 216, 255, 224, 1, 2]),
    "image/png": Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2]),
    "image/webp": Buffer.from([82, 73, 70, 70, 4, 0, 0, 0, 87, 69, 66, 80, 1])
};
const dataUrl = (mime = "image/png", bytes = signatures[mime]) =>
    "data:" + mime + ";base64," + bytes.toString("base64");
const iterator = values => {
    let index = 0;
    return { hasNext: () => index < values.length, next: () => values[index++] };
};

function buildHarness(feedback, options = {}) {
    const state = { rows: options.initialRows ? [HEADER.slice(), ...options.initialRows.map(row => row.slice())] : [],
        createdBlob: null, trashed: false, description: "", setSharingCalls: 0, fileCreated: false };
    const driveRoot = { getId: () => "drive-root" };
    const wrongParent = { getId: () => "other-parent" };
    const makeFolder = (id, name, parent) => ({
        getId: () => id,
        getName: () => name,
        getParents: () => iterator(parent ? [parent] : []),
        getFolders: () => iterator(state.childFolders || []),
        createFolder: childName => {
            const child = makeFolder("pys-folder-id-000000000000", childName, cortesFolder);
            child.createFile = blob => {
                if (options.failDrive) throw new Error("Drive createFile failed");
                state.fileCreated = true;
                state.createdBlob = blob;
                return file;
            };
            state.childFolders = state.childFolders || [];
            state.childFolders.push(child);
            return child;
        },
        getSharingAccess: () => "ANYONE_WITH_LINK",
        getSharingPermission: () => "VIEW"
    });
    const cortesFolder = makeFolder("root-cortes", options.wrongRootName ? "Otra carpeta" : "Cortes", options.wrongRootParent ? wrongParent : driveRoot);
    state.childFolders = (options.duplicateFolders ? [
        makeFolder("pys-folder-duplicate-0000001", "Problemas y Soluciones", cortesFolder),
        makeFolder("pys-folder-duplicate-0000002", "Problemas y Soluciones", cortesFolder)
    ] : options.existingFolder ? [
        makeFolder("pys-folder-existing-0000001", "Problemas y Soluciones", cortesFolder)
    ] : []);

    const file = {
        getId: () => FILE_ID,
        getSharingAccess: () => options.permissionMismatch ? "PRIVATE" : "ANYONE_WITH_LINK",
        getSharingPermission: () => "VIEW",
        setSharing: () => { state.setSharingCalls++; },
        setDescription: value => { state.description = value; },
        setTrashed: value => {
            if (options.failTrash) throw new Error("Drive trash failed");
            state.trashed = Boolean(value);
        },
        isTrashed: () => state.trashed
    };
    state.file = file;

    const sheet = {
        getLastRow: () => { if (options.failReferenceScan && state.fileCreated) throw new Error("Spreadsheet read failed"); return state.rows.length; },
        getLastColumn: () => 10,
        getRange: (row, col, numRows = 1, numCols = 1) => ({
            setValues: values => {
                for (let r = 0; r < values.length; r++) state.rows[row - 1 + r] = values[r].slice();
            },
            getValues: () => {
                if (options.failReferenceScan && row >= 2 && numCols > 1) throw new Error("Spreadsheet read failed");
                return state.rows.slice(row - 1, row - 1 + numRows).map(values => values.slice(col - 1, col - 1 + numCols));
            },
            getDisplayValues: () => {
                if (options.failReferenceScan && row >= 2 && numCols > 1) throw new Error("Spreadsheet read failed");
                return state.rows.slice(row - 1, row - 1 + numRows).map(values =>
                    values.slice(col - 1, col - 1 + numCols).map(value => value === null || value === undefined ? "" : String(value)));
            }
        }),
        getDataRange: () => ({
            getDisplayValues: () => {
                if (options.failDataRange) throw new Error("Spreadsheet data range unavailable");
                return state.rows.map(row => row.map(value => value === null || value === undefined ? "" : String(value)));
            }
        }),
        appendRow: row => {
            if (options.failAppend) throw new Error("Spreadsheet append failed");
            state.rows.push(row.slice());
        }
    };

    const context = {
        console,
        Utilities: {
            base64Decode: value => Array.from(Buffer.from(value, "base64")),
            base64Encode: value => Buffer.from(value).toString("base64"),
            newBlob: (bytes, mimeType, name) => ({ bytes: Array.from(bytes), mimeType, name })
        },
        DriveApp: {
            getFolderById: id => {
                if (options.wrongRootId || id !== "root-cortes") throw new Error("Authorized Drive root unavailable");
                return cortesFolder;
            },
            getRootFolder: () => driveRoot
        },
        LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
        SpreadsheetApp: { flush: () => { if (options.failFlush) throw new Error("Spreadsheet flush failed"); } },
        getSafeSheet: () => sheet,
        getSpreadsheet: () => ({ insertSheet: () => sheet }),
        logUserActivity: () => {},
        state
    };

    const folderHelpers = extract(feedback, "function extractDriveFileIds(value) {", "function getVehicleYearFolderName(vehicleInfo) {");
    const pysParser = extract(feedback, "function parseModelosAsociados(rawVal) {", "const PYS_IMAGE_MAX_BYTES");
    const pysHelpers = extract(feedback, "const PYS_IMAGE_MAX_BYTES", "function handleAddSolution(payload) {");
    vm.runInNewContext(
        'const DRIVE_FOLDER_ID = "root-cortes";\n' + folderHelpers + "\n" + pysParser + "\n" + pysHelpers +
        "\nthis.api = { validate: validatePysImageDataUrl_, getFolder: getPysImagesFolder_, " +
        "checkPermissions: assertPysImageFolderPermissions_, normalize: normalizePysImageReference_, " +
        "findReferences: findPysImageReferences_, markRecovery: markPysImageForRecovery_, " +
        "add: handleAddProblem, read: handleGetPysData };",
        context
    );
    return { api: context.api, state, sheet, context, file, cortesFolder };
}

export function runPysImageStorageRecoveryTests({ feedback, ui }) {
    const results = [];
    let passed = 0, failed = 0;
    const test = (name, fn) => {
        try { fn(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    };

    test("valida JPEG, PNG y WebP según MIME y firma binaria", () => {
        for (const mime of Object.keys(signatures)) {
            const h = buildHarness(feedback);
            const result = h.api.validate(dataUrl(mime));
            assert.equal(result.mimeType, mime);
            assert.equal(result.extension, { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[mime]);
            assert.equal(result.sizeBytes, signatures[mime].length);
        }
    });

    test("rechaza SVG, GIF, Data URL ausente y Base64 malformado", () => {
        const h = buildHarness(feedback);
        assert.throws(() => h.api.validate("data:image/svg+xml;base64,PHN2Zz4="), /JPEG, PNG o WebP/);
        assert.throws(() => h.api.validate("data:image/gif;base64,R0lGODlh"), /JPEG, PNG o WebP/);
        assert.throws(() => h.api.validate(""), /obligatoria/);
        assert.throws(() => h.api.validate("data:image/png;base64,%%%"), /Base64|decodificar|firma|debe ser/);
    });

    test("rechaza MIME declarado que no coincide con la firma", () => {
        const h = buildHarness(feedback);
        assert.throws(() => h.api.validate(dataUrl("image/jpeg", signatures["image/png"])), /firma binaria/);
        assert.throws(() => h.api.validate(dataUrl("image/png", signatures["image/jpeg"])), /firma binaria/);
    });

    test("rechaza imagen vacía y tamaño superior a 3 MB antes de crear recursos", () => {
        const h = buildHarness(feedback);
        assert.throws(() => h.api.validate("data:image/png;base64,"), /Base64/);
        const bytes = Buffer.alloc(3 * 1024 * 1024 + 1);
        bytes.set(signatures["image/png"].subarray(0, 8));
        assert.throws(() => h.api.validate(dataUrl("image/png", bytes)), /3 MB/);
    });

    test("rechaza Base64 no canónico", () => {
        const h = buildHarness(feedback);
        assert.throws(() => h.api.validate("data:image/png;base64," + signatures["image/png"].toString("base64").replace(/=+$/, "")), /canónica/);
    });

    test("crea la carpeta PyS dentro de Cortes cuando no existe", () => {
        const h = buildHarness(feedback);
        const result = h.api.getFolder();
        assert.equal(result.rootFolder.getId(), "root-cortes");
        assert.equal(result.folder.getName(), "Problemas y Soluciones");
        assert.equal(result.folder.getParents().next().getId(), "root-cortes");
        assert.equal(h.state.childFolders.length, 1);
    });

    test("reutiliza la carpeta PyS existente como hija directa", () => {
        const h = buildHarness(feedback, { existingFolder: true });
        const result = h.api.getFolder();
        assert.equal(result.folder.getId(), "pys-folder-existing-0000001");
        assert.equal(h.state.childFolders.length, 1);
    });

    test("rechaza carpetas PyS duplicadas sin elegir una arbitrariamente", () => {
        const h = buildHarness(feedback, { duplicateFolders: true });
        assert.throws(() => h.api.getFolder(), /varias carpetas equivalentes/);
        assert.equal(h.state.childFolders.length, 2);
    });

    test("rechaza una raíz Drive con nombre incorrecto o ID no autorizado", () => {
        const wrongName = buildHarness(feedback, { wrongRootName: true });
        assert.throws(() => wrongName.api.getFolder(), /no corresponde a la carpeta/);
        const wrongId = buildHarness(feedback, { wrongRootId: true });
        assert.throws(() => wrongId.api.getFolder(), /Authorized Drive root unavailable/);
        const wrongParent = buildHarness(feedback, { wrongRootParent: true });
        assert.throws(() => wrongParent.api.getFolder(), /no está ubicada directamente/);
    });

    test("exige que el archivo conserve el acceso heredado de la carpeta", () => {
        const h = buildHarness(feedback);
        const folder = h.api.getFolder().folder;
        assert.doesNotThrow(() => h.api.checkPermissions(h.file, folder));
        const mismatch = buildHarness(feedback, { permissionMismatch: true });
        assert.throws(() => mismatch.api.checkPermissions(mismatch.file, mismatch.api.getFolder().folder), /política de acceso heredada/);
    });

    test("normaliza ID y URLs Drive/Googleusercontent para recuperar la imagen", () => {
        const h = buildHarness(feedback);
        const canonical = "https://drive.google.com/file/d/" + FILE_ID + "/view";
        assert.equal(h.api.normalize(FILE_ID), canonical);
        assert.equal(h.api.normalize("https://drive.google.com/file/d/" + FILE_ID + "/view?usp=sharing"), canonical);
        assert.equal(h.api.normalize("https://lh3.googleusercontent.com/d/" + FILE_ID), canonical);
    });

    test("no devuelve URLs Drive malformadas y conserva referencias HTTPS históricas externas", () => {
        const h = buildHarness(feedback);
        assert.equal(h.api.normalize("https://drive.google.com.evil.test/file/d/" + FILE_ID + "/view"), "");
        assert.equal(h.api.normalize("https://example.com/legacy-image.png"), "https://example.com/legacy-image.png");
        assert.equal(h.api.normalize("javascript:alert(1)"), "");
    });

    test("alta PyS guarda el MIME, extensión y URL correspondientes sin ampliar permisos", () => {
        for (const [mime, extension] of [["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]) {
            const h = buildHarness(feedback);
            const result = h.api.add({ titulo: "Falla", descripcion: "Detalle", sinSolucion: true,
                userId: "u1", userName: "Técnico", imgBase64: dataUrl(mime) });
            assert.equal(result.status, "success");
            assert.equal(h.state.createdBlob.mimeType, mime);
            assert.ok(h.state.createdBlob.name.endsWith("." + extension));
            assert.equal(h.state.rows[1][6], "https://drive.google.com/file/d/" + FILE_ID + "/view");
            assert.equal(h.state.setSharingCalls, 0);
            assert.match(h.state.description, /LINKED/);
        }
    });

    test("un fallo de creación en Drive nunca devuelve éxito ni agrega una fila", () => {
        const h = buildHarness(feedback, { failDrive: true });
        assert.throws(() => h.api.add({ titulo: "Falla", descripcion: "Detalle", sinSolucion: true,
            userId: "u1", userName: "Técnico", imgBase64: dataUrl() }), /Drive createFile failed/);
        assert.equal(h.state.rows.length, 1);
        assert.equal(h.state.fileCreated, false);
    });

    test("un fallo de append compensa el archivo solo después de verificar que no está referenciado", () => {
        const h = buildHarness(feedback, { failAppend: true });
        assert.throws(() => h.api.add({ titulo: "Falla", descripcion: "Detalle", sinSolucion: true,
            userId: "u1", userName: "Técnico", imgBase64: dataUrl() }), /Spreadsheet append failed/);
        assert.equal(h.state.trashed, true);
    });

    test("si el flush falla pero la fila quedó vinculada, recupera el resultado sin borrar la imagen", () => {
        const h = buildHarness(feedback, { failFlush: true });
        const result = h.api.add({ titulo: "Falla", descripcion: "Detalle", sinSolucion: true,
            userId: "u1", userName: "Técnico", imgBase64: dataUrl() });
        assert.equal(result.status, "success");
        assert.equal(result.recovered, true);
        assert.equal(h.state.trashed, false);
        assert.match(h.state.description, /LINKED/);
    });

    test("no elimina la imagen si otro registro ya la referencia", () => {
        const existing = ["isue-001", "Otro", "Detalle", "", "", "", "https://drive.google.com/file/d/" + FILE_ID + "/view", "", "Otro usuario", ""];
        const h = buildHarness(feedback, { initialRows: [existing], failAppend: true });
        assert.throws(() => h.api.add({ titulo: "Falla", descripcion: "Detalle", sinSolucion: true,
            userId: "u1", userName: "Técnico", imgBase64: dataUrl() }), /referenciada por un registro/);
        assert.equal(h.state.trashed, false);
        assert.match(h.state.description, /RECOVERY_REQUIRED/);
    });

    test("si Sheets no permite comprobar referencias, conserva y marca el archivo para recuperación", () => {
        const h = buildHarness(feedback, { failAppend: true, failReferenceScan: true });
        assert.throws(() => h.api.add({ titulo: "Falla", descripcion: "Detalle", sinSolucion: true,
            userId: "u1", userName: "Técnico", imgBase64: dataUrl() }), /se conserva para recuperación manual/);
        assert.equal(h.state.trashed, false);
        assert.match(h.state.description, /RECOVERY_REQUIRED/);
    });

    test("si Drive no permite compensar, deja metadata recuperable y no afirma éxito", () => {
        const h = buildHarness(feedback, { failAppend: true, failTrash: true });
        assert.throws(() => h.api.add({ titulo: "Falla", descripcion: "Detalle", sinSolucion: true,
            userId: "u1", userName: "Técnico", imgBase64: dataUrl() }), /marcada para recuperación manual/);
        assert.equal(h.state.trashed, false);
        assert.match(h.state.description, /RECOVERY_REQUIRED/);
    });

    test("getPysData devuelve una referencia Drive normalizada y recuperable", () => {
        const existing = ["isue-001", "Falla", "Detalle", "", "", "", FILE_ID, "", "Técnico", ""];
        const h = buildHarness(feedback, { initialRows: [existing] });
        const result = h.api.read();
        assert.equal(result.status, "success");
        assert.equal(result.data[0].Imagen, "https://drive.google.com/file/d/" + FILE_ID + "/view");
    });

    test("frontend limita formatos/tamaño y captura errores/abortos de FileReader antes de enviar", () => {
        assert.match(ui, /id="pys-img-file" accept="image\/jpeg,image\/png,image\/webp" required/);
        const submit = extract(ui, 'form.onsubmit = async (e) => {', 'export function openSearchVehicleForPysAssociationModal');
        assert.match(submit, /selectedFile\.size > 3 \* 1024 \* 1024/);
        assert.match(submit, /reader\.onerror/);
        assert.match(submit, /reader\.onabort/);
        assert.match(submit, /reader\.readAsDataURL\(selectedFile\)/);
        assert.ok(submit.indexOf("const imgBase64 = await new Promise") < submit.indexOf('routeAction("addProblem"'));
        assert.match(submit, /finally[\s\S]*submitBtn\.disabled = false/);
    });

    test("backend no busca carpetas globales ni fuerza JPEG ni comparte ANYONE_WITH_LINK", () => {
        const handler = extract(feedback, "function handleAddProblem(payload) {", "function handleAddSolution(payload) {");
        assert.doesNotMatch(handler, /DriveApp\.getFoldersByName|DriveApp\.createFolder|image\/jpeg"\s*,\s*problemId|setSharing/);
        assert.match(handler, /getPysImagesFolder_\(\)/);
        assert.match(handler, /image\.mimeType/);
        assert.match(handler, /findPysImageReferences_\(/);
    });

    return { status: failed ? "FAIL" : "PASS", passed, failed, results };
}

const feedback = fs.readFileSync("Services/feedback.js", "utf8");
const ui = fs.readFileSync("ui.js", "utf8");
const result = runPysImageStorageRecoveryTests({ feedback, ui });
console.log(JSON.stringify(result, null, 2));
if (result.status !== "PASS") process.exitCode = 1;
