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
check("Las demás acciones administrativas continúan exclusivas de Desarrollador",()=>{
 assert.match(admin,/function assertDeveloperSession\(payload\)\{return getAdminSessionContext_\(payload,\["desarrollador"\]\);\}/);
 assert.match(admin,/ADMIN_MODAL_EDIT_ACTIONS\.has\(action\) \? assertModalEditSession\(payload\) : assertDeveloperSession\(payload\)/);
});
let passed=0;
for(const item of cases){try{item.fn();passed++;console.log("PASS "+item.name);}catch(error){console.error("FAIL "+item.name+": "+(error&&error.message||error));}}
console.log("VehicleModalRolePolicy: "+passed+"/"+cases.length+" PASS");
if(passed!==cases.length)process.exitCode=1;
