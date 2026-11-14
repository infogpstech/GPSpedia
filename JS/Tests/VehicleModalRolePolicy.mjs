import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const ui=readFileSync(resolve(root,"JS/Frontend/ui.js"),"utf8");
const admin=readFileSync(resolve(root,"Services/admin.js"),"utf8");
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
let passed=0;
for(const item of cases){try{item.fn();passed++;console.log("PASS "+item.name);}catch(error){console.error("FAIL "+item.name+": "+(error&&error.message||error));}}
console.log("VehicleModalRolePolicy: "+passed+"/"+cases.length+" PASS");
if(passed!==cases.length)process.exitCode=1;
