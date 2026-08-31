# Surge Real IP Modules

This directory is the single publication surface for Arclane's maintained
Surge Real IP modules. The modules centralize verified `always-real-ip`
compatibility handling for Fake IP and Enhanced Mode while keeping outbound
routing decisions explicit and reviewable.

## Published Artifacts

| Platform | Module | Raw URL |
|---|---|---|
| macOS | [`realip.sgmodule`](./realip.sgmodule) | <https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/modules/realip.sgmodule> |
| iOS/iPadOS | [`realip-ios.sgmodule`](./realip-ios.sgmodule) | <https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/modules/realip-ios.sgmodule> |

Install only the variant matching the target platform.

Supporting files:

- [`realip.list`](./realip.list): categorized canonical host catalog;
- [`../../tools/realip/build.py`](../../tools/realip/build.py): deterministic
  validator and renderer;
- [`../../tools/realip/README.md`](../../tools/realip/README.md): maintainer
  workflow and validation notes.

`realip.list` is source data. It is not a Surge rule set and must not be loaded
with `RULE-SET`.

## What the Module Solves

Surge Enhanced Mode normally returns addresses from `198.18.0.0/15` to
applications and maps those Fake IP addresses back to domain names when the
connection reaches the VIF. This is efficient for normal proxy workflows, but
some applications require the DNS answer itself to be a real address.

Typical incompatibilities include:

- SSRF and DNS-rebinding protection rejecting special-use addresses;
- captive portals or network-detection clients expecting routable answers;
- STUN, TURN, gaming, and real-time communication workflows that inspect IP
  addresses directly;
- local callbacks and service-discovery flows;
- application WebViews, authentication flows, or CDN dependencies that fail
  or stall when given a Fake IP.

The module applies Real IP handling only to the curated catalog. It does not
disable Enhanced Mode and does not globally replace Surge's Fake IP design.

## Catalog Scope

Version 2.1.0 contains 174 unique host tokens:

- 102 established compatibility tokens migrated from the maintained profile
  baseline;
- 71 verified Feishu, Lark, Doubao, and product-qualified CDN/CNAME tokens;
- the exact `auth.openai.com` OAuth endpoint for SSRF-sensitive token exchange.

Apple connectivity handling is deliberately narrow. The default catalog keeps
`captive.apple.com`, which is the current connectivity-validation endpoint,
but no longer forces `www.apple.com`, `www.appleiphonecell.com`, or
`gsp1.apple.com` to use locally resolved addresses. Ordinary Apple websites,
account pages, and store traffic therefore retain the consuming profile's
normal Fake IP and outbound-policy behavior. See Apple's current
[enterprise network host reference](https://support.apple.com/101555).

The catalog is organized by scenario:

- local network and service discovery;
- operating-system connectivity detection;
- captive portals and public Wi-Fi providers used by airports, hotels, cafes,
  enterprise guest networks, and similar venues;
- gaming and real-time communication;
- local application callbacks;
- gaming authentication;
- established music and media compatibility;
- carrier and identity authentication;
- time and directory services;
- Feishu, Lark, Doubao, and verified product-qualified dependencies;
- OAuth and SSRF-sensitive endpoints supported by direct failure evidence.

Brand websites are not added merely because a venue provides public Wi-Fi.
Prefer the exact captive-portal or network-provider hostname. Broad provider
wildcards require evidence and review.

## DNS and Routing Boundary

`always-real-ip` changes the DNS answer returned to the application. It does
not select the outbound policy.

The modules retain the validated Feishu, Lark, and Doubao `DIRECT` routing
rules because those fixes were verified together with the related Real IP
coverage. The macOS module additionally uses process-scoped rules for shared
ByteDance infrastructure used by the installed Feishu and Lark applications.
The iOS/iPadOS module contains no macOS process paths.

`auth.openai.com` receives a real DNS answer only. Its route remains controlled
by the main profile, such as an existing AI policy group.

Neither module contains a `FINAL` rule, proxy policy group, proxy server, MITM
configuration, rewrite, script, private resolver, or credential.

## Installation and Profile Cleanup

1. Back up the working Surge profile.
2. Install and enable the platform-appropriate module URL.
3. Keep Enhanced Mode enabled and verify the effective DNS and routing results.
4. Test connectivity detection, common applications, Feishu/Lark pages, and
   any SSRF-sensitive OAuth flow relevant to the device.
5. After successful validation, remove the base profile's entire inline
   `always-real-ip = ...` field when all of its tokens are owned by this module.

Do not leave an empty `always-real-ip =` assignment. The field should be absent
from the base profile when management has been fully delegated to the module.

If a regression occurs, disable the module and restore the known-good inline
field before continuing diagnosis.

## Maintenance Workflow

Edit only [`realip.list`](./realip.list), then run from the repository root:

```sh
python3 tools/realip/build.py
python3 tools/realip/build.py --check
```

The builder rejects duplicates, malformed tokens, and dangerously broad
top-level wildcard entries. It renders the same generated `always-real-ip`
value and synchronized release metadata into both platform modules while
leaving their platform-specific routing sections readable and independently
reviewable. It also enforces the expected platform identifier and section set,
rejects non-`DIRECT` module routing, and prevents process rules from entering
the iOS/iPadOS artifact.

A new token requires a confirmed Fake IP compatibility case or a documented
network-detection, captive-portal, local-callback, real-time communication, or
identity-authentication workflow. Prefer exact hostnames. Review uncertain or
historical entries separately instead of changing behavior during a structural
migration.

## Validation

Required release checks:

- canonical token count and case-insensitive uniqueness;
- exact parity between the macOS and iOS/iPadOS generated host lists;
- platform-specific process-rule boundaries;
- routing regression checks for retained product rules;
- `git diff --check` and relative Markdown-link validation;
- temporary complete-profile validation with native `surge-cli --check`;
- live confirmation that selected hosts no longer receive `198.18.0.0/15` or
  Surge Fake IPv6 answers;
- route explanation for hosts whose outbound policy must remain unchanged.

Builder unit tests:

```sh
python3 tools/realip/test_build.py
```

A standalone `.sgmodule` is not a complete Surge profile. Do not add a `FINAL`
rule merely to satisfy the standalone checker.

## Changelog

### August 31, 2026 (PDT)

- Released v2.1.0 with 174 Real IP host tokens.
- Retained `captive.apple.com` for Apple connectivity detection while removing
  `www.apple.com`, `www.appleiphonecell.com`, and `gsp1.apple.com` from forced
  Real IP handling. This keeps ordinary Apple web, account, and store traffic
  on the consuming profile's normal DNS and routing path.
- Added deterministic module version/date rendering and structural safety
  checks for platform identifiers, allowed sections, `DIRECT`-only module
  routing, and the iOS/iPadOS process-rule boundary.
- Added unit coverage for catalog parsing and module safety validation.

### August 29, 2026 (PDT)

- Released the v2.0.0 Real IP architecture for macOS and iOS/iPadOS.
- Added the categorized 177-token canonical catalog and deterministic builder.
- Added exact Real IP handling for `auth.openai.com` without forcing a route.
- Preserved the validated platform-specific Feishu, Lark, and Doubao routing
  behavior.
- Retired the superseded product-specific module artifacts after successful
  live migration to the unified Real IP modules.

<details>
<summary>Previous module research</summary>

### August 28, 2026 (PDT)

- Investigated recurring Feishu/Lark blank pages, external Wiki delays, and
  `ERR_TIMED_OUT (-7)` failures.
- Added product-qualified CNAME coverage and narrowed macOS process routing so
  embedded external sites continued through the main profile's normal rules.
- Kept broad ByteDance suffixes out of global module routing rules.

### August 21, 2026 (PDT)

- Added the first platform-specific Feishu/Lark compatibility artifacts.
- Added product-domain Real IP handling, direct product routing, and Doubao
  compatibility.

</details>

---

*Last updated: August 31, 2026 (PDT)*
