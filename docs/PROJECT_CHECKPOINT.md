# Gestalt Project Checkpoint

## Current Follow-Up: v1.45.0 (Local)

Local `v1.47.0` prototype: Dashboard Steam thumbnails fill their frames again; entry overview framing is unchanged. Seasonal decoration windows, timeline refresh, public Roadmap/To-do panel and revised optional navigation modes were recorded without implementing navigation changes. X Terminal occupies Memory State's card with centered explicit access, privacy notice, bounded access transition, full-area widget viewport, close and unavailable/profile fallback. Old MemoryLoop implementations remain in source but are not mounted. No provider request occurs on landing. The official script stays inside the public-only helper; development uses the fixed deployed helper on a different origin. Normal-origin messaging is required, so this is not an opaque iframe boundary on the public site. Local Studio now requires exact origin including port for Origin/Referer, with isolated regressions. Static rendering retains the connected terminal ancestor path rather than reparenting/reloading the iframe on unrelated dashboard window/palette renders. Leaving the dashboard or closing cancels/removes it. No API keys, dependency install, source note edits or push. Live post acceptance is unresolved: the provider reached widget-loading but timed out in the signed-out browser. Do not claim the feed or older-post scrolling works until owner/Pages acceptance. The helper must be published before the local development preview can load it.

Local `v1.46.0` adds per-game overview artwork framing in Studio: an expandable live preview, Automatic/Fit/Fill, zoom (50-200%), horizontal/vertical position and reset. The same bounded numeric/enum helper drives editor, API, static export and both readers. Defaults emit no framing fields/style, so existing records retain their presentation; older clients preserve omitted settings. Source images are never edited. The public helper is included in Pages packaging, static cache-token refresh and the publisher runtime guard. Owner records/drafts were not modified by tests; isolated fixtures cover save/export, old clients, reset, style injection rejection and React/static parity. The X terminal access sequence is documented but not loaded or implemented.

Local `v1.45.1` follow-up: the owner created FFXIV through the offer and reported cropped Steam artwork. Both readers now use the recognized automatic portrait's official landscape header for the wide overview, with contain framing and a one-shot original-image fallback; Current Game contains the portrait without cropping. Custom covers and owner MDX are untouched. The X feasibility note now records the preferred fixed-size Gestalt-framed official embed direction; no widget or external script is installed yet.

21 October 2026: `v1.44.4` was pushed as `df7cfc2e`. The owner fixed the two separate repository Actions secrets, and run `39575572100` attempt 3 succeeded. Public Steam snapshot and local dashboard were verified with FFXIV playtime; unavailable achievements are hidden. Scheduled refresh remains unobserved. Historical "uncommitted" and "acceptance pending" descriptions below no longer describe that release.

Current uncommitted work removes manual Current Game pinning and adds a development-only Create game record offer for unmatched Steam games. Clicking prefills the title, Steam app ID and official cover; saving/publishing remain explicit. Each new Steam game uses a separate draft key. A server-side app-ID duplicate check protects against stale views, under the existing Studio operation lock. Old pin metadata is ignored without bulk content migration. No real FFXIV record was saved or published during testing; owner will test it. No dependencies, credential changes or new external services. Next: owner acceptance, then X feed feasibility with Memory State retained. Legacy `steam:sync` cleanup and first scheduled-run acceptance remain open.

Steam first-sync diagnostics (21 October 2026): `v1.44.3` shipped as `59d7915b`, and the owner reported a successful Node 24 deployment. After enabling Steam refresh, run `39573930788` was green but logged the fallback warning and the public snapshot still returned 404. The owner confirmed both secrets are repository-scoped. A read-only local Steam request accepted the ignored local credentials and returned game/playtime data; no secret/identity values or request URLs were displayed, and no files were written. Local `v1.44.4` now fails first-sync preparation if no good snapshot exists and reports an allowlisted safe failure category, while retaining verified older snapshots for content pushes. Mock regressions cover diagnostics, hostile upstream errors, key whitespace and initial failure. No key rotation, remote settings change, real snapshot write or new dependency. This diagnostic patch remains uncommitted/unpushed; the actual GitHub failure is not yet identified.

Action runtime follow-up (21 October 2026): `v1.44.2` was committed/pushed as `0cbc20a1`. The owner reported successful prepare/deploy jobs for run `39571138497`, with Node 20 compatibility annotations. Local `v1.44.3` replaces all four top-level action pins with verified official Node 24-compatible release commits; the composite uploader's nested action was checked too. No permissions, dependency installs, source/content behavior or Steam activation changed. Exact reviewed pins and the absence of insecure-runtime overrides are regression-checked. The follow-up is not committed/pushed yet; real annotation acceptance remains pending. See `docs/PAGES_DEPLOYMENT.md` for upstream pin details and the baseline report.

## Release Checkpoint: v1.44.2

On 21 October 2026 the owner authorized review, commit and push of the accumulated batch, including the saved Kingdom Hearts Melody of Memory classification edit. The earlier follow-up paragraphs below describe the work as it was developed locally; their "uncommitted" status is historical, not the release state. This batch collects note formatting/headings, boot handoff, adaptive archive browsing, contextual tabs, full-viewport media, game placement/activity, Steam pinning and prepared hosted/local snapshot paths, plus README cleanup. Check Git history for the final release commit.

The owner confirmed Pages currently deploys from a branch and reported adding `STEAM_API_KEY`/`STEAM_ID` as repository secrets. Hosting migration, deployment gates and live Steam acceptance are still pending; pushing the workflow does not enable it. The review uses fixture-based workflow/API tests and a dependency audit, with no real Steam request or private-value disclosure. Production build and remote push results must be confirmed before reporting success. In-place editing/global review bell, X feed, navigation modes and the final cross-browser pass remain roadmap work, not delivered features.

Local preview/README follow-up (21 October 2026): local `v1.44.2` adds the guarded read-only `app/api/studio/steam/route.ts` and a one-shot post-boot client read, letting the launcher preview the same published snapshot without credentials or source writes. Missing data falls back to local/authored content. Mocked Studio workflow tests verify the access boundary, fixed upstream URL, allowlisting/no-store response and offline fallback. No real Steam request or hosted activation occurred. README now uses first-person framing and omits the editing tutorial and dated Notes section, while security guardrails remain. The owner explicitly wants to defer the larger commit/push until Steam and potentially the feed/navigation work are ready; there is no new push authorization. Live hosted acceptance necessarily requires a reviewed deployment first, so agree that test window rather than claiming the prepared workflow is already live.

Contents rail correction (21 October 2026): local `v1.44.1` removes the desktop banner-dependent minimum-height/centering rule from `app/globals.css`. Games with header art now use the same Contents alignment as unbannered Projects/Logs; category tabs and shared/mobile controls are unchanged. A targeted regression assertion prevents reintroducing the banner-dependent rail override. Chromium verified project/game heading offsets, desktop/maximized fit and mobile overflow. Shared CSS applies to both readers. No owner content or Studio drafts were edited. Still uncommitted/unpushed.

Hosted preparation follow-up (21 October 2026): local `v1.44.0` adds `.github/workflows/pages.yml` and `scripts/prepare-pages.mjs`. Both deployment and Steam fetching remain opt-in and disabled without repository variables. The workflow packages an explicit public-only artifact, preserves the deployed last good snapshot, skips unchanged scheduled deployments, uses verified action revisions and never commits/pushes or installs npm packages. Fixture tests use mock responses and isolated directories, not owner credentials or content. See `docs/PAGES_DEPLOYMENT.md` for migration, validation and rollback. No remote settings were inspected (GitHub CLI unavailable) or changed, and no actual deployment/Steam request was run. Local Next snapshot continuity and retirement of the old record sync remain open. The batch is still uncommitted/unpushed.

Steam selection follow-up (21 October 2026): local `v1.43.1` makes `dashboardActive` a true manual pin in the shared React/static resolver. Studio's control is now `Pin as Current Game`. Unpinned selection follows a valid snapshot; pinned selection accepts snapshot stats only for the same app. No new schema, dependency, polling, real Steam requests, content migration or hosted scheduling. Isolated tests cover selection, matching-only stats, save/export replacement and unpinning. The owner has a new Kingdom Hearts Melody of Memory content edit plus its static export in the worktree; this pass leaves them untouched. Accumulated source changes are still uncommitted/unpushed; content-only publishing remains intentionally blocked until the reader-code batch is committed.

Snapshot: 20 October 2026. Read this first when resuming in a new conversation, then inspect the current worktree and [roadmap](ROADMAP.md). This is a source-verified handoff, not a fresh security certification or browser performance report.

Follow-up: the same-day `v1.36.25` reliability/security batch fixes cache-token replacement, indexed Notes selector scope/date styling, and upload type/extension validation. Read [the dated review](REVIEW_2026-10-20.md) alongside this original `v1.36.24` snapshot for newer verification and open issues. These changes are still uncommitted at this handoff.

Later follow-ups: contextual note search was implemented in `v1.36.27`, media revalidation in `v1.36.28`, and an isolated Steam snapshot generator plus shared React/static display readers in `v1.36.29`/`v1.36.30`. See [the Steam snapshot notes](STEAM_SNAPSHOT.md) for the public/private boundary and tests. No real snapshot has been generated during implementation; scheduled hosting and explicit manual pin controls remain open. The existing local/publish-time Steam sync has not been replaced. A note-formatting toolbar is newly queued in the roadmap.

Next follow-up: `v1.36.26` implements [Studio save/export recovery and asynchronous publishing](STUDIO_WORKFLOW.md). It adds a guarded export-retry route, per-file atomic replacement, partial batch-save reconciliation, a shared Studio write lock, and recovery of already committed but unpushed changes. The original architecture and performance notes below are historical where superseded by that document; Firefox profiling and automatic Steam updates remain open.

## Current State

Game-state follow-up (21 October 2026): local `v1.43.0` adds explicit `gamePlacement` and optional `gameActivity` metadata, separating Session/Past location from Active/Inactive activity and authored completion/status. `lib/game-state.ts` centralizes React/Studio rules; the static reader has parity-tested equivalents. Studio saves freeze legacy placement, preserve newer fields when older clients omit them, and export the fields to static data. `scripts/test-game-state.mjs` plus isolated Studio workflow tests cover compatibility, round-trips, notes/completion preservation and validation. Browser controls were checked through a temporary, storage-free Inspector fixture that was removed. No owner records/drafts were edited or migrated. Same-window in-place editing and a local global review/publish bell are now documented roadmap directions, not implemented changes.

Image-viewer follow-up (21 October 2026): local `v1.42.2` fixes image lightboxes clipped by contained/transformed record windows. `components/archive/image-lightbox.tsx` is the shared body-portal/native-dialog viewer for samples, attachments, inline note media and Setup peripherals. Static `syncImageLightbox()` mounts outside the root and avoids rebuilding the terminal for open/close. `scripts/test-image-lightbox.mjs` checks lifecycle, keyboard handling, SSR, focus restoration and static no-rebuild behavior. This does not alter records or media files. Inspect Git status before assuming the local batch is published.

Contextual content follow-up (21 October 2026): local `v1.42.1` hides empty public project stack/sample tabs, removes fabricated stacks and banner-as-media fallbacks, and renders real gallery items only. Attachments use the existing compact gallery and retired alert CSS was removed without changing note banners. Studio's first-item editing/upload controls remain available. `scripts/test-contextual-content.mjs` runs with static-shell validation. The owner's proposed incremental month/year archive folders with newer loose notes are documented but not implemented; the `v1.42.0` threshold policy remains current. Inspect Git status before assuming either batch is published.

Field Archive follow-up (21 October 2026): local `v1.42.0` displays up to 24 archived files directly at the root under year/manual-group headings, retaining the existing folder windows above that threshold. The age rule, content schema, Studio editing and record-opening actions are unchanged. `scripts/test-field-archive.mjs` validates both renderers, threshold boundaries, ordering, escaping and stale folder state; it runs with static-shell validation. No records were rewritten. Desktop navigation variants are documented proposals only, not implemented; the current fixed sidebar remains unchanged.

Boot follow-up (21 October 2026): local `v1.41.1` adds a coordinated, opacity-only boot handoff without extending the 2.8-second sequence. `lib/boot.ts` and the static equivalent settle immediately for reduced motion and clean up timers/listeners. The initial shell is inert, consent waits for completion, and static rebuilds preserve elapsed animation time. Tests live in `scripts/test-boot.mjs` and run with static-shell validation. This follows the local `v1.41.0` H1/H2/H3 readability pass; inspect Git status before assuming either batch is published. No records or drafts were edited for these changes.

Post-checkpoint follow-up (21 October 2026): `v1.39.1` was committed and pushed as `332f71ee`, including log writing order, summary fallbacks, entry-animation preferences, the initial block-formatting toolbar and the missing optional publish-path fix. The `v1.40.0` local batch extends the toolbar with safe inline styles/code/links using the shared dependency-free `public/note-inline.js` helper (CommonJS import in React; classic script before the Pages runtime). `scripts/static-cache.mjs` also versions that helper. Tests cover both reader adapters, hostile URLs/HTML, bounded parsing and note/media preservation. A disposable storage-free editor fixture verified Chromium typing/selection/link behavior and was removed. These additions supersede the historical "newly queued" toolbar status above; inspect Git status for whether this follow-up has been published.

- Personal, public, read-only archive hosted at https://eightmouse.github.io/Gestalt/.
- Working version: `v1.36.24`. The latest local commit at this snapshot is `6e4879f3` (`Publish archive update and performance pass`), whose package version is `1.36.11`.
- The recent `v1.36.13` through `v1.36.24` roadmap changes are present in the working tree, not committed or pushed. Neither the README's "public version" label nor a local successful build proves what Pages currently serves.
- Branch: `main`. Remote/Pages deployment state was not queried for this checkpoint.
- There are 46 content records. No records were edited for this documentation pass.
- Before adding this document, modified files were `README.md`, `app/globals.css`, `app/layout.tsx`, `components/archive/dashboard.tsx`, `components/archive/record-content.tsx`, `components/archive/record-window.tsx`, `components/archive/sidebar.tsx`, `docs/ROADMAP.md`, `docs/VERSIONING.md`, `index.html`, `package.json`, and `static-app.js`.
- Preserve accumulated changes. Review the diff before a code commit; the content publisher deliberately does not collect application source changes.

## Intent And Working Preferences

Gestalt should feel like a calm personal operating system: records, files, a device bay, restrained translucent surfaces, and subtle NieR-inspired detail. Readability, consistent spacing, and smooth interaction matter more than adding effects. Keep the existing identity; this is refinement, not a redesign.

- Treat desktop, mobile handheld mode, and Studio as distinct surfaces. Shared CSS has repeatedly caused regressions between them.
- Keep cards and repeated layouts consistent across sections. Check neighboring cards whenever changing dashboard sizing.
- Make reversible changes in small batches. Discuss substantial content/navigation redesigns before implementing them.
- Tags were tried and intentionally removed. Do not reintroduce a tag-management system as an incidental feature.
- Keep originals when optimizing media. Avoid unnecessary packages and heavy third-party embeds.
- Dates displayed to readers use day/month/year. Record frontmatter uses ISO dates.
- The owner wants a seamless edit-in-place experience, with minimal terminal use and clear separation between local saves and public publishing.
- Do not include private paths, credentials, or personal history in technical documentation. Public content still requires intentional human review before publishing.

## Architecture

There are two public-facing render implementations sharing content and public CSS. This is the most important maintenance constraint.

| Surface | Entry point | Rendering and state |
| --- | --- | --- |
| Local archive | `app/page.tsx` | Loads records through `lib/content.ts`, renders `components/archive-os.tsx`; React state plus a small Zustand navigation store |
| Local editor | Embedded from the archive, or `app/studio/page.tsx` | `components/studio-client.tsx`; dynamically loaded by the archive; imports `app/studio/studio.css` |
| Public GitHub Pages site | Root `index.html` | Loads `public/data/records.js` before `static-app.js`; browser DOM templates and event delegation, with no Next server |
| Shared public styling | `app/globals.css` | Archive appearance, desktop/mobile responsive layouts, effects, record windows |
| Media cache | Root `sw.js` | Optional service worker registered by the static runtime; cache-first same-origin public image/media requests |

The Pages site is a hand-maintained static shell, not the output of `next export` or `next build`. The Next build checks the app and server routes but does not establish visual parity with `index.html`.

Pinned direct dependencies at this snapshot: Next `16.3.8`, React/React DOM `19.2.4`, Framer Motion `12.23.12`, Lucide React `0.542.0`, Zustand `5.0.13`, TypeScript `6.0.3`. Package manager: `pnpm@10.33.2`; Node engine requirement: `>=20.9.0`. These describe repository configuration, not a claim that the versions remain vulnerability-free.

### Code Map

| Location | Responsibility |
| --- | --- |
| `components/archive-os.tsx` | Archive orchestration, navigation, focused windows, boot/access timing, optional local editing |
| `components/archive/dashboard.tsx` | Dashboard panels, current game, weather, Memory State |
| `components/archive/section-page.tsx` | Section lists, Setup bay, Field Archive folders/file manager |
| `components/archive/record-window.tsx` | Shared entry frame, window controls, Contents rail, custom Setup terminal |
| `components/archive/record-content.tsx` | Overview, Notes, media, recommendations, technical stack, body parsing |
| `components/archive/record-utils.ts` | Record summaries, activity, metrics, media helpers |
| Other `components/archive/` files | Sidebar/mobile dock, palette/search, timeline, cipher/headline/boot, Setup helpers |
| `components/studio-client.tsx` | Local drafts, editable fields, notes/media editing, Setup managers, change review and publishing UI |
| `lib/content.ts`, `lib/types.ts` | Record loading and type contract |
| `lib/log-archive.ts` | Age-based log archive eligibility |
| `lib/studio.ts` | Local-request guard and input helpers |
| `lib/static-export.ts` | Calls the static record exporter after local saves/deletes |
| `scripts/export-static-records.mjs` | Generates Pages record data and rewrites media paths for the repository subdirectory |
| `scripts/publish-site.mjs` | Content checks, optional Steam sync, export/cache token update, scoped commit and push |
| `scripts/sync-steam.mjs` | Steam lookups and saved game-stat updates |
| `scripts/launch-local.mjs`, `Gestalt.cmd` | Windows local launcher and server lifecycle |

### Content And Media

`content/records/*.mdx` is the source of truth. The files use a limited frontmatter/Markdown convention and custom rendering; they are not arbitrary executable MDX/JSX. Do not add a full MDX compilation pipeline without an explicit reason.

`RecordEntry` contains identity, section/type/status, optional started date, updated date, summary/banner, progress/priority, metadata, milestones, and body. The React loader, static exporter, and browser renderer contain parallel parsing logic. Changes to the format must be checked across all three, plus Studio serialization.

Notes are stored newest first as `:::note DD / MM / YYYY - Title` blocks ending with `:::`. Legacy `:::previous-note` blocks and a plain-body fallback also exist. The Notes Page searches the original full title/date text. Existing note images can include display size/alignment/caption tokens and `full=` for the original image used by click-to-expand.

Studio uploads go under `public/media/records/`. Eligible large raster note images can get a browser Canvas display image (maximum width 1600px; WebP quality 0.82 with JPEG fallback); originals remain available. GIF, SVG, and video do not go through that raster thumbnail path. Media paths differ between local `/media/...` usage and exported `public/media/...` Pages references; maintain the export normalization.

### Save, Review, Publish

1. Launch with the local `Gestalt` shortcut or `Gestalt.cmd`. The launcher looks for an existing Gestalt server on ports 3000-3010, otherwise starts one on loopback and opens the archive. It performs no dependency install or publish. Closing its console is intended to stop its server tree; browser-tab closure is not the shutdown signal. The machine-specific shortcut is ignored by Git.
2. Edit through the archive's local gear/+ controls or `/studio`. Drafts persist in browser local storage, including while moving between records. Drafts are not saved MDX and are not publishable until saved.
3. `Save Record` calls `/api/studio/entry`, writes/renames the local MDX record, regenerates static data, and updates the local archive preview. Deletion also regenerates static data. Several records can be saved before publishing.
4. Change review uses `/api/studio/changes` to inspect saved Git changes. The notification/review panel can review pending records/media and publish them together. `/api/studio/media` handles uploads.
5. `/api/studio/publish` runs `scripts/publish-site.mjs`. It can sync Steam if configured, exports data, refreshes the static cache tokens, validates, scans for obvious private material, commits scoped paths, synchronizes the remote branch, and pushes. GitHub Pages deployment happens afterward; a successful push does not mean deployment has finished.

The content publish allowlist is currently `content/records`, `public/data/records.js`, `public/favicon.ico`, `public/favicon.svg`, `public/media/records`, and `index.html`. Unrelated staged files block the content publisher. Application source, CSS, docs, launcher, and service-worker changes need an intentional code commit.

The publisher's `--dry-run` skips commit/push but can still sync Steam and regenerate local files/cache tokens. Do not use it as a read-only diagnostic.

### Security Boundaries And External Data

- GitHub Pages serves public files only; it has no writable Studio server. Cloning the repo does not grant write access to the owner's GitHub repository.
- Studio request handlers require development mode, a loopback Host, a loopback Origin, and a loopback Referer when provided. The dev server binds to `127.0.0.1`. These are local tooling boundaries, not a public authentication system.
- `.env*`, private/local-note folders, build/dependency artifacts, the mockup, and the local shortcut are ignored. The publisher blocks tracked environment files and scans text for obvious credentials/private paths; the scan cannot determine whether an intentionally written personal story should be public.
- Steam credentials belong only in local `.env.local`. The sync script reads `STEAM_API_KEY` and `STEAM_ID`; per-game `steamAppId` metadata identifies games to sync. Playtime, last played, and achievements are saved to content. Pages does not query Steam with a secret at runtime. Stats therefore update through sync/publish, not automatically whenever a visitor opens the site.
- Weather uses IP-based approximate location (`ipapi.co`) and Open-Meteo. Network/privacy blockers can affect it. Local-memory consent is stored locally; it is not an account/login feature.
- `.npmrc`/workspace configuration pins dependencies, disables install scripts, sets a seven-day release-age delay, and restricts dependency builds/exotic dependencies. See [security notes](SECURITY.md). A fresh dependency audit is still needed when claiming current dependency safety.

## Current Product Behavior

- Dashboard: status-sorted Projects, one dashboard-active game, Latest Log with a body-derived summary fallback, Recent Activity, weather, Memory State.
- Recent Activity freshness is a 48-hour comparison. Many source dates have only day precision, so the chip cannot represent an exact per-edit 48-hour timestamp.
- Projects and Games use paired list lanes; the owner values matching container/card dimensions when switching sections. The dashboard-active game flag selects one featured game; it does not by itself define whether all other games belong in current or past logs.
- Setup is grouped into Systems, Tools, Peripherals, Notes. Tools use an optional external link; peripherals emphasize expandable photos and an optional description; systems use a compact terminal/neofetch presentation. Tools are excluded from Recent Activity.
- Logs become eligible for Field Archive after seven UTC calendar days, using `started` when present, otherwise `updated`. This is derived presentation, not a file move or scheduled Git operation. Current archive UI groups into year folders plus manually filed records.
- Mobile has a dedicated dock/menu and simpler activity/layout behavior. Desktop navigation must not inherit the mobile menu's filtering.
- Memory State is currently enabled in both implementations. Keep the code if later hidden for a feed experiment.
- FFXIV-inspired record access plays on the first record open per page lifetime, for about 3250ms, with a continuous bar and progressive materialization. Reduced motion bypasses the sequence. Boot presentation lasts about 2800ms; review overlap and initial background visibility in both renderers.

## Performance And Reliability Status

### Reported By The Owner, Still Open

Firefox has repeatedly felt slower than Edge, including loading, navigation, and record open/close. Several passes improved it, but cross-browser parity has not been demonstrated with traces or frame measurements. Chromium includes Edge and Chrome; Firefox uses Gecko. Do not assume Chrome behaves like Firefox.

Historical regressions include clipped dashboard rows, footer overlap, cut titles, inconsistent card heights, mobile changes affecting desktop navigation, and local/Pages media/cache differences. These are regression targets, not all confirmed current bugs. Test with browser chrome/zoom differences, not only F11/fullscreen.

### Existing Mitigations

- Studio CSS is separate and the archive loads the editor dynamically.
- The static runtime has no embedded fallback record dataset; missing data produces an archive error.
- Record note bodies are generated/mounted when expanded instead of eagerly rendering every body. Once loaded, collapsed bodies remain available; a long browsing session can still retain considerable DOM.
- Memory pointer updates are coalesced through requestAnimationFrame; React listeners and pending frames are cleaned up on unmount, and hidden-document pointer work is skipped.
- Clock updates are on a 30-second cadence. The static clock/weather paths have targeted DOM updates rather than requiring full renders for every update.
- CSS containment, reduced-motion rules, and paused effects behind focused records are already present. Preserve the intended look when profiling remaining repaint/compositing work.
- The static service worker caches requested media on demand. Static validation explicitly rejects eager prefetch of the whole media archive. The local React archive still has a targeted media warmup helper; inspect it before assuming both paths have identical network behavior.

### Measured Source Sizes At This Checkpoint

These are raw file bytes, not transfer sizes, bundle sizes, or timings.

| File | Bytes |
| --- | ---: |
| `static-app.js` | 112,723 |
| `app/globals.css` | 209,552 |
| `app/studio/studio.css` | 39,917 |
| `components/studio-client.tsx` | 100,528 |
| `public/data/records.js` | 111,025 |

### Concrete Follow-Ups Found During Source Review

1. **Cache-token replacement:** the original matcher left a dotted-version suffix. Fixed after this snapshot in `v1.36.25` using a shared URL-query helper with regression cases in static-shell validation.
2. **Newest Notes styling scope:** nested legacy blocks could inherit indexed-row styling, and real dates lacked the styling class. Fixed after this snapshot in `v1.36.25` with indexed-row/direct-child selectors and matching date markup in both renderers.
3. **Full static renders:** `render()` replaces `root.innerHTML` for many interactions. That can recreate images, effects, and open-window DOM even when resources come from cache. Profile the relevant interaction before considering a targeted update or module split. Targeted note search/history/clock paths already exist.
4. **Synchronous local publishing:** the publish route uses `spawnSync` with up to a 180-second timeout, blocking its Node event loop while the child runs. The changes route also uses synchronous Git calls. Potential source of local Studio stalls; not a Pages runtime cost.
5. **Save/export sequence:** each save writes content and launches a static export. Failures can occur after the MDX write but before export completes, so review disk content before assuming an error means no save happened. Broader transaction/concurrent-save guarantees have not been established.
6. **Media cache policy:** addressed after this snapshot in `v1.36.28`. Requested cached media revalidates in the background with a five-minute per-URL throttle during a worker lifetime. Explicit media-version queries are honored; explicit browser reload requests await validation with an offline fallback. Existing cache contents survive deployment. A same-path replacement updates on a subsequent image request after refresh, not by swapping an already visible image. Static-shell validation runs isolated cache behavior tests; real browser/deployed-cache verification remains part of the final regression pass.
7. **Duplicated format/business logic:** parsing, note display, archive grouping, status classification, activity, and Setup logic exist in multiple render/export paths. This is maintenance debt, not proof that current behavior is wrong. Preserve boot order and Pages subpath handling in any future split.

## Unfinished Work And Suggested Order

1. Review the latest `v1.36.24` Notes Page visually: long notes, several expanded notes, nested legacy notes, media/captions/lightbox, search results, and narrow/mobile layouts. The owner specifically requested comfortable bottom/side spacing. Code checks alone do not confirm that experience.
2. Resolve the small confirmed cache-token and Notes-selector issues, then inspect the accumulated source diff and make an intentional code commit when authorized. Content publishing cannot publish the uncommitted CSS/components.
3. Finish shared entry-window polish: the new control glyphs and local gear are implemented; the Contents rail adjustment was accepted as an improvement but may need a later alignment pass. Check Games, Projects, Logs, and the custom Setup frame independently.
4. Design live-service game states with the owner. Persistent games should not be forced into Past Logs merely because the owner pauses them. Candidate labels were `Ongoing` and `Not Playing`; schema and Studio controls are undecided.
5. Show archived notes directly at the archive root while the collection is small; introduce folders when useful. The current implementation still always uses folders. Define a threshold/grouping behavior before changing it.
6. Evaluate a Gestalt-styled public X/Twitter feed in the Memory State space. This is an idea only: no provider, credential model, or implementation is selected. Keep Memory State visible until a replacement is reviewable, and preserve it as a fallback.
7. Expose record-access animation preferences in the command palette (first entry, each entry, disabled) after the animation itself is accepted. This was requested in conversation and is not implemented yet.
8. Run the final browser/performance regression with actual profiling before adding heavier effects or attempting a broad CSS/runtime refactor.

## Verification And Resume Procedure

Checks rerun successfully on 20 October 2026: TypeScript typecheck, content validation (46 records), static-shell validation, JavaScript syntax checks for `static-app.js` and `sw.js`, and `git diff --check`. The preceding Notes implementation passed a production build, but has not received a browser visual review in this session. No fresh dependency audit, public deployment verification, or Firefox/Chromium performance trace was performed for this checkpoint.

Useful checks (these do not publish):

```powershell
git status --short
git diff --stat
corepack pnpm run check
node scripts/validate-content.mjs
node scripts/validate-static-shell.mjs
node --check static-app.js
node --check sw.js
git diff --check
```

For code changes, also use `corepack pnpm run build`. When reassessing dependency safety, run `corepack pnpm audit` against current advisories; do not infer current safety from old documentation. Avoid installing/upgrading packages as part of a routine handoff.

Visual regression targets: Firefox and Chrome/Edge at 1920x1080, 2560x1440, 3840x2160, compact 1366x768, and a mobile viewport. Check practical content viewport heights, zoom, scrollbars, dashboard/footer fit, record controls, focus/stacking, click-out behavior, note scrolling, and media. Stop temporary servers started for a test when finished unless the owner explicitly wants one left running.

Suggested opening instruction for a fresh conversation:

> Read docs/PROJECT_CHECKPOINT.md and docs/ROADMAP.md, then inspect git status and the current source before changing anything. Gestalt has both React and static Pages renderers. Preserve existing uncommitted work and the desktop/mobile/Studio boundaries. Start with the listed small reliability issues and the latest Notes visual review; do not publish, install dependencies, or redesign the archive as part of reading the checkpoint.

Related references: [README](../README.md), [roadmap](ROADMAP.md), [content workflow](CONTENT_WORKFLOW.md), [security notes](SECURITY.md), [versioning](VERSIONING.md).
