# Surge Real IP Modules

This directory publishes platform-specific Surge modules that centralize
verified `always-real-ip` compatibility handling under Fake IP and Enhanced
Mode. Each device should install only the module matching its platform.

## Installation

- macOS: <https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/modules/realip.sgmodule>
- iOS/iPadOS: <https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/modules/realip-ios.sgmodule>

Before installation or update, review the repository-wide
[usage and safety notice](../../docs/guides/usage-and-safety.md) and the
[legal boundary statement](../../docs/legal/LEGAL.md). Preserve a known-good
profile and a tested rollback path.

Do not enable a new Real IP module together with either legacy `feishu-fix`
module. Disable the legacy module only after the new module is available and
has passed validation on the target device.

## Architecture

The categorized canonical host catalog is [`realip.list`](./realip.list). It is
maintenance input, not a Surge rule set, and must not be loaded with
`RULE-SET`.

[`../../tools/realip/build.py`](../../tools/realip/build.py) validates the
catalog and renders the same generated `always-real-ip` value into both
platform modules. The generated value must not be edited manually.

The initial v2.0.0 catalog contains 177 unique host tokens:

- 105 tokens migrated without semantic changes from the maintained Surge
  profile baseline;
- 71 verified Feishu, Lark, Doubao, and product-qualified CDN/CNAME tokens;
- the exact `auth.openai.com` OAuth endpoint for applications whose SSRF or
  anti-rebinding protection rejects Surge's `198.18.0.0/15` Fake IP range.

## Covered Scenarios

- local network and service discovery;
- operating-system connectivity detection;
- captive portals and public Wi-Fi providers used by airports, hotels, cafes,
  enterprise guest networks, and similar venues;
- gaming and real-time communication, including STUN and TURN;
- local application callbacks;
- gaming authentication;
- music and media compatibility retained from the established baseline;
- carrier and identity authentication;
- time and directory services;
- Feishu, Lark, Doubao, and verified product-qualified dependencies;
- OAuth and SSRF-sensitive endpoints supported by direct failure evidence.

Brand websites are not added merely because a venue offers public Wi-Fi.
Prefer the exact captive-portal or network-provider hostname. Broad provider
wildcards require evidence and review.

## Routing Boundary

`always-real-ip` changes the DNS answer returned to the application. It does
not select the outbound policy.

The modules retain the previously validated Feishu, Lark, and Doubao `DIRECT`
routing fixes. The macOS variant also retains process-scoped rules for shared
ByteDance infrastructure used by the installed Feishu and Lark applications.
The iOS/iPadOS variant contains no macOS process rules.

`auth.openai.com` receives a real DNS answer only. The modules do not force it
to `DIRECT`; the main profile remains responsible for OpenAI routing.

Neither module contains a `FINAL` rule, proxy policy group, proxy server,
MITM configuration, rewrite, script, private resolver, or credential.

## Maintenance

Edit only [`realip.list`](./realip.list), then run:

```sh
python3 tools/realip/build.py
python3 tools/realip/build.py --check
```

A new token requires a confirmed Fake IP compatibility case or a documented
network-detection, captive-portal, local-callback, real-time communication, or
identity-authentication workflow. Prefer exact hostnames. Keep uncertain
historical entries until they can be reviewed separately without changing the
baseline during a structural migration.

## Migration from the Feishu Modules

1. Keep the current Surge profile and legacy module available for rollback.
2. Install and enable the platform-appropriate Real IP module.
3. Disable the matching legacy `feishu-fix` module.
4. Confirm that the effective profile contains 177 unique Real IP tokens.
5. Verify Feishu/Lark pages, OpenAI OAuth, connectivity detection, and common
   applications while Enhanced Mode remains enabled.
6. Remove inline `always-real-ip` tokens from the base profile only after the
   module has passed live validation.

The legacy files remain temporarily available during this migration window:

- `feishu-fix.sgmodule`
- `feishu-fix-ios.sgmodule`

They are not intended for simultaneous use with the new modules.

## Validation

A standalone `.sgmodule` is not a complete Surge profile. Validate its static
structure directly, or merge it into a temporary complete profile before
using `surge-cli --check`. Do not add a `FINAL` rule merely to satisfy the
standalone checker.

## Changelog

### August 29, 2026 (PDT)

- Introduced the v2.0.0 Real IP module architecture for macOS and iOS/iPadOS.
- Added a categorized 177-token canonical catalog and deterministic builder.
- Migrated the established profile baseline and Feishu/Lark/Doubao coverage
  without changing the original token spelling.
- Added exact Real IP handling for `auth.openai.com` without changing its
  outbound routing policy.
- Retained the validated platform-specific Feishu routing behavior and added
  an explicit staged migration path from the legacy module URLs.

<details>
<summary>Previous module history</summary>

### August 28, 2026 (PDT)

- Released v1.2.0 of the Feishu/Lark modules after investigating recurring
  blank pages, external Wiki delays, and `ERR_TIMED_OUT (-7)` failures.
- Added product-qualified CNAME coverage and narrowed macOS process routing so
  embedded external sites continued through the main profile's normal rules.
- Kept broad ByteDance suffixes out of global module routing rules.

### August 21, 2026 (PDT)

- Added separate macOS and iOS/iPadOS Feishu/Lark compatibility modules.
- Added product-domain Real IP handling, dedicated direct routing, and Doubao
  compatibility.

</details>

---

*Last updated: August 29, 2026 8:35 PM PDT (America/Los_Angeles)*
