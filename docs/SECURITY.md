# Security Notes

This repo is designed to be safe to publish and cautious to install.

## Install Policy

- GitHub Pages serves the public static archive; Next.js and Studio are local authoring tools, not part of the deployed server.
- Use `pnpm install --ignore-scripts` or `pnpm run install:safe`.
- Do not remove the package release-age buffer unless there is a specific reason.
- Do not run the dev server on a public interface. The default `pnpm dev` script binds to `127.0.0.1`.

## Dependency Guardrails

- Dependencies are pinned to exact versions, not `latest`.
- `next` is pinned to `16.4.1`. Recheck current advisories when reviewing dependency safety; a pinned version is not a continuing guarantee.
- React Server Component transport packages are separately pinned to `19.2.6` in the workspace overrides. Review the lockfile and current advisories together before changing them.
- Install scripts are disabled in `.npmrc`.
- pnpm is configured with a seven-day release-age delay, `trustPolicy: no-downgrade`, blocked exotic transitive dependencies, and strict dependency builds.
- Studio write routes require development mode, a loopback host, and a loopback `Origin` header.
- Uploads verify supported media signatures and use the corresponding canonical extension, rather than preserving a supplied executable extension.

## Latest Review

The [2 November 2026 release review](REVIEW_2026-11-02.md) covers the appearance/startup batch, current dependency audit, privacy scan, isolated editing/publishing checks and known browser-testing limits. The audit reported no advisories at that time; that is not a guarantee against undisclosed or future issues. The earlier [20 October review](REVIEW_2026-10-20.md) remains historical context. Intentional personal entries and screenshots still need the owner's editorial judgment.

## Before Publishing

Run a privacy scan for credentials, contact details, and local absolute paths, then run a dependency audit:

```powershell
pnpm audit --audit-level high
```
