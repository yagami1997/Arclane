# Legacy Migration Rule URLs

This document records the historical rule paths that were moved into `archive/legacy/` and points to the preferred 2026 replacements under `neorulset26/`.

## Status

- Deprecated
- Scheduled for removal on `2027-01-31`
- Removal may begin on `2027-02-01`

## Recommended Mainline

Use the 2026 mainline under:

```text
https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/
```

For a full migration-ready URL list, use:

- `../../neorulset26/MIGRATION_RULE_URLS.md`

## Root Rules Migration

| Legacy path | Preferred path | Note |
|---|---|---|
| `archive/legacy/root-rules/bytedance.list` | `neorulset26/rules/bytedance.list` | direct replacement |
| `archive/legacy/root-rules/common.list` | `neorulset26/rules/common.list` | direct replacement |
| `archive/legacy/root-rules/crypto.list` | `neorulset26/rules/crypto.list` | direct replacement |
| `archive/legacy/root-rules/hulo.list` | `neorulset26/rules/hulo.list` | direct replacement |
| `archive/legacy/root-rules/paypal.list` | `neorulset26/rules/paypal.list` | direct replacement |
| `archive/legacy/root-rules/scholar.list` | `neorulset26/rules/scholar.list` | direct replacement |
| `archive/legacy/root-rules/socialsite.list` | `neorulset26/rules/socialsite.list` | direct replacement |
| `archive/legacy/root-rules/openai.list` | `neorulset26/rules/ai.list` | renamed in the 2026 mainline |
| `archive/legacy/root-rules/discord.list` | `neorulset26/rules/messenger.list` | broader messaging coverage in the 2026 mainline |

## Ruleset Migration

Most files under `archive/legacy/ruleset/` map directly to the same relative path under `neorulset26/ruleset/`.

Base migration rule:

```text
archive/legacy/ruleset/<path>.list
-> neorulset26/ruleset/<path>.list
```

Examples:

```text
archive/legacy/ruleset/AdBlock.list
-> neorulset26/ruleset/AdBlock.list

archive/legacy/ruleset/Proxy.list
-> neorulset26/ruleset/Proxy.list

archive/legacy/ruleset/Media/Netflix.list
-> neorulset26/ruleset/Media/Netflix.list
```

## Notes

- The legacy archive exists only for transition.
- New users should not adopt the legacy paths.
- Sensitive OpenClash rewrite files are intentionally excluded from this document because they are local-only and not tracked by Git.
