import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const ui=readFileSync(resolve(root,"JS/Frontend/ui.js"),"utf8");
const admin=readFileSync(resolve(root,"Services/admin.js"),"utf8");
const auth=readFileSync(resolve(root,"Services/Auth.js"),"utf8");
const users=readFileSync(resolve(root,"Services/users.js"),"utf8");
const write=readFileSync(resolve(root,"Services/write.js"),"utf8");
const feedback=readFileSync(resolve(root,"Services/feedback.js"),"utf8");
const inbox=readFileSync(resolve(root,"Services/InboxConversations.js"),"utf8");
const apiConfig=readFileSync(resolve(root,"JS/Frontend/api-config.js"),"utf8");
const cases=[];
function check(name,fn){cases.push({name,fn});}
check("Compartir permanece visible para todos los roles con sesión",()=>{
 const start=ui.indexOf("// Botón Compartir"),end=ui.indexOf("// Imprimir ficha técnica",start);
 assert.ok(start>=0&&end>start);
 const block=ui.slice(start,end);
 assert.match(block,/headerDiv\.appendChild\(shareBtn\)/);
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
 assert.match(admin,/const ADMIN_MODAL_EDIT_ACTIONS = new Set\(\["updateVehicleField","uploadAdminImage","getAdminImageUploadStatus"\]\)/);
 assert.match(admin,/displayRole=role==="desarrollador"\?"Desarrollador":role==="jefe"\?"Jefe":"Supervisor"/);
});
check("El backend acepta Supervisor, Jefe y Desarrollador y rechaza otros roles",()=>{
 const start=admin.indexOf("function getAdminSessionContext_(");
 const end=admin.indexOf("\nfunction assertDeveloperSession",start);
 assert.ok(start>=0&&end>start);
 const deps={
  getSpreadsheet:()=>({
   getSheetByName:name=>name==="ActiveSessions"?{
    getDataRange:()=>({getValues:()=>[[],["U1","user","token",new Date(Date.now()-60000),"",new Date()]]}),
    getRange:()=>({setValue(){}})
   }:name==="Users"?{
    getDataRange:()=>({getValues:()=>[[],["U1","user","hash",globalRole,"","","Test User",""]]})
   }:null
  }),
  getSessionExpirationStatus_:()=>({expired:false}),
  ROLE_REVOCATION_SHARED_PREFIX:"__role_revocation_pending__:"
 };
 let globalRole="Supervisor";
 const api=new Function("getSpreadsheet","getSessionExpirationStatus_","ROLE_REVOCATION_SHARED_PREFIX",
  admin.slice(start,end)+"\n"+admin.slice(admin.indexOf("function assertDeveloperSession",end),admin.indexOf("\nconst ADMIN_MODAL_EDIT_ACTIONS",end))+
  "\nreturn {assertDeveloperSession,assertModalEditSession};"
 )(deps.getSpreadsheet,deps.getSessionExpirationStatus_,deps.ROLE_REVOCATION_SHARED_PREFIX);
 for(const role of ["Desarrollador","Jefe","Supervisor"]){
  globalRole=role;
  assert.equal(api.assertModalEditSession({userId:"U1",sessionToken:"token"}).role,role);
 }
 for(const role of ["Técnico","Gefe","Invitado"]){
  globalRole=role;
  assert.throws(()=>api.assertModalEditSession({userId:"U1",sessionToken:"token"}));
 }
 globalRole="Supervisor";
 assert.throws(()=>api.assertDeveloperSession({userId:"U1",sessionToken:"token"}));
 globalRole="Desarrollador";
 assert.equal(api.assertDeveloperSession({userId:"U1",sessionToken:"token"}).role,"Desarrollador");
});
check("La descarga de imágenes reemplazadas queda exclusiva de Desarrollador en UI y backend",()=>{
 const start=ui.indexOf("const downloadButton = createActionButton('fa-download'");
 const end=ui.indexOf("const moveButton =",start);
 assert.ok(start>=0&&end>start);
 const block=ui.slice(start,end);
 assert.match(block,/normalizeUiRole_\(getUiSessionContext_\(\)\?\.role \|\| ""\) === "desarrollador"/);
 assert.match(block,/if \(canDownloadReplacedImage\) actions\.appendChild\(downloadButton\)/);
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
 assert.deepEqual(allowed,["getAdminImageUploadStatus","updateVehicleField","uploadAdminImage"].sort());
 const actions=["getReplacedImages","recoverReplacedImage","deleteReplacedImage","moveReplacedImage","restoreReplacedImageFromTrash","permanentlyDeleteReplacedImage","markReplacedImageInUse","getReplacedImageDownloadUrl","saveUnusedImagesInventory","organizeUnusedImagesBatch","auditDriveImagesInCortes","createCortesImageFolder","getCortesImageFolders","migrateReplacedImagesSchema"];
 const router=admin.slice(admin.indexOf("function doPostInternal_("));
 actions.forEach(action=>{assert.ok(router.includes("case '"+action+"':"),"acción ausente "+action);assert.equal(allowed.includes(action),false);});
 assert.match(admin,/ADMIN_MODAL_EDIT_ACTIONS\.has\(action\) \? assertModalEditSession\(payload\) : assertDeveloperSession\(payload\)/);
});
check("FEEDBACK conserva permisos separados para aportaciones, moderación y mantenimiento",()=>{
 assert.ok(feedback.includes('recordLike: null'));
 ["reportProblem","addProblem","addSolution","addPrevention","addVehicleToProblem","suggestCutChange","getInboxRecipients","getInboxConversations","getInboxMessages","createInboxConversation","sendInboxMessage","markInboxRead","archiveInboxConversation"].forEach(a=>assert.ok(feedback.includes(a+": null"),a));
 ["removeVehicleFromProblem","updatePysItem","updateTutorialItem","addTutorial","clearActivityLogs"].forEach(a=>assert.ok(feedback.includes(a+': ["Desarrollador"]'),a));
 ["getFeedbackItems","replyToFeedback","markAsResolved","deleteFeedbackItem","getActivityLogs","approveVideo","rejectVideo"].forEach(a=>assert.ok(feedback.includes(a+': ["Desarrollador", "Jefe", "Supervisor"]'),a));
});
check("WRITE acepta los cinco roles activos y restringe el mantenimiento de IDs",()=>{
 assert.ok(write.includes("['desarrollador','jefe','supervisor','tecnico','tecnico_exterior'].includes(role)"));
 assert.ok(write.includes('SUPPLEMENTARY_INFO_ALLOWED_ROLES_ = Object.freeze(["desarrollador", "jefe", "supervisor", "tecnico", "tecnico_exterior"])'));
 const start=write.indexOf("function assertDeveloperForIdMaintenance"),end=write.indexOf("\nfunction ",start+10);
 assert.ok(start>=0&&end>start);assert.ok(write.slice(start,end).includes('role !== "desarrollador"'));
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
check("Inbox admite los cinco roles y limita las consultas de otros roles a Desarrollador",()=>{
 assert.ok(inbox.includes('INBOX_ACTIVE_ROLES_ = new Set(["desarrollador","jefe","supervisor","tecnico","tecnico_exterior"])'));
 assert.ok(inbox.includes('const type = actor.role === "desarrollador" ? "direct" : "developer_consult"'));
 assert.ok(inbox.includes('if (actor.role !== "desarrollador" && recipient.role !== "desarrollador")'));
});
check("El benchmark PBKDF2 permanece exclusivo de Desarrollador",()=>{
 assert.ok(apiConfig.includes('normalizedRole !== "desarrollador"'));
});

let passed=0;
for(const item of cases){try{item.fn();passed++;console.log("PASS "+item.name);}catch(error){console.error("FAIL "+item.name+": "+(error&&error.message||error));}}
console.log("VehicleModalRolePolicy: "+passed+"/"+cases.length+" PASS");
if(passed!==cases.length)process.exitCode=1;
