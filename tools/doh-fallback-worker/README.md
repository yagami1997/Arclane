# doh-fallback-worker

A self-hosted DoH gateway reference implementation for Cloudflare Workers.

- **Public path** `/dns-query` — disabled by default; explicitly opt in only when you intend to run a public resolver
- **Private access** `Authorization: Bearer <token>` — preferred because the token is not placed in the URL
- **Private compatibility path** `/dns-query/<token>` — for DoH clients that cannot set custom headers

Language: English / [日本語](./README.ja.md)

This repository publishes source code and generic deployment examples only. It
does not publish or endorse any maintainer-operated resolver hostname.

## Features

| # | Feature |
|---|---------|
| 1 | Token-aware routing — each token maps to an isolated resolution profile stored in KV |
| 2 | Private rule matching — exact and suffix domain rules answered locally, no upstream needed |
| 3 | Local DNS response synthesis — binary-correct DNS answers built inside the Worker |
| 4 | Normalized cache keys — semantic keys eliminate fragmentation from changing transaction IDs |
| 5 | Validated hedged upstreams — malformed/error DNS responses are rejected; backups start only when needed |
| 6 | Remaining-TTL cache — transaction IDs are restored and DNS RR TTLs are decremented on cache hits |
| 7 | Hot-only prefetch — after 85% age, TTL ≥ 60s, and at least two recent hits |
| 8 | Safe cache isolation — ECS/unknown EDNS bypass cache; DO/RD/AD/CD and profile revision are keyed |
| 9 | Stale-if-error — stale responses use a short 15-second client TTL |
| 10 | Request bounds — DNS messages are limited to 4 KiB and malformed names/sections are rejected |
| 11 | Isolate-local singleflight — concurrent misses and prefetches share one upstream operation |
| 12 | Lightweight profile cache — valid private profiles are retained in-isolate for 120 seconds |

## Prerequisites

- [Node.js](https://nodejs.org) 18 or later
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier is sufficient)

Install Wrangler globally:

```bash
npm install -g wrangler
```

Log in to Cloudflare:

```bash
wrangler login
```

---

## Local Development

Run the Worker locally before deploying. Wrangler spins up a local server that
behaves like the Cloudflare edge, including KV bindings.

Run the wire-format unit tests:

```bash
node --test worker.test.mjs
```

### 1. Start the local server

```bash
cd tools/doh-fallback-worker
wrangler dev
```

The Worker starts at `http://localhost:8787` by default.

Public DoH is disabled by default. For this local public-path test only, start
Wrangler with `wrangler dev --var ALLOW_PUBLIC_DOH:true`.

### 2. Test the public path (no token)

```bash
# Query google.com A record via GET
curl -s "http://localhost:8787/dns-query?dns=AAABAAABAAAAAAAAA3d3dwZnb29nbGUDY29tAAABAAE=" | xxd | head
```

You should receive a binary DNS response. Check the response headers for
`x-cache: MISS` on the first request and `x-cache: HIT` on the second.

### 3. Add a local KV entry for testing

During `wrangler dev`, KV writes go to a local store that does not affect
production. Write a test profile and rule set:

```bash
# In a separate terminal while wrangler dev is running

# Write a profile for a test token
wrangler kv key put --binding DOH_KV \
  "profile:test-token-1234" \
  '{"name":"local-test","revision":1,"upstreams":["cf","google","quad9"],"hedgeDelays":[0,35,80],"cachePolicy":{"minTtl":0,"maxTtl":86400,"defaultTtl":300,"prefetchRatio":0.85,"staleIfErrorWindow":120}}' \
  --local

# Write rules for the same token
wrangler kv key put --binding DOH_KV \
  "rules:test-token-1234" \
  '{"privateRules":[{"match":"exact","domain":"test.internal","type":"A","answers":["127.0.0.1"],"ttl":60}]}' \
  --local
```

### 4. Test the private path

```bash
# Query test.internal — should return synthesized 127.0.0.1 without hitting any upstream
curl -sv "http://localhost:8787/dns-query/test-token-1234?dns=AAABAAABAAAAAAAABHRlc3QIaW50ZXJuYWwAAAEAAQ=="
```

### 5. Test error cases

```bash
# Unknown token — expect 403
curl -sv "http://localhost:8787/dns-query/invalid-token" 2>&1 | grep "< HTTP"

# Missing dns parameter — expect 400
curl -sv "http://localhost:8787/dns-query" 2>&1 | grep "< HTTP"
```

---

## Deployment

### Step 1 — Create a KV namespace

```bash
wrangler kv namespace create DOH_KV
```

The output includes the namespace ID:

```
✅ Created namespace "DOH_KV" with ID "abc123..."
```

Copy the local template and replace the placeholder in your local-only config:

```bash
cp wrangler.toml.example wrangler.toml
```

```toml
[[kv_namespaces]]
binding = "DOH_KV"
id      = "abc123..."
```

`wrangler.toml` is ignored by Git so your real Cloudflare resource IDs
stay out of the repository.

### Step 2 — Deploy

```bash
wrangler deploy
```

On success, Wrangler prints your Worker URL:

```
https://<your-worker-domain>
```

The public path remains disabled unless `ALLOW_PUBLIC_DOH=true` is configured.
For a personal deployment, leave it disabled.

### Step 3 — Generate a token

```bash
openssl rand -hex 32
# example output: 64 random hexadecimal characters (256 bits)
```

Keep this value private. It is the key that unlocks your private rule set.

### Step 4 — Write profile and rules to KV

**Write the profile:**

```bash
wrangler kv key put --binding DOH_KV \
  "profile:<token>" \
  '{"name":"personal","revision":1,"upstreams":["cf","google","quad9"],"hedgeDelays":[0,35,80],"cachePolicy":{"minTtl":0,"maxTtl":86400,"defaultTtl":300,"prefetchRatio":0.85,"staleIfErrorWindow":120}}'
```

**Prepare a `rules.json` file** (see format below), then push it:

```bash
wrangler kv key put --binding DOH_KV \
  "rules:<token>" \
  --path rules.json
```

### Step 5 — Verify

```bash
# Preferred private request
curl -sv -H "Authorization: Bearer <token>" \
  "https://<your-worker-domain>/dns-query?dns=..."

# Compatibility path for clients without custom-header support
curl -sv "https://<your-worker-domain>/dns-query/<token>?dns=..."
```

First request: `x-cache: MISS`. Second identical request: `x-cache: HIT`.

---

## Private Rule Management

Rules are stored in KV and take effect after the KV edge cache expires (up to
the configured 300-second `cacheTtl`). Private rules are evaluated before the
ordinary DNS cache.

### Rules format (`rules.json`)

```json
{
  "privateRules": [
    {
      "match": "suffix",
      "domain": "ads.example.com",
      "type": "A",
      "answers": ["0.0.0.0"],
      "ttl": 300
    },
    {
      "match": "exact",
      "domain": "nas.home",
      "type": "A",
      "answers": ["192.168.1.10"],
      "ttl": 60
    },
    {
      "match": "suffix",
      "domain": "internal.example.com",
      "type": "AAAA",
      "answers": ["::1"],
      "ttl": 60
    }
  ]
}
```

| Field | Values |
|-------|--------|
| `match` | `exact` — full name only / `suffix` — domain and all subdomains |
| `type` | `A`, `AAAA`, `CNAME` |
| `answers` | Array of IP addresses or CNAME target name |

To block a domain, set `answers` to `["0.0.0.0"]`.

### Update rules

```bash
# Push updated rules (takes effect within KV cacheTtl — default 300 s)
wrangler kv key put --binding DOH_KV "rules:<token>" --path rules.json

# Read current rules
wrangler kv key get --binding DOH_KV "rules:<token>"

# Delete a token entirely
wrangler kv key delete --binding DOH_KV "profile:<token>"
wrangler kv key delete --binding DOH_KV "rules:<token>"
```

### Profile format reference

```json
{
  "name": "personal",
  "revision": 1,
  "upstreams": ["cf", "google", "quad9"],
  "hedgeDelays": [0, 35, 80],
  "cachePolicy": {
    "minTtl": 0,
    "maxTtl": 86400,
    "defaultTtl": 300,
    "prefetchRatio": 0.85,
    "staleIfErrorWindow": 120
  }
}
```

Increment `revision` whenever upstream/profile semantics change and old cached
answers should no longer be reused.

Available upstream keys: `cf`, `google`, `quad9`

`minTtl` defaults to `0`, so a low authoritative TTL is not artificially raised.
NXDOMAIN and NODATA caching uses the Authority SOA per RFC 2308. Negative
responses without an Authority SOA are not cached, and CNAME chains ending in
NODATA use the SOA-derived negative TTL.

`hedgeDelays` contains absolute start delays corresponding to `upstreams`.
The defaults start Cloudflare immediately, Google at 35 ms, and Quad9 at 80 ms.
The public profile uses Cloudflare only. Private profiles retain the configured
ordered list.

Prefetch is best-effort and isolate-local. It requires a cache TTL of at least
60 seconds and two hits within five minutes, and shares the same singleflight
operation as foreground misses. Valid KV profiles are held in a bounded
120-second in-memory cache above KV's own edge cache; unknown tokens are never
stored in that memory cache.

### Token rotation and logging

Create a new random token/profile, update clients, then delete both KV keys for
the old token. The Worker itself does not log tokens. However, URL-path tokens
may still appear in Cloudflare request logs, browser history, screenshots, and
other intermediaries; use the Bearer header whenever the client supports it.

### Public endpoint and rate limiting

If you deliberately enable `ALLOW_PUBLIC_DOH=true`, configure Cloudflare Rate
Limiting/WAF rules at deployment level. Per-isolate in-memory counters are not a
reliable distributed rate limiter.

---

## Client Configuration

**Surge**

```ini
[Proxy]
# Requires ALLOW_PUBLIC_DOH=true:
DOH-Public  = https://<your-worker-domain>/dns-query
DOH-Private = https://<your-worker-domain>/dns-query/<token>
```

**Clash**

```yaml
dns:
  nameserver:
    - "https://<your-worker-domain>/dns-query/<token>"
```

---

## Security

- A well-formed request with an unknown token returns `403` — no fallback to
  the default profile
- Tokens and rules are stored in KV only, never in source code
- This repository contains no private tokens, keys, or rule lists
- Documentation and examples must use placeholders. Do not commit a real
  resolver hostname, Workers.dev account subdomain, custom route, token, KV
  namespace ID, or account identifier.

## Operational Boundaries

- Public access is an explicit deployment choice through
  `ALLOW_PUBLIC_DOH=true`; the source default remains fail-closed.
- The built-in public profile uses one upstream. Private profiles may use
  configurable hedged upstreams.
- Singleflight, hot-entry tracking, and the profile memory cache are
  best-effort and isolate-local, not globally coordinated.
- Abuse controls and distributed rate limiting belong at the Cloudflare
  deployment layer.
- KV updates are eventually visible at the edge according to the configured KV
  cache TTL.

## Behavior Reference

| Situation | Response |
|-----------|----------|
| Well-formed request with unknown token | 403 |
| Malformed DNS query | 400 |
| Private rule match | Synthesized answer (no upstream query) |
| HTTPS / SVCB query | Pass-through to upstreams |
| Fresh cache hit | 200, `x-cache: HIT`, remaining TTL |
| All upstreams fail + stale cache available | 200, `x-cache: STALE` |
| All upstreams fail + no cache | 502 |

## Files

| File | Description |
|------|-------------|
| `worker.js` | Cloudflare Worker implementation |
| `worker.test.mjs` | Dependency-free wire-format and request-flow tests |
| `wrangler.toml.example` | Wrangler deployment template |
| `README.md` | This document |
| `README.ja.md` | Japanese version |

## Development Log

### July 25, 2026 — cache correctness, hardening, and request scheduling

**DNS and cache correctness**

- Cache hits restore the current transaction ID and Question bytes.
- Ordinary Answer, Authority, and Additional RR TTLs are decremented by cache
  age; OPT metadata is not treated as a TTL.
- Stale responses cap ordinary RR TTLs at 15 seconds.
- NXDOMAIN and empty-answer NODATA use Authority SOA data for RFC 2308 negative
  caching.
- The semantic cache key is version `v3`. Each component is independently
  encoded, and profile revision, DO, RD, AD, and CD are isolated; ECS and
  unrepresented EDNS semantics bypass cache.

**Validation and scheduling**

- Upstream responses are accepted only after DNS message, Question,
  transaction ID, QR, RCODE, Content-Type, and OPT validation.
- Private profiles use configurable absolute hedge delays, defaulting to
  `[0, 35, 80]` ms.
- Concurrent cache misses and prefetches share an isolate-local singleflight
  operation while each client receives its own DNS identity.
- Prefetch requires TTL >= 60 seconds, 85% cache age, and two hits within five
  minutes.

**Security and operational changes**

- Public DoH is disabled by default. When explicitly enabled, the public
  profile uses Cloudflare only.
- POST bodies are limited to 4 KiB and request URLs to 8 KiB.
- Bearer authentication is preferred; the token path remains for client
  compatibility and now accepts the same restricted token charset.
- Valid private profiles are cached in isolate memory for 120 seconds with a
  64-entry bound; unknown tokens are not retained.

**Documentation and publication privacy**

- Consolidated the implementation invariants, operational limits, and
  verification guidance into the maintained README files.
- Removed the temporary audit handoff document after its accepted findings were
  incorporated into the implementation and tests.
- Replaced deployment-host examples with `<your-worker-domain>` placeholders.
- Added an explicit rule that maintainer-operated domains, account subdomains,
  routes, resource IDs, tokens, and other private deployment details must not
  appear in public documentation.

### April 8, 2026 — 9:29 PM PDT — v4 major upgrade

Complete rewrite from a generic DoH reverse proxy into a token-aware private DoH gateway.

**New capabilities**
- Token routing: `/dns-query/<token>` loads an isolated profile and rule set from Cloudflare KV
- Private rule matching: exact and suffix domain rules answered locally without hitting any upstream
- Local DNS response synthesis: binary-correct A / AAAA / CNAME answers built inside the Worker
- Normalized semantic cache keys: eliminates cache fragmentation caused by changing DNS transaction IDs
- Remaining-TTL cache: clients now receive the actual remaining TTL with a correct `Age` header
- Stale-if-error: stale cache entries are served when all upstreams fail, within a configurable window
- KV-backed profile and rule management: update rules without redeployment
- `wrangler.toml.example` added as a local deployment template

**Bug fixes**
- Fixed base64url padding for RFC 8484 GET requests — some DoH clients omit `=` padding

**Historical compatibility note**

- This v4 release originally retained the unauthenticated `/dns-query`
  behavior. The July 25 hardening pass intentionally changed that default;
  public access now requires `ALLOW_PUBLIC_DOH=true`.
