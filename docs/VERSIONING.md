# Versioning

Gestalt uses Semantic Versioning after `v1.0.0`.

Current version: `v1.67.0`.

Local `v1.67.0` adds isolated content publishing. A content-only publish keeps the committed site's version; it must not advertise an unreviewed development version.

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
