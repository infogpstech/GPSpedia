import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const adminSource = read("../Services/admin.js");
const testSource = read("./VinTestigoIntegrity.js");
const runTests = new Function(adminSource + "\n" + testSource + "\nreturn runVinTestigoIntegrityTests;")();
const result = runTests();
if (!result || typeof result !== "object") {
    console.error("VinTestigoIntegrity: no se obtuvo un resultado.");
    process.exitCode = 1;
} else {
    const total = Number(result.passed || 0) + Number(result.failed || 0);
    console.log("VinTestigoIntegrity: " + Number(result.passed || 0) + "/" + total + " PASS");
    if (result.failed || result.status === "FAIL") process.exitCode = 1;
}
