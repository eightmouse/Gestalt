# Firefox Recording Review

Local target: v1.70.4, including the v1.70.3 changes below. The owner supplied a locally downloaded, privacy-filtered recording on 4 November 2026 after reporting that v1.70.2 felt better but Firefox remained slower than Edge. The original recording and analysis scratch files stay outside the repository. No profile data was uploaded to a profiling/symbolication service, no dependencies were installed, and no publication was requested.

## What The Recording Shows

The capture spans about 34.2 seconds and includes the page main thread, browser main thread, compositor, renderer, scene builder and render backend. Native stacks are not symbolicated, so do not attribute a native stall to a particular graphics-driver function. Its CSS-animation markers explicitly report compositor status for individual properties:

| Effect | Accelerated properties | Non-compositor properties |
| --- | --- | --- |
| Terminal background | opacity | clip-path |
| Terminal outline | transform, opacity | border colors |
| Record content, panels, aside and labels | transform, opacity | clip-path |
| Record title | transform, opacity | clip-path, text-shadow |
| Record outer edge | None in its edge animation | border colors |
| Latest Log travelling light | opacity | top |
| NEW badge pulse | None | color, text-shadow, border colors |
| Most Memory State layers and project traces | transform, opacity | None reported for those animation properties |

This is evidence about this Firefox capture, not proof of equivalent compositor behavior in another browser or proof that each small non-compositor property individually causes the long stalls.

Selected interval-marker timings, in milliseconds:

| Marker | Count | Median | p95 | Maximum |
| --- | --- | --- | --- | --- |
| requestAnimationFrame callbacks | 170 | 0.09 | 0.27 | 0.53 |
| Styles | 1665 | 0.28 | 1.30 | 12.82 |
| DisplayList | 1052 | 0.80 | 1.33 | 2.00 |
| SceneBuilding | 1073 | 0.49 | 1.07 | 2.96 |
| CONTENT_FULL_PAINT_TIME | 1053 | 2.68 | 4.28 | 71.52 |
| CONTENT_FRAME_TIME | 1051 | 47.67 | 141.30 | 209.87 |
| Coalesced input move flusher | 644 | 6.66 | 66.31 | 135.98 |

`CONTENT_FRAME_TIME` spans content-frame production through presentation; it is not the spacing between consecutive displayed frames and must not be converted into an FPS claim. Counts and totals for nested markers overlap and cannot be added as exclusive CPU time. One page LongTask was approximately 78ms, so this is not a claim that scripting never stalls. The short animation callbacks alongside long presentation/input spans point toward the rendering/synchronization path, with exact native causes still open. The capture contains no screenshot markers; screenshot capture is not an explanation for its costs. It does not contain a web-search-surface animation, so it cannot establish S-tool-specific costs.

## Scoped Changes

- Latest Log: one empty, aria-hidden full-height track carries the existing 24px light/halo as a pseudo-element. Translate the track instead of animating top. For any container height H and progress p, both paths place the light at `-24 + p * H`. Same 7.6s timing, clipping, thickness, glow, mobile/reduced-motion behavior and Day ink treatment. React and Pages render the same track.
- NEW badge: keep the label/border readable and stationary. Its aria-hidden badge has a pre-painted, overlaid bright state whose opacity breathes at the same 5.8s rhythm. No animated color, text-shadow or border paint. No extra HTML for this glow; the existing badge is already decorative.
- Terminal: replace clipping of the plain background pseudo-element with centered scaleY, preserving the 820ms sequence and opacity. Text still has its separate unchanged population animation and is never scaled. No settings, geometry or entry-construction changes.

The larger entry-reveal mask strategy remains unchanged pending a deliberate visual comparison. The capture shows why it warrants attention; adding more unconditional compositor hints is not a substitute for redesigning expensive animation work carefully. Existing first/always/off and reduced-motion choices remain available.

## Verification And Next Step

TypeScript, the production build, content/notebook validation and the complete static-shell suite pass. Focused CSS/reader tests assert transform/opacity-only keyframes for the three changed effects, the identical light path, both reader templates, unchanged periods, pause rules and mobile/reduced-motion fallback. Day styling and Terminal construction regressions pass. Chromium checks at 1920x1080 confirmed matching light-track/container heights, the original 24px light, aligned badge/glow dimensions, Terminal opening/close and no horizontal page overflow. Night was visually inspected and Day was exercised through settings. At 390x844 both desktop signals stay hidden and no horizontal page overflow appeared. These checks establish layout/behavior, not post-change Firefox timing; no new Firefox capture or Edge comparison is claimed.

## v1.70.4 Follow-up

The owner reports only partial improvement, with entry/Terminal opening, exits and sometimes moving/reading still uneven. This is not a completed performance pass. Remove clip-path interpolation from the eight nested entry-content keyframes identified in the capture (header, layout, banner, label, title, panel, aside and micro label). The access surface still draws the same shape, grid, scan, traces and sweep while actual content populates at the same offsets/durations. Local heading/title bloom remains a small paint effect; do not claim the entire sequence is compositor-only. The smaller web-search form also loses its redundant mask, retaining its independently animated outline and field sequence. That search change is a source-level cleanup, not a measured cause from this capture, which contains no search-surface markers.

Terminal frame construction keeps its static steady outline color and existing transform/opacity sequence instead of interpolating border colors. During the shared controller's record-close or record/Terminal-minimize sequence, pause descendant CSS animations (including pseudo-elements), preserving their current frame rather than removing/restarting them. Existing WAAPI exit motion remains separate; Terminal's ordinary close retains its CSS transition. Once the actual record content has finished its 180ms close fade, make descendants visibility:hidden for the rest of frame contraction. Do not hide the root pseudo-elements, so remaining outline/background surfaces survive. Do not display:none or remove children: auto-height Setup geometry and retained note/editor state must survive. Minimize never uses the content-hidden marker.

Promise settlement is operation-scoped. Cancellation, hidden tabs, reduced motion and failed animation APIs release transient state; a late old completion cannot hide a new window. No timers, frame loops, clones, snapshots, dependencies or settings were added. Regression tests cover these invariants and mask-free content keyframes while retaining construction and exit timings. Post-change Firefox/native renderer/input timing remains open.

Verification: production build, full static-shell regressions, content/notebook validation and syntax checks pass. In-app Chromium at 1920x1080 checked project open/close; Day Terminal open/minimize/restore; S search open/Escape; a long game note scrolled to 304px, minimized and restored to the same position; and the centered Linux Setup window's open/close. Exit markers cleared and restored content was visible. At 390x844 there was no horizontal document overflow and the desktop Terminal remained hidden. Initial timing samples overlapped the production build and are not a valid comparison. One subsequent idle-build Chromium Terminal-minimize sample had no >34ms rAF gaps or LongTasks, but this is a bounded exploratory callback sample, not a rendered-FPS guarantee, controlled benchmark or Firefox/Edge verification.

Next: owner comparison/re-recording on the same page and viewport. Compare remaining native renderer/input waits and scrolling behavior rather than infer a cause from download size, CPU model or animation count. Keep raw recordings outside Git and public assets.

## Same-build Browser Comparison

The owner subsequently confirmed all three browsers were testing the same local v1.70.4 build. Their reported order is Chrome clearly smoothest, Edge still uneven, Firefox most uneven. Do not describe this as a Firefox-only problem or claim that Edge and Chrome behave equivalently. These are visual observations, not measured frame rates. Matched release testing removes a release mismatch as the explanation, but does not control browser preferences, extensions, viewport, zoom, graphics configuration or power-saving behavior.

Re-reading the shared motion, desktop-navigation and ambient-pointer helpers did not identify a new perpetual JavaScript frame loop. Ambient tracking remains event-driven and pauses while the relevant surfaces cover it. That source inspection is not proof that all interaction work is cheap. The old recording's presentation/input waits remain leads, not a post-v1.70.4 measurement or an identified graphics-driver defect.

Before another production visual change:

1. Use the same display, viewport, zoom, theme, entry and animation preference, with the build idle. Compare the same open, close and minimize actions separately.
2. Check whether Edge Energy Saver is active. If it is, temporarily disable it for the comparison, then restore the owner's preference. Microsoft documents visible slowdowns from this feature, including on desktops: https://support.microsoft.com/en-us/edge/learn-about-performance-features-in-microsoft-edge . This is a candidate to test, not an assertion that it is enabled or the cause.
3. If needed, compare Firefox in a separate uncustomized profile, without extensions, while retaining normal hardware acceleration. Do not reset/delete the owner's profile or flip experimental graphics preferences. Troubleshoot Mode changes acceleration as well as extensions, so it is not an extensions-only control.
4. Obtain a fresh local Firefox recording of the current build before attributing remaining costs to removed masks or applying another broad effects reduction. Keep the recording private and outside the repository.

No production code, effects, dependency versions or browser settings were changed for this comparison checkpoint. Firefox and Edge smoothness remain unverified; the performance item stays open.
