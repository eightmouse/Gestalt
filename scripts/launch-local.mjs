import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const firstPort = 3000;
const lastPort = 3010;
const noOpen = process.argv.includes("--no-open");

function localUrl(port) {
  return `http://127.0.0.1:${port}`;
}

async function isGestaltServer(port) {
  try {
    const response = await fetch(localUrl(port), { signal: AbortSignal.timeout(1200) });
    const html = await response.text();
    return response.ok && /<title>\s*Gestalt Archive\s*<\/title>/i.test(html);
  } catch {
    return false;
  }
}

async function findExistingServer() {
  for (let port = firstPort; port <= lastPort; port += 1) {
    if (await isGestaltServer(port)) return port;
  }
  return null;
}

async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
  });
}

async function findFreePort() {
  for (let port = firstPort; port <= lastPort; port += 1) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`Ports ${firstPort}-${lastPort} are all in use. Close an unused local development server and try again.`);
}

async function openBrowser(url) {
  if (noOpen) return;
  try {
    await execFileAsync("cmd.exe", ["/d", "/s", "/c", `start "" "${url}"`], {
      cwd: projectRoot,
      windowsHide: true
    });
  } catch {
    console.log(`Could not open a browser automatically. Open ${url} manually.`);
  }
}

async function waitUntilReady(port, serverProcess, getStartError) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (getStartError()) {
      throw new Error(`Could not start the local server: ${getStartError().message}`);
    }
    if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) {
      throw new Error("The local server exited before Gestalt became ready. Review the messages above.");
    }
    if (await isGestaltServer(port)) return;
    await delay(500);
  }
  throw new Error("Gestalt did not respond within two minutes. Review the server output above; press Ctrl+C to stop it.");
}

async function main() {
  if (!existsSync(path.join(projectRoot, "node_modules", "next", "package.json"))) {
    throw new Error("Dependencies are missing. Run `corepack pnpm install --ignore-scripts` in the project folder, then start the launcher again.");
  }

  const existingPort = await findExistingServer();
  if (existingPort !== null) {
    const url = localUrl(existingPort);
    console.log(`Gestalt is already running at ${url}`);
    await openBrowser(url);
    return;
  }

  const port = await findFreePort();
  const url = localUrl(port);
  console.log(`Starting Gestalt locally at ${url}`);
  console.log("No install, publish, commit, or push will be run by this launcher.");
  console.log("Keep this window open while testing. Press Ctrl+C or close this window to stop Gestalt.\n");

  const serverProcess = spawn(
    "cmd.exe",
    ["/d", "/s", "/c", `corepack pnpm exec next dev --hostname 127.0.0.1 --port ${port}`],
    { cwd: projectRoot, stdio: "inherit", windowsHide: false }
  );
  let startError = null;
  let shutdownRequested = false;
  const serverExit = new Promise((resolve) => {
    serverProcess.once("exit", (code, signal) => resolve({ code, signal }));
    serverProcess.once("error", (error) => resolve({ error }));
  });

  const stopServerTree = () => new Promise((resolve) => {
    if (!serverProcess.pid || serverProcess.exitCode !== null || serverProcess.signalCode !== null) {
      resolve();
      return;
    }

    const killer = spawn("taskkill.exe", ["/PID", String(serverProcess.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true
    });
    const timeout = setTimeout(resolve, 2500);
    const finish = () => {
      clearTimeout(timeout);
      resolve();
    };
    killer.once("error", finish);
    killer.once("exit", finish);
  });

  const closeLauncher = () => {
    if (shutdownRequested) return;
    shutdownRequested = true;
    void stopServerTree().finally(() => process.exit(0));
  };

  process.on("SIGINT", closeLauncher);
  process.on("SIGBREAK", closeLauncher);
  process.on("SIGHUP", closeLauncher);

  serverProcess.once("error", (error) => {
    startError = error;
  });

  try {
    await waitUntilReady(port, serverProcess, () => startError);
    console.log(`\nGestalt is ready: ${url}`);
    await openBrowser(url);
  } catch (error) {
    console.error(`\n${error.message}`);
    process.exitCode = 1;
    await stopServerTree();
  }

  await serverExit;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
