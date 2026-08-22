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
- route the Lark product CDN and Doubao product domain directly;
- load the dedicated `feishu.list` rule set with `DIRECT` and
  `extended-matching`;
- contain no `FINAL` rule and define no proxy policy group.

The macOS module additionally routes the installed Lark and Feishu application
processes directly. The iOS module contains no macOS process paths.

Broad shared ByteDance suffixes are intentionally excluded. General Douyin,
Toutiao, and TikTok traffic in standalone applications or browsers remains
controlled by the existing Bytedance and TikTok rule sets. On macOS, a link
opened inside Lark or Feishu follows the module's application process rule.

## Validation

A standalone `.sgmodule` is not a complete Surge profile. Validate its static
structure directly, or merge it into a temporary complete profile before
using `surge-cli --check`; do not add a `FINAL` rule merely to satisfy the
standalone checker.

---

*Last updated: August 21, 2026 6:59 PM PDT (America/Los_Angeles)*
