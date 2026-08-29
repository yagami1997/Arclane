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

## Validation

A standalone `.sgmodule` is not a complete Surge profile. Validate its static
structure directly, or merge it into a temporary complete profile before
using `surge-cli --check`; do not add a `FINAL` rule merely to satisfy the
standalone checker.

---

*Last updated: August 29, 2026 JST (Asia/Tokyo)*
