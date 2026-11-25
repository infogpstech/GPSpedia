import assert from "node:assert/strict";
import { renderActivityLogs } from "../Frontend/activityDashboard.js";

class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.hidden=false;this.className="";this.ownerDocument=null;this.parentNode=null;}
 set textContent(v){this._text=String(v);this.children=[];}
 get textContent(){return this._text||this.children.map(c=>c.textContent).join("");}
 setAttribute(k,v){this.attributes[k]=String(v);}
 appendChild(c){c.parentNode=this;this.children.push(c);return c;}
 replaceChildren(...items){this.children=[];items.forEach(x=>this.appendChild(x));}
 contains(target){return this===target||this.children.some(c=>c.contains&&c.contains(target));}
 closest(selector){if(selector===".activity-log-toggle"&&this.className==="activity-log-toggle")return this;return this.parentNode&&this.parentNode.closest?this.parentNode.closest(selector):null;}
}
class Doc{
 constructor(){this.listeners=[];}
 createElement(tag){const e=new Element(tag);e.ownerDocument=this;return e;}
 addEventListener(name,handler){if(name==="click")this.listeners.push(handler);}
 removeEventListener(name,handler){if(name==="click")this.listeners=this.listeners.filter(x=>x!==handler);}
 click(target){this.listeners.forEach(fn=>fn({target}));}
}
const doc=new Doc(),container=doc.createElement("tbody");
const entries=[{timestamp:"2026-11-25",nombreUsuario:"A",tipoActividad:"view_vehicle",detalle:"x"},{timestamp:"2026-11-25",nombreUsuario:"B",tipoActividad:"like",detalle:"y"}];
renderActivityLogs(container,entries,doc);
const toggle1=container.children[0].children[2].children[0],detail1=container.children[1];
const toggle2=container.children[2].children[2].children[0],detail2=container.children[3];
toggle1.onclick();assert.equal(detail1.hidden,false);assert.equal(toggle1.attributes["aria-expanded"],"true");
const internal=container.children[0].children[0];doc.click(internal);assert.equal(detail1.hidden,false,"clic interno no debe cerrar");
toggle2.onclick();assert.equal(detail1.hidden,true);assert.equal(detail2.hidden,false);assert.equal(toggle2.attributes["aria-expanded"],"true");
const outside=doc.createElement("div");doc.click(outside);assert.equal(detail2.hidden,true);assert.equal(toggle2.attributes["aria-expanded"],"false");
toggle1.onclick();assert.equal(detail1.hidden,false);
const listenerCount=doc.listeners.length;renderActivityLogs(container,entries,doc);assert.equal(doc.listeners.length,listenerCount,"rerender debe sustituir listener, no duplicarlo");
console.log("ActivityDashboardRecentInteraction: 6/6 PASS — clic interno, exclusividad, cierre externo y listener acotado");
