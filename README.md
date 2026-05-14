![Status](https://img.shields.io/badge/status-first%20working%20version-d9d5c1)
![Next.js](https://img.shields.io/badge/Next.js-App%20Router-black)
![TypeScript](https://img.shields.io/badge/TypeScript-archive%20interface-3178c6)
![Static Preview](https://img.shields.io/badge/static%20preview-no%20install%20needed-6f7667)
![Version](https://img.shields.io/badge/version-v1.2.6-b8b09a)
[![Support me on Ko-fi](https://img.shields.io/badge/Support%20Me-Ko--fi-F16061?logo=ko-fi&logoColor=white)](https://ko-fi.com/eightmouse)

# Gestalt

Currently working on this blog / portfolio-ish thing. I have not stopped working on the other projects, still working on KiraPatch, but I wanted a dedicated place for the stuff that usually ends up scattered in notes.

I use Obsidian a lot, godsend, bless the creators, to write down daily things: bugs, thoughts, small discoveries, project notes, and whatever else happens while working. Gestalt is me turning that habit into something more public-facing: a personal archive where I can share what is going on, whether that is thoughts on games I am playing, updates on hardware/software, or progress notes for projects.

This is the first working version, so there are not many entries yet. I have just finished getting the core shape built; over the next days, as I polish and update it, I will add more records.

Currently being extra careful because of the npm ordeal.

## What It Is

Gestalt is designed more like an archival interface than a normal blog:

- Projects are active files.
- Games are play logs.
- Setup notes cover hardware, peripherals, and software.
- Logs are short field notes rather than polished articles.

The current static preview can be opened without installing npm or pnpm dependencies.

## Safe Preview

Open `index.html` directly in a browser, or serve the folder locally:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Then visit:

```text
http://127.0.0.1:4173/index.html
```

## Content

The static prototype stores its current records in `static-app.js`.

The Next.js version is scaffolded around editable records in `content/records/*.mdx`, with frontmatter for title, status, mood, dates, progress, tags, and milestones.

## Editing Entries

Create entries with the generator instead of editing UI code:

```powershell
node scripts/new-entry.mjs --section logs --title "My New Entry"
node scripts/validate-content.mjs
```

Entries live in `content/records/*.mdx`. The public site reads them as static content; visitors cannot edit them.

For a visual editor, run the Next app locally and open `/studio`. Studio is disabled outside local development and writes through local-only API routes.

## Public Repo Hygiene

This repo is intended to be safe to publish. Keep personal drafts, real hardware serials, private notes, account names, contact info, and secrets out of committed content.

Use ignored local-only folders such as `content/private/`, `private/`, or `local-notes/` for anything not meant for the public repo. Environment files are ignored by default; commit only a sanitized `.env.example` if one is ever needed.

## Supply Chain Guardrails

Dependency installation is intentionally not required for the static prototype.

For the future pnpm/Next.js path, this repo includes:

- Exact dependency versions in `package.json` rather than floating `latest` ranges.
- `.npmrc` with install scripts disabled and a seven-day release-age buffer.
- `pnpm-workspace.yaml` with release-age, trust policy, strict dependency builds, and blocked exotic transitive deps.
- `.gitignore` entries for install/build output.

## Versioning

Current public version: `v1.2.6`.

Future changes follow `VERSIONING.md`: patch for fixes/content tweaks, minor for new features, major for breaking structure or publishing workflow changes.
