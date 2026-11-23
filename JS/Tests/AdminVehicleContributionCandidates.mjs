import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const admin=readFileSync(new URL("../Services/admin.js",import.meta.url),"utf8");
const catalog=readFileSync(new URL("../Services/catalog.js",import.meta.url),"utf8");
const api=readFileSync(new URL("../Frontend/api-config.js",import.meta.url),"utf8");
const ui=readFileSync(new URL("../Frontend/ui.js",import.meta.url),"utf8");
assert.equal(admin.includes("handleGetVehicleContributionCandidates_"),false);
assert.equal(admin.includes("CATALOG_SERVICE_URL"),false);
assert.ok(catalog.includes("case 'getVehicleContributionCandidates'"));
assert.ok(api.includes("'getVehicleContributionCandidates': 'CATALOG'"));
const authStart=catalog.indexOf("function normalizeCatalogRole_"),authEnd=catalog.indexOf("function getSpreadsheet()",authStart);
assert.ok(authStart>=0&&authEnd>authStart);
const authSource=catalog.slice(authStart,authEnd);
function sheets(role="Desarrollador",created=new Date(),activity=new Date(),tokens=["SESSION-1"]){
 const sheet=rows=>({getDataRange:()=>({getValues:()=>rows})});
 return {getSheetByName:name=>name==="Users"?sheet([["id","username","password","role"],["USER-1","dev","",role]]):
  name==="ActiveSessions"?sheet([["id","username","token","date","logs","lastActivityAt"],...tokens.map(t=>["USER-1","dev",t,created,"",activity])]):null};
}
const actorCache = { get: () => null, put: () => {}, remove: () => {} };
const cacheService = { getScriptCache: () => actorCache };
const utilities = { DigestAlgorithm: { SHA_256: "SHA_256" }, Charset: { UTF_8: "UTF_8" }, computeDigest: () => new Array(32).fill(1) };
const verify=ss=>new Function("getSpreadsheet","CacheService","Utilities",authSource+";return verifyCatalogDeveloperSession_;")(()=>ss,cacheService,utilities);
assert.equal(verify(sheets())({userId:"USER-1",sessionToken:"SESSION-1"}),true);
assert.throws(()=>verify(sheets("Técnico"))({userId:"USER-1",sessionToken:"SESSION-1"}),/Desarrollador/);
assert.throws(()=>verify(sheets("Desarrollador",new Date("2020-01-01"),new Date("2020-01-01")))({userId:"USER-1",sessionToken:"SESSION-1"}),/expiró/);
assert.throws(()=>verify(sheets("Desarrollador",new Date(),new Date(),["SESSION-1","SESSION-1"]))({userId:"USER-1",sessionToken:"SESSION-1"}),/único/);
assert.equal(catalog.includes("CATALOG_TRAFFIC_SECRET_PROPERTY_"),false);
const hs=catalog.indexOf("function handleGetContributionCandidates_(payload = {})"),he=catalog.indexOf("function handleGetNavigationData()",hs);
assert.ok(hs>=0&&he>hs);
const handler=new Function("verifyCatalogDeveloperSession_","readCatalogContributionProjectionVehicles_",catalog.slice(hs,he)+";return handleGetContributionCandidates_;")(
 ()=>true,()=>[{id:"3",marca:"Nissan",modelo:"Frontier",contributionCandidates:[
  {eventId:"EV-A",opId:"OP-A",kind:"feed",reason:"feed_capacity_full",payload:{image:"FILE_ID"}},
  {eventId:"EV-B",opId:"OP-B",kind:"cut",reason:"vin_conflict",payload:{}}
 ]}]
);
const normal=handler({userId:"USER-1",sessionToken:"SESSION-1",limit:1});
assert.equal(normal.total,2);assert.equal(normal.candidates.length,1);assert.equal(normal.truncated,true);
const withImages=handler({userId:"USER-1",sessionToken:"SESSION-1",includeImageInventoryCandidates:true});
assert.equal(withImages.imageInventoryCandidates.length,1);assert.equal(withImages.imageInventoryCandidates[0].eventId,"EV-A");
assert.equal(withImages.imageInventoryEvents,undefined);
assert.ok(ui.includes('routeAction("getContributionCandidates",{...getDeveloperSessionPayload(),limit:200})'));
const previewStart=ui.indexOf("const candidateImageUrl="),previewEnd=ui.indexOf('const editor=document.createElement("textarea")',previewStart);
assert.ok(previewStart>=0&&previewEnd>previewStart);
const preview=ui.slice(previewStart,previewEnd);
for(const value of ["candidatePayload.image","candidatePayload.fieldName","image.src=candidateImageUrl",'imageLink.target="_blank"','imageLink.rel="noopener noreferrer"','image.referrerPolicy="no-referrer"'])assert.ok(preview.includes(value),value);
console.log("AdminVehicleContributionCandidates: 12/12 PASS — CATALOG valida sesión/rol, candidatos y preview");
