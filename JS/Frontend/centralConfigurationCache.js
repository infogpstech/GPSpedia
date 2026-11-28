// Caché de parámetros públicos de configuración. No almacena ni resuelve endpoints.
export const CENTRAL_CONFIG_FRESH_TTL_MS=5*60*1000;
export const CENTRAL_CONFIG_STALE_TTL_MS=15*60*1000;
function validatePublicSnapshot_(v){
 if(!v||typeof v!=="object"||Array.isArray(v)||v.status!=="success"||Number(v.schemaVersion)!==1||!Number.isSafeInteger(Number(v.revision))||Number(v.revision)<1||!v.parameters||typeof v.parameters!=="object"||Array.isArray(v.parameters))throw new Error("La configuración pública no contiene una revisión válida.");
 for(const k of Object.keys(v.parameters))if(k!=="rich_text_mode"||!["strict","advanced"].includes(v.parameters[k]))throw new Error("La configuración pública contiene un parámetro desconocido o inválido.");
 return JSON.parse(JSON.stringify(v));
}
export function createCentralConfigurationCache(options={}){
 const now=typeof options.now==="function"?options.now:()=>Date.now();let cached=null,inflight=null;
 async function load(fetcher,opts={}){if(typeof fetcher!=="function")throw new TypeError("Se requiere un lector de configuración.");const age=cached?Math.max(0,now()-cached.fetchedAtMs):Infinity;if(!opts.force&&cached&&age<=CENTRAL_CONFIG_FRESH_TTL_MS)return project_(cached.snapshot,false);if(inflight)return inflight;
  inflight=(async()=>{try{const response=validatePublicSnapshot_(await fetcher());cached={snapshot:response,fetchedAtMs:now()};return project_(response,false);}catch(e){if(!cached)throw e;const failedAge=Math.max(0,now()-cached.fetchedAtMs);if(failedAge>CENTRAL_CONFIG_STALE_TTL_MS){cached=null;throw e;}return project_(cached.snapshot,true);}finally{inflight=null;}})();return inflight;}
 function invalidate(){cached=null;}function peek(){return cached?project_(cached.snapshot,true):null;}function project_(snapshot,stale){const result=JSON.parse(JSON.stringify(snapshot));result.stale=Boolean(stale);return result;}
 return Object.freeze({load,invalidate,peek});
}
