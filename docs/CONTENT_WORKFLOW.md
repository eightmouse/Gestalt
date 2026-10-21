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

## Log Writing Order

Logs sort by original writing order, newest first, not by their editable Updated date. Studio records `writtenAt` on the first local save and preserves it through edits, renames and export retries. The local preview receives this saved metadata immediately; no publish or reload is needed to keep its order correct.

`writtenAt` is a UTC ISO timestamp for new Studio logs. Older logs retain their existing Started date (or their original Updated date if Started is absent); saving one freezes that date rather than inventing a historical time. The CLI generator also records writing metadata, using a supplied `--date` when backdating a log. Handwritten records may omit the field and use the legacy date fallback.

For same-day historical entries whose relative order is known but exact times are not, optional `writtenOrder` numbers break ties, with larger numbers first. This is used for Peaceful above Modest without fabricating times. Remaining legacy ties use priority and then stable record ID, never filesystem modification times or export timestamps. Writing metadata is public content, contains no machine or account identifiers, and should not be changed just because a log is edited.

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
```

Use `:::note ... :::` for each game note. The Notes page turns each note into an expandable record, and the record sidebar can search notes by title or date.

## Entry Animation Preference

The public command palette contains an `ENTRY ANIMATION` selector: `First entry only`, `Every entry`, or `Off`. First-only resets when the page reloads, not when the preference panel opens. Off skips the ACCESSING/materialization sequence but keeps the normal entry transition. The browser's reduced-motion setting takes priority over all modes.

The choice is stored under `gestalt.entry-animation` on this browser/origin only. If storage is unavailable, it still applies for the current visit. Changing it never edits or publishes records, and Studio editing remains unchanged.

## Local Studio

Use the launcher to edit a record through its local gear button, or open the standalone Studio:

```text
http://127.0.0.1:3000/studio
```

Studio can:

- create new records
- edit existing records
- upload screenshots, gifs, videos, and project samples into `public/media/records/`
- insert uploaded media into the note body
- save records back into `content/records/`

Each open note has compact heading, subheading, bullet-list and quote buttons. They format the current line or selected lines and toggle the same style back off. Standalone media lines are preserved. Inline bold/italic/link controls are deliberately withheld until the public readers support them; the toolbar does not enable raw HTML or change the content format.

`Save Record` writes locally and refreshes the static data. If the record was written but export failed, the notification panel reports the saved state and offers `Refresh archive`. This retries the generated data without saving the record again. The pending change list also identifies commits waiting to be pushed, so a failed publish can be retried after its commit already succeeded. See [Studio workflow and recovery](STUDIO_WORKFLOW.md).

Studio is disabled outside local development. The write and upload routes return `404` unless the app is running in development on `localhost` or `127.0.0.1`.

## Validate Before Commit

Run:

```powershell
node scripts/validate-content.mjs
```

The validator checks required frontmatter, section names, date format, progress range, duplicate IDs, and empty bodies.

## Publish To GitHub Pages

After saving in Studio, run:

```powershell
corepack pnpm run site:publish -- --message "Update archive"
```

That command exports the static data used by `index.html`, validates content, runs the TypeScript check, checks `static-app.js`, scans for obvious private material, then commits and pushes archive records, generated archive data, uploaded record media, and the static cache token. It refuses to publish if unrelated files are already staged. Commit site or Studio code changes separately.

Use a clear message when you want the GitHub history to say exactly what changed:

```powershell
corepack pnpm run site:publish -- -m "Add Persona notes"
```

## Publishing Model

The public site should stay read-only. Do not add a public admin panel unless there is a strong reason.

Recommended flow:

1. Edit or create records locally.
2. Run `corepack pnpm run site:publish -- --message "Your update message"`.
3. Let GitHub Pages rebuild the public site.

Only GitHub users with write access to the repository can change entries. Public visitors can read the built site but cannot write content.

## Privacy Check

Before publishing, make sure entries do not include:

- real addresses or private contact details
- account names or handles you do not want public
- serial numbers
- tokens, keys, or local paths
- private screenshots or hidden browser tabs
