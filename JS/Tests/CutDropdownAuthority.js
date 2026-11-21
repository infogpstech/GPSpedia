function runCutDropdownAuthorityTests(sources) {
 const results=[];let passed=0,failed=0;const assert=(v,m)=>{if(!v)throw Error(m||"Aserción fallida");};
 const run=(name,fn)=>{try{fn();passed++;results.push({name,status:"PASS"});}catch(e){failed++;results.push({name,status:"FAIL",message:String(e&&e.message||e)});}};
 function getFn(src,name){const start=src.indexOf("function "+name+"(");assert(start>=0,"No se encontró "+name);const open=src.indexOf("{",start);let d=0,q="",esc=false,line=false,block=false;for(let i=open;i<src.length;i++){const c=src[i],nx=src[i+1];if(line){if(c==="\n")line=false;continue;}if(block){if(c==="*"&&nx==="/"){block=false;i++;}continue;}if(q){if(esc)esc=false;else if(c==="\\")esc=true;else if(c===q)q="";continue;}if(c==="/"&&nx==="/"){line=true;i++;continue;}if(c==="/"&&nx==="*"){block=true;i++;continue;}if(c==="'"||c==='"'||c==="\x60"){q=c;continue;}if(c==="{")d++;if(c==="}"&&--d===0)return src.slice(start,i+1);}throw Error("Bloque incompleto "+name);}
 const ui=String(sources.ui||""),catalog=String(sources.catalog||"");
 const normalize=new Function(getFn(ui,"normalizeCutDropdownResponse_")+";return normalizeCutDropdownResponse_;")();
 const allowed=new Function(getFn(ui,"isCutDropdownValueAllowed_")+";return isCutDropdownValueAllowed_;")();
 const handler=getFn(catalog,"handleGetDropdownData");
 const cc={categoria:2,marca:3,tipoEncendido:8,tipoCorte1:12,tipoCorte2:19,tipoCorte3:26},cr={configuracion:2},row=()=>Array(42).fill("");
 const r1=row();r1[11]="Ignición";r1[14]="Relay legado";r1[2]="Marca A";const r2=row();r2[18]="Bomba";r2[21]="Relay legado 2";const r3=row();r3[25]="Botón";r3[28]="Relay legado 3";
 const rel=[["ID","configuracion"],[1,"5 pines NC"],[2,"5 pines NA"],[3,"5 pines NC"]];
 function mock(cuts=[Array(42).fill("header"),r1,r2,r3],relays=rel,missing=""){const sheets={Cortes:{getDataRange:()=>({getValues:()=>cuts}),getRange:()=>({getDataValidation:()=>null})},Relay:{getDataRange:()=>({getValues:()=>relays})}};return new Function("getSpreadsheet","SHEET_NAMES","COLS_CORTES","COLS_RELAY",handler+";return handleGetDropdownData;")(()=>({getSheetByName:n=>missing===n?null:sheets[n]}),{CORTES:"Cortes",RELAY:"Relay"},{...cc},{...cr})();}
 const st=ui.indexOf("function openAddCutForModelModal"),en=ui.indexOf("\nfunction ",st+20),modal=ui.slice(st,en);
 run("tipo desde slot 1",()=>assert(mock().dropdowns.tipoDeCorte.includes("Ignición")));
 run("tipo exclusivo slot 2",()=>assert(mock().dropdowns.tipoDeCorte.includes("Bomba")));
 run("tipo exclusivo slot 3",()=>assert(mock().dropdowns.tipoDeCorte.includes("Botón")));
 run("combina y deduplica slots",()=>assert(mock().dropdowns.tipoDeCorte.length===3));
 run("normaliza y ordena tipos",()=>assert(mock().dropdowns.tipoDeCorte.join("|")==="Bomba|Botón|Ignición"));
 run("relay desde hoja Relay",()=>assert(mock().dropdowns.configRelay.join("|")==="5 pines NA|5 pines NC"));
 run("ignora relays históricos Cortes",()=>assert(!mock().dropdowns.configRelay.includes("Relay legado")));
 run("falta hoja Cortes devuelve error",()=>assert(mock(undefined,rel,"Cortes").status==="error"));
 run("falta hoja Relay devuelve error",()=>assert(mock(undefined,rel,"Relay").status==="error"));
 run("listas vacías se devuelven vacías",()=>{const x=mock([Array(42).fill("h")],[["ID","configuracion"]]);assert(x.status==="success"&&!x.dropdowns.tipoDeCorte.length&&!x.dropdowns.configRelay.length);});
 run("respuesta error rechazada",()=>{let ok=false;try{normalize({status:"error",dropdowns:{}});}catch(e){ok=true;}assert(ok);});
 run("estructura inválida rechazada",()=>{let ok=false;try{normalize({status:"success"});}catch(e){ok=true;}assert(ok);});
 run("tipos vacíos rechazados",()=>{let ok=false;try{normalize({status:"success",dropdowns:{tipoDeCorte:[],configRelay:["Relay"]}});}catch(e){ok=true;}assert(ok);});
 run("relay vacío rechazado",()=>{let ok=false;try{normalize({status:"success",dropdowns:{tipoDeCorte:["No recomendado"],configRelay:[]}});}catch(e){ok=true;}assert(ok);});
 run("elimina duplicados y blancos",()=>{const x=normalize({status:"success",dropdowns:{tipoDeCorte:["Ignición"," ","Ignición"],configRelay:[" NC ","NC"]}});assert(x.tipoDeCorte.length===1&&x.configRelay[0]==="NC");});
 run("coincidencia exacta de tipo",()=>assert(allowed("Ignición",["Ignición"])&&!allowed("ignición",["Ignición"])));
 run("rechaza valor no oficial",()=>assert(!allowed("Inventado",["Ignición"])));
 run("no hay tipos hardcodeados",()=>assert(!modal.includes('value="Bomba de combustible"')&&!modal.includes('value="Ignición"')&&!modal.includes('value="Botón de encendido"')&&!modal.includes('value="No recomendado"')));
 run("no hay fallback relay",()=>assert(!modal.includes("5 pines NC")&&!modal.includes("5 pines NA")&&!modal.includes("Sin relay")&&!modal.includes("Corte a ignición")));
 run("modal llama getDropdownData",()=>assert(modal.includes('routeAction("getDropdownData")')&&modal.includes("normalizeCutDropdownResponse_")));
 run("error bloquea y permite reintentar",()=>assert(modal.includes("cutDropdownsReady = false")&&modal.includes("submitBtn.disabled = true")&&modal.includes('retryDropdownsBtn.style.display = "inline-block"')));
 run("valida antes de snapshot",()=>assert(modal.indexOf("if (!cutDropdownsReady)")<modal.indexOf("offline.saveAddCutPendingOperation(operation)")&&modal.includes("isCutDropdownValueAllowed_(tipoSelect.value")&&modal.includes("isCutDropdownValueAllowed_(relaySelect.value")));
 run("No recomendado no exige relay",()=>assert(modal.includes("relaySelect.required = cutDropdownsReady && !pendingOperation && !isNoRec")&&modal.includes("!isNoRecomendadoValue(tipoSelect.value)")));
 run("No recomendado solo desde lista oficial",()=>assert(!modal.includes('value="No recomendado"')&&modal.includes("populateSelectOptions(tipoSelect, cutDropdownOptions.tipoDeCorte")));
 run("pendiente no agrega relay retirado",()=>assert(!modal.includes("relaySelect.appendChild(option)")&&modal.includes("savedRelay && !isCutDropdownValueAllowed_")));
 run("reintento conserva payload original",()=>assert(modal.includes("cutData: pendingOperation.cutData")&&modal.includes("misma clave")));
 run("no habilita envío antes de revisar pendientes",()=>assert(modal.includes("pendingOperationCheckComplete")&&modal.includes("!pendingOperationCheckComplete || !cutDropdownsReady")));
 run("backend lee tipoCorte1/2/3",()=>assert(handler.includes("tipoCorte1-1")&&handler.includes("tipoCorte2-1")&&handler.includes("tipoCorte3-1")));
 run("backend relay lee columna configuracion",()=>assert(handler.includes("COLS_RELAY.configuracion-1")));
 run("lectura refleja cambios en Sheets",()=>{const r=row();r[18]="Tipo actualizado";const x=mock([Array(42).fill("h"),r],[["ID","configuracion"],[9,"Relay actualizado"]]);assert(x.dropdowns.tipoDeCorte.includes("Tipo actualizado")&&x.dropdowns.configRelay.includes("Relay actualizado"));});
 return {status:failed===0?"PASS":"FAIL",passed,failed,results};
}