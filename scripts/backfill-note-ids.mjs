import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import noteInline from "../public/note-inline.js";

const directory = path.resolve("content/records");
const records = readdirSync(directory, { withFileTypes: true }).filter((file) => file.isFile() && file.name.endsWith(".mdx"));
const changes = [];
let count = 0;
for (const { name } of records) {
  const file = path.join(directory, name);
  const source = readFileSync(file, "utf8");
  const frontmatter = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(source)?.[0];
  if (!frontmatter) throw new Error(`Missing frontmatter in ${name}. No files rewritten.`);
  const body = source.slice(frontmatter.length);
  const next = noteInline.addNoteIds(body, () => {
    count++;
    return `n-${randomUUID().replaceAll("-", "")}`;
  });
  if (next !== body) {
    const text = (value) => noteInline.parseNotes(value).map(({ title, body }) => ({ title, body }));
    assert.deepEqual(text(next), text(body), `Backfill must preserve note text in ${name}`);
    changes.push({ file, source, revised: frontmatter + next });
  }
}

const apply = process.argv.slice(2).includes("--write");
if (apply) {
  for (const { file, source, revised } of changes) {
    if (readFileSync(file, "utf8") !== source) throw new Error("A record changed during the backfill. Rerun to finish.");
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
      writeFileSync(temporary, revised, { flag: "wx" });
      renameSync(temporary, file);
    } finally {
      try { unlinkSync(temporary); } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
  }
}
console.log(`${apply ? "Assigned" : "Would assign"} ${count} permanent note IDs across ${changes.length} records.`);
