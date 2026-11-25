import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");
const guide = read("Services/DEPLOYMENT_GUIDE.md");
const readme = read("README.md");
const schema = read("ESQUEMA_CONFIGURACION_CENTRAL.md");
const auth = read("JS/Services/Auth.js");
const ui = read("JS/Frontend/ui.js");
const api = read("JS/Frontend/api-config.js");
const html = read("index.html");
const catalog = read("JS/Services/catalog.js");
const write = read("JS/Services/write.js");
const feedback = read("JS/Services/feedback.js");
const inbox = read("JS/Services/InboxConversations.js");
const utilities = read("JS/Services/Utilities.js");
const admin = read("JS/Services/admin.js");
const shared = read("JS/Services/SharedSessionActor.js");
const central = read("JS/Services/CentralConfigurationReader.js");

let passed = 0;
function check(name, fn) { fn(); passed++; console.log("PASS", name); }

check("La guía identifica solo los seis proyectos activos y sus fuentes", () => {
  for (const service of ["AUTH","CATALOG","WRITE","FEEDBACK","UTILITIES","ADMIN"]) assert.ok(guide.includes("| " + service + " |"));
  assert.match(guide, /AUTH.*CentralConfigurationReader\.js/s);
  assert.match(guide, /CATALOG.*catalog\.js/s);
  assert.match(guide, /FEEDBACK.*InboxConversations\.js/s);
  assert.match(guide, /UTILITIES.*Utilities\.js/s);
  assert.match(guide, /ADMIN.*CentralConfigurationReader\.js/s);
  assert.match(guide, /USERS y COORDINATOR/);
});
check("La matriz de archivos coincide con dependencias reales", () => {
  assert.match(auth, /getPublicCentralConfiguration_/);
  assert.match(write, /GPSpediaCortesRootFolderId_/);
  assert.match(feedback, /GPSpediaCortesRootFolderId_/);
  assert.match(admin, /GPSpediaCortesRootFolderId_/);
  assert.match(shared, /getCachedSharedSessionActor_/);
  assert.match(central, /function getCentralConfigurationForService_/);
  assert.match(catalog, /function getCatalogSessionActor_/);
  assert.match(inbox, /runInboxConversationAction_\(/);
  assert.match(utilities, /getCachedSharedSessionActor_/);
});
check("La publicación de código preserva el deployment y limita el alcance", () => {
  assert.match(guide, /Gestionar implementaciones/);
  assert.match(guide, /conservar la URL/);
  assert.match(guide, /No revertir ni redesplegar servicios no relacionados/);
  assert.match(guide, /Cambiar una URL no exige redesplegar Apps Script si el código del servicio no cambió/i);
});
check("Las URLs se mantienen en API_ENDPOINTS y el lector central conserva solo parámetros/recursos", () => {
  assert.match(guide, /API_ENDPOINTS/);
  assert.match(guide, /no la lee ni la escribe para resolver URLs/);
  assert.match(api, /export const API_ENDPOINTS = Object\.freeze/);
  assert.doesNotMatch(auth, /getCentralServiceUrls|updateCentralServiceUrls|endpoint_url/);
  assert.doesNotMatch(central, /Servicios|endpoint_url|routingAvailable/);
});
check("El rollback de URLs restaura el valor local sin tocar Spreadsheet", () => {
  assert.match(guide, /## 9\. Rollback/);
  assert.match(guide, /restaurar la URL anterior en la entrada correspondiente de `API_ENDPOINTS`/i);
  assert.match(guide, /No existe rollback de endpoints mediante/);
});
check("La guía no revive secretos, propiedades ni rutas legacy", () => {
  for (const forbidden of ["GPSpedia_COORDINATOR_URL","GPSpedia_COORDINATOR_SECRET","GPSpedia_SERVICE_URL_","SharedMutationClient.js"])
    assert.equal(guide.includes(forbidden), false, "No debe reintroducir " + forbidden);
  assert.match(guide, /No añadir propiedades de URL, credenciales, tokens, API keys ni secretos compartidos/);
  assert.match(readme, /Services\/DEPLOYMENT_GUIDE\.md/);
  assert.doesNotMatch(readme, /DEPLOYMENT_GUIDE\.md\]\(Olds/);
});
check("La guía separa pruebas GET, validación Beta y límites de autorización", () => {
  assert.match(guide, /read-only/);
  assert.match(guide, /Tareas_Beta\.md/);
  assert.match(guide, /no autoriza despliegues productivos/i);
  assert.match(guide, /no demuestra login, RBAC, escritura, concurrencia ni acceso a Drive\/YouTube/);
});


check("El orden completo es explícito y AUTH precede al enrutamiento de los demás", () => {
  const order = ["AUTH","CATALOG","WRITE","FEEDBACK","UTILITIES","ADMIN"];
  const positions = order.map(service => guide.indexOf("| " + service + " |"));
  assert.ok(positions.every(position => position >= 0));
  assert.ok(positions.every((position, index) => index === 0 || position > positions[index - 1]));
  assert.match(guide, /orden operativo de liberación/i);
  assert.match(guide, /no una cadena de dependencias backend/i);
  assert.match(guide, /no llama a AUTH ni a otros proyectos Apps Script/i);
});
check("Cada proyecto tiene identidad, archivos y pasos funcionales específicos", () => {
  for (const [service, identity] of [["AUTH","GPSpedia-Auth"],["CATALOG","GPSpedia-Catalog"],["WRITE","GPSpedia-Write"],["FEEDBACK","GPSpedia-Feedback"],["UTILITIES","GPSpedia-Utilities"],["ADMIN","GPSpedia-Admin"]]) {
    assert.ok(guide.includes(identity), "Falta identidad " + service);
  }
  for (const file of ["Auth.js","catalog.js","write.js","feedback.js","Utilities.js","admin.js","InboxConversations.js","SharedSessionActor.js","CentralConfigurationReader.js"])
    assert.ok(guide.includes(file), "Falta archivo " + file);
  for (const id of ["BETA-01","BETA-02","BETA-03","BETA-04","BETA-05","BETA-06","BETA-07","MIG-006/MIG-008"])
    assert.ok(guide.includes(id), "Falta prueba " + id);
});
check("La propagación de helpers coincide con los consumidores reales", () => {
  assert.match(guide, /SharedSessionActor\.js.*AUTH, WRITE, FEEDBACK, UTILITIES, ADMIN/);
  assert.match(guide, /CentralConfigurationReader\.js.*AUTH, WRITE, FEEDBACK, ADMIN/);
  assert.match(guide, /InboxConversations\.js.*FEEDBACK/);
  assert.match(catalog, /function getCatalogSessionActor_/);
  assert.doesNotMatch(catalog, /getCachedSharedSessionActor_/);
});
check("La lectura pública de parámetros usa el endpoint AUTH local sin bootstrap separado", () => {
  assert.match(api, /fetch\(resolveApiEndpoint_\("AUTH"\)/);
  assert.match(api, /action: "getPublicConfiguration"/);
  assert.doesNotMatch(api, /CENTRAL_CONFIGURATION_BOOTSTRAP_URL/);
  assert.match(guide, /No existe un bootstrap alternativo/);
  assert.match(guide, /rich_text_mode/);
});
check("La guía protege despliegues parciales y servicios independientes", () => {
  assert.match(guide, /detener únicamente el servicio o grupo/i);
  assert.match(guide, /Los otros servicios independientes pueden continuar/i);
  assert.match(guide, /Si AUTH no supera salud.*detener la secuencia completa/s);
  assert.match(guide, /No desplegar proyectos que no contienen ese archivo/);
});
check("El procedimiento exige contexto Spreadsheet y conserva rollback", () => {
  assert.match(guide, /SpreadsheetApp\.openById\(\)/);
  assert.match(guide, /GPSpediaSpreadsheetId_/);
  assert.match(guide, /GPSpediaCortesRootFolderId_/);
  assert.match(guide, /no añadir propiedades, tokens ni secretos manuales/i);
  assert.match(guide, /## 9\. Rollback/);
  assert.match(guide, /No existe rollback de endpoints mediante/);
  assert.match(schema, /Nota de vigencia.*subesquema `Servicios`/s);
});
check("El health remoto usa API_ENDPOINTS y exige confirmación de Beta aislada", () => {
  assert.match(guide, /GPSPEDIA_HEALTH_ENV=BETA_ISOLATED/);
  assert.match(guide, /GPSPEDIA_CONFIRM_BETA_ENDPOINTS/);
  assert.match(guide, /GET \?debug=true/);
  const health = read("JS/Tests/RemoteServiceHealth.mjs");
  assert.match(health, /parseObject\("API_ENDPOINTS"\)/);
  assert.match(health, /BETA_ISOLATED/);
  assert.doesNotMatch(health, /CENTRAL_CONFIGURATION_BOOTSTRAP_URL/);
});
check("La lista de evidencia registra SHA, versión, URL y resultado por servicio", () => {
  for (const field of ["SHA fuente","Versión Apps Script","Deployment","URL","Salud","Pruebas funcionales","Resultado","Rollback","Evidencia"])
    assert.ok(guide.includes(field), "Falta campo " + field);
});

check("La guía documenta actualización manual local y el editor Developer fue retirado", () => {
  assert.match(guide, /7\.1 Actualizar una URL/);
  assert.match(guide, /API_ENDPOINTS/);
  assert.doesNotMatch(auth, /handleUpdateCentralServiceUrls_|publishCentralConfigurationFromServiceUrlDraft/);
  assert.doesNotMatch(ui, /initializeCentralServiceUrlsControl_/);
  assert.doesNotMatch(api, /callCentralAuthBootstrapAction_/);
  assert.doesNotMatch(html, /central-service-urls-card/);
});
console.log("MIG029DeploymentGuideContract: " + passed + "/16 PASS");
