function key_(vehicleId,cut){return String(vehicleId)+"|"+String(cut);}
export function applyOptimisticUsefulState(current,vehicleId,cut,isUseful){
 const s=current&&typeof current==="object"?current:{},key=key_(vehicleId,cut),old=Array.isArray(s.likedCortes)?s.likedCortes:[],was=old.includes(key),desired=Boolean(isUseful);if(was===desired)return s;
 const likedCortes=desired?[...old,key]:old.filter(x=>x!==key),catalog=s.catalogData&&typeof s.catalogData==="object"?s.catalogData:{},vehicles=Array.isArray(catalog.cortes)?catalog.cortes:[];
 const field="utilCorte"+String(cut),cortes=vehicles.map(v=>String(v&&v.id)===String(vehicleId)?{...v,[field]:Math.max(0,(Number.parseInt(v[field],10)||0)+(desired?1:-1))}:v);
 return{...s,likedCortes,catalogData:{...catalog,cortes}};
}
export function applyConfirmedUsefulState(current,vehicleId,cut,response){
 const s=current&&typeof current==="object"?current:{},liked=Array.isArray(s.likedCortes)?s.likedCortes:[],desired=liked.includes(key_(vehicleId,cut)),server=response&&typeof response.isUseful==="boolean"?response.isUseful:desired;
 const count=response&&Number.isSafeInteger(response.usefulCount)&&response.usefulCount>=0?response.usefulCount:(response&&Number.isSafeInteger(response.likeCount)&&response.likeCount>=0?response.likeCount:null);
 const adjusted=count===null?null:Math.max(0,count+(desired===server?0:(desired?1:-1))),catalog=s.catalogData&&typeof s.catalogData==="object"?s.catalogData:{},vehicles=Array.isArray(catalog.cortes)?catalog.cortes:[];
 const field="utilCorte"+String(Number(response&&response.corteIndex)||Number(cut)),cortes=adjusted===null?vehicles:vehicles.map(v=>String(v&&v.id)===String(vehicleId)?{...v,[field]:adjusted}:v);
 return{...s,likedCortes:liked,catalogData:{...catalog,cortes}};
}
export function applyConfirmedLikeState(current,vehicleId,cut,response){
 const s=current&&typeof current==="object"?current:{},old=Array.isArray(s.likedCortes)?s.likedCortes:[],key=key_(vehicleId,cut),intended=old.includes(key)?s:{...s,likedCortes:[...old,key]};
 return applyConfirmedUsefulState(intended,vehicleId,cut,{...response,isUseful:true,usefulCount:response&&Number.isSafeInteger(response.usefulCount)?response.usefulCount:response&&response.likeCount});
}
