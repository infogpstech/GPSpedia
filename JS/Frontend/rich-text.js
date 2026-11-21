import { getRichTextMode } from './api-config.js';

/* Utilidades compartidas para los editores de texto enriquecido de GPSpedia. */

const SAFE_MARKERS = new Set(["hyphen", "arrow", "check", "bullet"]);
const SAFE_FONTS = new Map([
    ["Arial", "Arial, sans-serif"],
    ["Segoe UI", "'Segoe UI', Roboto, sans-serif"],
    ["Courier New", "'Courier New', monospace"],
    ["Georgia", "Georgia, serif"],
    ["Times New Roman", "'Times New Roman', Times, serif"],
    ["Verdana", "Verdana, Geneva, sans-serif"],
    ["Tahoma", "Tahoma, Geneva, sans-serif"],
    ["Trebuchet MS", "'Trebuchet MS', sans-serif"],
    ["Palatino", "'Palatino Linotype', 'Book Antiqua', Palatino, serif"],
    ["Garamond", "Garamond, serif"],
    ["Impact", "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif"]
]);
const SAFE_FONT_VALUES = new Set(SAFE_FONTS.values());
const SAFE_SIZES = new Set(["0.85em", "1em", "1.2em", "1.5em"]);
const SAFE_NAMED_COLORS = new Set(["red", "blue", "green", "black", "white", "orange", "yellow", "gray", "grey", "purple", "teal", "navy"]);
const richEditorSelectionRanges_ = new WeakMap();
let richSelectionChangeBound_ = false;
let richActiveEditorRef_ = null;

function rememberRichTextSelection_(targetOrId) {
    const editor = typeof targetOrId === "string" ? resolveRichTextTarget_(targetOrId) : targetOrId;
    if (!isRichContentEditable_(editor)) return false;
    const selection = window.getSelection?.();
    if (!selection || !selection.rangeCount) return false;
    const range = selection.getRangeAt(0);
    if (range.commonAncestorContainer !== editor && !editor.contains(range.commonAncestorContainer)) return false;
    richEditorSelectionRanges_.set(editor, range.cloneRange());
    return true;
}

function restoreRichTextSelection_(editor) {
    if (!isRichContentEditable_(editor)) return false;
    editor.focus({ preventScroll: true });
    const saved = richEditorSelectionRanges_.get(editor);
    if (saved && (saved.commonAncestorContainer === editor || editor.contains(saved.commonAncestorContainer))) {
        const selection = window.getSelection?.();
        if (!selection) return false;
        selection.removeAllRanges();
        selection.addRange(saved.cloneRange());
        return true;
    }
    const selection = window.getSelection?.();
    return Boolean(selection && selection.rangeCount && (selection.getRangeAt(0).commonAncestorContainer === editor || editor.contains(selection.getRangeAt(0).commonAncestorContainer)));
}

export function bindRichTextEditorSelection_(editor) {
    if (!isRichContentEditable_(editor) || editor.dataset.richSelectionBound === "true") return;
    editor.dataset.richSelectionBound = "true";
    const remember = () => rememberRichTextSelection_(editor);
    ["keyup", "input"].forEach(type => editor.addEventListener(type, remember));
    ["mouseup", "touchend"].forEach(type => editor.addEventListener(type, () => {
        remember();
        restoreRichTextPendingFormatAtCaret_(editor);
    }));
    editor.addEventListener("focus", () => {
        richActiveEditorRef_ = typeof WeakRef === "function" ? new WeakRef(editor) : { deref: () => editor };
        remember();
        restoreRichTextPendingFormatAtCaret_(editor);
    });
    editor.addEventListener("blur", () => {
        remember();
        if (richActiveEditorRef_?.deref() === editor) richActiveEditorRef_ = null;
    });
    if (!richSelectionChangeBound_) {
        richSelectionChangeBound_ = true;
        document.addEventListener("selectionchange", () => richActiveEditorRef_?.deref() && rememberRichTextSelection_(richActiveEditorRef_.deref()));
    }
    editor.addEventListener("contextmenu", event => event.preventDefault());
}

const richEditorPendingFormats_ = new WeakMap();
const richEditorTypingAnchors_ = new WeakMap();
const richEditorComposing_ = new WeakSet();
const RICH_TEXT_CARET_SENTINEL_ = "\u200B";
function getRichTextPendingFormats_(editor) {
 let state=richEditorPendingFormats_.get(editor);
 if(!state){state={bold:false,italic:false,underline:false,strike:false,color:null,fontFamily:null,fontSize:null};richEditorPendingFormats_.set(editor,state);}
 return state;
}
function hasRichTextPendingFormats_(state){return Boolean(state&&(state.bold||state.italic||state.underline||state.strike||state.color||state.fontFamily||state.fontSize));}
function getRichTextSavedRange_(editor){
 if(!isRichContentEditable_(editor))return null;
 const selection=window.getSelection?.(),current=selection?.rangeCount?selection.getRangeAt(0):null;
 const inside=Boolean(current&&(current.commonAncestorContainer===editor||editor.contains(current.commonAncestorContainer)));
 if(document.activeElement===editor&&inside){richEditorSelectionRanges_.set(editor,current.cloneRange());return current.cloneRange();}
 const saved=richEditorSelectionRanges_.get(editor);
 if(saved&&(saved.commonAncestorContainer===editor||editor.contains(saved.commonAncestorContainer)))return saved.cloneRange();
 return inside?current.cloneRange():null;
}
function wrapRichTextNodeWithFormats_(node,state){
 let result=node;
 if(state.color||state.fontFamily||state.fontSize){const styled=document.createElement("span");if(state.color)styled.style.color=state.color;if(state.fontFamily)styled.style.fontFamily=state.fontFamily;if(state.fontSize)styled.style.fontSize=state.fontSize;styled.appendChild(result);result=styled;}
 [["bold","strong"],["italic","em"],["underline","u"],["strike","s"]].forEach(([key,tag])=>{if(state[key]){const element=document.createElement(tag);element.appendChild(result);result=element;}});
 return result;
}
function createRichTextTypingAnchor_(editor,range,state){
 if(!range||!range.collapsed||!hasRichTextPendingFormats_(state))return false;
 const previous=richEditorTypingAnchors_.get(editor);
 if(previous?.root?.isConnected){
  if(previous.sentinel?.data===RICH_TEXT_CARET_SENTINEL_&&previous.root.contains(range.startContainer)){range.selectNode(previous.root);range.collapse(false);previous.root.remove();}
  else if(previous.sentinel?.data?.includes(RICH_TEXT_CARET_SENTINEL_)){previous.sentinel.deleteData(previous.sentinel.data.indexOf(RICH_TEXT_CARET_SENTINEL_),1);if(!previous.root.textContent)previous.root.remove();}
 }
 richEditorTypingAnchors_.delete(editor);
 const sentinel=document.createTextNode(RICH_TEXT_CARET_SENTINEL_),root=wrapRichTextNodeWithFormats_(sentinel,state);
 range.insertNode(root);
 const caret=document.createRange();caret.setStart(sentinel,1);caret.collapse(true);
 const selection=window.getSelection?.();if(!selection)return false;
 selection.removeAllRanges();selection.addRange(caret);
 richEditorTypingAnchors_.set(editor,{root,sentinel});richEditorSelectionRanges_.set(editor,caret.cloneRange());
 return true;
}
function restoreRichTextPendingFormatAtCaret_(editor){
 const state=richEditorPendingFormats_.get(editor),selection=window.getSelection?.();
 if(!hasRichTextPendingFormats_(state)||!selection?.rangeCount)return false;
 const range=selection.getRangeAt(0);
 if(!range.collapsed||(range.commonAncestorContainer!==editor&&!editor.contains(range.commonAncestorContainer)))return false;
 return createRichTextTypingAnchor_(editor,range.cloneRange(),state);
}
function cleanRichTextTypingSentinel_(editor){
 const anchor=richEditorTypingAnchors_.get(editor);
 if(!anchor?.sentinel?.isConnected){richEditorTypingAnchors_.delete(editor);return false;}
 const node=anchor.sentinel,position=node.data.indexOf(RICH_TEXT_CARET_SENTINEL_);
 if(position<0){richEditorTypingAnchors_.delete(editor);return false;}
 const selection=window.getSelection?.();let range=null;
 if(selection?.rangeCount){const current=selection.getRangeAt(0);if(current.startContainer===node){
  range=document.createRange();range.setStart(node,Math.max(0,current.startOffset-(current.startOffset>position?1:0)));
  if(current.endContainer===node)range.setEnd(node,Math.max(0,current.endOffset-(current.endOffset>position?1:0)));else range.setEnd(current.endContainer,current.endOffset);
 }}
 node.deleteData(position,1);
 if(range){selection.removeAllRanges();selection.addRange(range);richEditorSelectionRanges_.set(editor,range.cloneRange());}
 richEditorTypingAnchors_.delete(editor);return true;
}
function applyRichTextInlineFormat_(editor,format,value=null){
 let range=getRichTextSavedRange_(editor);if(!range)return false;
 const state=getRichTextPendingFormats_(editor),tags={bold:"strong",italic:"em",underline:"u",strike:"s"};
 if(range.collapsed){
  if(["bold","italic","underline","strike"].includes(format))state[format]=!state[format];
  else if(format==="color")state.color=value;else if(format==="font")state.fontFamily=SAFE_FONTS.get(value);else if(format==="size")state.fontSize=value;
  richEditorSelectionRanges_.set(editor,range.cloneRange());return createRichTextTypingAnchor_(editor,range,state);
 }
 if(tags[format]){
  let node=range.startContainer;if(node.nodeType===1&&node===editor)node=node.childNodes[range.startOffset]||node.lastChild||node;
  const element=node.nodeType===1?node:node.parentElement,selector={bold:"strong,b",italic:"em,i",underline:"u",strike:"s,strike"}[format];
  const existing=element?.closest?.(selector),active=Boolean(existing&&editor.contains(existing));
  const command={bold:"bold",italic:"italic",underline:"underline",strike:"strikeThrough"}[format];
  restoreRichTextSelection_(editor);let applied=false;
  try{applied=typeof document.execCommand==="function"&&document.execCommand(command,false,null)===true;}catch(_){}
  if(applied){state[format]=!active;range=getRichTextSavedRange_(editor);if(range?.collapsed)createRichTextTypingAnchor_(editor,range,state);rememberRichTextSelection_(editor);editor.dispatchEvent(new Event("input",{bubbles:true}));return true;}
  if(active){state[format]=false;return false;}
  range=getRichTextSavedRange_(editor);if(!range)return false;state[format]=true;
  const wrapper=document.createElement(tags[format]);wrapper.appendChild(range.extractContents());range.insertNode(wrapper);range.setStartAfter(wrapper);range.collapse(true);
 }else{
  const property=format==="color"?"color":format==="font"?"font-family":"font-size",safeValue=format==="color"?value:format==="font"?SAFE_FONTS.get(value):value;
  if(!["color","font","size"].includes(format)||!safeValue)return false;
  if(format==="color")state.color=value;else if(format==="font")state.fontFamily=safeValue;else state.fontSize=safeValue;
  const wrapper=document.createElement("span");wrapper.style.setProperty(property,safeValue);wrapper.appendChild(range.extractContents());range.insertNode(wrapper);range.setStartAfter(wrapper);range.collapse(true);
 }
 const selection=window.getSelection?.();selection?.removeAllRanges();selection?.addRange(range);
 richEditorSelectionRanges_.set(editor,range.cloneRange());createRichTextTypingAnchor_(editor,range,state);
 editor.dispatchEvent(new Event("input",{bubbles:true}));return true;
}
function insertRichTextPlainText_(editor, value) {
    if (!restoreRichTextSelection_(editor)) return false;
    const selection = window.getSelection?.();
    if (!selection || !selection.rangeCount) return false;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const fragment = document.createDocumentFragment();
    String(value || "").replace(/\r\n?/g, "\n").split("\n").forEach((line, index) => {
        if (index) fragment.appendChild(document.createElement("br"));
        if (line) fragment.appendChild(document.createTextNode(line));
    });
    const last = fragment.lastChild;
    range.insertNode(fragment);
    if (last) { range.setStartAfter(last); range.collapse(true); selection.removeAllRanges(); selection.addRange(range); }
    rememberRichTextSelection_(editor);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
}

async function copyRichTextSelection_(targetId) {
    const editor = resolveRichTextTarget_(targetId);
    if (!restoreRichTextSelection_(editor)) return false;
    const selection = window.getSelection?.();
    if (!selection || !selection.rangeCount || selection.isCollapsed) return false;
    const text = selection.getRangeAt(0).toString();
    if (!text) return false;
    try {
        if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
    } catch (_) {}
    try { return document.execCommand("copy") === true; } catch (_) { return false; }
}

async function pasteRichTextSelection_(targetId) {
    const editor = resolveRichTextTarget_(targetId);
    if (!restoreRichTextSelection_(editor)) return false;
    try {
        if (navigator.clipboard?.readText) {
            const value = await navigator.clipboard.readText();
            return insertRichTextPlainText_(editor, value);
        }
    } catch (_) {}
    try { return document.execCommand("paste") === true; } catch (_) { return false; }
}

export function stripRichTextDemoPlaceholder(value) {
    const source = String(value || "");
    const text = source
        .replace(/<br\s*\/?\s*>/gi, " ")
        .replace(/<\/?(?:p|div|strong|b|span)[^>]*>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;|&#160;/gi, " ")
        .replace(/\u200b/g, "")
        .replace(/\s+/g, " ")
        .trim();
    return text.toLocaleLowerCase() === "texto en negrita" ? "" : source;
}

export function positionRichTextMenu(menu, anchor, align = "left") {
    if (!menu || !anchor) return false;
    const rect = typeof anchor.getBoundingClientRect === "function" ? anchor.getBoundingClientRect() : anchor;
    const viewportWidth = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
    const viewportHeight = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
    menu.style.position = "fixed";
    menu.style.left = "0px";
    menu.style.right = "auto";
    menu.style.top = "0px";
    menu.style.bottom = "auto";
    menu.style.maxWidth = Math.max(120, viewportWidth - 16) + "px";
    const menuRect = menu.getBoundingClientRect();
    const width = Math.min(menuRect.width || 150, viewportWidth - 16);
    const height = Math.min(menuRect.height || 190, viewportHeight - 16);
    const desiredLeft = align === "right" ? rect.right - width : rect.left;
    const left = Math.max(8, Math.min(desiredLeft, viewportWidth - width - 8));
    let top = rect.bottom + 5;
    if (top + height > viewportHeight - 8) top = rect.top - height - 5;
    top = Math.max(8, Math.min(top, viewportHeight - height - 8));
    menu.style.left = left + "px";
    menu.style.top = top + "px";
    return true;
}

function splitSelectionIntoListItems(selected) {
    if (/<\/?(?:ul|ol|li)\b/i.test(selected)) {
        return [selected.replace(/\r\n?|\n/g, "<br>")];
    }

    if (/<\/?(?:p|div)\b/i.test(selected)) {
        const parsed = new DOMParser().parseFromString(selected, "text/html");
        const blocks = Array.from(parsed.body.children);
        if (blocks.length && blocks.every(block => block.tagName === "P" || block.tagName === "DIV")) {
            return blocks.flatMap(block => splitSelectionIntoListItems(block.innerHTML || ""));
        }
        return [selected.replace(/\r\n?|\n/g, "<br>")];
    }

    const tokens = selected.match(/<\/?[a-z][^>]*>|[^<]+|</gi) || [];
    const items = [];
    const stack = [];
    let current = "";
    let malformed = false;

    const openMarkup = () => stack.map(entry => entry.open).join("");
    const closeMarkup = () => stack.slice().reverse().map(entry => `</${entry.name}>`).join("");
    const finishLine = () => {
        items.push(current + closeMarkup());
        current = openMarkup();
    };

    for (const token of tokens) {
        if (token === "<") {
            current += token;
            continue;
        }
        if (token.startsWith("<") && /^<br\s*\/?\s*>$/i.test(token)) {
            finishLine();
            continue;
        }
        if (token.startsWith("<") && /^<\//.test(token)) {
            const match = token.match(/^<\/([a-z][\w-]*)/i);
            if (!match) { malformed = true; break; }
            const name = match[1].toLowerCase();
            const index = stack.map(entry => entry.name).lastIndexOf(name);
            if (index < 0) { malformed = true; break; }
            current += token;
            stack.splice(index);
            continue;
        }
        if (token.startsWith("<")) {
            const match = token.match(/^<([a-z][\w-]*)/i);
            if (!match) { current += token; continue; }
            const name = match[1].toLowerCase();
            current += token;
            if (!/^(br|img|hr|input|meta|link|source|wbr)$/.test(name) && !/\/\s*>$/.test(token)) {
                stack.push({ name, open: token });
            }
            continue;
        }

        const parts = token.replace(/\r\n?/g, "\n").split("\n");
        current += parts[0];
        for (let i = 1; i < parts.length; i++) {
            finishLine();
            current += parts[i];
        }
    }

    if (stack.length) malformed = true;
    if (malformed) return [selected.replace(/\r\n?|\n/g, "<br>")];
    items.push(current);
    return items.map(item => item || "<br>");
}

function isRichContentEditable_(element) {
    return Boolean(element && (element.isContentEditable || element.getAttribute?.("contenteditable") === "true"));
}


let richToolbarOutsideDismissBound_ = false;
function bindRichToolbarOutsideDismiss_() {
    if (richToolbarOutsideDismissBound_ || typeof document === "undefined") return;
    richToolbarOutsideDismissBound_ = true;
    document.addEventListener("pointerdown", event => {
        const target = event.target;
        const activeDropdown = target && typeof target.closest === "function" ? target.closest(".rich-toolbar-dropdown") : null;
        document.querySelectorAll(".rich-toolbar-dropdown.is-open").forEach(group => {
            if (activeDropdown && group.contains(target)) return;
            group.classList.remove("is-open");
            group.querySelector(".rich-toolbar-icon-button")?.setAttribute("aria-expanded", "false");
            const menu = group.querySelector(".rich-toolbar-menu");
            if (menu) menu.hidden = true;
        });
    }, true);
}

function normalizeEditorMode_(mode) { return ["basic", "lists", "advanced"].includes(mode) ? mode : null; }
function resolveRichTextTarget_(targetId) {
    const direct = document.getElementById(targetId);
    if (isRichContentEditable_(direct)) return direct;
    return document.getElementById(String(targetId) + "-visual-editor") || direct;
}
function truncateRichEditor_(editor, maxLength) {
    if (!Number.isFinite(maxLength) || maxLength < 0 || (editor.textContent || "").length <= maxLength) return;
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let remaining = maxLength, node, cutNode = null, cutOffset = 0;
    while ((node = walker.nextNode())) {
        if (remaining >= node.nodeValue.length) remaining -= node.nodeValue.length;
        else { cutNode = node; cutOffset = remaining; break; }
    }
    if (cutNode) { const range = document.createRange(); range.setStart(cutNode, cutOffset); range.setEnd(editor, editor.childNodes.length); range.deleteContents(); }
    else if (maxLength === 0) editor.replaceChildren();
}
export function syncRichTextEditorFromSource(sourceOrId) {
    const source = typeof sourceOrId === "string" ? document.getElementById(sourceOrId) : sourceOrId;
    if (!source || !source.id) return false;
    const editor = document.getElementById(source.id + "-visual-editor");
    if (!editor) return false;
    const mode = normalizeEditorMode_(editor.dataset.richEditorMode) || "basic";
    editor.innerHTML = sanitizeHtmlContent(stripRichTextDemoPlaceholder(source.value || ""), mode);
    source.value = sanitizeHtmlContent(editor.innerHTML.replace(RICH_TEXT_CARET_SENTINEL_, ""), mode);
    return true;
}
export function mountRichTextEditors(root = document) {
    if (!root || typeof root.querySelectorAll !== "function") return 0;
    const toolbars = Array.from(root.querySelectorAll(".rich-editor-toolbar[data-rich-target-id]"));
    let mounted = 0;
    const findSource = id => Array.from(root.querySelectorAll("textarea")).find(item => item.id === id) || document.getElementById(id);
    toolbars.forEach(toolbar => {
        const targetId = toolbar.dataset.richTargetId;
        if (!targetId) return;
        const source = findSource(targetId);
        if (!source || source.tagName !== "TEXTAREA" || source.dataset.richVisualMounted === "true") return;
        const mode = normalizeEditorMode_(toolbar.dataset.richTextMode) || "basic";
        const editor = document.createElement("div");
        editor.id = targetId + "-visual-editor";
        editor.className = (source.className ? source.className + " " : "") + "rich-text-visual-editor";
        editor.dataset.richSourceId = targetId; editor.dataset.richEditorMode = mode;
        editor.setAttribute("contenteditable", "true"); editor.setAttribute("role", "textbox");
        editor.setAttribute("aria-multiline", "true");
        editor.setAttribute("aria-label", source.getAttribute("aria-label") || (source.labels && source.labels[0] && source.labels[0].textContent.trim()) || "Texto");
        editor.setAttribute("spellcheck", "true"); editor.tabIndex = 0;
        editor.style.cssText = source.style.cssText || "";
        editor.style.minHeight = editor.style.minHeight || (Math.max(2, Number(source.rows) || 3) * 1.45) + "em";
        editor.style.whiteSpace = "pre-wrap"; editor.style.overflowWrap = "anywhere";
        if (source.placeholder) editor.dataset.placeholder = source.placeholder;
        if (source.required) { editor.dataset.richRequired = "true"; editor.setAttribute("aria-required", "true"); }
        const maxLength = Number(source.maxLength);
        if (Number.isFinite(maxLength) && maxLength > 0) editor.dataset.maxLength = String(maxLength);
        editor.innerHTML = sanitizeHtmlContent(stripRichTextDemoPlaceholder(source.value || ""), mode);
        source.value = editor.innerHTML; source.dataset.richVisualMounted = "true"; source.dataset.richEditorMode = mode;
        source.hidden = true; source.tabIndex = -1; source.required = false;
        source.setAttribute("aria-hidden", "true"); source.classList.add("rich-text-source");
        if (source.labels) Array.from(source.labels).forEach(label => { label.htmlFor = editor.id; });
        source.parentNode.insertBefore(editor, source);
        const sync = () => {
            const limit = Number(editor.dataset.maxLength);
            if (Number.isFinite(limit)) truncateRichEditor_(editor, limit);
            source.value = sanitizeHtmlContent(editor.innerHTML, mode);
            source.dispatchEvent(new Event("input", { bubbles: true })); editor.removeAttribute("aria-invalid");
        };
        bindRichTextEditorSelection_(editor);
        editor.addEventListener("compositionstart", () => richEditorComposing_.add(editor));
        editor.addEventListener("compositionend", () => {
            richEditorComposing_.delete(editor);
            cleanRichTextTypingSentinel_(editor);
            sync();
        });
        editor.addEventListener("input", () => {
            if (!richEditorComposing_.has(editor)) cleanRichTextTypingSentinel_(editor);
            sync();
        });
        editor.addEventListener("blur", () => { source.dispatchEvent(new Event("blur")); source.dispatchEvent(new Event("change", { bubbles: true })); });
        editor.addEventListener("paste", event => {
            event.preventDefault();
            const clipboard = event.clipboardData, html = clipboard && clipboard.getData("text/html");
            const plainText = String(clipboard && clipboard.getData("text/plain") || "");
            const safeHtml = html ? sanitizeHtmlContent(html, mode) : "";
            const escapeHtml = value => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
            const insertion = safeHtml || plainText.split(/\r\n?|\n/).map(escapeHtml).join("<br>");
            let inserted = false;
            try { inserted = typeof document.execCommand === "function" && document.execCommand("insertHTML", false, insertion) === true; }
            catch (_) { inserted = false; }
            if (!inserted) {
                const selection = window.getSelection?.();
                if (selection && selection.rangeCount && editor.contains(selection.anchorNode)) {
                    const range = selection.getRangeAt(0); range.deleteContents();
                    const fragment = range.createContextualFragment(insertion), last = fragment.lastChild;
                    range.insertNode(fragment);
                    if (last) { range.setStartAfter(last); range.collapse(true); selection.removeAllRanges(); selection.addRange(range); }
                }
            }
            sync();
        });
        editor.addEventListener("drop", event => event.preventDefault());
        const form = source.form;
        if (form && form.dataset.richVisualValidationBound !== "true") {
            form.dataset.richVisualValidationBound = "true";
            form.addEventListener("submit", event => {
                const invalid = Array.from(form.querySelectorAll("[data-rich-source-id][data-rich-required='true']"))
                    .find(candidate => !String(candidate.textContent || "").trim());
                if (!invalid) return;
                event.preventDefault(); event.stopImmediatePropagation();
                invalid.setAttribute("aria-invalid", "true"); invalid.focus();
                invalid.scrollIntoView?.({ block: "center", behavior: "smooth" });
            }, true);
            form.addEventListener("reset", () => Promise.resolve().then(() => {
                form.querySelectorAll("textarea[data-rich-visual-mounted='true']").forEach(sourceField => {
                    const editorField = document.getElementById(sourceField.id + "-visual-editor");
                    if (editorField) { richEditorPendingFormats_.delete(editorField); richEditorSelectionRanges_.delete(editorField); const anchor=richEditorTypingAnchors_.get(editorField); if(anchor?.sentinel?.data?.includes(RICH_TEXT_CARET_SENTINEL_))anchor.sentinel.deleteData(anchor.sentinel.data.indexOf(RICH_TEXT_CARET_SENTINEL_),1); richEditorTypingAnchors_.delete(editorField); richEditorComposing_.delete(editorField); }
                    syncRichTextEditorFromSource(sourceField);
                });
            }));
        }
        mounted++;
    });
    return mounted;
}

function wrapRichEditorSelection_(editor, styleProperty, styleValue) {
    editor.focus({ preventScroll: true });
    const selection = window.getSelection?.();
    if (!selection || !selection.rangeCount) return false;
    const range = selection.getRangeAt(0);
    if (range.commonAncestorContainer !== editor && !editor.contains(range.commonAncestorContainer)) return false;
    const wrapper = document.createElement("span");
    wrapper.style.setProperty(styleProperty, styleValue);
    if (range.collapsed) {
        const marker = document.createTextNode("\u200b");
        wrapper.appendChild(marker);
        range.insertNode(wrapper);
        range.setStart(marker, 1);
        range.collapse(true);
    } else {
        wrapper.appendChild(range.extractContents());
        range.insertNode(wrapper);
        range.setStartAfter(wrapper);
        range.collapse(true);
    }
    selection.removeAllRanges();
    selection.addRange(range);
    rememberRichTextSelection_(editor);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
}

function applyRichTextToContentEditable_(editor, format, extraValue) {
    if (["bold", "italic", "underline", "strike"].includes(format)) return applyRichTextInlineFormat_(editor, format);
    if (format === "font" && SAFE_FONTS.has(extraValue)) return applyRichTextInlineFormat_(editor, "font", extraValue);
    if (format === "size" && SAFE_SIZES.has(extraValue)) return applyRichTextInlineFormat_(editor, "size", extraValue);
    if (format !== "ul" && format !== "ol") return false;
    restoreRichTextSelection_(editor);
    const command = format === "ul" ? "insertUnorderedList" : "insertOrderedList";
    let applied = false;
    try { applied = typeof document.execCommand === "function" && document.execCommand(command, false, null) === true; } catch (_) { applied = false; }
    if (format === "ul" && applied) {
        const selection = window.getSelection?.();
        const node = selection?.anchorNode?.nodeType === 1 ? selection.anchorNode : selection?.anchorNode?.parentElement;
        const list = node?.closest?.("ul");
        if (list && editor.contains(list)) list.setAttribute("data-gp-marker", SAFE_MARKERS.has(extraValue) ? extraValue : "bullet");
    }
    if (applied) { rememberRichTextSelection_(editor); editor.dispatchEvent(new Event("input", { bubbles: true })); }
    return applied;
}
export function applyRichTextFormat(targetId, format, extraValue = null, options = {}) {
    const target = resolveRichTextTarget_(targetId);
    if (!target) return false;
    const mode = normalizeEditorMode_(options.mode || target.dataset?.richEditorMode) || (options.forceAdvanced ? "advanced" : null);
    if (mode === "basic" && format !== "bold") return false;
    if (mode === "lists" && !["bold", "ul", "ol"].includes(format)) return false;
    if (!mode && getRichTextMode() !== "advanced" && format !== "bold") return false;
    if (isRichContentEditable_(target)) return applyRichTextToContentEditable_(target, format, extraValue);
    attachListKeyboardBehavior(target);
    const start = target.selectionStart, end = target.selectionEnd, selected = target.value.substring(start, end);
    let formatted = "", caretOffset = 0;
    if (format === "ul" || format === "ol") {
        const content = selected || (format === "ol" ? "Primer paso" : "Elemento de lista");
        const items = splitSelectionIntoListItems(content), listItems = items.map(item => "<li>" + item + "</li>").join("");
        formatted = format === "ul" ? '<ul data-gp-marker="' + (SAFE_MARKERS.has(extraValue) ? extraValue : "bullet") + '">' + listItems + "</ul>" : "<ol>" + listItems + "</ol>";
        caretOffset = selected ? formatted.length : formatted.indexOf("<li>") + 4;
    } else if (format === "bold") {
        if (!selected) return false;
        const content = selected; formatted = "<strong>" + content + "</strong>";
        caretOffset = formatted.length;
    } else return false;
    target.value = target.value.substring(0, start) + formatted + target.value.substring(end);
    const cursor = start + caretOffset; target.focus(); target.setSelectionRange(cursor, cursor);
    target.dispatchEvent(new Event("input", { bubbles: true })); return true;
}

export function applyRichTextColor(targetId, color) {
    const target = resolveRichTextTarget_(targetId);
    if (!target) return false;
    const safeColor = /^#[0-9a-f]{3,8}$/i.test(String(color || "")) ? color : "#000000";
    if (isRichContentEditable_(target)) return applyRichTextInlineFormat_(target, "color", safeColor);
    const start = target.selectionStart, end = target.selectionEnd, selected = target.value.substring(start, end);
    if (!selected) return false;
    const formatted = '<span style="color:' + safeColor + '">' + selected + "</span>";
    target.value = target.value.substring(0, start) + formatted + target.value.substring(end);
    target.focus(); target.setSelectionRange(start + formatted.length, start + formatted.length);
    target.dispatchEvent(new Event("input", { bubbles: true })); return true;
}

function attachListKeyboardBehavior(textarea) {
    if (getRichTextMode() !== "advanced") return;
    if (!textarea || isRichContentEditable_(textarea) || textarea.dataset.richListKeyboardBound === "true") return;
    textarea.dataset.richListKeyboardBound = "true";
    textarea.addEventListener("keydown", event => {
        if (getRichTextMode() !== "advanced") return;
        if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
        const value = textarea.value;
        const lower = value.toLowerCase();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const liStart = lower.lastIndexOf("<li", start);
        const liClosedBefore = lower.lastIndexOf("</li>", start);
        if (liStart < 0 || liStart < liClosedBefore) return;

        const liOpenEnd = lower.indexOf(">", liStart);
        const liCloseStart = lower.indexOf("</li>", end);
        if (liOpenEnd < 0 || liCloseStart < 0 || start < liOpenEnd) return;

        const ulStart = lower.lastIndexOf("<ul", liStart);
        const olStart = lower.lastIndexOf("<ol", liStart);
        const listStart = Math.max(ulStart, olStart);
        if (listStart < 0) return;
        const listType = ulStart > olStart ? "ul" : "ol";
        const priorListClose = lower.lastIndexOf(`</${listType}>`, liStart);
        if (priorListClose > listStart) return;
        const listCloseStart = lower.indexOf(`</${listType}>`, liCloseStart + 5);
        if (listCloseStart < 0) return;

        const beforeItem = value.substring(liOpenEnd + 1, start);
        const afterItem = value.substring(end, liCloseStart);
        event.preventDefault();

        if (!beforeItem.trim() && !afterItem.trim()) {
            const nextLi = lower.indexOf("<li", liCloseStart + 5);
            const hasNextItem = nextLi >= 0 && nextLi < listCloseStart;
            const nextValue = value.substring(0, liStart) + value.substring(liCloseStart + 5);
            textarea.value = nextValue;
            if (!hasNextItem) {
                const closeIndex = nextValue.toLowerCase().indexOf(`</${listType}>`, liStart);
                const cursor = closeIndex < 0 ? liStart : closeIndex + listType.length + 3;
                textarea.setSelectionRange(cursor, cursor);
            } else {
                const nextLiStart = nextValue.toLowerCase().indexOf("<li", liStart);
                const nextLiOpenEnd = nextLiStart < 0 ? -1 : nextValue.indexOf(">", nextLiStart);
                const cursor = nextLiOpenEnd < 0 ? liStart : nextLiOpenEnd + 1;
                textarea.setSelectionRange(cursor, cursor);
            }
            return;
        }

        const replacement = "</li><li>";
        textarea.value = value.substring(0, start) + replacement + value.substring(end);
        const cursor = start + replacement.length;
        textarea.setSelectionRange(cursor, cursor);
    });
}


function createCompactRichTextToolbar_(targetId, forceAdvanced) {
    const toolbar = document.createElement("div");
    toolbar.className = "rich-editor-toolbar rich-editor-toolbar-compact";
    toolbar.dataset.richTargetId = String(targetId);
    toolbar.dataset.richTextMode = "advanced";
    toolbar.dataset.richTextForceAdvanced = String(forceAdvanced);
    toolbar.dataset.richTextCompact = "true";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "Formato del mensaje");
    toolbar.addEventListener("pointerdown", event => {
        rememberRichTextSelection_(targetId);
        if (event.target.closest("button, [role='menuitem']") && event.pointerType !== "mouse") event.preventDefault();
    }, true);
    toolbar.addEventListener("mousedown", event => {
        rememberRichTextSelection_(targetId);
        if (event.target.closest("button, [role='menuitem']")) event.preventDefault();
    }, true);
    const closeMenus = except => toolbar.querySelectorAll(".rich-toolbar-dropdown.is-open").forEach(group => {
        if (group === except) return;
        group.classList.remove("is-open");
        group.querySelector(".rich-toolbar-icon-button")?.setAttribute("aria-expanded", "false");
        const menu = group.querySelector(".rich-toolbar-menu");
        if (menu) menu.hidden = true;
    });
    const makeIconButton = (icon, title, callback) => {
        const button = document.createElement("button");
        button.type = "button"; button.className = "rich-toolbar-icon-button";
        button.title = title; button.setAttribute("aria-label", title);
        button.innerHTML = '<i class="fa-solid ' + icon + '" aria-hidden="true"></i>';
        button.addEventListener("pointerdown", event => { if (event.pointerType !== "mouse") event.preventDefault(); });
        button.addEventListener("mousedown", event => event.preventDefault());
        button.addEventListener("click", event => { event.preventDefault(); closeMenus(); callback(); });
        return button;
    };
    const addDropdown = (icon, title, items) => {
        const group = document.createElement("div"); group.className = "rich-toolbar-dropdown";
        const trigger = document.createElement("button");
        trigger.type = "button"; trigger.className = "rich-toolbar-icon-button";
        trigger.title = title; trigger.setAttribute("aria-label", title);
        trigger.setAttribute("aria-haspopup", "menu"); trigger.setAttribute("aria-expanded", "false");
        trigger.innerHTML = '<i class="fa-solid ' + icon + '" aria-hidden="true"></i>';
        trigger.addEventListener("pointerdown", event => { if (event.pointerType !== "mouse") event.preventDefault(); });
        trigger.addEventListener("mousedown", event => event.preventDefault());
        const menu = document.createElement("div"); menu.className = "rich-toolbar-menu";
        menu.setAttribute("role", "menu"); menu.hidden = true;
        items.forEach(item => {
            const option = document.createElement("button");
            option.type = "button"; option.className = "rich-toolbar-menu-item";
            option.setAttribute("role", "menuitem"); option.textContent = item.label;
            option.addEventListener("pointerdown", event => { if (event.pointerType !== "mouse") event.preventDefault(); });
            option.addEventListener("mousedown", event => event.preventDefault());
            option.addEventListener("click", event => { event.preventDefault(); item.action(); closeMenus(); });
            menu.appendChild(option);
        });
        trigger.addEventListener("click", event => {
            event.preventDefault();
            const opening = !group.classList.contains("is-open");
            closeMenus(group); group.classList.toggle("is-open", opening);
            trigger.setAttribute("aria-expanded", String(opening)); menu.hidden = !opening;
            if (opening) positionRichTextMenu(menu, trigger, "left");
        });
        group.append(trigger, menu); toolbar.appendChild(group);
    };
    toolbar.appendChild(makeIconButton("fa-bold", "Negrita", () => applyRichTextFormat(targetId, "bold", null, { forceAdvanced })));
    toolbar.appendChild(makeIconButton("fa-italic", "Cursiva", () => applyRichTextFormat(targetId, "italic", null, { forceAdvanced })));
    toolbar.appendChild(makeIconButton("fa-underline", "Subrayado", () => applyRichTextFormat(targetId, "underline", null, { forceAdvanced })));
    toolbar.appendChild(makeIconButton("fa-strikethrough", "Tachado", () => applyRichTextFormat(targetId, "strike", null, { forceAdvanced })));
    const colorGroup = document.createElement("div"); colorGroup.className = "rich-toolbar-color-group";
    const colorPicker = document.createElement("input"); colorPicker.type = "color";
    colorPicker.className = "rich-toolbar-color-input"; colorPicker.title = "Color de texto";
    colorPicker.setAttribute("aria-label", "Color de texto");
    const colorButton = makeIconButton("fa-palette", "Color de texto", () => colorPicker.click());
    toolbar.addEventListener("pointerdown", event => {
        rememberRichTextSelection_(targetId);
        if (event.target.closest("button, [role='menuitem']") && event.pointerType !== "mouse") event.preventDefault();
    }, true);
    toolbar.addEventListener("mousedown", event => {
        rememberRichTextSelection_(targetId);
        if (event.target.closest("button, [role='menuitem']")) event.preventDefault();
    }, true);
    colorPicker.addEventListener("pointerdown", () => rememberRichTextSelection_(targetId));
    colorPicker.addEventListener("change", event => {
        applyRichTextColor(targetId, event.target.value);
        
    });
    colorGroup.append(colorButton, colorPicker); toolbar.appendChild(colorGroup);
    addDropdown("fa-text-height", "Tamaño de texto", [
        { label:"Pequeño", action:()=>applyRichTextFormat(targetId,"size","0.85em",{forceAdvanced}) },
        { label:"Normal", action:()=>applyRichTextFormat(targetId,"size","1em",{forceAdvanced}) },
        { label:"Grande", action:()=>applyRichTextFormat(targetId,"size","1.2em",{forceAdvanced}) },
        { label:"Encabezado", action:()=>applyRichTextFormat(targetId,"size","1.5em",{forceAdvanced}) }
    ]);
    addDropdown("fa-font", "Tipo de fuente", [
        ...Array.from(SAFE_FONTS.keys()).map(font => ({
            label:font, action:()=>applyRichTextFormat(targetId,"font",font,{forceAdvanced})
        }))
    ]);
    addDropdown("fa-list-ul", "Listas y marcadores", [
        { label:"Viñetas", action:()=>applyRichTextFormat(targetId,"ul","bullet",{forceAdvanced}) },
        { label:"Guiones", action:()=>applyRichTextFormat(targetId,"ul","hyphen",{forceAdvanced}) },
        { label:"Flechas", action:()=>applyRichTextFormat(targetId,"ul","arrow",{forceAdvanced}) },
        { label:"Verificación", action:()=>applyRichTextFormat(targetId,"ul","check",{forceAdvanced}) },
        { label:"Lista numerada", action:()=>applyRichTextFormat(targetId,"ol",null,{forceAdvanced}) }
    ]);
    toolbar.appendChild(makeIconButton("fa-copy", "Copiar texto seleccionado", () => copyRichTextSelection_(targetId)));
    toolbar.appendChild(makeIconButton("fa-paste", "Pegar texto", () => pasteRichTextSelection_(targetId)));
    toolbar.addEventListener("click", event => { if (!event.target.closest(".rich-toolbar-dropdown")) closeMenus(); });
    return toolbar;
}

export function createRichTextToolbar(targetId, options = {}) {
    bindRichToolbarOutsideDismiss_();
    const forceAdvanced = options.forceAdvanced === true;
    const editorMode = normalizeEditorMode_(options.mode) || (forceAdvanced ? "advanced" : (getRichTextMode() === "advanced" ? "advanced" : "basic"));
    const isFull = editorMode === "advanced", hasLists = editorMode === "lists" || isFull;
    if (options.compact === true) return createCompactRichTextToolbar_(targetId, true);
    const toolbar = document.createElement("div");
    toolbar.className = "rich-editor-toolbar rich-editor-toolbar-compact";
    toolbar.dataset.richTargetId = String(targetId);
    toolbar.dataset.richTextMode = editorMode;
    toolbar.dataset.richTextForceAdvanced = String(isFull);
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "Formato de texto");
    toolbar.addEventListener("pointerdown", event => {
        rememberRichTextSelection_(targetId);
        if (event.target.closest("button, [role='menuitem']") && event.pointerType !== "mouse") event.preventDefault();
    }, true);
    toolbar.addEventListener("mousedown", event => {
        rememberRichTextSelection_(targetId);
        if (event.target.closest("button, [role='menuitem']")) event.preventDefault();
    }, true);
    const makeButton = (icon, title, callback) => {
        const button = document.createElement("button");
        button.type = "button"; button.className = "rich-toolbar-icon-button";
        button.title = title; button.setAttribute("aria-label", title);
        button.innerHTML = '<i class="fa-solid ' + icon + '" aria-hidden="true"></i>';
        button.addEventListener("mousedown", event => event.preventDefault());
        button.addEventListener("click", event => { event.preventDefault(); callback(); });
        return button;
    };
    const applyOptions = { mode: editorMode, forceAdvanced: isFull };
    toolbar.appendChild(makeButton("fa-bold", "Negrita", () => applyRichTextFormat(targetId, "bold", null, applyOptions)));
    if (isFull) {
        toolbar.appendChild(makeButton("fa-italic", "Cursiva", () => applyRichTextFormat(targetId, "italic", null, applyOptions)));
        toolbar.appendChild(makeButton("fa-underline", "Subrayado", () => applyRichTextFormat(targetId, "underline", null, applyOptions)));
        toolbar.appendChild(makeButton("fa-strikethrough", "Tachado", () => applyRichTextFormat(targetId, "strike", null, applyOptions)));
    }
    const colorGroup = document.createElement("div"); colorGroup.className = "rich-toolbar-color-group";
    const colorPicker = document.createElement("input"); colorPicker.type = "color";
    colorPicker.className = "rich-toolbar-color-input"; colorPicker.title = "Color de texto";
    colorPicker.setAttribute("aria-label", "Color de texto");
    const colorButton = makeButton("fa-palette", "Color de texto", () => colorPicker.click());
    colorPicker.addEventListener("input", event => applyRichTextColor(targetId, event.target.value));
    colorGroup.append(colorButton, colorPicker); toolbar.appendChild(colorGroup);
    if (isFull) {
        const sizeSelect = document.createElement("select");
        sizeSelect.className = "rich-toolbar-native-select";
        sizeSelect.title = "Tamaño de fuente"; sizeSelect.setAttribute("aria-label", "Tamaño de fuente");
        sizeSelect.innerHTML = '<option value="">Tamaño</option><option value="0.85em">Pequeño</option><option value="1em">Normal</option><option value="1.2em">Grande</option><option value="1.5em">Encabezado</option>';
        sizeSelect.addEventListener("pointerdown", () => rememberRichTextSelection_(targetId));
        sizeSelect.addEventListener("mousedown", () => rememberRichTextSelection_(targetId));
        sizeSelect.addEventListener("change", event => { if (event.target.value) applyRichTextFormat(targetId, "size", event.target.value, applyOptions); event.target.value = "";  });
        toolbar.appendChild(sizeSelect);
        const fontSelect = document.createElement("select");
        fontSelect.className = "rich-toolbar-native-select";
        fontSelect.title = "Tipo de fuente"; fontSelect.setAttribute("aria-label", "Tipo de fuente");
        fontSelect.innerHTML = '<option value="">Fuente</option>' + Array.from(SAFE_FONTS.keys()).map(font => '<option value="' + font + '">' + font + '</option>').join("");
        fontSelect.addEventListener("pointerdown", () => rememberRichTextSelection_(targetId));
        fontSelect.addEventListener("mousedown", () => rememberRichTextSelection_(targetId));
        fontSelect.addEventListener("change", event => { if (event.target.value) applyRichTextFormat(targetId, "font", event.target.value, applyOptions); event.target.value = "";  });
        toolbar.appendChild(fontSelect);
    }
    const closeMenus = except => toolbar.querySelectorAll(".rich-toolbar-dropdown.is-open").forEach(group => {
        if (group === except) return;
        group.classList.remove("is-open");
        group.querySelector(".rich-toolbar-icon-button")?.setAttribute("aria-expanded", "false");
        const menu = group.querySelector(".rich-toolbar-menu");
        if (menu) menu.hidden = true;
    });
    const addDropdown = (icon, title, items) => {
        const group = document.createElement("div");
        group.className = "rich-toolbar-dropdown";
        const trigger = makeButton(icon, title, () => {
            const opening = !group.classList.contains("is-open");
            closeMenus(group);
            group.classList.toggle("is-open", opening);
            trigger.setAttribute("aria-haspopup", "menu");
            trigger.setAttribute("aria-expanded", String(opening));
            menu.hidden = !opening;
            if (opening) positionRichTextMenu(menu, trigger, "left");
        });
        trigger.setAttribute("aria-haspopup", "menu");
        trigger.setAttribute("aria-expanded", "false");
        const menu = document.createElement("div");
        menu.className = "rich-toolbar-menu";
        menu.setAttribute("role", "menu");
        menu.hidden = true;
        items.forEach(item => {
            const option = document.createElement("button");
            option.type = "button";
            option.className = "rich-toolbar-menu-item";
            option.setAttribute("role", "menuitem");
            option.textContent = item.label;
            option.addEventListener("pointerdown", event => { if (event.pointerType !== "mouse") event.preventDefault(); });
            option.addEventListener("mousedown", event => event.preventDefault());
            option.addEventListener("click", event => {
                event.preventDefault();
                closeMenus();
                item.action();
            });
            menu.appendChild(option);
        });
        group.append(trigger, menu);
        toolbar.appendChild(group);
    };
    if (hasLists) {
        addDropdown("fa-list-ul", "Listas y marcadores", [
            { label: "Viñetas", action: () => applyRichTextFormat(targetId, "ul", "bullet", applyOptions) },
            { label: "Guiones", action: () => applyRichTextFormat(targetId, "ul", "hyphen", applyOptions) },
            { label: "Flechas", action: () => applyRichTextFormat(targetId, "ul", "arrow", applyOptions) },
            { label: "Verificación", action: () => applyRichTextFormat(targetId, "ul", "check", applyOptions) },
            { label: "Lista numerada", action: () => applyRichTextFormat(targetId, "ol", null, applyOptions) }
        ]);
        toolbar.addEventListener("click", event => {
            if (!event.target.closest(".rich-toolbar-dropdown")) closeMenus();
        });
    }
    toolbar.appendChild(makeButton("fa-copy", "Copiar texto seleccionado", () => copyRichTextSelection_(targetId)));
    toolbar.appendChild(makeButton("fa-paste", "Pegar texto", () => pasteRichTextSelection_(targetId)));
    if (isFull) Promise.resolve().then(() => attachListKeyboardBehavior(resolveRichTextTarget_(targetId)));
    return toolbar;
}

export function refreshRichTextToolbars(root = document) {
    if (!root || typeof root.querySelectorAll !== "function") return 0;
    const toolbars = Array.from(root.querySelectorAll(".rich-editor-toolbar[data-rich-target-id]"));
    let refreshed = 0;
    toolbars.forEach(toolbar => {
        const targetId = toolbar.dataset.richTargetId;
        if (!targetId || !toolbar.parentNode) return;
        const nextToolbar = createRichTextToolbar(targetId, {
            mode: toolbar.dataset.richTextMode,
            forceAdvanced: toolbar.dataset.richTextForceAdvanced === "true",
            compact: toolbar.dataset.richTextCompact === "true"
        });
        toolbar.classList.forEach(className => nextToolbar.classList.add(className));
        Array.from(toolbar.children).filter(child => child.dataset.richToolbarPersist === "true").forEach(child => {
            if (child.dataset.richToolbarPosition === "start") nextToolbar.insertBefore(child, nextToolbar.firstChild);
            else nextToolbar.appendChild(child);
        });
        toolbar.replaceWith(nextToolbar); refreshed++;
    });
    mountRichTextEditors(root); return refreshed;
}

function sanitizeSafeStyle(styleText, mode = getRichTextMode()) {
    const safe = [];
    const allowedColors = value => /^#[0-9a-f]{3,8}$/i.test(value) || /^(rgb|rgba)\([0-9.,%\s]+\)$/i.test(value) || SAFE_NAMED_COLORS.has(value.toLowerCase());
    String(styleText || "").split(";").forEach(declaration => {
        const separator = declaration.indexOf(":");
        if (separator < 0) return;
        const property = declaration.substring(0, separator).trim().toLowerCase();
        const value = declaration.substring(separator + 1).trim();
        const lower = value.toLowerCase();
        if (lower.includes("url(") || lower.includes("expression") || lower.includes("javascript:")) return;
        if (property === "color" && allowedColors(value)) safe.push(`color:${value}`);
        else if (mode === "advanced" && property === "font-size" && SAFE_SIZES.has(value)) safe.push(`font-size:${value}`);
        else if (mode === "advanced" && property === "font-family" && SAFE_FONT_VALUES.has(value)) safe.push(`font-family:${value}`);
        else if (mode === "advanced" && property === "float" && /^(left|right|none)$/i.test(value)) safe.push(`float:${value}`);
        else if (mode === "advanced" && ["height", "width", "margin-left"].includes(property) && /^(auto|\d{1,3}px|\d{1,3}%|\d{1,2}(?:\.\d+)?em)$/i.test(value)) safe.push(`${property}:${value}`);
        else if (mode === "advanced" && property === "text-align" && /^(left|right|center|justify)$/i.test(value)) safe.push(`text-align:${value}`);
    });
    return safe.join(";");
}

export function sanitizeHtmlContent(htmlStr, modeOverride = null) {
    if (!htmlStr) return "";
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(htmlStr), "text/html");
    const mode = normalizeEditorMode_(modeOverride) || (getRichTextMode() === "advanced" ? "advanced" : "basic");
    const allowedTags = mode === "advanced"
        ? new Set(["B", "STRONG", "SPAN", "BR", "P", "DIV", "I", "EM", "U", "S", "STRIKE", "OL", "UL", "LI", "A", "IMG", "SMALL", "MARK", "FONT"])
        : mode === "lists"
            ? new Set(["B", "STRONG", "SPAN", "BR", "P", "DIV", "OL", "UL", "LI"])
            : new Set(["B", "STRONG", "SPAN", "BR", "P", "DIV"]);
    const dropContentTags = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "MATH", "TEMPLATE", "FORM", "TEXTAREA", "SELECT", "OPTION", "BUTTON", "INPUT", "META", "LINK", "BASE", "VIDEO", "AUDIO", "SOURCE", "CANVAS", "APPLET", "NOSCRIPT"]);
    const safeUrl = (value, image = false) => {
        const url = String(value || "").trim();
        if (/^https?:\/\//i.test(url)) return url;
        if (!image && /^(mailto|tel):/i.test(url)) return url;
        return "";
    };

    function cleanNode(node) {
        Array.from(node.childNodes).forEach(child => {
            if (child.nodeType !== 1) return;
            if (!allowedTags.has(child.tagName)) {
                if (dropContentTags.has(child.tagName)) child.remove();
                else node.replaceChild(doc.createTextNode(child.textContent || ""), child);
                return;
            }

            Array.from(child.attributes).forEach(attribute => {
                const name = attribute.name.toLowerCase();
                const value = attribute.value;
                const tag = child.tagName;
                let keep = false;

                if (name === "style") {
                    const safeStyle = sanitizeSafeStyle(value, mode);
                    if (safeStyle) child.setAttribute("style", safeStyle);
                    else child.removeAttribute("style");
                    return;
                }
                if (name.startsWith("on") || name === "srcdoc" || name === "formaction" || name === "xlink:href") {
                    child.removeAttribute(attribute.name);
                    return;
                }
                if (tag === "A" && name === "href") {
                    const safe = safeUrl(value, false);
                    if (safe) child.setAttribute("href", safe);
                    else child.removeAttribute("href");
                    return;
                }
                if (tag === "A" && name === "target" && value === "_blank") keep = true;
                if (tag === "A" && name === "rel" && /^(noopener|noreferrer|nofollow)(\s+(noopener|noreferrer|nofollow))*$/i.test(value)) keep = true;
                if (tag === "A" && name === "title") keep = true;
                if (tag === "IMG" && name === "src") {
                    const safe = safeUrl(value, true);
                    if (safe) child.setAttribute("src", safe);
                    else child.removeAttribute("src");
                    return;
                }
                if (tag === "IMG" && name === "alt") keep = true;
                if (tag === "IMG" && ["width", "height"].includes(name) && /^\d{1,4}$/.test(value)) keep = true;
                if (tag === "UL" && name === "data-gp-marker") {
                    if (SAFE_MARKERS.has(value)) child.setAttribute(name, value);
                    else child.removeAttribute(name);
                    return;
                }
                if (tag === "OL" && name === "start" && /^\d{1,4}$/.test(value)) keep = true;
                if (tag === "FONT" && ["color", "face", "size"].includes(name)) {
                    if (name === "color" && (/^#[0-9a-f]{3,8}$/i.test(value) || SAFE_NAMED_COLORS.has(value.toLowerCase()))) keep = true;
                    if (name === "face" && SAFE_FONT_VALUES.has(value)) keep = true;
                    if (name === "size" && /^[1-7]$/.test(value)) keep = true;
                }
                if (!keep) child.removeAttribute(attribute.name);
            });

            if (child.tagName === "A" && child.getAttribute("target") === "_blank") {
                child.setAttribute("rel", "noopener noreferrer");
            }
            cleanNode(child);
        });
    }

    function normalizeTextNewlines(parent) {
        const children = Array.from(parent.childNodes);
        children.forEach(child => {
            if (child.nodeType === 3) {
                let text = child.nodeValue || "";
                if (!/[\r\n]/.test(text)) return;
                const hasElementChildren = children.some(node => node.nodeType === 1);
                if (!text.trim() && hasElementChildren) return;
                text = text.replace(/\r\n?/g, "\n");
                if (child.previousSibling && child.previousSibling.nodeType === 1 && child.previousSibling.tagName === "BR") {
                    text = text.replace(/^\n/, "");
                }
                if (child.nextSibling && child.nextSibling.nodeType === 1 && child.nextSibling.tagName === "BR") {
                    text = text.replace(/\n$/, "");
                }
                const parts = text.split("\n");
                const fragment = doc.createDocumentFragment();
                parts.forEach((part, index) => {
                    if (part) fragment.appendChild(doc.createTextNode(part));
                    if (index < parts.length - 1) fragment.appendChild(doc.createElement("br"));
                });
                parent.replaceChild(fragment, child);
            } else if (child.nodeType === 1) {
                normalizeTextNewlines(child);
            }
        });
    }

    cleanNode(doc.body);
    normalizeTextNewlines(doc.body);
    return doc.body.innerHTML;
}
