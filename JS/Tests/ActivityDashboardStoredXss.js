import { readFileSync } from "node:fs";
import { renderActivityLogs } from "../../activityDashboard.js";
function assert(condition, message) { if (!condition) throw new Error(message || "Aserción fallida."); }
class FakeElement {
    constructor(tagName) { this.tagName = tagName; this.children = []; this.ownerDocument = null; this._textContent = ""; }
    set textContent(value) { this._textContent = String(value); this.children = []; }
    get textContent() { return this._textContent; }
    set innerHTML(_value) { throw new Error("No se debe asignar innerHTML durante el renderizado del dashboard."); }
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
    replaceChildren(...children) { this.children = []; children.forEach(child => this.appendChild(child)); }
}
class FakeDocument { createElement(tagName) { const e = new FakeElement(tagName); e.ownerDocument = this; return e; } }
function runActivityDashboardStoredXssTests() {
    const results = []; let passed = 0, failed = 0;
    const test = (name, callback) => { try { callback(); passed++; results.push({name,status:"PASS"}); } catch(error) { failed++; results.push({name,status:"FAIL",message:String(error.message||error)}); } };
    const doc = new FakeDocument(), container = doc.createElement("tbody");
    test("Los campos históricos HTML/SVG se conservan como texto literal", () => {
        const p = {nombreUsuario:'<img src=x onerror=alert("user")>',tipoActividad:'<svg onload=alert("type")>',detalle:'</td><script>alert("detail")</script><td>'};
        renderActivityLogs(container,[{timestamp:"2026-11-12T10:00:00Z",...p}],doc);
        const cells=container.children[0].children;
        assert(container.children.length===1&&cells.length===4,"Fila/celdas incorrectas.");
        assert(cells[1].textContent===p.nombreUsuario&&cells[2].textContent===p.tipoActividad&&cells[3].textContent===p.detalle,"Los payloads deben permanecer literales.");
        assert(cells.every(c=>c.children.length===0),"No se deben crear nodos desde payload.");
    });
    test("Los registros mixtos y valores ausentes no rompen el renderizado",()=>{
        renderActivityLogs(container,[{timestamp:"fecha-inválida",nombreUsuario:null,tipoActividad:7,detalle:false},null],doc);
        assert(container.children.length===2&&container.children[0].children[0].textContent===""&&container.children[0].children[2].textContent==="7"&&container.children[0].children[3].textContent==="false","Fallback incorrecto.");
        assert(container.children[1].children.length===4,"Entrada nula incorrecta.");
    });
    test("Una respuesta vacía limpia las filas anteriores",()=>{renderActivityLogs(container,[],doc);assert(container.children.length===0);renderActivityLogs(container,null,doc);assert(container.children.length===0);});
    test("El dashboard usa el renderer seguro y no interpola campos del log en HTML",()=>{
        const ui=readFileSync(new URL("../../ui.js",import.meta.url),"utf8"),start=ui.indexOf("const openDashboardModal_"),end=ui.indexOf("export async function openDashboard",start);
        assert(start>=0&&end>start,"No se encontró el dashboard.");
        const block=ui.slice(start,end);
        assert(block.includes("renderActivityLogs(logContainer, result.data)"),"No usa renderer seguro.");
        assert(!/tr\.innerHTML|\$\{log\.(?:nombreUsuario|tipoActividad|detalle)/.test(block),"Interpolación dinámica insegura.");
    });
    test("recordLike valida sesión y sustituye identidad cliente",()=>{
        const source=readFileSync(new URL("../../Services/feedback.js",import.meta.url),"utf8"),permissions=source.match(/const FEEDBACK_ACTION_PERMISSIONS = Object\.freeze\(\{[\s\S]*?\}\);/);
        const start=source.indexOf("function authorizeFeedbackAction_"),end=source.indexOf("function doPostInternal_",start),auth=source.slice(start,end);
        assert(permissions&&/recordLike:\s*null/.test(permissions[0]),"recordLike no está declarado.");
        assert(auth.includes("assertFeedbackSession(source, FEEDBACK_ACTION_PERMISSIONS[action])")&&auth.includes("userId: actor.userId, userName: actor.userName, userRole: actor.role"),"Identidad no derivada.");
    });
    test("La regresión POST directo incluye nombre HTML malicioso y sesión ausente",()=>{
        const source=readFileSync(new URL("../../Services/Test/FeedbackWriteSecurity.js",import.meta.url),"utf8");
        assert(source.includes('<img src=x onerror=alert("forged")>')&&source.includes("const missingSession = doPost")&&source.includes('received.userName === "Usuario verificado"'),"Falta regresión de identidad.");
    });
    return {status:failed===0?"PASS":"FAIL",passed,failed,results};
}
const result=runActivityDashboardStoredXssTests();console.log(JSON.stringify(result,null,2));if(result.status!=="PASS")process.exitCode=1;
export { runActivityDashboardStoredXssTests };
