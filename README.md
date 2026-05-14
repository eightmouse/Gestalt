![Status](https://img.shields.io/badge/status-first%20working%20version-d9d5c1)
![Next.js](https://img.shields.io/badge/Next.js-App%20Router-black)
![TypeScript](https://img.shields.io/badge/TypeScript-archive%20interface-3178c6)
![Version](https://img.shields.io/badge/version-v1.2.7-b8b09a)
[![Support me on Ko-fi](https://img.shields.io/badge/Support%20Me-Ko--fi-F16061?logo=ko-fi&logoColor=white)](https://ko-fi.com/eightmouse)

# Gestalt

Currently working on this blog / portfolio-ish thing. I have not stopped working on the other projects, still working on KiraPatch, but I wanted a dedicated place for the stuff that usually ends up scattered in notes.

I use Obsidian a lot, godsend, bless the creators, to write down daily things: bugs, thoughts, small discoveries, project notes, and whatever else happens while working. Gestalt is me turning that habit into something more public-facing: a personal archive where I can share what is going on, whether that is thoughts on games I am playing, updates on hardware/software, or progress notes for projects.

This is the first working version, so there are not many entries yet. I have just finished getting the core shape built; over the next days, as I polish and update it, I will add more records.

Currently being extra careful because of the npm ordeal.

## About This Repo

This is mainly my personal blog/archive, not an app I am packaging for other people to use.

I am keeping the repo public so it can be backed up, shared, and forked if someone wants to modify it into their own thing. The content, styling, and workflow are built around how I want to write and keep records, so there is no promise that it will be generalized or documented like a reusable template.

## Public Repo Hygiene

This repo is intended to be safe to publish. Personal drafts, private notes, local files, env files, and anything sensitive should stay out of committed content.

Ignored local-only folders such as `content/private/`, `private/`, and `local-notes/` are reserved for anything that should not end up in the public repo.

## Supply Chain Guardrails

Dependency installation is intentionally not required for the current static preview.

For the future pnpm/Next.js path, this repo keeps exact dependency versions and includes npm/pnpm guardrails such as disabled install scripts, a seven-day release-age buffer, strict dependency builds, and ignored install/build output.

Current public version: `v1.2.7`.
