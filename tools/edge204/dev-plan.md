# edge204 Development Notes

Version updated: April 7, 2026

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
| `README.md` | Deployment, verification, and Surge usage |
| `README.ja.md` | Japanese version of the README |

## Implemented Behavior

[`worker.js`](./worker.js) handles only four useful routes plus the default fallback:

| Path | Method | Result |
|---|---|---|
| `/generate_204` | GET / HEAD | `204 No Content` |
| `/204` | GET / HEAD | `204 No Content` |
| `/ping` | GET | `200` JSON with `ok` and `ts` |
| `/trace` | GET | `200` text with Cloudflare request metadata |
| any other path | GET / HEAD | `404 Not Found` |
| any path | non-GET/HEAD | `405 Method Not Allowed` |

Shared response headers:

- `Cache-Control: no-store, no-cache, must-revalidate`
- `Pragma: no-cache`
- `Access-Control-Allow-Origin: *`

## Implementation Rules

The Worker should stay simple. These are the only real constraints:

- no upstream `fetch()`
- no KV, D1, R2, Durable Objects, or other bindings
- no auth logic inside the Worker
- no redirect behavior
- no state

If a future change makes the Worker materially more complex than this, it should be justified by an actual probe requirement, not by general platform feature creep.

## Implementation Outline

The implementation is straightforward:

1. Define one shared no-cache header object.
2. Reject methods other than `GET` and `HEAD` with `405`.
3. Route by pathname.
4. Return static edge-generated responses for probe endpoints.
5. Use `request.cf` only in `/trace`, with `"unknown"` fallbacks for local dev.

That is the entire design.

## Local Verification

Before deployment, the only checks that matter are:

```bash
# main probe
curl -si http://localhost:8787/generate_204 | head -3

# alias
curl -si http://localhost:8787/204 | head -3

# no-cache proof
curl -s http://localhost:8787/ping
curl -s http://localhost:8787/ping

# local trace is expected to show unknown fields in dev
curl -s http://localhost:8787/trace

# method guard
curl -si -X POST http://localhost:8787/generate_204 | head -1
```

Expected results:

- `/generate_204` and `/204` return `204`
- `/ping` returns JSON and `ts` changes across requests
- `/trace` works locally even if `request.cf` is empty
- `POST` returns `405`

## Deployment Notes

Deploy the Worker, then bind `probe.example.com` as a Custom Domain in Cloudflare.

Zone requirements:

- `Always Use HTTPS` must be off
- `Opportunistic Encryption` must be off
- HSTS must not force upgrade

Otherwise the HTTP probe can be upgraded before it reaches the Worker, which ruins the measurement goal.

Rate limiting should be done at the zone WAF layer, not in Worker code.

## Production Verification

After the custom domain is active:

```bash
curl -si http://probe.example.com/generate_204 | head -3
curl -s http://probe.example.com/ping
curl -s http://probe.example.com/ping
curl -s http://probe.example.com/trace
curl -si http://probe.example.com/generate_204 | grep -i location
```

Expected results:

- no `301` or `302`
- `/generate_204` returns `204`
- `/ping` timestamps differ
- `/trace` shows real Cloudflare metadata in production
- no `Location` header on the probe endpoint

## Scope Boundary

This document is intentionally short because the project is small.

If you need deployment steps or Surge examples, use [`README.md`](./README.md).
If you need to inspect behavior, read [`worker.js`](./worker.js).
