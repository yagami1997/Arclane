# Usage and Safety Notice

*Last updated: August 29, 2026 (PDT)*

This notice applies to the routing rules, Surge-compatible modules, reference
profiles, and operational helper code published by Arclane. It supplements the
[legal boundary statement](../legal/LEGAL.md) and the MIT License.

## Before Use

- Review the exact artifact instead of importing an unfamiliar raw URL blindly.
- Back up the working profile and keep a tested way to disable or remove the
  artifact.
- Use only the Real IP module variant intended for the target platform. Do not
  install both platform variants on the same device, and do not enable a new
  Real IP module together with a legacy `feishu-fix` module.
- Check the artifact against the complete local profile. A standalone syntax
  check does not prove DNS quality, routing correctness, service availability,
  or application compatibility.
- Re-review upstream changes before accepting a later version. Stable URLs are
  publication paths, not a promise that content will never change.

## Routing and DNS Effects

Configuration artifacts can change DNS answers, route selection, direct versus
proxy egress, and which existing profile rule handles a request. Those effects
depend on the user's complete profile, DNS servers, network, platform version,
and third-party infrastructure.

For the Real IP compatibility modules:

- `always-real-ip` prevents listed hosts from receiving Fake IP answers; it
  does not by itself choose the final route. Real DNS answers may increase
  lookup latency or expose local resolver differences that Fake IP would have
  deferred to the selected outbound policy.
- The categorized catalog includes network detection, captive portals, public
  Wi-Fi, real-time communication, authentication, established application
  compatibility, and verified product-specific dependencies. Inclusion does
  not indicate affiliation with or endorsement by the named service.
- Routing rules separately send confirmed Feishu/Lark product domains and
  narrowly qualified CNAME dependencies to `DIRECT`.
- The macOS variant uses process-scoped rules only for observed shared
  ByteDance infrastructure. External resources embedded in Feishu/Lark remain
  subject to the main profile's normal rules.
- The iOS/iPadOS variant contains no macOS process paths or process rules.
- Neither variant defines a `FINAL` rule or a proxy policy group.

The exact `auth.openai.com` entry changes only the DNS answer. The consuming
profile remains responsible for its outbound route and security policy.

These modules are compatibility workarounds, not guarantees that every captive
portal, public Wi-Fi network, Feishu, Lark, Doubao, OAuth, CDN, authentication,
or embedded third-party page will remain available or fast.

## Security and Privacy Boundary

- The repository does not provide anonymity, traffic confidentiality, endpoint
  security, malware protection, censorship-circumvention assurance, or account
  protection.
- `DIRECT` means the selected connection does not use a proxy policy for that
  rule. Whether that is appropriate depends on the user's network and threat
  model.
- DNS behavior remains dependent on the complete profile and configured
  resolver path. Review resolver privacy, integrity, jurisdiction, and logging
  independently.
- Surge request logs and diagnostic exports may contain visited domains,
  organization subdomains, document identifiers, IP addresses, or other
  sensitive metadata. Redact them before sharing publicly.
- Never include credentials, access tokens, cookies, private profile contents,
  private relay addresses, or account identifiers in an issue report.

## Failure and Rollback

If a page becomes slower, blank, unreachable, or routes incorrectly after an
update:

1. disable only the newly changed module or ruleset;
2. restore the known-good profile if necessary;
3. distinguish syntax validity from live connectivity;
4. capture a small, redacted request-log sample while reproducing the problem;
5. identify whether the failure is DNS/Fake IP, route selection, stale
   connection reuse, ISP/CDN quality, or the third-party service itself.

Do not solve an isolated failure by adding broad provider suffixes globally
without product-specific evidence. Shared CDN and ByteDance infrastructure can
serve unrelated applications, so an overbroad exception may silently change
their routing behavior.

## Third-Party Status

Arclane is an independent research project. It is not affiliated with,
endorsed by, sponsored by, or a support channel for Nssurge Inc., ByteDance,
Feishu, Lark, Doubao, Cloudflare, Google, Apple, or any other referenced service
or trademark holder. Product and service names are used only to describe
compatibility and routing categories.
