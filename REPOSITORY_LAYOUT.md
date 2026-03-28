# Repository Layout

This repository now operates as two parallel publishing surfaces:

1. `neorulset26/`
   Personal, fully documented ruleset stack.
   Treat this directory as self-contained and stable for the owner's daily use.

2. Repository root (`*.list`, `*.sgmodule`, `ruleset/`)
   Public compatibility layer for existing raw GitHub URLs used by other people.
   Do not casually move files out of the root or `ruleset/` unless you are willing to break downstream configs.

## Current Zones

### 1. Personal Stack

Path: `neorulset26/`

- Own architecture, rule ordering, and policy mapping
- Own documentation (`ENGINEERING_GUIDE.md`, `RULESET_URLS.md`)
- May diverge from root-level public files on purpose
- Should not be reorganized unless the personal Surge profile is updated at the same time

### 2. Shared Stable Endpoints

Paths:

- Root `*.list`
- Root `*.sgmodule`
- `ruleset/`

These are effectively public API surfaces because users may consume them via:

- GitHub Raw URLs
- direct imports in Surge / module configs
- bookmarks or private config templates shared outside the repo

Because of that, filename stability matters more than local neatness.

## Why The Repository Feels Messy

The structure is carrying three responsibilities at once:

1. personal production config (`neorulset26/`)
2. shared public endpoints for friends (root-level files)
3. generic library-style ruleset mirror (`ruleset/`)

Those responsibilities are valid, but they were not clearly separated in documentation.

## Safe Optimization Strategy

Without breaking existing consumers, the safe approach is:

1. Keep `neorulset26/` untouched
2. Keep existing root filenames stable
3. Use documentation to define ownership and boundaries
4. Stop adding new personal or one-off files to the repository root

## Rules For Future Additions

### Allowed In Root

- Rule files that must keep a short, stable public raw URL
- Widely shared module files already consumed by others

### Not Allowed In Root

- personal drafts
- experimental profiles
- temporary migration files
- alternate versions created only for local testing

## Recommended Convention Going Forward

If new non-personal collections are needed later, create a dedicated top-level namespace for them instead of adding more loose root files. Example candidates:

- `community/` for friend-specific packs
- `profiles/` for full configuration examples
- `modules/` for future `.sgmodule` collections

Only do that for new assets. Existing published root files should remain where they are for compatibility.

## Audit Notes

- `neorulset26/rules/` and root `*.list` are not a pure mirror. Several files intentionally differ.
- `neorulset26/ruleset/` and root `ruleset/` are mostly mirrored, but a few files have personal overrides.
- This means automatic deduplication by move/symlink is not appropriate right now.

## Bottom Line

If compatibility is required, the repository cannot be made perfectly "clean" by moving files around.
The practical fix is to freeze the public root layer, keep `neorulset26/` isolated, and enforce cleaner placement for anything new.
