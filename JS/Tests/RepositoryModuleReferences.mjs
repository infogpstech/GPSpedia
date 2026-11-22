import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const excluded = new Set([".git", "node_modules"]);
const files = [];
function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!excluded.has(entry.name)) walk(join(directory, entry.name));
        } else if (entry.isFile() && [".js", ".mjs"].includes(extname(entry.name).toLowerCase())) {
            files.push(join(directory, entry.name));
        }
    }
}
walk(root);

const references = [];
const patterns = [
    /^\s*import\s+(?:[^'";]*?\s+from\s*)?["'](\.{1,2}\/[^"']+)["']/gm,
    /^\s*export\s+[^'";]*?\s+from\s*["'](\.{1,2}\/[^"']+)["']/gm,
    /\bimport\s*\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g,
    /\bnew\s+URL\(\s*["'](\.{1,2}\/[^"']+)["']\s*,\s*import\.meta\.url\s*\)/g,
    /\brequire\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g
];
for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const pattern of patterns) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(source))) {
            const specifier = match[1].split(/[?#]/, 1)[0];
            const target = resolve(dirname(file), specifier);
            const candidates = [
                target, target + ".js", target + ".mjs", target + ".json",
                join(target, "index.js"), join(target, "index.mjs")
            ];
            if (!candidates.some(existsSync)) {
                references.push({
                    from: relative(root, file),
                    line: source.slice(0, match.index).split("\n").length,
                    specifier
                });
            }
        }
    }
}
assert.deepEqual(references, [], "Referencias relativas no resueltas:\n" + JSON.stringify(references, null, 2));
console.log("RepositoryModuleReferences: 1/1 PASS — " + files.length + " archivos inspeccionados; referencias relativas resueltas");
