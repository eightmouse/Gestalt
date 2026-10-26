# X Feed Feasibility

Owner decision: pause the embed after the same fallback-only result in the owner's official X Publish preview. Local `v1.47.1` restores the original Memory State animation in React and the static reader. No X slot mounts and the public shell no longer loads its controller. Prototype files remain for later evaluation; this is not a working feed. A custom official API route remains an unapproved alternative requiring cost and policy review.

Cancelled by the owner on 26 October 2026. The prototype and shipped embed files are removed in `v1.59.3`; Memory State remains the active dashboard panel. The notes below are historical research, not an active integration or roadmap item. No replacement provider, scraper or paid API is planned.

Published acceptance update (21 October): `v1.47.0` shipped as `c6500cd9`; Pages run `39607354632` succeeded and the expected helper now returns HTTP 200. The deployed reader reaches `widget-loading` but still times out; the owner also reports unavailable after refreshing. X's own Publish preview for `https://x.com/Eitomausu` likewise showed only the fallback profile link, not posts, in the signed-out test browser. Its DOM contained the provider's timeline iframe, so this comparison is independent of Gestalt's frame, sizing and access transition. This does not prove a universal X outage or a private account; provider-side availability and browser restrictions remain unseparated. Check the official preview in the owner's normal browser next. Do not label an iframe load or a green deployment as successful post delivery, extend the fake animation to mask failure, weaken privacy settings, or add scraping/paid services without agreement.

Security boundary: the widget needs normal-origin messaging; a fully opaque sandbox reached the widget-loading stage but did not finish. The read-only public helper therefore uses a sandbox with scripts/same-origin/popups permitted, but no forms or top navigation. This is not isolation from the public reader's DOM when it shares the Pages origin. Crucially, the development reader always references the fixed published Pages helper, never a same-origin localhost helper, so X cannot access the local editor's DOM or storage. Studio also rejects Origin/Referer values from other loopback hosts or ports. The published helper must ship before the local embedded feed can be accepted. Private content and APIs are never packaged into the public origin.

Acceptance remains open: the real provider was reachable and its widget script exposes createTimeline, but the signed-out browser test reached widget-loading then timed out, even in the read-only normal-origin preview. No real posts or older-post scrolling have been verified. Do not infer that the profile is private, remove more sandbox protections, or use undocumented endpoints to force it. The UI, state machine, safe messages, timeout/retry/cancel, teardown and connected static-frame preservation are fixture-tested. Retry owner-browser/Pages acceptance before treating the feed as complete. Historical option comparisons follow.

Deployment blocker confirmed on 21 October: the development reader's fixed public helper URL currently returns GitHub Pages 404 because the X prototype has not shipped. This is distinct from the earlier real-provider timeout and must be resolved before diagnosing the owner's local widget result. Do not claim retries or visual changes can fix that missing deployment. The removed close action is also hidden by a narrow compatibility selector for panels retained across local hot updates; the current controller never creates it. Switching sections destroys the frame and timers; returning requires access again. No background hidden provider frame is retained.

Owner direction: the official embed is acceptable if it stays within the existing Memory State footprint. Explore a Gestalt frame with an internally scrolling feed and at most a very light, non-interactive monitor texture. Do not blur post text or intercept scrolling/clicks. Prove the real widget's sizing, signed-out behavior and blocking fallback before replacing Memory State. This preference does not authorize paid API access or imply that full older-post history is available to every visitor.

## Options

### Official Timeline Embed

X supports public profile/list timelines through its publishing tool, with height and light/dark theme settings. Protected profiles are not supported. This is the lowest-effort option, but does not give us a fully Gestalt-native layout. Do not promise arbitrary typography, card structure or internal CSS overrides. Source: [X timeline guide](https://help.x.com/en/using-x/embed-x-feed).

Proposed behavior if chosen: keep Memory State until a visitor explicitly loads the external feed, then load the provider script once. Offer a plain profile link if blocked, unavailable or declined. The existing local-memory prompt is not permission to load third-party social content. Privacy notice/consent needs separate consideration under [X's developer policy](https://docs.x.com/developer-terms/policy).

### Custom API-Fed Panel

The API provides an authenticated user-posts endpoint. This could supply a small panel rendered by Gestalt, without making visitors authenticate or exposing a token in browser code. Source: [Get Users Posts](https://docs.x.com/x-api/users/get-posts).

Current pricing is prepaid/pay-per-use. Listed post reads cost $0.005 each; qualifying own-account reads cost $0.001 each when the authenticated user owns the developer app. Rates, account eligibility and additional resource charges need checking in the owner's console. Illustratively, five posts fetched once daily for 30 days amount to $0.15 at the own-read rate or $0.75 at the standard rate, excluding other resources. This is arithmetic, not an all-in quote or a promise of eligibility. Day-level deduplication is not a guaranteed billing cap. An owner-approved spending limit is required before any paid requests; leave automatic recharge off by default. Source: [X API pricing](https://docs.x.com/x-api/getting-started/pricing).

Custom rendering still has constraints: preserve post text, linked author identity/avatar, linked timestamp and source branding; use supported post actions or View on X. Styling the surrounding panel is possible, but concealing attribution or rewriting posts to fit the mood is not the plan. Source: [Display requirements](https://docs.x.com/developer-terms/display-requirements).

Important unresolved boundary: X's policy addresses current content, removals and redistribution. A publicly downloadable full-text JSON file must not be assumed equivalent to a permitted display or approved merely because Steam uses a snapshot. Review the intended storage/distribution mechanism before implementation; do not commit API post bodies into permanent Git history. Refreshing only with since_id cannot detect deleted or edited older posts. On prolonged inability to revalidate, return to Memory State rather than indefinitely serve stale posts. Source: [Developer policy](https://docs.x.com/developer-terms/policy).

### Link-Only Alternative

A Gestalt-styled profile shortcut has no automatic post content, credentials or visitor-facing third-party script. It is the lightweight fallback if the API cost or embed appearance is unacceptable. Do not describe it as a live feed.

## Proposed Guardrails

- Confirm the public profile and free-only versus capped-cost preference first. Never request credentials in chat.
- Do not scrape X, forward session cookies, use undocumented syndication endpoints or add an unreviewed feed proxy.
- If API access is chosen, request only read access needed for public posts. No posting, DMs, followers, bookmarks or location data.
- Use a small bounded result set, fixed upstream host, timeouts and safe errors. Never log tokens or raw authenticated request data.
- Fetch independently of visitor count. No paid request on every page view and no browser polling loop.
- Validate content/URLs and render escaped text. Do not inject upstream HTML or autoplay media.
- Initial proposal: original posts only, newest first, no replies/reposts or engagement counters. Confirm this scope before implementation.
- Keep the existing dashboard footprint; no automatic carousel, extra animation or new mobile layout in the first pass.
- Match React and the public static shell. Keep editor-only controls out of Pages.
- Test offline, blocked embeds, empty/protected profiles, expired credentials, edited/deleted posts and spending-limit failure before replacing Memory State.

## Decision Gate

Access sequence agreed in principle: place Access X Terminal at the top of the existing frame. Only that explicit action may start external loading. A short, opacity/line-based Gestalt access animation may accompany the request, but must not pretend that the provider is ready. Reveal on actual widget readiness after a small minimum transition; respect reduced motion, prevent repeated clicks from injecting duplicate scripts, and time out to a profile-link/Memory State fallback. Separate idle, accessing, ready and unavailable states. Preserve provider attribution and scrolling. This sequence is recorded for the next prototype, not implemented yet.

Recommended direction for a genuinely Gestalt-native result: evaluate the API option with the owner, but only after accepting its cost and resolving the display/storage requirements. If strictly free is required, assess the official click-to-load embed and its actual appearance first. No runtime implementation is authorized by this research alone, and no replacement ships before visual review.
