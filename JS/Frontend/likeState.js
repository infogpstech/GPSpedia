function key_(vehicleId,cut){return String(vehicleId)+"|"+String(cut);}
export function resolveUsefulDisplayCutIndex(vehicle,sourceCut){
 const source=Number(sourceCut);if(!vehicle||!Number.isInteger(source)||source<1||source>3)return source;
 for(let display=1;display<=3;display++){const original=Number(vehicle["sourceCorteIndex"+display])||display;if(original===source)return display;}
 return source;
}
export function applyOptimisticUsefulState(current,vehicleId,cut,isUseful){
 const s=current&&typeof current==="object"?current:{},key=key_(vehicleId,cut),old=Array.isArray(s.likedCortes)?s.likedCortes:[],was=old.includes(key),desired=Boolean(isUseful);if(was===desired)return s;
 const likedCortes=desired?[...old,key]:old.filter(x=>x!==key),catalog=s.catalogData&&typeof s.catalogData==="object"?s.catalogData:{},vehicles=Array.isArray(catalog.cortes)?catalog.cortes:[];
 const cortes=vehicles.map(v=>{if(String(v&&v.id)!==String(vehicleId))return v;const display=resolveUsefulDisplayCutIndex(v,cut),field="utilCorte"+display;return{...v,[field]:Math.max(0,(Number.parseInt(v[field],10)||0)+(desired?1:-1))};});
 return{...s,likedCortes,catalogData:{...catalog,cortes}};
}
export function applyConfirmedUsefulState(current,vehicleId,cut,response){
 const s=current&&typeof current==="object"?current:{},liked=Array.isArray(s.likedCortes)?s.likedCortes:[],desired=liked.includes(key_(vehicleId,cut)),server=response&&typeof response.isUseful==="boolean"?response.isUseful:desired;
 const count=response&&Number.isSafeInteger(response.usefulCount)&&response.usefulCount>=0?response.usefulCount:(response&&Number.isSafeInteger(response.likeCount)&&response.likeCount>=0?response.likeCount:null);
 const catalog=s.catalogData&&typeof s.catalogData==="object"?s.catalogData:{},vehicles=Array.isArray(catalog.cortes)?catalog.cortes:[];
 const cortes=count===null?vehicles:vehicles.map(v=>{if(String(v&&v.id)!==String(vehicleId))return v;const source=Number(response&&response.corteIndex)||Number(cut),display=resolveUsefulDisplayCutIndex(v,source),field="utilCorte"+display,adjusted=Math.max(0,count+(desired===server?0:(desired?1:-1)));return{...v,[field]:adjusted};});
 return{...s,likedCortes:liked,catalogData:{...catalog,cortes}};
}
export function applyConfirmedLikeState(current,vehicleId,cut,response){
 const s=current&&typeof current==="object"?current:{},old=Array.isArray(s.likedCortes)?s.likedCortes:[],key=key_(vehicleId,cut),intended=old.includes(key)?s:{...s,likedCortes:[...old,key]};
 return applyConfirmedUsefulState(intended,vehicleId,cut,{...response,isUseful:true,usefulCount:response&&Number.isSafeInteger(response.usefulCount)?response.usefulCount:response&&response.likeCount});
}
