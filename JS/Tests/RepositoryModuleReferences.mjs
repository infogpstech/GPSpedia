import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const files = new Set();
function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (entry.isFile() && [".js", ".mjs"].includes(extname(entry.name).toLowerCase())) files.add(path);
    }
}
walk(join(root, "JS/Frontend"));
walk(join(root, "JS/Services"));
const runnerPath = join(root, "JS/Tests/RunServiceTests.mjs");
files.add(runnerPath);
const runnerSource = readFileSync(runnerPath, "utf8");
for (const match of runnerSource.matchAll(/["'](JS\/Tests\/[^"']+\.(?:js|mjs))["']/g)) {
    const path = resolve(root, match[1]);
    if (existsSync(path)) files.add(path);
}
const serviceWorker = join(root, "service-worker.js");
if (existsSync(serviceWorker)) files.add(serviceWorker);

const references = [];
const patterns = [
    /^\s*import\s+(?:[^'";]*?\s+from\s*)?["'](\.{1,2}\/[^"']+)["']/gm,
    /^\s*export\s+[^'";]*?\s+from\s*["'](\.{1,2}\/[^"']+)["']/gm,
    /\bimport\s*\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g,
    /\bnew\s+URL\(\s*["'](\.{1,2}\/[^"']+)["']\s*,\s*import\.meta\.url\s*\)/g,
    /\brequire\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g
];
for (const file of [...files].sort()) {
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
