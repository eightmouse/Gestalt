import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import ts from "typescript";
import { fileNotebookRelease, releaseDateLabel, validateRoadmap, validReleaseDate } from "../public/roadmap.mjs";
import { readNotebook, saveNotebook, NotebookConflict, NotebookInputError } from "../lib/notebook-store.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = await mkdtemp(path.join(os.tmpdir(), "gestalt-notebook-test-"));
const file = path.join(temporary, "public/data/roadmap.json");
const originalCwd = process.cwd(), mode = process.env.NODE_ENV;
const sample = JSON.parse(await readFile(path.join(root, "public/data/roadmap.json"), "utf8"));
const clone = () => structuredClone(sample);
try {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(sample));
  for (const corrupt of [null, [], { ...sample, groups: [] }, { ...sample, secret: "unexpected field" }]) assert.throws(() => validateRoadmap(corrupt));
  for (const patch of [{ title: "" }, { completed: "yes" }, { title: "x".repeat(161) }, { detail: "x".repeat(2001) }, { version: "v1.0.0" }, { onclick: "bad()" }]) {
    const bad = clone(); Object.assign(bad.groups[0].items[0], patch); assert.throws(() => validateRoadmap(bad));
  }
  const first = await readNotebook(temporary);
  const edited = clone();
  edited.groups[0].items[0] = { title: "Written in place", detail: "First line\nSecond line", completed: true };
  const saved = await saveNotebook(temporary, edited, first.revision, new Date(2026, 10, 3));
  assert.equal(saved.data.updated, "03 / 11 / 2026");
  assert.equal(saved.data.groups[0].items[0].completed, true);
  assert.deepEqual(saved.data.groups[2], first.data.groups[2], "Completion never files or rewrites a release");
  assert.notEqual(saved.revision, first.revision);
  await assert.rejects(saveNotebook(temporary, sample, first.revision), NotebookConflict);
  const historyEdit = structuredClone(saved.data); historyEdit.groups[2].items[0].title = "Invented release";
  await assert.rejects(saveNotebook(temporary, historyEdit, saved.revision), NotebookInputError);
  assert.deepEqual(await readNotebook(temporary), saved, "Rejected saves do not alter data");
  assert.deepEqual(await readdir(path.dirname(file)), ["roadmap.json"], "Atomic saves leave no temporary file");
  const filing = { version: "v9.8.7", date: "2026-11-03", items: ["working:0"] };
  const beforeFiling = JSON.stringify(saved.data);
  const filed = fileNotebookRelease(saved.data, filing);
  assert.equal(JSON.stringify(saved.data), beforeFiling, "Filing never mutates the source draft");
  assert.equal(filed.groups[0].items.length, saved.data.groups[0].items.length - 1);
  assert.deepEqual(filed.groups[2].items.slice(1), saved.data.groups[2].items, "Older history is unchanged and remains reachable");
  assert.equal(filed.groups[2].items[0].releasedOn, filing.date);
  assert.equal(releaseDateLabel(filing.date), "03 / 11 / 2026");
  assert.equal(validReleaseDate("2026-02-30"), false);
  assert.equal(validReleaseDate("2028-02-29"), true);
  for (const patch of [{ date: "2026-02-30" }, { version: "v1.0" }, { items: [] }, { items: ["working:0", "working:0"] }, { items: ["done:0"] }, { items: ["working:999"] }, { items: ["working:1"] }]) assert.throws(() => fileNotebookRelease(saved.data, { ...filing, ...patch }));
  assert.throws(() => fileNotebookRelease(filed, filing), /already filed/);
  const inconsistent = structuredClone(filed);
  inconsistent.groups[2].items.unshift({ ...inconsistent.groups[2].items[0], releasedOn: "2026-11-02" });
  assert.throws(() => validateRoadmap(inconsistent), /consistent date/);

  const nextServer = pathToFileURL(createRequire(import.meta.url).resolve("next/server.js")).href;
  for (const [name, relative] of [["studio", "lib/studio.ts"], ["studio-operation", "lib/studio-operation.ts"], ["route", "app/api/studio/notebook/route.ts"]]) {
    const source = await readFile(path.join(root, relative), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
      .replaceAll('"@/lib/notebook-store.mjs"', JSON.stringify(pathToFileURL(path.join(root, "lib/notebook-store.mjs")).href))
      .replace(/"@\/lib\/([^"/]+)"/g, (_, name) => JSON.stringify(`./${name}.mjs`))
      .replaceAll('"next/server"', JSON.stringify(nextServer));
    await writeFile(path.join(temporary, `${name}.mjs`), compiled);
  }
  const { NextRequest } = await import(nextServer);
  const { POST } = await import(pathToFileURL(path.join(temporary, "route.mjs")));
  const { beginStudioOperation } = await import(pathToFileURL(path.join(temporary, "studio-operation.mjs")));
  const request = (body, headers = {}) => new NextRequest("http://127.0.0.1:3000/api/studio/notebook", { method: "POST", headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000", "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
  process.chdir(temporary);
  process.env.NODE_ENV = "development";
  for (const headers of [{ origin: "https://outside.invalid" }, { origin: "http://127.0.0.1:3001" }, { origin: "" }, { host: "outside.invalid" }, { referer: "https://outside.invalid/" }]) assert.equal((await POST(request({ action: "read" }, headers))).status, 404);
  process.env.NODE_ENV = "production";
  assert.equal((await POST(request({ action: "save", data: sample, revision: saved.revision }))).status, 404);
  process.env.NODE_ENV = "development";
  assert.equal((await POST(request("{"))).status, 400);
  assert.equal((await POST(request("x".repeat(256001)))).status, 413);
  assert.equal((await POST(request({ action: "delete" }))).status, 400);
  const release = beginStudioOperation("publish");
  assert.equal((await POST(request({ action: "save", data: sample, revision: saved.revision }))).status, 409);
  assert.equal((await POST(request({ action: "file", data: saved.data, revision: saved.revision, filing }))).status, 409);
  release();
  const fetched = await POST(request({ action: "read" }));
  assert.equal(fetched.headers.get("cache-control"), "no-store");
  assert.deepEqual(await fetched.json(), saved);
  const response = await POST(request({ action: "save", data: saved.data, revision: saved.revision }));
  assert.equal(response.status, 200);
  assert.equal((await POST(request({ action: "save", data: sample, revision: first.revision }))).status, 409);
  const current = await readNotebook(temporary);
  assert.equal((await POST(request({ action: "file", data: current.data, revision: current.revision }))).status, 400);
  const filedResponse = await POST(request({ action: "file", data: current.data, revision: current.revision, filing }));
  assert.equal(filedResponse.status, 200);
  const persisted = await filedResponse.json();
  assert.equal(persisted.data.groups[2].items[0].version, filing.version);
  assert.deepEqual(persisted.data.groups[2].items.slice(1), current.data.groups[2].items);
  assert.equal((await POST(request({ action: "file", data: current.data, revision: current.revision, filing }))).status, 409, "Retrying an already-saved filing cannot duplicate it");
  console.log("Notebook save checks passed: schema limits, local-only origin guards, bounded body, exclusive writes, atomic save, stale-edit rejection and preserved release history.");
} finally {
  process.chdir(originalCwd);
  if (mode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = mode;
  assert.equal(path.dirname(path.resolve(temporary)), path.resolve(os.tmpdir()));
  assert.ok(path.basename(temporary).startsWith("gestalt-notebook-test-"));
  await rm(temporary, { recursive: true, force: true });
}
