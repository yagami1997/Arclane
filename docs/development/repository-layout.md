# Repository Layout

This repository was refactored to reduce the root surface and make ownership explicit.

## Top-Level Structure

- `.github/workflows/`
  Read-only validation automation; no deployment or private configuration.

- `neorulset26/`
  The only active ruleset mainline. Do not rename or reorganize it casually.
- `tools/`
  Online tools, operational utilities, and helper subprojects.
- `neorulset26/modules/`
  The only maintained Surge module directory. Platform-specific modules are
  released with the active 2026 mainline. Categorized module source data also
  belongs here when it is part of the published module lifecycle.
- `docs/`
  Development, usage, migration, and reference documents.
- `openclash-archive/`
  Local-only sensitive OpenClash rewrite files. This directory is ignored by Git.

## Repository Rules

- New rules belong in `neorulset26/`.
- New tooling belongs in `tools/`.
- `tools/check.py` is the shared offline validation entry point used by CI.
- New maintained modules belong in `neorulset26/modules/` and must follow the
  active mainline's validation and release lifecycle.
- Reusable module generators and validators belong in `tools/`, not beside the
  published module artifacts.
- New repository documentation belongs in `docs/`.
- Reusable compatibility and troubleshooting guides belong in `docs/guides/`;
  keep the module directory focused on installable artifacts, canonical source,
  and its README. Keep raw diagnostics and private profile backups out of Git.
- Do not add new business files to the repository root.

## Legacy Policy

The former root `*.list` files and the old `ruleset/` tree are no longer part of the repository. They were retired from the `archive/legacy/` transition surface and fully removed on May 16, 2026 (PDT). Use `neorulset26/` for all rule references; historical publication paths are no longer mirrored in this repository.

The former root `modules/` directory was removed on August 28, 2026 (PDT).
Its ASN-wide China and WeChat workarounds are not mirrored; maintained modules
are published only from `neorulset26/modules/`.

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
