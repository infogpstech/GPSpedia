import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../../", import.meta.url);
const ui = readFileSync(new URL("../../JS/Frontend/ui.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const admin = readFileSync(new URL("../../JS/Services/admin.js", import.meta.url), "utf8");
const api = readFileSync(new URL("../../JS/Frontend/api-config.js", import.meta.url), "utf8");
const checks = [
    ["HTML expone botón de aplicación explícita", /id="btn-audit-drive-apply-organizer"/.test(html)],
    ["HTML expone botón de rollback", /id="btn-audit-drive-rollback-organizer"/.test(html)],
    ["La selección solo incluye elementos ready", /if \(item\.status === "ready"\)/.test(ui)],
    ["La selección limita el lote a diez y exige una misma página", /selected\.length <= 10 && pages\.size === 1/.test(ui)],
    ["La aplicación exige confirmación interactiva del Desarrollador", ui.includes("gpsepediaRequestDeveloperConsoleConfirmation") && ui.includes("approvedFileIds.length") && ui.includes("if (!confirmed || !isCurrentRequest()) return;")],
    ["La aplicación envía auditId, offset, digest, IDs y confirm", /routeActionWithRetry\("applyCortesImageOrganizer"/.test(ui) && /manifestDigest: currentOrganizerPreview\.digest, approvedFileIds, confirm: true/.test(ui)],
    ["El frontend solo ofrece rollback de operaciones del último lote", /routeActionWithRetry\("rollbackCortesImageOrganizer"/.test(ui) && /operationIds: lastOrganizerOperationIds, confirm: true/.test(ui)],
    ["El backend vuelve a generar preview y compara digest", /handlePreviewCortesImageOrganizer_\(\{\s*auditId, offset, limit\s*\}/.test(admin) && /preview\.manifestDigest !== digest/.test(admin)],
    ["Ambos endpoints siguen enrutados a ADMIN", /'applyCortesImageOrganizer': 'ADMIN'/.test(api) && /'rollbackCortesImageOrganizer': 'ADMIN'/.test(api)],
    ["El preview sigue siendo solo lectura y no se autoautoriza", /writePerformed: false, canApply: false/.test(admin)]
];
let passed = 0;
for (const [name, result] of checks) {
    assert.ok(result, name);
    passed++;
    console.log("PASS " + name);
}
console.log("CortesImageOrganizerUiContract: " + passed + "/" + checks.length + " PASS");
