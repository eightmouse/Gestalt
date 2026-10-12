import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function writeStaticRecords(): Promise<void> {
  await execFileAsync(
    process.execPath,
    [path.join(process.cwd(), "scripts", "export-static-records.mjs")],
    {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024
    }
  );
}
