import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const names = ["recordDisplaySummary", "noteEntries", "splitUpdateIndex", "excerptFromBody", "cleanSummaryText", "cleanExcerptLine"];
const contexts = ["../components/archive/record-utils.ts", "../static-app.js"].map((file) => {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const functions = names.map((name) => {
    const declaration = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert.ok(declaration, `${file}: missing ${name}`);
    return declaration.getText(ast).replace(/^export /, "");
  }).join("\n");
  const context = vm.createContext({});
  vm.runInContext(ts.transpileModule(functions, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText, context);
  return context;
});

const cases = [
  { summary: "A short authored summary.", body: "A much longer body that must not override the author's choice.", expected: "A short authored summary." },
  { summary: " No summary recorded. ", body: ":::note 20 / 10 / 2026 - New Note\n## Heading\nA **quiet** update with a [link](https://example.test).\n![Screenshot](/media/example.webp)\n:::" , expected: "A quiet update with a link." },
  { summary: "", body: "## Heading\n- First thought\n- Second thought", expected: "First thought Second thought" },
  { summary: "NO SUMMARY RECORDED.", body: ":::note Current\nLatest thoughts.\n:::\n:::previous-note Older\nOld thoughts.\n:::", expected: "Latest thoughts." },
  { summary: "", body: "## Update Index\n- Old update\n", expected: "No summary recorded." },
  { summary: "", body: "# Only a heading\n![Image](/media/example.webp)", expected: "No summary recorded." },
  { summary: "", body: "", expected: "No summary recorded." },
  { summary: "", body: "An update. ".repeat(40), expected: `${"An update. ".repeat(40).trim().slice(0, 177).trim()}...` }
];

for (const context of contexts) {
  for (const { expected, ...record } of cases) {
    context.record = record;
    const original = JSON.stringify(record);
    assert.equal(vm.runInContext("recordDisplaySummary(record)", context), expected);
    assert.equal(JSON.stringify(record), original, "Display summaries must not modify authored content");
  }
}

for (const file of ["../components/archive/section-page.tsx", "../components/studio-client.tsx", "../static-app.js"]) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  assert.match(source, /record\.section === "logs" \? recordDisplaySummary\(record\) : record\.summary/, `${file}: log cards must derive missing summaries`);
}

console.log("Record summary tests passed: authored summaries, placeholder fallback, notes, Markdown, empty content and React/static parity.");
