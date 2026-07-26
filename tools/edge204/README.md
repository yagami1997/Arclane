# edge204 — CF Edge 204 Probe

Version created: April 6, 2026 11:10 PM PDT
Version updated: July 26, 2026 PDT

Language:

- English
- [日本語](./README.ja.md)

## Overview

This directory contains a Cloudflare Worker that returns pure HTTP 204 responses directly from the Cloudflare edge, with zero upstream fetches and zero TLS overhead.

The intended use case is proxy-node latency measurement in Surge and Clash/mihomo. When configured as the health-check target of a `url-test` or `fallback` group, the probe gives the client an RTT reading that reflects only the proxy node's link to the nearest Cloudflare PoP, with no origin server latency mixed in.

Read [What This Probe Cannot Tell You](#what-this-probe-cannot-tell-you) before trusting the numbers to rank nodes. The measurement has real blind spots.

## What This Worker Does

The implementation in [`worker.js`](./worker.js) handles five distinct cases:

| Path | Method | Status | Purpose |
|---|---|---|---|
| `/generate_204` | GET / HEAD | 204 | Main probe endpoint |
| `/204` | GET / HEAD | 204 | Alias for the main probe |
| `/ping` | GET / HEAD | 200 JSON | Liveness check, reports deployed version |
| `/trace` | GET / HEAD | 200 text | CF PoP diagnostics (client IP requires `TRACE_KEY`) |
| anything else | GET / HEAD | 404 | |
| any path | POST etc. | 405 | |

Trailing slashes are normalized, so `/generate_204/` behaves the same as `/generate_204`.

Every response carries `Cache-Control: no-store`. This is not optional: RFC 9110 lists `204` among the heuristically cacheable status codes, so without the header an intermediate cache is permitted to serve a stale 204 and flatten your latency readings to zero.

## Core Design

The Worker is intentionally minimal.

- No `fetch()` calls. All responses are generated at the edge directly. There is no upstream request, no origin server, no round trip beyond the edge.
- No stateful bindings. No KV, D1, R2, or Durable Objects. The optional `TRACE_KEY` is a plain environment string resolved at isolate startup, which costs no I/O and does not make the Worker stateful.
- No access control on the probe paths. Rate limiting is handled at the zone WAF layer, not in Worker code.
- No CORS headers. Surge and Clash are not browsers.
- ES Module syntax with a single exported `fetch` handler.

`/generate_204` is the hot path and must stay that way: method check, path match, return. Nothing that touches the network, storage, or request body may be added to it.

## Why HTTP, Not HTTPS

The common claim is that TLS handshakes "contaminate" the measurement and cause misranking. That claim is weaker than it sounds, and it is worth stating the real reason precisely.

On a cold connection, TLS 1.3 adds roughly one extra round trip on top of the TCP handshake. That is close to a proportional scaling of the same underlying RTT, so on healthy links it shifts every node's number up by a similar factor and **does not by itself reorder them**.

The actual reasons to prefer plain HTTP here:

- **Fewer variables.** Session resumption and 0-RTT can be available on one node and not another, so the TLS cost is not applied uniformly across the set being compared.
- **Shorter measurement.** Less time in flight means less exposure to transient jitter within a single sample.

And the honest caveat in the other direction:

- On lossy or MTU-constrained links, the extra handshake amplifies **non-linearly**. That is real signal about a link you will actually be using over TLS, and the HTTP probe hides it. A node that looks fine here can still be poor in practice.

Do not take the "50–150 ms" figure quoted in most write-ups on faith. The same Custom Domain serves HTTPS with no code change, so measure your own delta:

```bash
# through the node, plain HTTP
for i in 1 2 3 4 5; do
  curl -o /dev/null -s -w "%{time_total}\n" \
    -x http://<NodeHost>:<Port> http://probe.example.com/generate_204
done

# same node, same path, TLS
for i in 1 2 3 4 5; do
  curl -o /dev/null -s -w "%{time_total}\n" \
    -x http://<NodeHost>:<Port> https://probe.example.com/generate_204
done
```

If the two sets rank your nodes in the same order, the HTTP probe is buying you stability, not correctness. If they disagree, the HTTPS numbers are the ones that describe your real traffic.

Nodes that internally upgrade `http://` requests to HTTPS will show inflated latency. Use `/trace` to confirm what actually reached the Worker.

## What This Probe Cannot Tell You

These are limits of the method, not bugs in the Worker.

**1. Anycast bias.** The probe measures the path from the node's egress to its *nearest Cloudflare PoP* — not to whatever you actually use. Providers that peer well with Cloudflare, or whose egress sits in a Cloudflare-adjacent network, score better than their general routing deserves. Ranking nodes by this number ranks them by proximity to Cloudflare. Treat it as one signal, not as a verdict.

**2. Port 80 is not a clean channel.** Plain HTTP is subject to transparent-proxy interception and injection on some upstreams. More importantly, many proxy configurations route `:80` and `:443` through different outbound paths — in which case the path you measured is not the path you use. `/trace` will reveal the first problem via `colo`; the only way to detect the second is to compare against the HTTPS run above.

**3. Single point of failure.** Every group pointed at this hostname fails together. If the zone, the Custom Domain, or your WAF rule misbehaves, the client marks *all* nodes as timed out and you lose connectivity, not just accuracy. Keep the global fallback on an endpoint you do not operate:

```ini
[General]
proxy-test-url = http://cp.cloudflare.com/generate_204
```

Use this probe for the groups where you want a controlled reading, and keep a third-party URL as the safety net.

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

Both are only needed for the CLI deployment path in Step 1. If you would rather not install anything, the dashboard alternative in the same step requires neither.

## Local Verification

Run the test suite before deploying:

```bash
cd tools/edge204
node --test worker.test.mjs
```

It covers routing, trailing-slash normalization, the method guard, response headers, and all four `TRACE_KEY` states. It needs no network access and no Cloudflare account.

To exercise the Worker by hand:

```bash
wrangler dev --var TRACE_KEY:devkey
```

`request.cf` is empty under `wrangler dev`, so `/trace` reports `unknown` for every Cloudflare field locally. That is expected, and it is why the caching checks in [Verification](#verification) can only be done against the deployed Worker.

## Deployment

### Step 1: Deploy the Worker

Copy the local template. `wrangler.toml` is ignored by Git, so anything you change in it stays out of the repository:

```bash
cd tools/edge204
cp wrangler.toml.example wrangler.toml
wrangler deploy
```

This Worker declares no KV, D1, R2, or Durable Object resources, so the copied template usually needs no edits. It also declares no `routes` on purpose — see Step 2.

<details>
<summary>Dashboard alternative (no Node.js required)</summary>

1. Sign in to the Cloudflare dashboard.
2. Open **Workers & Pages**.
3. Click **Create Worker**.
4. Name it `edge204`.
5. Replace the default script with the contents of [`worker.js`](./worker.js).
6. Click **Deploy**.

The tradeoff: the dashboard pins a `compatibility_date` at creation time that is not visible anywhere in this repository, so the deployed artifact is no longer fully described by the source you can read. Prefer the CLI path if you intend to maintain this over time.

</details>

### Step 2: Bind the Custom Domain

1. Open the deployed `edge204` Worker.
2. Go to **Settings → Domains & Routes → Add Custom Domain**.
3. Enter `probe.example.com`.
4. Cloudflare will automatically create a CNAME record in the target zone.
5. Wait for the domain status to show **Active** (usually under one minute).

Do this once, in the dashboard. `wrangler.toml.example` intentionally declares no `routes`, so subsequent `wrangler deploy` runs update the script only and never touch the zone's DNS records.

### Step 3: Confirm Zone SSL/TLS Settings

In the target zone under **SSL/TLS**, confirm:

| Setting | Required state |
|---|---|
| Always Use HTTPS | Off |
| Opportunistic Encryption | Off |
| HSTS | Not enabled |

These settings prevent the zone from upgrading HTTP requests to HTTPS before they reach the Worker.

### Step 4: Add WAF Rate Limiting Rule

In the target zone under **Security → WAF → Rate Limiting Rules**, create one rule:

| Field | Value |
|---|---|
| Condition | Hostname equals `probe.example.com` |
| Threshold | 60 requests per 10 seconds per IP |
| Action | Block (returns 429) |

Size the threshold against your **peak**, not your interval. A 300-second interval is trivial, but GUI clients trigger a full concurrent sweep of every node whenever the user taps "test all" — that burst is what will hit the limit.

### Step 5 (optional): Set `TRACE_KEY`

Generate a value locally:

```bash
openssl rand -hex 8
```

Store it as an encrypted secret, not as a plaintext variable and not in `wrangler.toml`:

```bash
wrangler secret put TRACE_KEY
```

Secrets persist across deploys, so you set this once. In the dashboard the equivalent is **Settings → Variables and Secrets → Add**, choosing **Secret** rather than a plaintext variable.

Behavior:

| `TRACE_KEY` state | `/trace` output |
|---|---|
| Not set | `colo`, `country`, `city`, `asn`, `ray`, `ts` — no client IP |
| Set, request has no or wrong `?k=` | Same as above — no client IP, no error |
| Set, request has correct `?k=` | Above plus `ip=` |

A wrong key degrades silently rather than returning an error, so the endpoint gives a scanner no signal that a key exists at all.

**This is not authentication.** The whole channel is plaintext HTTP, so the key is visible to anyone who can observe your traffic. What it protects is your request quota and your own egress IP against opportunistic scanners that find the hostname. Do not treat it as a security boundary.

## Verification

After the custom domain becomes active, run these checks:

```bash
# Primary probe: must return 204, no 301 redirect
curl -si http://probe.example.com/generate_204 | head -3

# Cache-Control must be present
curl -si http://probe.example.com/generate_204 | grep -i cache-control

# No cache layer in between: cf-ray must differ across calls, and no Age header
curl -sI http://probe.example.com/generate_204 | grep -iE 'cf-ray|^age:'
curl -sI http://probe.example.com/generate_204 | grep -iE 'cf-ray|^age:'

# Deployed version
curl -s http://probe.example.com/ping

# Trailing slash and method guard
curl -so /dev/null -w '%{http_code}\n' http://probe.example.com/generate_204/
curl -so /dev/null -w '%{http_code}\n' -X POST http://probe.example.com/generate_204

# PoP diagnostics
curl -s http://probe.example.com/trace
curl -s 'http://probe.example.com/trace?k=<TRACE_KEY>'
```

Expected: `204`, `204`, `405`, and a `cf-ray` that changes on every request with no `Age` header present.

> A previous version of this document suggested comparing the `ts` field across two `/ping` calls as proof that nothing is caching. That test is unsound — the Workers clock does not advance without I/O, so identical timestamps prove nothing either way. Use `cf-ray` and the absence of `Age`.

Expected output from `/trace` when called through a proxy node with a valid key:

```
colo=LAX
country=US
city=Los Angeles
asn=13335
ray=8a1b2c3d4e5f6a7b-LAX
ip=<proxy egress IP>
ts=<millisecond timestamp>
```

Without a valid key the `ip` line is absent and everything else is identical.

If `colo` is not the city you expected for that proxy node, the node's egress is routing through a different CF PoP. High latency in that case reflects a routing issue, not node degradation.

## Surge Configuration

### url-test strategy group

```ini
[Proxy Group]
Auto = url-test, Node-US-1, Node-US-2, Node-JP-1, Node-HK-1, \
  url=http://probe.example.com/generate_204, \
  interval=300, \
  tolerance=50
```

### fallback strategy group

```ini
[Proxy Group]
Fallback = fallback, Node-US-1, Node-US-2, Node-JP-1, \
  url=http://probe.example.com/generate_204, \
  interval=300
```

| Parameter | Value | Notes |
|---|---|---|
| `url` | `http://probe.example.com/generate_204` | HTTP, no TLS overhead |
| `interval` | `300` | Re-test every 300 seconds |
| `tolerance` | `50` | Do not switch nodes for differences under 50 ms |

## Clash / mihomo Configuration

### Group-level health check

```yaml
proxy-groups:
  - name: Auto
    type: url-test
    url: http://probe.example.com/generate_204
    interval: 300
    tolerance: 50
    expected-status: 204
    proxies:
      - Node-US-1
      - Node-JP-1
```

### Provider-level health check

```yaml
proxy-providers:
  Airport:
    type: http
    url: "https://example.com/subscribe"
    path: ./providers/airport.yaml
    interval: 3600
    health-check:
      enable: true
      url: http://probe.example.com/generate_204
      interval: 600
      expected-status: 204
```

Four things worth knowing:

- **Set `expected-status: 204` explicitly.** Do not rely on the default acceptance behavior being what you assume — state the contract.
- **Do not configure both group-level and provider-level health checks against the same nodes.** They run independently and you will double your request volume for no additional information. Pick one layer.
- **`unified-delay: true` performs two handshakes and discards the first**, specifically to normalize away handshake cost. If you enable it, much of the argument for using plain HTTP here is already handled by the client, and an HTTPS probe becomes the more honest choice.
- **GUI clients (Clash Verge, etc.) sweep every node concurrently on a manual test.** That peak, not `interval`, is what your WAF threshold has to survive.

## Troubleshooting a Node with Unexpectedly High Latency

```bash
# Route a request through the suspect proxy node
curl -x http://<NodeHost>:<Port> 'http://probe.example.com/trace?k=<TRACE_KEY>'
```

If `colo` shows a PoP far from the node's listed location, the latency is a routing issue. If `colo` looks correct, the issue is the link between that node and its local CF PoP.

If `colo` looks correct and latency is still high, re-run the HTTP-versus-HTTPS comparison from [Why HTTP, Not HTTPS](#why-http-not-https). A large gap points at a lossy link rather than a slow one.

## Files

- [`worker.js`](./worker.js): Cloudflare Worker implementation
- [`worker.test.mjs`](./worker.test.mjs): Test suite, run with `node --test worker.test.mjs`
- [`wrangler.toml.example`](./wrangler.toml.example): Deployment template; copy to `wrangler.toml`, which Git ignores
- [`README.ja.md`](./README.ja.md): Japanese version of this document
- [`dev-plan.md`](./dev-plan.md): Development plan and architecture notes
