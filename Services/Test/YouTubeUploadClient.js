
// Pruebas del cliente YouTube: persistencia local, operación estable y protocolo 308.
// Ejecutar en un entorno de navegador que cargue youtubeUpload.js y proporcione IndexedDB/XMLHttpRequest.
async function runYouTubeUploadClientTests() {
    const results=[];let passed=0,failed=0;
    function assert_(v,m){if(!v)throw new Error(m||"Aserción fallida.");}
    function expect_(fn,t){let e=null;try{fn();}catch(x){e=x;}assert_(!!e,"Se esperaba rechazo.");if(t)assert_(String(e.message||e).includes(t),"Error inesperado: "+String(e.message||e));}
    async function run_(n,fn){try{await fn();passed++;results.push({name:n,status:"PASS"});}catch(e){failed++;results.push({name:n,status:"FAIL",message:String(e.message||e)});}}
    function makeFakeDb_(store){
        const db={
            objectStoreNames:{contains:()=>true},
            transaction:()=>{
                const tx={
                    objectStore:()=>({
                        put(record){store.set(record.opVideoId,record);Promise.resolve().then(()=>{if(tx.oncomplete)tx.oncomplete();});},
                        get(id){const req={};Promise.resolve().then(()=>{req.result=store.get(id)||null;if(req.onsuccess)req.onsuccess();if(tx.oncomplete)tx.oncomplete();});return req;},
                        getAll(){const req={};Promise.resolve().then(()=>{req.result=Array.from(store.values());if(req.onsuccess)req.onsuccess();if(tx.oncomplete)tx.oncomplete();});return req;},
                        delete(id){store.delete(id);Promise.resolve().then(()=>{if(tx.oncomplete)tx.oncomplete();});}
                    }),
                    oncomplete:null,onerror:null,onabort:null
                };
                return tx;
            },
            close(){}
        };
        return{open:()=>{const request={};Promise.resolve().then(()=>{request.result=db;if(request.onsuccess)request.onsuccess();});return request;}};
    }
    function fakeFile(size){return{name:"test.mp4",size,type:"video/mp4",slice:(start,end)=>({size:end-start})};}
    function makeXhrQueue_(responses){
        const requests=[];
        class FakeXHR{
            constructor(){this.upload={};this.headers={};this.status=0;this.responseText="";this.responseHeaders={};}
            open(method,url,async){this.method=method;this.url=url;this.async=async;}
            setRequestHeader(k,v){this.headers[k]=v;}
            getResponseHeader(k){return this.responseHeaders[k]||null;}
            send(body){
                requests.push({method:this.method,url:this.url,headers:{...this.headers},body});
                const response=responses.shift()||{status:500};
                this.status=response.status;this.responseText=response.body||"";this.responseHeaders=response.headers||{};
                if(response.error){if(this.onerror)this.onerror();return;}
                if(this.upload.onprogress&&body&&body.size)this.upload.onprogress({lengthComputable:true,loaded:body.size});
                if(this.onload)this.onload();
            }
            abort(){if(this.onabort)this.onabort();}
        }
        return{FakeXHR,requests};
    }
    const originalWindow=window;
    const originalStorage=sessionStorage;
    const store=new Map();
    try{
        window.indexedDB=makeFakeDb_(store);
        window.crypto={randomUUID:()=>"12345678-1234-1234-1234-123456789012"};
        const local=new Map();
        sessionStorage={getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v),removeItem:k=>local.delete(k)};

        await run_("reutiliza y limpia opVideoId persistido",async()=>{
            const a=getYouTubeOperationContext_("u1","corte","veh-1","Video");
            const saved=local.has(a.storageKey);
            const b=getYouTubeOperationContext_("u1","corte","veh-1","Video");
            assert_(saved&&a.opVideoId===b.opVideoId);
            clearYouTubeOperationContext_(a.storageKey,a.opVideoId);
            assert_(!local.has(a.storageKey));
        });
        await run_("guarda, encuentra y elimina registro IndexedDB",async()=>{
            const record={opVideoId:"a".repeat(32),userId:"u1",contentType:"corte",referenceId:"veh-1",file:fakeFile(10),fileSize:10,status:"paused"};
            await saveYouTubeUploadRecord_(record);
            const found=await findPendingYouTubeUploadRecord_("u1","corte","veh-1");
            const loaded=await getYouTubeUploadRecord_(record.opVideoId);
            assert_(found.opVideoId===record.opVideoId&&loaded.fileSize===10);
            await deleteYouTubeUploadRecord_(record.opVideoId);
            assert_((await getYouTubeUploadRecord_(record.opVideoId))===null);
        });
        await run_("filtra por usuario y destino y detecta múltiples sesiones",async()=>{
            await saveYouTubeUploadRecord_({opVideoId:"b".repeat(32),userId:"u1",contentType:"pys",referenceId:"p-1",file:fakeFile(1),fileSize:1,status:"paused"});
            await saveYouTubeUploadRecord_({opVideoId:"c".repeat(32),userId:"u2",contentType:"pys",referenceId:"p-1",file:fakeFile(1),fileSize:1,status:"paused"});
            const found=await findPendingYouTubeUploadRecord_("u1","pys","p-1");
            assert_(found.opVideoId==="b".repeat(32));
            await saveYouTubeUploadRecord_({opVideoId:"d".repeat(32),userId:"u1",contentType:"pys",referenceId:"p-1",file:fakeFile(1),fileSize:1,status:"interrupted"});
            let rejected=false;try{await findPendingYouTubeUploadRecord_("u1","pys","p-1");}catch(e){rejected=String(e.message).includes("varias subidas");}
            assert_(rejected);
        });
        await run_("parsea Range de respuesta 308",async()=>{
            assert_(parseYouTubeUploadRange_("bytes=0-8388607")===8388608);
            assert_(parseYouTubeUploadRange_(null)===0);
        });
        await run_("continúa en bloques después de 308 y obtiene ID real",async()=>{
            const {FakeXHR,requests}=makeXhrQueue_([
                {status:308,headers:{Range:"bytes=0-8388607"}},
                {status:201,body:JSON.stringify({id:"abcdefghijk"})}
            ]);
            const old=XMLHttpRequest;XMLHttpRequest=FakeXHR;
            try{
                const record={opVideoId:"e".repeat(32),uploadUrl:"https://upload.test/session",file:fakeFile(10*1024*1024),fileSize:10*1024*1024,fileType:"video/mp4",bytesUploaded:0,status:"new"};
                const id=await uploadYouTubeFileResumable_(record,()=>{},()=>{},()=>false,async()=>{});
                assert_(id==="abcdefghijk"&&requests.length===2);
                assert_(requests[0].headers["Content-Range"]==="bytes 0-8388607/10485760");
                assert_(requests[1].headers["Content-Range"]==="bytes 8388608-10485759/10485760");
            }finally{XMLHttpRequest=old;}
        });
        await run_("reanuda desde el último rango confirmado por YouTube",async()=>{
            const {FakeXHR,requests}=makeXhrQueue_([
                {status:308,headers:{Range:"bytes=0-8388607"}},
                {status:201,body:JSON.stringify({id:"abcdefghijk"})}
            ]);
            const old=XMLHttpRequest;XMLHttpRequest=FakeXHR;
            try{
                const record={opVideoId:"f".repeat(32),uploadUrl:"https://upload.test/session",file:fakeFile(10*1024*1024),fileSize:10*1024*1024,fileType:"video/mp4",bytesUploaded:0,status:"paused"};
                const id=await uploadYouTubeFileResumable_(record,()=>{},()=>{},()=>false,async()=>{});
                assert_(id==="abcdefghijk"&&requests[0].headers["Content-Range"]==="bytes */10485760");
                assert_(requests[1].headers["Content-Range"]==="bytes 8388608-10485759/10485760");
            }finally{XMLHttpRequest=old;}
        });
        await run_("detecta que YouTube ya completó la transferencia al consultar",async()=>{
            const {FakeXHR,requests}=makeXhrQueue_([{status:200,body:JSON.stringify({id:"abcdefghijk"})}]);
            const old=XMLHttpRequest;XMLHttpRequest=FakeXHR;
            try{
                const record={opVideoId:"g".repeat(32),uploadUrl:"https://upload.test/session",file:fakeFile(10),fileSize:10,fileType:"video/mp4",bytesUploaded:10,status:"paused"};
                const id=await uploadYouTubeFileResumable_(record,()=>{},()=>{},()=>false,async()=>{});
                assert_(id==="abcdefghijk"&&requests.length===1&&requests[0].headers["Content-Range"]==="bytes */10");
            }finally{XMLHttpRequest=old;}
        });
        await run_("identifica sesión resumable expirada",async()=>{
            const {FakeXHR}=makeXhrQueue_([{status:410}]);
            const old=XMLHttpRequest;XMLHttpRequest=FakeXHR;
            try{
                const record={uploadUrl:"https://upload.test/session",file:fakeFile(10),fileSize:10,fileType:"video/mp4",bytesUploaded:1,status:"paused"};
                let error=null;try{await uploadYouTubeFileResumable_(record,()=>{},()=>{},()=>false,async()=>{});}catch(e){error=e;}
                assert_(error&&error.code==="YOUTUBE_SESSION_EXPIRED");
            }finally{XMLHttpRequest=old;}
        });
        await run_("rechaza respuesta final sin ID real de YouTube",async()=>{
            const {FakeXHR,requests}=makeXhrQueue_([{status:201,body:"{}"}]);
            const old=XMLHttpRequest;XMLHttpRequest=FakeXHR;
            try{
                const record={opVideoId:"h".repeat(32),uploadUrl:"https://upload.test/session",file:fakeFile(10),fileSize:10,fileType:"video/mp4",bytesUploaded:0,status:"new"};
                let error=null;try{await uploadYouTubeFileResumable_(record,()=>{},()=>{},()=>false,async()=>{});}catch(e){error=e;}
                assert_(!!error&&String(error.message).includes("ID real")&&requests.length===1);
            }finally{XMLHttpRequest=old;}
        });
        await run_("recupera una respuesta perdida consultando el estado remoto",async()=>{
            const {FakeXHR,requests}=makeXhrQueue_([
                {error:true},
                {status:200,body:JSON.stringify({id:"abcdefghijk"})}
            ]);
            const old=XMLHttpRequest;XMLHttpRequest=FakeXHR;
            try{
                const record={opVideoId:"i".repeat(32),uploadUrl:"https://upload.test/session",file:fakeFile(10),fileSize:10,fileType:"video/mp4",bytesUploaded:0,status:"new"};
                const id=await uploadYouTubeFileResumable_(record,()=>{},()=>{},()=>false,async()=>{});
                assert_(id==="abcdefghijk"&&requests.length===2&&requests[1].headers["Content-Range"]==="bytes */10");
            }finally{XMLHttpRequest=old;}
        });
        await run_("rechaza respuesta HTTP fallida de YouTube",async()=>{
            const {FakeXHR}=makeXhrQueue_([{status:500},{status:500}]);
            const old=XMLHttpRequest;XMLHttpRequest=FakeXHR;
            try{
                const record={opVideoId:"j".repeat(32),uploadUrl:"https://upload.test/session",file:fakeFile(10),fileSize:10,fileType:"video/mp4",bytesUploaded:0,status:"new"};
                let error=null;try{await uploadYouTubeFileResumable_(record,()=>{},()=>{},()=>false,async()=>{});}catch(e){error=e;}
                assert_(!!error&&String(error.message).includes("HTTP 500"));
            }finally{XMLHttpRequest=old;}
        });
        await run_("cancela sin iniciar un nuevo bloque",async()=>{
            const {FakeXHR,requests}=makeXhrQueue_([]);
            const old=XMLHttpRequest;XMLHttpRequest=FakeXHR;
            try{
                const record={uploadUrl:"https://upload.test/session",file:fakeFile(10),fileSize:10,fileType:"video/mp4",bytesUploaded:0,status:"new"};
                let error=null;try{await uploadYouTubeFileResumable_(record,()=>{},()=>{},()=>true,async()=>{});}catch(e){error=e;}
                assert_(!!error&&requests.length===0);
            }finally{XMLHttpRequest=old;}
        });
    }finally{
        window=originalWindow;
        sessionStorage=originalStorage;
    }
    return{status:failed===0?"PASS":"FAIL",passed,failed,results};
}
