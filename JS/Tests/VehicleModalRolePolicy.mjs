import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const ui=readFileSync(resolve(root,"JS/Frontend/ui.js"),"utf8");
const admin=readFileSync(resolve(root,"JS/Services/admin.js"),"utf8");
const auth=readFileSync(resolve(root,"JS/Services/Auth.js"),"utf8");
const users=readFileSync(resolve(root,"JS/Services/users.js"),"utf8");
const write=readFileSync(resolve(root,"JS/Services/write.js"),"utf8");
const feedback=readFileSync(resolve(root,"JS/Services/feedback.js"),"utf8");
const inbox=readFileSync(resolve(root,"JS/Services/InboxConversations.js"),"utf8");
const apiConfig=readFileSync(resolve(root,"JS/Frontend/api-config.js"),"utf8");
const cases=[];
function check(name,fn){cases.push({name,fn});}
check("Compartir permanece visible para todos los roles con sesión",()=>{
 const start=ui.indexOf("// Botón Compartir"),end=ui.indexOf("// Imprimir ficha técnica",start);
 assert.ok(start>=0&&end>start);
 const block=ui.slice(start,end);
 assert.match(block,/headerActions\.appendChild\(shareBtn\)/);
  assert.match(ui,/headerDiv\.appendChild\(headerActions\)/);
 assert.doesNotMatch(block,/if\s*\(canPrintOrEditVehicle\)|if\s*\(userRole/);
});
check("Imprimir y editar detalles se limitan a Supervisor, Jefe y Desarrollador",()=>{
 assert.match(ui,/const canPrintOrEditVehicle = \["desarrollador", "jefe", "supervisor"\]\.includes\(userRole\)/);
 assert.match(ui,/if \(canPrintOrEditVehicle\) \{\s*const printBtn/);
 assert.match(ui,/if \(canPrintOrEditVehicle\) \{\s*if \(inEditMode\)/);
 assert.match(ui,/\["desarrollador", "jefe", "supervisor"\]\.includes\(role\) \? context : null/);
});
check("El backend autoriza la edición según el rol vigente, sin confiar en el cliente",()=>{
 assert.match(admin,/function assertModalEditSession\(payload\)\{return getAdminSessionContext_\(payload,\["desarrollador","jefe","supervisor"\]\);\}/);
 assert.match(admin,/const ADMIN_MODAL_EDIT_ACTIONS = new Set\(\["getDropdownData","updateVehicleField","uploadAdminImage","getAdminImageUploadStatus"\]\)/);
 assert.match(admin,/displayRole=role==="desarrollador"\?"Desarrollador":role==="jefe"\?"Jefe":"Supervisor"/);
});
check("El backend consume el actor central y permite editar solo a Supervisor, Jefe y Desarrollador",()=>{
 const start=admin.indexOf("function getAdminSessionContext_(");
 const end=admin.indexOf("/** Consume el actor autenticado por Coordinator",start);
 assert.ok(start>=0&&end>start);
 const helper=admin.slice(start,end);
 const nl=String.fromCharCode(10);
 const api=new Function(helper+nl+
  'function assertDeveloperSession(payload){return getAdminSessionContext_(payload,["desarrollador"]);}'+nl+
  'function assertModalEditSession(payload){return getAdminSessionContext_(payload,["desarrollador","jefe","supervisor"]);}'+nl+
  'return {assertDeveloperSession,assertModalEditSession};')();
 const actor=(role,userId="U1",epoch=1)=>({userId,role:role.toLowerCase(),fullName:"Test User",epoch});
 for(const role of ["Desarrollador","Jefe","Supervisor"]){
  const context=api.assertModalEditSession({userId:"U1",__sharedSessionActor:actor(role)});
  assert.equal(context.role,role);
 }
 for(const role of ["Técnico","Gefe","Invitado"]){
  assert.throws(()=>api.assertModalEditSession({userId:"U1",__sharedSessionActor:actor(role)}));
 }
 assert.throws(()=>api.assertDeveloperSession({userId:"U1",__sharedSessionActor:actor("Supervisor")}));
 assert.equal(api.assertDeveloperSession({userId:"U1",__sharedSessionActor:actor("Desarrollador")}).role,"Desarrollador");
 assert.throws(()=>api.assertModalEditSession({userId:"U1"}));
 assert.throws(()=>api.assertModalEditSession({userId:"U2",__sharedSessionActor:actor("Supervisor")}));
 assert.throws(()=>api.assertModalEditSession({userId:"U1",__sharedSessionActor:actor("Supervisor","U1",0)}));
});
check("La descarga de imágenes reemplazadas queda exclusiva de Desarrollador en UI y backend",()=>{
 const start=ui.indexOf("function getReplacedImageCapabilities_");
 const end=ui.indexOf("\n}\n",start)+2;
 assert.ok(start>=0&&end>start);
 const getCapabilities=new Function(ui.slice(start,end)+";return getReplacedImageCapabilities_;")();
 const item={tipo_registro:"reemplazada",estado:"historica",active_reference_count:0};
 assert.equal(getCapabilities(item,true,"verified","Desarrollador").canDownload,true);
 assert.equal(getCapabilities(item,true,"verified","Tecnico").canDownload,false);
 assert.match(ui,/if \(capabilities\.canDownload\) addMenuAction\("fa-download"/);
 assert.doesNotMatch(admin,/const ADMIN_MODAL_EDIT_ACTIONS = new Set\([^;]*getReplacedImageDownloadUrl/);
 assert.match(admin,/case 'getReplacedImageDownloadUrl':/);
 assert.match(admin,/ADMIN_MODAL_EDIT_ACTIONS\.has\(action\) \? assertModalEditSession\(payload\) : assertDeveloperSession\(payload\)/);
});
check("Las demás acciones administrativas continúan exclusivas de Desarrollador",()=>{
 assert.match(admin,/function assertDeveloperSession\(payload\)\{return getAdminSessionContext_\(payload,\["desarrollador"\]\);\}/);
 assert.match(admin,/ADMIN_MODAL_EDIT_ACTIONS\.has\(action\) \? assertModalEditSession\(payload\) : assertDeveloperSession\(payload\)/);
});

check("El gestor de imágenes ADMIN queda reservado a Desarrollador salvo las tres acciones del modal",()=>{
 const modal=admin.match(/const ADMIN_MODAL_EDIT_ACTIONS = new Set\(\[([^\]]+)\]\)/);
 assert.ok(modal);
 const allowed=[...modal[1].matchAll(/"([^"]+)"/g)].map(m=>m[1]).sort();
 assert.deepEqual(allowed,["getAdminImageUploadStatus","getDropdownData","updateVehicleField","uploadAdminImage"].sort());
 const router=admin.slice(admin.indexOf("function doPostInternal_("));
 const routed=[...router.matchAll(/case ['"]([^'"]+)['"]:/g)].map(match=>match[1]);
 const imageActions=["normalizeImages","organizePrimaryVehicleImages","restoreAllTrashedImages","addLogo","getReplacedImages","migrateReplacedImagesSchema","getDriveStorage","recoverReplacedImage","deleteReplacedImage","restoreReplacedImageFromTrash","permanentlyDeleteReplacedImage","markReplacedImageInUse","auditDriveImagesInCortes","saveUnusedImagesInventory","getCortesImageFolders","createCortesImageFolder","moveReplacedImage","getReplacedImageDownloadUrl"];
 imageActions.forEach(action=>assert.ok(routed.includes(action),"acción de imagen ausente: "+action));
 assert.match(admin,/ADMIN_MODAL_EDIT_ACTIONS\.has\(action\) \? assertModalEditSession\(payload\) : assertDeveloperSession\(payload\)/);
});
check("FEEDBACK conserva permisos separados para aportaciones, moderación y mantenimiento",()=>{
 assert.ok(feedback.includes('recordLike: null'));
 ["reportProblem","addProblem","addSolution","addPrevention","addVehicleToProblem","suggestCutChange","getInboxRecipients","getInboxConversations","getInboxMessages","createInboxConversation","sendInboxMessage","markInboxRead","archiveInboxConversation"].forEach(a=>assert.ok(feedback.includes(a+": null"),a));
 ["removeVehicleFromProblem","updatePysItem","updateTutorialItem","addTutorial","clearActivityLogs"].forEach(a=>assert.ok(feedback.includes(a+': ["Desarrollador"]'),a));
 ["getFeedbackItems","replyToFeedback","markAsResolved","deleteFeedbackItem","getActivityLogs"].forEach(a=>assert.ok(feedback.includes(a+': ["Desarrollador", "Jefe", "Supervisor"]'),a));
 ["approveVideo","rejectVideo"].forEach(a=>assert.ok(feedback.includes(a+': ["Desarrollador"]'),a));
});
check("WRITE acepta los cinco roles activos y restringe el mantenimiento de IDs",()=>{
 assert.ok(write.includes("['desarrollador','jefe','supervisor','tecnico','tecnico_exterior'].includes(role)"));
 assert.ok(write.includes('SUPPLEMENTARY_INFO_ALLOWED_ROLES_ = Object.freeze(["desarrollador", "jefe", "supervisor", "tecnico", "tecnico_exterior"])'));
 const start=write.indexOf("function assertDeveloperForIdMaintenance"),end=write.indexOf("\nfunction ",start+10);
 assert.ok(start>=0&&end>start);assert.ok(write.slice(start,end).includes('getAuthenticatedCollaborator(payload, ["desarrollador"])'));
 assert.doesNotMatch(write.slice(start,end),/getDataRange\(\)|getSpreadsheet\(\)/);
});
check("AUTH y USERS conservan jerarquía coherente para crear, modificar y eliminar cuentas",()=>{
 assert.ok(users.includes("'Desarrollador': ['Desarrollador', 'Jefe', 'Supervisor', 'Tecnico', 'Tecnico_exterior']"));
 assert.ok(users.includes("'Jefe': ['Supervisor', 'Tecnico']"));
 assert.ok(users.includes("'Supervisor': ['Tecnico']"));
 assert.ok(users.includes("if (requesterRole === 'Jefe') return ['Supervisor', 'Tecnico'].includes(role)"));
 assert.ok(users.includes("if (requesterRole === 'Supervisor') return role === 'Tecnico'"));
 assert.ok(auth.includes("jefe: role => ['supervisor', 'tecnico'].includes(role)"));
 assert.ok(auth.includes("supervisor: role => role === 'tecnico'"));
 assert.ok(auth.includes("if (alreadyDeleted && requesterRole !== 'desarrollador')"));
});
check("Inbox admite los cinco roles y aplica la jerarquía de mensajes ordinarios",()=>{
 assert.ok(inbox.includes('INBOX_ACTIVE_ROLES_ = new Set(["desarrollador","jefe","supervisor","tecnico","tecnico_exterior"])'));
 assert.ok(inbox.includes('const INBOX_RECIPIENT_ROLE_POLICY_ = Object.freeze({'));
 assert.ok(inbox.includes('jefe: new Set(["supervisor","tecnico","tecnico_exterior"])'));
 assert.ok(inbox.includes('supervisor: new Set(["jefe"])'));
 assert.ok(inbox.includes('tecnico: new Set(["supervisor"])'));
 assert.ok(inbox.includes('tecnico_exterior: new Set(["supervisor"])'));
 assert.ok(inbox.includes('const type = "direct";'));
 assert.ok(inbox.includes('inboxAssertRecipientAllowed_(actor, recipient)'));
 assert.doesNotMatch(inbox,/developer_consult/);
});
check("El benchmark PBKDF2 permanece exclusivo de Desarrollador",()=>{
 assert.ok(apiConfig.includes('normalizedRole !== "desarrollador"'));
});

let passed=0;
for(const item of cases){try{item.fn();passed++;console.log("PASS "+item.name);}catch(error){console.error("FAIL "+item.name+": "+(error&&error.message||error));}}
console.log("VehicleModalRolePolicy: "+passed+"/"+cases.length+" PASS");
if(passed!==cases.length)process.exitCode=1;

check("Activar edición no espera a IndexedDB para cargar operaciones de imagen",()=>{
 const start=ui.indexOf("const pendingImagesPromise = loadPendingAdminImageUploads");
 const render=ui.indexOf("mostrarDetalleModal(editedItemBuffer, true, navOptions)",start);
 const wait=ui.indexOf("await loadPendingAdminImageUploads",start);
 assert.ok(start>=0&&render>start,"El modo edición debe renderizar después de iniciar la lectura opcional.");
 assert.equal(wait,-1,"El modo edición no debe esperar IndexedDB.");
 assert.match(ui,/if \(!pendingAdminImageUploadsLoaded\.has\(ownerVehicleKey\)\) \{\s*showSavingIndicator\("error"/);
});
check("Las opciones de edición se precargan al abrir el detalle y comparten una sola solicitud",()=>{
 assert.match(ui,/let dropdownOptionsPromise = null/);
 assert.match(ui,/if \(!dropdownOptions && !dropdownOptionsPromise\) precargarDropdownOptions\(\)\.catch/);
 assert.match(ui,/if \(dropdownOptionsPromise\) return dropdownOptionsPromise/);
});
