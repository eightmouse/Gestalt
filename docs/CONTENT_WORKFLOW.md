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

Game records have independent placement and optional session activity. In Studio's Inspector, `Log placement` chooses `Session Logs` or `Past Logs`; it does not rewrite Status, completion, or existing notes. `Session activity` offers `Active`, `Inactive`, or the existing record status. Inactive games stay in Session Logs. Moving a game to Past Logs clears its dashboard pin, but does not declare it completed. Move the same record back for DLC without creating a duplicate.

`Pin as Current Game` overrides automatic Steam game selection using the existing `dashboardActive` field. Only one saved game is pinned at a time. Matching Steam snapshot data can refresh its stats, but another game's snapshot never replaces its title or supplies its stats. Uncheck and save to follow the latest Steam game when a snapshot is available. Without that optional data, the dashboard still falls back to an authored Playing/first game. Hosted periodic refresh is not enabled yet; see [Steam snapshot status](STEAM_SNAPSHOT.md).

Saved game frontmatter uses `gamePlacement: "session"` or `"past"`, with optional `gameActivity: "active"` or `"inactive"`. Without activity, the authored Status stays visible. An explicit activity appears on Session cards and alongside Status in the entry header; Past cards use the authored Status. Recommendation/completion fields remain authored independently. Legacy files keep their existing status-based placement until saved; Studio then stores the placement so later status/note edits cannot move the record accidentally. Older drafts remain readable. Steam stats do not change these fields. No subscription/account tracking is added.

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

## Note Headings

The H1, H2 and H3 toolbar icons write `# `, `## ` and `### ` respectively. Selecting an existing heading and choosing another level replaces its marker; choosing the same level removes it. Inline formatting and media stay intact. Headings are note-relative, rendered as document levels 3/4/5 beneath Gestalt's existing page and record titles, so adding H1 text does not create another page-level title. Reading sizes are 20/17/15px with wrapping for long names and clearer H3 contrast.

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

Each open note has compact heading, subheading, bullet-list, quote, bold, italic, inline-code and link buttons. Block controls format the current or selected lines; inline controls use the selected text, with a replaceable placeholder when nothing is selected. Bold/italic also support the usual Ctrl/Cmd+B and Ctrl/Cmd+I shortcuts within the note body. Selection, focus and scroll position are restored after formatting.

Links use a small inline destination field, with confirm/cancel controls and Enter/Escape support. Only valid absolute HTTP/HTTPS URLs without embedded credentials are accepted. If the note body changes while the link field is open, cancel and reselect before inserting; stale offsets are never applied to the new text. Link labels can contain bold/italic, but not brackets or line breaks. Public links open in a new tab without sharing a referrer or granting opener access.

Both public readers support `**bold**`, `*italic*`, combined/nested styles, backtick code spans and `[label](https://example.test/)` links. Code is literal; raw HTML remains escaped. This is a bounded inline subset, not a full Markdown engine: underscore emphasis, underline, arbitrary HTML, reference-style links and nested links are not added. Existing media lines, captions and full-original tokens remain unchanged. Very long or deeply nested lines safely fall back to literal text rather than unbounded parsing.

`Save Record` writes locally and refreshes the static data. If the record was written but export failed, the notification panel reports the saved state and offers `Refresh archive`. This retries the generated data without saving the record again. The pending change list also identifies commits waiting to be pushed, so a failed publish can be retried after its commit already succeeded. See [Studio workflow and recovery](STUDIO_WORKFLOW.md).

Studio is disabled outside local development. The write and upload routes return `404` unless the app is running in development on `localhost` or `127.0.0.1`.

## Validate Before Commit

Code updates and note publishing are separate on purpose. If the public runtime or its shared scripts have uncommitted changes, `Publish Changes` stops before syncing or staging content and asks for the site-code batch to be committed first. This prevents Pages receiving new HTML without its matching reader code. Local saves remain available; no notes need to be deleted or recreated. Once the code batch is committed, normal content publishing works again and can also push that commit if it is still local.

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
