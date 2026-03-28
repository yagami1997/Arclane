# Collaboration Guide

This repository is in a transition period during 2026.

## Preferred Target

If you are setting up a new Surge profile, prefer `neorulset26/`.

Reason:

- it is the actively curated 2026 architecture
- documentation is complete
- strategy group design is clearer
- future maintenance will focus there first

## Legacy Surface

The root-level `*.list`, `*.sgmodule`, and `ruleset/` paths remain available for compatibility with existing shared configurations.

They are still published, but they should be treated as legacy-compatible endpoints rather than the main long-term architecture.

## Deprecation Direction

Current intent:

- 2026: keep legacy root paths available for transition
- by the end of 2026: evaluate full retirement of the scattered legacy rules at the repository root

This is a direction announcement, not an immediate deletion notice.
If retirement happens, it should be announced in advance in `README.md`.

## Contribution Rules

### For New Additions

- New ruleset work should prefer `neorulset26/` when it belongs to the 2026 stack
- New shared collections should use a dedicated top-level namespace instead of adding more loose root files
- Avoid creating alternate versions in the root just for testing

### For Existing Legacy Files

- Keep filenames stable if other people may already import them via Raw URLs
- Do not move root-level published files casually
- Do not assume root files and `neorulset26/` files must stay identical

## Maintainer Notes

- `neorulset26/` is the primary curation target
- root-level files are compatibility-oriented
- documentation must state clearly when a path is legacy, current, or planned for retirement
