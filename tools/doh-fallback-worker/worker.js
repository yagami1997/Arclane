/**
 * doh-fallback-worker v4
 * Last updated: April 7, 2026 10:05 PM PDT
 *
 * A private DoH gateway built on Cloudflare Workers.
 *
 * Public path  /dns-query          — high-performance public DoH, open to all clients
 * Private path /dns-query/<token>  — loads a per-token profile and private rule set from KV
 *
 * Features
 *   1. Token-aware routing — each token maps to an isolated resolution profile stored in KV
 *   2. Private rule matching — exact and suffix domain rules answered locally without hitting upstreams
 *   3. Local DNS response synthesis — binary-correct DNS answers built inside the Worker
 *   4. Normalized cache keys — semantic keys eliminate fragmentation caused by changing transaction IDs
 *   5. Multi-upstream racing — CF / Google / Quad9 / Ali, first success cancels the rest
 *   6. Remaining-TTL cache — clients receive the actual remaining TTL, not the original value
 *   7. Background prefetch — silent refresh when remaining TTL falls below 25 %
 *   8. ECS-aware cache isolation — ECS and non-ECS queries use separate cache entries
 *   9. Stale-if-error — stale cache served when all upstreams fail, within a configurable window
 */

// ─── Upstream registry ────────────────────────────────────────────────────────

const UPSTREAM_URLS = {
  cf:     'https://cloudflare-dns.com/dns-query',
  google: 'https://dns.google/dns-query',
  quad9:  'https://dns11.quad9.net/dns-query',
  ali:    'https://dns.alidns.com/dns-query',
};

const UPSTREAM_TIMEOUT_MS = 1500;

// ─── Default profile (built-in, no KV dependency) ────────────────────────────

const DEFAULT_PROFILE = {
  name: 'default',
  upstreams: ['cf', 'google', 'quad9'],
  privateRules: [],
  cachePolicy: {
    minTtl: 60,
    maxTtl: 86400,
    defaultTtl: 300,
    prefetchRatio: 0.75,     // trigger background refresh when age / ttl exceeds this
    staleIfErrorWindow: 120, // seconds beyond ttl that stale cache may still be served on error
  },
};

// ─── Static response headers ──────────────────────────────────────────────────

const CORS_HEADERS = Object.freeze({
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, accept',
  'access-control-max-age': '86400',
});

const SECURITY_HEADERS = Object.freeze({
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
});

// Pre-merged headers used on every DNS response to avoid repeated object spread
const COMMON_HEADERS = Object.freeze({ ...CORS_HEADERS, ...SECURITY_HEADERS });

const DNS_CONTENT_TYPE = 'application/dns-message';

// ─── DNS constants ────────────────────────────────────────────────────────────

const QTYPE = Object.freeze({ A: 1, NS: 2, CNAME: 5, AAAA: 28, HTTPS: 65, SVCB: 64 });
const QTYPE_NAME = Object.freeze({ 1: 'A', 28: 'AAAA', 5: 'CNAME' });

// DNS header flag masks
const FLAG_QR = 0x8000; // Query/Response
const FLAG_AA = 0x0400; // Authoritative Answer
const FLAG_RD = 0x0100; // Recursion Desired (inherited from query)
const FLAG_RA = 0x0080; // Recursion Available

// ─── DNS wire-format utilities ────────────────────────────────────────────────

/**
 * Advance past a DNS name field (label sequence or compression pointer).
 * Returns the offset of the byte immediately after the name.
 *
 * @param {DataView} view
 * @param {number}   off   starting byte offset
 * @returns {number}
 */
function skipName(view, off) {
  while (off < view.byteLength) {
    const b = view.getUint8(off);
    if (b === 0) return off + 1;           // root label — end of name
    if ((b & 0xc0) === 0xc0) return off + 2; // compression pointer — two bytes total
    off += 1 + b;                           // normal label — skip length + content
  }
  return off;
}

/**
 * Read a DNS name from wire format, returning both the dot-separated string
 * and the wire-level end offset (the byte immediately after the name field).
 *
 * Returning the end offset avoids a redundant second traversal by skipName
 * when the caller needs both the name string and the position after it.
 *
 * Handles compression pointers and includes a depth guard to prevent infinite
 * loops from malformed pointer chains.
 *
 * @param {DataView} view
 * @param {number}   off   starting byte offset
 * @returns {{ name: string, endOff: number }}
 */
function readName(view, off) {
  const labels = [];
  let endOff = -1; // wire-level end (set on first pointer jump)
  let hops = 0;    // pointer-chain depth guard

  while (off < view.byteLength && hops < 16) {
    const len = view.getUint8(off);

    if (len === 0) {
      if (endOff < 0) endOff = off + 1;
      break;
    }

    if ((len & 0xc0) === 0xc0) {
      if (endOff < 0) endOff = off + 2; // record where wire parsing should resume
      off = ((len & 0x3f) << 8) | view.getUint8(off + 1);
      hops++;
      continue;
    }

    off += 1;
    let label = '';
    for (let i = 0; i < len; i++) label += String.fromCharCode(view.getUint8(off + i));
    labels.push(label);
    off += len;
  }

  if (endOff < 0) endOff = off; // no pointer encountered

  return { name: labels.join('.').toLowerCase(), endOff };
}

/**
 * Extract the minimum TTL from a DNS response, ignoring OPT records (type 41)
 * and zero-TTL records (which must not be cached).
 *
 * @param {ArrayBuffer} buf   raw DNS response bytes
 * @param {object}      policy  cachePolicy from the active profile
 * @returns {number}  TTL in seconds, clamped to [minTtl, maxTtl]
 */
function extractMinTTL(buf, policy) {
  const { minTtl, maxTtl, defaultTtl } = policy;
  try {
    const v = new DataView(buf);
    if (buf.byteLength < 12) return defaultTtl;

    const qdcount = v.getUint16(4);
    const rrcount = v.getUint16(6) + v.getUint16(8) + v.getUint16(10);
    if (rrcount === 0) return defaultTtl;

    let off = 12;
    for (let i = 0; i < qdcount; i++) { off = skipName(v, off); off += 4; }

    let min = maxTtl;
    for (let i = 0; i < rrcount && off + 10 <= buf.byteLength; i++) {
      off = skipName(v, off);
      const type = v.getUint16(off);
      off += 4;
      const ttl = v.getUint32(off);
      off += 4;
      off += 2 + v.getUint16(off);
      if (type !== 41 && ttl > 0 && ttl < min) min = ttl;
    }
    return Math.max(minTtl, Math.min(min, maxTtl));
  } catch {
    return defaultTtl;
  }
}

/**
 * Parse the question section of a DNS message and return the fields needed
 * for rule matching, cache key construction, and response synthesis.
 *
 * Accepts the raw ArrayBuffer from either a GET (after base64url decoding)
 * or a POST body.  Returns null if the message is too short or malformed.
 *
 * @param {ArrayBuffer} buf   raw DNS message bytes
 * @returns {{ id: number, flags: number, qname: string, qtype: number, qclass: number, hasECS: boolean } | null}
 */
function parseQuestion(buf) {
  try {
    const v = new DataView(buf);
    if (buf.byteLength < 12) return null;

    const id    = v.getUint16(0);
    const flags = v.getUint16(2);

    const qdcount = v.getUint16(4);
    if (qdcount !== 1) return null; // reject empty or multi-question queries

    // Single-pass: readName returns both the string and the end offset,
    // eliminating the redundant skipName traversal.
    const { name: qname, endOff } = readName(v, 12);
    if (endOff + 4 > buf.byteLength) return null;

    const qtype  = v.getUint16(endOff);
    const qclass = v.getUint16(endOff + 2);

    // Detect ECS in-line instead of re-scanning via hasECS()
    let ecs = false;
    const ancount = v.getUint16(6);
    const nscount = v.getUint16(8);
    const arcount = v.getUint16(10);
    let scanOff = endOff + 4; // past question section
    // Skip answer + authority sections
    for (let i = 0; i < ancount + nscount && scanOff + 10 <= buf.byteLength; i++) {
      scanOff = skipName(v, scanOff);
      scanOff += 8; // TYPE + CLASS + TTL
      scanOff += 2 + v.getUint16(scanOff); // RDLENGTH + RDATA
    }
    // Scan additional section for OPT with ECS
    for (let i = 0; i < arcount && scanOff < buf.byteLength; i++) {
      scanOff = skipName(v, scanOff);
      const rtype = v.getUint16(scanOff);
      scanOff += 8;
      const rdlen = v.getUint16(scanOff);
      scanOff += 2;
      if (rtype === 41) {
        const rend = scanOff + rdlen;
        while (scanOff + 4 <= rend) {
          if (v.getUint16(scanOff) === 8) { ecs = true; break; }
          scanOff += 4 + v.getUint16(scanOff + 2);
        }
        if (ecs) break;
      } else {
        scanOff += rdlen;
      }
    }

    return { id, flags, qname, qtype, qclass, hasECS: ecs };
  } catch {
    return null;
  }
}

/**
 * Decode a base64url-encoded DNS message from a GET request's `dns` parameter.
 *
 * @param {string} encoded   value of the `dns` query parameter
 * @returns {ArrayBuffer | null}
 */
function decodeGetPayload(encoded) {
  try {
    // Convert base64url to standard base64 and restore padding (RFC 8484 omits it)
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad === 2) b64 += '==';
    else if (pad === 3) b64 += '=';
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
  } catch {
    return null;
  }
}

// ─── KV profile + rule loading ────────────────────────────────────────────────

/**
 * Load the profile and private rules for a given token from Cloudflare KV.
 * Returns null if the token does not exist in KV (caller should respond 403).
 *
 * KV key schema:
 *   "profile:<token>"  →  { name, upstreams, cachePolicy }
 *   "rules:<token>"    →  { privateRules: [...] }
 *
 * @param {KVNamespace} kv
 * @param {string}      token
 * @returns {Promise<object | null>}
 */
async function loadProfile(kv, token) {
  // cacheTtl: edge-cache KV results for 300s to avoid repeated origin reads.
  // After updating rules via wrangler, changes propagate within this window.
  const kvOpts = { type: 'json', cacheTtl: 300 };

  const [profile, rules] = await Promise.all([
    kv.get(`profile:${token}`, kvOpts),
    kv.get(`rules:${token}`, kvOpts),
  ]);

  if (profile === null) return null; // unknown token

  // Normalize profile: ensure required fields exist with safe defaults
  return {
    name: profile.name || token,
    upstreams: Array.isArray(profile.upstreams) && profile.upstreams.length > 0
      ? profile.upstreams
      : DEFAULT_PROFILE.upstreams,
    cachePolicy: {
      ...DEFAULT_PROFILE.cachePolicy,
      ...(profile.cachePolicy && typeof profile.cachePolicy === 'object' ? profile.cachePolicy : {}),
    },
    privateRules: Array.isArray(rules?.privateRules) ? rules.privateRules : [],
  };
}

// ─── Private rule matching ────────────────────────────────────────────────────

/**
 * Find the first private rule that matches the given query name and type.
 *
 * Matching modes:
 *   exact  — qname must equal rule.domain exactly
 *   suffix — qname must equal rule.domain OR end with ".<rule.domain>"
 *
 * HTTPS (65) and SVCB (64) queries always return null (pass-through to upstreams)
 * because synthesising empty answers breaks ECH / ALPN negotiation.
 *
 * @param {object[]} rules
 * @param {string}   qname
 * @param {number}   qtype
 * @returns {object | null}
 */
function matchRule(rules, qname, qtype) {
  // Never intercept HTTPS or SVCB — let upstreams handle them
  if (qtype === QTYPE.HTTPS || qtype === QTYPE.SVCB) return null;

  const typeName = QTYPE_NAME[qtype];
  if (!typeName) return null; // unsupported type — pass through

  for (const rule of rules) {
    if (rule.type !== typeName) continue;
    if (rule.match === 'exact'  && qname === rule.domain) return rule;
    if (rule.match === 'suffix' &&
        (qname === rule.domain || qname.endsWith('.' + rule.domain))) return rule;
  }
  return null;
}

// ─── Local DNS response synthesis ─────────────────────────────────────────────

/**
 * Encode a dot-separated domain name into DNS wire format (RFC 1035 §3.1).
 * Each label is prefixed with its length byte; the root is a single zero byte.
 *
 * @param {string} name   e.g. "example.com"
 * @returns {Uint8Array}
 */
function encodeDNSName(name) {
  if (!name || name === '.') return new Uint8Array([0]);
  const labels = name.replace(/\.$/, '').split('.');
  const parts  = [];
  for (const label of labels) {
    parts.push(label.length);
    for (let i = 0; i < label.length; i++) parts.push(label.charCodeAt(i));
  }
  parts.push(0); // root label
  return new Uint8Array(parts);
}

/**
 * Parse a dotted-decimal IPv4 string into a 4-byte Uint8Array.
 *
 * @param {string} ip   e.g. "1.2.3.4"
 * @returns {Uint8Array}
 */
function encodeIPv4(ip) {
  return new Uint8Array(ip.split('.').map(Number));
}

/**
 * Parse a colon-separated IPv6 string into a 16-byte Uint8Array.
 * Handles "::" expansion.
 *
 * @param {string} ip   e.g. "2001:db8::1"
 * @returns {Uint8Array}
 */
function encodeIPv6(ip) {
  // Expand "::" shorthand
  const halves = ip.split('::');
  const left   = halves[0] ? halves[0].split(':') : [];
  const right  = halves[1] ? halves[1].split(':') : [];
  const mid    = new Array(8 - left.length - right.length).fill('0');
  const groups = [...left, ...mid, ...right].map(g => parseInt(g || '0', 16));
  const buf    = new Uint8Array(16);
  groups.forEach((g, i) => { buf[i * 2] = g >> 8; buf[i * 2 + 1] = g & 0xff; });
  return buf;
}

/**
 * Build a single DNS resource record in wire format.
 *
 * NAME is always written as a compression pointer (0xC00C) pointing to the
 * question section at offset 12, which keeps answers compact and avoids
 * duplicating the qname bytes.
 *
 * @param {number}     type    RR type (1, 28, or 5)
 * @param {number}     ttl
 * @param {Uint8Array} rdata
 * @returns {Uint8Array}
 */
function buildRR(type, ttl, rdata) {
  const buf = new Uint8Array(2 + 2 + 2 + 4 + 2 + rdata.length);
  const v   = new DataView(buf.buffer);
  let off   = 0;

  v.setUint16(off, 0xc00c); off += 2; // NAME — pointer to question at offset 12
  v.setUint16(off, type);   off += 2; // TYPE
  v.setUint16(off, 1);      off += 2; // CLASS IN
  v.setUint32(off, ttl);    off += 4; // TTL
  v.setUint16(off, rdata.length); off += 2; // RDLENGTH
  buf.set(rdata, off);

  return buf;
}

/**
 * Synthesise a complete binary DNS response for a matched private rule.
 *
 * The response preserves the original query ID and question section, sets
 * authoritative-answer flags, and includes one answer record per IP/value
 * listed in rule.answers.
 *
 * Supported record types: A (1), AAAA (28), CNAME (5).
 *
 * @param {ArrayBuffer} queryBuf   original DNS query message
 * @param {object}      question   result of parseQuestion()
 * @param {object}      rule       matched private rule
 * @returns {ArrayBuffer | null}   null if synthesis fails
 */
function synthesizeDNSResponse(queryBuf, question, rule) {
  try {
    const qv = new DataView(queryBuf);

    // ── Locate and copy the question section verbatim ────────────────────────
    let qoff = 12;
    qoff = skipName(qv, qoff); // skip qname
    qoff += 4;                  // skip qtype + qclass
    const questionBytes = new Uint8Array(queryBuf, 12, qoff - 12);

    // ── Build answer records ─────────────────────────────────────────────────
    const answers = [];
    for (const value of rule.answers) {
      let rdata;
      if (rule.type === 'A')     rdata = encodeIPv4(value);
      else if (rule.type === 'AAAA') rdata = encodeIPv6(value);
      else if (rule.type === 'CNAME') rdata = encodeDNSName(value);
      else continue;
      answers.push(buildRR(QTYPE[rule.type], rule.ttl, rdata));
    }
    if (answers.length === 0) return null;

    // ── Build DNS header (12 bytes) ──────────────────────────────────────────
    const header = new Uint8Array(12);
    const hv     = new DataView(header.buffer);

    const rdBit    = question.flags & FLAG_RD; // inherit RD from query
    const respFlags = FLAG_QR | FLAG_AA | rdBit | FLAG_RA; // QR=1 AA=1 RA=1 RCODE=0

    hv.setUint16(0, question.id);       // ID
    hv.setUint16(2, respFlags);         // FLAGS
    hv.setUint16(4, 1);                 // QDCOUNT
    hv.setUint16(6, answers.length);    // ANCOUNT
    hv.setUint16(8, 0);                 // NSCOUNT
    hv.setUint16(10, 0);               // ARCOUNT

    // ── Concatenate header + question + answers ──────────────────────────────
    const totalLen = header.length + questionBytes.length +
                     answers.reduce((s, a) => s + a.length, 0);
    const out = new Uint8Array(totalLen);
    let pos = 0;
    out.set(header, pos);       pos += header.length;
    out.set(questionBytes, pos); pos += questionBytes.length;
    for (const ans of answers) { out.set(ans, pos); pos += ans.length; }

    return out.buffer;
  } catch {
    return null;
  }
}

// ─── Normalized cache key ─────────────────────────────────────────────────────

/**
 * Build a semantic cache key that is stable across DNS transaction ID changes.
 *
 * Key format (URL-encoded path):
 *   /ck/<profileName>|<qname>|<qtype>|<qclass>|<ecs>|v1
 *
 * Using a GET Request object satisfies the Cache API, which requires a Request
 * or URL as the key argument.
 *
 * @param {string}       origin    request origin (e.g. "https://worker.example.com")
 * @param {string|null}  token     private token, or null for the public path
 * @param {object}       question  result of parseQuestion()
 * @returns {Request}
 */
function buildCacheKey(origin, token, question) {
  const semantic = [
    token ?? '__public__',
    question.qname,
    question.qtype,
    question.qclass,
    question.hasECS ? '1' : '0',
    'v1',
  ].join('|');
  return new Request(`${origin}/ck/${encodeURIComponent(semantic)}`, { method: 'GET' });
}

// ─── Cache response helpers ───────────────────────────────────────────────────

/**
 * Wrap a DNS response buffer in a Response suitable for writing to the Cache API.
 *
 * The Cache-Control max-age is set to ttl + staleIfErrorWindow so Cloudflare's
 * cache keeps the entry alive during the stale window.  Freshness is determined
 * by comparing the current time against x-cache-ts + x-cache-ttl rather than
 * relying on the Cache API's own expiry logic.
 *
 * @param {ArrayBuffer} buf
 * @param {number}      ttl              original DNS TTL in seconds
 * @param {number}      staleIfErrorWindow  extra seconds to retain beyond ttl
 * @returns {Response}
 */
function makeCacheableResponse(buf, ttl, staleIfErrorWindow = 120) {
  return new Response(buf, {
    status: 200,
    headers: {
      'content-type':  DNS_CONTENT_TYPE,
      'cache-control': `public, max-age=${ttl + staleIfErrorWindow}`,
      'x-cache-ts':    String(Date.now()),
      'x-cache-ttl':   String(ttl),
    },
  });
}

/**
 * Build the response returned to the client from a cache hit.
 * Computes the remaining TTL and includes an Age header.
 *
 * @param {Response} cached      stored Cache API entry
 * @param {string}   cacheStatus "HIT" | "STALE"
 * @returns {Response}
 */
function buildCacheHitResponse(cached, cacheStatus) {
  const ts        = parseInt(cached.headers.get('x-cache-ts')  || '0', 10);
  const origTtl   = parseInt(cached.headers.get('x-cache-ttl') || '300', 10);
  const ageSeconds = Math.floor((Date.now() - ts) / 1000);
  const remaining  = Math.max(0, origTtl - ageSeconds);

  return new Response(cached.body, {
    status: 200,
    headers: {
      'content-type':   DNS_CONTENT_TYPE,
      'cache-control':  `public, max-age=${remaining}`,
      'age':            String(ageSeconds),
      'x-cache':        cacheStatus,
      ...COMMON_HEADERS,
    },
  });
}

// ─── Upstream response helper ─────────────────────────────────────────────────

/**
 * Build the response returned to the client from a fresh upstream fetch.
 *
 * @param {ArrayBuffer} buf
 * @param {number}      ttl
 * @returns {Response}
 */
function buildUpstreamResponse(buf, ttl) {
  return new Response(buf, {
    status: 200,
    headers: {
      'content-type':  DNS_CONTENT_TYPE,
      'cache-control': `public, max-age=${ttl}`,
      'age':           '0',
      'x-cache':       'MISS',
      ...COMMON_HEADERS,
    },
  });
}

// ─── Error helpers ────────────────────────────────────────────────────────────

function errorResponse(status, message) {
  return new Response(message, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      ...COMMON_HEADERS,
    },
  });
}

// ─── Multi-upstream racing ────────────────────────────────────────────────────

/**
 * Dispatch a DoH request to multiple upstreams simultaneously.
 * The first successful response cancels all remaining in-flight requests.
 * A shared timeout aborts everything if no upstream replies in time.
 *
 * @param {string[]}     upstreamKeys   ordered list of keys into UPSTREAM_URLS
 * @param {string}       method         "GET" or "POST"
 * @param {ArrayBuffer|null} body       POST body (null for GET)
 * @param {string}       search         raw query string including "?"
 * @returns {Promise<Response | null>}
 */
async function raceFetch(upstreamKeys, method, body, search) {
  const controllers = upstreamKeys.map(() => new AbortController());
  const timer = setTimeout(
    () => controllers.forEach(c => c.abort()),
    UPSTREAM_TIMEOUT_MS,
  );

  const promises = upstreamKeys.map((key, idx) => {
    const url     = UPSTREAM_URLS[key];
    const target  = method === 'GET' ? url + search : url;
    const headers = { accept: DNS_CONTENT_TYPE };
    if (method === 'POST') headers['content-type'] = DNS_CONTENT_TYPE;

    return fetch(target, {
      method,
      headers,
      body:   method === 'POST' ? body : null,
      signal: controllers[idx].signal,
    }).then(res => {
      if (!res.ok) throw new Error(`upstream ${key} returned ${res.status}`);
      controllers.forEach((c, i) => { if (i !== idx) c.abort(); }); // cancel losers
      return res;
    });
  });

  try {
    return await Promise.any(promises);
  } catch {
    return null; // all upstreams failed or timed out
  } finally {
    clearTimeout(timer);
  }
}

// ─── Background prefetch ──────────────────────────────────────────────────────

/**
 * Silently refresh a cache entry in the background.
 * Called via ctx.waitUntil() so it does not block the client response.
 *
 * @param {Cache}        cache
 * @param {Request}      key
 * @param {string[]}     upstreamKeys
 * @param {string}       method
 * @param {ArrayBuffer|null} body
 * @param {string}       search
 * @param {object}       cachePolicy
 */
async function prefetch(cache, key, upstreamKeys, method, body, search, cachePolicy) {
  try {
    const res = await raceFetch(upstreamKeys, method, body, search);
    if (!res) return;
    const buf = await res.arrayBuffer();
    await cache.put(key, makeCacheableResponse(buf, extractMinTTL(buf, cachePolicy), cachePolicy.staleIfErrorWindow));
  } catch { /* silent — prefetch failure is non-fatal */ }
}

// ─── Main fetch handler ───────────────────────────────────────────────────────

export default {
  /**
   * @param {Request}         request
   * @param {{ DOH_KV: KVNamespace }} env
   * @param {ExecutionContext} ctx
   */
  async fetch(request, env, ctx) {
    const url    = new URL(request.url);
    const method = request.method;

    // ── CORS preflight ───────────────────────────────────────────────────────
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (method !== 'GET' && method !== 'POST') {
      return new Response(null, { status: 405, headers: { allow: 'GET, POST, OPTIONS' } });
    }

    // ── Path routing — extract optional token ────────────────────────────────
    // Accepted paths: /dns-query  or  /dns-query/<token>
    const pathMatch = url.pathname.match(/^\/dns-query(?:\/([^/]+))?$/);
    if (!pathMatch) return errorResponse(404, 'Not found');

    const token = pathMatch[1] ?? null; // undefined → null for clarity

    // ── Profile resolution ───────────────────────────────────────────────────
    let profile;
    if (token === null) {
      profile = DEFAULT_PROFILE;
    } else {
      const loaded = await loadProfile(env.DOH_KV, token);
      if (loaded === null) return errorResponse(403, 'Unknown token');
      profile = loaded;
    }

    // ── Read DNS payload ─────────────────────────────────────────────────────
    let dnsBuf; // ArrayBuffer containing the raw DNS query message
    const search = url.search;

    if (method === 'GET') {
      const dnsParam = url.searchParams.get('dns');
      if (!dnsParam) return errorResponse(400, 'Missing "dns" query parameter');
      dnsBuf = decodeGetPayload(dnsParam);
      if (!dnsBuf) return errorResponse(400, 'Invalid base64url in "dns" parameter');
    } else {
      dnsBuf = await request.arrayBuffer();
    }

    // ── Parse DNS question ───────────────────────────────────────────────────
    const question = parseQuestion(dnsBuf);
    if (!question) return errorResponse(400, 'Malformed DNS query');

    const { cachePolicy } = profile;

    // ── Cache lookup ─────────────────────────────────────────────────────────
    const cache    = caches.default;
    const cacheKey = buildCacheKey(url.origin, token, question);
    const cached   = await cache.match(cacheKey);

    // Evaluate freshness manually so we can distinguish HIT vs STALE.
    // The stored max-age is ttl + staleWindow, so cache.match() returns the
    // entry during both the fresh window and the stale window.
    let staleCandidate = null;

    if (cached) {
      const ts      = parseInt(cached.headers.get('x-cache-ts')  || '0', 10);
      const origTtl = parseInt(cached.headers.get('x-cache-ttl') || String(cachePolicy.defaultTtl), 10);
      const age     = (Date.now() - ts) / 1000;

      if (age <= origTtl) {
        // Fresh hit — trigger background refresh if approaching expiry
        if (age / origTtl >= cachePolicy.prefetchRatio) {
          ctx.waitUntil(
            prefetch(cache, cacheKey, profile.upstreams, method, dnsBuf, search, cachePolicy),
          );
        }
        return buildCacheHitResponse(cached, 'HIT');
      }

      // Entry is stale — keep it as a fallback for upstream failure
      staleCandidate = cached;
    }

    // ── Private rule matching ─────────────────────────────────────────────────
    const rule = matchRule(profile.privateRules, question.qname, question.qtype);

    if (rule) {
      const synthBuf = synthesizeDNSResponse(dnsBuf, question, rule);
      if (synthBuf) {
        // Cache the synthesized response under its semantic key
        ctx.waitUntil(cache.put(cacheKey, makeCacheableResponse(synthBuf.slice(0), rule.ttl, cachePolicy.staleIfErrorWindow)));
        return buildUpstreamResponse(synthBuf, rule.ttl);
      }
      // Synthesis failed — fall through to upstream
    }

    // ── Upstream fetch ────────────────────────────────────────────────────────
    const upstreamRes = await raceFetch(profile.upstreams, method, dnsBuf, search);

    if (!upstreamRes) {
      // All upstreams failed — serve stale cache if available within the error window
      if (staleCandidate) return buildCacheHitResponse(staleCandidate, 'STALE');
      return errorResponse(502, 'All upstreams failed and no cached response is available');
    }

    const respBuf = await upstreamRes.arrayBuffer();
    const ttl     = extractMinTTL(respBuf, cachePolicy);

    ctx.waitUntil(
      cache.put(cacheKey, makeCacheableResponse(respBuf.slice(0), ttl, cachePolicy.staleIfErrorWindow)),
    );

    return buildUpstreamResponse(respBuf, ttl);
  },
};
