// Capture and restore the visible state of the shared vehicle/PyS detail modal.
const list = value => Array.from(value || []);
export function captureModalViewState(modal) {
 if (!modal || typeof modal.querySelector !== "function") return null;
 const detail=modal.querySelector("#detalleCompleto")||modal,buttons=list(detail.querySelectorAll(".accordion-btn"));
 const activeIndex=buttons.findIndex(button=>button.classList&&button.classList.contains("active")),active=activeIndex>=0?buttons[activeIndex]:null;
 const tracks=list(detail.querySelectorAll(".pys-models-track, .carousel-track"));
 return {scrollTop:Number(detail.scrollTop)||0,accordion:active?{index:activeIndex,label:String(active.textContent||"").replace(/[▼▲]/g,"").trim()}:null,
 horizontalScrolls:tracks.map((element,index)=>({className:element.classList&&element.classList.contains("pys-models-track")?"pys-models-track":"carousel-track",index,scrollLeft:Number(element.scrollLeft)||0}))};
}
export function restoreModalViewState(modal,snapshot) {
 if(!modal||!snapshot||typeof modal.querySelector!=="function")return{restored:false,accordionRestored:false};
 const detail=modal.querySelector("#detalleCompleto")||modal;
 if(Number.isFinite(Number(snapshot.scrollTop)))detail.scrollTop=Number(snapshot.scrollTop);
 const tracks=list(detail.querySelectorAll(".pys-models-track, .carousel-track"));
 const pendingHorizontalScrolls=[];
 (snapshot.horizontalScrolls||[]).forEach(saved=>{const matches=tracks.filter(el=>el.classList&&el.classList.contains(saved.className));const target=matches[saved.index]||(saved.index<tracks.length?tracks[saved.index]:null);if(target)target.scrollLeft=Number(saved.scrollLeft)||0;else pendingHorizontalScrolls.push(saved);});
 let accordionRestored=!snapshot.accordion;
 if(snapshot.accordion){const buttons=list(detail.querySelectorAll(".accordion-btn")),saved=snapshot.accordion;let button=buttons[saved.index]||null;
  if(button&&saved.label&&String(button.textContent||"").replace(/[▼▲]/g,"").trim()!==saved.label)button=buttons.find(x=>String(x.textContent||"").replace(/[▼▲]/g,"").trim()===saved.label)||null;
  if(button){buttons.forEach(x=>{if(x!==button&&x.classList)x.classList.remove("active");});if(button.classList)button.classList.add("active");const arrow=button.querySelector&&button.querySelector(".accordion-arrow");if(arrow)arrow.textContent="▲";const panel=button.nextElementSibling;if(panel&&panel.classList&&panel.classList.contains("panel-desplegable"))panel.style.maxHeight=panel.scrollHeight+"px";accordionRestored=true;}
 }
 return{restored:true,accordionRestored,pendingHorizontalScrolls};
}

export function shouldRecordModalTransition(targetType,currentType,modalWasVisible,navOptions={}) {
 const origin=navOptions.fromOriginModal;
 return !navOptions._restoreFromStack&&Boolean(modalWasVisible&&currentType&&currentType!==targetType&&origin&&
  (origin.type==="vehicle"||origin.type==="pys")&&origin.item);
}
export function pushModalNavigationContext(stack,origin,viewState) {
 if(!Array.isArray(stack)||!origin||!origin.item||!["vehicle","pys"].includes(origin.type))return false;
 stack.push({type:origin.type,item:origin.item,navOptions:origin.navOptions||{},viewState:viewState||null});
 return true;
}
export function popModalNavigationContext(stack) {
 if(!Array.isArray(stack)||!stack.length)return null;
 const context=stack[stack.length-1];
 if(!context||!context.item||!["vehicle","pys"].includes(context.type))return null;
 return stack.pop();
}
