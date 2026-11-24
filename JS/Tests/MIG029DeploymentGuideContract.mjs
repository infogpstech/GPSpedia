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
  assert.match(write, /getCentralConfigurationForService_/);
  assert.match(feedback, /getCentralConfigurationForService_/);
  assert.match(admin, /getCentralConfigurationForService_/);
  assert.match(shared, /getCachedSharedSessionActor_/);
  assert.match(central, /function getCentralConfigurationForService_/);
  assert.match(catalog, /function getCatalogSessionActor_/);
  assert.match(inbox, /runInboxConversationAction_\(/);
  assert.match(utilities, /getCachedSharedSessionActor_/);
});
check("La publicación de código preserva el deployment y limita el alcance", () => {
  assert.match(guide, /Gestionar implementaciones/);
  assert.match(guide, /conserva su URL/);
  assert.match(guide, /No actualizar los otros cinco/);
  assert.match(guide, /no es necesario redesplegar el frontend ni los otros cinco servicios/i);
});
check("La nueva URL se publica mediante revisión central íntegra e historial", () => {
  for (const term of ["Servicios","ConfiguracionControl","active_revision","ConfiguracionHistorial","config_revision","publication_state=READY"])
    assert.ok(guide.includes(term), "Falta " + term);
  assert.match(schema, /Flujo de publicación:/);
  assert.match(guide, /conmutación final controlada/);
});
check("El rollback conserva historial y no modifica revisiones publicadas", () => {
  assert.match(guide, /## 6\. Rollback/);
  assert.match(guide, /nueva revisión completa/);
  assert.match(guide, /Nunca editar una revisión ya publicada/);
});
check("La guía no revive secretos, propiedades ni rutas legacy", () => {
  for (const forbidden of ["GPSpedia_COORDINATOR_URL","GPSpedia_COORDINATOR_SECRET","GPSpedia_SERVICE_URL_","SharedMutationClient.js"])
    assert.equal(guide.includes(forbidden), false, "No debe reintroducir " + forbidden);
  assert.match(guide, /No se requieren propiedades de proyecto/);
  assert.match(readme, /Services\/DEPLOYMENT_GUIDE\.md/);
  assert.doesNotMatch(readme, /DEPLOYMENT_GUIDE\.md\]\(Olds/);
});
check("La guía separa pruebas GET, validación Beta y límites de autorización", () => {
  assert.match(guide, /read-only/);
  assert.match(guide, /Tareas_Beta\.md/);
  assert.match(guide, /No se autoriza.*despliegue productivo/s);
  assert.match(guide, /no prueba login, RBAC, escrituras, concurrencia ni acceso a Drive/);
});
console.log("MIG029DeploymentGuideContract: " + passed + "/7 PASS");
