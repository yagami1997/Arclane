# Repository Tools

Version created: April 1, 2026 09:30 PM PDT
Last updated: September 4, 2026 PDT (America/Los_Angeles)

Repository validation: run `python3 tools/check.py` from the repository root
with Python 3.13 and Node.js 24 (the CI baseline). No third-party packages are
needed. This checks rule structure/CIDRs, reports cross-file overlaps without
deleting them, checks relative document targets and generated Real IP modules,
and runs offline tests. Remote links, heading anchors, effective routing and
live services require separate verification.

Language:

- English
- [日本語](./README.ja.md)

## Overview

The `tools/` directory is the repository-wide support layer for operational utilities and maintenance-focused tooling.

It exists alongside the ruleset mainline and the compatibility publication surface, but it serves a different purpose. This directory is for support components that help operate, maintain, validate, deploy, or recover the broader project.

## Scope

`tools/` is intended for repository-level support utilities such as:

- emergency network utilities
- deployment helpers
- validation or auditing tools
- generators and maintenance scripts
- migration helpers
- operational support components that do not belong inside the ruleset mainline

## What Belongs Here

Use `tools/` for components that meet one or more of these conditions:

- they support the operation of the repository rather than defining the ruleset itself
- they are reusable repository utilities rather than one-off experiments
- they provide fallback, recovery, validation, or deployment value
- they are easier to maintain as independent tool modules

## What Does Not Belong Here

The following should generally not go into `tools/`:

- mainline ruleset files that belong in `neorulset26/`
- legacy published rule paths that must remain at the repository root or under `ruleset/`
- unrelated experiments with no clear operational value
- ad hoc scratch files that are not meant to be maintained

## Current Tools

### Real IP Module Builder

Path:

- [`realip/`](./realip/)

Documentation:

- [`realip/README.md`](./realip/README.md)

This dependency-free Python utility validates the categorized Real IP host
catalog and renders an identical generated `always-real-ip` value into the
macOS and iOS/iPadOS Surge modules. It rejects duplicates, malformed tokens,
dangerously broad top-level wildcards, unexpected module sections, non-direct
module routing, and macOS-only process rules in the iOS/iPadOS artifact.

The same directory includes [`check-openclaw.mjs`](./realip/check-openclaw.mjs),
an opt-in Node.js diagnostic using the installed OpenClaw SSRF runtime. It
checks three public DNS names, two unauthenticated catalog GETs, and nine
offline rejection controls. It does not configure Surge or OpenClaw and is
not required for normal module operation. See the
[compatibility guide](../docs/guides/openclaw-fake-ip-compatibility.md).

### DoH Fallback Worker

Version: 4.0.0 · Created: April 1, 2026 09:30 PM PDT · **Updated: September 4, 2026 PDT**

Path:

- [`doh-fallback-worker/`](./doh-fallback-worker/)

English documentation:

- [`doh-fallback-worker/README.md`](./doh-fallback-worker/README.md)

A self-hosted DoH gateway reference implementation for Cloudflare Workers. The public path `/dns-query` is disabled by default and, when explicitly enabled, uses a conservative single-upstream profile. Bearer authentication or the compatibility path `/dns-query/<token>` loads an isolated KV profile and private rule set.

The current v4 implementation includes validated hedged requests for private
profiles, transaction-ID and remaining-TTL cache correctness, RFC 2308 negative
caching, isolate-local singleflight, hot-only prefetch, bounded requests, local
response synthesis, and stale-if-error behavior. Documentation intentionally
uses placeholders and does not publish maintainer-operated resolver domains or
private deployment identifiers.

### edge204 — CF Edge 204 Probe

Version: 1.1.0 · Created: April 6, 2026 11:10 PM PDT · Updated: July 26, 2026 PDT

Path:

- [`edge204/`](./edge204/)

English documentation:

- [`edge204/README.md`](./edge204/README.md)

This tool provides a Cloudflare Worker that returns pure HTTP 204 responses from the CF edge for use as a proxy-node latency probe in Surge and Clash/mihomo. It measures the RTT from proxy node egress to the nearest CF PoP, with no upstream fetch. Because it measures the path to Cloudflare rather than to your actual destinations, the tool README documents the method's blind spots — read them before using the numbers to rank nodes.

## Maintenance Expectations

- Keep each tool self-contained.
- Give each tool its own README.
- Prefer small, auditable, purpose-specific modules.
- Add repository-level tools here only when they have ongoing maintenance value.
