import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");
const guide = read("Services/DEPLOYMENT_GUIDE.md");
const readme = read("README.md");
const schema = read("ESQUEMA_CONFIGURACION_CENTRAL.md");
const auth = read("JS/Services/Auth.js");
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
  assert.match(guide, /No actualizar los otros cinco/);
  assert.match(guide, /no es necesario redesplegar frontend ni los otros cinco servicios/i);
});
check("La nueva URL se publica mediante revisión central íntegra e historial", () => {
  for (const term of ["Servicios","ConfiguracionControl","active_revision","ConfiguracionHistorial","config_revision","publication_state=READY"])
    assert.ok(guide.includes(term), "Falta " + term);
  assert.match(schema, /Flujo de publicación:/);
  assert.match(guide, /mecanismo controlado aprobado/);
});
check("El rollback conserva historial y no modifica revisiones publicadas", () => {
  assert.match(guide, /## 9\. Rollback/);
  assert.match(guide, /nueva revisión completa/);
  assert.match(guide, /Nunca editar una revisión ya publicada/);
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
check("La publicación conserva la configuración central y trata el bootstrap AUTH como excepción única", () => {
  assert.match(guide, /ConfiguracionControl/);
  assert.match(guide, /ConfiguracionHistorial/);
  assert.match(guide, /active_revision/);
  assert.match(guide, /CENTRAL_CONFIGURATION_BOOTSTRAP_URL/);
  assert.match(guide, /no es necesario redesplegar frontend/i);
  assert.match(guide, /No crear un segundo bootstrap ni un fallback local/);
  assert.match(guide, /conmutar.*active_revision/s);
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
  assert.match(guide, /Nunca editar una revisión ya publicada/);
  assert.match(schema, /Flujo de publicación:/);
});
check("El health workflow solo se ejecuta con bootstrap Beta confirmado", () => {
  assert.match(guide, /CENTRAL_CONFIGURATION_BOOTSTRAP_URL/);
  assert.match(guide, /no tiene selector de entorno/);
  assert.match(guide, /No ejecutarlo si ese bootstrap apunta a producción/);
  assert.match(guide, /GET \?debug=true/);
});
check("La lista de evidencia registra SHA, versión, URL y resultado por servicio", () => {
  for (const field of ["SHA fuente","Versión Apps Script","Deployment","URL","Salud","Pruebas funcionales","Resultado","Rollback","Evidencia"])
    assert.ok(guide.includes(field), "Falta campo " + field);
});

console.log("MIG029DeploymentGuideContract: " + passed + "/15 PASS");
