![Next.js](https://img.shields.io/badge/Next.js-App%20Router-black)
![TypeScript](https://img.shields.io/badge/TypeScript-archive%20interface-3178c6)
![Version](https://img.shields.io/badge/version-v1.64.2-b8b09a)
[![Support me on Ko-fi](https://img.shields.io/badge/Support%20Me-Ko--fi-F16061?logo=ko-fi&logoColor=white)](https://ko-fi.com/eightmouse)

# Gestalt

[Live site](https://eightmouse.github.io/Gestalt/)

Gestalt is my personal archive / blog / portfolio-ish thing.

A place for the stuff that usually ends up scattered around notes: project progress, game thoughts, setup changes, small logs, things that broke, things that worked, and whatever else is worth keeping around.

Obsidian gets used a lot, godsend, bless the creators, but I've wanted somewhere to share some of that stuff for a while. Not a standard blog layout, more like a little personal operating system where opening an entry feels like digging into a record.

Current version: `v1.64.2`.

## What's In Here

Records rather than traditional posts, split into a few places:

- **Dashboard:** a snapshot of what I am up to, with projects, my current game, weather, recent activity, and a small memory state panel.
- **Projects:** things I'm building, polishing, pausing, or slowly resurrecting from the archive.
- **Games:** my play logs, thoughts, progress, screenshots, and recommendations.
- **Logs:** shorter updates and general rambles that do not belong to one specific project or game.
- **Setup:** my hardware, software, tools, and whatever I am using day to day.
- **Archive:** older records worth keeping around, without leaving everything in the active sections forever.

The idea is something calm, readable, slightly weird, and very much mine. Archival interface, not fake hacker dashboard~

## Under The Hood

- **Next.js App Router** for the local development/studio side.
- **TypeScript** to catch mistakes in how I handle records and interface state.
- **Framer Motion** for the small interactions and transitions.
- **Zustand** for lightweight interface state.
- **MDX-style content files** to keep my entries readable and easy to edit.
- **Static export shell** to publish the public site as static files on GitHub Pages.
- **Steam Web API integration** for game playtime / achievement sync where it makes sense.

The public archive lives on GitHub Pages; my editing Studio stays local. Nothing to edit on the live site, just stuff to read.

## Desktop And Handheld

Desktop comes first, with Firefox, Chrome, and Edge in mind.

Mobile has its own handheld field mode instead of just squishing the desktop UI into a phone screen. A little simpler, same Gestalt vibe. Still building and polishing as things come to mind~
