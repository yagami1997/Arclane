# Collaboration Guide

This repository now follows a simple placement model.

## Validation Gate

Last updated: September 4, 2026 (PDT, America/Los_Angeles).

Run `python3 tools/check.py` before proposing changes. The same command runs
in `.github/workflows/check.yml` on pushes and pull requests, with read-only
repository permissions and no deployment secrets. It validates rule structure,
CIDRs, within-file duplicates, relative document targets, generated modules,
and offline tests. Cross-file overlaps are informational: review ownership and
effective profile order before removing any rule. This is not a complete Surge
parser or a substitute for native/device and live service validation.

## Where New Work Goes

- New rules go to `neorulset26/`.
- New tools and utility projects go to `tools/`.
- New Surge modules go to `neorulset26/modules/` and are maintained with the
  active ruleset line.
- Categorized module source data stays beside its published modules; reusable
  generators and validators go to `tools/`.
- New repository docs go to `docs/`.
- Version reusable service compatibility guidance under `docs/guides/`.
  Put opt-in probes beside their relevant tool; do not publish machine-specific
  logs, effective profiles, credentials, or rollback backups.

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
