import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();

function commandFor(command) {
  if (process.platform === "win32" && ["corepack", "npm", "pnpm"].includes(command)) {
    return `${command}.cmd`;
  }

  return command;
}

function parseArgs(args) {
  let message = "Update archive content";
  let dryRun = false;
  let skipSteamSync = false;
  let skipTypecheck = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if ((arg === "--message" || arg === "-m") && args[index + 1]) {
      message = args[index + 1];
      index += 1;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--skip-steam-sync") {
      skipSteamSync = true;
    } else if (arg === "--skip-typecheck") {
      skipTypecheck = true;
    }
  }

  return { dryRun, message, skipSteamSync, skipTypecheck };
}

function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(commandFor(command), args, {
    cwd: root,
    stdio: "inherit",
    ...options
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function capture(command, args) {
  const result = spawnSync(commandFor(command), args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.status !== 0) {
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }

    process.exit(result.status ?? 1);
  }

  return result.stdout;
}

function listPublishableFiles() {
  return capture("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
    .split("\0")
    .filter(Boolean);
}

function ensureNoTrackedEnvFiles() {
  const trackedEnvFiles = capture("git", ["ls-files", ".env", ".env.local", ".env.production", ".env.development"])
    .split(/\r?\n/)
    .filter(Boolean);

  if (trackedEnvFiles.length > 0) {
    console.error("\nPublish blocked: environment files are tracked by git:");
    for (const file of trackedEnvFiles) {
      console.error(`- ${file}`);
    }
    process.exit(1);
  }
}

function isLikelyTextFile(file) {
  const extension = path.extname(file).toLowerCase();
  const textExtensions = new Set([
    "",
    ".css",
    ".html",
    ".js",
    ".json",
    ".jsx",
    ".md",
    ".mdx",
    ".mjs",
    ".svg",
    ".toml",
    ".ts",
    ".tsx",
    ".txt",
    ".yml",
    ".yaml"
  ]);

  return textExtensions.has(extension);
}

function shouldSkipSecretScan(file) {
  const normalized = file.replaceAll("\\", "/");

  return (
    normalized.startsWith(".git/") ||
    normalized.startsWith(".next/") ||
    normalized.startsWith(".pnpm-store/") ||
    normalized.startsWith("node_modules/") ||
    !isLikelyTextFile(file)
  );
}

function scanForPrivateMaterial() {
  const patterns = [
    ["Steam API key assignment", /\bSTEAM_API_KEY\s*=\s*["']?[A-Za-z0-9]{16,}/],
    ["Steam ID assignment", /\bSTEAM_ID\s*=\s*["']?[0-9]{12,}/],
    ["OpenAI style API key", /\bsk-[A-Za-z0-9_-]{20,}/],
    ["GitHub classic token", /\bghp_[A-Za-z0-9_]{20,}/],
    ["GitHub fine-grained token", /\bgithub_pat_[A-Za-z0-9_]{20,}/],
    ["Google API key", /\bAIza[0-9A-Za-z_-]{20,}/],
    ["Private key block", /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/],
    ["Local Windows user path", /C:\\Users\\lucam\\/i]
  ];
  const findings = [];

  for (const file of listPublishableFiles()) {
    if (shouldSkipSecretScan(file)) {
      continue;
    }

    let source = "";

    try {
      source = readFileSync(path.join(root, file), "utf8");
    } catch {
      continue;
    }

    for (const [label, pattern] of patterns) {
      if (pattern.test(source)) {
        findings.push(`${file}: ${label}`);
      }
    }
  }

  if (findings.length > 0) {
    console.error("\nPublish blocked: possible private material found:");
    for (const finding of findings) {
      console.error(`- ${finding}`);
    }
    console.error("\nRemove it or add an intentional ignore before publishing.");
    process.exit(1);
  }
}

function ensureThereAreChanges() {
  const status = capture("git", ["status", "--porcelain"]).trim();

  if (!status) {
    console.log("\nNo changes to publish.");
    process.exit(0);
  }
}

function syncRemoteBranch(branch) {
  run("git", ["fetch", "origin", branch]);

  const counts = capture("git", ["rev-list", "--left-right", "--count", `HEAD...origin/${branch}`])
    .trim()
    .split(/\s+/)
    .map((value) => Number(value));
  const behind = counts[1] ?? 0;

  if (behind > 0) {
    run("git", ["merge", "--no-edit", `origin/${branch}`]);
  }
}

function refreshStaticCacheBusters() {
  const indexPath = path.join(root, "index.html");
  const source = readFileSync(indexPath, "utf8");
  const token = Date.now();
  const next = source
    .replace(/app\/globals\.css(?:\?v=\d+)?/g, `app/globals.css?v=${token}`)
    .replace(/public\/data\/records\.js(?:\?v=\d+)?/g, `public/data/records.js?v=${token}`)
    .replace(/static-app\.js(?:\?v=\d+)?/g, `static-app.js?v=${token}`);

  if (next !== source) {
    writeFileSync(indexPath, next, "utf8");
    console.log(`Updated index.html cache token: ${token}`);
  }
}

function hasSteamConfig() {
  try {
    const source = readFileSync(path.join(root, ".env.local"), "utf8");

    return /^\s*STEAM_API_KEY\s*=\s*\S+/m.test(source) && /^\s*STEAM_ID\s*=\s*\S+/m.test(source);
  } catch {
    return false;
  }
}

function syncSteamIfConfigured(skipSteamSync) {
  if (skipSteamSync) {
    console.log("\n> Steam sync skipped by --skip-steam-sync");
    return;
  }

  if (!hasSteamConfig()) {
    console.log("\n> Steam sync skipped: STEAM_API_KEY or STEAM_ID not configured.");
    return;
  }

  run("node", ["scripts/sync-steam.mjs"]);
}

const { dryRun, message, skipSteamSync, skipTypecheck } = parseArgs(process.argv.slice(2));

console.log("Gestalt site publish");
console.log(`Commit message: ${message}`);
if (dryRun) {
  console.log("Dry run: checks will run, but nothing will be committed or pushed.");
}

syncSteamIfConfigured(skipSteamSync);
run("node", ["scripts/export-static-records.mjs"]);
refreshStaticCacheBusters();
run("node", ["scripts/validate-content.mjs"]);
run("node", ["scripts/validate-static-shell.mjs"]);
if (skipTypecheck) {
  console.log("\n> TypeScript check skipped for content-only publish");
} else {
  run("corepack", ["pnpm", "run", "check"]);
}
run("node", ["--check", "static-app.js"]);
run("git", ["diff", "--check"]);

ensureNoTrackedEnvFiles();
scanForPrivateMaterial();
ensureThereAreChanges();

if (dryRun) {
  console.log("\nDry run passed. Run without --dry-run to commit and push.");
  process.exit(0);
}

run("git", ["add", "-A"]);
run("git", ["diff", "--cached", "--check"]);
scanForPrivateMaterial();

const stagedDiff = spawnSync(commandFor("git"), ["diff", "--cached", "--quiet"], { cwd: root });

if (stagedDiff.status === 0) {
  console.log("\nNo staged changes to publish.");
  process.exit(0);
}

run("git", ["commit", "-m", message]);

const branch = capture("git", ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
syncRemoteBranch(branch);
run("git", ["push", "origin", branch]);

console.log(`\nPublished ${branch} to GitHub.`);
