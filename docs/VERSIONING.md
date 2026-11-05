# Versioning

Gestalt uses Semantic Versioning after `v1.0.0`.

Current version: `v1.73.1`. Release base: `v1.73.0` (2afc93fa).

5 November release review: owner authorized committing and pushing v1.73.1, including the Archive Relay roadmap idea. File only this patch's completed fixes; the wider stability pass stays open. No new feature, dependency or credential integration is included. Exclude generated development types and verify Git, Pages and independent note publishing before reporting publication success. This supersedes the historical hold-publication notes below for this batch only.

`v1.73.1` begins the runtime stability pass without visual changes: reuse derived React readouts while inputs are stable, keep closed search idle, sort dashboard projects without mutating section arrays, and reuse the existing activity trace in both readers. Memory State follows/prunes only when stream dimensions change or overflow requires it, including width/wrapping invalidation. The legacy pointer helper also pauses during consent. Existing timers, rhythm, history bounds and accessibility behavior remain; add focused lifecycle/invalidation tests. This is not a whole-site FPS or cross-browser sign-off. Hold commit/push for owner review.

The same patch keeps public Settings open/close from rebuilding the workspace, retaining native-dialog focus and the mobile-menu fallback. Its control checks exposed the existing palette/header stacking conflict over entries; a conditional stacking fix lifts only the popup and keeps the title/clock dimming and ordinary record-control order. The in-flow mobile popup receives position:relative/inset:auto without new dimensions or offsets.

5 November release review: owner approved publishing the folder batch before the stability pass, including the saved NIKKE note. This supersedes the local hold-publication note below for this batch only. File the accepted work, run release checks, stage explicit reviewed paths and verify Pages plus the isolated note-publishing path. Exclude generated development types and keep the active Studio server running.

`v1.73.0` adds gradual month/year Field Archive presentation: loose recent notes and older month folders coexist, preserving complete months, original writing order and a minimum 12-file recent buffer. The 24-note threshold stays; only older multi-file months fold as needed. Manual archive records stay loose. Existing folder-window controls, themes and responsive geometry remain, with one root scrolling surface. No content migration, dependency, background scheduler or new publish authorization.

5 November release review: owner accepted both motion passes and authorized commit/push before further note writing. This supersedes the local hold-publication notes below for this batch. File the ambient milestone, validate the public artifact, then verify deployment and the isolated content-publish path against the new commit. Exclude generated development-only types and leave the active Studio server alone.

`v1.72.2` varies the remaining ambient dashboard and seasonal rhythms while preserving their distinct appearance: steady-speed downward log scans, unequal cover breaths, staggered NEW acknowledgements, rare bounded weather bursts and settling ornaments/embers. Use existing CSS surfaces and shared pause guards; leave layout, readable text, images, Memory State, boot and real loading indicators unchanged. No dependency, schema or author-content changes; not committed/pushed.

`v1.72.1` varies the Projects separator light's CSS rhythm across three passes and unequal rests, preserving its accepted geometry, glow, brightness and one-way path. Other card effects and layout stay unchanged. Restore the existing React hidden-tab guard for either Memory State mode and pause Project lights during navigation-blocked states. No new timers, frame loops, dependency, content/schema change or publication requested.

5 November release review: owner authorized committing and pushing v1.72.0 with saved game notes and media. This supersedes the historical hold-publication notes below for this batch. The accepted Memory State, Timeline, window-control and transition work is filed in the public notebook; deeper browser performance remains open. Deployment verification follows the push.

`v1.72.0` changes Memory State's event-list presentation into a bounded display-only pseudocode writer, combining real-action templates and quiet decorative idle passages. Settings puts Legacy Visual left and Code Surface right, keeping the newer default and existing saved values. A single cancellable scheduler pauses under visibility/coverage guards; reduced motion shows complete action blocks only. The one-way stream drops fully clipped rows while keeping advancing numbers, without manual scrollback or the visible PSEUDOCODE label. Original visual, permission boundaries, dependencies and owner content remain unchanged. Local review only; no new commit/push authorized.

`v1.71.1` places normal entry and notebook edit gears beside the right-hand window controls, matching Setup's established placement. Gears retain their existing size, hover/focus states, labels and edit/read callbacks. Notebook Save/File/Reload controls stay on the same side, with its gear nearest Close. Header labels can ellipsize before crowding controls on small screens. Setup and public read-only boundaries are unchanged. No new commit/push authorized.

`v1.71.0` turns Memory State into an optional session-action trace, while preserving the moving visual under Settings > Memory State > Legacy Visual. A shared dependency-free helper retains at most 32 allowlisted events per document, without record titles or IDs, draft text, queries, storage or network transmission. Only the selected variant is mounted; listeners detach when leaving Dashboard, while the bounded history survives section changes. Rows arrive once per real action and offscreen/hidden updates wait. The mode preference alone can be remembered under the existing permission. New helper/CSS assets have explicit packaging, cache-token and deployment checks. No dependency changes or new publication authorized.

`v1.70.5` adds the same finite Timeline registration/reading-area arrival in both readers, without per-result animations or replay on filtering. Memory State has a centered square field, a clearer faceted core and five bounded fragments instead of seven competing full-panel layers. The shared span selector no longer overrides layer-specific insets; unused rain/ring/facet animation loops are removed. Pointer amplitudes, pause/reduced-motion guards, dashboard geometry, authoring and original media are unchanged. Includes the local performance fixes below; Chrome is the primary testing baseline and remaining Firefox/Edge work is deferred, not declared solved. Hold commit/push for the reviewed batch.

Timeline verification also exposed a pre-existing local Escape mismatch. Both timelines now carry dialog semantics and reuse the existing bounded focus helper; the React window consumes plain Escape locally without also triggering a background shortcut. No global keyboard listener or loading timer was added.

`v1.70.4` follows partial owner acceptance of v1.70.3. Remove overlapping animated entry/search masks, keep the drawn-frame/staggered reveal and its timings, and animate Terminal outline with transform/opacity only. Shared record/Terminal exits pause nested CSS effects and stop painting dissolved content before frame contraction; cancellation restores the original content. Existing geometry, close/minimize durations, authoring and settings stay unchanged. Firefox/Edge smoothness is still an acceptance item; no commit/push authorized.

`v1.70.3` follows actual Firefox profiler evidence: Latest Log uses a transform-driven light track, NEW badges fade a pre-painted glow instead of repainting text/borders, and the Terminal background grows without clipping. Periods, geometry, authoring and the existing entry construction are preserved. Raw profiling data remains outside the repository; post-change Firefox acceptance is still required. Includes the unpushed v1.70.2 fixes below; no new commit/push authorized.

`v1.70.2` addresses transition overhead without changing animation timings, geometry or artwork: cache static texture overlays, retain the Pages workspace through boot and ordinary record open/close/tab changes, and let the React entry use the same single CSS fade as Pages. Includes a loopback-only opt-in timing preview and lifecycle regression tests. Browser frame-cadence samples are diagnostic, not a certified FPS result; actual Firefox/Edge acceptance remains open. No new commit/push authorized.

`v1.70.1` bounds lazy notebook retrieval: a stalled module/data request becomes the existing retry state rather than an endless loading message. Late expired requests cannot overwrite a retry, and settled/closed reads release their deadline. This small publication follow-up was identified in the live browser check; no layout or authored record changes.

`v1.70.0` adds explicit local release filing: select completed notebook items and supply a version/date, preserving older history and the separate publishing step. Dates render in both readers without inventing dates for older releases. Includes the accepted local notebook editing/window refinements below and a quoted-frontmatter save/export round-trip fix found during note review. The owner authorized reviewing and pushing this full batch with saved notes. Verify Git and Pages before claiming deployment success.

`v1.69.2` strengthens notebook completion strikethroughs in both themes and places the gear beside FIELD NOTEBOOK. Notebook and entry gears now match close controls at desktop, scaled desktop and mobile sizes. The owner-prioritized roadmap order is updated; Setup editing is parked. No notebook frame/border, records/media, dependencies or publish behavior changed; no new push authorized.

`v1.69.1` widens normal Archive Entry windows from 960px to 1120px, using the same existing desktop tiers and viewport safety cap. Heights, typography, maximized/mobile layouts and custom Setup/notebook windows are unchanged. Includes the local v1.69.0 notebook prototype; no new publication authorized.

`v1.69.0` adds local in-place notebook authoring, bounded JSON data, conflict-aware atomic saves and notebook review/publishing through the existing bell. Completion does not file a release. No new dependencies or changes to authored records/original media. Await owner visual acceptance and authorization before committing/pushing this prototype.

`v1.68.14` corrects large-desktop typography, section header/icon proportions and Archive footer clearance. Both readers share a disposable, reduced-motion-aware Memory State pointer handler; hidden/offscreen/covered dashboard effects pause without restarting. Record windows gain keyboard focus boundaries and restoration. No dependency, schema or original media changes.

Shipped `v1.67.0` adds isolated content publishing. A content-only publish keeps the committed site's version; it must not advertise an unreviewed development version. Local `v1.68.0` adds Day/Night/Auto appearance and includes the accepted v1.67.1 notebook motion refinement.

Local `v1.68.2` includes the accepted Day scenery/elevation tuning from v1.68.1 and adds varied startup pacing with gentler one-shot text settling. Startup length and preference behavior are unchanged. This work remains unpublished.

Local `v1.68.3` adds a brief, delayed cipher disturbance to the welcome name without changing the startup timeline.

Local `v1.68.4` softens the progress acceleration and replaces the full-name wave with three irregular, localized signal interruptions. Startup length stays unchanged.

Local `v1.68.5` adds bounded per-visit variation to the GESTALT signal and welcome-letter selection/timing, without a running randomizer or additional startup delay.

Local `v1.68.6` tunes Day reading hierarchy, panel borders, header fades and record separation, plus a shared hover/focus control-edge response. No layout or idle-animation changes.

Local `v1.68.7` adds a shared title-bar finish and tactile pressed states for window controls. It is visual tuning only; window sizes, content and opening behavior are unchanged.

Local `v1.68.8` improves Night reading-label contrast and includes the workspace header in the existing focused-window dimming. No new blur, geometry or behavior changes.

Local `v1.68.9` lifts Night title bars to graphite, preserves bar-label contrast and adds theme-aware focus scrims. Blur and window geometry stay unchanged.

Local `v1.68.10` joins title bars and window bodies with a continuous outer stroke and removes outward title-bar shading. Existing sizes and construction timing remain unchanged.

Local `v1.68.11` softens only Night's continuous outline from 0.56 to 0.50 opacity; the accepted Day appearance stays unchanged.

Local `v1.68.12` trims standard Archive Entry title bars to 42px desktop / 44px mobile, with matched scaled-grid and overlay heights. Other windows keep their sizes.

Release target `v1.68.13` adds a dependency-free Pages guard for the linked Day stylesheet and early appearance bootstrap, with missing/late-reference regressions. It includes the accepted local refinements above; no packages or original media changed.

## Rules

- `PATCH` (`v1.0.1`): bug fixes, copy edits, visual tuning, content-only updates, dependency patch bumps, and privacy/security documentation updates.
- `MINOR` (`v1.1.0`): new sections, new content types, new UI panels, new non-breaking content fields, or workflow improvements.
- `MAJOR` (`v2.0.0`): breaking content schema changes, routing/storage changes that require migration, major redesigns, or publishing/editing model changes.

## Update Checklist

When bumping a version, update:

- `package.json`
- visible sidebar version text
- visible system status version text

Use the same public display format everywhere: `vMAJOR.MINOR.PATCH`.
