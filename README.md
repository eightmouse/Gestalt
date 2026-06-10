![Next.js](https://img.shields.io/badge/Next.js-App%20Router-black)
![TypeScript](https://img.shields.io/badge/TypeScript-archive%20interface-3178c6)
![Version](https://img.shields.io/badge/version-v1.26.60-b8b09a)
[![Support me on Ko-fi](https://img.shields.io/badge/Support%20Me-Ko--fi-F16061?logo=ko-fi&logoColor=white)](https://ko-fi.com/eightmouse)

# Gestalt

[Live site](https://eightmouse.github.io/Gestalt/)

Gestalt is my personal archive / blog / portfolio-ish thing.

I wanted a place for the stuff that usually ends up scattered around notes: project progress, game thoughts, setup changes, small logs, things that broke, things that worked, and whatever else is worth keeping around.

I use Obsidian a lot, godsend, bless the creators, but I wanted something more public-facing for a while. Not a standard blog layout, more like a little personal operating system where every entry feels like opening a record.

Current public version: `v1.26.60`.

## What It Is

Gestalt is built around records instead of traditional posts.

- **Dashboard** is the current snapshot: active projects, current game, weather, recent activity, and a small memory state panel.
- **Projects** is for things I am building, polishing, pausing, or slowly resurrecting from the archive.
- **Games** is for play logs, notes, thoughts, progress, screenshots, and eventually recommendations.
- **Logs** is for shorter updates and general rambles that do not belong to one specific project or game.
- **Setup** is for hardware, software, tools, and whatever I am using day to day.
- **Archive** is for older records that I still want visible but no longer treat as active.

The whole thing is meant to feel calm, readable, slightly weird, and very much mine. Archival interface, not fake hacker dashboard~

## Stack

- **Next.js App Router** for the local development/studio side.
- **TypeScript** because the content shape needs guardrails.
- **Framer Motion** for the small interactions and transitions.
- **Zustand** for lightweight interface state.
- **MDX-style content files** for records, so entries stay readable and easy to edit.
- **Static export shell** for GitHub Pages, so the public site is just static files.
- **Steam Web API integration** for game playtime / achievement sync where it makes sense.

The public site is hosted through GitHub Pages. The editing studio only runs locally, so visitors cannot edit entries from the live site.

## Supported Platforms

Gestalt is designed for modern desktop browsers first:

- Firefox
- Chrome
- Edge

There is also a mobile layout, treated as a separate handheld field mode instead of just squishing the desktop UI into a phone screen. It is intentionally simpler, but it should still carry the same vibe.

## Editing

I edit records locally through the Studio view, then publish the generated static site to GitHub Pages.

Useful commands:

```powershell
corepack pnpm run dev
corepack pnpm run check
corepack pnpm run site:publish -- --message "Update archive"
```

The publish command refreshes the static data, validates the shell/content, runs the safety checks, commits, and pushes.

## Notes

This repo is public mostly because I like keeping the project backed up and visible. It is not really meant to be a general app for everyone, but if someone wants to fork it and make their own weird little archive, go for it.

Currently being extra careful because of the npm ordeal, so dependencies are pinned and installs are kept boring on purpose.
