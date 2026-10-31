import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { preparePages } from "./prepare-pages.mjs";
import { validatePagesAssets } from "./validate-pages-assets.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = await mkdtemp(path.join(os.tmpdir(), "gestalt-assets-test-"));
const destination = path.join(temporary, "site");
const sourceBefore = await readFile(path.join(root, "index.html"), "utf8");
try {
  await preparePages({ root, destination, baseUrl: "https://fixture.github.io/Gestalt", fetchImpl: async () => new Response("missing", { status: 404 }) });
  const checked = await validatePagesAssets(destination);
  for (const file of ["public/images/archive-banner.png", "public/images/eightmouse-avatar.png", "public/images/seasonal/halloween-hanging.svg", "public/images/seasonal/october-glow.svg", ...["winter-frost", "winter-fir", "winter-pendant", "january-ribbon", "january-seal", "january-star"].map((name) => `public/images/seasonal/${name}.svg`)]) assert.ok(checked.includes(file));
  const index = path.join(destination, "index.html");
  await writeFile(index, sourceBefore.replace('url("../public/images/archive-banner.png")', 'url("public/images/archive-banner.png")'));
  await assert.rejects(validatePagesAssets(destination), /app\/public\/images\/archive-banner.png/, "The previous stylesheet-relative URL bug must fail the prepared-artifact check");
  await writeFile(index, sourceBefore);
  for (const file of ["public/images/eightmouse-avatar.png", "public/images/seasonal/halloween-hanging.svg", "public/images/seasonal/winter-pendant.svg", "public/images/seasonal/january-star.svg", "public/images/ui/notebook-next.svg", "public/images/ui/notebook-index.svg"]) {
    await unlink(path.join(destination, file));
    await assert.rejects(validatePagesAssets(destination), /Missing prepared Pages asset/);
    await copyFile(path.join(root, file), path.join(destination, file));
  }
  await writeFile(index, sourceBefore.replace('url("../public/images/archive-banner.png")', 'url("/images/archive-banner.png")'));
  await assert.rejects(validatePagesAssets(destination), /leaves the project URL scope/, "A localhost-only root path must not pass Pages checks");
  assert.equal(await readFile(path.join(root, "index.html"), "utf8"), sourceBefore, "The smoke test never writes source files");
  console.log("Prepared Pages smoke test passed: real artifact, stylesheet/document URL bases, avatar/seasonal omissions, project scope and unchanged source.");
} finally {
  assert.equal(path.dirname(path.resolve(temporary)), path.resolve(os.tmpdir()));
  assert.ok(path.basename(temporary).startsWith("gestalt-assets-test-"));
  await rm(temporary, { recursive: true, force: true });
}
