# Versioning

Gestalt uses Semantic Versioning after `v1.0.0`.

Release target: `v1.90.1`. Previous site-code release: `v1.90.0` (7c609ecb).

`v1.90.1` lets the Latest Log plate fill its height: the date and title stay on top, the reading time and desk count sit on the bottom edge, and the excerpt takes the space between, fading out at its foot, so taller screens show more of the note. The compact Dashboard keeps its two-line excerpt.

`v1.90.0` gives the Terminal, Settings and the Dashboard more presence. The Terminal is a real session: a login line (with your last session under local memory), a prompt that types its own `ls -l`, a true listing with permissions, record counts and short dates, a preview line naming each directory's newest entry, arrow-key movement, a waiting block cursor and a status bar; it fits its contents, opens without a scrollbar flash and folds away on the record beat when closed. Settings becomes a control panel with Display, Motion, Navigation and Privacy tabs, a card for every option saying what it does, drawn previews of each look, a Privacy tab that explains local memory and how Auto Weather finds an approximate city, a compact title bar and a footer that stays put. On the Dashboard, Current Game shows the Steam figures it knows with an achievement bar and the latest note, Latest Log shows its title with a reading time and the papers on the desk, Projects rows name their next milestone, and the Latest Log scan is one soft line. Recent Activity folds three or more entries from one record into a single row with a +N chip, and a note dated up to a day ahead still reads as new. The boot's session text reads more clearly over the wallpaper. Authored records, media and dependencies are unchanged.

`v1.89.0` makes Setup the machine. On desktop the machines are boot entries at the top left; the picked one fills a readout beside them with its wallpaper on the shared screen glass and its spec lines the way neofetch prints them: user@host, then OS, Model, CPU, GPU and RAM from the record's own notes, a colour strip in Gestalt's tones, and a command line that opens the record. Switching entries swaps the readout in place. Tools sit in a dock, peripherals as connected devices and notes along the bottom, shared by every machine; the empty action words on tiles are gone, and shorter screens tighten everything so it still fits. Handheld Setup and in-place editing are unchanged. Authored records, media and dependencies are unchanged.

`v1.88.4` makes the boot's session screen work like an OS login: when the loader cuts, the archive's own wallpaper fades in blurred and dimmed behind the operator's picture and name, and at the handoff the whole screen fades out with a slight zoom over 420ms instead of squeezing into a line, so the blur seems to clear onto the workspace. The portrait loads eagerly so it is always there. Timings, quick start and Reduced Motion are unchanged. Authored records, media and dependencies are unchanged.

`v1.88.3` lets the Projects bench show the whole latest note: its paragraphs fill the card beside the screen and fade out at the foot, and the card always matches the screen's height. A project with no dated notes shows its record's own writing instead of a blank card, titled by its first heading and dated by its last update; it is not counted as a filed note. Authored records, media and dependencies are unchanged.

`v1.88.2` fills the Games drive: the latest note now uses the drive's full height and fades out at the foot, with up to three earlier notes (date and title) listed underneath; short bays keep a two-line note. A tall project sample's glow keeps the picture's shape instead of lighting the empty glass. Closing a field paper now puts it back on the desk: it lifts, travels to the front sheet's place, takes its size and lean, and fades only as it lands. The Field Desk gains a blotter with a ruler edge, a pencil and an old cup ring, and the papers lose their corner arrow. Authored records, media and dependencies are unchanged.

`v1.88.1` lines up every Projects bench and every game disk. A project's description always holds its three lines and its title stays on one, so the bench starts at the same height for every project. Every bench has the same two cards: the latest note, or a blank card when none is filed, and the 16:9 screen, or dark glass marked No sample filed, with the build sheet always underneath. Game disk labels share one height, so every picture sticker sits at the same place whatever the title's length. Authored records, media and dependencies are unchanged.

`v1.88.0` gives every section one masthead: the section number, title, live counters and its own controls sit on a single lighter line, and the second header inside the bay is gone. The power-on is a slow, dim phosphor warm-up with no flash and no travelling line, and the Dashboard screens come on gently. Screen light falls off softly with no ring at the bezel, and the cover and Memory State glow from inside the glass. Projects gives every bench the same layout: a 16:9 screen with its build sheet underneath and the latest note beside it; much taller samples stand whole in the middle, and the project spines are wider and easier to read. Games disks become 3.5" floppies in a clear smoked case: the whole disc is visible inside, a brushed-metal shutter slides back and the disc turns when you reach for one or while it is in the drive, and every game's picture sits in the same landscape sticker with its title (Steam's store header when the game has a Steam ID). Legacy Mode's bay now reaches the masthead's right edge, with System Tips aligned to it. Field papers fold back onto the desk when closed, and their window controls sit in the corner. Authored records, media and dependencies are unchanged.

`v1.87.0` makes Gestalt power on instead of loading. The boot is about three seconds: the tube warms up, GESTALT resolves, and the full welcome reports real readiness (records read, appearance, the Steam snapshot, and with local memory the last session) before the operator session. The screen then shutters into a line that rises onto the header rule, the Dashboard plates unfold row by row, and the screens flare on; Memory State's first lines log the real boot time and record count. The scripted meter, console lines and per-plate readouts are retired. Opening a record runs on one 1.5s beat: the frame draws, the access plate shutters closed and the record unfolds behind it; closing folds to a line and a point, and the frame no longer blinks during the handoff. Logs becomes a Field Desk with its own plate, a lamp-lit desk and dimmer Night paper. Every section shares the Dashboard's plate material in three levels. Other Projects lay out like Active ones, and Weather's thermograph has its own window beside a matching refresh button. Authored records, media and dependencies are unchanged.

`v1.86.0` gives every desktop section the same frame as the Dashboard, so switching sections no longer moves or shrinks the bay. Projects becomes a workbench: every project sits on a spine at the left, and the selected one fills the bay with its brief, milestone track, newest note and a lit screen with its build sheet. A manual pick now restarts the auto-rotation wait. Games gains a drive beside the shelves that holds the current game with its cover, Steam figures and newest note, and marks its disk In drive; on tall screens both shelves share the cabinet height and their disks grow to fill it. At Night the plates are solid again, and Memory State and the game covers light the plates around them. Every screen shares one glass and blooms with its own picture; Memory State becomes a near-black tube whose code glows. Recent Activity uses indicator lamps, and Weather draws a 12-hour temperature line from the same forecast request. Studio keeps summaries and other single-line fields on one line when saving. Authored records, media and dependencies are unchanged.

`v1.85.0` turns Logs into Field Papers: the newest field notes lie on the desk as a short paper stack. The front sheet opens a slim paper reader; peeking edges bring a note forward, and Newer/Older steps appear once more than three notes are on the desk. Handheld shows one sheet with readable spines. The newest three logs always stay on the desk, and older ones are still filed in the Field Archive after seven days. The old Reading Desk preview is retired. The desktop Terminal gets its own green phosphor surface and a shorter window; Memory State gains a slight lens curve and drops only complete rows, and keeps running while search is open. Day game covers lose their drop shadow. Writing order, note links, authored records, media and dependencies are unchanged.

`v1.84.4` keeps the Dashboard's ambient motion and Memory State code running while the desktop Terminal is open. The underlying workspace still cannot receive clicks or plate hover. Record windows, hidden tabs, and Reduced Motion keep their existing guards.

`v1.84.3` gives all six desktop Dashboard plates a raised finish, clearer text hierarchy and a small, bounded mouse response. Projects and Latest Log use tighter reader signals, Current Game gets an LCD treatment, and Memory State's code has a phosphor glow. Day gets its own lightweight backdrop; startup preloads the active appearance only. Night keeps its original backdrop. The Pocket Index, authored records and dependencies are unchanged.

`v1.84.2` gives handheld tape titles room to wrap in portrait and short landscape views. Public document navigations revalidate the HTML that selects the versioned runtime, without clearing cached media. The patch does not change authored content or desktop shelves.

`v1.84.1` replaces per-character cipher animations with a bounded sweep over a separate monospaced signal. This keeps palette glyphs from overlapping and reduces animation work when entering Setup. Setup cards no longer parse terminal specs, and handheld Games uses an unboxed search icon with a slim input. Desktop search, record content and the publishing workflow are unchanged.

`v1.84.0` opens up the handheld Games and Projects libraries with a centered VHS cassette or project card, a horizontal snap rail, and a vertical swipe between groups. Game search sits beside Back; project cards show vertical titles, a brief, and progress. The revised cipher locks individual characters without shifting the line and respects Reduced Motion. Desktop browsing layouts, entry behavior, authored records and media are unchanged.

`v1.83.1` corrects the handheld shelves: upright VHS cases fit side by side, and the game search expands within the header's bounds. Project plates scroll vertically; swiping sideways or using the group buttons switches between Active and Other Projects, with no handheld arrows. Desktop browsing, entry windows, authored records and media are unchanged.

`v1.83.0` makes handheld Games a VHS shelf: one readable tape with twin reels and a peek at the next. Session and Past Logs retain independent scroll positions and shared search. Handheld Projects uses direct groups and swipe or arrow navigation, with progress and a relevant milestone on each plate. Desktop keeps the floppy shelves and automatic project rotation. Entries, editing, publishing, authored content, media and dependencies are unchanged.

`v1.82.0` gives handheld Games one swipe shelf with Session and Past selectors, independent scroll positions and search across both. Handheld Projects uses a grouped picker over a still workplate with progress and a prioritized milestone. Desktop keeps both shelves and rotating project plates. Entries, editing, publishing, records, media and dependencies are unchanged.

`v1.81.0` gives Projects, Games, Logs and Setup Notes a shared writing panel in the local archive. The gear opens the exact Project or Game note; single-note Logs go straight to writing, while longer records keep their file directory. Formatting, media, draft recovery, local saves and the publish bell remain in place. Both readers use inset focus marks instead of outer rectangles. Public reading layouts, authored records, media and dependencies are unchanged.

`v1.80.0` shares the searchable, unpaginated note directory between Games and Projects. It fits up to six files per desktop row and two on handheld. Project windows show the project title, retain real artwork, and omit the empty Overview artwork panel; Technical Stack and Samples stay conditional. Logs open directly to their prose and retain dates, references, attachments and exact note links. The editor, authored records, original media and dependencies are unchanged.

`v1.79.0` replaces Project lists with the Process Reader, including idle rotation, separate plate transitions and authored milestone traces. The Media Cabinet splits Session and Past Logs into draggable floppy shelves, with wheel scrolling, search and disk feedback. Game entries share their title and artwork across tabs and open note files in a focused reader. A 24-line welcome console brings dashboard modules online in stages; the desktop window tray aligns with the workspace. No authored records, original media or dependencies changed.

`v1.78.0` lets the owner edit all four Setup groups from their existing terminals, with separate launch and edit actions for shortcuts. Local drafts and the publish bell keep their existing roles; Studio remains a fallback and Pages remains read-only. The release also improves handheld note navigation, caches Timeline results, restores earlier notebook milestones, and renames recent field notes without changing their URLs or note IDs. No dependency or original media changes.

`v1.77.3` aligns Pocket Index directory icons with their labels. Handheld entries have a Contents picker in the header and place search above the note list when there are multiple notes. Desktop keeps its Contents rail. The entry animation, authored records, media and dependencies are unchanged.

`v1.77.2` keeps handheld entry scrolling active during the ACCESSING sequence without exposing unrevealed controls. Archive badges use stable references derived from record IDs instead of shared sort priorities. Record URLs, notes, media and dependencies are unchanged.

`v1.77.1` replaces the short handheld flash with the full desktop ACCESSING sequence. Handheld Back remains available while unrevealed controls stay out of the tab order. Closing a search result restores its query and focuses the same result; closing a dispatch returns to that dispatch. Settings identifies when the device has reduced motion active. No authored records, media or dependencies changed.

`v1.77.0` makes the handheld wordmark a Home shortcut and keeps copying links clear of note prose. Pocket Index keeps the latest field note featured and shows up to two other notes from the past week. A compact ACCESSING cue flows into the title cipher, using the existing entry-animation preference and honoring reduced motion. Desktop keeps its own entry sequence. Studio pins Next.js 16.4.6 with the existing install safeguards; GitHub Pages still runs the static reader. No authored records or media changed.

`v1.76.0` finds individual notes in the command palette. Matches show their parent entry and date when available, open directly on the right Notes page, and restore the query on handheld Back. One-letter queries only match title prefixes; clearing the input restores the default shortcuts. Both readers share one local search index. No authored records, media or dependencies changed.

`v1.75.0` gives published records and individual notes shareable links on desktop and Pocket Index. Opening a note link resolves its persistent ID, selects the right page and expands the note. Existing note headings gain IDs without changing their wording, dates or bodies. Browser Back preserves the browsing section. The first release ships reader code and metadata together; Studio remains local and the Prism technical-stack edit is not part of this release.

`v1.74.4` gives Projects, Games and Logs one shared pane height in wide Terminal mode. The list and preview edges align, and a sparse Logs list no longer cuts the Reading Desk short. Longer lists and excerpts scroll inside the panes without stretching individual cards. Compact desktop, handheld and Legacy layouts are unchanged. The saved FFXIV note and images remain local for a separate content publish.

`v1.74.3` shows individual notes in Recent Activity and opens each on its five-note page. Note search spans the whole entry, Escape closes a directly opened note, and Last Updated reflects the newest dated note or saved update without changing field-log writing order. The dashboard gives Current Game a short authored summary in place of completion, adds clearer cues to clickable headings and open notes, and uses an info icon for System Tips. No authored records, media or dependencies changed.

`v1.74.2` gives handheld Games and Projects independent four-record pages per group and keeps your place when you close a record. Desktop lists and search still see the full archive. Memory State keeps a faint inset frame but drops the inner filename and header, leaving more room for the code stream. Both readers share the paging logic and trace styles. No record, media or dependency changes.

`v1.74.1` extends the handheld canvas to the viewport edges and keeps reading controls clear of the notch and home indicator. Mobile browser bars follow the selected Day or Night appearance where supported. Verified with simulated safe-area insets in both readers; no desktop backdrop, record, media or dependency changes.

`v1.74.0` brings the approved Pocket Index to both readers at 760 CSS pixels and below. It replaces the floating dock with an in-flow directory, direct Search and Settings, a full-screen reading surface with Back, and the handheld boot with a variable meter and scan handoff. Remembered boot preferences honor local-memory permission; reduced motion skips the boot and the brief record-title cipher. Desktop navigation, authored records, media and dependencies are unchanged. The owner approved filing the release and publishing it to Pages.

`v1.73.4` preloads and draws one full-resolution WebP backdrop in both readers, down from 2.67 MiB to 231 KiB. The original PNG, framing, Day and Night treatments, boot timing and public publishing behavior are unchanged. The owner approved release together with the saved Wilds note and its screenshots.

`v1.73.3` keeps dashboard cards intact at compact desktop widths or very short heights, including 200% page zoom on a 1080p window. The dashboard can scroll within its existing area, leaving the header, footer and navigation in place. Standard desktop and phone layouts are unchanged. Shared CSS applies to both readers. The local reader no longer tries to warm the already-preloaded backdrop at an incorrect URL. No author records, dependencies or publishing behavior changed.

Current Game artwork now falls back from the saved thumbnail or banner to the saved entry header, then to Steam artwork when an App ID is available. This fixes the header-only Monster Hunter Wilds record in both readers without changing its notes or automatic game selection.

Day entry headers keep more of the artwork's color with a single fade behind the text. Night, image framing and the opening sequence keep their existing treatment.

Games with only legacy Overview artwork now use it in the shared entry header on every tab. Custom headers still take precedence, and note screenshots and saved records remain untouched.

Field Archive file lists and folder panes use the existing theme-aware Gestalt scrollbars without changing their scrolling or layout rules.

`v1.73.2` retains the static shell, navigation and window tray during ordinary section switches. Replace the heading and section content, synchronize active controls, and clean up outgoing windows/focus without rebuilding the background. Existing boot, busy-transition and date-rollover fallbacks stay intact. No authored records or dependencies changed; the wider stability review remains in progress.

The same local patch retains the shell during Timeline open, close and result selection. Plain Escape closes reading entries in both readers while nested controls and inline editing keep priority. The notebook lists mobile rework as a future idea; no redesign is included.

Static Roadmap open/close use the same retained reading-window lifecycle. The native dialog, lazy loading and chapter behavior stay unchanged, with focus recovery skipping hidden or inert triggers.

Static Field Archive folder transitions retain the index and its scroll, reuse reading-window focus handling and remove the overlay during entry, Timeline or Roadmap handoff. The filing rules, content and visual layout remain unchanged.

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
