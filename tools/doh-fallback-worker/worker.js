/**
 * Ultimate Cloudflare DOH Reverse Proxy Worker v3
 * Version created: April 1, 2026 09:30 PM PDT
 *
 * 1. Multi-upstream racing — CF / Google / Quad9, first success aborts the rest
 * 2. Smart caching — real DNS TTL drives Cache-Control
 * 3. Background prefetch — silently refresh when remaining TTL is below 25%
 * 4. ECS-aware caching — queries carrying ECS use isolated cache entries to avoid geo pollution
 * 5. SHA-256 cache keys — POST body hashing for efficient collision-free keys
 */

// ─── Upstreams and timeout ─────────────────────────────────
const UPSTREAMS = [
  'https://cloudflare-dns.com/dns-query',
  'https://dns.google/dns-query',
  'https://dns11.quad9.net/dns-query',
];
const UPSTREAM_TIMEOUT = 1500;

// ─── Cache ────────────────────────────────────────────────
const MIN_TTL = 60;
const MAX_TTL = 86400;
const DEFAULT_TTL = 300;
const PREFETCH_RATIO = 0.25;

// ─── Static headers ───────────────────────────────────────
const CORS = Object.freeze({
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, accept',
  'access-control-max-age': '86400',
});
const SECURITY = Object.freeze({
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
});
const DNS_CT = 'application/dns-message';

// ─── DNS message parsing ──────────────────────────────────

function skipName(view, off) {
  while (off < view.byteLength) {
    const b = view.getUint8(off);
    if (b === 0) return off + 1;
    if ((b & 0xc0) === 0xc0) return off + 2;
    off += 1 + b;
  }
  return off;
}

/** Extract the minimum TTL while skipping OPT records (type 41). */
function extractMinTTL(buf) {
  try {
    const v = new DataView(buf);
    if (buf.byteLength < 12) return DEFAULT_TTL;

    const qdcount = v.getUint16(4);
    const rrcount = v.getUint16(6) + v.getUint16(8) + v.getUint16(10);
    if (rrcount === 0) return DEFAULT_TTL;

    let off = 12;
    for (let i = 0; i < qdcount; i++) { off = skipName(v, off); off += 4; }

    let min = MAX_TTL;
    for (let i = 0; i < rrcount && off + 10 <= buf.byteLength; i++) {
      off = skipName(v, off);
      const type = v.getUint16(off);
      off += 4;
      const ttl = v.getUint32(off);
      off += 4;
      off += 2 + v.getUint16(off);
      if (type !== 41 && ttl > 0 && ttl < min) min = ttl;
    }
    return Math.max(MIN_TTL, Math.min(min, MAX_TTL));
  } catch {
    return DEFAULT_TTL;
  }
}

/**
 * Detect whether the query message carries ECS
 * (EDNS Client Subnet, option code 8).
 * This is used to separate cache keys so the same query with and without
 * ECS does not return the same cached response.
 */
function hasECS(buf) {
  try {
    const v = new DataView(buf);
    if (buf.byteLength < 12) return false;

    const qdcount = v.getUint16(4);
    const skipRR = v.getUint16(6) + v.getUint16(8);
    const arcount = v.getUint16(10);

    let off = 12;
    for (let i = 0; i < qdcount; i++) { off = skipName(v, off); off += 4; }
    for (let i = 0; i < skipRR && off < buf.byteLength; i++) {
      off = skipName(v, off);
      off += 8;
      off += 2 + v.getUint16(off);
    }
    for (let i = 0; i < arcount && off < buf.byteLength; i++) {
      off = skipName(v, off);
      const type = v.getUint16(off);
      off += 8;
      const rdlen = v.getUint16(off);
      off += 2;
      if (type === 41) {
        const end = off + rdlen;
        while (off + 4 <= end) {
          if (v.getUint16(off) === 8) return true;
          off += 4 + v.getUint16(off + 2);
        }
      } else {
        off += rdlen;
      }
    }
    return false;
  } catch {
    return false;
  }
}

// ─── Multi-upstream racing (first success aborts the rest) ──

async function raceFetch(method, body, search) {
  const controllers = UPSTREAMS.map(() => new AbortController());

  // Global timeout: abort every in-flight request once it expires.
  const timer = setTimeout(() => controllers.forEach(c => c.abort()), UPSTREAM_TIMEOUT);

  const promises = UPSTREAMS.map((upstream, idx) => {
    const target = method === 'GET' ? upstream + search : upstream;
    const headers = { accept: DNS_CT };
    if (method === 'POST') headers['content-type'] = DNS_CT;

    return fetch(target, {
      method,
      headers,
      body: method === 'POST' ? body : null,
      signal: controllers[idx].signal,
    }).then(res => {
      if (!res.ok) throw new Error(`${res.status}`);
      // Winner found, cancel all other requests.
      controllers.forEach((c, i) => { if (i !== idx) c.abort(); });
      return res;
    });
  });

  try {
    return await Promise.any(promises);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Cache keys ───────────────────────────────────────────

async function buildCacheKey(origin, method, search, body, ecs) {
  if (method === 'GET') {
    // ECS is encoded inside the dns= base64 payload in the query string,
    // so GET requests are naturally separated.
    return new Request(origin + '/dns-query' + search, { method: 'GET' });
  }
  // POST: use SHA-256(body) as the path, plus an ECS marker to prevent
  // cache pollution.
  const hash = await crypto.subtle.digest('SHA-256', body);
  const hex = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
  const ecsSuffix = ecs ? '/ecs' : '';
  return new Request(origin + '/c/' + hex + ecsSuffix, { method: 'GET' });
}

// ─── Response builders ────────────────────────────────────

function dnsResponse(body, ttl, cacheStatus) {
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': DNS_CT,
      'cache-control': `public, max-age=${ttl}`,
      'x-cache': cacheStatus,
      ...CORS,
      ...SECURITY,
    },
  });
}

function cacheableResponse(body, ttl) {
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': DNS_CT,
      'cache-control': `public, max-age=${ttl}`,
      'x-cache-ts': String(Date.now()),
      'x-cache-ttl': String(ttl),
    },
  });
}

// ─── Background prefetch ──────────────────────────────────

async function prefetch(cache, key, method, body, search) {
  try {
    const res = await raceFetch(method, body, search);
    if (!res) return;
    const buf = await res.arrayBuffer();
    await cache.put(key, cacheableResponse(buf, extractMinTTL(buf)));
  } catch { /* Silent failure. */ }
}

// ─── Main entrypoint ──────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== '/dns-query') {
      return new Response(null, { status: 404 });
    }

    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (method !== 'GET' && method !== 'POST') {
      return new Response(null, { status: 405, headers: { allow: 'GET, POST, OPTIONS' } });
    }

    const search = url.search;
    if (method === 'GET' && !search.includes('dns=')) {
      return new Response('Missing "dns" query parameter', { status: 400 });
    }

    // Read the POST body.
    let body = null;
    let ecs = false;
    if (method === 'POST') {
      body = await request.arrayBuffer();
      ecs = hasECS(body);
    }

    // ── Cache lookup ─────────────────────────────────────
    const cache = caches.default;
    const key = await buildCacheKey(url.origin, method, search, body, ecs);
    const cached = await cache.match(key);

    if (cached) {
      const ts = parseInt(cached.headers.get('x-cache-ts') || '0', 10);
      const ttl = parseInt(cached.headers.get('x-cache-ttl') || String(DEFAULT_TTL), 10);
      const age = (Date.now() - ts) / 1000;

      // TTL is close to expiry, trigger a background refresh.
      if (age > ttl * (1 - PREFETCH_RATIO)) {
        ctx.waitUntil(prefetch(cache, key, method, body, search));
      }
      return dnsResponse(cached.body, ttl, 'HIT');
    }

    // ── Cache miss, race upstreams ───────────────────────
    const upstream = await raceFetch(method, body, search);
    if (!upstream) {
      return new Response('All upstreams failed', { status: 502 });
    }

    const respBody = await upstream.arrayBuffer();
    const ttl = extractMinTTL(respBody);

    // Write to cache asynchronously.
    ctx.waitUntil(cache.put(key, cacheableResponse(respBody.slice(0), ttl)));

    return dnsResponse(respBody, ttl, 'MISS');
  },
};
