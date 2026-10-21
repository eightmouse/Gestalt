import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const staticSource = read("static-app.js");
const ast = ts.createSourceFile("static-app.js", staticSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const staticBoot = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "scheduleBootCompletion");
assert.ok(staticBoot);
const reactBoot = ts.transpileModule(read("lib/boot.ts"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;

for (const source of [reactBoot, staticBoot.getText(ast)]) {
  for (const reduced of [false, true]) {
    const timers = new Map();
    const listeners = new Set();
    let nextId = 0;
    let completed = 0;
    const motion = {
      matches: reduced,
      addEventListener: (_, listener) => listeners.add(listener),
      removeEventListener: (_, listener) => listeners.delete(listener)
    };
    const context = vm.createContext({ exports: {}, window: {
      matchMedia: () => motion,
      setTimeout: (callback, delay) => { timers.set(++nextId, { callback, delay }); return nextId; },
      clearTimeout: (id) => timers.delete(id)
    } });
    vm.runInContext(source, context);
    const start = vm.runInContext("scheduleBootCompletion", context);
    let stop = start(() => completed++, 500);
    if (reduced) {
      assert.equal(completed, 1, "Reduced motion settles immediately");
      assert.equal(timers.size, 0);
      assert.equal(listeners.size, 0);
      stop();
      continue;
    }
    assert.equal(completed, 0, "No early consent/completion");
    assert.equal([...timers.values()][0].delay, 2300, "Rebuilds keep the original deadline");
    [...timers.values()][0].callback();
    assert.equal(completed, 1);
    assert.equal(timers.size, 0);
    assert.equal(listeners.size, 0);
    stop = start(() => completed++);
    stop();
    assert.equal(timers.size, 0, "Unmount cancels pending completion");
    assert.equal(listeners.size, 0);
    stop = start(() => completed++);
    motion.matches = true;
    for (const listener of [...listeners]) listener();
    assert.equal(completed, 2, "Changing motion preference settles a running boot");
    assert.equal(timers.size, 0);
    assert.equal(listeners.size, 0);
    stop();
    motion.matches = false;
    stop = start(() => completed++, 4000);
    assert.equal([...timers.values()][0].delay, 0, "A delayed render adds no extra wait");
    stop();
  }
}

const reactSource = read("components/archive-os.tsx");
const css = read("app/globals.css");
assert.match(reactSource, /showBoot \? " is-booting" : ""/);
assert.match(reactSource, /inert=\{showBoot\} aria-busy=\{showBoot\}/);
assert.match(reactSource, /localMemory === "prompt" && bootComplete/);
assert.match(staticSource, /state\.bootDismissed \? "" : " is-booting"/);
assert.match(staticSource, /state\.localMemory !== "prompt" \|\| !state\.bootDismissed/);
assert.match(staticSource, /--boot-elapsed: -\$\{Math\.max\(0, performance\.now\(\) - bootStartedAt\)\}ms/);
assert.match(staticSource, /if \(!state\.bootDismissed && !bootCleanup\)/);
assert.match(css, /boot-exit 2800ms linear var\(--boot-elapsed, 0ms\)/);
assert.match(css, /boot-surface 450ms ease-out calc\(2350ms \+ var\(--boot-elapsed, 0ms\)\)/);
assert.match(css, /boot-surface 420ms ease-out calc\(2240ms \+ var\(--boot-elapsed, 0ms\)\)/);
console.log("Boot timing, motion cleanup and React/static handoff checks passed.");
