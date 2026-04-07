# edge204 (CF Edge Probe) Implementation Plan

Version created: April 6, 2026 11:10 PM PDT

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Cloudflare Worker that returns pure HTTP 204 responses from the CF edge, used as a Surge proxy-node latency probe with zero TLS overhead.

**Architecture:** A single ES Module Worker (`src/index.js`) handles five endpoints (`/generate_204`, `/204`, `/ping`, `/trace`, catch-all) with strict no-cache headers. No upstream fetches, no bindings, fully stateless. Deployed under `probe.example.com` via Custom Domain (not Zone Routes).

**Tech Stack:** Cloudflare Workers (ES Module), Wrangler CLI v3, Node.js ≥ 18, plain JavaScript (no TypeScript, no bundler, no extra deps)

---

## File Map

| File | Purpose |
|---|---|
| `tools/edge204/src/index.js` | Worker entry — all routing and response logic |
| `tools/edge204/wrangler.toml` | Wrangler config (name, main, compatibility_date, observability) |
| `tools/edge204/package.json` | Minimal package descriptor for `wrangler dev` scripts |
| `tools/edge204/README.md` | Deployment checklist + Surge config snippets |

Custom Domain binding (`probe.example.com`) is done through CF Dashboard after deploy — not in `wrangler.toml`.

---

## Task 1: Scaffold the project directory

**Files:**
- Create: `tools/edge204/package.json`
- Create: `tools/edge204/wrangler.toml`
- Create: `tools/edge204/src/index.js` (empty stub)

- [ ] **Step 1: Create the directory tree**

```bash
mkdir -p tools/edge204/src
```

- [ ] **Step 2: Create `tools/edge204/package.json`**

```json
{
  "name": "edge204",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  }
}
```

- [ ] **Step 3: Create `tools/edge204/wrangler.toml`**

```toml
name = "cf-edge-probe"
main = "src/index.js"
compatibility_date = "2024-09-23"

[observability]
enabled = true
```

> No `routes` or `workers_dev` overrides — Custom Domain is added via CF Dashboard after first deploy.

- [ ] **Step 4: Create `tools/edge204/src/index.js` stub**

```js
export default {
  async fetch(request, env, ctx) {
    return new Response('stub', { status: 200 });
  },
};
```

- [ ] **Step 5: Verify Wrangler can parse the config**

```bash
cd tools/edge204 && npx wrangler --version
```

Expected: prints Wrangler version, no errors.

- [ ] **Step 6: Commit**

```bash
git add tools/edge204/
git commit -m "feat(edge204): scaffold Worker project structure"
```

---

## Task 2: Implement the shared response headers constant

**Files:**
- Modify: `tools/edge204/src/index.js`

These three headers must appear on every response. Define them once as a frozen constant at module scope so all response builders reuse them without repetition.

- [ ] **Step 1: Replace the stub with the header constant and a helper**

Open `tools/edge204/src/index.js` and replace its contents with:

```js
// Headers applied to every response to prevent caching at any layer.
const NO_CACHE = Object.freeze({
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
  'Access-Control-Allow-Origin': '*',
});

export default {
  async fetch(request, env, ctx) {
    return new Response('stub', { status: 200, headers: NO_CACHE });
  },
};
```

- [ ] **Step 2: Verify locally**

```bash
cd tools/edge204 && npx wrangler dev --port 8787
```

In a second terminal:

```bash
curl -si http://localhost:8787/ | grep -i cache
```

Expected output includes:
```
cache-control: no-store, no-cache, must-revalidate
pragma: no-cache
```

Stop the dev server with `Ctrl+C`.

- [ ] **Step 3: Commit**

```bash
git add tools/edge204/src/index.js
git commit -m "feat(edge204): add shared no-cache headers constant"
```

---

## Task 3: Implement method guard (405) and routing skeleton

**Files:**
- Modify: `tools/edge204/src/index.js`

Before routing by path, reject any method that isn't GET or HEAD. Then set up the path-based switch that all subsequent tasks will fill in.

- [ ] **Step 1: Write the updated Worker with method guard and routing shell**

```js
const NO_CACHE = Object.freeze({
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
  'Access-Control-Allow-Origin': '*',
});

export default {
  async fetch(request, env, ctx) {
    const { method } = request;
    const { pathname } = new URL(request.url);

    // Only GET and HEAD are accepted.
    if (method !== 'GET' && method !== 'HEAD') {
      return new Response(null, {
        status: 405,
        headers: { ...NO_CACHE, Allow: 'GET, HEAD' },
      });
    }

    switch (pathname) {
      default:
        return new Response(null, { status: 404, headers: NO_CACHE });
    }
  },
};
```

- [ ] **Step 2: Test method guard**

Start `npx wrangler dev --port 8787` in one terminal, then:

```bash
# Should return 405
curl -si -X POST http://localhost:8787/generate_204 | head -1
# Expected: HTTP/1.1 405 Method Not Allowed

# Should return 404 (routing shell not filled yet)
curl -si http://localhost:8787/generate_204 | head -1
# Expected: HTTP/1.1 404 Not Found
```

- [ ] **Step 3: Commit**

```bash
git add tools/edge204/src/index.js
git commit -m "feat(edge204): add method guard and routing skeleton"
```

---

## Task 4: Implement `/generate_204` and `/204` endpoints

**Files:**
- Modify: `tools/edge204/src/index.js`

Both paths return `204 No Content` with the shared no-cache headers and an empty body. For HEAD requests the body is omitted automatically by the runtime.

- [ ] **Step 1: Add the 204 cases to the switch**

Replace the `switch` block in `index.js`:

```js
    switch (pathname) {
      case '/generate_204':
      case '/204':
        return new Response(null, { status: 204, headers: NO_CACHE });

      default:
        return new Response(null, { status: 404, headers: NO_CACHE });
    }
```

- [ ] **Step 2: Test both paths**

```bash
# GET /generate_204
curl -si http://localhost:8787/generate_204 | head -1
# Expected: HTTP/1.1 204 No Content

# HEAD /generate_204 — body must be absent, check Content-Length is absent or 0
curl -si -I http://localhost:8787/generate_204 | head -1
# Expected: HTTP/1.1 204 No Content

# GET /204
curl -si http://localhost:8787/204 | head -1
# Expected: HTTP/1.1 204 No Content

# Verify Cache-Control is present
curl -si http://localhost:8787/generate_204 | grep -i cache-control
# Expected: cache-control: no-store, no-cache, must-revalidate
```

- [ ] **Step 3: Commit**

```bash
git add tools/edge204/src/index.js
git commit -m "feat(edge204): implement /generate_204 and /204 endpoints"
```

---

## Task 5: Implement `/ping` endpoint

**Files:**
- Modify: `tools/edge204/src/index.js`

Returns `200 OK` with JSON `{"ok":true,"ts":<ms>}`. The `ts` field changes on every request — this is the observable proof that no cache layer is serving the response.

- [ ] **Step 1: Add the `/ping` case**

```js
      case '/ping': {
        const body = JSON.stringify({ ok: true, ts: Date.now() });
        return new Response(body, {
          status: 200,
          headers: {
            ...NO_CACHE,
            'Content-Type': 'application/json',
          },
        });
      }
```

Insert this case before the `default:` in the switch.

- [ ] **Step 2: Test `/ping`**

```bash
# First call
curl -s http://localhost:8787/ping
# Expected: {"ok":true,"ts":1712345678901}

# Second call (ts must differ)
curl -s http://localhost:8787/ping
# Expected: {"ok":true,"ts":1712345678950}  ← different number
```

```bash
# Confirm Content-Type
curl -si http://localhost:8787/ping | grep -i content-type
# Expected: content-type: application/json
```

- [ ] **Step 3: Commit**

```bash
git add tools/edge204/src/index.js
git commit -m "feat(edge204): implement /ping liveness endpoint"
```

---

## Task 6: Implement `/trace` endpoint

**Files:**
- Modify: `tools/edge204/src/index.js`

Returns `200 OK` plain text with CF PoP diagnostics from `request.cf`. In `wrangler dev` the `cf` object is `undefined`; fields fall back to `"unknown"`. In production they contain real values.

- [ ] **Step 1: Add the `/trace` case**

```js
      case '/trace': {
        const cf = request.cf ?? {};
        const lines = [
          `colo=${cf.colo ?? 'unknown'}`,
          `country=${cf.country ?? 'unknown'}`,
          `city=${cf.city ?? 'unknown'}`,
          `asn=${cf.asn ?? 'unknown'}`,
          `ray=${request.headers.get('cf-ray') ?? 'unknown'}`,
          `ip=${request.headers.get('cf-connecting-ip') ?? 'unknown'}`,
          `ts=${Date.now()}`,
        ].join('\n');
        return new Response(lines + '\n', {
          status: 200,
          headers: {
            ...NO_CACHE,
            'Content-Type': 'text/plain; charset=utf-8',
          },
        });
      }
```

Insert this case before the `default:` in the switch.

- [ ] **Step 2: Test `/trace` locally**

Local dev: `request.cf` is `undefined`, so all fields show `unknown`. That is expected.

```bash
curl -s http://localhost:8787/trace
```

Expected output (local):
```
colo=unknown
country=unknown
city=unknown
asn=unknown
ray=unknown
ip=unknown
ts=1712345678901
```

- [ ] **Step 3: Commit**

```bash
git add tools/edge204/src/index.js
git commit -m "feat(edge204): implement /trace diagnostic endpoint"
```

---

## Task 7: Final review and full file assembly

**Files:**
- Modify: `tools/edge204/src/index.js` (confirm complete, no dead code)

After all endpoint tasks the final `index.js` must look exactly like this. Verify no leftover stubs or extra logic.

- [ ] **Step 1: Confirm `src/index.js` final content**

```js
// Headers applied to every response to prevent caching at any layer.
const NO_CACHE = Object.freeze({
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
  'Access-Control-Allow-Origin': '*',
});

export default {
  async fetch(request, env, ctx) {
    const { method } = request;
    const { pathname } = new URL(request.url);

    // Only GET and HEAD are accepted.
    if (method !== 'GET' && method !== 'HEAD') {
      return new Response(null, {
        status: 405,
        headers: { ...NO_CACHE, Allow: 'GET, HEAD' },
      });
    }

    switch (pathname) {
      case '/generate_204':
      case '/204':
        return new Response(null, { status: 204, headers: NO_CACHE });

      case '/ping': {
        const body = JSON.stringify({ ok: true, ts: Date.now() });
        return new Response(body, {
          status: 200,
          headers: { ...NO_CACHE, 'Content-Type': 'application/json' },
        });
      }

      case '/trace': {
        const cf = request.cf ?? {};
        const lines = [
          `colo=${cf.colo ?? 'unknown'}`,
          `country=${cf.country ?? 'unknown'}`,
          `city=${cf.city ?? 'unknown'}`,
          `asn=${cf.asn ?? 'unknown'}`,
          `ray=${request.headers.get('cf-ray') ?? 'unknown'}`,
          `ip=${request.headers.get('cf-connecting-ip') ?? 'unknown'}`,
          `ts=${Date.now()}`,
        ].join('\n');
        return new Response(lines + '\n', {
          status: 200,
          headers: { ...NO_CACHE, 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }

      default:
        return new Response(null, { status: 404, headers: NO_CACHE });
    }
  },
};
```

- [ ] **Step 2: Run the full local smoke test**

Start `npx wrangler dev --port 8787` then run all checks in one pass:

```bash
echo "=== /generate_204 ===" && curl -si http://localhost:8787/generate_204 | head -3
echo "=== /204 ===" && curl -si http://localhost:8787/204 | head -3
echo "=== /ping ===" && curl -s http://localhost:8787/ping
echo "=== /trace ===" && curl -s http://localhost:8787/trace
echo "=== 404 ===" && curl -si http://localhost:8787/other | head -1
echo "=== 405 ===" && curl -si -X DELETE http://localhost:8787/generate_204 | head -1
```

Expected results:
```
=== /generate_204 ===
HTTP/1.1 204 No Content
cache-control: no-store, no-cache, must-revalidate

=== /204 ===
HTTP/1.1 204 No Content

=== /ping ===
{"ok":true,"ts":1712345678901}

=== /trace ===
colo=unknown
...
ts=1712345678950

=== 404 ===
HTTP/1.1 404 Not Found

=== 405 ===
HTTP/1.1 405 Method Not Allowed
```

- [ ] **Step 3: Commit (only if any diff exists from Task 6)**

```bash
git add tools/edge204/src/index.js
git commit -m "feat(edge204): finalize Worker — all endpoints complete"
```

---

## Task 8: Deploy to Cloudflare

**Files:**
- No code changes — deploy-only task.

Prerequisites: `wrangler login` completed, account has access to `aqabatech.co.uk` zone.

- [ ] **Step 1: Deploy**

```bash
cd tools/edge204 && npx wrangler deploy
```

Expected terminal output (last line):
```
Deployed cf-edge-probe (version ...) to:
  https://cf-edge-probe.<account>.workers.dev
```

No errors. If auth fails run `npx wrangler login` first.

- [ ] **Step 2: Bind Custom Domain via CF Dashboard**

1. CF Dashboard → Workers & Pages → `cf-edge-probe`
2. Settings → Domains & Routes → **Add Custom Domain**
3. Enter: `probe.example.com`
4. CF auto-creates the CNAME record in the `aqabatech.co.uk` Zone.
5. Wait for status to show **Active** (usually < 60 seconds).

- [ ] **Step 3: Verify SSL/TLS zone settings**

In `aqabatech.co.uk` Zone → SSL/TLS:
- "Always Use HTTPS" → **Off**
- "Opportunistic Encryption" → **Off**
- HSTS → **Not enabled**

(Already confirmed per spec; double-check after binding.)

- [ ] **Step 4: Run production smoke tests**

```bash
# Primary probe — must return 204, no redirect
curl -si http://probe.example.com/generate_204 | head -3
# Expected:
# HTTP/1.1 204 No Content
# cache-control: no-store, no-cache, must-revalidate

# No-cache: repeat /ping twice, ts must differ
curl -s http://probe.example.com/ping
curl -s http://probe.example.com/ping

# Real CF trace — colo must NOT be "unknown"
curl -s http://probe.example.com/trace
# Expected: colo=SIN (or nearest PoP), not "unknown"

# No HTTPS redirect check — must NOT see 301
curl -si http://probe.example.com/generate_204 | grep -i location
# Expected: no output (no Location header)
```

- [ ] **Step 5: Commit deploy confirmation**

```bash
git commit --allow-empty -m "chore(edge204): deployed cf-edge-probe to probe.example.com"
```

---

## Task 9: Write README

**Files:**
- Create: `tools/edge204/README.md`

- [ ] **Step 1: Create README**

```markdown
# edge204 — CF Edge 204 Probe

Cloudflare Worker returning pure HTTP 204 from the CF edge.
Used as the Surge `url-test` / `fallback` probe URL.

## Endpoints

| Path | Method | Status | Purpose |
|---|---|---|---|
| `/generate_204` | GET / HEAD | 204 | Main probe |
| `/204` | GET / HEAD | 204 | Alias |
| `/ping` | GET | 200 JSON | Liveness / cache check |
| `/trace` | GET | 200 text | CF PoP / ray diagnostics |

## Deploy

```bash
cd tools/edge204
npx wrangler deploy
```

Then bind `probe.example.com` in CF Dashboard →
Workers & Pages → cf-edge-probe → Settings → Domains & Routes → Add Custom Domain.

## Surge Config

```ini
[Proxy Group]
Auto = url-test, Node-US-1, Node-JP-1, Node-HK-1, \
  url=http://probe.example.com/generate_204, \
  interval=300, \
  tolerance=50
```

## Local Dev

```bash
npx wrangler dev
# /trace fields show "unknown" locally — normal, request.cf is empty in dev
```
```

- [ ] **Step 2: Commit**

```bash
git add tools/edge204/README.md
git commit -m "docs(edge204): add deployment and Surge config README"
```

---

## Spec Coverage Check

| Spec requirement | Covered by |
|---|---|
| `/generate_204` → 204 GET+HEAD | Task 4 |
| `/204` alias → 204 | Task 4 |
| `/ping` → 200 JSON `{ok,ts}` | Task 5 |
| `/trace` → colo/country/ASN/ray/ip/ts | Task 6 |
| Other paths → 404 | Task 3 |
| POST etc. → 405 | Task 3 |
| `Cache-Control: no-store, no-cache, must-revalidate` | Task 2 |
| `Pragma: no-cache` | Task 2 |
| `Access-Control-Allow-Origin: *` | Task 2 |
| No `fetch()` upstream calls | Task 7 (confirmed in final file) |
| No KV/D1/R2 bindings | wrangler.toml (no bindings section) |
| ES Module syntax | Task 1 (wrangler.toml `main` + `export default`) |
| `compatibility_date = 2024-09-23` | Task 1 |
| Observability enabled | Task 1 |
| `wrangler deploy` deploy | Task 8 |
| Custom Domain (not Zone Route) | Task 8 |
| `aqabatech.co.uk` SSL settings verified | Task 8 |
