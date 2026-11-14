function runUtilitiesSecurityTests(){
 const results=[];let passed=0,failed=0;
 function test_(name,fn){try{fn();passed++;results.push({name,status:"PASS"});}catch(e){failed++;results.push({name,status:"FAIL",message:String(e.message||e)});}}
 function assert_(ok,msg){if(!ok)throw Error(msg||"Aserción fallida.");}
 function harness_(o){
  o=o||{};const sheets={};
  class Range{
   constructor(s,r,c,n,m){Object.assign(this,{s,r,c,n:n||1,m:m||1});}
   getValues(){return Array.from({length:this.n},(_,i)=>Array.from({length:this.m},(_,j)=>this.s.v[this.r-1+i]?.[this.c-1+j]??""));}
   setValues(vs){if(this.s.failSet)throw Error("staging write failed");vs.forEach((row,i)=>row.forEach((v,j)=>{while(this.s.v.length<=this.r-1+i)this.s.v.push([]);const a=this.s.v[this.r-1+i];while(a.length<=this.c-1+j)a.push("");a[this.c-1+j]=v;}));return this;}
   setValue(v){return this.setValues([[v]]);}
  }
  class Sheet{
   constructor(n,v){this.n=n;this.v=(v||[]).map(r=>r.slice());this.failSet=false;this.failRename=false;this.failCopy=false;}
   getName(){return this.n;}
   setName(n){if(n==="Hoja 1"&&this.failRename)throw Error("promotion failed");if(sheets[n]&&sheets[n]!==this)throw Error("duplicate name");delete sheets[this.n];this.n=n;sheets[n]=this;return this;}
   getLastRow(){for(let i=this.v.length-1;i>=0;i--)if(this.v[i].some(x=>x!==""&&x!=null))return i+1;return 0;}
   getRange(r,c,n,m){return new Range(this,r,c,n,m);}
   getDataRange(){return new Range(this,1,1,Math.max(1,this.getLastRow()),Math.max(1,...this.v.map(r=>r.length)));}
   clearContents(){this.v=[];}getMaxRows(){return Math.max(100,this.v.length);}insertRowsAfter(){}
   copyTo(){if(this.failCopy)throw Error("incompatible target");const x=new Sheet("Copy of "+this.n,this.v);sheets[x.n]=x;return x;}
  }
  const ss={getSheetByName:n=>sheets[n]||null,insertSheet:n=>{if(sheets[n])throw Error("duplicate");const x=new Sheet(n);sheets[n]=x;return x;},deleteSheet:s=>{delete sheets[s.getName()];},add:(n,v)=>{const x=new Sheet(n,v);sheets[n]=x;return x;}};
  const src=ss.add("Cortes",[["id","a","b","c","d","e","f","g","imagen"],["1","","","","","","","","https://drive.google.com/file/d/FILE_1234567890/view"],["2","","","","","","","",""]]);
  const dst=ss.add("Hoja 1",[["old timestamp"],["old data"]]),date=new Date(Date.now()-3600000);
  ss.add("ActiveSessions",[["ID","Usuario","Token","date","Logs","LastActivityAt"],["USR-1","dev","TOKEN-1",date,"",date]]);
  const users=ss.add("Users",[["ID","Username","Password","Privilegios","Phone","Email","FullName","SessionToken"],["USR-1","dev","hash","Desarrollador","","","Developer Name",""]]);
  const state={busy:!!o.lockBusy,released:0,held:false,concurrentAttempted:false,concurrentResult:null,sharedAcquires:0,sharedReleases:0,sharedHeld:false,sharedRequests:[],events:[]},lock={waitLock(){state.events.push("local-lock-wait");if(state.busy||state.held)throw Error("lock timeout");state.held=true;state.events.push("local-lock-acquired");},releaseLock(){state.held=false;state.released++;state.events.push("local-lock-released");}};
  ContentService={MimeType:{JSON:"application/json"},createTextOutput:x=>({content:x,setMimeType(){return this;}})};
  SpreadsheetApp={openById:()=>ss};LockService={getScriptLock:()=>lock};DriveApp={getFileById:()=>({getDateCreated:()=>new Date("2024-01-02T00:00:00Z")})};
  Utilities={formatDate:()=>"02/01/2024",getUuid:()=>"12345678-1234-4234-8234-123456789012"};Session={getScriptTimeZone:()=>"UTC"};DriveApp={getFileById:()=>{if(o.concurrent&&!state.concurrentAttempted){state.concurrentAttempted=true;state.concurrentResult=JSON.parse(doPost({postData:{contents:JSON.stringify({action:"migrateTimestamps",payload:{userId:"USR-1",sessionToken:"TOKEN-1"}})}}).content);}return{getDateCreated:()=>new Date("2024-01-02T00:00:00Z")};}};PropertiesService={getScriptProperties:()=>({getProperty:key=>key==="GPSpedia_COORDINATOR_URL"?(o.coordinatorMissing?"":"https://script.google.com/macros/s/TEST_COORDINATOR/exec"):key==="GPSpedia_COORDINATOR_SECRET"?(o.coordinatorMissing?"":"T".repeat(40)):null})};Logger={log:()=>{}};UrlFetchApp={fetch:(url,options)=>{const request=JSON.parse(options.payload);state.sharedRequests.push(request);state.events.push("shared-"+request.action);const response=(status,body)=>({getResponseCode:()=>status,getContentText:()=>JSON.stringify(body)});if(request.action==="acquire"){if(o.leaseBusy||state.sharedHeld)return response(409,{status:"error",message:"Lease ocupada."});state.sharedHeld=true;state.sharedAcquires++;return response(200,{status:"success",token:"U".repeat(40)});}if(request.action==="release"){state.sharedHeld=false;state.sharedReleases++;return response(200,{status:"success"});}return response(200,{status:"success",valid:true});}};
  if(o.role)users.v[1][3]=o.role;if(o.revocation)users.v[1][7]="__role_revocation_pending__:USR-1";
  if(o.expired)ss.getSheetByName("ActiveSessions").v[1][3]=new Date("2020-01-01T00:00:00Z");
  if(o.duplicate)ss.getSheetByName("ActiveSessions").v.push(ss.getSheetByName("ActiveSessions").v[1].slice());
  if(o.empty)src.v=[["id","a","b","c","d","e","f","g","imagen"]];
  if(o.incompatible)dst.failCopy=true;
  if(o.sourceReadFail)src.getRange=()=>({getValues(){throw Error("source snapshot failed");}});
  if(o.backupMismatch){const get=dst.getDataRange.bind(dst);let calls=0;dst.getDataRange=()=>{calls++;const range=get();if(calls===2){const values=range.getValues();values[0][0]="tampered snapshot";return{getValues:()=>values};}return range;};}
  if(o.promoteFail){const copy=dst.copyTo.bind(dst);dst.copyTo=()=>{const x=copy();x.failRename=true;return x;};}
  return{ss,src,dst,state,request:{action:"migrateTimestamps",payload:{userId:"USR-1",sessionToken:"TOKEN-1"}}};
 }
 function run_(h,req){return JSON.parse(doPost({postData:{contents:JSON.stringify(req||h.request)}}).content);}
 test_("POST sin sesión se rechaza y conserva destino/libera lock",()=>{const h=harness_(),old=JSON.stringify(h.dst.v),r=run_(h,{action:"migrateTimestamps",payload:{}});assert_(r.status==="error"&&JSON.stringify(h.dst.v)===old&&h.state.released===1&&!h.state.held&&h.state.sharedReleases===1&&!h.state.sharedHeld);});
 test_("Rol no Desarrollador se rechaza",()=>{const h=harness_({role:"Tecnico"}),r=run_(h);assert_(r.status==="error"&&h.dst.v[0][0]==="old timestamp");});
 test_("Sesión duplicada, expirada o revocada falla cerrada",()=>{[{duplicate:true},{expired:true},{revocation:true}].forEach(o=>{const h=harness_(o),r=run_(h);assert_(r.status==="error"&&h.dst.v[0][0]==="old timestamp");});});
 test_("La sesión válida actualiza LastActivityAt antes de ejecutar la migración",()=>{const h=harness_(),sessions=h.ss.getSheetByName("ActiveSessions");sessions.v[1][5]=new Date(Date.now()-2*24*60*60*1000);const before=sessions.v[1][5].getTime(),r=run_(h),after=new Date(sessions.v[1][5]).getTime();assert_(r.status==="success"&&after>before);});
 test_("Una sesión no autorizada no renueva LastActivityAt",()=>{const h=harness_({role:"Tecnico"}),sessions=h.ss.getSheetByName("ActiveSessions");sessions.v[1][5]=new Date(Date.now()-2*24*60*60*1000);const before=sessions.v[1][5].getTime(),r=run_(h);assert_(r.status==="error"&&sessions.v[1][5].getTime()===before);});
 test_("POST válido verifica staging y promueve resultado",()=>{const h=harness_(),r=run_(h),t=h.ss.getSheetByName("Hoja 1");assert_(r.status==="success"&&r.rowsProcessed===2);assert_(JSON.stringify(t.getRange(1,1,3,1).getValues())==='[["timestamp"],["02/01/2024"],["SIN_URL"]]');assert_(!h.ss.getSheetByName("__utilities_timestamps_backup__")&&h.state.released===1&&h.state.sharedAcquires===1&&h.state.sharedReleases===1&&!h.state.sharedHeld);});
 test_("migrateYearRanges se rechaza",()=>{const h=harness_(),r=run_(h,{action:"migrateYearRanges",payload:h.request.payload});assert_(r.status==="error"&&h.dst.v[0][0]==="old timestamp");});
 test_("Fallo en staging conserva destino original",()=>{const h=harness_(),copy=h.dst.copyTo.bind(h.dst);h.dst.copyTo=()=>{const x=copy();x.failSet=true;return x;};const r=run_(h);assert_(r.status==="error"&&h.ss.getSheetByName("Hoja 1")===h.dst&&h.dst.v[0][0]==="old timestamp"&&!h.ss.getSheetByName("__utilities_timestamps_staging__"));});
 test_("Fallo al promover staging restaura destino anterior",()=>{const h=harness_({promoteFail:true}),r=run_(h);assert_(r.status==="error"&&h.ss.getSheetByName("Hoja 1")===h.dst&&h.dst.v[0][0]==="old timestamp"&&!h.ss.getSheetByName("__utilities_timestamps_backup__"));});
 test_("Lock ocupado impide ejecución simultánea",()=>{const h=harness_({lockBusy:true}),old=JSON.stringify(h.dst.v),r=run_(h);assert_(r.status==="error"&&JSON.stringify(h.dst.v)===old&&h.state.released===0&&h.state.sharedReleases===1&&!h.state.sharedHeld);});
 test_("POST concurrente durante la conversión queda serializado",()=>{const h=harness_({concurrent:true}),r=run_(h);assert_(r.status==="success"&&h.state.concurrentAttempted&&h.state.concurrentResult.status==="error"&&h.state.released===1&&!h.state.held&&h.state.sharedAcquires===1&&h.state.sharedReleases===1);});
 test_("Fallo al leer snapshot de origen no modifica destino y libera lock",()=>{const h=harness_({sourceReadFail:true}),old=JSON.stringify(h.dst.v),r=run_(h);assert_(r.status==="error"&&JSON.stringify(h.dst.v)===old&&h.state.released===1&&!h.state.held&&h.state.sharedReleases===1&&!h.state.sharedHeld);});
 test_("Snapshot de respaldo inconsistente aborta y restaura destino",()=>{const h=harness_({backupMismatch:true}),old=JSON.stringify(h.dst.v),r=run_(h);assert_(r.status==="error"&&JSON.stringify(h.ss.getSheetByName("Hoja 1").v)===old&&!h.ss.getSheetByName("__utilities_timestamps_backup__")&&!h.ss.getSheetByName("__utilities_timestamps_staging__")&&h.state.released===1);});
 test_("Origen vacío aplica únicamente encabezado",()=>{const h=harness_({empty:true}),r=run_(h);assert_(r.status==="success"&&r.rowsProcessed===0&&JSON.stringify(h.ss.getSheetByName("Hoja 1").v)==='[["timestamp"]]');});
 test_("Destino incompatible no altera hoja anterior",()=>{const h=harness_({incompatible:true}),r=run_(h);assert_(r.status==="error"&&h.ss.getSheetByName("Hoja 1")===h.dst&&h.dst.v[0][0]==="old timestamp");});
 test_("Backup huérfano se restaura antes de reintentar",()=>{const h=harness_();h.dst.setName("__utilities_timestamps_backup__");h.ss.add("__utilities_timestamps_staging__",[["stale"]]);const r=run_(h);assert_(r.status==="success"&&h.ss.getSheetByName("Hoja 1")&&!h.ss.getSheetByName("__utilities_timestamps_backup__"));});
 test_("Destino y backup simultáneos requieren reconciliación manual",()=>{const h=harness_();h.ss.add("__utilities_timestamps_backup__",[["backup"]]);const r=run_(h);assert_(r.status==="error"&&h.dst.v[0][0]==="old timestamp");});

 test_("La lease compartida precede al lock local y se libera después de la migración",()=>{const h=harness_(),r=run_(h);const events=h.state.events;assert_(r.status==="success"&&h.state.sharedAcquires===1&&h.state.sharedReleases===1&&!h.state.sharedHeld);assert_(events.indexOf("shared-acquire")<events.indexOf("local-lock-wait")&&events.indexOf("local-lock-released")<events.indexOf("shared-release"));const req=h.state.sharedRequests.find(x=>x.action==="acquire");assert_(req&&req.payload.service==="UTILITIES"&&req.payload.operation==="migrateTimestamps");});
 test_("Coordinador ausente o lease ocupada falla cerrada antes del lock local",()=>{[{coordinatorMissing:true},{leaseBusy:true}].forEach(o=>{const h=harness_(o),old=JSON.stringify(h.dst.v),r=run_(h);assert_(r.status==="error"&&JSON.stringify(h.dst.v)===old&&h.state.released===0&&!h.state.held&&!h.state.sharedHeld);});});
 return{status:failed?"FAIL":"PASS",passed,failed,results};
}
