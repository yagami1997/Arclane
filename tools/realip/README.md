# Real IP Module Builder

This maintenance tool renders the canonical categorized host catalog into the
macOS and iOS/iPadOS Surge modules.

## Inputs and Outputs

- Canonical input: `neorulset26/modules/realip.list`
- macOS output: `neorulset26/modules/realip.sgmodule`
- iOS/iPadOS output: `neorulset26/modules/realip-ios.sgmodule`

The catalog is not a Surge rule set and must not be loaded with `RULE-SET`.
Only the generated `always-real-ip` field is managed by this tool. Platform-
specific routing rules remain readable and reviewable in each module.

## Usage

From the repository root:

```sh
python3 tools/realip/build.py
python3 tools/realip/build.py --check
```

The builder rejects duplicates, malformed host tokens, and dangerously broad
top-level wildcard entries. It also synchronizes module release metadata and
validates the platform identifier, allowed section set, `DIRECT`-only routing
boundary, and absence of process rules from the iOS/iPadOS artifact. A
successful `--check` confirms that both modules contain the same generated host
list and comply with those boundaries.

Run the unit tests with:

```sh
python3 tools/realip/test_build.py
```

## Maintenance Policy

Add a host only when a Fake IP compatibility failure has been observed or when
the host belongs to a documented network-detection, captive-portal, local-
callback, real-time communication, or identity-authentication workflow.

Prefer exact hostnames. Wildcards require evidence that the service uses a
dynamic hostname or a product-qualified CNAME pattern. Do not add a broad
provider or brand suffix merely because one page or application failed.

Connectivity-detection entries must not double as broad web-routing hints. In
particular, Apple connectivity handling keeps `captive.apple.com` but leaves
ordinary Apple websites, account pages, and store traffic on the consuming
profile's normal Fake IP and outbound-policy path.
