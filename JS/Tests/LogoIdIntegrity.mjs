import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const admin=fs.readFileSync(resolve(root,"JS/Services/admin.js"),"utf8");
function extract(name){
 const start=admin.indexOf("function "+name+"(");assert.ok(start>=0,"No se encontró "+name);
 const next=admin.indexOf("\nfunction ",start+10);return admin.slice(start,next<0?admin.length:next);
}
function sheet(rows,formulas=[]){
 let writes=0;
 return {
  getLastRow:()=>rows.length,getLastColumn:()=>Math.max(0,...rows.map(r=>r.length)),
  getRange:(row,col,nr=1,nc=1)=>({
   getValues:()=>Array.from({length:nr},(_,r)=>Array.from({length:nc},(_,c)=>rows[row-1+r]?.[col-1+c]??"")),
   getFormulas:()=>Array.from({length:nr},(_,r)=>Array.from({length:nc},(_,c)=>formulas[row-1+r]?.[col-1+c]??"")),
   getValue:()=>rows[row-1]?.[col-1]??""
  }),
  get writes(){return writes;}
 };
}
let passed=0;function test(name,fn){fn();passed++;console.log("PASS "+name);}
function makeLedgerMock(){
 const rows=[["recordType","reservationId","logoId","createdAt","schemaVersion"],["","","","",""]];
 const ledger={
  getLastRow:()=>rows.length,
  getRange:(row,col,nr=1,nc=1)=>({
   getValues:()=>Array.from({length:nr},(_,r)=>Array.from({length:nc},(_,c)=>rows[row-1+r]?.[col-1+c]??"")),
   getValue:()=>rows[row-1]?.[col-1]??"",
   setValue:value=>{while(rows.length<row)rows.push(["","","","",""]);rows[row-1][col-1]=value;},
   setValues:values=>{values.forEach((valuesRow,r)=>{while(rows.length<row+r)rows.push(["","","","",""]);for(let c=0;c<valuesRow.length;c++)rows[row-1+r][col-1+c]=valuesRow[c];});}
  })
 };
 return {ledger,rows};
}
const ledgerHelpers=["inspectLogoIdHighWater_","getLogoIdReservationsSheet_","readLogoIdReservationLedger_","readLatestLogoIdReservation_","ensureLogoIdReservationBaselineUnderLock_","getNextLogoIdLocked_"];
function generator(sheetValue,storedValue=null){
 let stored=storedValue,propertyReads=0;
 const {ledger,rows}=makeLedgerMock();
 const deps={
  getSpreadsheet:()=>({getSheetByName:name=>name==="LogoIdReservations"?ledger:null}),
  PropertiesService:{getScriptProperties:()=>({getProperty:()=>{propertyReads++;return stored===null?null:String(stored);}})},
  SpreadsheetApp:{flush:()=>{}},Utilities:{getUuid:()=>"reservation-"+rows.length},
  LOGOS_MARCA_ID_COUNTER_PROPERTY:"LOGOS_MARCA_ID_COUNTER",
  LOGO_ID_RESERVATIONS_SHEET_NAME_:"LogoIdReservations",
  LOGO_ID_RESERVATIONS_HEADERS_:["recordType","reservationId","logoId","createdAt","schemaVersion"],
  LOGO_ID_RESERVATION_BASELINE_PENDING_:"pending",
  LOGO_ID_RESERVATION_BASELINE_VERSION_:"logo_id_counter_baseline_v1",
  LOGO_ID_RESERVATION_SCHEMA_VERSION_:1,
  LOGO_ID_RESERVATIONS_SHEET_NAME_:"LogoIdReservations",
  LOGO_ID_RESERVATIONS_HEADERS_:["recordType","reservationId","logoId","createdAt","schemaVersion"],
  LOGO_ID_RESERVATION_BASELINE_PENDING_:"pending",
  LOGO_ID_RESERVATION_BASELINE_VERSION_:"logo_id_counter_baseline_v1",
  LOGO_ID_RESERVATION_SCHEMA_VERSION_:1
 };
 const code=ledgerHelpers.map(extract).join("\n")+"\nreturn getNextLogoIdLocked_;";
 const fn=new Function(...Object.keys(deps),code)(...Object.values(deps));
 return {next:()=>fn(sheetValue),stored:()=>stored,propertyReads:()=>propertyReads,rows};
}

test("Asigna ID numérico posterior al máximo histórico y contador central",()=>{
 const h=generator(sheet([["id","nombre","url","marca"],[1,"A","u","A"],[3,"B","u","B"]]),2);
 assert.equal(h.next(),4);assert.equal(h.stored(),2);assert.equal(h.rows[2][2],4);
});
test("El baseline conserva el high-water legacy sin modificar la propiedad",()=>{
 const h=generator(sheet([["id","nombre"],[2,"A"]]),8);assert.equal(h.next(),9);assert.equal(h.propertyReads(),1);
});
test("Rechaza un contador legacy malformado sin emitir una reserva",()=>{
 const h=generator(sheet([["id","nombre"],[1,"A"]]),"legacy-corrupto");
 assert.throws(()=>h.next(),/contador legacy/);assert.equal(h.rows.length,2);
});
test("Una reserva confirmada actualiza el high-water del metadato",()=>{
 const h=generator(sheet([["id","nombre"],[4,"A"]]),2);assert.equal(h.next(),5);assert.equal(Number(h.rows[1][2]),5);
});
test("El flujo normal deja de consultar PropertiesService después del baseline",()=>{
 const h=generator(sheet([["id","nombre"],[1,"A"]]),1);assert.equal(h.next(),2);assert.equal(h.next(),3);assert.equal(h.propertyReads(),1);
});
test("Respeta contador central cuando está adelantado a la hoja",()=>{
 const h=generator(sheet([["id","nombre"],[2,"A"]]),8);assert.equal(h.next(),9);assert.equal(h.stored(),8);
});
test("Rechaza IDs duplicados aunque uno tenga ceros a la izquierda",()=>{
 const h=generator(sheet([["id","nombre"],[1,"A"],["001","B"]]));assert.throws(()=>h.next(),/duplicado/);
});
test("Rechaza IDs malformados y filas con datos sin ID",()=>{
 assert.throws(()=>generator(sheet([["id","nombre"],["X-1","A"]])).next(),/entero positivo/);
 assert.throws(()=>generator(sheet([["id","nombre"],["","A"]])).next(),/no tiene ID/);
});
test("Ignora filas plantilla vacías con fórmula histórica",()=>{
 const h=generator(sheet([["id","nombre"],[1,"A"],["",""]],[["id"],["=ROW()-1"],["=ROW()-1"]]));assert.equal(h.next(),2);
});
test("handleAddLogo usa el destino canónico compartido con el organizador",()=>{
 const fn=extract("handleAddLogo");
 assert.match(fn,/buildCanonicalLogoDestination_/);
 assert.match(fn,/getLogoCategoryCandidatesFromCortesRows_/);
 assert.match(fn,/logoDestination\.targetFolderPath/);
 assert.match(fn,/logoDestination\.targetBaseName/);
 assert.match(fn,/findOrCreateSubFolder\(rootFolder, destinationSegments\[1\]\)/);
 assert.match(fn,/findOrCreateSubFolder\(categoryFolder, destinationSegments\[2\]\)/);
 assert.doesNotMatch(fn,/findOrCreateSubFolder\(rootFolder, "Logos"\)/);
 assert.doesNotMatch(fn,/getOrCreateSubFolder/);
});
test("handleAddLogo escribe el ID como valor y elimina la espera de fórmula",()=>{
 const fn=extract("handleAddLogo");assert.match(fn,/getNextLogoIdLocked_\(sheet, logoIdSnapshot\)/);assert.match(fn,/getRange\(newRow, 1\)\.setValue\(newId\)/);
 assert.doesNotMatch(fn,/setFormula|Utilities\.sleep/);
});

function addLogoHarness(options={}){
 const rows=[["id","nombre","url","marca"],[1,"Marca anterior","old-url","Marca anterior"]];
 const cortesRows=[["id","categoria","marca"],["C-1","Camion pesado","Marca nueva"]];
 let counter=1,trashed=false,description="",failReads=false,flushCalls=0,createdFilename="";
 const folderCalls=[];
 const file={getId:()=>"file-1234567890",setTrashed:value=>{trashed=value;},isTrashed:()=>trashed,setDescription:value=>{description=value;}};
 const sheetValue={
  getLastRow:()=>rows.length,getLastColumn:()=>4,
  getDataRange:()=>({getValues:()=>rows}),
  getRange:(row,col,nr=1,nc=1)=>{
   const ensure=()=>{while(rows.length<row+nr-1)rows.push(["","","",""]);};
   return {
    getValues:()=>{
     if(failReads)throw new Error("read failure simulated");
     return Array.from({length:nr},(_,r)=>Array.from({length:nc},(_,c)=>rows[row-1+r]?.[col-1+c]??""));
    },
    getValue:()=>rows[row-1]?.[col-1]??"",
    getFormula:()=>"",getFormulas:()=>Array.from({length:nr},()=>Array.from({length:nc},()=>"")),
    setValue:value=>{
     if(options.failUrlWrite&&col===3)throw new Error("URL write failure simulated");
     ensure();rows[row-1][col-1]=value;
    },
    clearContent:()=>{
     ensure();for(let r=0;r<nr;r++)for(let c=0;c<nc;c++)rows[row-1+r][col-1+c]="";
    },
    copyTo:destination=>{
     ensure();const source=rows.slice(row-1,row-1+nr).map(item=>item.slice());
     while(rows.length<destination.row+destination.nr-1)rows.push(["","","",""]);
     for(let r=0;r<nr;r++)for(let c=0;c<nc;c++)rows[destination.row-1+r][destination.col-1+c]=source[r][c];
    },
    _row:row,_col:col
   };
  }
 };
 const originalGetRange=sheetValue.getRange;
 sheetValue.getRange=(row,col,nr=1,nc=1)=>{
  const range=originalGetRange(row,col,nr,nc);
  range.row=row;range.col=col;range.nr=nr;range.nc=nc;
  range.copyTo=(destination,pasteType)=>{
   if(options.failCopy)throw new Error("copy failure simulated");
   if(pasteType==="PASTE_FORMAT"||pasteType==="PASTE_DATA_VALIDATION")return destination;
   const source=rows.slice(row-1,row-1+nr).map(item=>item.slice());
   while(rows.length<destination.row+destination.nr-1)rows.push(["","","",""]);
   for(let r=0;r<nr;r++)for(let c=0;c<nc;c++)rows[destination.row-1+r][destination.col-1+c]=source[r][c];
   return destination;
  };
  return range;
 };
 const cortesSheet={
  getLastRow:()=>cortesRows.length,
  getDataRange:()=>({getValues:()=>cortesRows}),
  getRange:(row,col,nr,nc)=>({getValues:()=>Array.from({length:nr},(_,r)=>Array.from({length:nc},(_,c)=>cortesRows[row-1+r]?.[col-1+c]??""))})
 };
 const ledgerMock=makeLedgerMock(),ledgerSheet=ledgerMock.ledger;
 const rootFolder={kind:"root"},categoryFolder={kind:"category"};
 const brandFolder={
  kind:"brand",
  createFile:()=>file,
  getFilesByName:()=>({hasNext:()=>false,next:()=>null})
 };
 let lockHeld=false;const lock={tryLock:timeout=>{assert.equal(timeout,0);lockHeld=!options.lockFail;return lockHeld;},hasLock:()=>lockHeld,releaseLock:()=>{assert.equal(lockHeld,true);lockHeld=false;},waitLock:()=>{if(options.lockFail)throw new Error("lock timeout");}};
 const properties={getProperty:()=>String(counter),setProperty:(key,value)=>{counter=Number(value);}};
 const flush=()=>{
  flushCalls++;
  if(options.failFlushOnce&&flushCalls===5){if(options.failReadAfterFlush)failReads=true;throw new Error("flush failure simulated");}
 };
 const deps={
  getSpreadsheet:()=>({getSheetByName:name=>name==="Cortes"?cortesSheet:name==="LogoIdReservations"?ledgerSheet:sheetValue}),
  SHEET_NAMES:{LOGOS_MARCA:"LogosMarca",CORTES:"Cortes"},
  COLS_CORTES:{categoria:2,marca:3},
  getCortesRootFolder:()=>rootFolder,
  findOrCreateSubFolder:(parent,name)=>{folderCalls.push({parent,name});return folderCalls.length===1?categoryFolder:brandFolder;},
  hasDriveFilenameConflictInFolder:(folder,name)=>false,
  getCanonicalImageExtension:({getName,getMimeType})=>getName().match(/(\.[A-Za-z0-9]{2,5})$/)?.[1]||"",
  normalizeOrganizerSegment_:value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().replace(/[\\/\s]+/g,"_").replace(/[^a-zA-Z0-9_-]/g,"_").replace(/_+/g,"_").replace(/^_+|_+$/g,""),
  normalizeOrganizerFilePart_:value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().replace(/[\\/,]/g,"_").replace(/\s+/g,"_").replace(/[^a-zA-Z0-9_-]/g,"_").replace(/_+/g,"_").replace(/^_+|_+$/g,""),
  COLS_CORTES:{categoria:2,marca:3},
  Utilities:{getUuid:()=>"reservation-add-logo",base64Decode:()=>[137,80,78,71,13,10,26,10],base64Encode:()=>"iVBORw0KGgo=",newBlob:(data,mime,name)=>{createdFilename=name;return {}; }},
  LockService:{getScriptLock:()=>lock},
  SpreadsheetApp:{flush,CopyPasteType:{PASTE_FORMAT:"PASTE_FORMAT",PASTE_DATA_VALIDATION:"PASTE_DATA_VALIDATION"}},
  PropertiesService:{getScriptProperties:()=>properties},
  LOGOS_MARCA_ID_COUNTER_PROPERTY:"LOGOS_MARCA_ID_COUNTER",
  LOGO_ID_RESERVATIONS_SHEET_NAME_:"LogoIdReservations",
  LOGO_ID_RESERVATIONS_HEADERS_:["recordType","reservationId","logoId","createdAt","schemaVersion"],
  LOGO_ID_RESERVATION_BASELINE_PENDING_:"pending",
  LOGO_ID_RESERVATION_BASELINE_VERSION_:"logo_id_counter_baseline_v1",
  LOGO_ID_RESERVATION_SCHEMA_VERSION_:1
 };
 const fn=new Function(...Object.keys(deps),ledgerHelpers.map(extract).join(String.fromCharCode(10))+String.fromCharCode(10)+extract("getLogoCategoryCandidatesFromCortesRows_")+String.fromCharCode(10)+extract("buildCanonicalLogoDestination_")+String.fromCharCode(10)+extract("copyAdminRowPresentationOnly_")+String.fromCharCode(10)+extract("validateLogoImagePayload_")+String.fromCharCode(10)+extract("handleAddLogo")+String.fromCharCode(10)+"return handleAddLogo;")(...Object.values(deps));
 return {run:()=>fn({nombreMarca:"Marca nueva",fileData:"iVBORw0KGgo=",filename:options.filename||"logo.png",mimeType:options.mimeType||"image/png"},()=>{}),
  rows,file,folderCalls,get createdFilename(){return createdFilename;},get trashed(){return trashed;},get description(){return description;}};
}
test("Rechaza extensión que no coincide con el MIME real",()=>{
 const h=addLogoHarness({filename:"logo.svg"});assert.throws(()=>h.run(),/extensión del logotipo/);
});
test("Guarda el logotipo con nombre canónico en categoría/marca",()=>{
 const h=addLogoHarness();const result=h.run();
 assert.equal(result.status,"success");
 assert.equal(h.createdFilename,"marca_nueva_logo.png");
 assert.deepEqual(h.folderCalls.map(call=>call.name),["Camion_pesado","Marca_nueva"]);
});

test("Retira la imagen si no se puede adquirir el bloqueo",()=>{
 const h=addLogoHarness({lockFail:true});assert.throws(()=>h.run(),error=>error.code==="ADMIN_BUSY");assert.equal(h.trashed,true);
});
test("Limpia una fila si falla la copia parcial de plantilla",()=>{
 const h=addLogoHarness({failCopy:true});assert.throws(()=>h.run(),/copy failure/);
 assert.equal(h.trashed,true);assert.ok(!h.rows[2]||h.rows[2].every(value=>value===""));
});
test("Retira la imagen y limpia la fila parcial si falla la escritura de URL",()=>{
 const h=addLogoHarness({failUrlWrite:true});assert.throws(()=>h.run(),/URL write failure/);
 assert.equal(h.trashed,true);assert.ok(h.rows[2].every(value=>value===""));
});
test("Recupera como éxito una fila única ya persistida aunque falle flush",()=>{
 const h=addLogoHarness({failFlushOnce:true});const result=h.run();
 assert.equal(result.status,"success");assert.equal(result.recovered,true);assert.equal(result.logoId,2);assert.equal(h.trashed,false);
});
test("Conserva y marca el archivo si no puede verificar el estado del vínculo",()=>{
 const h=addLogoHarness({failFlushOnce:true,failReadAfterFlush:true});assert.throws(()=>h.run(),/no pudo verificarse/);
 assert.equal(h.trashed,false);assert.match(h.description,/RECOVERY_REQUIRED/);
});

console.log("LogoIdIntegrity: "+passed+"/"+passed+" PASS");
