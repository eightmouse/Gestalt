import path from "node:path";
import { readdir, stat } from "node:fs/promises";
import { runStudioProcess } from "@/lib/studio-process";
import { isStaticExportRequired, setStaticExportRequired } from "@/lib/studio-operation";

export async function staticExportNeedsRefresh(): Promise<boolean> {
  if (isStaticExportRequired()) return true;
  try {
    const directory = path.join(process.cwd(), "content", "records");
    const output = await stat(path.join(process.cwd(), "public", "data", "records.js"));
    const files = (await readdir(directory)).filter((name) => name.endsWith(".mdx"));
    const inputs = await Promise.all([stat(directory), ...files.map((name) => stat(path.join(directory, name)))]);
    return inputs.some((input) => input.mtimeMs > output.mtimeMs);
  } catch {
    return true;
  }
}

export async function writeStaticRecords(): Promise<void> {
  const result = await runStudioProcess(
    process.execPath,
    [path.join(process.cwd(), "scripts", "export-static-records.mjs")]
  );
  if (result.error || result.code !== 0) {
    setStaticExportRequired(true);
    throw new Error("The record is saved locally, but the static archive could not refresh.");
  }
  setStaticExportRequired(false);
}
