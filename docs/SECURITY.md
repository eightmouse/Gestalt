# Security Notes

This repo is designed to be safe to publish and cautious to install.

## Install Policy

- Prefer the static prototype until dependency installation is explicitly needed.
- Use `pnpm install --ignore-scripts` or `pnpm run install:safe`.
- Do not remove the package release-age buffer unless there is a specific reason.
- Do not run the dev server on a public interface. The default `pnpm dev` script binds to `127.0.0.1`.

## Dependency Guardrails

- Dependencies are pinned to exact versions, not `latest`.
- `next` is pinned to `16.3.8`. Recheck current advisories when reviewing dependency safety; a pinned version is not a continuing guarantee.
- React Server Component transport packages are overridden to `19.2.6`, which is outside the vulnerable `19.2.0` through `19.2.5` range from CVE-2026-23870.
- Install scripts are disabled in `.npmrc`.
- pnpm is configured with a seven-day release-age delay, `trustPolicy: no-downgrade`, blocked exotic transitive dependencies, and strict dependency builds.
- Studio write routes require development mode, a loopback host, and a loopback `Origin` header.
- Uploads verify supported media signatures and use the corresponding canonical extension, rather than preserving a supplied executable extension.

## Latest Review

The [20 October 2026 review](REVIEW_2026-10-20.md) records the dependency audit, text/metadata scans, negative Studio API checks, fixes, and remaining limitations. No credentials or private user-directory paths matched the reviewed public text scan, and the dependency audit reported no advisories at that time. Intentional personal entries and screenshots still need the owner's editorial judgment.

## Before Publishing

Run a privacy scan for credentials, contact details, and local absolute paths, then run a dependency audit:

```powershell
pnpm audit --audit-level high
```
