import { execFile, spawn } from "node:child_process";

type ProcessResult = { code: number | null; stdout: string; stderr: string; error?: string };

export function runStudioProcess(command: string, args: string[], timeout = 30_000): Promise<ProcessResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      windowsHide: true,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let size = 0;
    let error: string | undefined;
    let stopping: Promise<void> | undefined;

    const stop = (reason: string) => {
      if (stopping) return;
      error = reason;
      // Kill the whole tree: the publisher starts Git and validation children.
      stopping = new Promise<void>((done) => {
        if (!child.pid) return done();
        if (process.platform === "win32") {
          execFile("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, timeout: 10_000 }, () => {
            if (child.exitCode === null) child.kill("SIGKILL");
            done();
          });
        } else {
          try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
          done();
        }
      });
    };

    const collect = (chunks: Buffer[], chunk: Buffer) => {
      size += chunk.length;
      if (size > 10 * 1024 * 1024) stop("Command output exceeded the local limit.");
      else chunks.push(chunk);
    };
    child.stdout.on("data", (chunk: Buffer) => collect(stdout, chunk));
    child.stderr.on("data", (chunk: Buffer) => collect(stderr, chunk));
    const timer = setTimeout(() => stop("Command timed out; its process tree was stopped."), timeout);
    child.once("error", () => { error = "Could not start the local command."; });
    child.once("close", async (code) => {
      clearTimeout(timer);
      await stopping;
      resolve({ code, stdout: Buffer.concat(stdout).toString("utf8"), stderr: Buffer.concat(stderr).toString("utf8"), error });
    });
  });
}
