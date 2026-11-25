import { readFileSync } from "node:fs";
import { renderActivityLogs } from "../Frontend/activityDashboard.js";
function assert(condition, message) { if (!condition) throw new Error(message || "Aserción fallida."); }
class FakeElement {
    constructor(tagName) { this.tagName = tagName; this.children = []; this.ownerDocument = null; this._textContent = ""; }
    set textContent(value) { this._textContent = String(value); this.children = []; }
    get textContent() { return this._textContent + this.children.map(child => child.textContent).join(""); }
    set innerHTML(_value) { throw new Error("No se debe asignar innerHTML durante el renderizado del dashboard."); }
    setAttribute(name, value) { this.attributes = this.attributes || {}; this.attributes[name] = String(value); }
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
        const cells=container.children[0].children,detailRow=container.children[1];
        assert(container.children.length===2&&cells.length===3,"Fila resumida/columnas incorrectas.");
        assert(cells[1].textContent===p.nombreUsuario&&cells[2].children[0].textContent===p.tipoActividad,"Los campos visibles deben permanecer literales.");
        assert(detailRow.hidden&&detailRow.textContent===p.detalle,"El detalle se conserva como texto en el acordeón cerrado.");
        assert(cells[1].children.length===0&&detailRow.children[0].children[0].children[0].children.length===0,"No se deben crear nodos desde payload.");
    });
    test("Los registros mixtos y valores ausentes no rompen el renderizado",()=>{
        renderActivityLogs(container,[{timestamp:"fecha-inválida",nombreUsuario:null,tipoActividad:7,detalle:false},null],doc);
        assert(container.children.length===4&&container.children[0].children[0].textContent==="—"&&container.children[0].children[1].textContent==="Usuario"&&container.children[0].children[2].children[0].textContent==="7","Fallback incorrecto.");
        assert(container.children[2].children.length===3&&container.children[2].children[1].textContent==="Usuario","Entrada nula incorrecta.");
    });
    test("Una respuesta vacía muestra un estado vacío seguro y limpia filas anteriores",()=>{renderActivityLogs(container,[],doc);assert(container.children.length===1);assert(container.children[0].children[0].textContent==="Todavía no hay actividad registrada.");renderActivityLogs(container,null,doc);assert(container.children.length===1);assert(container.children[0].children[0].textContent==="Todavía no hay actividad registrada.");});
    test("El dashboard usa el renderer seguro y no interpola campos del log en HTML",()=>{
        const ui=readFileSync(new URL("../Frontend/ui.js",import.meta.url),"utf8"),start=ui.indexOf("const openDashboardModal_"),end=ui.indexOf("export async function openDashboard",start);
        assert(start>=0&&end>start,"No se encontró el dashboard.");
        const block=ui.slice(start,end);
        assert(block.includes("renderActivityLogs(logContainer, logs, undefined"),"No usa renderer seguro.");
        assert(!/tr\.innerHTML|\$\{log\.(?:nombreUsuario|tipoActividad|detalle)/.test(block),"Interpolación dinámica insegura.");
    });
    test("recordLike valida sesión y sustituye identidad cliente",()=>{
        const source=readFileSync(new URL("../Services/feedback.js",import.meta.url),"utf8"),permissions=source.match(/const FEEDBACK_ACTION_PERMISSIONS = Object\.freeze\(\{[\s\S]*?\}\);/);
        const start=source.indexOf("function authorizeFeedbackAction_"),end=source.indexOf("function doPostInternal_",start),auth=source.slice(start,end);
        assert(permissions&&/recordLike:\s*null/.test(permissions[0]),"recordLike no está declarado.");
        assert(auth.includes("assertFeedbackSession(source, FEEDBACK_ACTION_PERMISSIONS[action])")&&auth.includes("userId: actor.userId, userName: actor.userName, userRole: actor.role"),"Identidad no derivada.");
    });
    test("La regresión POST directo incluye nombre HTML malicioso y sesión ausente",()=>{
        const source=readFileSync(new URL("./FeedbackWriteSecurity.js",import.meta.url),"utf8");
        assert(source.includes('<img src=x onerror=alert("forged")>')&&source.includes("const missingSession = doPost")&&source.includes('received.userName === "Usuario verificado"'),"Falta regresión de identidad.");
    });
    return {status:failed===0?"PASS":"FAIL",passed,failed,results};
}
const result=runActivityDashboardStoredXssTests();console.log(JSON.stringify(result,null,2));console.log("ActivityDashboardStoredXss: "+result.passed+"/"+(result.passed+result.failed)+" "+result.status);if(result.status!=="PASS")process.exitCode=1;
export { runActivityDashboardStoredXssTests };
