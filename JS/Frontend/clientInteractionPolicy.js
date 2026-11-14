/**
 * Fricción visual contra copia y descarga casual desde el navegador.
 * No protege las fuentes ni sustituye la autorización del backend.
 * Los controles editables conservan su menú contextual para permitir pegar y editar.
 */
const installedDocuments_ = new WeakSet();
const EDITABLE_TARGET_SELECTOR_ = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable]:not([contenteditable="false"])';
function resolveElement_(target) { if (target && target.nodeType === 1) return target; return target && target.parentElement ? target.parentElement : null; }
function isEditableTarget_(target) {
 const element=resolveElement_(target);
 return Boolean(element&&typeof element.closest==='function'&&element.closest(EDITABLE_TARGET_SELECTOR_));
}
export function installClientInteractionGuards(documentRef=document) {
 if(!documentRef||installedDocuments_.has(documentRef))return false;
 installedDocuments_.add(documentRef);
 documentRef.addEventListener('contextmenu',event=>{if(!isEditableTarget_(event.target))event.preventDefault();},true);
 documentRef.addEventListener('copy',event=>{if(!isEditableTarget_(event.target))event.preventDefault();},true);
 documentRef.addEventListener('cut',event=>{if(!isEditableTarget_(event.target))event.preventDefault();},true);
 documentRef.addEventListener('selectstart',event=>{if(!isEditableTarget_(event.target))event.preventDefault();},true);
 documentRef.addEventListener('dragstart',event=>{const element=resolveElement_(event.target);if(element&&typeof element.closest==='function'&&element.closest('img, picture, a img'))event.preventDefault();},true);
 return true;
}
if(typeof document!=='undefined')installClientInteractionGuards(document);
