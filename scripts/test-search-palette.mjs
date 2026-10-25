import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function declaration(file, name) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS);
  return ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(ast).replace(/^export\s+/, "");
}
const records = [
  { id: "game", section: "games", title: "A game", type: "Play Log", status: "Playing", updated: "2026-10-23", summary: "A play log", body: "A distant place", priority: 0 },
  { id: "log", section: "logs", title: "A field log", type: "Field Note", status: "Filed", updated: "2026-10-22", body: "A quiet evening", priority: 1 }
];
const original = JSON.stringify(records);
const noteEntries = (body) => [{ title: body }];
const react = vm.createContext({ records, noteEntries });
vm.runInContext(ts.transpileModule(declaration("components/archive/search-utils.ts", "getSearchResults"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, react);
const pages = vm.createContext({ records, noteEntries, state: { searchQuery: "" }, currentGameRecord: () => records[0], latestLogRecord: () => records[1] });
vm.runInContext(declaration("static-app.js", "searchResults"), pages);
const keys = (items) => JSON.stringify(items.map((item) => [item.kind, item.id || item.record.id]));
for (const query of ["", "   ", "settings", "behaviour", "startup", "game", "distant", "quiet", "no such entry"]) {
  pages.state.searchQuery = query;
  const a = react.getSearchResults(records, query, records[0], records[1]);
  const b = pages.searchResults();
  assert.equal(keys(a), keys(b), "React and Pages search remain in sync");
  if (!query.trim()) {
    assert.equal(a.length, 4);
    assert.ok(a.every((item) => item.kind === "command"), "No unsolicited record cards in the default palette");
    assert.ok(a.some((item) => item.action === "behaviour" && item.title === "Settings"), "Settings is reachable without typing");
  } else if (["distant", "quiet"].includes(query)) {
    assert.ok(a.some((item) => item.kind === "record"), "Note-title search is retained");
  }
}
assert.equal(JSON.stringify(records), original);

function findNode(file, predicate) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.JS);
  function visit(node) {
    return predicate(node) ? node : ts.forEachChild(node, visit);
  }
  return { node: visit(ast), ast };
}
const handoff = findNode("components/archive-os.tsx", (node) => ts.isVariableDeclaration(node) && node.name.getText() === "updateSearchFromNavigation");
const staticHandoff = findNode("static-app.js", (node) => ts.isIfStatement(node) && node.expression.getText().includes("target.dataset.mobileNavSearchInput"));
assert.ok(handoff.node && staticHandoff.node);
const source = ts.transpileModule(`const update = ${handoff.node.initializer.getText(handoff.ast)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
for (const query of ["", "  ", "settings", "A field log"]) {
  const expectedOpen = query.trim().length > 0;
  const local = { query: "", searchOpen: false, navOpen: true };
  vm.runInNewContext(`${source}\nupdate(query);`, {
    query, setSearchQuery: (value) => { local.query = value; },
    setSearchOpen: (value) => { local.searchOpen = value; },
    setNavOpen: (value) => { local.navOpen = value; }
  });
  const state = { searchQuery: "", searchOpen: false, navOpen: true };
  vm.runInNewContext(staticHandoff.node.getText(staticHandoff.ast), { target: { dataset: { mobileNavSearchInput: "" }, value: query }, state, render() {} });
  assert.deepEqual(local, { query, searchOpen: expectedOpen, navOpen: !expectedOpen });
  assert.deepEqual(state, { searchQuery: query, searchOpen: expectedOpen, navOpen: !expectedOpen }, "Search results must not remain behind the mobile menu");
}
console.log("Palette checks passed: commands-only defaults, note/title search, mobile menu handoff, React/Pages parity and unchanged records.");
