# Collaboration Guide

This repository now follows a simple placement model.

## Where New Work Goes

- New rules go to `neorulset26/`.
- New tools and utility projects go to `tools/`.
- New Surge modules go to `modules/`.
- New repository docs go to `docs/`.

## What Not To Do

- Do not add new `*.list` files to the repository root.
- Do not add new `.sgmodule` files to the repository root.
- Do not put migration notes, drafts, or one-off explanations in the repository root.
- Do not add new tracked files under `archive/legacy/` unless the work is explicitly about legacy retirement or documentation.

## Legacy Handling

- `archive/legacy/` exists only for transition.
- It is deprecated and scheduled for removal on `2027-01-31`.
- If a legacy path still matters, document the replacement path in `archive/legacy/MIGRATION_RULE_URLS.md`.
- Prefer moving users to `neorulset26/` rather than extending the legacy surface.

## Sensitive Local Assets

`openclash-archive/` is reserved for local-only sensitive OpenClash rewrite files.

- Keep this directory out of Git.
- Do not reference it from public migration docs as a published path.
- Treat it as local operational storage, not repository content.

## Maintainer Note

`neorulset26/` was intentionally preserved during the cleanup. Coordinate any future structural changes around that directory boundary.
