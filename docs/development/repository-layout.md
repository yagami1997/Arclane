# Repository Layout

This repository was refactored to reduce the root surface and make ownership explicit.

## Top-Level Structure

- `neorulset26/`
  The only active ruleset mainline. Do not rename or reorganize it casually.
- `tools/`
  Online tools, operational utilities, and helper subprojects.
- `modules/`
  Repository-wide shared Surge modules.
- `neorulset26/modules/`
  Platform-specific modules maintained as part of the active 2026 mainline.
- `docs/`
  Development, usage, migration, and reference documents.
- `openclash-archive/`
  Local-only sensitive OpenClash rewrite files. This directory is ignored by Git.

## Repository Rules

- New rules belong in `neorulset26/`.
- New tooling belongs in `tools/`.
- New repository-wide shared modules belong in `modules/`.
- New mainline-specific modules belong in `neorulset26/modules/` when their
  rules and release lifecycle are owned by `neorulset26/`.
- New repository documentation belongs in `docs/`.
- Do not add new business files to the repository root.

## Legacy Policy

The former root `*.list` files and the old `ruleset/` tree are no longer part of the repository. They were retired from the `archive/legacy/` transition surface and fully removed on May 16, 2026 (PDT). Use `neorulset26/` for all rule references; historical publication paths are no longer mirrored in this repository.

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
