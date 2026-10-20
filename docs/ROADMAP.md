# Gestalt Roadmap

## Experience Polish

- Improve Field Archive text contrast, weight, and clarity across Firefox, Edge, and Chromium-based browsers while preserving its file-manager layout. Completed in `v1.36.5`.
- Refine the record-access transition inspired by FFXIV's Portable Archive: let the access surface resolve into the real entry frame, then blend it into the record without an extra full-screen animated layer. Tuned against the supplied clip in `v1.36.10`; review the feel before treating it as final. Keep it cosmetic unless real media preloading is needed, and support reduced motion.
- Simplify the record-access progress indicator into one continuous straight bar instead of segmented blocks, while keeping it in sync with the entry materialization. Implemented in `v1.36.13`.
- Reduce record-open work in Firefox by mounting note-body markup only for expanded notes. Implemented in `v1.36.7`; compare browser performance during the final regression pass.
- Fix desktop viewport spacing differences in Edge, starting with the landing-page Projects panel. Normalize visible row heights across browsers in `v1.36.15`; verify at common desktop sizes.
- Normalize the Logs and Setup section layouts so their top rules, content widths, and spacing align consistently. Removed the extra trailing inset from both scroll regions in `v1.36.14`; verify across browser scrollbar modes.
- Revisit how notes are presented inside record entries. Restyled the existing accordions as indexed date/title archive rows and inset the reading body in `v1.36.24`, preserving note storage and expand/collapse behavior.
- Explore replacing the dashboard Memory State panel with a Gestalt-styled public X/Twitter post feed. Compare low-impact, credential-safe options for GitHub Pages; avoid exposing API keys or loading a heavy third-party embed on every visit. Keep Memory State visible as the current placeholder, and retain its implementation so it can be hidden (not deleted) if the feed is tried and later rejected.
- Rebalance the entry Contents rail against the adjacent header thumbnail: lower the Contents heading and give the rail a more harmonious height without stretching its metadata/actions awkwardly. Centered the navigation group within a matching-height area for bannered desktop records in `v1.36.20`; verify Games and Projects at smaller desktop widths.

## Record Content

- Hide the Attachments section in Logs when a record has no attachments; show it only when media or other attachments are present. Implemented in `v1.36.14`.
- Revisit the `01_Overview` area for Logs, which can feel empty. Added a latest-note title/date preview with the existing note-derived summary in `v1.36.17`, without adding a progress bar. Games can also feel sparse, though their completion/filed indicator helps.
- Implemented in `v1.36.27`: show `Search note` only when an entry contains more than one parsed note, regardless of category. React and the static Pages shell both omit the entire control for zero or one note, leaving no empty placeholder. Search remains available when filtering a multi-note entry down to one result.
- Review other content-dependent controls and reserved spaces for the same problem: show them when they serve the actual record. Preserve useful empty editor/upload targets in Studio, where adding the first item still requires an affordance. Collect specific examples before making broad changes.

## Current Game Automatic Steam Updates

Goal: the dashboard should follow the owner's actual most recently played Steam game and refresh playtime, last played, and achievement completion without requiring a Studio save or manual content push.

- Existing behavior: `scripts/sync-steam.mjs` runs locally/on publish for games with `steamAppId`; the dashboard selection uses the manually active record or its existing fallbacks. Neither path currently provides automatic hosted refreshes.
- Foundation added in `v1.36.29`: a separate dependency-free snapshot generator with allowlisted public fields, one library request, recency selection, unavailable-stat handling, atomic/no-op writes, and isolated tests. It is not wired into the dashboards or enabled on GitHub, and the existing record sync is unchanged. See [snapshot implementation and remaining integration](STEAM_SNAPSHOT.md).
- Display integration added in `v1.36.30`: both renderers use the shared snapshot validator/resolver, retain authored fallback when the optional file is unavailable, omit unknown stats, and show unmatched games without broken record actions. Loading is bounded and once per page; the static shell updates only the affected card/status/actions. Scheduling, real-data/browser deployment verification, manual pin controls, and retirement of the old record-writing sync remain open. The generator is still not run against real credentials during implementation.
- Proposed Pages-compatible approach: a scheduled GitHub Actions job (initial candidate: hourly, with a manual run option) fetches Steam data with credentials stored in GitHub Secrets and publishes a small allowlisted display snapshot. The browser reads that snapshot, never the key or raw player/library payload. This workflow is not configured or enabled yet.
- Determine the newest game using last-played timestamps; do not assume a recent-games response is ordered by recency or that the first returned game is the last played. Reuse one owned/recent-games response per sync instead of requesting the library separately for every record.
- Render title/cover, real playtime, and last-played data. Calculate achievement completion as unlocked / total only when achievement data exists and total is greater than zero. Hide unavailable stats instead of using invented playtime/`Today`, interpreting API failure as 0%, or implying story completion. Non-Steam games retain a deliberate manual path.
- Match the snapshot to an existing archive record by Steam app ID. If no record exists, allow a dashboard-only game snapshot; offer the record-opening action only when there is a matching record. Do not create notes/records or change current/past log classification automatically. Retain manual pinning as a proposed override/fallback.
- Keep automatic stats separate from authored note content and activity timestamps, so syncing hours does not generate Recent Activity entries, rewrite summaries, or create conflicts with unsaved Studio work. Keep the last good snapshot on transient API failures and expose freshness unobtrusively.
- Verify the Pages deployment path explicitly: commits made with the workflow's `GITHUB_TOKEN` do not trigger a Pages build. Plan an explicit deployment step or an equivalent verified data delivery path, without recursive workflows or overlapping Studio publishes. Prefer scoped permissions, pinned action revisions, no installs for a dependency-free fetch script, and no commits/deployments when public data is unchanged.
- Treat refreshes as periodic, not live presence. GitHub schedules can be delayed and public-repository schedules can be disabled after 60 days of inactivity. Provide a manual recovery path and test private-profile/missing-achievement/offline cases in both renderers before enabling it.

Planning references: [Steam player data](https://partner.steamgames.com/doc/webapi/IPlayerService), [Steam achievements](https://partner.steamgames.com/doc/webapi/ISteamUserStats), [GitHub Secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets), [schedule limitations](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), [token-triggered Pages behavior](https://docs.github.com/en/actions/concepts/security/github_token).

## Games Archive States

- Separate finite games that are finished and belong in Past Logs from persistent live-service games such as FFXIV, Path of Exile 2, Diablo IV, and World of Warcraft. Explore an `Ongoing` or `Not Playing` state for live-service titles, and decide where that state should appear in the game card or entry before changing the Studio workflow.

## Editing Experience

- Add a compact note-formatting toolbar in Studio: title/headings, bold, italic, links, lists, quotes, and useful common formatting. Preserve the existing note/media format, selection and caret behavior, and local-save workflow rather than introducing a separate rich-text document model. Evaluate underline explicitly: Markdown has no native underline syntax, and raw HTML must not be enabled just to support it. Test formatting round-trips through Studio, React, and the static Pages renderer before enabling controls; only offer formats that actually render correctly.

- Replace the wide `Edit locally` entry-header button with a compact Gestalt-style gear icon beside `// ARCHIVE ENTRY`. Implemented in `v1.36.22`; refined the icon to a recognizable gear in `v1.36.23`. The Setup prompt shares it, with tooltip, accessible name, and existing edit action.
- Redesign the entry-window minimize, maximize, and close controls as a coherent Gestalt-style set. Preserved recognizable actions and accessible names, added a restore-state glyph plus visible keyboard focus, and applied the shared visuals across archive, Setup, and timeline windows in `v1.36.21`.

## Field Archive

- Show individual archived notes at the archive root while the collection is small. Introduce category folders only when the archive grows enough that folders improve browsing rather than making the section feel empty.

## Final Regression Pass

- After the planned UI changes, compare Firefox, Edge, and Chromium performance and behavior, prioritizing the dashboard and record-view experience. Profile before removing visual effects; fix regressions found along the way.
- Firefox profiling remains open: the connected test surface in the `v1.36.25` review was Chromium only. Notes layout was checked at desktop and mobile sizes; Memory State was confirmed paused behind a focused entry.

## Reliability And Security

- Fixed dotted publish-cache tokens and isolated indexed Notes styles from nested accordions in `v1.36.25`.
- Reviewed dependencies, local write/publish boundaries, public text, and JPEG identity/GPS metadata in `v1.36.25`. Hardened upload signatures/extensions and generalized private-path/environment-file guards. See [the dated review](REVIEW_2026-10-20.md) for evidence and limits.
- Save/export recovery and asynchronous local publishing implemented in `v1.36.26`: saved-but-unexported responses, a local archive refresh retry, atomic record/static-data replacement, partial batch-save reconciliation, a shared Studio write lock, and retries for existing unpushed commits. Isolated workflow tests cover failures, concurrency, process-tree timeout, and Git retry without publishing the real project. See [the workflow notes](STUDIO_WORKFLOW.md).
- Media invalidation updated in `v1.36.28`: requested public media retains the existing cache, serves cached copies immediately, and revalidates in the background with five-minute per-URL throttling while the worker stays alive. Same-path replacements become available on the next image request after a successful refresh; explicit media-version URLs remain separate, and explicit browser reload requests wait for validation with an offline fallback. No eager downloads, automatic image swaps, or cache wipe per deployment. Range/authenticated/no-store requests bypass interception. Isolated regression checks run with static-shell validation. Profile remaining public browser frame costs separately from local Studio subprocess work.
- Collect the owner's next visual observations as a separate issue batch; prioritize reproducible bugs before new UI features.
