# Security Notes

This repo is designed to be safe to publish and cautious to install.

## Install Policy

- Prefer the static prototype until dependency installation is explicitly needed.
- Use `pnpm install --ignore-scripts` or `pnpm run install:safe`.
- Do not remove the package release-age buffer unless there is a specific reason.
- Do not run the dev server on a public interface. The default `pnpm dev` script binds to `127.0.0.1`.

## Dependency Guardrails

- Dependencies are pinned to exact versions, not `latest`.
- `next` is pinned to `16.2.6`, the patched line for the May 2026 Next.js advisory follow-up affecting versions `<16.2.6`.
- React Server Component transport packages are overridden to `19.2.6`, which is outside the vulnerable `19.2.0` through `19.2.5` range from CVE-2026-23870.
- Install scripts are disabled in `.npmrc`.
- pnpm is configured with a seven-day release-age delay, `trustPolicy: no-downgrade`, blocked exotic transitive dependencies, and strict dependency builds.

## Before Publishing

Run a privacy scan for credentials, contact details, and local absolute paths, then run a dependency audit:

```powershell
pnpm audit --audit-level high
```
