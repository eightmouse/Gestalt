# Steam Display Snapshot

## Current Status

The dependency-free data foundation was added in `v1.36.29`; React and static dashboard readers were added in `v1.36.30`. `v1.43.1` makes the existing Studio dashboard choice a true manual pin, with matching Steam stats still allowed. `v1.44.0` adds a gated Pages deployment workflow and a public-only artifact preparer, shipped with `v1.44.2`. The owner reported a successful baseline deployment on 21 October 2026. Steam refresh activation and real-data acceptance remain pending; no real snapshot has been generated during implementation. Without that optional file, the existing authored active/Playing/first-game fallback remains in use. The old `steam:sync` publishing behavior is unchanged pending hosted acceptance.

This intentionally separates automatically refreshed Steam statistics from authored MDX. Updating hours must not modify notes, active/past classifications, record dates, or Recent Activity.

## Data Boundary

`scripts/steam-snapshot.mjs` accepts `STEAM_API_KEY` and `STEAM_ID` from its process environment. It does not import local credentials or perform requests when imported for tests.

The writer targets `public/data/steam-current.json`, using a temporary file and rename. Its public allowlist is:

- Schema version and the time the displayed data last changed.
- Game app ID, title, playtime in minutes (or null), and last-played UTC timestamp.
- Achievement counts and calculated percentage, or null when unavailable.

Steam app IDs identify games, not people. The snapshot excludes the owner's SteamID, profile URL, key, full library, friends, achievement names, and upstream error bodies. Additional properties are discarded before writing. Diagnostics never include request URLs or raw API exceptions. Requests use a timeout and refuse redirects so credentials are not forwarded to another location.

## Refresh Behavior

Both renderers use `public/steam-display.mjs` for validation, game matching, and stat formatting. React bundles it; the static shell imports it as an optional module after initialization. The snapshot URL respects the GitHub Pages project subpath. A missing module/file, HTML fallback response, malformed/unsupported JSON, or offline failure preserves the authored fallback. Fetching is limited to one attempt per page lifetime with an eight-second timeout and a 32 KB JSON limit. There is no polling loop or credentials in browser code.

With no pin, a valid snapshot selects the most recently played Steam game. It matches an archive entry by Steam app ID, not title; without a match, the dashboard still shows the game but has no entry-opening action. Studio's `Pin as Current Game` control uses the existing boolean `dashboardActive` field and overrides automatic selection. A snapshot for that same app can still refresh the pinned game's statistics; an unrelated snapshot cannot provide its hours, achievements or last-played date. If the snapshot is missing or belongs to another game, a pin retains its authored stats. Existing pins are honored without migrating content. Uncheck the pin and save to return to automatic selection; without usable Steam data, the existing Playing/first-game fallback remains available. Pin replacement/unpin saves and static export are tested in temporary records only. Existing archive covers are reused where possible; unmatched games use a Steam cover URL derived only from the validated numeric app ID, with a local background fallback on image failure and no referrer sent.

The card hides unavailable fields rather than inventing playtime or `Today`. Steam completion is labeled `Achievements`, not story completion. A tooltip describes when the snapshot last changed and its non-live nature without adding another row to the card. The static shell updates only the affected card/status/actions when the optional data arrives; it does not re-render the whole archive, interrupt a focused entry, or restart effects. Archive entries retain their authored/legacy sync fields for now.

The script resolves a vanity profile if necessary, requests the library once, and chooses the newest usable last-played timestamp rather than trusting response order. It requests achievements only for that game.

Unavailable/private library data fails without overwriting an existing snapshot. Achievement failures retain previously known counts only for the same game; a newly selected game never inherits another game's achievements. An empty achievement list is unavailable completion data, not 0%. A real list with no unlocked achievements can correctly report 0%.

`updatedAt` means the snapshot last changed, not that the owner is online or every field was verified at that instant. Previously retained achievement counts may be older. A future dashboard must not imply live presence or freshly checked achievement counts from this timestamp. Playtime is also only as current as Steam's API response.

Identical display data does not rewrite the file or advance its timestamp. A successful background sync should not create a commit merely to record a check.

## Local Use And Tests

The existing `steam:sync` command is separate and still updates record frontmatter during the current publishing flow. The new snapshot command does not replace it yet.

When intentionally generating a snapshot locally, load the existing ignored environment file without pasting secrets into a command:

```powershell
node --env-file=.env.local scripts/steam-snapshot.mjs
```

With credentials already supplied by the environment, `corepack pnpm run steam:snapshot` is equivalent. Neither command commits, pushes, deploys, or edits MDX. No real snapshot was generated during implementation.

Tests use mock HTTP responses and an isolated temporary directory, not the owner's credentials or library:

```powershell
node scripts/test-steam-snapshot.mjs
node scripts/test-steam-display.mjs
```

Coverage includes recency/order, profile validation, one-library-call behavior, missing/invalid data, achievement failure/zero distinctions, sanitized errors, public-field allowlisting, unchanged writes, and atomic replacement. Temporary fixture cleanup is constrained to the test directory.

## Remaining Integration

1. Verify the implemented readers and manual pin with actual Steam data and browser/deployed Pages behavior. Agree which mode the owner wants before enabling hosted updates; existing pinned records deliberately keep their selection until unpinned.
2. Validate covers and card fit at the standard desktop/mobile sizes. Automated tests cover React/static formatting parity, optional stats, game matching, missing-file/error fallback, escaping, bounded one-shot loading, and absent archive actions. Stats do not mutate authored records or generate activity.
3. Review/commit/push the prepared workflow, then follow the [hosting activation checklist](PAGES_DEPLOYMENT.md) with the owner. It deploys a public-only artifact directly, without commits or repository write permission. Both deployment and Steam refresh have separate opt-in gates. Configure repository secrets outside the source tree, verify the initial deployment, then enable scheduling.
4. Decide how to retire or adapt the old record-mutating sync once the snapshot path is accepted. Do not run both as competing sources of dashboard truth.

## Hosted Path (Steam Refresh Pending)

`.github/workflows/pages.yml` handles main pushes, manual runs and hourly checks at minute 23. Every job is gated by `GESTALT_PAGES_ENABLED=true`; scheduled checks additionally require `STEAM_REFRESH_ENABLED=true`. Those repository variables are not set by this code. The workflow has no pull-request trigger, dependency installation, source commit or push. Official checkout/configure/upload/deploy actions are pinned to revisions verified from their upstream tags on 21 October 2026; local `v1.44.3` updates them to explicit Node 24-compatible releases, including the composite uploader's nested action. The owner reported a green baseline deployment before that update, with runtime deprecation annotations. Steam refresh itself is still unverified. Checkout does not retain credentials. Artifact preparation has read-only repository/Pages access; only the separate deploy job has Pages/OIDC write permission, behind the `github-pages` environment. Shared concurrency serializes content and snapshot deployments without cancelling an in-progress deploy.

`scripts/prepare-pages.mjs` retrieves the existing public snapshot through the bounded shared loader, then optionally refreshes it using step-scoped Steam secrets. A confirmed 404 permits a first deployment without a snapshot. Other missing, invalid or unavailable public state stops preparation rather than silently deleting good data. Steam failure stops an hourly deployment; a normal content push can retain the verified previous snapshot. Identical Steam data causes no scheduled artifact/upload/deployment. Content pushes and manual runs still deploy the current main checkout.

The fresh `.pages-site` directory contains only the static HTML/runtime/service worker, public stylesheet, explicit data/runtime/icon files and supported public image/media/audio assets. Source MDX, Studio routes/styles, declarations, environment files, arbitrary public data files, hidden media files and linked files are excluded or rejected. Existing output directories are never recursively replaced. The snapshot is allowlisted again before writing only into the artifact; the source checkout and authored notes are untouched. Empty media directories absent from Git checkouts are allowed.

The preceding deployed snapshot is the continuity source, not a newly committed JSON file. The public Pages reader gets automatic data after a successful deployment. Local `v1.44.2` also reads the deployed snapshot through `/api/studio/steam`, once after boot; unavailable data falls back to the optional local snapshot and then authored records. The read-only POST endpoint requires the existing local-development host/origin/referer guard, uses one fixed public Pages URL, discards unknown fields and returns no-store JSON. It never reads a key, accepts a proxy target, writes a file or invokes Steam/publishing. Its bounded upstream read is cancelled if the local request aborts. No periodic polling or fetch on each section/save is added; Strict Mode shares the browser's one pending read. Production Next requests are rejected, and the static Pages reader is unchanged. The old record sync and publisher remain unchanged until hosted acceptance.

Isolated tests (`node scripts/test-pages-preparation.mjs`) cover first/normal/unchanged/changed deployments, failed Steam/public requests, sanitization, project subpaths, private-file exclusion, empty directories, linked-file rejection, existing-output protection, source preservation and workflow gate/pinning contracts. Fixtures use mock responses, not the owner's credentials. The workflow also runs dependency-free content, snapshot and artifact tests before reading secrets. GitHub's actual workflow execution, configuration and deployed data still require acceptance; local tests do not prove a remote deployment succeeded.

`node scripts/test-studio-workflow.mjs` additionally verifies the preview endpoint's local-only boundary, fixed URL despite a forged target, allowlisted/no-store output, missing/offline fallback and no upstream reads for forbidden/production requests. These requests are mocked and do not contact the owner's published site or Steam.

See the [roadmap](ROADMAP.md) for the complete automatic-update plan and primary API/deployment references.
