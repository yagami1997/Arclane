# Rules Reference

This repository no longer treats the root directory as a rules publishing surface.

## Mainline Rules

Use the 2026 mainline under `neorulset26/`.

Primary references:

- `neorulset26/ENGINEERING_GUIDE.md`
- `neorulset26/RULESET_URLS.md`
- `neorulset26/MIGRATION_RULE_URLS.md`

## Legacy Rules

Historical root rules and the old `ruleset/` tree were moved to `archive/legacy/`.

- Status: deprecated
- Removal date: `2027-01-31`
- Migration reference: `archive/legacy/MIGRATION_RULE_URLS.md`

## Current Rule Ownership

- Active maintained rules: `neorulset26/`
- Transition-only historical rules: `archive/legacy/`
- Local-only sensitive OpenClash rewrite files: `openclash-archive/` (not tracked by Git)

## Guidance

- For new Surge setups, use `neorulset26/`.
- For historical imports, consult the legacy migration document first.
- Do not add new published rules to the repository root.
