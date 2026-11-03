import { createHash, randomUUID } from "node:crypto";
import { lstat, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileNotebookRelease, validateRoadmap } from "../public/roadmap.mjs";

export class NotebookConflict extends Error {}
export class NotebookInputError extends Error {}

async function notebookPath(root) {
  let target = path.resolve(root);
  for (const part of ["public", "data", "roadmap.json"]) {
    target = path.join(target, part);
    const info = await lstat(target);
    if (info.isSymbolicLink() || (part === "roadmap.json" ? !info.isFile() : !info.isDirectory())) throw new Error("Invalid notebook location.");
  }
  return target;
}
const revisionOf = (source) => createHash("sha256").update(source).digest("hex");

export async function readNotebook(root) {
  const source = await readFile(await notebookPath(root), "utf8");
  return { data: validateRoadmap(JSON.parse(source)), revision: revisionOf(source) };
}

export async function saveNotebook(root, candidate, revision, now = new Date(), filing) {
  let data;
  try { data = validateRoadmap(candidate); } catch { throw new NotebookInputError("Check notebook titles and text lengths before saving."); }
  const current = await readNotebook(root);
  if (revision !== current.revision) throw new NotebookConflict("The notebook changed elsewhere. Your draft is kept; reload the saved copy before retrying.");
  // Ordinary saves cannot rewrite history; filing only moves selected completed work.
  if (data.title !== current.data.title || data.intro !== current.data.intro || data.groups.some((group, index) => group.title !== current.data.groups[index].title) ||
      JSON.stringify(data.groups[2]) !== JSON.stringify(current.data.groups[2])) throw new NotebookInputError("Filed history and chapter headings are read-only in this editor.");
  if (filing !== undefined) {
    try { data = fileNotebookRelease(data, filing); }
    catch (error) { throw new NotebookInputError(error.message); }
  }
  const updated = `${String(now.getDate()).padStart(2, "0")} / ${String(now.getMonth() + 1).padStart(2, "0")} / ${now.getFullYear()}`;
  const saved = { ...data, updated };
  const source = `${JSON.stringify(saved, null, 2)}\n`;
  const target = await notebookPath(root);
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, source, { flag: "wx" });
    if ((await readNotebook(root)).revision !== revision) throw new NotebookConflict("The notebook changed while saving. Your draft is kept.");
    await rename(temporary, target);
  } finally { await unlink(temporary).catch((error) => { if (error.code !== "ENOENT") throw error; }); }
  return { data: saved, revision: revisionOf(source) };
}
