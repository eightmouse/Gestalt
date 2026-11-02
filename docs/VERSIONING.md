# Versioning

Gestalt uses Semantic Versioning after `v1.0.0`.

Current version: `v1.68.13`.

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
