import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const ui=readFileSync("JS/Frontend/ui.js","utf8"), upload=readFileSync("JS/Frontend/youtubeUpload.js","utf8");
const api=readFileSync("JS/Frontend/api-config.js","utf8"), feedback=readFileSync("JS/Services/feedback.js","utf8");
let passed=0;
function test(name,fn){fn();passed++;console.log("PASS",name);}
function payloads(source,action){
 const pattern=new RegExp("routeAction\\(\\s*['\"]"+action+"['\"]\\s*,\\s*\\{([\\s\\S]*?)\\}\\s*\\)","g");
 return [...source.matchAll(pattern)].map(match=>match[1]);
}
test("call-sites FEEDBACK de asociación/edición envían userId y SessionToken",()=>{
 for(const action of ["addVehicleToProblem","removeVehicleFromProblem","updatePysItem","updateTutorialItem"]){
  const calls=payloads(ui,action);assert.ok(calls.length>0,"No se encontró "+action);
  for(const body of calls)assert.match(body,/getSessionPayload_\(\)/,action+" omite sesión");
 }
});
test("roles de aprobación y edición no se envían como autoridad del navegador",()=>{
 for(const action of ["removeVehicleFromProblem","updatePysItem"])
  for(const body of payloads(ui,action))assert.doesNotMatch(body,/\buserRole\b/);
 const approve=api.slice(api.indexOf("export async function approveVideo"),api.indexOf("export async function rejectVideo"));
 const reject=api.slice(api.indexOf("export async function rejectVideo"),api.indexOf("export async function getRichTextMode"));
 assert.doesNotMatch(approve,/routeAction\("approveVideo", \{[^}]*userRole/);
 assert.doesNotMatch(reject,/routeAction\("rejectVideo", \{[^}]*userRole/);
});
test("YouTube usa ID/SessionToken canónicos y valida sesión antes de subir",()=>{
 assert.match(upload,/userSnapshot\s*&&\s*userSnapshot\.ID/);
 assert.match(upload,/userSnapshot\s*&&\s*userSnapshot\.SessionToken/);
 assert.doesNotMatch(upload,/currentUser\s*&&\s*currentUser\.id\b/);
 const validate=upload.indexOf('routeAction("validateSession", { userId, sessionToken })');
 const init=upload.indexOf('routeAction("initYouTubeUpload"'), submit=upload.indexOf('routeAction("submitVideoForApproval"');
 assert.ok(validate>=0&&init>validate&&submit>init);
});
test("opVideoId y videoId real permanecen separados",()=>{
 assert.match(upload,/let opVideoId = operationContext\.opVideoId/);
 assert.match(upload,/opVideoId,\s*title: uploadRecord\.title/);
 assert.match(upload,/videoId: finalVideoId, videoUrl/);
 assert.match(upload,/uploadRecord\.videoId = finalVideoId/);
});
test("FEEDBACK autentica init, recuperación y envío con matriz servidor",()=>{
 const map=feedback.slice(feedback.indexOf("const FEEDBACK_ACTION_PERMISSIONS"),feedback.indexOf("const FEEDBACK_PUBLIC_ACTIONS"));
 for(const action of ["initYouTubeUpload","getVideoApprovalByOperation","submitVideoForApproval"])assert.match(map,new RegExp(action+": null"));
 assert.match(feedback,/const actor = assertFeedbackSession\(source, FEEDBACK_ACTION_PERMISSIONS\[action\]\)/);
 assert.match(feedback,/userRole: actor\.role/);
});
test("submit comparte ScriptLock con approve/reject",()=>{
 const start=feedback.indexOf("function handleSubmitVideoForApproval(payload)");
 const end=feedback.indexOf("\nfunction ",start+20);
 assert.match(feedback.slice(start,end),/withVideoApprovalMutationLock_/);
});
test("Feedbacks confirma aprobación antes de publicar el destino",()=>{
 const start=feedback.indexOf("function handleApproveVideoUnlocked_(payload)");
 const end=feedback.indexOf("\n\n/**\n * Rechaza",start);
 const body=feedback.slice(start,end);
 const write=body.indexOf('JSON.stringify(videoData), "approved"');
 const publish=body.indexOf("publishApprovedVideo_(savedPayload)");
 assert.ok(write>=0&&publish>write&&body.indexOf("SpreadsheetApp.flush()",write)<publish);
});
test("openAddVideoModal no ofrece enlace manual ni campos arbitrarios",()=>{
 const start=ui.indexOf("export function openAddVideoModal(item)");
 const end=ui.indexOf("\n/* TAREA",start);
 const body=ui.slice(start,end);
 assert.ok(body.includes("openYouTubeUploadModal"));
 assert.doesNotMatch(body,/fieldName|fieldValue|addSupplementaryInfo/);
});
test("PyS y Tutorial bloquean cambios directos de URL",()=>{
 const pys=feedback.slice(feedback.indexOf("function handleUpdatePysItem(payload)"),feedback.indexOf("function handleUpdateTutorialItem(payload)"));
 const start=feedback.indexOf("function handleUpdateTutorialItem(payload)");
 const tutorial=feedback.slice(start,feedback.indexOf("function ",start+20));
 assert.match(pys,/solo puede cambiarse mediante una solicitud de aprobación/);
 assert.match(tutorial,/solo puede cambiarse mediante una solicitud de aprobación/);
});
test("alta PyS y Tutorial exige ID de operación y rechaza enlaces directos",()=>{
 const tutorialStart=feedback.indexOf("function handleAddTutorial(payload)");
 const tutorialEnd=feedback.indexOf("\nfunction ",tutorialStart+20);
 const tutorial=feedback.slice(tutorialStart,tutorialEnd);
 assert.match(tutorial,/source\.operationId/);
 assert.match(tutorial,/source\.videoUrl/);
 assert.match(tutorial,/no se aceptan enlaces directos/);
 const pysStart=feedback.indexOf("function handleAddProblem(source)");
 const pysEnd=feedback.indexOf("\nfunction ",pysStart+20);
 const pys=feedback.slice(pysStart,pysEnd);
 assert.match(pys,/source\.opId/);
 assert.match(pys,/source\.videoUrl/);
 assert.match(pys,/no se aceptan enlaces directos/);
});
console.log("VideoApprovalClientContract: "+passed+"/"+passed+" PASS");
