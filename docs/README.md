# Arclane Documentation

This directory is the repository-wide documentation entry point for project
boundaries, safe use, maintenance, and artifact ownership. The active
configuration mainline remains under `../neorulset26/`; documentation explains
how those artifacts are organized and reviewed.

## Documentation Map

### Legal and Operational Boundaries

- [`legal/LEGAL.md`](./legal/LEGAL.md): project characterization, third-party
  independence, user responsibility, jurisdictional considerations, and
  limitation-of-liability boundaries.
- [`guides/usage-and-safety.md`](./guides/usage-and-safety.md): installation,
  DNS and routing effects, privacy, troubleshooting, and rollback guidance.

### Development and Repository Structure

- [`development/repository-layout.md`](./development/repository-layout.md):
  top-level ownership and placement rules.
- [`development/collaboration-guide.md`](./development/collaboration-guide.md):
  where new rules, modules, tools, and documentation belong.

### Configuration References

- [`reference/rules.md`](./reference/rules.md): active ruleset ownership and
  publication guidance.
- [`../neorulset26/ENGINEERING_GUIDE.md`](../neorulset26/ENGINEERING_GUIDE.md):
  mainline routing architecture.
- [`../neorulset26/RULESET_URLS.md`](../neorulset26/RULESET_URLS.md): current
  raw artifact URL reference.
- [`../neorulset26/MIGRATION_RULE_URLS.md`](../neorulset26/MIGRATION_RULE_URLS.md):
  absolute URL inventory and migration-oriented reference.

### Real IP Modules

- [`../neorulset26/modules/README.md`](../neorulset26/modules/README.md):
  installation, scope, DNS/routing boundaries, profile cleanup, maintenance,
  and validation for the macOS and iOS/iPadOS Real IP modules, including the
  narrow Apple connectivity-detection boundary introduced in v2.1.0.
- [`../tools/realip/README.md`](../tools/realip/README.md): canonical catalog
  builder and validator workflow.

## Recommended Reading Order

For module users:

1. [`guides/usage-and-safety.md`](./guides/usage-and-safety.md)
2. [`../neorulset26/modules/README.md`](../neorulset26/modules/README.md)
3. [`legal/LEGAL.md`](./legal/LEGAL.md)

For maintainers:

1. [`development/repository-layout.md`](./development/repository-layout.md)
2. [`development/collaboration-guide.md`](./development/collaboration-guide.md)
3. [`../neorulset26/ENGINEERING_GUIDE.md`](../neorulset26/ENGINEERING_GUIDE.md)
4. [`../tools/realip/README.md`](../tools/realip/README.md)

## Publication Boundary

- `neorulset26/` contains the active configuration mainline.
- `neorulset26/modules/` is the only maintained Surge module surface.
- `tools/` contains generators, validators, and operational helpers.
- `docs/` contains documentation only; it is not a configuration publication
  surface.
- `openclash-archive/` is local-only, ignored, and not a public artifact.

Review raw files before importing them. Published URLs are stable access paths,
not managed services or guarantees of compatibility, availability, legality,
security, or future behavior.

---

*Last updated: August 31, 2026 (PDT)*
