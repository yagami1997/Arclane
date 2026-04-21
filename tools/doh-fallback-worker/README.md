# doh-fallback-worker

A private DoH gateway built on Cloudflare Workers.

- **Public path** `/dns-query` — high-performance public DoH, open to any standard DoH client
- **Private path** `/dns-query/<token>` — loads a per-token profile and private rule set from KV

Language: English / [日本語](./README.ja.md)

## Features

| # | Feature |
|---|---------|
| 1 | Token-aware routing — each token maps to an isolated resolution profile stored in KV |
| 2 | Private rule matching — exact and suffix domain rules answered locally, no upstream needed |
| 3 | Local DNS response synthesis — binary-correct DNS answers built inside the Worker |
| 4 | Normalized cache keys — semantic keys eliminate fragmentation from changing transaction IDs |
| 5 | Multi-upstream racing — CF / Google / Quad9, first response wins |
| 6 | Remaining-TTL cache — clients receive the actual remaining TTL, not the original value |
| 7 | Background prefetch — silent refresh when remaining TTL falls below 25 % |
| 8 | ECS-aware cache isolation — ECS and non-ECS queries use separate cache entries |
| 9 | Stale-if-error — stale cache served when all upstreams fail, within a configurable window |

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

### 1. Start the local server

```bash
cd tools/doh-fallback-worker
wrangler dev
```

The Worker starts at `http://localhost:8787` by default.

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
  '{"name":"local-test","upstreams":["cf","google","quad9"],"cachePolicy":{"minTtl":60,"maxTtl":86400,"defaultTtl":300,"prefetchRatio":0.75,"staleIfErrorWindow":120}}' \
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
https://doh-fallback-worker.<your-account>.workers.dev
```

The public path `/dns-query` is live immediately.

### Step 3 — Generate a token

```bash
uuidgen
# example output: ef7e6132-75b6-400e-8fec-0e61f7b44f8e
```

Keep this value private. It is the key that unlocks your private rule set.

### Step 4 — Write profile and rules to KV

**Write the profile:**

```bash
wrangler kv key put --binding DOH_KV \
  "profile:ef7e6132-75b6-400e-8fec-0e61f7b44f8e" \
  '{"name":"personal","upstreams":["cf","google","quad9"],"cachePolicy":{"minTtl":60,"maxTtl":86400,"defaultTtl":300,"prefetchRatio":0.75,"staleIfErrorWindow":120}}'
```

**Prepare a `rules.json` file** (see format below), then push it:

```bash
wrangler kv key put --binding DOH_KV \
  "rules:ef7e6132-75b6-400e-8fec-0e61f7b44f8e" \
  --path rules.json
```

### Step 5 — Verify

```bash
# Public path
curl -s "https://doh-fallback-worker.<your-account>.workers.dev/dns-query?dns=AAABAAABAAAAAAAAA3d3dwZnb29nbGUDY29tAAABAAE="

# Private path
curl -sv "https://doh-fallback-worker.<your-account>.workers.dev/dns-query/ef7e6132-75b6-400e-8fec-0e61f7b44f8e?dns=..."
```

First request: `x-cache: MISS`. Second identical request: `x-cache: HIT`.

---

## Private Rule Management

Rules are stored in KV and take effect immediately — no redeployment needed.

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
  "upstreams": ["cf", "google", "quad9"],
  "cachePolicy": {
    "minTtl": 60,
    "maxTtl": 86400,
    "defaultTtl": 300,
    "prefetchRatio": 0.75,
    "staleIfErrorWindow": 120
  }
}
```

Available upstream keys: `cf`, `google`, `quad9`, `ali`

---

## Client Configuration

**Surge**

```ini
[Proxy]
DOH-Public  = https://doh-fallback-worker.<your-account>.workers.dev/dns-query
DOH-Private = https://doh-fallback-worker.<your-account>.workers.dev/dns-query/<token>
```

**Clash**

```yaml
dns:
  nameserver:
    - "https://doh-fallback-worker.<your-account>.workers.dev/dns-query/ef7e6132-75b6-400e-8fec-0e61f7b44f8e"
```

---

## Security

- Unknown tokens always return `403` — no fallback to the default profile
- Tokens and rules are stored in KV only, never in source code
- This repository contains no private tokens, keys, or rule lists

## Behavior Reference

| Situation | Response |
|-----------|----------|
| Unknown token | 403 |
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
| `wrangler.toml.example` | Wrangler deployment template |
| `README.md` | This document |
| `README.ja.md` | Japanese version |

## Changelog

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

**Backward compatibility**
- `/dns-query` (no token) behaves identically to v3 for all existing clients
