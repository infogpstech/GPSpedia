import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const apiSource = readFileSync(new URL("../../api-config.js", import.meta.url), "utf8");
const uiSource = readFileSync(new URL("../../ui.js", import.meta.url), "utf8");
const helperMatch = apiSource.match(/function createRouteActionError_\([\s\S]*?\n\}/);
const routeMatch = apiSource.match(/export async function routeAction\([\s\S]*?\n\}/);
assert.ok(helperMatch, "No se encontró createRouteActionError_.");
assert.ok(routeMatch, "No se encontró routeAction.");
assert.ok(apiSource.includes('throw createRouteActionError_("La sesión no es válida o ha expirado.",{kind:"application",code:"SESSION_INVALID",httpStatus:null});'));
const routeSource = routeMatch[0].replace("export async function", "async function");
const metrics = [];
function buildRouteAction(fetchImpl, touchSession = async () => {}) {
    metrics.length = 0;
    return new Function("ACTION_TO_SERVICE_MAP","API_ENDPOINTS","ensureSessionTouched_","recordServiceMetric","fetch",
        helperMatch[0] + "\n" + routeSource + "\nreturn routeAction;")(
        { testAction:"TEST" }, { TEST:"https://test.invalid/exec" }, touchSession, event=>metrics.push(event), fetchImpl
    );
}
function response(status, body, ok = status >= 200 && status < 300) {
    return { status, statusText: status===401?"Unauthorized":status===403?"Forbidden":status===404?"Not Found":status===500?"Internal Server Error":"OK",
        ok, text:async()=>body };
}
let passed=0;
async function check(name,fn){await fn();passed++;console.log("PASS "+name);}
async function expectError(fetchImpl,options,expected){
    const action=buildRouteAction(fetchImpl);
    await assert.rejects(action("testAction",{},null,options||{}),error=>{
        assert.equal(error.kind,expected.kind);assert.equal(error.code,expected.code);
        assert.equal(error.httpStatus,expected.httpStatus);assert.equal(error.hasHttpResponse,expected.httpStatus!==null);
        if(expected.status===undefined)assert.equal(error.status,undefined);else assert.equal(error.status,expected.status);
        if(expected.messageIncludes)assert.ok(error.message.includes(expected.messageIncludes));
        return true;
    });
    assert.equal(metrics.length,1);assert.equal(metrics[0].outcome,expected.outcome);
    assert.equal(metrics[0].httpStatus,expected.httpStatus);
}
await check("Propaga HTTP 401/403/404/500 sin sustituir el código",async()=>{
    for(const status of [401,403,404,500])await expectError(async()=>response(status,"",false),{},{
        kind:"http",code:"HTTP_ERROR",httpStatus:status,status,outcome:"http_error"});
});
await check("Distingue una falla de red sin respuesta HTTP",async()=>{
    await expectError(async()=>{throw new TypeError("Failed to fetch");},{},{
        kind:"network",code:"NETWORK_ERROR",httpStatus:null,outcome:"network_error",messageIncludes:"No se recibió respuesta"});
});
await check("Distingue cancelación/timeout sin inventar status",async()=>{
    const abort=new Error("The operation was aborted");abort.name="AbortError";
    await expectError(async()=>{throw abort;},{signal:{aborted:true}},{
        kind:"abort",code:"REQUEST_ABORTED",httpStatus:null,outcome:"network_error",messageIncludes:"tiempo de espera"});
});
await check("Conserva el status HTTP al recibir JSON inválido",async()=>{
    await expectError(async()=>response(200,"{invalid"),{},{
        kind:"invalid_response",code:"INVALID_JSON",httpStatus:200,outcome:"invalid_response"});
});
await check("Clasifica errores de lectura del cuerpo conservando el status recibido",async()=>{
    await expectError(async()=>({status:200,statusText:"OK",ok:true,text:async()=>{throw new Error("stream reset");}}),{},{
        kind:"invalid_response",code:"RESPONSE_READ_ERROR",httpStatus:200,outcome:"invalid_response"});
});
await check("No inventa status cuando fetch no entrega un objeto Response",async()=>{
    await expectError(async()=>undefined,{},{
        kind:"network",code:"NO_HTTP_RESPONSE",httpStatus:null,outcome:"network_error"});
});
await check("Distingue status:error de aplicación con HTTP 200",async()=>{
    await expectError(async()=>response(200,JSON.stringify({status:"error",code:"FORBIDDEN",message:"Acceso denegado",details:{errorMessage:"Rol insuficiente"}})),{},{
        kind:"application",code:"FORBIDDEN",httpStatus:200,outcome:"api_error",messageIncludes:"Rol insuficiente"});
});
await check("Rechaza arrays como respuesta JSON de API",async()=>{
    await expectError(async()=>response(200,"[]"),{},{
        kind:"invalid_response",code:"INVALID_RESPONSE",httpStatus:200,outcome:"invalid_response"});
});
await check("Clasifica la sesión rechazada antes de ejecutar la acción",async()=>{
    const sessionError=new Error("La sesión no es válida o ha expirado.");
    Object.assign(sessionError,{kind:"application",code:"SESSION_INVALID",httpStatus:null});
    const action=buildRouteAction(async()=>{throw new Error("No debe enviar la acción.");},async()=>{throw sessionError;});
    await assert.rejects(action("testAction",{sessionToken:"token"}),error=>error.code==="SESSION_INVALID");
    assert.equal(metrics[0].outcome,"api_error");assert.equal(metrics[0].httpStatus,null);
});
await check("Devuelve intacta una respuesta válida y registra éxito",async()=>{
    const action=buildRouteAction(async()=>response(200,JSON.stringify({status:"success",value:7})));
    assert.deepEqual(await action("testAction",{}),{status:"success",value:7});
    assert.equal(metrics[0].outcome,"success");assert.equal(metrics[0].httpStatus,200);
});
await check("La consola ADMIN diferencia HTTP, red, timeout y aplicación",async()=>{
    assert.ok(uiSource.includes("function describeAdminActionError_(error)"));
    assert.ok(uiSource.includes('http: "Error HTTP"'));
    assert.ok(uiSource.includes('network: "Fallo de red"'));
    assert.ok(uiSource.includes('abort: "Solicitud cancelada o tiempo de espera agotado"'));
    assert.ok(uiSource.includes('invalid_response: "Respuesta inválida"'));
    assert.ok(uiSource.includes('application: "Error de aplicación"'));
    assert.ok(uiSource.includes("httpCode: httpStatus === null"));
});
const runStart=uiSource.indexOf("async function runAction(action, payload = {})");
const runEnd=uiSource.indexOf("// --- NAVEGACIÓN Y COMANDOS DE TERMINAL DRIVE",runStart);
assert.ok(runStart>=0&&runEnd>runStart,"No se pudo delimitar runAction.");
const runSource=uiSource.slice(runStart,runEnd);
await check("Las rutas individual y por lotes usan status estructurado y no fuerzan HTTP 500",async()=>{
    assert.equal((runSource.match(/describeAdminActionError_\(error\)/g)||[]).length,2);
    assert.match(runSource,/Código HTTP:\n\$\{errorInfo\.httpCode\}/);
    assert.doesNotMatch(runSource,/Código HTTP:\n500/);
    assert.doesNotMatch(runSource,/error\.message\.includes\('500'\)\s*\?/);
    assert.match(runSource,/errorInfo\.kind === "invalid_response"/);
    assert.match(runSource,/errorInfo\.kind === "application"/);
});
console.log("RouteActionErrors: "+passed+"/"+passed+" PASS");
