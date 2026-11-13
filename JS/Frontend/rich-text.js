import { getRichTextMode } from './api-config.js';

/* Utilidades compartidas para los editores de texto enriquecido de GPSpedia. */

const SAFE_MARKERS = new Set(["hyphen", "arrow", "check", "bullet"]);
const SAFE_FONT_VALUES = new Set([
    "Arial, sans-serif",
    "'Segoe UI', Roboto, sans-serif",
    "'Courier New', monospace",
    "Georgia, serif"
]);
const SAFE_FONTS = new Map([
    ["Arial", "Arial, sans-serif"],
    ["Segoe UI", "'Segoe UI', Roboto, sans-serif"],
    ["Courier New", "'Courier New', monospace"],
    ["Georgia", "Georgia, serif"]
]);
const SAFE_SIZES = new Set(["0.85em", "1em", "1.2em", "1.5em"]);
const SAFE_NAMED_COLORS = new Set(["red", "blue", "green", "black", "white", "orange", "yellow", "gray", "grey", "purple", "teal", "navy"]);

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

export function applyRichTextFormat(targetId, format, extraValue = null) {
    if (getRichTextMode() !== "advanced" && format !== "bold") return;
    const textarea = document.getElementById(targetId);
    if (!textarea) return;
    attachListKeyboardBehavior(textarea);

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    let openTag = "";
    let closeTag = "";
    let formatted = "";
    let caretOffset = 0;

    if (format === "ul" || format === "ol") {
        const selectedTrimmed = selected.trim();
        const openMatch = selectedTrimmed.match(/^<(ul|ol)\b([^>]*)>/i);
        const leading = selected.match(/^\s*/)[0];
        const trailing = selected.match(/\s*$/)[0];
        const selectedListClose = openMatch ? `</${openMatch[1].toLowerCase()}>` : "";
        const isWholeList = Boolean(openMatch && selectedTrimmed.toLowerCase().endsWith(selectedListClose));

        if (isWholeList) {
            const openEnd = selectedTrimmed.indexOf(">") + 1;
            const inner = selectedTrimmed.slice(openEnd, -selectedListClose.length);
            const currentType = openMatch[1].toLowerCase();
            if (format === "ul") {
                const marker = SAFE_MARKERS.has(extraValue) ? extraValue : "bullet";
                const safeAttributes = currentType === "ul"
                    ? openMatch[2].replace(/\sdata-gp-marker=(["']).*?\1/ig, "")
                    : "";
                formatted = `${leading}<ul${safeAttributes} data-gp-marker="${marker}">${inner}</ul>${trailing}`;
            } else if (currentType === "ol") {
                formatted = selected;
            } else {
                formatted = `${leading}<ol>${inner}</ol>${trailing}`;
            }
            caretOffset = formatted.length;
        } else {
            const content = selected || (format === "ol" ? "Primer paso" : "Elemento de lista");
            const items = splitSelectionIntoListItems(content);
            const listItems = items.map(item => `<li>${item}</li>`).join("");
            if (format === "ul") {
                const marker = SAFE_MARKERS.has(extraValue) ? extraValue : "bullet";
                formatted = `<ul data-gp-marker="${marker}">${listItems}</ul>`;
            } else {
                formatted = `<ol>${listItems}</ol>`;
            }
            const firstItemStart = formatted.indexOf("<li>") + 4;
            caretOffset = selected ? formatted.length : firstItemStart;
        }
    } else {
        const placeholders = {
            bold: "texto en negrita",
            italic: "texto en cursiva",
            underline: "texto subrayado",
            strike: "texto tachado",
            font: "texto",
            size: "texto"
        };
        const content = selected || placeholders[format] || "texto";
        if (format === "bold") [openTag, closeTag] = ["<strong>", "</strong>"];
        else if (format === "italic") [openTag, closeTag] = ["<em>", "</em>"];
        else if (format === "underline") [openTag, closeTag] = ["<u>", "</u>"];
        else if (format === "strike") [openTag, closeTag] = ["<s>", "</s>"];
        else if (format === "font" && SAFE_FONTS.has(extraValue)) {
            openTag = `<span style="font-family:${SAFE_FONTS.get(extraValue)}">`;
            closeTag = "</span>";
        } else if (format === "size" && SAFE_SIZES.has(extraValue)) {
            openTag = `<span style="font-size:${extraValue}">`;
            closeTag = "</span>";
        } else {
            return;
        }
        formatted = `${openTag}${content}${closeTag}`;
        caretOffset = selected ? formatted.length : openTag.length + content.length;
    }

    textarea.value = textarea.value.substring(0, start) + formatted + textarea.value.substring(end);
    const cursor = start + caretOffset;
    textarea.focus();
    textarea.setSelectionRange(cursor, cursor);
}

export function applyRichTextColor(targetId, color) {
    const textarea = document.getElementById(targetId);
    if (!textarea) return;
    attachListKeyboardBehavior(textarea);
    const safeColor = /^#[0-9a-f]{3,8}$/i.test(String(color || "")) ? color : "#000000";
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end) || "texto";
    const formatted = `<span style="color:${safeColor}">${selected}</span>`;
    textarea.value = textarea.value.substring(0, start) + formatted + textarea.value.substring(end);
    textarea.focus();
    textarea.setSelectionRange(start + formatted.length, start + formatted.length);
}

function attachListKeyboardBehavior(textarea) {
    if (getRichTextMode() !== "advanced") return;
    if (!textarea || textarea.dataset.richListKeyboardBound === "true") return;
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

export function createRichTextToolbar(targetId) {
    const mode = getRichTextMode();
    const isAdvanced = mode === "advanced";
    const toolbar = document.createElement("div");
    toolbar.className = "rich-editor-toolbar";
    toolbar.dataset.richTargetId = String(targetId);
    toolbar.dataset.richTextMode = mode;
    toolbar.style.cssText = "display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:4px;";

    const makeButton = (label, title, callback) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-secondary btn-sm";
        button.title = title;
        button.textContent = label;
        button.style.cssText = "padding:2px 8px; font-size:0.85rem; height:28px; min-width:28px;";
        button.addEventListener("click", event => {
            event.preventDefault();
            callback();
        });
        return button;
    };

    toolbar.appendChild(makeButton("B", "Negrita", () => applyRichTextFormat(targetId, "bold")));

    if (isAdvanced) {
        toolbar.appendChild(makeButton("I", "Cursiva", () => applyRichTextFormat(targetId, "italic")));
        toolbar.appendChild(makeButton("U", "Subrayado", () => applyRichTextFormat(targetId, "underline")));
        toolbar.appendChild(makeButton("S", "Tachado", () => applyRichTextFormat(targetId, "strike")));
    }

    const colorPicker = document.createElement("input");
    colorPicker.type = "color";
    colorPicker.title = "Color de texto";
    colorPicker.style.cssText = "width:28px; height:28px; padding:0; border:none; cursor:pointer; border-radius:4px;";
    colorPicker.addEventListener("change", event => applyRichTextColor(targetId, event.target.value));
    toolbar.appendChild(colorPicker);

    if (isAdvanced) {
        const sizeSelect = document.createElement("select");
        sizeSelect.title = "Tamaño de fuente";
        sizeSelect.style.cssText = "height:28px; padding:2px 4px; border:1px solid var(--border-color, #ccc); border-radius:4px;";
        sizeSelect.innerHTML = '<option value="">Tamaño</option><option value="0.85em">Pequeño</option><option value="1em">Normal</option><option value="1.2em">Grande</option><option value="1.5em">Encabezado</option>';
        sizeSelect.addEventListener("change", event => {
            if (event.target.value) applyRichTextFormat(targetId, "size", event.target.value);
            event.target.value = "";
        });
        toolbar.appendChild(sizeSelect);

        const fontSelect = document.createElement("select");
        fontSelect.title = "Tipo de fuente";
        fontSelect.style.cssText = "height:28px; padding:2px 4px; border:1px solid var(--border-color, #ccc); border-radius:4px;";
        fontSelect.innerHTML = '<option value="">Fuente</option><option value="Arial">Arial</option><option value="Segoe UI">Segoe UI</option><option value="Courier New">Monospace</option><option value="Georgia">Georgia</option>';
        fontSelect.addEventListener("change", event => {
            if (event.target.value) applyRichTextFormat(targetId, "font", event.target.value);
            event.target.value = "";
        });
        toolbar.appendChild(fontSelect);

        const markerSelect = document.createElement("select");
        markerSelect.title = "Marcador de lista no ordenada";
        markerSelect.setAttribute("aria-label", "Marcador de lista no ordenada");
        markerSelect.style.cssText = "height:28px; padding:2px 4px; border:1px solid var(--border-color, #ccc); border-radius:4px;";
        markerSelect.innerHTML = '<option value="bullet">• Viñeta</option><option value="hyphen">- Guion</option><option value="arrow">→ Flecha</option><option value="check">✓ Verificación</option>';
        toolbar.appendChild(markerSelect);
        toolbar.appendChild(makeButton("• Lista", "Lista no ordenada", () => applyRichTextFormat(targetId, "ul", markerSelect.value)));
        toolbar.appendChild(makeButton("1. Lista", "Lista ordenada", () => applyRichTextFormat(targetId, "ol")));
    }

    if (isAdvanced) {
        Promise.resolve().then(() => attachListKeyboardBehavior(document.getElementById(targetId)));
    }
    return toolbar;
}

export function refreshRichTextToolbars(root = document) {
    if (!root || typeof root.querySelectorAll !== "function") return 0;
    const toolbars = Array.from(root.querySelectorAll(".rich-editor-toolbar[data-rich-target-id]"));
    let refreshed = 0;
    toolbars.forEach(toolbar => {
        const targetId = toolbar.dataset.richTargetId;
        if (!targetId || !toolbar.parentNode) return;
        toolbar.replaceWith(createRichTextToolbar(targetId));
        refreshed++;
    });
    return refreshed;
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

export function sanitizeHtmlContent(htmlStr) {
    if (!htmlStr) return "";
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(htmlStr), "text/html");
    const mode = getRichTextMode();
    const allowedTags = mode === "advanced"
        ? new Set(["B", "STRONG", "SPAN", "BR", "P", "DIV", "I", "EM", "U", "S", "STRIKE", "OL", "UL", "LI", "A", "IMG", "SMALL", "MARK", "FONT"])
        : new Set(["B", "STRONG", "SPAN", "BR"]);
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
