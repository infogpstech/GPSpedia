const LEGACY='gpsepedia_pending_operation', PREFIX=LEGACY+':owner:', QUARANTINE=LEGACY+':quarantine:';
const ownerOf=v=>String(v||'').trim();
const parse=raw=>{try{const v=JSON.parse(raw);return v&&typeof v==='object'&&!Array.isArray(v)?v:null;}catch(_){return null;}};
function clean(v){if(Array.isArray(v))return v.map(clean);if(!v||typeof v!=='object')return v;const o={};for(const [k,x] of Object.entries(v)){if(/session.?token|password|credential|authorization/i.test(k))continue;o[k]=clean(x);}return o;}
export function createPendingOperationStore(storage,userId){
 const owner=ownerOf(userId);if(!storage||!owner)throw new TypeError('ownerId requerido');
 const key=PREFIX+encodeURIComponent(owner);
 function quarantine(raw,reason){let n=0,k=QUARANTINE+reason;while(storage.getItem(k)!==null&&storage.getItem(k)!==raw)k=QUARANTINE+reason+':'+(++n);if(storage.getItem(k)===null)storage.setItem(k,raw);}
 function migrate(){
  const raw=storage.getItem(LEGACY);if(raw===null)return 'none';
  const old=parse(raw);if(!old){quarantine(raw,'invalid');storage.removeItem(LEGACY);return 'quarantined';}
  const oldOwner=ownerOf(old.ownerId||old.userId);if(!oldOwner){quarantine(raw,'owner-missing');storage.removeItem(LEGACY);return 'quarantined';}
  const target=PREFIX+encodeURIComponent(oldOwner),existingRaw=storage.getItem(target);
  if(existingRaw!==null){const existing=parse(existingRaw);if(existing&&existing.id===old.id&&ownerOf(existing.ownerId)===oldOwner){storage.removeItem(LEGACY);return 'migrated';}quarantine(raw,'conflict');storage.removeItem(LEGACY);return 'quarantined';}
  storage.setItem(target,JSON.stringify(clean({...old,ownerId:oldOwner})));
  const verify=parse(storage.getItem(target));if(!verify||verify.id!==old.id||ownerOf(verify.ownerId)!==oldOwner)throw new Error('migration verification failed');
  storage.removeItem(LEGACY);return 'migrated';
 }
 function read(){const migration=migrate(),raw=storage.getItem(key);if(raw===null)return{status:migration,operation:null};const op=parse(raw);if(!op||ownerOf(op.ownerId)!==owner||!op.id){quarantine(raw,'owner-mismatch');storage.removeItem(key);return{status:'quarantined',operation:null};}return{status:'ready',operation:clean(op)};}
 function write(op){if(!op||typeof op!=='object'||!ownerOf(op.id))return{saved:false,reason:'invalid-operation'};if(op.ownerId&&ownerOf(op.ownerId)!==owner)return{saved:false,reason:'owner-mismatch'};const value=clean({...op,ownerId:owner});storage.setItem(key,JSON.stringify(value));const verify=parse(storage.getItem(key));return verify&&verify.id===value.id&&ownerOf(verify.ownerId)===owner?{saved:true,operation:verify}:{saved:false,reason:'verification-failed'};}
 function remove(id){const op=read().operation;if(!op||op.id!==id||ownerOf(op.ownerId)!==owner)return false;storage.removeItem(key);return storage.getItem(key)===null;}
 return{key,read,write,remove};
}
