# Pages And Steam Activation

Status: prepared in `v1.44.0` and included in the `v1.44.2` release batch; activation is still pending. On 21 October 2026 the owner confirmed the existing source is **Deploy from a branch**, reported adding both Steam repository secrets, and authorized the batch commit/push. Existing hosting is unchanged until the steps below are performed. The GitHub CLI was unavailable during implementation, so remote settings and secret values have not been inspected or modified by the agent.

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
- Scheduled Steam failures stop without deploying. Content pushes may proceed with the verified previous snapshot if only Steam is unavailable. Notification details should distinguish a successful site push from a failed hosted workflow; the Studio publisher currently confirms Git push, not hosted deployment completion.
- Disable `STEAM_REFRESH_ENABLED` to stop hourly fetching. Normal content deployments preserve the existing public snapshot, so it does not disappear. A manual pin can override its game selection. Retiring that snapshot entirely should be an explicit follow-up, not an accidental side effect of a content push.
- To return to the previous hosting method, disable `GESTALT_PAGES_ENABLED`, restore the recorded branch publishing source in Pages settings, and redeploy that branch. Do not leave both publishing methods active. No authored records or Git history need to be rewritten.
- Do not retire the old local/publish-time record sync until the hosted path has been verified with the owner. Local `v1.44.2` can preview the published snapshot through its guarded, read-only `/api/studio/steam` route after boot, falling back to local/authored data when unavailable. Verify the local launcher and Pages agree after the first real snapshot deployment. Nothing copies the snapshot into source or changes note timestamps.

The workflow follows [GitHub's custom Pages deployment requirements](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). It explicitly deploys an artifact rather than relying on bot commits to trigger a Pages build; [GitHub documents that token-created commits do not trigger that build](https://docs.github.com/en/actions/concepts/security/github_token).
