# Pages And Steam Activation

Status: the workflow shipped in `v1.44.2` (`0cbc20a1`), and the owner reported a successful baseline Pages deployment on 21 October 2026. Both Steam repository secrets have been added according to the owner; Steam refresh activation and actual data acceptance remain pending. The GitHub CLI was unavailable during implementation, so remote settings and secret values have not been inspected or modified by the agent.

Baseline update: the owner subsequently enabled the Pages gate and reported green preparation/deployment jobs for [run 39571138497](https://github.com/eightmouse/Gestalt/actions/runs/39571138497). The original Node 20 action pins generated compatibility annotations. Local `v1.44.3` updates them to reviewed Node 24 releases; this follow-up still needs publication and a remote run. Steam refresh remains a separate, unverified activation step. The checklist below is retained for setup/recovery, not as a claim that the baseline has never run.

## Action Runtime Pins

Verified from official upstream release tags and the exact revisions' `action.yml` files on 21 October 2026:

| Action | Release | Commit | Runtime |
| --- | --- | --- | --- |
| checkout | v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` | Node 24 |
| configure-pages | v6.0.0 | `45bfe0192ca1faeb007ade9deae92b16b8254a0d` | Node 24 |
| upload-pages-artifact | v5.0.0 | `fc324d3547104276b827a68afc52ff2a11cc49c9` | Composite; pinned upload-artifact v7.0.0 uses Node 24 |
| deploy-pages | v5.0.1 | `368f82528645a54fb793d4d04e342629a3f51346` | Node 24 |

The composite uploader pins its nested upload action to `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f`. Existing inputs and the `github-pages` artifact name remain compatible. Credential persistence stays disabled, permissions/gates are unchanged, and no insecure-runtime opt-out or warning-suppression variable is added. These runtimes belong to GitHub-hosted actions, not the local Node installation or Gestalt's npm dependency graph. A green local test cannot prove the next hosted run is warning-free; verify its annotations after publication. See [GitHub's migration notice](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/).

## Before Switching

1. Review and explicitly commit/push the accumulated source batch, including the new workflow and scripts. Preserve any owner content edits. Do not use Studio's content-only publisher to sneak uncommitted runtime changes into a deployment.
2. Confirm the existing Pages URL, publishing source, repository default branch and `github-pages` environment branch rules. This workflow targets `main`. Note the current branch-based source so rollback is straightforward.
3. Review the code and public snapshot fields. Automatic publishing reveals the latest Steam game, hours, last-played date and available achievement counts. It is periodic data, not live presence. Existing manual pins remain selected until deliberately unchecked in Studio and saved/published.
4. Leave `STEAM_REFRESH_ENABLED` unset while testing the plain site deployment. No Steam credentials are needed for this stage.

## Enable The Site Workflow

1. In the repository's **Settings > Pages**, select **GitHub Actions** as the publishing source.
2. Under **Settings > Secrets and variables > Actions > Variables**, create `GESTALT_PAGES_ENABLED` with the exact value `true`.
3. In **Actions > Publish Gestalt Pages**, run the workflow manually on `main`. The old branch-based source must not remain a competing publisher.
4. Confirm preparation, artifact upload and deployment all succeed. Check the live version, background, media, dashboard, all sections and entry controls. Test a normal Studio save/push afterward; the main push should deploy through this same workflow.

The workflow does not install npm dependencies or build Next. It packages the existing static reader. Only the allowlisted public artifact is deployed, never the whole checkout. No automated commits or `contents: write` permission are needed.

## Enable Steam Refresh Separately

1. In **Actions > Secrets**, add `STEAM_API_KEY` and `STEAM_ID` as repository secrets. Reuse the existing private values directly in GitHub's settings; do not paste them into chat, source, repository variables or a command. `STEAM_ID` accepts SteamID64, a vanity name or the HTTPS profile URL.
2. Create the repository variable `STEAM_REFRESH_ENABLED` with the exact value `true`.
3. Run **Publish Gestalt Pages** manually. Verify the live `public/data/steam-current.json` contains only the documented allowlisted public fields. Check automatic selection, matching record actions, achievement labeling, unknown-stat omission and pin override. Confirm no MDX or Recent Activity changes were created by the workflow.
4. Verify an hourly scheduled run. Changed display data should deploy; unchanged data should skip artifact/upload/deployment. A Steam failure should leave the deployed site intact.

Scheduled runs are hourly at minute 23 UTC, not realtime. GitHub can delay schedules and disables public-repository schedules after 60 days without repository activity. Re-enable the workflow in Actions when necessary; do not add fake commits just to keep it alive. See [GitHub schedule behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

No arbitrary manual-dispatch ref, pull-request event or owner-supplied shell command receives the secrets. Jobs run only for `main`, and secrets are scoped to the preparation step. The separate deployment job has Pages/OIDC permissions but no Steam secrets.

## Failure And Rollback

- A confirmed missing snapshot (404) is valid for a first deployment. Other public-snapshot failures stop preparation, preserving the deployed site. Retry after connectivity/state is verified rather than deleting the last good data.
- With Steam refresh enabled, a first sync failure now stops preparation instead of reporting a successful Steam setup with no snapshot. Scheduled Steam failures also stop without deploying. Content pushes may proceed with a verified previous snapshot if only Steam is unavailable, but emit a warning with a safe reason. No fallback data is fabricated.
- Local `v1.44.4` reports only fixed diagnostic categories: missing key/identity, invalid or unresolved identity, unavailable library or last-played game, rejected request, rate limit, or generic connectivity/response failure. No actual key, identity, URL or upstream body is printed. Save secrets as raw values, without `STEAM_API_KEY=` / `STEAM_ID=` prefixes or surrounding quotes. The owner confirmed repository secret scope and a local read-only request succeeded; GitHub values/network still need verification. Do not regenerate working keys or alter privacy settings merely because a hosted request failed.
- Notification details should distinguish a successful site push from a failed hosted workflow; the Studio publisher currently confirms Git push, not hosted deployment completion.
- Disable `STEAM_REFRESH_ENABLED` to stop hourly fetching. Normal content deployments preserve the existing public snapshot, so it does not disappear. A manual pin can override its game selection. Retiring that snapshot entirely should be an explicit follow-up, not an accidental side effect of a content push.
- To return to the previous hosting method, disable `GESTALT_PAGES_ENABLED`, restore the recorded branch publishing source in Pages settings, and redeploy that branch. Do not leave both publishing methods active. No authored records or Git history need to be rewritten.
- Do not retire the old local/publish-time record sync until the hosted path has been verified with the owner. Local `v1.44.2` can preview the published snapshot through its guarded, read-only `/api/studio/steam` route after boot, falling back to local/authored data when unavailable. Verify the local launcher and Pages agree after the first real snapshot deployment. Nothing copies the snapshot into source or changes note timestamps.

The workflow follows [GitHub's custom Pages deployment requirements](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). It explicitly deploys an artifact rather than relying on bot commits to trigger a Pages build; [GitHub documents that token-created commits do not trigger that build](https://docs.github.com/en/actions/concepts/security/github_token).
