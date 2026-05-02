<div align="center">

# Arclane

### Third-Party Routing Configuration Research With Surge-Compatible Artifacts

</div>

<div align="center">

![Compatibility](https://img.shields.io/badge/Compatibility-Surge%20Compatible-4D9DE0?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20macOS-E87A90?style=for-the-badge&logo=apple&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-92D293?style=for-the-badge&logo=opensourceinitiative&logoColor=white)
![Scope](https://img.shields.io/badge/Scope-Configs%20%7C%20Modules%20%7C%20Docs-FF6B6B?style=for-the-badge)

</div>

---

This repository is a third-party research and maintenance workspace for text-based network routing configuration design. It studies how routing policies, compatibility layers, migration paths, documentation, and small operational helpers can be organized and maintained over time.

Some artifacts in this repository are compatible with Surge. That compatibility does not make this project a Surge tool, plugin, service, official resource, or affiliated ecosystem component. Surge compatibility is a technical fact about certain files here, not the identity of the repository itself.

The repository currently contains four main asset types:

- routing configuration artifacts under `neorulset26/`
- shared compatibility modules under `modules/`
- operational reference utilities under `tools/`
- research, migration, and responsibility documentation under `docs/`

---

## Legal Notice

This project publishes text-based configuration artifacts, documentation, and reference implementations. It does not provide, operate, broker, or distribute proxy servers, VPN services, transport capacity, managed access services, or account resources.

- This repository is an independent third-party project and has no affiliation with Nssurge Inc. or any other trademark holder referenced in the documentation.
- Surge compatibility is described only for interoperability. This repository is not a Surge product, official extension, support channel, or bundled utility.
- Users are solely responsible for ensuring that any review, adaptation, deployment, import, or use of repository contents complies with applicable law, regulatory requirements, platform terms, internal security policy, and contractual obligations in their jurisdiction.
- See [`docs/legal/LEGAL.md`](./docs/legal/LEGAL.md) for the full legal boundary statement, trademark acknowledgments, compliance notice, and liability disclaimer.

---

## Project Positioning

The repository should be read as a configuration research project, not as a finished access product.

Its main focus is:

- routing policy structure and classification
- configuration naming and maintenance strategy
- migration planning for published configuration paths
- compatibility-oriented module organization
- operational support tooling that helps validate or sustain configuration workflows

Its main purpose is not:

- providing network access services
- guaranteeing reachability of any third-party platform
- recommending regulatory bypass behavior
- functioning as an official tool for any commercial software product

---

## Repository Areas

- `neorulset26/`: the active configuration mainline and supporting references
- `modules/`: shared compatibility modules such as `*.sgmodule`
- `tools/`: reference operational utilities and self-hosted support components
- `docs/`: legal, development, migration, and repository documentation
- `archive/legacy/`: temporary compatibility archive for historical publication paths

Current top-level layout:

```text
/
├── neorulset26/        # active configuration mainline
├── tools/              # reference operational helpers
├── modules/            # compatibility modules
├── docs/               # legal and project documentation
└── archive/legacy/     # migration-only historical material
```

The repository root is intentionally kept as an entry surface. Project policy, legal boundaries, and long-form references should live under `docs/` rather than accumulating as loose root documents.

---

## Research Focus

This repository is organized around a few long-term research questions:

- How should routing configuration files be split, named, and layered for maintenance?
- How should compatibility-specific modules be separated from the main configuration line?
- How should migration be handled when historical paths and newer structures coexist?
- How should small operational helpers support a configuration project without turning the repository into a hosted service?

The maintained text artifacts are outputs of that work. They are not presented as guarantees of suitability, legality, security posture, or service access outcome in any given environment.

---

## Reading Order

If you are trying to understand the project, start with the design and structure documents before looking at specific configuration files.

- Architecture reference: [`neorulset26/ENGINEERING_GUIDE.md`](./neorulset26/ENGINEERING_GUIDE.md)
- Configuration URL reference: [`neorulset26/RULESET_URLS.md`](./neorulset26/RULESET_URLS.md)
- Migration-oriented path list: [`neorulset26/MIGRATION_RULE_URLS.md`](./neorulset26/MIGRATION_RULE_URLS.md)
- Repository layout notes: [`docs/development/repository-layout.md`](./docs/development/repository-layout.md)
- Collaboration notes: [`docs/development/collaboration-guide.md`](./docs/development/collaboration-guide.md)
- Legal boundary statement: [`docs/legal/LEGAL.md`](./docs/legal/LEGAL.md)
- Modules overview: [`modules/README.md`](./modules/README.md)
- Tools overview: [`tools/README.md`](./tools/README.md)

<details>
<summary><strong>Context For Existing Users</strong></summary>

### If you follow historical publication paths

- Review [`archive/legacy/MIGRATION_RULE_URLS.md`](./archive/legacy/MIGRATION_RULE_URLS.md)
- Treat `archive/legacy/` as a temporary migration surface only
- Prefer moving toward `neorulset26/` references where applicable

### If you are reviewing compatibility modules

- Start from [`modules/README.md`](./modules/README.md)
- Treat modules as separate compatibility artifacts, not as the project's primary identity

### If you are reviewing operational helpers

- Start from [`tools/README.md`](./tools/README.md)
- Treat each tool as an independent reference subproject with its own deployment and compliance considerations

</details>

---

## Design Principles

- **Compatibility is not affiliation**: compatibility with Surge is a technical property of some artifacts here, not a brand relationship.
- **Documentation should define boundaries**: project intent, legal limits, and maintenance scope should be explicit.
- **Research before convenience**: architecture, migration, and maintainability matter more than homepage-level consumption shortcuts.
- **No service posture**: the repository should not read like a hosted access product or managed network offering.
- **Separation of concerns**: configuration artifacts, modules, tools, and legal/development documentation should stay clearly separated.
- **Published path stability**: once public paths exist, migration needs to be managed deliberately rather than casually broken.

---

## Configuration Artifacts

The active mainline under `neorulset26/` contains text-based routing configuration artifacts and reference path documentation. Those materials are included as part of the repository's configuration research and maintenance work.

Representative maintained files include:

- `neorulset26/rules/common.list`
- `neorulset26/rules/paypal.list`
- `neorulset26/rules/socialsite.list`
- `neorulset26/rules/hulo.list`
- `neorulset26/rules/scholar.list`
- `neorulset26/rules/bytedance.list`
- `neorulset26/rules/ai.list`
- `neorulset26/rules/crypto.list`
- `neorulset26/rules/messenger.list`

Additional structured materials live under:

- `neorulset26/ruleset/`
- `neorulset26/ruleset/Media/`
- `archive/legacy/` for historical migration context

These files are published as text artifacts for study, comparison, maintenance, and compatibility review. They should not be read as operational promises or endorsements regarding any third-party service, territory, platform policy, or enforcement posture.

---

## Tools

`tools/` holds operational reference utilities that support the broader configuration workspace without redefining the repository as a network service.

- Tools overview: [`tools/README.md`](./tools/README.md)
- DoH fallback reference: [`tools/doh-fallback-worker/README.md`](./tools/doh-fallback-worker/README.md)
- HTTP 204 probe reference: [`tools/edge204/README.md`](./tools/edge204/README.md)

These components are provided as reference implementations. Anyone choosing to deploy or adapt them is solely responsible for platform compliance, lawful operation, security review, and production suitability.

---

## Risk Posture

This repository is maintained to reduce confusion about project scope, not to encourage aggressive use.

- No warranty is made that any artifact is accurate, complete, current, safe, or suitable for a particular environment.
- No promise is made that any configuration will reach, unlock, improve, or preserve access to any third-party service.
- No representation is made that repository contents satisfy the legal, regulatory, export-control, data-protection, security, procurement, or internal-policy requirements applicable to a given user.
- No operational security guarantee is made for self-deployment of reference tools or for downstream modifications made by users or redistributors.

If you are operating in a regulated environment, under enterprise security controls, or in a jurisdiction with sensitive network-tool restrictions, perform your own legal and security review before using any material here.

---

## Changelog

### Latest: April 14, 2026

- Established `docs/legal/LEGAL.md` with full jurisdictional compliance notice, trademark acknowledgment, and liability disclaimer.
- Restructured project documentation to reflect research and configuration architecture scope.
- Revised `ENGINEERING_GUIDE.md` and `RULESET_URLS.md` to align with project positioning.

<details>
<summary><strong>Previous repository milestones</strong></summary>

### April 8, 2026

- Updated `tools/doh-fallback-worker/` toward a token-aware private DoH gateway design.
- Expanded Worker-side DNS response synthesis, cache normalization, and stale-if-error behavior.
- Added deployment-oriented documentation for the Worker reference implementation.

### April 7, 2026

- Preserved `neorulset26/` as the active configuration mainline.
- Moved shared modules into `modules/`.
- Moved repository and collaboration notes into `docs/`.
- Archived historical root-level materials into `archive/legacy/`.

### April 1, 2026

- Formalized `tools/` as a support layer for operational helpers.
- Added repository-level tool documentation.
- Added migration-oriented URL references for the active configuration line.

### February 2026

- Continued maintenance and categorization work across the configuration tree.
- Reduced external dependency exposure in the maintained configuration materials.

</details>

---

## License

- License: [MIT License](./LICENSE)
- Legal boundary: [`docs/legal/LEGAL.md`](./docs/legal/LEGAL.md)
- Contribution standard: prefer accuracy, maintainability, traceable changes, and risk-aware documentation

---

## Note

Some days, technical work feels less like building a machine and more like tuning a quiet instrument until its intent is easier to hear. A good rule, a careful boundary, or a small piece of documentation can carry patience forward: it lowers the noise, leaves fewer sharp edges, and gives the next mind a clear place to begin.

The best engineering mood is steady attention: keep the tools honest, keep the assumptions visible, and let each change arrive with enough clarity to earn its place.

---

<div align="center">
  <p>
    <sub>Third-party routing configuration research repository</sub>
    <br>
    <sub>Surge-compatible artifacts are provided only as compatibility materials, not as product affiliation</sub>
    <br><br>
    <sub>Copyright © 2023-2026 YAGAMI</sub>
    <br>
    <sub>Last updated: April 27, 2026 at 11:53 PM PDT</sub>
  </p>
</div>
