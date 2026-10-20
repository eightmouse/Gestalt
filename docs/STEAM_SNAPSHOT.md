# Steam Display Snapshot

## Current Status

The dependency-free data foundation was added in `v1.36.29`; React and static dashboard readers were added in `v1.36.30`. No scheduled workflow is enabled, and no real snapshot has been generated during implementation. Without that optional file, the existing authored active/Playing/first-game fallback remains in use. The old `steam:sync` publishing behavior is unchanged pending the hosted-refresh stage.

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

A valid snapshot takes precedence over the legacy dashboard-active record. It matches an archive entry by Steam app ID, not title; without a match, the dashboard still shows the game but has no entry-opening action. An explicit manual pin override is not implemented yet. Existing archive covers are reused where possible; unmatched games use a Steam cover URL derived only from the validated numeric app ID, with a local background fallback on image failure and no referrer sent.

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

1. Verify the implemented readers with actual Steam data and browser/deployed Pages behavior. Add a deliberate manual pin override alongside automatic mode before enabling hosted updates.
2. Validate covers and card fit at the standard desktop/mobile sizes. Automated tests cover React/static formatting parity, optional stats, game matching, missing-file/error fallback, escaping, bounded one-shot loading, and absent archive actions. Stats do not mutate authored records or generate activity.
3. Add a scoped, concurrency-controlled GitHub workflow with secret-backed fetching and an explicit Pages deployment path. GitHub-token commits alone do not trigger a branch-based Pages build. Configure repository secrets outside the source tree, and verify deployment before enabling scheduling.
4. Decide how to retire or adapt the old record-mutating sync once the snapshot path is accepted. Do not run both as competing sources of dashboard truth.

See the [roadmap](ROADMAP.md) for the complete automatic-update plan and primary API/deployment references.
