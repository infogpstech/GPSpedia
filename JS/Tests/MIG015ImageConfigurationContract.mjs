import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const root = new URL("../Services/", import.meta.url);
const serviceKeys = { "admin.js": "ADMIN", "write.js": "WRITE", "feedback.js": "FEEDBACK" };
let passed = 0;
function check(name, fn) { fn(); passed++; }
function sourceOf(name) { return readFileSync(new URL(name, root), "utf8"); }
function helperBlock(source) {
    const start = source.indexOf("function getCortesRootFolderResource_()");
    const end = source.indexOf("\nfunction ", source.indexOf("function getCortesRootFolderId_()", start) + 10);
    assert.ok(start >= 0 && end > start, "No se encontró el resolver central de carpeta Cortes.");
    return source.slice(start, end);
}
function makeDrive(folderId = "1-8QqhS-wtEFFwyBG8CmnEOp5i8rxSM-2", folderName = "Cortes", parentId = "ROOT_12345") {
    const folder = {
        isTrashed: () => false, getId: () => folderId, getName: () => folderName,
        getParents: () => { let used = false; return { hasNext: () => !used, next: () => { used = true; return { getId: () => parentId }; } }; }
    };
    return { getFolderById: id => { assert.equal(id, folderId); return folder; }, getRootFolder: () => ({ getId: () => "ROOT_12345" }) };
}
for (const [filename, serviceKey] of Object.entries(serviceKeys)) {
    const source = sourceOf(filename);
    check(serviceKey + " usa Spreadsheet y carpeta compartidas sin propiedades locales", () => {
        assert.ok(source.includes("SpreadsheetApp.openById(GPSpediaSpreadsheetId_)"));
        assert.ok(source.includes("GPSpediaCortesRootFolderId_"));
        assert.doesNotMatch(source, /PropertiesService|CORTES_IMAGES_ROOT_FOLDER_ID/);
    });
    const resolver = helperBlock(source);
    const makeApi = (drive = makeDrive()) => new Function("GPSpediaCortesRootFolderId_", "DriveApp",
        resolver + "\nreturn { getCortesRootFolderResource_, getCortesRootFolder, getCortesRootFolderId_ };")(
            "1-8QqhS-wtEFFwyBG8CmnEOp5i8rxSM-2", drive);
    check(serviceKey + " abre y verifica la carpeta Cortes configurada", () => {
        const api = makeApi();
        assert.equal(api.getCortesRootFolder().getId(), "1-8QqhS-wtEFFwyBG8CmnEOp5i8rxSM-2");
        assert.equal(api.getCortesRootFolderId_(), "1-8QqhS-wtEFFwyBG8CmnEOp5i8rxSM-2");
    });
    check(serviceKey + " rechaza una carpeta Drive con nombre incorrecto", () => {
        assert.throws(() => makeApi(makeDrive(undefined, "Otra carpeta")).getCortesRootFolder(), /no corresponde a la carpeta raíz/);
    });
    check(serviceKey + " rechaza una carpeta fuera de la raíz Drive", () => {
        assert.throws(() => makeApi(makeDrive(undefined, "Cortes", "OTHER_PARENT")).getCortesRootFolder(), /no está ubicada directamente/);
    });
    check(serviceKey + " falla cerrado si no hay ID de carpeta", () => {
        const api = new Function("GPSpediaCortesRootFolderId_", resolver + "\nreturn getCortesRootFolderResource_;")("");
        assert.throws(() => api(), /ID de la carpeta raíz Cortes no está configurado/);
    });
}
check("ADMIN ya no persiste Imagenes_Sin_Uso en ScriptProperties", () => {
    const admin = sourceOf("admin.js");
    const start = admin.indexOf("function getOrCreateUnusedImagesFolder(rootFolder)");
    const end = admin.indexOf("\n}", start) + 2;
    const helper = admin.slice(start, end);
    assert.ok(start >= 0 && end > start);
    assert.match(helper, /getFoldersByName\(folderName\)/);
    assert.match(helper, /getSingleParentFolderInsideCortes/);
    assert.doesNotMatch(helper, /PropertiesService|GPSpedia_UNUSED_IMAGES_FOLDER_ID/);
});
const configReader = readFileSync(new URL("CentralConfigurationReader.js", root), "utf8");
assert.match(configReader, /GPSpediaCortesRootFolderId_/);
assert.match(configReader, /resourceType: item\.resourceType/);
assert.match(configReader, /resourceId: item\.resourceId/);
const schema = readFileSync(new URL("../../ESQUEMA_CONFIGURACION_CENTRAL.md", import.meta.url), "utf8");
assert.match(schema, /cortes_root_folder_id/);
console.log("MIG015ImageConfigurationContract: " + passed + "/" + passed + " PASS — IDs compartidos, acceso Spreadsheet, carpeta Cortes y jerarquía Drive.");