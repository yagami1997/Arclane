# edge204 — CF Edge 204 Probe

Version created: April 6, 2026 11:10 PM PDT

## Overview

This directory contains a Cloudflare Worker that returns pure HTTP 204 responses directly from the Cloudflare edge, with zero upstream fetches and zero TLS overhead.

The intended use case is Surge proxy-node latency measurement. When configured as the `url` target of a `url-test` or `fallback` strategy group, the probe gives Surge a clean RTT reading that reflects only the proxy node's link to the nearest Cloudflare PoP, without TLS handshake cost or origin server latency mixed in.

## Why HTTP, Not HTTPS

TLS handshakes add 50–150 ms on a first connection. That overhead contaminates RTT measurements and causes Surge to rank nodes incorrectly. By serving over plain HTTP, the probe isolates what you actually want to measure: the time from the proxy node's egress IP to the CF edge.

Nodes that internally upgrade `http://` requests to HTTPS will show inflated latency numbers. Use `/trace` to confirm what protocol reached the Worker when debugging unexpectedly high readings.

## What This Worker Does

The implementation in [`worker.js`](./worker.js) handles five distinct cases:

| Path | Method | Status | Purpose |
|---|---|---|---|
| `/generate_204` | GET / HEAD | 204 | Main probe endpoint for Surge |
| `/204` | GET / HEAD | 204 | Alias for the main probe |
| `/ping` | GET | 200 JSON | Liveness check, confirms no caching |
| `/trace` | GET | 200 text | Returns CF PoP diagnostics for troubleshooting |
| anything else | GET / HEAD | 404 | |
| any path | POST etc. | 405 | |

Every response carries `Cache-Control: no-store, no-cache, must-revalidate` and `Pragma: no-cache` to prevent any caching layer from serving stale data and polluting latency readings.

## Core Design

The Worker is intentionally minimal.

- No `fetch()` calls. All responses are generated at the edge directly. There is no upstream request, no origin server, no round trip beyond the edge.
- No bindings. No KV, D1, R2, or Durable Objects. The Worker is fully stateless.
- No access control or IP filtering. Rate limiting is handled at the zone WAF layer, not in Worker code.
- ES Module syntax with a single exported `fetch` handler.

## Deployment

### Step 1: Create the Worker in Cloudflare Dashboard

1. Sign in to the Cloudflare dashboard.
2. Open **Workers & Pages**.
3. Click **Create Worker**.
4. Name it `cf-edge-probe`.
5. Replace the default script with the contents of [`worker.js`](./worker.js).
6. Click **Deploy**.

### Step 2: Bind the Custom Domain

1. Open the deployed `cf-edge-probe` Worker.
2. Go to **Settings → Domains & Routes → Add Custom Domain**.
3. Enter `probe.example.com`.
4. Cloudflare will automatically create a CNAME record in the `aqabatech.co.uk` zone.
5. Wait for the domain status to show **Active** (usually under one minute).

### Step 3: Confirm Zone SSL/TLS Settings

In the `aqabatech.co.uk` zone under **SSL/TLS**, confirm:

| Setting | Required state |
|---|---|
| Always Use HTTPS | Off |
| Opportunistic Encryption | Off |
| HSTS | Not enabled |

These settings prevent the zone from upgrading HTTP requests to HTTPS before they reach the Worker.

### Step 4: Add WAF Rate Limiting Rule

In the `aqabatech.co.uk` zone under **Security → WAF → Rate Limiting Rules**, create one rule:

| Field | Value |
|---|---|
| Condition | Hostname equals `probe.example.com` |
| Threshold | 60 requests per 10 seconds per IP |
| Action | Block (returns 429) |

This prevents quota exhaustion if the endpoint URL becomes known to others. Surge's 300-second test interval is well below this threshold.

## Verification

After the custom domain becomes active, run these checks:

```bash
# Primary probe: must return 204, no 301 redirect
curl -si http://probe.example.com/generate_204 | head -3

# Cache-Control must be present
curl -si http://probe.example.com/generate_204 | grep -i cache-control

# /ping ts must differ between calls (confirms no caching)
curl -s http://probe.example.com/ping
curl -s http://probe.example.com/ping

# /trace must show real CF PoP data, not "unknown"
curl -s http://probe.example.com/trace
```

Expected output from `/trace` when called through a proxy node:

```
colo=LAX
country=US
city=Los Angeles
asn=13335
ray=8a1b2c3d4e5f6a7b-LAX
ip=<proxy egress IP>
ts=<millisecond timestamp>
```

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

## Troubleshooting a Node with Unexpectedly High Latency

```bash
# Route a request through the suspect proxy node
curl -x http://<NodeHost>:<Port> http://probe.example.com/trace
```

If `colo` shows a PoP far from the node's listed location, the latency is a routing issue. If `colo` looks correct, the issue is the link between that node and its local CF PoP.

## Files

- [`worker.js`](./worker.js): Cloudflare Worker implementation
- [`dev-plan.md`](./dev-plan.md): Original development plan and architecture notes
