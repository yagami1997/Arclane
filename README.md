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

The repository currently contains three main asset types:

- routing configuration artifacts and mainline-specific modules under
  `neorulset26/`
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
- `neorulset26/modules/`: platform-specific modules released with the active
  configuration mainline
- `tools/`: reference operational utilities and self-hosted support components
- `docs/`: legal, development, migration, and repository documentation

Current top-level layout:

```text
/
├── neorulset26/        # active rules and mainline-specific modules
├── tools/              # reference operational helpers
└── docs/               # legal and project documentation
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
- Usage and safety notice: [`docs/guides/usage-and-safety.md`](./docs/guides/usage-and-safety.md)
- Mainline compatibility modules: [`neorulset26/modules/README.md`](./neorulset26/modules/README.md)
- Tools overview: [`tools/README.md`](./tools/README.md)

<details>
<summary><strong>Context For Existing Users</strong></summary>

### If you follow historical publication paths

- The former `archive/legacy/` transition surface has been fully removed.
- Map any retired path to its current equivalent via [`neorulset26/MIGRATION_RULE_URLS.md`](./neorulset26/MIGRATION_RULE_URLS.md) and switch downstream consumers to [`neorulset26/RULESET_URLS.md`](./neorulset26/RULESET_URLS.md).
- Requests against old `archive/legacy/...` paths will return 404 and will not be restored.

### If you are reviewing compatibility modules

- Start from [`neorulset26/modules/README.md`](./neorulset26/modules/README.md)
- Read [`docs/guides/usage-and-safety.md`](./docs/guides/usage-and-safety.md)
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
- `neorulset26/rules/feishu.list`
- `neorulset26/rules/bytedance.list`
- `neorulset26/rules/ai.list`
- `neorulset26/rules/crypto.list`
- `neorulset26/rules/messenger.list`
- `neorulset26/modules/realip.sgmodule`
- `neorulset26/modules/realip-ios.sgmodule`
- `neorulset26/modules/realip.list`

Additional structured materials live under:

- `neorulset26/ruleset/`
- `neorulset26/ruleset/Media/`

These files are published as text artifacts for study, comparison, maintenance, and compatibility review. They should not be read as operational promises or endorsements regarding any third-party service, territory, platform policy, or enforcement posture.

---

## Tools

`tools/` holds operational reference utilities that support the broader configuration workspace without redefining the repository as a network service.

- Tools overview: [`tools/README.md`](./tools/README.md)
- DoH fallback reference: [`tools/doh-fallback-worker/README.md`](./tools/doh-fallback-worker/README.md)
- HTTP 204 probe reference: [`tools/edge204/README.md`](./tools/edge204/README.md)

Each Cloudflare Worker under `tools/` follows the same convention: a tracked `wrangler.toml.example` template, a real `wrangler.toml` that Git ignores, and a checked-in test suite runnable with `node --test`. Deployment examples use generic placeholders only. The public repository does not document maintainer-operated domains, account subdomains, routes, resource IDs, or tokens.

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

### Latest: August 29, 2026

- Introduced the v2.0.0 Real IP module architecture for macOS and iOS/iPadOS.
  The modules centralize 177 verified `always-real-ip` host tokens covering
  local networks, connectivity detection, captive portals, public Wi-Fi,
  real-time communication, authentication, established application
  compatibility, and Feishu/Lark/Doubao dependencies.
- Added `neorulset26/modules/realip.list` as the categorized canonical source
  and `tools/realip/build.py` as the deterministic validator and renderer for
  both platform modules.
- Added exact Real IP handling for `auth.openai.com` so SSRF and anti-rebinding
  protection does not receive Surge's `198.18.0.0/15` Fake IP response. Its
  outbound policy remains controlled by the consuming profile.
- Preserved the validated Feishu/Lark/Doubao direct-routing behavior and
  retired the superseded product-specific module files after successful live
  migration to the unified Real IP modules.

<details>
<summary><strong>Previous repository milestones</strong></summary>

### August 28, 2026

- Investigated recurring Feishu/Lark blank pages, slow external Wiki content,
  and Chromium `ERR_TIMED_OUT (-7)` failures under Surge Enhanced Mode.
- Confirmed that the compatibility problem had two separate layers: several
  product-qualified Feishu CNAME endpoints still received Fake IP responses,
  while application-wide macOS `DIRECT` rules also captured third-party web
  resources embedded inside Feishu/Lark and caused direct-connect timeouts.
- Released v1.2.0 of the macOS module. It replaces blanket application routing
  with `PROCESS-NAME` plus an inline shared-infrastructure ruleset, preserving
  direct routing for observed ByteDance dependencies without overriding the
  main profile's Google and external-site policies.
- Released v1.2.0 of the iOS/iPadOS module with matching DNS/CNAME coverage and
  direct product routing, while retaining its platform-appropriate design with
  no macOS process rules.
- Added narrowly qualified Feishu and Feishu CDN CNAME patterns for
  `cdnbuild.net`, `bytedns1.com`, `cdngslb.com`, and `queniusz.com`, plus the
  observed Feishu creative CDN endpoint. Broad provider suffixes remain absent
  from global module rules.
- Verified Mac/iOS parity across 71 `always-real-ip` tokens, checked the macOS
  logical rules and six iOS CNAME routes, and validated temporary complete
  profiles with the native `surge-cli --check` command.
- Refreshed the legal boundary and added a repository-wide usage and safety
  notice covering review, backup, rollback, DNS/routing effects, diagnostic
  metadata, and the limits of remote publication.
- Removed the legacy root `modules/` directory. Its `ASN.China.sgmodule` and
  `WeChat.sgmodule` files were historical workarounds for WeChat in-app image
  sending failures under proxy/Fake-IP conditions, but their broad carrier and
  Tencent ASN-wide `DIRECT` rules were not product-specific and could not
  reliably address unresolved hostname traffic because they used `no-resolve`.
  Maintained modules now live only under `neorulset26/modules/`.

### August 21, 2026

- Expanded the platform-specific Feishu/Lark compatibility modules with the
  current product-domain set, scoped real-IP handling for observed CNAME
  targets, and direct routing for the Lark CDN.
- Added direct routing and Fake-IP compatibility for Doubao product domains.
- Replaced broad ByteDance infrastructure wildcards with product-qualified
  CNAME patterns. The modules add no shared DNS or domain-routing rules for
  general Douyin or Toutiao traffic and do not change the existing Bytedance
  or TikTok rule sets.
- Kept the macOS and iOS modules separate: only the macOS module contains
  application process rules. Both modules remain free of `FINAL` rules and
  proxy policy groups.
- Added installation and maintenance notes in
  [`neorulset26/modules/README.md`](./neorulset26/modules/README.md).

### August 16, 2026

- Corrected the stated measurement boundary of the `tools/edge204/` probe.
  The reading covers the whole chain from client through proxy node to the
  Cloudflare Anycast edge, not the node's egress alone. The client's own leg
  is inside every sample, so the same node measured from two different client
  ISPs will not produce the same number.
- Documented a distinct failure mode found in the field: comparisons are only
  valid between endpoints that cost the same number of round trips. A reading
  is roughly `round trips × RTT of the weakest leg`, so a TLS handshake, an
  uncached DNS lookup, or a redirect costs almost nothing on a good link and
  a great deal on a poor one, amplifying non-linearly under loss. A
  short-TTL self-hosted hostname measured against a universally cached
  endpoint can read 100 ms slower while both destinations are equally
  healthy. This looks exactly like node degradation and is not.
- Added the diagnostic procedure for that case to the troubleshooting
  section: confirm an `http://` URL is not being upgraded, then compare both
  endpoints through the same node at the same protocol with the connect,
  handshake, and total times split out.
- Changed the recommended global fallback from `cp.cloudflare.com` to
  `http://www.gstatic.com/generate_204`. The former is operated separately
  from the Worker but shares AS13335, the same Anycast fabric, and the same
  edge infrastructure, which is not fault-domain isolation. Noted that the
  substitute must stay on plain HTTP to remain comparable, and that node
  pools with mainland-China egress should use `http://captive.apple.com`
  instead, where the Google endpoint may be unreachable.
- Corrected the `/trace` example output. It previously showed `asn=13335`,
  which is Cloudflare's own ASN and the single most misleading value the
  field can take. The example now shows a proxy egress ASN, and the text
  states that `asn` is the network Cloudflare sees the request arriving
  from — seeing `13335` there means the measured path was not the intended
  one.
- Worker source and test suite are unchanged. This revision is limited to
  measurement semantics and documentation, applied to both `README.md` and
  `README.ja.md`.

### July 26, 2026

- Revised the `tools/edge204/` HTTP 204 probe after an audit. Response headers
  were reduced to a single `Cache-Control: no-store`, trailing slashes are now
  normalized, `/ping` reports the deployed version, and the client IP on
  `/trace` is gated behind an optional `TRACE_KEY` that degrades silently
  rather than signalling that a key exists.
- Documented the limits of the measurement method itself: Anycast bias toward
  Cloudflare-adjacent egress, plaintext port 80 as an unreliable channel, and
  the single point of failure created by pointing every health check at one
  hostname. The prior TLS-overhead rationale was corrected — an extra
  handshake scales readings proportionally and does not by itself reorder
  nodes.
- Added Clash / mihomo health-check configuration alongside the existing Surge
  examples, covering group-level and provider-level checks.
- Aligned `tools/edge204/` with the deployment convention already established
  by `tools/doh-fallback-worker/`: a tracked `wrangler.toml.example`, a
  gitignored real config, and a checked-in test suite.
- Replaced an unsound cache verification step. Comparing `/ping` timestamps
  proves nothing, because the Workers clock does not advance without I/O;
  `cf-ray` and the absence of `Age` are used instead.
- Broadened the `.wrangler/` ignore rule to match at any depth, since Wrangler
  writes its cache into whichever directory it is invoked from.

### July 25, 2026

- Hardened the `tools/doh-fallback-worker/` reference implementation with
  validated hedged upstream requests, transaction-ID and DNS TTL correction on
  cache hits, RFC 2308 negative caching, semantic cache isolation,
  isolate-local singleflight, bounded requests, and hot-only prefetch.
- Consolidated maintained behavior, operational boundaries, verification
  steps, and development history into the component README files.
- Removed the temporary audit handoff document after accepted findings were
  incorporated into source and tests.
- Standardized all DoH deployment examples on generic placeholders. The public
  repository does not document maintainer-operated resolver domains, account
  subdomains, routes, resource IDs, tokens, or other private deployment data.

### May 16, 2026

- Fully retired and removed the `archive/legacy/` directory, including all historical root rules, the old `ruleset/` tree, and the legacy `MIGRATION_RULE_URLS.md` mirror.
- Reason: the migration window that justified keeping a legacy mirror has closed. `neorulset26/` is the only maintained mainline; preserving a parallel legacy surface caused path ambiguity, duplicated maintenance, and gave new users the false impression that retired publication paths were still supported.
- Reality: any downstream still pointing at `archive/legacy/...` URLs will now receive 404 responses and must switch to the equivalents listed in [`neorulset26/RULESET_URLS.md`](./neorulset26/RULESET_URLS.md), using [`neorulset26/MIGRATION_RULE_URLS.md`](./neorulset26/MIGRATION_RULE_URLS.md) for path mapping. Legacy path compatibility is no longer provided and will not be restored.
- Updated `README.md`, `docs/development/repository-layout.md`, `docs/development/collaboration-guide.md`, and `docs/reference/rules.md` to remove all references to the retired archive surface.

### April 14, 2026

- Established `docs/legal/LEGAL.md` with full jurisdictional compliance notice, trademark acknowledgment, and liability disclaimer.
- Restructured project documentation to reflect research and configuration architecture scope.
- Revised `ENGINEERING_GUIDE.md` and `RULESET_URLS.md` to align with project positioning.

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
- Usage and safety: [`docs/guides/usage-and-safety.md`](./docs/guides/usage-and-safety.md)
- Contribution standard: prefer accuracy, maintainability, traceable changes, and risk-aware documentation

---

## Note

Over time, I have come to see technical work as more than the pursuit of a perfectly functioning system. It is also a practice of rebuilding trust: making assumptions visible, drawing careful boundaries, and leaving behind something quieter, clearer, and more dependable than what came before.

Projects like this are never sustained by individual effort alone. I am deeply grateful to my friends at Kyoto University, whose kindness, encouragement, and steady presence have given me strength through difficult moments. Their support has reminded me that rigor and gentleness can coexist, and that even solitary work can be carried forward by the faith others place in us.

May this repository remain a small record of that lesson: protect what matters, stay honest about uncertainty, and keep building with patience.

---

<div align="center">
  <p>
    <sub>Third-party routing configuration research repository</sub>
    <br>
    <sub>Surge-compatible artifacts are provided only as compatibility materials, not as product affiliation</sub>
    <br><br>
    <sub>Copyright © 2023-2026 YAGAMI</sub>
    <br>
    <sub>Last updated: August 29, 2026 9:35 PM PDT (America/Los_Angeles)</sub>
  </p>
</div>
