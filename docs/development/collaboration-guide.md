# Collaboration Guide

This repository now follows a simple placement model.

## Where New Work Goes

- New rules go to `neorulset26/`.
- New tools and utility projects go to `tools/`.
- New Surge modules go to `neorulset26/modules/` and are maintained with the
  active ruleset line.
- Categorized module source data stays beside its published modules; reusable
  generators and validators go to `tools/`.
- New repository docs go to `docs/`.

## What Not To Do

- Do not add new `*.list` files to the repository root.
- Do not add new `.sgmodule` files to the repository root.
- Do not put migration notes, drafts, or one-off explanations in the repository root.

## Legacy Handling

The former `archive/legacy/` transition surface was fully removed on May 16, 2026 (PDT). `neorulset26/` is now the only rule mainline; do not reintroduce legacy paths or mirror retired rule files back into the repository.

The former root `modules/` directory and its ASN-wide China/WeChat workarounds
were removed on August 28, 2026 (PDT). Do not recreate that parallel module
surface; use `neorulset26/modules/` for maintained modules.

## Sensitive Local Assets

`openclash-archive/` is reserved for local-only sensitive OpenClash rewrite files.

- Keep this directory out of Git.
- Do not reference it from public migration docs as a published path.
- Treat it as local operational storage, not repository content.

## Maintainer Note

`neorulset26/` was intentionally preserved during the cleanup. Coordinate any future structural changes around that directory boundary.
