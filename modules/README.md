# Shared Modules

Repository-wide shared Surge modules belong in this directory. Platform-specific
modules released with the active ruleset line, including the Feishu/Lark
compatibility modules, live under [`neorulset26/modules/`](../neorulset26/modules/).

## Rules

- Place repository-wide shared `.sgmodule` files here.
- Do not add `.sgmodule` files to the repository root.
- Keep module filenames stable once they are shared externally.
- Give each new module a clear, descriptive name.

Before importing a module, read the repository-wide
[usage and safety notice](../docs/guides/usage-and-safety.md) and preserve a
known-good profile for rollback.

## Current Modules

- `ASN.China.sgmodule` — legacy; under retirement review
- `WeChat.sgmodule` — legacy; under retirement review

## Legacy Review Status

These two modules predate the active `neorulset26` architecture and are not
recommended for new installations:

- `ASN.China.sgmodule` inserts 72 ASN-wide `DIRECT` rules. It overlaps the
  maintained Domestic domain/IP rules and can capture unrelated traffic hosted
  anywhere inside large carrier, education, government, broadcast, or Tencent
  networks.
- `WeChat.sgmodule` labels three large network ASNs as WeChat-specific. They are
  not product-exclusive: AS9808 is China Mobile, while AS45090 and AS132203 are
  Tencent networks. The rules also use `no-resolve`, so Surge skips them for an
  unresolved hostname unless another earlier rule has already produced an IP.

For profiles already using the active mainline, the maintained
`neorulset26/ruleset/Domestic.list` and
`neorulset26/ruleset/Domestic IPs.list` contain the relevant Domestic and
WeChat/WeChat Pay coverage without adding a separate ASN-wide module at the top
of the rule list.

The old files remain temporarily available only to avoid an unannounced Raw URL
break. Their eventual removal or replacement requires a separately documented
migration decision; their presence is not a current compatibility guarantee.

---

*Last updated: August 28, 2026 7:49 PM PDT (America/Los_Angeles)*
