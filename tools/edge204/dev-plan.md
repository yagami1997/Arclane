# edge204 Development Notes

Version updated: July 26, 2026

## Goal

`edge204` is a very small Cloudflare Worker used as a Surge latency probe.

The point is simple:

- return HTTP responses directly from the Cloudflare edge
- avoid upstream `fetch()` calls
- avoid HTTPS redirect interference
- give Surge a stable `204` endpoint for `url-test` and `fallback`

This project does not need a large task-by-task implementation plan. The whole Worker is a single file and the behavior is intentionally minimal.

## Files

| File | Purpose |
|---|---|
| `worker.js` | Worker implementation |
| `worker.test.mjs` | Test suite (`node --test worker.test.mjs`) |
| `wrangler.toml.example` | Deployment template; the real `wrangler.toml` is gitignored |
| `README.md` | Deployment, verification, and Surge / Clash usage |
| `README.ja.md` | Japanese version of the README |

This layout mirrors `tools/doh-fallback-worker/`, which established the convention for Workers in this repository: a tracked `.example` template, a gitignored real config, and a checked-in test file.

## Implemented Behavior

[`worker.js`](./worker.js) handles only four useful routes plus the default fallback:

| Path | Method | Result |
|---|---|---|
| `/generate_204` | GET / HEAD | `204 No Content` |
| `/204` | GET / HEAD | `204 No Content` |
| `/ping` | GET / HEAD | `200` JSON with `ok`, `version`, `ts` |
| `/trace` | GET / HEAD | `200` text with Cloudflare request metadata |
| any other path | GET / HEAD | `404 Not Found` |
| any path | non-GET/HEAD | `405 Method Not Allowed` |

Trailing slashes are stripped before routing.

Shared response header:

- `Cache-Control: no-store`

`no-store` alone is sufficient. `Pragma` is an HTTP/1.0 request header with no defined meaning in a response, and CORS headers serve no purpose for Surge or Clash, so both were dropped. The header is still mandatory rather than decorative: RFC 9110 lists `204` as heuristically cacheable.

### `/trace` client IP gating

`/trace` is publicly reachable, and its `ip` field is the only part that widens the privacy surface. Rather than removing the field — the troubleshooting flow in the README depends on it — it is gated behind an optional `TRACE_KEY` environment variable:

- `TRACE_KEY` unset: all fields except `ip`
- set, `?k=` missing or wrong: all fields except `ip`, no error
- set, `?k=` correct: `ip` included

A wrong key degrades silently instead of returning `401` or `404`, so the response is not an oracle for whether a key exists.

This is not a security boundary. The channel is plaintext HTTP; the key exists to keep opportunistic scanners from burning request quota and harvesting the operator's egress IP. Constant-time comparison would be theatre — public-network jitter dwarfs any timing side channel — and is deliberately not used.

## Implementation Rules

The Worker should stay simple. These are the only real constraints:

- no upstream `fetch()`
- no KV, D1, R2, Durable Objects, or other stateful bindings
- no auth logic on the probe paths
- no redirect behavior
- no state

A plain-text environment variable such as `TRACE_KEY` is not a binding in the sense this rule prohibits. It is a static string resolved when the isolate starts: no I/O, no latency, no per-request cost. The rule exists to keep the hot path free of network and storage round trips, and an env var does not add one.

`/generate_204` and `/204` are the hot path. Nothing may be added to them beyond the method check, the path match, and the response.

If a future change makes the Worker materially more complex than this, it should be justified by an actual probe requirement, not by general platform feature creep.

## Implementation Outline

The implementation is straightforward:

1. Define one shared no-cache header object.
2. Reject methods other than `GET` and `HEAD` with `405`.
3. Normalize the trailing slash, then route by pathname.
4. Return static edge-generated responses for probe endpoints.
5. Use `request.cf` only in `/trace`, with `"unknown"` fallbacks for local dev.
6. Append `ip` to `/trace` only when `env.TRACE_KEY` is set and `?k=` matches.

That is the entire design.

## Local Verification

Before deployment, the only checks that matter are:

Run with `TRACE_KEY` set locally, e.g. `wrangler dev --var TRACE_KEY:devkey`.

```bash
# main probe
curl -si http://localhost:8787/generate_204 | head -3

# alias
curl -si http://localhost:8787/204 | head -3

# trailing slash
curl -so /dev/null -w '%{http_code}\n' http://localhost:8787/generate_204/

# version reporting
curl -s http://localhost:8787/ping

# local trace is expected to show unknown fields in dev
curl -s http://localhost:8787/trace
curl -s 'http://localhost:8787/trace?k=wrong'
curl -s 'http://localhost:8787/trace?k=devkey'

# method guard
curl -si -X POST http://localhost:8787/generate_204 | head -1
```

Expected results:

- `/generate_204`, `/204`, and `/generate_204/` all return `204`
- `/ping` returns JSON carrying the `version` constant from `worker.js`
- `/trace` works locally even if `request.cf` is empty
- `/trace` omits `ip` with no key and with a wrong key, and includes it with the right key
- `POST` returns `405`

Caching cannot be verified locally. On the deployed Worker, check that `cf-ray` changes on every request and that no `Age` header is present. Do not compare `/ping` timestamps for this — the Workers clock does not advance without I/O, so identical values prove nothing.

## Deployment Notes

Deploy with `cp wrangler.toml.example wrangler.toml && wrangler deploy`, then bind `probe.example.com` as a Custom Domain in Cloudflare.

The dashboard copy-paste path still works and is documented as an alternative, but it pins an invisible `compatibility_date` at creation time, which means the deployed artifact is not fully described by anything in this repository. The CLI path exists to close that gap, not to add tooling for its own sake.

No `routes` entry is declared in the template. The Custom Domain is bound once in the dashboard and survives every subsequent deploy, so deploying cannot touch DNS.

Zone requirements:

- `Always Use HTTPS` must be off
- `Opportunistic Encryption` must be off
- HSTS must not force upgrade

Otherwise the HTTP probe can be upgraded before it reaches the Worker, which ruins the measurement goal.

Rate limiting should be done at the zone WAF layer, not in Worker code. Size the threshold against the peak produced by a manual "test all" sweep in a GUI client, not against the steady-state `interval`.

`TRACE_KEY` is optional and set per deployment. No value belongs in this repository — not even an example one, since defaults get copied unchanged.

## Production Verification

After the custom domain is active:

```bash
curl -si http://probe.example.com/generate_204 | head -3
curl -sI http://probe.example.com/generate_204 | grep -iE 'cf-ray|^age:'
curl -sI http://probe.example.com/generate_204 | grep -iE 'cf-ray|^age:'
curl -s http://probe.example.com/ping
curl -s http://probe.example.com/trace
curl -s 'http://probe.example.com/trace?k=<TRACE_KEY>'
curl -si http://probe.example.com/generate_204 | grep -i location
```

Expected results:

- no `301` or `302`
- `/generate_204` returns `204`
- `cf-ray` differs across requests and no `Age` header is present
- `/ping` reports the version currently deployed
- `/trace` shows real Cloudflare metadata in production, with `ip` only on the keyed request
- no `Location` header on the probe endpoint

## Scope Boundary

This document is intentionally short because the project is small.

If you need deployment steps or Surge examples, use [`README.md`](./README.md).
If you need to inspect behavior, read [`worker.js`](./worker.js).
