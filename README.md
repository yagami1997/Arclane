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

This repository is a continuously maintained Surge ruleset project with three parallel responsibilities:

- a current mainline ruleset architecture under `neorulset26/`
- a stable compatibility publication surface at the repository root and under `ruleset/`
- a growing `tools/` layer for operational utilities and recovery-oriented support components

If you are new to the repository, start with the 2026 mainline. If you rely on existing raw import paths, the compatibility surface remains available. If you need supporting operational utilities, check the tools layer.

## Repository Structure

This repository now has three distinct responsibilities, and they should be read differently:

- `neorulset26/`: the preferred 2026 mainline ruleset stack, with its own architecture and documentation
- repository root + `ruleset/`: stable public endpoints for existing GitHub Raw imports and compatibility consumers
- `tools/`: repository-wide support tooling for recovery, validation, deployment, and maintenance utilities

The root may still look flatter than ideal because some filenames now function like published API paths. Moving them carelessly would break downstream configurations. See [`REPOSITORY_LAYOUT.md`](./REPOSITORY_LAYOUT.md) for the maintenance boundary and placement rules.

## 2026 Recommendation

For new setups, use `neorulset26/` first.

- Architecture reference: [`neorulset26/ENGINEERING_GUIDE.md`](./neorulset26/ENGINEERING_GUIDE.md)
- Rule URL reference: [`neorulset26/RULESET_URLS.md`](./neorulset26/RULESET_URLS.md)
- Collaboration and transition notes: [`COLLABORATION_GUIDE.md`](./COLLABORATION_GUIDE.md)
- Repository tools overview: [`tools/README.md`](./tools/README.md)

Root-level `*.list`, `*.sgmodule`, and `ruleset/` remain available for compatibility, but they should be treated as legacy transition surfaces rather than the preferred 2026 architecture.

## Design Philosophy

The repository is maintained around a few practical rules:

- **Published path stability**: public raw import paths should stay stable once other people depend on them.
- **Mainline-first evolution**: new ruleset architecture, documentation, and forward-looking maintenance belong in `neorulset26/`.
- **Self-hosted control**: wherever practical, rules and supporting assets should be maintained internally rather than delegated to drifting external dependencies.
- **Compatibility without stagnation**: legacy paths stay available, but they should not dictate how the project evolves.
- **Tools support operations**: recovery utilities, validators, deployment helpers, and similar support components belong under `tools/`, not inside the ruleset mainline.
- **Documentation should track reality**: because this project changes frequently, the README should explain the current structure, not just preserve old presentation.

## 🔄 Changelog

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

## 🧰 Tools

`tools/` is the repository-wide support layer for operational utilities and maintenance-focused components. It exists to hold modules that help run, validate, deploy, recover, or support the broader project without mixing those concerns into the ruleset mainline.

- Tools overview: [`tools/README.md`](./tools/README.md)
- Current tool: [`tools/doh-fallback-worker/README.md`](./tools/doh-fallback-worker/README.md)

Current direction for `tools/` includes:

- emergency network utilities
- deployment helpers
- validators and auditing aids
- generators and maintenance helpers
- other repository-level support components with ongoing operational value

---

## 🌟 Key Features

<table>
<tr>
<td width="33%" align="center">
<h3>🎯 Smart Routing</h3>
<p>Intelligent rule-based traffic distribution with optimized paths for different service categories</p>
</td>
<td width="33%" align="center">
<h3>⚡ Performance</h3>
<p>Reduced latency and improved connection stability through strategic proxy selection</p>
</td>
<td width="33%" align="center">
<h3>🔐 Privacy Control</h3>
<p>Enhanced privacy protection with DNS optimization and selective routing policies</p>
</td>
</tr>
</table>

## 📦 Self-Built Ruleset Collection

<div align="center">

<table>
<tr>
  <td width="60"><img src="https://cdn-icons-png.flaticon.com/512/9458/9458326.png" width="40" align="center"></td>
  <td><b>Common Services</b><br><sub>Essential productivity tools and infrastructure</sub></td>
  <td><a href="https://raw.githubusercontent.com/yagami1997/surgemac/main/common.list">common.list</a></td>
</tr>
<tr>
  <td width="60"><img src="https://cdn-icons-png.flaticon.com/512/2936/2936660.png" width="40" align="center"></td>
  <td><b>Financial Services</b><br><sub>Secure routing for payment and banking (US-focused)</sub></td>
  <td><a href="https://raw.githubusercontent.com/yagami1997/surgemac/main/paypal.list">paypal.list</a></td>
</tr>
<tr>
  <td width="60"><img src="https://cdn-icons-png.flaticon.com/512/9073/9073032.png" width="40" align="center"></td>
  <td><b>Social Platforms ⭐</b><br><sub>International and regional social networks</sub></td>
  <td><a href="https://raw.githubusercontent.com/yagami1997/surgemac/main/socialsite.list">socialsite.list</a></td>
</tr>
<tr>
  <td width="60"><img src="https://cdn-icons-png.flaticon.com/512/5968/5968846.png" width="40" align="center"></td>
  <td><b>Community Networks ⭐</b><br><sub>User-generated content platforms (CN-focused)</sub></td>
  <td><a href="https://raw.githubusercontent.com/yagami1997/surgemac/main/hulo.list">hulo.list</a></td>
</tr>
<tr>
  <td width="60"><img src="https://cdn-icons-png.flaticon.com/512/3330/3330314.png" width="40" align="center"></td>
  <td><b>Academic Resources</b><br><sub>Research databases and educational institutions</sub></td>
  <td><a href="https://raw.githubusercontent.com/yagami1997/surgemac/main/scholar.list">scholar.list</a></td>
</tr>
<tr>
  <td width="60"><img src="https://cdn-icons-png.flaticon.com/512/3178/3178285.png" width="40" align="center"></td>
  <td><b>ByteDance Ecosystem ⭐</b><br><sub>TikTok, Douyin, and related platforms</sub></td>
  <td><a href="https://raw.githubusercontent.com/yagami1997/surgemac/main/bytedance.list">bytedance.list</a></td>
</tr>
<tr>
  <td width="60"><img src="https://cdn-icons-png.flaticon.com/512/5968/5968866.png" width="40" align="center"></td>
  <td><b>AI Platforms</b><br><sub>OpenAI, Claude, and 50+ AI services</sub></td>
  <td><a href="https://raw.githubusercontent.com/yagami1997/surgemac/main/openai.list">openai.list</a></td>
</tr>
<tr>
  <td width="60"><img src="https://cdn-icons-png.flaticon.com/512/8099/8099326.png" width="40" align="center"></td>
  <td><b>Cryptocurrency</b><br><sub>Exchanges, DeFi, and blockchain services</sub></td>
  <td><a href="https://raw.githubusercontent.com/yagami1997/surgemac/main/crypto.list">crypto.list</a></td>
</tr>
<tr>
  <td width="60"><img src="https://cdn-icons-png.flaticon.com/512/5968/5968968.png" width="40" align="center"></td>
  <td><b>Discord</b><br><sub>Voice, video, and messaging platform</sub></td>
  <td><a href="https://raw.githubusercontent.com/yagami1997/surgemac/main/discord.list">discord.list</a></td>
</tr>
</table>

</div>

## 🗂️ Comprehensive Ruleset Library

**New in February 2026**: All streaming media, services, and filtering rules are now self-hosted in the `ruleset/` directory for complete autonomy.

### Media & Entertainment (44 files)
- **Streaming**: Netflix, Disney+, YouTube, Max, Spotify, Hulu
- **Asian TV**: Abema TV, Bahamut, KKTV, ViuTV, Niconico (15 platforms)
- **Global TV**: BBC iPlayer, DAZN, PBS, Pandora (13 platforms)
- **CN Mainland**: Bilibili, iQIYI, Tencent Video, Netease Music (7 platforms)
- **Apple Services**: Apple TV, Apple Music, Apple News

### Services & Tools (8 files)
- Microsoft, Google FCM, Telegram, Steam
- TikTok, Apple, Speedtest, miHoYo

### Core Utilities (3 files)
- AdBlock, HTTPDNS, Special (direct routing)
- Proxy (international), Domestic (CN), Domestic IPs

**Access all ruleset files:**
```
https://raw.githubusercontent.com/yagami1997/surgemac/main/ruleset/
https://raw.githubusercontent.com/yagami1997/surgemac/main/ruleset/Media/
```

---

## 🎯 Advanced Features

### Geo-Location Control System ⭐

Rulesets marked with ⭐ incorporate advanced geo-location routing technology, enabling precise control over your network exit points.

**Technical Implementation:**
- Multi-region proxy node selection
- Dynamic IP address presentation
- Real-time traffic routing optimization
- Zero-latency location switching

**Supported Capabilities:**
- **Regional Identity Management**: Present different geographic identities based on proxy selection
- **Content Access Optimization**: Bypass regional restrictions intelligently
- **Privacy Enhancement**: Mask original location with strategic routing

**Example Configuration:**
```
Asian Node → Geographic identity: Asia-Pacific region
European Node → Geographic identity: European Union
Americas Node → Geographic identity: North/South America
```

### Rule Types & Coverage

- **DOMAIN Rules**: 1,500+ domain-based routing rules
- **DOMAIN-SUFFIX Rules**: 800+ wildcard domain patterns  
- **IP-CIDR Rules**: 400+ IP range definitions (IPv4/IPv6)
- **USER-AGENT Rules**: 150+ application-specific identifiers
- **DOMAIN-KEYWORD Rules**: 80+ pattern matching entries
- **Total Coverage**: 2,500+ routing decisions across 67 rule files

## 🚀 Quick Start Guide

For new setups, start with the `neorulset26/` documentation above. If you are maintaining an existing profile that already imports root-level raw files, those compatibility paths remain available. If you need an emergency network utility rather than a ruleset, start from the [`tools/` overview](./tools/README.md).

### Installation Steps

**1. Select Your Ruleset**

Browse the collection above and identify the rulesets relevant to your use case.

**2. Obtain Raw URL**

Click on the desired `.list` file, then click the **RAW** button to get the direct URL.

**3. Configure Surge Pro 6**

```
Profile → Edit Configuration → Rule
  ↓
Add Rule → Rule Set → External
  ↓
Paste URL → Select Policy → Save
```

**4. Apply & Verify**

Activate your configuration and verify routing behavior through Surge's built-in diagnostics.

### Update Management

Keep your rulesets up-to-date with automatic updates:

```
Profile → Edit → External Resources → Update All
```

**Recommended Update Frequency**: Weekly or bi-weekly

## 💡 Advanced Usage

### Policy Recommendations

<table>
<tr>
<td width="50%">

**High-Priority Services**
- Financial platforms → `DIRECT` or trusted proxy
- Academic resources → Dedicated `Scholar` policy
- Cloud services → Low-latency proxy nodes

</td>
<td width="50%">

**Geo-Sensitive Applications**
- Social platforms → Regional proxy selection
- Content platforms → Multi-region strategy
- Streaming services → CDN-optimized routing

</td>
</tr>
</table>

### Integration Best Practices

- **DNS Configuration**: Pair with DoH/DoT for enhanced privacy
- **Proxy Selection**: Choose geographically optimal nodes
- **Fallback Strategy**: Configure DIRECT fallback for stability
- **Performance Monitoring**: Regular latency checks and adjustments

### Security Considerations

- All rulesets are regularly audited for security vulnerabilities
- No third-party tracking or analytics domains included
- Fully self-hosted infrastructure with zero external dependencies
- HTTPS-only ruleset URLs for secure content delivery

## 🔧 Technical Specifications

### Compatibility

- **Surge Pro 6.x**: Full feature support
- **Surge Pro 5.x**: Compatible with limitations
- **iOS**: 15.0+ recommended
- **macOS**: 12.0+ (Monterey or later)

### Performance Metrics

- **Rule Processing**: < 1ms per connection
- **Memory Footprint**: ~8-12MB total
- **Update Size**: 50-500KB per ruleset
- **Reload Time**: < 500ms for full configuration

### Rule Format

```
# Domain exact match
DOMAIN,example.com,POLICY

# Domain suffix wildcard
DOMAIN-SUFFIX,example.com,POLICY

# IP CIDR range
IP-CIDR,192.168.1.0/24,POLICY,no-resolve

# User agent matching
USER-AGENT,ApplicationName*,POLICY
```

## 📊 Project Statistics

- **Total Rules**: 2,500+
- **Active Rulesets**: 67 files (9 self-built + 58 comprehensive library)
- **Update Frequency**: 4-8 times per month
- **Domains Covered**: 2,000+ unique domains
- **IP Ranges**: 400+ CIDR blocks
- **Self-Hosted**: 100% autonomous infrastructure

## 🛡️ Privacy & Legal

### Privacy Statement

This project respects user privacy:
- No telemetry or tracking
- No data collection
- No third-party dependencies
- Fully self-hosted and auditable
- Open-source and transparent

### License

Licensed under the [MIT License](LICENSE) - free for personal and commercial use.

### Disclaimer

These rulesets are provided for **network optimization and educational purposes**. Users are responsible for ensuring compliance with local laws and service terms. The project maintainers assume no liability for misuse.

## 🤝 Contributing

Contributions are welcome! Please ensure:
- Rule accuracy and testing
- Privacy-respecting domains only
- Clear documentation of changes
- Adherence to project formatting standards

## 📞 Support

- **Issues**: Open a GitHub issue for bug reports
- **Discussions**: Share configurations and tips
- **Updates**: Watch this repository for notifications

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
    <sub>Last Updated: April 1, 2026 (PDT)</sub>
  </p>
</div>
