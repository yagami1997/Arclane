# Repository Tools

Version created: April 1, 2026 09:30 PM PDT
Last updated: April 8, 2026 09:29 PM PDT

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

### DoH Fallback Worker

Version: 4.0.0 · Created: April 1, 2026 09:30 PM PDT · **Updated: April 8, 2026 09:29 PM PDT**

Path:

- [`doh-fallback-worker/`](./doh-fallback-worker/)

English documentation:

- [`doh-fallback-worker/README.md`](./doh-fallback-worker/README.md)

A token-aware private DoH gateway built on Cloudflare Workers. The public path `/dns-query` provides high-performance multi-upstream DoH for any client. The private path `/dns-query/<token>` loads a per-token profile and private rule set from KV, enabling local DNS answer synthesis for configured domains without hitting any upstream.

Upgraded in v4 from a generic reverse proxy to a full policy-driven gateway with private rule matching, local response synthesis, normalized cache keys, remaining-TTL semantics, and stale-if-error support.

### edge204 — CF Edge 204 Probe

Version: 1.0.0 · Created: April 6, 2026 11:10 PM PDT

Path:

- [`edge204/`](./edge204/)

English documentation:

- [`edge204/README.md`](./edge204/README.md)

This tool provides a Cloudflare Worker that returns pure HTTP 204 responses from the CF edge for use as a Surge proxy-node latency probe. It measures the RTT from proxy node egress to the nearest CF PoP with no TLS overhead and no upstream fetch.

## Maintenance Expectations

- Keep each tool self-contained.
- Give each tool its own README.
- Prefer small, auditable, purpose-specific modules.
- Add repository-level tools here only when they have ongoing maintenance value.
