<div align="center">

# 📁 Surge Pro 6 Advanced Rulesets

### Enterprise-Grade Network Routing Rules Collection

</div>

<div align="center">

![Surge](https://img.shields.io/badge/Surge-Pro%206-4D9DE0?style=for-the-badge&logo=surge&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20macOS-E87A90?style=for-the-badge&logo=apple&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-92D293?style=for-the-badge&logo=opensourceinitiative&logoColor=white)
![Rules](https://img.shields.io/badge/Rules-2500%2B-FF6B6B?style=for-the-badge&logo=databricks&logoColor=white)

</div>

<p align="center">
  <i>🚀 Self-hosted routing rules optimized for speed, privacy, and reliability</i>
  <br>
  <i>⚡ Intelligent traffic management | 🎯 Geo-location control | 🔒 Privacy-focused</i>
</p>

---

This repository is a continuously maintained Surge ruleset project with one active mainline and several clearly separated support areas:

- a current mainline ruleset architecture under `neorulset26/`
- a `tools/` layer for operational utilities and online network tools
- a `modules/` layer for shared Surge modules
- a `docs/` layer for repository, development, and migration documentation
- an `archive/legacy/` layer for temporary historical compatibility assets

If you are new to the repository, start with the 2026 mainline. If you are migrating from older root-level raw import paths, use the legacy archive and migration guide. If you need supporting operational utilities, check the tools layer.

## Repository Structure

This repository now has five distinct responsibilities, and they should be read differently:

- `neorulset26/`: the preferred 2026 mainline ruleset stack, with its own architecture and documentation
- `tools/`: repository-wide support tooling for recovery, validation, deployment, and maintenance utilities
- `modules/`: tracked shared Surge modules such as `*.sgmodule`
- `docs/`: repository structure notes, collaboration rules, migration notes, and reference material
- `archive/legacy/`: historical root rules and the former `ruleset/` library retained only for migration

Current top-level layout:

```text
/
├── neorulset26/        # active ruleset mainline
├── tools/              # utilities and online tools
├── modules/            # Surge modules
├── docs/               # development and user documentation
└── archive/legacy/     # legacy rules retained until 2027-01-31
```

The repository root is no longer intended to host loose `*.list`, `.sgmodule`, or ad hoc documentation files. See [`docs/development/repository-layout.md`](./docs/development/repository-layout.md) for the current placement rules.

## 2026 Recommendation

For new setups, use `neorulset26/` first.

- Architecture reference: [`neorulset26/ENGINEERING_GUIDE.md`](./neorulset26/ENGINEERING_GUIDE.md)
- Rule URL reference: [`neorulset26/RULESET_URLS.md`](./neorulset26/RULESET_URLS.md)
- Migration-ready URL list: [`neorulset26/MIGRATION_RULE_URLS.md`](./neorulset26/MIGRATION_RULE_URLS.md)
- Collaboration and transition notes: [`docs/development/collaboration-guide.md`](./docs/development/collaboration-guide.md)
- Repository layout notes: [`docs/development/repository-layout.md`](./docs/development/repository-layout.md)
- Repository tools overview: [`tools/README.md`](./tools/README.md)
- Modules overview: [`modules/README.md`](./modules/README.md)

Legacy root rules and the old `ruleset/` library have already been moved into [`archive/legacy/`](./archive/legacy/). They remain available only as a temporary transition surface and are scheduled for removal on `2027-01-31`.

## Quick Navigation

Choose the path that matches your situation:

- New Surge setup: start with [`neorulset26/ENGINEERING_GUIDE.md`](./neorulset26/ENGINEERING_GUIDE.md)
- Direct raw URLs: use [`neorulset26/MIGRATION_RULE_URLS.md`](./neorulset26/MIGRATION_RULE_URLS.md)
- Strategy-group reference: use [`neorulset26/RULESET_URLS.md`](./neorulset26/RULESET_URLS.md)
- Existing users on old root paths: migrate with [`archive/legacy/MIGRATION_RULE_URLS.md`](./archive/legacy/MIGRATION_RULE_URLS.md)
- Surge modules: see [`modules/README.md`](./modules/README.md)
- Repository tools: see [`tools/README.md`](./tools/README.md)

<details>
<summary><strong>Expanded Usage Guide</strong></summary>

### New users

1. Start with [`neorulset26/ENGINEERING_GUIDE.md`](./neorulset26/ENGINEERING_GUIDE.md)
2. Use [`neorulset26/MIGRATION_RULE_URLS.md`](./neorulset26/MIGRATION_RULE_URLS.md) for direct raw URLs
3. Map the listed rule URLs into your own strategy groups
4. Use [`neorulset26/RULESET_URLS.md`](./neorulset26/RULESET_URLS.md) as the strategy-group reference

### Existing users of old root paths

1. Do not keep building on the old paths
2. Check [`archive/legacy/MIGRATION_RULE_URLS.md`](./archive/legacy/MIGRATION_RULE_URLS.md)
3. Replace legacy imports with the corresponding `neorulset26/` paths where available
4. Treat `archive/legacy/` only as a temporary migration buffer

### Module users

1. Use the files under [`modules/`](./modules/)
2. Do not rely on root-level `.sgmodule` paths anymore
3. Follow [`modules/README.md`](./modules/README.md) for the current module placement rules

### Tool users

1. Start with [`tools/README.md`](./tools/README.md)
2. Each tool should be read as its own self-contained subproject
3. Operational tools do not belong inside the ruleset mainline

### Legacy content

- `archive/legacy/` remains Git-tracked during migration and is scheduled for removal on `2027-01-31`

</details>

<details>
<summary><strong>Design Philosophy</strong></summary>

- **Published path stability**: public raw import paths should stay stable once other people depend on them.
- **Mainline-first evolution**: new ruleset architecture, documentation, and forward-looking maintenance belong in `neorulset26/`.
- **Self-hosted control**: wherever practical, rules and supporting assets should be maintained internally.
- **Compatibility without stagnation**: legacy paths stay available, but they should not dictate project direction.
- **Tools support operations**: utilities belong under `tools/`, not inside the ruleset mainline.
- **Documentation should track reality**: the README should explain the current structure, not preserve obsolete layout.

</details>

## 🔄 Changelog

### Latest: April 8, 2026 09:29 PM PDT — [`doh-fallback-worker` v4](./tools/doh-fallback-worker/) : Private DoH Gateway

- **Major upgrade**: rewrote [`tools/doh-fallback-worker/`](./tools/doh-fallback-worker/) from a generic DoH reverse proxy into a full token-aware private DoH gateway.
- **Token routing**: added `/dns-query/<token>` path. Each token loads an isolated profile and private rule set from Cloudflare KV without touching source code.
- **Private rule matching**: exact and suffix domain rules are answered locally inside the Worker with no upstream query. Supports A, AAAA, and CNAME record synthesis.
- **DNS response synthesis**: binary-correct DNS answer packets are built inside [`worker.js`](./tools/doh-fallback-worker/worker.js), preserving the original query ID and question section.
- **Normalized cache keys**: replaced SHA-256(raw body) keys with semantic keys, eliminating cache fragmentation caused by changing DNS transaction IDs.
- **Remaining-TTL cache**: clients now receive the actual remaining TTL instead of the original value, with a correct `Age` header.
- **Stale-if-error**: stale cache entries are served when all upstreams fail, within a configurable window. Avoids 502 errors under upstream instability.
- **KV-backed rule management**: rules and profiles stored in Cloudflare KV, updated with a single `wrangler kv key put` command, no redeployment needed.
- **Bug fix**: corrected base64url padding for RFC 8484 GET requests.
- **Backward compatible**: `/dns-query` without a token behaves identically to v3 for all existing clients.
- **Documentation**: added [`wrangler.toml`](./tools/doh-fallback-worker/wrangler.toml), plus deployment guides in [`README.md`](./tools/doh-fallback-worker/README.md) and [`README.ja.md`](./tools/doh-fallback-worker/README.ja.md).

<details>
<summary><strong>Previous changelog entries</strong></summary>

### April 7, 2026 09:30 PM PDT — v2.2 Repository Refactor: Mainline, Modules, Docs, and Legacy Archive

- **Mainline preserved**: kept `neorulset26/` fully intact and unchanged as the only active ruleset mainline.
- **Modules extracted**: moved tracked `.sgmodule` files out of the repository root into [`modules/`](./modules/).
- **Docs reorganized**: moved repository structure and collaboration notes into [`docs/`](./docs/) so the root no longer acts as a document dump.
- **Legacy rules archived**: moved historical root `*.list` files and the old `ruleset/` tree into [`archive/legacy/`](./archive/legacy/).
- **Migration guide added**: added [`archive/legacy/MIGRATION_RULE_URLS.md`](./archive/legacy/MIGRATION_RULE_URLS.md) to map historical paths to the 2026 mainline.
- **Retirement date fixed**: marked `archive/legacy/` as deprecated and scheduled it for removal on `2027-01-31`, with deletion work allowed to begin on `2027-02-01`.
- **Root cleaned up**: reduced the repository root to entry files and top-level project directories instead of loose rules and modules.
- **edge204**: added [`tools/edge204/`](./tools/edge204/) — a self-hosted Cloudflare Worker returning pure HTTP 204 from the CF edge, used as a Surge `url-test` / `fallback` probe. HTTP-only to eliminate TLS handshake overhead from RTT measurements. Includes `/generate_204`, `/204`, `/ping`, and `/trace` endpoints. No upstream fetch, no bindings, fully stateless.

### April 5, 2026 06:52 PM PDT — AI Routing Review: Claude Coverage and Google AI Safety Default

- **Claude coverage**: expanded `Claude` and `Claude Code CLI` routing coverage across core domains and observed runtime dependencies so the app and CLI are more likely to use the same proxy path in real-world use.
- **Google AI default**: removed `neorulset26/rules/antigravity.list` and merged its domains back into `google.list` so Google AI traffic is not split across different countries or line types by default.
- **⚠️ Gemini safety default**: `Gemini`, `Google AI Studio`, Antigravity-related endpoints, and other Google AI properties now stay under the Google rules by default to reduce account, session, and region mismatch risk.
- **Recommendation**: as AI LLM and agent risk controls continue to tighten, prefer clean IP routes for Google-related traffic, ideally ISP-grade lines in regions such as `US`, `JP`, `UK`, or `SG`, rather than `HK` / `MO` defaults or heavily reused datacenter exits.

### April 1, 2026 09:30 PM PDT — Repository Expansion: Tools Track and DoH Fallback Worker

- **Repository direction**: formalized `tools/` as a parallel support layer alongside the 2026 ruleset mainline and the compatibility publication surface.
- **Tools**: added repository-level tools documentation at [`tools/README.md`](./tools/README.md).
- **DoH fallback**: added the first operational utility under `tools/` at [`tools/doh-fallback-worker/README.md`](./tools/doh-fallback-worker/README.md), documenting a Cloudflare Worker based fallback DoH reverse proxy.
- **Migration support**: added [`neorulset26/MIGRATION_RULE_URLS.md`](./neorulset26/MIGRATION_RULE_URLS.md), a migration-friendly absolute URL list for direct configuration use and AI-assisted Surge config generation.
- **Documentation**: refreshed the root README structure to better reflect the project's current shape and maintenance direction.

### March 27, 2026 08:49 PM PDT — 2026 Mainline Transition Guidance

- **Repository direction**: `neorulset26/` became the recommended entry point for new 2026 setups.
- **Compatibility**: root-level scattered `*.list` files and legacy compatibility paths remained available during the transition period.
- **Migration posture**: new users were directed toward the 2026 stack rather than the older loose root layout.
- **Maintenance focus**: 2026 work shifted toward documentation clarity, migration guidance, and structural discipline rather than growing the old flat root surface.

### February 2026 — v2.1 Maintenance Cycle

- **Ruleset work**: continued refinement of rule coverage and categorization.
- **Documentation**: ongoing documentation cleanup and incremental maintenance improvements.
- **Operations**: minor routing adjustments for select service groups and internal structure refinement for long-term maintainability.

### February 2026 — v2.0 Self-Hosted Infrastructure Migration

- **Self-hosted rulesets**: migrated 58 external dependencies into the local `ruleset/` directory.
- **Privacy**: removed sensitive references and reduced third-party dependency exposure.
- **Organization**: restructured the repository for stronger long-term maintainability.
- **Autonomy**: established a zero-external-dependency direction for ruleset hosting.

</details>

## 🧰 Tools

`tools/` is the repository-wide support layer for operational utilities and maintenance-focused components. It exists to hold modules that help run, validate, deploy, recover, or support the broader project without mixing those concerns into the ruleset mainline.

- Tools overview: [`tools/README.md`](./tools/README.md)
- DoH fallback: [`tools/doh-fallback-worker/README.md`](./tools/doh-fallback-worker/README.md)
- Edge 204 probe: [`tools/edge204/README.md`](./tools/edge204/README.md)

Current direction for `tools/` includes:

- emergency network utilities
- deployment helpers
- validators and auditing aids
- generators and maintenance helpers
- other repository-level support components with ongoing operational value

---

## 🌟 Key Features

- Smart routing for service-specific traffic distribution
- Performance-oriented path selection and lower routing overhead
- Privacy-focused DNS and self-hosted rule delivery
- Mainline rulesets, modules, and operational tools kept clearly separated

## 📦 Self-Built Ruleset Collection

The preferred raw URLs for these maintained rule collections now live under `neorulset26/`.

<div align="center">

<table>
<tr>
  <td width="60"><img src="https://cdn-icons-png.flaticon.com/512/9458/9458326.png" width="40" align="center"></td>
  <td><b>Common Services</b><br><sub>Essential productivity tools and infrastructure</sub></td>
  <td><a href="https://raw.githubusercontent.com/yagami1997/surgemac/main/neorulset26/rules/common.list">common.list</a></td>
</tr>
<tr>
  <td width="60"><img src="https://cdn-icons-png.flaticon.com/512/2936/2936660.png" width="40" align="center"></td>
  <td><b>Financial Services</b><br><sub>Secure routing for payment and banking (US-focused)</sub></td>
  <td><a href="https://raw.githubusercontent.com/yagami1997/surgemac/main/neorulset26/rules/paypal.list">paypal.list</a></td>
</tr>
<tr>
  <td width="60"><img src="https://cdn-icons-png.flaticon.com/512/9073/9073032.png" width="40" align="center"></td>
  <td><b>Social Platforms ⭐</b><br><sub>International and regional social networks</sub></td>
  <td><a href="https://raw.githubusercontent.com/yagami1997/surgemac/main/neorulset26/rules/socialsite.list">socialsite.list</a></td>
</tr>
<tr>
  <td width="60"><img src="https://cdn-icons-png.flaticon.com/512/5968/5968846.png" width="40" align="center"></td>
  <td><b>Community Networks ⭐</b><br><sub>User-generated content platforms (CN-focused)</sub></td>
  <td><a href="https://raw.githubusercontent.com/yagami1997/surgemac/main/neorulset26/rules/hulo.list">hulo.list</a></td>
</tr>
<tr>
  <td width="60"><img src="https://cdn-icons-png.flaticon.com/512/3330/3330314.png" width="40" align="center"></td>
  <td><b>Academic Resources</b><br><sub>Research databases and educational institutions</sub></td>
  <td><a href="https://raw.githubusercontent.com/yagami1997/surgemac/main/neorulset26/rules/scholar.list">scholar.list</a></td>
</tr>
<tr>
  <td width="60"><img src="https://cdn-icons-png.flaticon.com/512/3178/3178285.png" width="40" align="center"></td>
  <td><b>ByteDance Ecosystem ⭐</b><br><sub>TikTok, Douyin, and related platforms</sub></td>
  <td><a href="https://raw.githubusercontent.com/yagami1997/surgemac/main/neorulset26/rules/bytedance.list">bytedance.list</a></td>
</tr>
<tr>
  <td width="60"><img src="https://cdn-icons-png.flaticon.com/512/5968/5968866.png" width="40" align="center"></td>
  <td><b>AI Platforms</b><br><sub>OpenAI, Claude, and 50+ AI services</sub></td>
  <td><a href="https://raw.githubusercontent.com/yagami1997/surgemac/main/neorulset26/rules/ai.list">ai.list</a></td>
</tr>
<tr>
  <td width="60"><img src="https://cdn-icons-png.flaticon.com/512/8099/8099326.png" width="40" align="center"></td>
  <td><b>Cryptocurrency</b><br><sub>Exchanges, DeFi, and blockchain services</sub></td>
  <td><a href="https://raw.githubusercontent.com/yagami1997/surgemac/main/neorulset26/rules/crypto.list">crypto.list</a></td>
</tr>
<tr>
  <td width="60"><img src="https://cdn-icons-png.flaticon.com/512/5968/5968968.png" width="40" align="center"></td>
  <td><b>Discord</b><br><sub>Voice, video, and messaging platform</sub></td>
  <td><a href="https://raw.githubusercontent.com/yagami1997/surgemac/main/neorulset26/rules/messenger.list">messenger.list</a></td>
</tr>
</table>

</div>

## 🗂️ Comprehensive Ruleset Library

The actively maintained shared ruleset library lives under `neorulset26/ruleset/`. The historical root `ruleset/` tree has moved to `archive/legacy/ruleset/` and remains only for migration until `2027-01-31`.

<details>
<summary><strong>Library coverage and raw path examples</strong></summary>

### Media & Entertainment (44 files)

- **Streaming**: Netflix, Disney+, YouTube, Max, Spotify, Hulu
- **Asian TV**: Abema TV, Bahamut, KKTV, ViuTV, Niconico
- **Global TV**: BBC iPlayer, DAZN, PBS, Pandora
- **CN Mainland**: Bilibili, iQIYI, Tencent Video, Netease Music
- **Apple Services**: Apple TV, Apple Music, Apple News

### Services & Tools (8 files)

- Microsoft, Google FCM, Telegram, Steam
- TikTok, Apple, Speedtest, miHoYo

### Core Utilities (3 files)

- AdBlock, HTTPDNS, Special
- Proxy, Domestic, Domestic IPs

```text
https://raw.githubusercontent.com/yagami1997/surgemac/main/neorulset26/ruleset/
https://raw.githubusercontent.com/yagami1997/surgemac/main/neorulset26/ruleset/Media/
```

</details>

---

## 🎯 Advanced Features

- Geo-location aware routing for selected rulesets marked with `⭐`
- Multi-region proxy selection for content, identity, and latency control
- Coverage includes `DOMAIN`, `DOMAIN-SUFFIX`, `IP-CIDR`, `USER-AGENT`, and `DOMAIN-KEYWORD`
- Total coverage: `2,500+` routing decisions across `67` rule files

<details>
<summary><strong>Geo-location control details</strong></summary>

Rulesets marked with `⭐` incorporate advanced geo-location routing technology, enabling precise control over network exit points.

- Multi-region proxy node selection
- Dynamic IP address presentation
- Real-time traffic routing optimization
- Zero-latency location switching

```text
Asian Node    -> Asia-Pacific identity
European Node -> European Union identity
Americas Node -> North/South America identity
```

</details>

## 🚀 Quick Start Guide

For new setups, start with the `neorulset26/` documentation above. If you are migrating from historical root-level raw files, replace them using [`archive/legacy/MIGRATION_RULE_URLS.md`](./archive/legacy/MIGRATION_RULE_URLS.md). If you need an emergency network utility rather than a ruleset, start from the [`tools/` overview](./tools/README.md).

### Installation Steps

**1. Select Your Ruleset**

Browse the collection above and identify the rulesets relevant to your use case.

**2. Obtain Raw URL**

Use the raw URLs listed in this README or in `neorulset26/MIGRATION_RULE_URLS.md`.

**3. Configure Surge Pro 6**

```
Profile → Edit Configuration → Rule
  ↓
Add Rule → Rule Set → External
  ↓
Paste URL → Select Policy → Save
```

**4. Apply & Verify**

Activate your configuration and verify routing behavior through Surge's built-in diagnostics. If you are replacing historical imports, validate that the new paths now point to `neorulset26/` instead of the old root layout.

### Update Management

Keep your rulesets up-to-date with automatic updates:

```
Profile → Edit → External Resources → Update All
```

**Recommended Update Frequency**: Weekly or bi-weekly

## 💡 Advanced Usage

<details>
<summary><strong>Policy recommendations and best practices</strong></summary>

### Policy Recommendations

- Financial platforms -> `DIRECT` or a trusted proxy
- Academic resources -> dedicated `Scholar` policy
- Cloud services -> low-latency proxy nodes
- Social platforms -> regional proxy selection
- Content platforms -> multi-region strategy
- Streaming services -> CDN-optimized routing

### Integration Best Practices

- Pair with DoH/DoT for stronger privacy
- Choose geographically appropriate nodes
- Keep a `DIRECT` fallback for stability
- Recheck latency and routing quality regularly

### Security Considerations

- Rulesets are regularly audited
- No third-party tracking or analytics domains included
- Fully self-hosted infrastructure with zero external dependencies
- HTTPS-only ruleset URLs for delivery

</details>

## 🔧 Technical Snapshot

- Compatibility: Surge Pro 6.x full support, Surge Pro 5.x partial compatibility
- Platform baseline: iOS `15.0+`, macOS `12.0+`
- Performance: rule processing `< 1ms`, reload time `< 500ms`
- Scale: `2,500+` rules, `67` active rulesets, `2,000+` covered domains

<details>
<summary><strong>Rule format examples</strong></summary>

```text
DOMAIN,example.com,POLICY
DOMAIN-SUFFIX,example.com,POLICY
IP-CIDR,192.168.1.0/24,POLICY,no-resolve
USER-AGENT,ApplicationName*,POLICY
```

</details>

## 🛡️ Privacy, License, and Support

- Privacy: no telemetry, no data collection, no third-party rule hosting, fully auditable
- License: [MIT License](LICENSE)
- Disclaimer: intended for network optimization and educational use; users remain responsible for legal and service-term compliance
- Contributing: prioritize rule accuracy, testing, privacy-respecting domains, and clear change notes
- Support: use GitHub issues for bugs and repository watch/discussions for updates

---

<div align="center">
  <br>
  <p>
    <sub>⚡ Built for performance | 🔒 Designed for privacy | 🌍 Optimized globally</sub>
    <br>
    <sub>Made with ❤️ for the network optimization community</sub>
    <br><br>
    <sub>Copyright © 2023-2026 | All rights reserved</sub>
    <br>
    <sub>Last Updated: April 8, 2026 09:29 PM PDT</sub>
  </p>
</div>
