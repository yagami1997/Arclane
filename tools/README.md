# Repository Tools

Version created: April 1, 2026 09:30 PM PDT

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

Path:

- [`doh-fallback-worker/`](./doh-fallback-worker/)

English documentation:

- [`doh-fallback-worker/README.md`](./doh-fallback-worker/README.md)

This tool provides a Cloudflare Worker based fallback DNS-over-HTTPS reverse proxy for emergency use when a primary DoH endpoint is unavailable.

## Maintenance Expectations

- Keep each tool self-contained.
- Give each tool its own README.
- Prefer small, auditable, purpose-specific modules.
- Add repository-level tools here only when they have ongoing maintenance value.
