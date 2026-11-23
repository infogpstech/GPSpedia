import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
function extract(name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const next = source.indexOf("\nfunction ", start + 10);
    return source.slice(start, next > start ? next : source.length);
}
const handlerSource = extract("handleCreateCortesImageFolder");
assert.match(handlerSource, /const rootFolder = getCortesRootFolder\(\);/,
    "La creación debe resolver la raíz Cortes desde la configuración central");
assert.doesNotMatch(handlerSource, /CORTES_IMAGES_ROOT_FOLDER_ID|DriveApp\.getFolderById/,
    "El handler no debe conservar IDs locales ni resolver directamente la carpeta raíz");

function createApi({ rootFolder, duplicate = false, rootError = null } = {}) {
    const calls = { root: 0, parent: null, created: [], logs: [], activity: [] };
    const parentFolder = {
        getFoldersByName(name) {
            calls.modelName = name;
            return { hasNext: () => duplicate };
        },
        createFolder(name) {
            calls.created.push(name);
            return { getId: () => "model-folder-id" };
        }
    };
    const api = new Function(
        "getCortesRootFolder",
        "findOrCreateVehicleFolder",
        "recordImageAdministrationActivity",
        handlerSource + "\nreturn handleCreateCortesImageFolder;"
    )(
        () => {
            calls.root++;
            if (rootError) throw rootError;
            return rootFolder;
        },
        (root, category, brand) => {
            calls.parent = { root, category, brand };
            return parentFolder;
        },
        (...args) => calls.activity.push(args)
    );
    return { api, calls };
}
let passed = 0;
function check(name, fn) {
    fn();
    passed++;
    console.log("PASS " + name);
}
check("La creación utiliza la carpeta Cortes devuelta por configuración central", () => {
    const root = { source: "central-resource" };
    const { api, calls } = createApi({ rootFolder: root });
    const logs = [];
    const result = api({ category: "Autos", brand: "Toyota", model: "Corolla" },
        (...args) => logs.push(args), { actor: "developer" });
    assert.equal(result.status, "success");
    assert.equal(result.folderId, "model-folder-id");
    assert.equal(calls.root, 1);
    assert.deepEqual(calls.parent, { root, category: "Autos", brand: "Toyota" });
    assert.deepEqual(calls.created, ["Corolla"]);
    assert.equal(calls.modelName, "Corolla");
    assert.equal(logs.length, 1);
    assert.equal(calls.activity.length, 1);
});
check("Payload incompleto se rechaza antes de consultar la configuración o Drive", () => {
    const { api, calls } = createApi({ rootFolder: {} });
    assert.throws(() => api({ category: "Autos", brand: "", model: "Corolla" }, () => {}, {}));
    assert.equal(calls.root, 0);
    assert.equal(calls.created.length, 0);
});
check("Modelo duplicado no crea otra carpeta", () => {
    const { api, calls } = createApi({ rootFolder: {}, duplicate: true });
    assert.throws(() => api({ category: "Autos", brand: "Toyota", model: "Corolla" }, () => {}, {}),
        /La carpeta del modelo ya existe/);
    assert.equal(calls.root, 1);
    assert.equal(calls.created.length, 0);
});
check("Configuración central no disponible falla de forma cerrada", () => {
    const { api, calls } = createApi({ rootError: new Error("central config unavailable") });
    assert.throws(() => api({ category: "Autos", brand: "Toyota", model: "Corolla" }, () => {}, {}),
        /central config unavailable/);
    assert.equal(calls.root, 1);
    assert.equal(calls.parent, null);
    assert.equal(calls.created.length, 0);
});
console.log("AdminCentralCortesFolderConfiguration: " + passed + "/4 PASS");
