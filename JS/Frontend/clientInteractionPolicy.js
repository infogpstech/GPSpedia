/**
 * Fricción visual contra copia y descarga casual de medios desde el navegador.
 * No protege las fuentes ni sustituye la autorización del backend.
 * El texto normal y los controles editables conservan selección, copia y menú contextual.
 */
const installedDocuments_ = new WeakSet();
const EDITABLE_TARGET_SELECTOR_ = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable]:not([contenteditable="false"])';
const PROTECTED_MEDIA_SELECTOR_ = 'img, picture, video, canvas, [data-protect-media="true"]';
function resolveElement_(target) { if (target && target.nodeType === 1) return target; return target && target.parentElement ? target.parentElement : null; }
function isEditableTarget_(target) {
 const element=resolveElement_(target);
 return Boolean(element&&typeof element.closest==='function'&&element.closest(EDITABLE_TARGET_SELECTOR_));
}
function isProtectedMediaTarget_(target) {
 const element=resolveElement_(target);
 return Boolean(element&&typeof element.closest==='function'&&element.closest(PROTECTED_MEDIA_SELECTOR_));
}
export function installClientInteractionGuards(documentRef=document) {
 if(!documentRef||installedDocuments_.has(documentRef))return false;
 installedDocuments_.add(documentRef);
 const blockMediaAction=event=>{if(!isEditableTarget_(event.target)&&isProtectedMediaTarget_(event.target))event.preventDefault();};
 documentRef.addEventListener('contextmenu',blockMediaAction,true);
 documentRef.addEventListener('copy',blockMediaAction,true);
 documentRef.addEventListener('cut',blockMediaAction,true);
 documentRef.addEventListener('selectstart',blockMediaAction,true);
 documentRef.addEventListener('dragstart',blockMediaAction,true);
 return true;
}
if(typeof document!=='undefined')installClientInteractionGuards(document);
