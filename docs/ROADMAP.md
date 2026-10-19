# Gestalt Roadmap

## Experience Polish

- Improve Field Archive text contrast, weight, and clarity across Firefox, Edge, and Chromium-based browsers while preserving its file-manager layout. Completed in `v1.36.5`.
- Refine the record-access transition inspired by FFXIV's Portable Archive: let the access surface resolve into the real entry frame, then blend it into the record without an extra full-screen animated layer. Tuned against the supplied clip in `v1.36.10`; review the feel before treating it as final. Keep it cosmetic unless real media preloading is needed, and support reduced motion.
- Reduce record-open work in Firefox by mounting note-body markup only for expanded notes. Implemented in `v1.36.7`; compare browser performance during the final regression pass.
- Revisit how notes are presented inside record entries. The current expanded-note layout feels plain; discuss whether a more archive-like, file/list presentation would improve browsing before changing the content structure.

## Games Archive States

- Separate finite games that are finished and belong in Past Logs from persistent live-service games such as FFXIV, Path of Exile 2, Diablo IV, and World of Warcraft. Explore an `Ongoing` or `Not Playing` state for live-service titles, and decide where that state should appear in the game card or entry before changing the Studio workflow.

## Editing Experience

- Replace the wide `Edit locally` entry-header button with a compact Gestalt-style gear icon beside `// ARCHIVE ENTRY`. Keep it clearly identifiable as the local edit action with a tooltip and accessible label, while taking less space in the title bar.

## Final Regression Pass

- After the planned UI changes, compare Firefox, Edge, and Chromium performance and behavior, prioritizing the dashboard and record-view experience. Profile before removing visual effects; fix regressions found along the way.
