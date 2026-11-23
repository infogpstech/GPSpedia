import { readFileSync } from "node:fs";
import { runPysAccordionTitleTests } from "./PysAccordionTitle.js";

const ui = readFileSync(new URL("../Frontend/ui.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../../style.css", import.meta.url), "utf8");
const result = runPysAccordionTitleTests({ ui, css });
console.log("PysAccordionTitle: " + result.passed + "/" + (result.passed + result.failed) + " PASS");
if (result.failed) {
    console.error(JSON.stringify(result.results.filter(item => item.status !== "PASS")));
    process.exitCode = 1;
}
