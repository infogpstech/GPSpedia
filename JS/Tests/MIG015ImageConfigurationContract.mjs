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
function makeDrive(folderId = "FOLDER_12345", folderName = "Cortes", parentId = "ROOT_12345") {
    const folder = {
        isTrashed: () => false, getId: () => folderId, getName: () => folderName,
        getParents: () => { let used = false; return { hasNext: () => !used, next: () => { used = true; return { getId: () => parentId }; } }; }
    };
    return { getFolderById: id => { assert.equal(id, folderId); return folder; }, getRootFolder: () => ({ getId: () => "ROOT_12345" }) };
}
for (const [filename, serviceKey] of Object.entries(serviceKeys)) {
    const source = sourceOf(filename);
    check(serviceKey + " elimina IDs locales y usa Spreadsheet vinculada", () => {
        assert.doesNotMatch(source, /\b(?:SPREADSHEET_ID|DRIVE_FOLDER_ID)\b/);
        assert.doesNotMatch(source, /1_BDp256L6fxmZdyCek9m4A-a_-TjeKJOt3fteXYt3Os|1-8QqhS-wtEFFwyBG8CmnEOp5i8rxSM-2/);
        const start = source.indexOf("function getSpreadsheet()");
        const end = source.indexOf("\n}", start) + 2;
        const getter = source.slice(start, end);
        assert.match(getter, /SpreadsheetApp\.getActiveSpreadsheet\(\)/);
        assert.match(getter, /if \(!spreadsheet\) throw new Error/);
        assert.ok(source.includes('getCentralConfigurationForService_("' + serviceKey + '")'));
    });
    const block = helperBlock(source);
    const makeApi = (snapshot, drive = makeDrive()) => new Function("getCentralConfigurationForService_", "DriveApp",
        block + "\nreturn { getCortesRootFolderResource_, getCortesRootFolder, getCortesRootFolderId_ };")(
            key => { assert.equal(key, serviceKey); return snapshot; }, drive);
    check(serviceKey + " resuelve el recurso central y valida carpeta/jerarquía", () => {
        const api = makeApi({ status: "success", stale: false, resources: { cortes_root_folder_id: {
            resourceType: "drive_folder",resourceId: "FOLDER_12345",
            expectedParentId: "ROOT_12345", expectedName: "Cortes"
        } } });
        assert.equal(api.getCortesRootFolder().getId(), "FOLDER_12345");
        assert.equal(api.getCortesRootFolderId_(), "FOLDER_12345");
    });
    check(serviceKey + " falla cerrado si falta o vence la configuración", () => {
        assert.throws(() => makeApi({ status: "success", stale: false, resources: {} }).getCortesRootFolder(), /Falta el recurso central/);
        assert.throws(() => makeApi({ status: "success", stale: true, resources: { cortes_root_folder_id: { resourceType: "drive_folder",resourceId: "FOLDER_12345" } } }).getCortesRootFolder(), /no está disponible o está vencida/);
    });
    check(serviceKey + " rechaza jerarquía de Drive discordante", () => {
        const api = makeApi({ status: "success", stale: false, resources: { cortes_root_folder_id: {
            resourceType: "drive_folder",resourceId: "FOLDER_12345",
            expectedParentId: "OTHER_PARENT", expectedName: "Cortes"
        } } });
        assert.throws(() => api.getCortesRootFolder(), /no está ubicada directamente en el padre configurado/);
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
assert.match(configReader, /getCentralConfigurationForService_/);
assert.match(configReader, /resourceType: item\.resourceType/);
assert.match(configReader, /resourceId: item\.resourceId/);
const schema = readFileSync(new URL("../../ESQUEMA_CONFIGURACION_CENTRAL.md", import.meta.url), "utf8");
assert.match(schema, /cortes_root_folder_id/);
console.log("MIG015ImageConfigurationContract: " + passed + "/" + passed + " PASS — configuración central, fail-closed, jerarquía Drive y ausencia de IDs/propiedades locales.");