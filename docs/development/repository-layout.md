# Repository Layout

This repository was refactored to reduce the root surface and make ownership explicit.

## Top-Level Structure

- `neorulset26/`
  The only active ruleset mainline. Do not rename or reorganize it casually.
- `tools/`
  Online tools, operational utilities, and helper subprojects.
- `modules/`
  Shared Surge modules. All `.sgmodule` files belong here.
- `docs/`
  Development, usage, migration, and reference documents.
- `archive/legacy/`
  Temporary archive for historical root rules and the old `ruleset/` tree.
- `openclash-archive/`
  Local-only sensitive OpenClash rewrite files. This directory is ignored by Git.

## Repository Rules

- New rules belong in `neorulset26/`.
- New tooling belongs in `tools/`.
- New modules belong in `modules/`.
- New repository documentation belongs in `docs/`.
- Do not add new business files to the repository root.
- Do not treat `archive/legacy/` as a live publication surface.

## Legacy Policy

The former root `*.list` files and the old `ruleset/` tree are no longer part of the preferred structure.

- They were moved into `archive/legacy/`.
- They remain only for transition and inspection.
- They are scheduled for removal on `2027-01-31`.
- Removal work may begin on `2027-02-01`.

Use [`MIGRATION_RULE_URLS.md`](../../archive/legacy/MIGRATION_RULE_URLS.md) to map old URLs to the 2026 mainline where possible.

## Root Directory Policy

The repository root should stay limited to:

- entry documents such as `README.md`
- repository metadata such as `LICENSE` and ignore files
- the main top-level working directories

The root should not become a dumping ground for:

- loose rules
- loose modules
- ad hoc markdown documents
- private local assets

## Maintenance Note

`neorulset26/` was intentionally left untouched during this cleanup. Structural changes should continue to happen around it, not inside it, unless the ruleset mainline itself is being updated.
