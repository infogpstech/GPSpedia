import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const coordinator = readFileSync(new URL("../Services/Coordinator.js", import.meta.url), "utf8");
const start = admin.indexOf("function handleCreateCortesImageFolder(payload, logMessage, developerContext) {");
const end = admin.indexOf("\nfunction ", start + 10);
assert.ok(start >= 0 && end > start, "No se encontró handleCreateCortesImageFolder");
const handler = admin.slice(start, end);
assert.doesNotMatch(handler, /LockService\.getScriptLock|\.waitLock\(|\.tryLock\(/,
    "La creación de carpeta no debe usar el ScriptLock global");
assert.match(handler, /parentFolder\.createFolder\(model\)/);
assert.match(handler, /recordImageAdministrationActivity\(developerContext, "create_folder"/);

const dispatch = admin.slice(admin.indexOf("case 'createCortesImageFolder':"), admin.indexOf("case 'moveReplacedImage':"));
assert.match(dispatch, /withSharedMutationLease_\("ADMIN", "createCortesImageFolder"/,
    "El dispatcher debe adquirir la lease de recurso específico");

const policyStart = coordinator.indexOf("createCortesImageFolder: {");
const policyEnd = coordinator.indexOf("\n", policyStart);
const policy = coordinator.slice(policyStart, policyEnd);
assert.match(policy, /write: \["CORTES_IMAGE_FOLDER"\]/);
assert.doesNotMatch(policy, /DRIVE|ACTIVITY|USERS/,
    "La lease de creación de carpeta no debe bloquear Drive general, actividad ni login");
console.log("AdminCreateCortesImageFolderLease: 5/5 PASS");
