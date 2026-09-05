# OpenClaw Fake IP Compatibility

Public maintenance guide for the [Real IP modules](../../neorulset26/modules/README.md).
Keep this guide in version control; private diagnostics and backups belong
outside the repository.

Audit date: September 4, 2026 (PDT). Runtime inspected: OpenClaw 2026.9.1.
Recheck after upgrades: policies differ by request entry point.

## Request Paths and Decisions

| Request path | Observed implementation | Module decision |
|---|---|---|
| Hosted model catalog | Strict DNS validation for `catalog.openclaw.ai`; synthetic answers rejected | Exact DNS exception |
| Official plugin catalog | Strict guarded fetch to `clawhub.ai/v1/feeds/plugins`; hostname restriction does not permit special-use IPs | Exact `clawhub.ai` DNS exception |
| Codex OAuth token exchange | This runtime permits benchmark/ULA answers only for `auth.openai.com` | Retain the previously verified exact exception for compatibility; no token exchanges in smoke tests |
| Model-provider transport | Same-origin base-URL requests can receive a scoped Fake IP policy; environment proxy paths also exist | No speculative provider/CDN suffix additions |
| Trusted web-tool endpoints | Scoped Fake IP policies and trusted environment-proxy support exist | Assess the actual provider path before adding a host |
| Arbitrary web pages and redirects | Strict local DNS pinning unless an explicit trusted-proxy mode is selected | Cannot be solved by a finite global host catalog |
| Remote images, files, and plugin archives | Guarded fetch with caller-specific policy and variable destinations | Add an exact stable host only after reproducing the relevant path |
| Managed browser | Separate SSRF policy and browser proxy configuration | Do not assume Gateway proxy settings cover browser navigation |

`always-real-ip` asks Surge to return upstream DNS answers. It does not select
DIRECT, guarantee a public answer, or bypass OpenClaw's SSRF checks. Existing
outbound routing still applies. The two catalog entries are exact hosts; this
change introduces no `*.openclaw.ai`, `*.clawhub.ai`, shared CDN suffix, or
OpenClaw routing rule. DNS exceptions apply to every client using this Surge
resolver, not just the OpenClaw process.

## Evidence and Repeatable Verification

Both catalog hosts reproduced a strict SSRF failure with `198.18.0.0/15`
answers before their respective exceptions. A plain HTTPS request could
succeed through Surge while the strict application request failed.

1. Back up the canonical list, both generated modules, and installed module.
2. Run `python3 tools/realip/build.py --check` and the builder unit tests.
3. Validate a temporary complete profile with native `surge-cli --check`.
   Preserve its existing sections and append only the new DNS hosts. A module
   by itself is not a full profile.
4. Load the updated module. Inspect the effective `always-real-ip` field and
   duplicates. Refresh stale system DNS caches if needed.
5. Run `dscacheutil -q host -a name catalog.openclaw.ai` and the equivalent
   query for `clawhub.ai`. Inspect all returned A/AAAA addresses.
6. Run the [compatibility probe](../../tools/realip/check-openclaw.mjs) with
   the installed OpenClaw package root. It performs strict public-catalog GETs
   and offline rejection controls without reading credentials or user config.
7. Use `surge-cli rule explain <url>` and `surge-cli http probe <url>` without
   a policy override to compare routing with the pre-change baseline.
8. Run `openclaw models refresh --json` for actual model-catalog validation
   and persistence. An `updated` result requires the next Gateway restart to
   apply the new catalog in that process. Arrange it around active work.
   Plugin-feed GET success does not prove plugin install/signature checks.

If real DNS or guarded HTTPS still fails, record the failure and stop
expanding domains. Keep backups outside the public repository: effective
profiles can contain private infrastructure and credentials.

### Local macOS Validation Result

- Both generated lists contain 176 unique tokens; all route sections are
  unchanged. The effective profile gained only the exact catalog DNS tokens.
- Three endpoint DNS checks and both strict catalog GETs passed (HTTP 200).
- Nine offline special-use/private address controls were rejected, including
  both halves of the benchmark range, loopback, metadata, multicast and ULA;
  the public-address control was accepted.
- The model catalog initially returned `updated`, then `unchanged` on a
  follow-up refresh, with 42 providers and 274 models.
- The original outbound policy was retained. No Gateway restart, OAuth token
  exchange, plugin installation, or private-network opt-in was performed.
- Native complete-profile syntax validation and seven builder tests passed.
  The iOS artifact has generated-list parity and structural validation; it has
  not been exercised on an iOS device in this audit.

These are bounded checks of the inspected runtime and endpoints, not a proof
that every OpenClaw request or every SSRF attack variant has been tested.

## Arbitrary URLs and Trusted Proxies

OpenClaw documents `tools.web.fetch.useTrustedEnvProxy` and a managed outbound
`proxy.proxyUrl`. These can move destination resolution to a forward proxy,
avoiding local Fake IP rejection. The proxy then becomes responsible for
checking resolved destination IPs at connection time. Hostname checks alone
do not prevent a public hostname resolving to an internal service.

A normal Surge routing profile has not thereby been proven to provide that
security boundary. Enabling a trusted-proxy mode requires separately verifying
private, loopback, link-local, metadata, multicast and reserved-IP rejection for
both HTTP and HTTPS CONNECT, plus redirect handling. No such mode or global
benchmark-range allowance is enabled by this module.

For arbitrary destinations, a separately validated filtering forward proxy is
a potential architectural solution. It changes the deployment and security
boundary and is outside this DNS-only patch. Until then, keep strict SSRF
checks and use exact observed exceptions for stable destinations. This module
does not fix every possible OpenClaw network request.

## Sources

- [Surge module append semantics](https://manual.nssurge.com/profile/module.html)
- [Surge advanced DNS](https://manual.nssurge.com/dns/advanced.html)
- [OpenClaw hosted model catalogs](https://docs.openclaw.ai/concepts/models)
- [OpenClaw web fetch](https://docs.openclaw.ai/tools/web-fetch)
- [OpenClaw network proxy](https://docs.openclaw.ai/security/network-proxy)
- [OpenClaw browser](https://docs.openclaw.ai/tools/browser)

Installed-code evidence: `remote-refresh-*.js`,
`official-external-plugin-catalog-*.js`, `openai-chatgpt-oauth-token.runtime-*.js`,
`provider-transport-fetch-*.js`, `web-guarded-fetch-*.js`, `input-files-*.js`,
`fetch-guard-*.js`, and `ssrf-*.js` under the installed package's `dist/`.
Bundle hash suffixes are version-specific; the probe uses the named SSRF SDK
exports and fails explicitly if that interface is unavailable.
