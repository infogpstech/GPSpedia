import assert from "node:assert/strict";
import fs from "node:fs";
const read=p=>fs.readFileSync(new URL(p,import.meta.url),"utf8");
const main=read("../Frontend/main.js"),auth=read("../Frontend/auth.js"),ui=read("../Frontend/ui.js"),offline=read("../Frontend/offline.js");
const policy=read("../Frontend/clientInteractionPolicy.js"),apiConfig=read("../Frontend/api-config.js"),users=read("../../HTML/users.html"),addCuts=read("../../HTML/add_cortes.html");
const tests=[];function test(n,fn){fn();tests.push(n);}
test("PWA declara la capacidad móvil estándar y conserva la etiqueta Apple",()=>{const index=read("../../index.html");assert.match(index,/<meta name="mobile-web-app-capable" content="yes">/);assert.match(index,/<meta name="apple-mobile-web-app-capable" content="yes">/);});
test("restaurar sesión usa el usuario y rol verificados en login sin otro viaje AUTH",()=>{
 assert.doesNotMatch(main,/revalidateSessionOnResume_|installSessionRevalidation_/);
 assert.doesNotMatch(main,/auth\.validateActiveSession\(/);
 assert.match(main,/await auth\.checkSession\(\)/);
 const start=auth.indexOf("export async function checkSession()"),end=auth.indexOf("\nexport async function login(",start);
 assert.ok(start>=0&&end>start);
 const check=auth.slice(start,end);
 assert.doesNotMatch(check,/validateSessionCoordinated|apiValidateSession/);
 assert.match(check,/user\.Privilegios/);
 assert.match(check,/handleLoginSuccess\(user, false\)/);
});
test("el aviso superior no anuncia loading del catálogo",()=>assert.match(main,/banner\.hidden = !view\.visible \|\| currentState\.catalogLoadStatus === 'loading'/));
test("la actualización no añade controles ni intercepta el gesto nativo",()=>{
 assert.equal(main.includes(".container.addEventListener('touchstart'"),false);
 assert.equal(main.includes(".container.addEventListener('touchend'"),false);
 assert.equal(main.includes("auth.loadInitialData(true)"),false);
 assert.equal(main.includes("registration.update()"),true);
 assert.equal(main.includes("window.location.reload()"),false);
 assert.equal(main.includes("window.location.reload()"),false);
 assert.equal(main.includes("refreshAppLink"),false);
 assert.equal(main.includes("MANUAL_CATALOG_REFRESH_COOLDOWN_MS"),false);
});
test("el catálogo conserva el arranque cache-first sin forzar recargas",()=>{
 assert.ok(auth.includes("export async function loadInitialData(forceRefresh = false, options = {})"));
 assert.ok(auth.includes("if (!forceRefresh && catalogLoaded && hasFreshCatalogSync_()) return"));
});
test("restauración local no repite la consulta de usuario y rol",()=>{
 const start=auth.indexOf("export async function checkSession()"),end=auth.indexOf("\nexport async function login(",start);
 const check=auth.slice(start,end);
 assert.doesNotMatch(check,/apiValidateSession|validateSessionCoordinated/);
 assert.match(check,/normalizedRole/);
});
test("el sondeo incremental es silencioso, adaptativo y se suspende en segundo plano",()=>{assert.match(auth,/CATALOG_POLL_INTERVAL_MS = 45000/);assert.match(auth,/CATALOG_POLL_MAX_INTERVAL_MS = 300000/);assert.match(auth,/document\.visibilityState === "hidden"/);assert.match(auth,/window\.addEventListener\("online"/);assert.match(auth,/loadInitialData\(true, \{ silent: true, fromPoll: true \}\)/);assert.ok(auth.indexOf("offline.getCatalogSyncState()") < auth.indexOf("if (!catalogLoaded && !silent) setState({ catalogLoadStatus: 'loading'"), "El estado loading debe establecerse después de comprobar la caché local");assert.match(auth,/stopCatalogPolling_\(\)/);});
test("las pestañas coordinan el sondeo y reciben cambios sin recargar el catálogo",()=>{assert.match(auth,/CATALOG_POLL_LEASE_MS = 60000/);assert.match(auth,/tryAcquireCatalogPollLease_\(user\)/);assert.match(auth,/releaseCatalogPollLease_\(user\)/);assert.match(auth,/new BroadcastChannel\("gpsepedia-catalog-sync"\)/);assert.match(auth,/handleCatalogSyncMessage_\(event && event\.data\)/);assert.match(auth,/offline\.getCatalogSyncState\(\)/);assert.match(auth,/broadcastCatalogSync_\(currentUser, requiresFullSnapshot \|\| pysDeltaChanges\.length > 0\)/);assert.match(auth,/message\.refreshPys === true/);});
test("AUTH indisponible conserva sesión sin banner",()=>{const a=auth.indexOf("function restoreSessionAfterValidationUnavailable_"),b=auth.indexOf("\nexport async function checkSession",a);assert.ok(a>=0&&b>a);const s=auth.slice(a,b);assert.match(s,/handleLoginSuccess\(user, false\)/);assert.doesNotMatch(s,/showGlobalError/);});
test("catálogo reutiliza caché fresca y consulta deltas sin descargar snapshots cuando no hay cambios",()=>{assert.match(auth,/CATALOG_REFRESH_TTL_MS = 60000/);assert.match(auth,/if \(!forceRefresh && catalogLoaded && hasFreshCatalogSync_\(\)\) return/);assert.match(auth,/fetchCatalogDelta_\(cachedCursor, currentUser, loadController\.signal\)/);assert.match(auth,/delta\.changes\.length === 0[\s\S]*?return;/);assert.match(auth,/performSilentSync\(snapshotToApply\)/);assert.match(auth,/saveCatalogWithCursor\(snapshotToApply, cursorToPersist\)/);});
test("saludo usa nombre o ID y no queda vacío",()=>{assert.match(ui,/const displayName = String\(user &&/);assert.match(ui,/welcomeMsg\.textContent = `Hola, \$\{displayName \|\| 'Usuario'\}`/);});
test("Inbox y Developer abren con el rol de sesión existente sin solicitar otra validación AUTH",()=>{const a=ui.indexOf("function ensureUiSessionRole_"),b=ui.indexOf("\nfunction getSessionPayload_",a);assert.ok(a>=0&&b>a);const s=ui.slice(a,b);assert.match(s,/getUiSessionContext_\(\)/);assert.match(s,/allowedRoles\.includes\(context\.role\)/);assert.doesNotMatch(s,/validateActiveSession|routeAction\(/);});
test("menú tiene fallback si popstate no llega",()=>{assert.match(ui,/fallbackTimer = window\.setTimeout\(finish, 500\)/);assert.match(ui,/window\.clearTimeout\(fallbackTimer\)/);});
test("la imagen remota empieza antes de esperar IndexedDB y evita una sonda duplicada",()=>{const a=ui.indexOf("export async function setOptimizedImage"),b=ui.indexOf("export function getImageUrl",a);assert.ok(a>=0&&b>a);const fn=ui.slice(a,b);assert.ok(fn.indexOf("setSource(remoteUrl)")<fn.indexOf("offline.getThumbnail(cleanId"));assert.doesNotMatch(fn,/new Image\(|startRemoteProbe/);});
test("compresión de miniaturas es opcional y aplica backoff",()=>{assert.match(offline,/THUMBNAIL_FAILURE_BACKOFF_MS = 5 \* 60 \* 1000/);assert.match(offline,/thumbnailCompressionFailures_\.set\(cacheKey/);assert.match(offline,/Se omitió la compresión opcional de miniatura/);assert.doesNotMatch(offline,/Thumbnail compression failed for/);});
test("política de contexto protege medios sin bloquear texto ni campos editables",()=>{assert.match(policy,/isEditableTarget_/);assert.match(policy,/isProtectedMediaTarget_/);assert.match(policy,/!isEditableTarget_\(event\.target\)&&isProtectedMediaTarget_\(event\.target\)/);assert.match(policy,/input, textarea, select/);assert.match(policy,/img, picture, video, canvas/);assert.match(users,/clientInteractionPolicy\.js/);assert.match(addCuts,/clientInteractionPolicy\.js/);});
test("login reutiliza el mismo requestId tras un fallo transitorio y solo limpia la solicitud completada",async()=>{
 const source=apiConfig.replace(/\bexport\s+(?=(?:async\s+)?function\b)/g,"");
 const extractFunction=name=>{const re=new RegExp("(?:async\\s+)?function\\s+"+name+"\\s*\\(");const match=re.exec(source);assert.ok(match,"Falta función "+name);const start=match.index;const next=source.slice(match.index+match[0].length).search(/\n(?:export\s+)?(?:async\s+)?function\s+/);return source.slice(start,next<0?undefined:match.index+match[0].length+next).trim();};
 const functions=["createLoginRequestId_","loginRequestStorageKey_","login","completeLoginRequest"].map(extractFunction).join("\n");
 const values=new Map();const storage={getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
 let generated=0,calls=0,firstRequestId="";
 const cryptoMock={randomUUID:()=>"request-"+(++generated)};
 const routeAction=async(action,payload)=>{assert.equal(action,"login");calls++;if(calls===1){firstRequestId=payload.requestId;throw new Error("network unavailable");}assert.equal(payload.requestId,firstRequestId,"El reintento debe conservar el ID idempotente");return{user:{ID:"U1"}};};
 const api=new Function("sessionStorage","crypto","routeAction",functions+"\nreturn {login,completeLoginRequest,loginRequestStorageKey_};")(storage,cryptoMock,routeAction);
 await assert.rejects(api.login(" Tech ","secret"),/network unavailable/);
 const key=api.loginRequestStorageKey_("TECH");assert.equal(values.get(key),firstRequestId);
 const result=await api.login("tech","secret");assert.equal(result.loginRequestId,firstRequestId);assert.equal(result.user.ID,"U1");assert.equal(calls,2);assert.equal(generated,1);
 values.set(key,"newer-request");api.completeLoginRequest("Tech",firstRequestId);assert.equal(values.get(key),"newer-request","Una respuesta antigua no debe borrar una solicitud posterior");
 api.completeLoginRequest("Tech","newer-request");assert.equal(values.has(key),false);
});
tests.forEach(n=>console.log("PASS "+n));console.log("SessionStartupNavigation: "+tests.length+"/"+tests.length+" PASS");
