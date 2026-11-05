# Runtime Stability Review

Local target: v1.73.1, based on published v1.73.0 (2afc93fa). This is the first runtime part of the deeper stability pass, not a complete browser-performance or security certification. Owner records, media, dependencies and accepted animation timings are unchanged. Keep the active local editor running; do not replace its build output.

## Confirmed Repeated Work

- The React workspace derived activity and sidebar metrics on unrelated state updates. The current 57-record dataset caused 144 note parses per uncached pair of calculations. A warmed 100-iteration Node sample measured median 2.55 ms / p95 3.69 ms. These are pure data calculations, not browser presentation or FPS.
- Activity derivation calculated the same trace twice for non-log records. Reusing the trace in both readers reduces that pair to 94 parses. A later Node sample measured median 0.93 ms / p95 1.33 ms; timings are exploratory, while the parse-count reduction is structural.
- React now memoizes activity, metrics, project ordering and latest-log selection by their actual inputs. Closed search does no work, including when its previous query remains populated. Saved records and current-game changes invalidate the relevant results. Project sorting copies the section array instead of mutating it.
- Memory State previously scrolled and read all retained row rectangles during every small typing burst, even when all lines fit. The bounded fitting-stream regression observed 56 rectangle reads before the change and zero after. The new path compares scroll height, viewport height and width first. Overflow, wrapping and resizing still follow/prune; unchanged geometry does not rewrite scroll position. No new timer, frame loop or changed rhythm.
- The legacy visual's pointer guard missed the consent/blocked flag already used by CSS and Code Surface. The existing pause condition now includes it; no new observer is needed.

## Settings And Palette

The public reader still rebuilt its entire root to open and close Settings. One visible Chromium 1920x1080 exploratory close sample included a roughly 77 ms LongTask and one root replacement. Settings now updates the native dialog and shared focus classes in place. It preserves workspace, images, stream, scroll and a record underneath. Closing restores record focus when applicable. Mobile navigation retains its existing full-render dismissal fallback.

The follow-up Settings-close sample had zero root replacements, zero LongTasks, p95 7 ms and max 21 ms rAF gaps. The opening sample had zero root replacements/LongTasks but one 42 ms gap. These are individual diagnostic samples, not controlled A/B trials or displayed-frame-rate guarantees. The probe observes mutations inside the archive root; its node counts do not include native dialogs mounted outside that root.

UI checks found a pre-existing palette hit-testing problem over records: the header's z-index 20 and focus opacity trapped its nominally higher popup under the record at z-index 60. The conditional CSS removes only that header stacking context while the palette exists, preserves dimming on the background title/clock, and raises the popup itself. Mobile's in-flow popup must be position:relative with inset:auto so its z-index applies without shifting its layout. Ordinary header/record/backdrop ordering remains unchanged. Real hit-testing and mouse activation passed in both themes at 1920x1080 and 390x844; entry controls outside the popup stayed clickable and no horizontal overflow appeared. Local Settings also closes its native layer before returning keyboard focus to the retained record, matching Pages.

## Regression Boundaries

Tests cover memo invalidation after a saved note, immediate search freshness, current-game changes, frozen section inputs, fitting/overflowing/wrapping stream geometry, continuing numbering, hidden/covered/reduced-motion/unmount cleanup and consent-covered pointer work. An existing randomized burst test checked only the final visible lines after 20 seconds; legitimate idle writing could already have pruned the newest action. It now checks that the action appears during a bounded 30-second virtual interval, allowing the slowest authored writing cadence instead of requiring permanent scrollback.

The opt-in probe and analysis harness stay out of Pages and the normal launcher. Raw performance recordings and scratch data stay outside Git. Publication uses the same explicit public allowlist, and local save/publish routes retain development, loopback and same-origin checks. No permission, media-validation or credential handling changes are part of this patch.

## Verification

TypeScript, the full static-shell suite, content/notebook validation, runtime/service-worker syntax and whitespace checks pass. The repository private-material scanner passes, no private environment files are tracked and pnpm audit reports no known vulnerabilities on the review date. A fresh prepared artifact resolves 32 shared assets and contains no environment files, Studio/API routes, dependencies or profiling helpers. These are scoped checks, not proof of zero vulnerabilities.

Both actual readers were exercised without editing owner content. The local entry gear remains available; Settings close now restores focus inside the retained entry. Chromium checked entry opening/close/minimize, S search/Escape, Settings, palette hit-testing, Day/Night and mobile containment. A later public entry-close sample had zero root replacements/LongTasks, p95 7 ms and max 21 ms gaps. No fresh Firefox/Edge or GPU-presentation claim is implied.

The isolated content-publisher dry-run passed against committed v1.73.0 while all local v1.73.1 source edits remained uncommitted. It prepared the compatible notebook/cache changes in its temporary checkout only; no commit/push or owner-content change was made. Owner notes/media/generated record data and the dependency lockfile have no diff from the start of this pass. Generated development next-env.d.ts remains unrelated and untouched.

## Still Open

- Full section navigation still replaces the public workspace; one Projects navigation sample showed a roughly 60 ms LongTask. Review that lifecycle separately rather than rewrite all navigation in this patch.
- Actual Firefox/Edge profiling on the current release, browser zoom and broader display/accessibility checks remain open. Chrome is the owner's everyday baseline, not proof of equivalent behavior elsewhere.
- A fresh production build is deferred while the owner's editor is active. TypeScript, focused/full regression checks and real reader checks are the verification path for this local batch.
- Complete the broader security/content and prepared-artifact review before the next publication. A passing advisory scan alone cannot establish absence of vulnerabilities.

Owner authorized reviewing, committing and pushing this scoped v1.73.1 batch on 5 November, together with the Archive Relay roadmap addition. File only the completed fixes; the wider review stays open. Relay is not implemented and introduces no credentials or runtime code. Final release checks, public deployment verification and an isolated content-publishing dry-run are required; exclude generated development types and leave the owner's running editor alone.

Release recheck: TypeScript, 57-record content validation, notebook data, runtime/service-worker syntax and the publisher's private-material scan pass; dependency audit reports no known vulnerabilities. The first full suite hit a Windows sandbox EPERM in an isolated notebook temporary-file rename. That test and the full suite pass outside the restriction. Public artifact preparation also passes with the verified deployed snapshot: 32 shared assets and 153 allowlisted files, without reading private Steam credentials. No owner records/media, generated record data or lockfile changed. A production build remains deferred while the owner's editor is active. Git/Pages and the post-commit independent publishing check follow.
