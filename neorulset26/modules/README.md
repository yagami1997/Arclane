# Surge Compatibility Modules

This directory contains platform-specific Surge modules for Feishu/Lark and
Doubao compatibility under Fake-IP and Enhanced Mode.

## Installation

Choose the module that matches the Surge platform. Do not install both on the
same device.

- macOS: <https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/modules/feishu-fix.sgmodule>
- iOS/iPadOS: <https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/modules/feishu-fix-ios.sgmodule>

## Scope

Both modules:

- append Feishu/Lark and Doubao product domains to `always-real-ip`;
- include narrowly qualified CNAME patterns observed behind those products;
- route those product-qualified CNAME endpoints directly;
- route the Lark product CDN and Doubao product domain directly;
- load the dedicated `feishu.list` rule set with `DIRECT` and
  `extended-matching`;
- contain no `FINAL` rule and define no proxy policy group.

The macOS module additionally uses process-scoped logical rules to route only
the ByteDance shared infrastructure observed inside the installed Lark and
Feishu applications directly. External sites opened inside the applications
continue through the main profile's normal rules. The iOS module contains no
macOS process paths or process rules.

Broad shared ByteDance suffixes are intentionally excluded from global module
rules. General Douyin, Toutiao, and TikTok traffic in standalone applications
or browsers remains controlled by the existing Bytedance and TikTok rule sets.

## Changelog

### August 28, 2026 (PDT)

- Investigated recurring blank pages, slow external Wiki content, and Chromium
  `ERR_TIMED_OUT (-7)` errors while Surge Enhanced Mode was active.
- Confirmed two independent causes: product-qualified Feishu CNAME endpoints
  missing from the real-IP exceptions, and the macOS module's application-wide
  `DIRECT` rules also forcing third-party resources opened inside Feishu/Lark
  to connect directly.
- Released v1.2.0 for macOS with product-qualified CNAME coverage and
  process-scoped logical rules. Feishu/Lark traffic to observed ByteDance shared
  infrastructure remains direct, while embedded external sites fall through to
  the main profile's normal Google, regional, or final policies.
- Released v1.2.0 for iOS/iPadOS with the same 71 `always-real-ip` tokens and six
  matching CNAME routing rules. The iOS module intentionally contains no
  macOS-only process rules.
- Kept broad provider suffixes out of global module rules and preserved the
  existing standalone Bytedance, TikTok, Douyin, and Toutiao routing semantics.
- Validated both platform variants through static parity checks and temporary
  complete profiles accepted by the native `surge-cli --check` command.

### August 21, 2026 (PDT)

- Added separate macOS and iOS/iPadOS Feishu/Lark compatibility modules.
- Added product-domain real-IP handling, the dedicated `feishu.list` DIRECT
  route, Lark CDN routing, and Doubao compatibility.
- Narrowed broad shared-infrastructure exceptions to product-qualified CNAME
  patterns.

## Validation

A standalone `.sgmodule` is not a complete Surge profile. Validate its static
structure directly, or merge it into a temporary complete profile before
using `surge-cli --check`; do not add a `FINAL` rule merely to satisfy the
standalone checker.

---

*Last updated: August 28, 2026 7:29 PM PDT (America/Los_Angeles)*
