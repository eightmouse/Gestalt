# Content Workflow

Use this flow when adding or editing public entries.

## Add An Entry

Generate a draft MDX record:

```powershell
node scripts/new-entry.mjs --section logs --title "My New Entry"
```

Useful sections:

- `projects`
- `games`
- `logs`
- `setup`
- `archive`

Then edit the created file in `content/records/`.

## Game Note Stack

Keep one record per game. Add the newest note at the top of the body, with an optional banner image first:

```md
:::note 14 / 05 / 2026 - Session Title
![Short banner description](/media/records/game-id/session-banner.jpg)

Thoughts from the session.
:::

:::note 13 / 05 / 2026 - Older Note Title
Older note content.
:::

## Update Index
- 14 / 05 / 2026 - Short update label.
```

Use `:::note ... :::` for each game note. The Notes page turns each note into an expandable record, and `## Update Index` is shown from the right-side history control as a small scrollable window.

## Local Studio

For form-based editing and drag/drop media, run the Next app locally and open:

```text
http://127.0.0.1:3000/studio
```

Studio can:

- create new records
- edit existing records
- upload screenshots, gifs, videos, and project samples into `public/media/records/`
- insert uploaded media into the note body
- save records back into `content/records/`

Studio is disabled outside local development. The write and upload routes return `404` unless the app is running in development on `localhost` or `127.0.0.1`.

## Validate Before Commit

Run:

```powershell
node scripts/validate-content.mjs
```

The validator checks required frontmatter, section names, date format, progress range, tags, duplicate IDs, and empty bodies.

## Publishing Model

The public site should stay read-only. Do not add a public admin panel unless there is a strong reason.

Recommended flow:

1. Edit or create records locally.
2. Run content validation.
3. Commit and push to GitHub.
4. Let GitHub Pages or Vercel rebuild the public site.

Only GitHub users with write access to the repository can change entries. Public visitors can read the built site but cannot write content.

## Privacy Check

Before publishing, make sure entries do not include:

- real addresses or private contact details
- account names or handles you do not want public
- serial numbers
- tokens, keys, or local paths
- private screenshots or hidden browser tabs
