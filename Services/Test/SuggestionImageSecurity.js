import fs from "node:fs";
import assert from "node:assert/strict";
import crypto from "node:crypto";

function section(source, start, end) {
    const i = source.indexOf(start);
    const j = source.indexOf(end, i + start.length);
    if (i < 0 || j < 0) throw new Error("No se encontró el bloque " + start);
    return source.slice(i, j);
}

export function runSuggestionImageSecurityTests({ feedback, ui }) {
    const results = [];
    let passed = 0, failed = 0;
    const test = (name, fn) => {
        try { fn(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    };
    const uiBlock = section(ui, "export function openSuggestCutModal(", "\nexport function openExpandMenuModal");
    const validatorBlock = section(feedback, "const REPORT_IMAGE_MAX_BYTES = 3 * 1024 * 1024;", "function saveReportImageAttachment_(");
    const normalizerBlock = section(feedback, "function normalizeSuggestionImageAttachment_(", "function saveSuggestionImageAttachment_(");
    const saveBlock = section(feedback, "function saveSuggestionImageAttachment_(", "function handleSuggestCutChange(");
    const handlerBlock = section(feedback, "function handleSuggestCutChange(", "\nfunction parseModelosAsociados(rawVal)");
    const utilities = {
        DigestAlgorithm: { SHA_256: "SHA_256" },
        base64Decode: value => Array.from(Buffer.from(value, "base64")),
        base64Encode: bytes => Buffer.from(bytes.map(value => Number(value) & 255)).toString("base64"),
        computeDigest: (_algorithm, bytes) => Array.from(crypto.createHash("sha256").update(Buffer.from(bytes.map(value => Number(value) & 255))).digest())
    };
    const validationFactory = new Function("Utilities", validatorBlock + "\nreturn validateReportImageAttachment_;");
    const validate = validationFactory(utilities);
    const normalizerFactory = new Function("Utilities", "validateReportImageAttachment_", "REPORT_IMAGE_MAX_BYTES", normalizerBlock + "\nreturn normalizeSuggestionImageAttachment_;");
    const normalize = normalizerFactory(utilities, validate, 3 * 1024 * 1024);
    const fixtures = {
        "image/jpeg": [255, 216, 255, 1],
        "image/png": [137, 80, 78, 71, 13, 10, 26, 10],
        "image/webp": [82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]
    };
    const attachment = mimeType => {
        const bytes = fixtures[mimeType];
        return { dataUrl: "data:" + mimeType + ";base64," + Buffer.from(bytes).toString("base64"),
            name: "evidencia." + ({ "image/jpeg":"jpg", "image/png":"png", "image/webp":"webp" })[mimeType],
            mimeType, size: bytes.length };
    };

    test("frontend limita el selector a JPEG, PNG y WebP", () => {
        assert.ok(uiBlock.includes('accept="image/jpeg,image/png,image/webp"'));
    });
    test("frontend aplica allowlist MIME explícita", () => {
        assert.ok(uiBlock.includes('["image/jpeg", "image/png", "image/webp"]'));
        assert.ok(uiBlock.includes("allowedMimeTypes.includes(mimeType)"));
    });
    test("frontend limita tamaño a 3 MB y rechaza archivos vacíos", () => {
        assert.ok(uiBlock.includes("const maxImageBytes = 3 * 1024 * 1024"));
        assert.ok(uiBlock.includes("selectedFile.size < 1 || selectedFile.size > maxImageBytes"));
    });
    test("FileReader resuelve carga válida y gestiona error y abort", () => {
        for (const event of ["reader.onload", "reader.onerror", "reader.onabort"]) assert.ok(uiBlock.includes(event));
        assert.ok(uiBlock.includes("reader.readAsDataURL(selectedFile)"));
    });
    test("errores de lectura se propagan al catch que libera el botón", () => {
        const tryAt = uiBlock.indexOf("        try {", uiBlock.indexOf("form.onsubmit"));
        const readAt = uiBlock.indexOf("reader.readAsDataURL(selectedFile)");
        const catchAt = uiBlock.indexOf("        } catch (err)", readAt);
        assert.ok(tryAt >= 0 && readAt > tryAt && catchAt > readAt);
        assert.ok(uiBlock.slice(catchAt).includes("submitBtn.disabled = false"));
        assert.ok(uiBlock.slice(catchAt).includes('submitBtn.innerText = "Enviar Sugerencia"'));
    });
    test("frontend transmite imageAttachment y no el campo legado imgBase64", () => {
        assert.ok(uiBlock.includes("imageAttachment = { dataUrl"));
        assert.ok(uiBlock.includes("imageAttachment, proposedValues"));
        assert.ok(!/imgBase64\s*,/.test(uiBlock));
    });
    test("frontend exige confirmación del adjunto antes de mostrar éxito", () => {
        assert.ok(uiBlock.includes("response.imageAttached !== true || !response.imageUrl"));
        assert.ok(uiBlock.indexOf("response.imageAttached !== true") < uiBlock.indexOf("showGlobalNotification"));
    });
    test("validador compartido acepta JPEG, PNG y WebP con firma binaria", () => {
        for (const mimeType of Object.keys(fixtures)) {
            const result = validate(attachment(mimeType));
            assert.strictEqual(result.mimeType, mimeType);
            assert.strictEqual(result.size, fixtures[mimeType].length);
        }
    });
    test("validador rechaza MIME discordante con la firma", () => {
        const bad = attachment("image/png"); bad.mimeType = "image/jpeg";
        assert.throws(() => validate(bad), /tipo MIME/);
    });
    test("validador rechaza payload mayor a 3 MB", () => {
        const bytes = Array(3 * 1024 * 1024 + 1).fill(1);
        const oversized = { dataUrl: "data:image/jpeg;base64," + Buffer.from(bytes).toString("base64"),
            name: "large.jpg", mimeType: "image/jpeg", size: bytes.length };
        assert.throws(() => validate(oversized), /3 MB/);
    });
    test("normalizador conserva compatibilidad con Data URL legado y valida bytes", () => {
        const source = attachment("image/webp");
        assert.strictEqual(normalize(null, source.dataUrl).mimeType, "image/webp");
    });
    test("normalizador limita Data URL legado antes de decodificar", () => {
        let decodeCalls = 0;
        const guardedUtilities = Object.assign({}, utilities, {
            base64Decode(value) { decodeCalls++; return utilities.base64Decode(value); }
        });
        const guardedNormalize = normalizerFactory(guardedUtilities, validate, 3 * 1024 * 1024);
        assert.throws(() => guardedNormalize(null, "data:image/jpeg;base64," + "A".repeat(4 * 1024 * 1024 + 8)), /3 MB/);
        assert.strictEqual(decodeCalls, 0);
    });
    test("normalizador rechaza dos fuentes de imagen simultáneas", () => {
        const source = attachment("image/png");
        assert.throws(() => normalize(source, source.dataUrl), /un solo campo/);
    });
    test("almacenamiento usa carpeta privada bajo Cortes y MIME real", () => {
        let capturedBlob = null, capturedFolder = "", capturedParent = null;
        const root = { root: true };
        const file = { getSharingAccess: () => "PRIVATE", getId: () => "fileId_123456789", setTrashed() {} };
        const folder = { createFile(blob) { capturedBlob = blob; return file; } };
        const saveFactory = new Function("DriveApp", "Utilities", "findOrCreateSubFolder", "getCortesRootFolder", saveBlock + "\nreturn saveSuggestionImageAttachment_;");
        const save = saveFactory({ Access: { ANYONE: "ANYONE", ANYONE_WITH_LINK: "ANYONE_WITH_LINK" } },
            { newBlob: (bytes, mimeType, name) => ({ bytes, mimeType, name }) },
            (parent, name) => { capturedParent = parent; capturedFolder = name; return folder; }, () => root);
        const result = save({ bytes: fixtures["image/png"], mimeType: "image/png", name: "ref.png", size: 8, sha256: "a".repeat(64) }, "VEH-1", 2);
        assert.strictEqual(capturedParent, root);
        assert.strictEqual(capturedFolder, "SugerenciasCortes");
        assert.strictEqual(capturedBlob.mimeType, "image/png");
        assert.ok(capturedBlob.name.endsWith(".png"));
        assert.strictEqual(result.metadata.imageMimeType, "image/png");
        assert.strictEqual(result.metadata.imageUrl, "https://drive.google.com/file/d/fileId_123456789/view");
    });
    test("almacenamiento conserva extensiones reales JPEG y WebP", () => {
        const saveFactory = new Function("DriveApp", "Utilities", "findOrCreateSubFolder", "getCortesRootFolder", saveBlock + "\nreturn saveSuggestionImageAttachment_;");
        const blobs = [];
        const folder = { createFile(blob) { blobs.push(blob); return { getSharingAccess: () => "PRIVATE", getId: () => "fileId_123456789", setTrashed() {} }; } };
        const save = saveFactory({ Access: { ANYONE: "ANYONE", ANYONE_WITH_LINK: "ANYONE_WITH_LINK" } },
            { newBlob: (bytes, mimeType, name) => ({ bytes, mimeType, name }) }, () => folder, () => ({}));
        for (const mimeType of ["image/jpeg", "image/webp"]) save({ bytes: fixtures[mimeType], mimeType, name: "evidence", size: fixtures[mimeType].length, sha256: "b".repeat(64) }, "VEH-2", 1);
        assert.ok(blobs[0].name.endsWith(".jpg"));
        assert.ok(blobs[1].name.endsWith(".webp"));
        assert.strictEqual(blobs[0].mimeType, "image/jpeg");
        assert.strictEqual(blobs[1].mimeType, "image/webp");
    });
    test("almacenamiento rechaza acceso público y envía el archivo a papelera", () => {
        let trashed = false;
        const file = { getSharingAccess: () => "ANYONE_WITH_LINK", getId: () => "fileId_123456789", setTrashed() { trashed = true; } };
        const folder = { createFile: () => file };
        const save = new Function("DriveApp", "Utilities", "findOrCreateSubFolder", "getCortesRootFolder", saveBlock + "\nreturn saveSuggestionImageAttachment_;")(
            { Access: { ANYONE: "ANYONE", ANYONE_WITH_LINK: "ANYONE_WITH_LINK" } },
            { newBlob: () => ({}) }, () => folder, () => ({}));
        assert.throws(() => save({ bytes: [1], mimeType: "image/jpeg", name: "x", size: 1, sha256: "a".repeat(64) }, "V", 1), /acceso público/);
        assert.strictEqual(trashed, true);
    });
    test("almacenamiento falla de forma cerrada si no puede comprobar ACL", () => {
        let trashed = false;
        const file = { getId: () => "fileId_123456789", setTrashed() { trashed = true; } };
        const save = new Function("DriveApp", "Utilities", "findOrCreateSubFolder", "getCortesRootFolder", saveBlock + "\nreturn saveSuggestionImageAttachment_;")(
            { Access: { ANYONE: "ANYONE", ANYONE_WITH_LINK: "ANYONE_WITH_LINK" } },
            { newBlob: () => ({}) }, () => ({ createFile: () => file }), () => ({}));
        assert.throws(() => save({ bytes: [1], mimeType: "image/jpeg", name: "x", size: 1, sha256: "a".repeat(64) }, "V", 1), /verificar el acceso/);
        assert.strictEqual(trashed, true);
    });
    test("fallo de creación en Drive se propaga", () => {
        const save = new Function("DriveApp", "Utilities", "findOrCreateSubFolder", "getCortesRootFolder", saveBlock + "\nreturn saveSuggestionImageAttachment_;")(
            { Access: { ANYONE: "ANYONE", ANYONE_WITH_LINK: "ANYONE_WITH_LINK" } },
            { newBlob: () => ({}) },
            () => ({ createFile() { throw new Error("Drive temporalmente no disponible"); } }), () => ({}));
        assert.throws(() => save({ bytes: [1], mimeType: "image/jpeg", name: "x", size: 1, sha256: "a".repeat(64) }, "V", 1), /Drive temporalmente no disponible/);
    });
    test("rechaza y retira archivo si Drive no devuelve ID válido", () => {
        let trashed = false;
        const file = { getSharingAccess: () => "PRIVATE", getId: () => "", setTrashed() { trashed = true; } };
        const save = new Function("DriveApp", "Utilities", "findOrCreateSubFolder", "getCortesRootFolder", saveBlock + "\nreturn saveSuggestionImageAttachment_;")(
            { Access: { ANYONE: "ANYONE", ANYONE_WITH_LINK: "ANYONE_WITH_LINK" } },
            { newBlob: () => ({}) }, () => ({ createFile: () => file }), () => ({}));
        assert.throws(() => save({ bytes: [1], mimeType: "image/jpeg", name: "x", size: 1, sha256: "a".repeat(64) }, "V", 1), /identificador válido/);
        assert.strictEqual(trashed, true);
    });
    test("handler propaga fallos de Drive y no confirma una sugerencia con imagen faltante", () => {
        assert.ok(handlerBlock.includes("saveSuggestionImageAttachment_(normalizedImage"));
        assert.ok(handlerBlock.indexOf("saveSuggestionImageAttachment_(normalizedImage") < handlerBlock.indexOf("sheet.getRange(newRowNumber, COLS_FEEDBACKS.Usuario"));
        assert.ok(handlerBlock.includes("throw error;"));
        assert.ok(!/catch\s*\(\s*e\s*\)\s*\{\s*console\.error\("Error subiendo imagen/.test(handlerBlock));
        assert.ok(handlerBlock.includes("imageAttached: Boolean(imageMetadata)"));
        assert.ok(handlerBlock.includes("String(imageAttachment != null ? imageAttachment.dataUrl || \"\" : imgBase64 || \"\")"));
    });
    test("handler verifica lectura posterior de la fila antes de confirmar", () => {
        assert.ok(handlerBlock.includes("const storedProblem = sheet.getRange(newRowNumber, COLS_FEEDBACKS.Problema).getValue()"));
        assert.ok(handlerBlock.includes("String(storedProblem || \"\") !== problemDesc"));
    });
    test("handler retira el archivo huérfano si no se confirma la fila", () => {
        assert.ok(handlerBlock.includes("if (!rowCommitted) trashReportImageUpload_(uploadedImage)"));
        assert.ok(handlerBlock.indexOf("rowCommitted = true") < handlerBlock.lastIndexOf("uploadedImage = null"));
    });
    test("handler devuelve metadatos MIME, tamaño, hash e ID de Drive", () => {
        for (const field of ["imageFileId", "imageMimeType", "imageSize", "imageSha256"]) assert.ok(handlerBlock.includes(field));
    });
    test("idempotencia devuelve confirmación de imagen ya registrada", () => {
        assert.ok(handlerBlock.includes("alreadySuggested: true"));
        assert.ok(handlerBlock.includes("imageAttached: Boolean(existing.record.imageUrl)"));
    });
    test("la carga no concede acceso público explícito", () => {
        assert.ok(saveBlock.includes("getSharingAccess"));
        assert.ok(saveBlock.includes("DriveApp.Access.ANYONE_WITH_LINK"));
        assert.ok(!saveBlock.includes("setSharing("));
        assert.ok(saveBlock.includes('findOrCreateSubFolder(getCortesRootFolder(), "SugerenciasCortes")'));
    });

    return { status: failed ? "FAIL" : "PASS", passed, failed, results };
}

const feedback = fs.readFileSync(new URL("../feedback.js", import.meta.url), "utf8");
const ui = fs.readFileSync(new URL("../../ui.js", import.meta.url), "utf8");
const result = runSuggestionImageSecurityTests({ feedback, ui, assert });
console.log(JSON.stringify(result, null, 2));
if (result.status !== "PASS") process.exitCode = 1;
