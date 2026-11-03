# Responsive and Background Motion Review

Release: `v1.68.14`. Work begun 2 November; release review resumed 3 November 2026.

## Scope

Preserve the accepted design while correcting demonstrated large-desktop proportion errors, reducing unnecessary decorative work and fixing record-window keyboard focus. No new dependencies, content schema, original media changes or Studio redesign.

## Findings and Changes

- Large desktop overrides made title-bar, Contents and date labels smaller relative to their windows. They now retain the baseline proportions using the existing discrete desktop tiers.
- Section headings, navigation marks and Setup titles now scale with their allocated space. Archive retains its specialized footer reservation instead of inheriting the general large-tier reservation.
- React and the static reader duplicated Memory State pointer processing. A shared disposable helper now coalesces input into at most one animation frame, caches bounds, avoids unchanged style writes and pauses work when hidden, covered, offscreen or reduced-motion/coarse-pointer conditions apply.
- Decorative dashboard animations pause while covered or hidden without remounting the dashboard or restarting their phase.
- Keyboard testing reproduced Tab escaping a record window into the background. Both readers now bound Tab/Shift+Tab within visible record controls, focus the dialog on opening and restore focus on closing/minimizing. Existing opening animations and window geometry are preserved.
- The Pages asset guard checks external scripts throughout the real HTML and requires the new shared helper before the static reader. Missing, late and unreferenced helper cases have negative tests.

## Rendered Checks

In-app Chromium rendered geometry and interaction checks covered 1920x1080, 1920x950, 2560x1440, 3840x2160, 2400x1350, 1366x768 and mobile 390x844 / 390x700 viewports.

- Dashboard cards stayed inside the page without horizontal overflow.
- Long game titles, record contents and controls fit at the tested tiers. Maximized Notes retained vertical scrolling and loaded images without horizontal overflow.
- Setup lanes and Archive files remained contained; specialized Archive footer spacing was restored at 4K-sized CSS viewports.
- Day and Night were inspected. Baseline desktop and mobile geometry were not redesigned.
- Opening the palette paused Memory State and weather decoration; closing it resumed them without remounting. Offscreen mobile Memory State paused.
- Record opening, closing, minimizing and maximizing worked. Tab and Shift+Tab wrapped correctly after the focus fix; minimizing focused Restore active record.
- Browser warning/error logs were empty after the exercised interactions.

These are CSS viewport simulations, not physical display, OS scaling or actual browser zoom measurements. The 2400x1350 check is an expanded CSS viewport, not a real 80% Ctrl+zoom test.

The temporary static preview could not be reached by the browser tool. Rendered checks used the existing local React reader; the static path is covered by shared-helper, parity and prepared-artifact tests, not a claimed static-browser visual inspection.

## Regression and Security Checks

TypeScript, content validation (57 records), the static-shell regression suite, shared motion/focus tests and Pages asset tests passed. Disposable content-publishing and Studio workflow tests passed, including save failures, retries, concurrent saves, staged-code isolation and interrupted Git finalization. JavaScript syntax and diff-whitespace checks are part of the final release gate.

The dependency audit reported zero known advisories across 66 dependencies. No packages were installed or updated. This is a point-in-time advisory result, not a guarantee against every vulnerability.

The publisher privacy scanner passed against Git-visible text files. Ignored environment files were not opened. No content, original media, static record data or lockfile changes are included. The existing generated `next-env.d.ts` change is excluded from this release.

## Cost and Limits

Gzip sizes below normalize CRLF to LF to compare the committed baseline fairly:

| Asset | v1.68.13 bytes | v1.68.14 bytes |
| --- | ---: | ---: |
| static-app.js | 36,908 | 36,651 |
| app/globals.css | 44,125 | 44,411 |
| public/record-motion.js | 1,741 | 2,239 |
| public/ambient-motion.js | 0 | 1,267 |

Net cost across these assets is 1,794 compressed bytes (about 1.75 KiB). The static runtime shrank, but total transferred code did not. Benefits are reduced duplicated logic and unnecessary background/input work, not a smaller total bundle or a measured FPS improvement. No polling or image-processing dependency was added.

Actual Firefox/Edge frame-time profiles, physical 2K/4K displays, OS scaling, real browser zoom and screen-reader acceptance remain open. The owner agreed to compare Firefox and Edge opening/closing behavior after this pass. Do not mark cross-browser performance finished based on these checks alone.
