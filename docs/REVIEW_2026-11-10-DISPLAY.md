# Desktop Zoom And Timing Review

Local target: `v1.73.3`, on the v1.73.2 site-code base and the owner's newer content commits. No publication, original-media changes or dependency installs.

## Display

The existing dashboard could compress its first grid track nearly to zero. This clipped Projects at real 200% browser zoom on a 1080p-sized window in Firefox, Edge and Chrome. The same failure occurred at normal zoom around 1000-1100 CSS pixels wide, sometimes clipping the weather refresh control as well.

The compact desktop grid now sizes rows from their contents and scrolls within its original area, leaving the header and footer in place. The two-column tracks can shrink without forcing horizontal overflow; the Memory State panel keeps a minimum readable height. The new rules apply only at desktop widths of 761-1180 CSS pixels or desktop heights up to 660 CSS pixels. They are shared by the local and Pages readers and do not change the phone layout, card order, record windows or motion.

Read-only layout checks passed in installed headless Firefox, Edge and Chrome: 45 browser/size combinations across the full and compact matrices. The disposable profiles used actual browser page zoom of 50%, 80%, 100%, 125% and 200%, checked against the browser-reported pixel ratio. Additional runs covered simulated 125% and 150% display density, 4K-sized windows, narrow desktop windows and the phone layout. Browser chrome and minimum window dimensions affect the measured CSS viewport. The narrowest windows in this run landed at 492-500 CSS pixels; the previous release also covered a 390 CSS pixel viewport.

Checks exercised Projects and activity row containment, Current Game, populated weather, scrolling to lower dashboard cards, footer clearance, section navigation, record controls and note widths, the peripheral image viewer, and notebook dismissal. Weather responses were local fixtures; no location request, Studio write or Steam credential read was needed. Native OS settings and physical displays were not changed. Screen-reader acceptance remains open.

## Local Startup

The React workspace's legacy image warmup was evaluated against all 60 current records. It assigned one image URL per invocation: `public/images/archive-banner.png`, which is not the Next public asset URL. The correct `/images/archive-banner.png` is already preloaded in the local layout. Removing the effect removes the bad request and the unrelated archive scan while leaving the cover, Setup images, boot sequence and Pages preload intact. This is not a measured improvement in frame pacing.

The original backdrop is about 2.67 MiB and remains the largest eager local image. A visually verified display derivative is a possible next cold-load task; retain the original and keep the React and Pages URLs/preloads aligned. That work is separate from transition smoothness.

## Timing Diagnostic

In separate headless sessions at 100% on a 1080p-sized window, sample three rounds of idle, Web Search, Timeline, Projects navigation, and entry open/close. Record JavaScript action duration separately from the interval between animation callbacks. Chrome and Edge entry-open p95 callback gaps were 21 ms and entry-close p95 gaps were 14 ms in these samples. The Firefox results were not stable: later samples had hundreds of milliseconds between callbacks, including when idle.

A second Firefox run repeated the pattern. A third run bypassed only the record exit animation in the disposable test page, leaving opening and the actual site files untouched. The first close no longer showed the long gap, but long gaps still returned in idle and later samples. The exit animation alone is not a sufficient explanation for the persistent slowdown in this harness. These are callback intervals, not displayed frames, and headless results cannot diagnose the owner's graphics settings. Keep the effects unchanged until a visible-browser renderer trace can separate scheduling from painting and presentation.

Firefox zoom was configured in the disposable profile's [site-preference database](https://searchfox.org/firefox-main/source/toolkit/components/contentprefs/ContentPrefService2.sys.mjs). Chrome and Edge used the [Chromium default zoom preference](https://chromium.googlesource.com/chromium/src/+/66.0.3359.158/chrome/browser/ui/zoom/chrome_zoom_level_prefs.cc). Neither used CSS zoom or pinch simulation. The fixture and raw samples are not public assets.
