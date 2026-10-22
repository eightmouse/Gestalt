# Studio Workflow And Recovery

Implemented in `v1.36.26` on 20 October 2026.

## Local Save

Save Record captures the current draft, writes the MDX through a temporary sibling file, and replaces the destination only after writing succeeds. Static data is likewise written to a temporary sibling and renamed into place. A failed or interrupted write therefore does not intentionally truncate the previous destination file.

If static export fails after an MDX save or deletion, the API returns the saved/deleted result with `staticExported: false`. Studio reconciles that record into its local preview and shows a refresh warning. `Refresh archive` in the pending notification panel calls the local-only `/api/studio/export` route and rebuilds from saved files; it does not resubmit a draft, commit, or push.

After a deletion with an export failure, the embedded editor stays open with its retry notification while the deleted public entry closes. A successful deletion keeps the existing return behavior.

Successful records in a batch save are reconciled as each request completes. If a later draft fails, completed saves remain acknowledged and remaining drafts are retained. Editing/navigation inside the editor is inert while a save/publish operation is in progress, and uploads disable the save/publish buttons. This prevents new in-flight edits from being marked as part of the earlier saved snapshot.

The change-review route checks an in-memory export-needed flag plus source/output modification times, so a missing or older generated index can prompt recovery after a server restart or manual file edit. Modification times are a freshness hint, not a full content-equivalence check. Publishing still exports and validates actual saved data before committing content changes.

## Publishing

Since `v1.52.0`, the local reader also exposes change review through the bell beside the desktop clock or handheld menu. Save Record first, close the entry, then review individual saved records or publish the batch from that bell. Counts and results survive section/entry changes because this view and full Studio share one publishing controller. Refreshing the pending list is read-only; Refresh archive only rebuilds saved content. Neither action saves unsaved drafts. There is no background polling or automatic publishing, and public Pages has no editing controls.

The review dialog reports a GitHub push separately from Pages deployment. If uncommitted public runtime code blocks content publishing, saved records stay local; commit the reviewed code batch deliberately rather than bypassing the staging guard. Read failures disable publishing until review succeeds, and repeated clicks cannot launch concurrent publishes from this client.

The Studio publish and change-review routes use asynchronous child processes. The publisher CLI still runs its sequential checks in a separate process, while the Next server remains able to handle other requests.

A process-wide Studio lock excludes overlapping save, delete, upload, export, and publish operations across those API routes. Busy writes receive `409` and can be retried; their drafts are not intentionally discarded. The lock releases in `finally`, including on process failure. Child output is capped and commands have bounded timeouts; timeout termination targets the full child process tree rather than just the publisher parent.

The pending panel reports local commits not yet present on the tracked origin branch. If an earlier attempt created a commit but failed during remote synchronization or push, the publisher can retry the existing commit even when the worktree has no new record edits. It runs the checks before retrying and avoids manufacturing another content/cache-token commit just to push again. A no-op response is identified separately from a successful publish.

All write routes, including the new export retry route, retain the local-development and loopback request guards. Child commands use fixed argument arrays without a shell. The existing content/media staging allowlist and private-material checks remain in force.

## Limits

- The lock coordinates this running Studio server. It is not a cross-process repository lock for separately launched CLI publishing or external file editors; avoid running those writes against the same checkout during a Studio publish.
- Save/delete/active-game updates are not a multi-file database transaction. Atomic destination replacement protects individual file writes; it does not provide rollback of every previous change if a later filesystem operation fails.
- Unsaved new-entry drafts are not implicitly published. Save the record first, then review the pending list.
- A successful push is separate from GitHub Pages deployment completion.

## Regression Checks

Run `node scripts/test-studio-workflow.mjs` with installed project dependencies and Git. The test transpiles the server modules into an isolated temporary fixture, supplies a fixture exporter/publisher where needed, and uses a temporary local bare Git repository. It does not load the project's `.env.local`, alter actual entries, or publish to GitHub. The fixture is removed after the test.

Run `node scripts/test-publishing-ui.mjs` for the shared client controller/panel, mocked publish/export recovery, stale read handling and development-only boundary. It does not perform real saves or Git operations. `scripts/test-inline-editing.mjs` covers the inline editor's use of that controller alongside current-record-only saves and retained drafts.

Coverage includes foreign-origin rejection, partial save/export success, duplicate protection, export-only retry, rename/delete behavior, shared write exclusion (including uploads), change review while a publisher is active, release after failure, timeout cleanup of descendants, and retry of an existing commit after simulated remote failure.

Also run the typecheck, content/static-shell validators, JavaScript syntax checks, and production build after related code changes. Browser checks should verify that saved previews, warning notifications, and retry buttons remain understandable in both embedded and standalone Studio.

Verification for this batch: the isolated workflow tests, TypeScript check, all 46 content records, static-shell validation, script syntax checks, whitespace check, and production build passed. No real archive record/media or dependency lockfile was modified by the tests, and no real GitHub publish was performed.
