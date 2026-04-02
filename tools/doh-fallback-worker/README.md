# DoH Fallback Worker

Version created: April 1, 2026 09:30 PM PDT

Language:

- English
- [日本語](./README.ja.md)

## Overview

This directory contains a Cloudflare Worker that acts as a fallback DNS-over-HTTPS reverse proxy.

The intended use case is simple: when a user's primary DoH endpoint is unavailable, blocked, unstable, or temporarily degraded, this Worker can be used as an emergency backup endpoint.

This is not positioned as a primary recursive resolver. It is a thin proxy layer in front of public DoH upstreams, designed for operational resilience and fast recovery.

## What This Worker Does

The implementation in [`worker.js`](./worker.js) accepts DoH requests on `/dns-query` and forwards them to multiple upstream resolvers:

- Cloudflare DoH
- Google Public DNS DoH
- Quad9 DoH

It supports both standard DoH request styles:

- `GET /dns-query?dns=...`
- `POST /dns-query` with `application/dns-message`

## Core Design

This Worker is built around a few concrete ideas:

1. Multi-upstream racing
   The Worker sends the query to multiple upstream DoH providers in parallel and returns the first successful response. Once one upstream wins, the remaining in-flight requests are aborted.

2. TTL-driven caching
   Cache duration is not hardcoded blindly. The Worker parses the DNS response and extracts the minimum effective TTL from the answer set, then uses that value for `Cache-Control`.

3. Background refresh
   When a cached response is close to expiry, the Worker serves the cached result immediately and refreshes it in the background using `ctx.waitUntil(...)`.

4. ECS-aware cache separation
   If a query contains ECS (EDNS Client Subnet), the Worker isolates that request into a separate cache key so ECS and non-ECS requests do not contaminate each other.

5. SHA-256 cache keys for POST
   For POST-based DoH requests, the binary DNS payload is hashed with SHA-256 and used as the cache key path. This avoids exposing raw query payloads in URLs and keeps cache keys stable.

## Request Flow

The request lifecycle is:

1. The client sends a DoH request to `/dns-query`.
2. The Worker validates the method and request shape.
3. The Worker builds a cache key.
4. If a cached response exists, it is returned immediately.
5. If the cached response is close to expiry, a background refresh is triggered.
6. If there is no cache hit, the Worker races the configured upstream resolvers.
7. The first successful upstream response is returned to the client.
8. The response is cached asynchronously using the extracted TTL.

## Caching Behavior

Current cache-related constants in [`worker.js`](./worker.js):

- Minimum TTL floor: `60` seconds
- Maximum TTL ceiling: `86400` seconds
- Default fallback TTL: `300` seconds
- Background refresh threshold: last `25%` of TTL lifetime

Operationally, this means:

- Very small upstream TTL values are normalized upward to avoid excessive churn.
- Very large TTL values are capped to prevent over-long cache residency.
- Malformed or non-parseable responses fall back to a safe default TTL.

## Supported Response Headers

User-facing responses include:

- `content-type: application/dns-message`
- `cache-control: public, max-age=...`
- `x-cache: HIT` or `MISS`
- CORS headers for browser compatibility
- basic security headers such as `x-content-type-options` and `x-frame-options`

## Limitations

This Worker is intentionally narrow in scope.

- It only serves `/dns-query`.
- It does not implement rate limiting.
- It does not perform authentication.
- It does not expose metrics or logging dashboards by default.
- It relies on public upstream DoH providers, so upstream policy changes or outages can still affect fallback availability.

If you deploy this publicly, treat it as an emergency utility endpoint, not a general-purpose shared public resolver.

## Files

- [`worker.js`](./worker.js): Cloudflare Worker implementation
- [`README.ja.md`](./README.ja.md): Japanese version of this document

## Deployment

You can deploy this Worker with either the Cloudflare dashboard or Wrangler CLI.

### Option A: Deploy in the Cloudflare Dashboard

1. Sign in to the Cloudflare dashboard.
2. Open `Workers & Pages`.
3. Create a new Worker.
4. Replace the default script with the contents of [`worker.js`](./worker.js).
5. Save and deploy.

After deployment, Cloudflare will assign a default hostname similar to:

```text
https://doh-fallback-proxy.example-account.workers.dev/dns-query
```

You can use that URL directly as a fallback DoH endpoint.

### Option B: Deploy with Wrangler

1. Install Wrangler:

```bash
npm install -g wrangler
```

2. Log in to Cloudflare:

```bash
wrangler login
```

3. Inside this directory, create a minimal `wrangler.toml` if needed:

```toml
name = "doh-fallback-worker"
main = "worker.js"
compatibility_date = "2026-04-02"
workers_dev = true
```

4. Publish:

```bash
wrangler deploy
```

Wrangler will return a `workers.dev` URL for the deployed Worker.

## Custom Domain Setup

If you want to avoid using the default `workers.dev` hostname, bind the Worker to a custom domain you control in Cloudflare.

Example domain:

```text
doh-backup.example-signal.net
```

Example final endpoint:

```text
https://doh-backup.example-signal.net/dns-query
```

Typical flow:

1. Add your domain to Cloudflare.
2. Go to `Workers & Pages`.
3. Open the deployed Worker.
4. Choose the custom domain or route binding option.
5. Bind a hostname such as `doh-backup.example-signal.net`.
6. Confirm that HTTPS is active and the route resolves correctly.

Do not use a naked hostname without the `/dns-query` path when configuring DoH clients. The Worker only answers on `/dns-query`.

## How To Use It In a Client

Use the full HTTPS endpoint, including the path:

```text
https://doh-backup.example-signal.net/dns-query
```

Or if you stay on the default Workers hostname:

```text
https://doh-fallback-proxy.example-account.workers.dev/dns-query
```

The exact client-side configuration depends on the software, but the value you generally need is the full DoH URL above.

## Validation

After deployment, test the endpoint before relying on it.

Basic checks:

1. Open the URL in a browser and confirm the Worker responds instead of returning a platform error.
2. Send an actual DoH request from a compatible client.
3. Confirm repeated identical queries start returning `x-cache: HIT`.
4. Confirm the endpoint still works if one upstream is temporarily slower or unavailable.

## Operational Guidance

- Treat this Worker as a fallback service.
- Keep the script small and easy to audit.
- Re-deploy after any upstream list changes.
- If you later add access control or rate limiting, document those changes clearly because they affect client compatibility.
