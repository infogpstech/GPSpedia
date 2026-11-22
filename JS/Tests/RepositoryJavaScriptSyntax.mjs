import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const excluded = new Set([".git", "node_modules"]);
const files = [];
function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!excluded.has(entry.name)) walk(join(directory, entry.name));
            continue;
        }
        if (entry.isFile() && [".js", ".mjs"].includes(extname(entry.name).toLowerCase())) {
            files.push(join(directory, entry.name));
        }
    }
}
walk(root);
files.sort();
assert.ok(files.length > 0, "No se encontraron archivos JavaScript para validar.");

const failures = [];
for (const file of files) {
    const result = spawnSync(process.execPath,
        ["--experimental-default-type=module", "--check", file],
        { cwd: root, encoding: "utf8", timeout: 15000, maxBuffer: 1024 * 1024 });
    if (result.error || result.status !== 0) {
        failures.push({
            file: relative(root, file),
            status: result.status,
            error: result.error && result.error.message,
            output: String(result.stderr || result.stdout || "").trim().slice(0, 1200)
        });
    }
}
assert.deepEqual(failures, [], "Archivos con sintaxis inválida:\n" + JSON.stringify(failures, null, 2));
console.log("RepositoryJavaScriptSyntax: 1/1 PASS — sintaxis verificada en " + files.length + " archivos .js/.mjs");
