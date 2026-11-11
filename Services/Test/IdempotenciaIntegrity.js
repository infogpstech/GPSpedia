function runIdempotenciaIntegrityTests(){
 const out=[];let passed=0,failed=0;function assert(c,m){if(!c)throw Error(m||"assert");}function throws(fn,s){let e;try{fn();}catch(x){e=x;}assert(!!e,"expected throw");if(s)assert(String(e.message||e).includes(s),"unexpected: "+(e.message||e));}
 function sheet(rows,cols){const d=rows.map(r=>r.slice());return{getMaxColumns:()=>cols||6,getLastRow:()=>{for(let i=d.length-1;i>=0;i--)if(d[i].some(v=>v!==""&&v!=null))return i+1;return 0;},getDataRange:()=>({getValues:()=>d}),getRange:(r,c,n,m)=>({getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>(d[r-1+i]||[])[c-1+j]??"")),setValue:v=>{d[r-1]=d[r-1]||[];d[r-1][c-1]=v;},setValues:v=>v.forEach((line,i)=>line.forEach((x,j)=>{d[r-1+i]=d[r-1+i]||[];d[r-1+i][c-1+j]=x;}))}),getLastColumn:()=>Math.max(0,...d.map(r=>r.reduce((n,v,i)=>v!==""&&v!=null?i+1:n,0))),getName:()=>"Idempotencia",setFrozenRows:()=>{},insertColumnsAfter:()=>{},appendRow:r=>d.push(r.slice()),_d:d};}
 function run(n,fn){try{fn();passed++;out.push({name:n,status:"PASS"});}catch(e){failed++;out.push({name:n,status:"FAIL",message:String(e.message||e)});}}
 run("encabezado vacío con datos",()=>{const s=sheet([["opId","vehicleId","slotIndex","timestamp",""],["OP-a","7",1,"10/11/2026 09:00:00","completed"]]);const st=getIdempotenciaHeaderState(s);assert(!st.compatible&&st.reason==="missing_header_with_data");});
 run("rechaza hoja con menos de cinco columnas y registros",()=>{const st=getIdempotenciaHeaderState(sheet([["opId","vehicleId","slotIndex","timestamp"],["OP-a","7",1,"10/11/2026"]],4));assert(!st.compatible&&st.reason==="insufficient_columns_with_data");});
 run("pending válido",()=>{const e=readIdempotenciaEntries_(sheet([IDEMPOTENCIA_HEADERS,["OP-a","7",1,"10/11/2026 09:00:00","pending"]]),false).entries[0];assert(e.status==="pending");});
 run("duplicado igual asociación",()=>throws(()=>readIdempotenciaEntries_(sheet([IDEMPOTENCIA_HEADERS,["OP-a","7",1,"10/11/2026 09:00:00","pending"],["OP-a","7",1,"10/11/2026 09:01:00","completed"]]),false),"opId duplicado"));
 run("duplicado asociación distinta",()=>throws(()=>readIdempotenciaEntries_(sheet([IDEMPOTENCIA_HEADERS,["OP-a","7",1,"10/11/2026 09:00:00","pending"],["OP-a","8",1,"10/11/2026 09:01:00","completed"]]),false),"opId duplicado"));
 run("status desconocido",()=>throws(()=>readIdempotenciaEntries_(sheet([IDEMPOTENCIA_HEADERS,["OP-a","7",1,"10/11/2026","other"]]),false),"status debe ser"));
 run("timestamp inválido",()=>throws(()=>readIdempotenciaEntries_(sheet([IDEMPOTENCIA_HEADERS,["OP-a","7",1,"31/02/2026","completed"]]),false),"timestamp"));
 run("slot inválido",()=>throws(()=>readIdempotenciaEntries_(sheet([IDEMPOTENCIA_HEADERS,["OP-a","7","1x","10/11/2026","completed"]]),false),"slotIndex"));
 run("vehicleId vacío",()=>throws(()=>readIdempotenciaEntries_(sheet([IDEMPOTENCIA_HEADERS,["OP-a","",1,"10/11/2026","completed"]]),false),"vehicleId"));

 run("operationHash SHA-256 válido",()=>{const hash="a".repeat(64),e=readIdempotenciaEntries_(sheet([IDEMPOTENCIA_HEADERS,["OP-a","7",1,"10/11/2026 09:00:00","pending",hash]]),false).entries[0];assert(e.operationHash===hash);});
 run("operationHash inválido",()=>throws(()=>readIdempotenciaEntries_(sheet([IDEMPOTENCIA_HEADERS,["OP-a","7",1,"10/11/2026 09:00:00","pending","not-a-hash"]]),false),"operationHash"));
 run("registro legado sin huella se conserva como no verificable",()=>{const e=readIdempotenciaEntries_(sheet([IDEMPOTENCIA_HEADERS,["OP-a","7",1,"10/11/2026 09:00:00","completed",""]]),false).entries[0];assert(e.operationHash==="");});
 run("hoja histórica A:E se lee sin pedir columna F inexistente",()=>{const e=readIdempotenciaEntries_(sheet([["opId","vehicleId","slotIndex","timestamp","status"],["OP-legacy","7",1,"10/11/2026 09:00:00","completed"]],5),true).entries[0];assert(e.operationHash==="");});

 run("vehicleId duplicado en Cortes",()=>{COLS_CORTES.id=1;throws(()=>findUniqueCortesVehicleRow_({getDataRange:()=>({getValues:()=>[["id"],[7],[7]]})},"7","OP-a"),"aparece en 2 filas");});
 run("vehicleId único en Cortes",()=>{COLS_CORTES.id=1;assert(findUniqueCortesVehicleRow_({getDataRange:()=>({getValues:()=>[["id"],[7],[8]]})},"7","OP-a").rowIndex===2);});

 run("migración completa un registro pending existente",()=>{const p=getNewIdempotenciaEntries([{opId:"OP-a",vehicleId:"7",slotIndex:1,timestamp:"10/11/2026"}],new Map([["OP-a",{vehicleId:"7",slotIndex:1,status:"pending",rowIndex:3}]]));assert(p.entriesToComplete.length===1&&p.entriesToComplete[0].rowIndex===3&&p.entriesToWrite.length===0);});
 run("migración rechaza asociación incompatible",()=>{let e;try{getNewIdempotenciaEntries([{opId:"OP-a",vehicleId:"7",slotIndex:1,timestamp:"10/11/2026"}],new Map([["OP-a",{vehicleId:"8",slotIndex:1,status:"completed",rowIndex:3}]]));}catch(x){e=x;}assert(!!e&&String(e.message||e).includes("asociación diferente"));});
 return{status:failed?"FAIL":"PASS",passed,failed,results:out};
}