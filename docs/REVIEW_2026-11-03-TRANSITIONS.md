# Transition Performance Investigation

Investigation: 3-4 November 2026. Local target: v1.70.2. Published baseline: v1.70.1. No new publication authorized.

## Findings

- Pages replaced the entire root when opening/closing a record and finishing startup. That discarded the already-visible workspace, textures, images and Memory State nodes, not just the window being changed.
- React standard/Setup entries had both a Framer Motion opacity animation and the shared CSS `window-in` opacity animation. One animation owner is sufficient; the accepted CSS construction and shared native close/minimize controller remain.
- Static, full-screen grain/scanline gradients were expensive in the test renderer. Isolating those two overlays as cached compositor surfaces improved the sampled cadence without changing their images, gradients, opacity, stacking order or animation timing. Promoting every background surface was not consistently better, so those broader experiments were removed.

These are rendering/lifecycle issues, not evidence that Gestalt needs another framework. CSS gradients, translucent surfaces and repeated rasterization can cost frames without 3D content.

## Changes

- Cache `.grain-layer`, `.scanline-layer` and the open record's own static scanline overlay using an identity transform. No blanket `will-change`, new blur or permanently promoted window tree. The last cache was checked separately after a full construction sample still delayed frames; the final sample reached p95 21 ms / max 35 ms rather than that run's 42 / 76 ms. This remains exploratory, not a guaranteed hardware-independent speed ratio.
- Keep the Pages workspace mounted through ordinary record open/close/content-tab changes. Retain the existing nested folder/mobile-navigation/timeline fallback, and honor real data refreshes deferred during exit.
- Complete Pages startup and consent dismissal in place. Remove the finished cover and boot-only attributes; do not reconstruct the revealed dashboard. Consent still appears after the loading sequence.
- Keep the same actual minimized record and its scroll/content. Resynchronize focus after hiding/restoring it.
- React standard/Setup roots use the shared CSS opening fade only. No changed durations, geometry, artwork, authoring schema, saved records, media, dependencies or lockfile.

## Timing Evidence And Limits

The loopback-only probe samples `requestAnimationFrame` intervals for 3.6 seconds following a chosen interaction, counts root replacements/DOM additions, and observes long tasks where supported. Startup sampling lasts 6.5 seconds. Sampling stops when hidden and is otherwise idle between interactions. The latest 14 summaries live only in the page, with no storage, telemetry or extra service requests.

Exploratory in-app Chromium samples at 1920x1080, Night mode:

| Action | Baseline p95 / max interval | Patched p95 / max interval | Root replacements before / after |
| --- | --- | --- | --- |
| S web search | 56 / 97 ms | 14 / 42 ms | 0 / 0 |
| First project entry | 28 / 104 ms | 21 / 35 ms | 1 / 0 |
| Close project entry | 21 / 62 ms | 14 / 28 ms | 1 / 0 |
| Minimize patched entry | Not sampled | 14 / 28 ms | Not sampled / 0 |

The initial 1280x720 boot sample had p95 35 ms and one root replacement; the patched 1920x1080 boot sample had p95 14 ms and zero replacements. Those viewports differ, so this is not a valid boot speed ratio. A later 1280x720 run still had an isolated 174 ms outlier. Occasional delays remain; do not claim all stutter is eliminated.

These are bounded diagnostic samples, not repeated controlled benchmarks, GPU presentation traces or an FPS guarantee. Browser automation, refresh rate, image decoding and other work can affect intervals. Firefox and Edge on the owner's machine still need comparison after refresh. No actual Firefox/Edge profiler was available in the connected browser.

## Verification

- TypeScript, production build, full static-shell suite, content/notebook validation and focused boot, record-motion, keyboard-focus, transition-lifecycle and desktop-navigation tests pass.
- Chromium UI checks: patched startup/consent, S/Escape, Terminal opening/close, record open/minimize/restore/close, game session notes, content tabs and maximize. Both Day and Night were exercised. A 390x844 record fit check found no horizontal content overflow. Local React record opening retained its editing gear.
- Regression tests cover retained nodes/scroll, transient tab flags, deferred refresh, focus synchronization, consent ordering, and the removal of the concurrent React fade.
- Profiling preview refused `.env.local`, Git metadata, scripts and Studio API requests with HTTP 404. It is not loaded by index.html, Next or the normal launcher, and is outside the explicit Pages artifact.
- Public CSS/runtime gzip size changes by approximately +356 bytes combined. The optimization reduces repeated rendering work, not transfer bytes.
- A later sample taken while the production build was running had multi-second frame gaps; it is not used as an A/B result. Keep it as a warning about contention/test-environment sensitivity, not evidence that every long gap has been explained. The generated development next-env.d.ts path change is unrelated and should remain outside a future release.

## Reproduce Locally

Run `node scripts/performance-preview.mjs`, then open `http://127.0.0.1:4197/` in the browser being investigated. Use the ordinary controls; read the bottom-left report after the sampling period. No notes can be edited or published from this public-only preview. Ctrl+C stops the server. The normal Gestalt launcher does not show this probe.

Next: owner Firefox/Edge acceptance, then focused engine profiling if delays remain. Preserve this accepted visual design while investigating rather than piling on unrelated layout or effect changes.
