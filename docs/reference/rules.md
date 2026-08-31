# Rules Reference

This repository no longer treats the root directory as a rules publishing surface.

## Mainline Rules

Use the 2026 mainline under `neorulset26/`.

Primary references:

- `neorulset26/ENGINEERING_GUIDE.md`
- `neorulset26/RULESET_URLS.md`
- `neorulset26/MIGRATION_RULE_URLS.md`
- `neorulset26/modules/README.md` for the maintained Real IP modules and their
  DNS/routing boundary

## Legacy Rules

The former `archive/legacy/` transition surface (historical root rules and the old `ruleset/` tree) was fully removed on May 16, 2026 (PDT). Historical publication paths are no longer mirrored in this repository.

## Current Rule Ownership

- Active maintained rules: `neorulset26/`
- Local-only sensitive OpenClash rewrite files: `openclash-archive/` (not tracked by Git)

## Guidance

- For reviewing the active configuration mainline, refer to `neorulset26/`.
- Review `docs/guides/usage-and-safety.md` before importing a remote rule or
  module URL.
- Treat `neorulset26/modules/realip.list` as module source data, not as a
  `RULE-SET` URL.
- Keep connectivity-detection Real IP exceptions narrower than ordinary web
  routing. Apple detection uses `captive.apple.com`; Apple websites, account
  pages, and store traffic remain controlled by the consuming profile.
- The published `.list` files remain the shared source used directly by Surge,
  Mihomo/OpenClash, and Stash consumers. No generated platform-specific mirror
  is required. Each consumer keeps its own provider syntax and policy names.
- Load `TikTok.list` before `bytedance.list`. Load service-specific Apple media
  lists before the broad `Apple.list` whenever they use different policies.
- Do not add new published configuration artifacts to the repository root.
- Do not reintroduce a legacy mirror; downstream consumers should migrate to paths listed in `neorulset26/RULESET_URLS.md`.
