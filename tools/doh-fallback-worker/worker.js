/**
 * doh-fallback-worker v4
 * Last updated: July 25, 2026
 *
 * A private DoH gateway built on Cloudflare Workers.
 *
 * Public path  /dns-query          — disabled by default; opt in with ALLOW_PUBLIC_DOH=true
 * Private path /dns-query/<token>  — loads a per-token profile and private rule set from KV
 *
 * Features
 *   1. Token-aware routing — each token maps to an isolated resolution profile stored in KV
 *   2. Private rule matching — exact and suffix domain rules answered locally without hitting upstreams
 *   3. Local DNS response synthesis — binary-correct DNS answers built inside the Worker
 *   4. Normalized cache keys — semantic keys eliminate fragmentation caused by changing transaction IDs
 *   5. Validated multi-upstream racing — malformed and DNS error responses do not win
 *   6. Remaining-TTL cache — clients receive the actual remaining TTL, not the original value
 *   7. Hot-only prefetch — refresh after 85 % age only for repeated hits and TTL >= 60s
 *   8. Flag-aware cache isolation — DO/RD/AD/CD bits are part of the cache key
 *   9. Stale-if-error — stale cache served when all upstreams fail, within a configurable window
 *  10. Isolate-local singleflight — concurrent misses and prefetches share one upstream operation
 */

// ─── Upstream registry ────────────────────────────────────────────────────────

const UPSTREAM_URLS = {
  cf:     'https://cloudflare-dns.com/dns-query',
  google: 'https://dns.google/dns-query',
  quad9:  'https://dns11.quad9.net/dns-query',
};

const UPSTREAM_TIMEOUT_MS = 1500;
const DEFAULT_HEDGE_DELAYS_MS = Object.freeze([0, 35, 80]);
const MIN_PREFETCH_TTL = 60;
const HOT_ENTRY_WINDOW_MS = 5 * 60 * 1000;
const HOT_ENTRY_MIN_HITS = 2;
const MAX_HOT_ENTRY_TRACKING = 512;
const PROFILE_MEMORY_TTL_MS = 120_000;
const MAX_PROFILE_MEMORY_ENTRIES = 64;
const MAX_DNS_MESSAGE_BYTES = 4096;
const MAX_GET_DNS_PARAM_CHARS = 5464; // base64url size for a 4 KiB DNS message
const MAX_REQUEST_URL_CHARS = 8192;
const MAX_ADDITIONAL_RECORDS = 16;
const STALE_CLIENT_TTL = 15;
const CACHE_KEY_VERSION = 'v3';

// ─── Default profile (built-in, no KV dependency) ────────────────────────────

const DEFAULT_PROFILE = {
  name: 'default',
  revision: 1,
  upstreams: ['cf', 'google', 'quad9'],
  hedgeDelays: DEFAULT_HEDGE_DELAYS_MS,
  privateRules: [],
  cachePolicy: {
    minTtl: 0,
    maxTtl: 86400,
    defaultTtl: 300,
    prefetchRatio: 0.85,     // trigger background refresh when age / ttl exceeds this
    staleIfErrorWindow: 120, // seconds beyond ttl that stale cache may still be served on error
  },
};

const PUBLIC_PROFILE = Object.freeze({
  ...DEFAULT_PROFILE,
  name: 'public',
  upstreams: Object.freeze(['cf']),
  hedgeDelays: Object.freeze([0]),
});

// Best-effort isolate-local coordination. These maps are deliberately bounded
// or short-lived; correctness never depends on state surviving isolate churn.
const inflightQueries = new Map();
const hotCacheEntries = new Map();
const profileMemoryCache = new Map();
const inflightProfileLoads = new Map();

// ─── Static response headers ──────────────────────────────────────────────────

const CORS_HEADERS = Object.freeze({
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, accept, authorization',
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
const FLAG_AD = 0x0020; // Authentic Data
const FLAG_CD = 0x0010; // Checking Disabled
const EDNS_FLAG_DO = 0x8000; // DNSSEC OK in OPT flags

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
  const start = off;
  while (off < view.byteLength) {
    const b = view.getUint8(off);
    if (b === 0) return off + 1;           // root label — end of name
    if ((b & 0xc0) === 0xc0) {
      if (off + 1 >= view.byteLength) throw new Error('truncated DNS compression pointer');
      const pointer = ((b & 0x3f) << 8) | view.getUint8(off + 1);
      if (pointer >= view.byteLength) throw new Error('DNS compression pointer out of bounds');
      return off + 2;
    }
    if ((b & 0xc0) !== 0 || b > 63) throw new Error('invalid DNS label');
    off += 1 + b;                           // normal label — skip length + content
    if (off > view.byteLength || off - start > 255) throw new Error('invalid DNS name length');
  }
  throw new Error('unterminated DNS name');
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
  let wireLength = 1;
  const visited = new Set();

  while (off < view.byteLength && hops < 32) {
    if (visited.has(off)) throw new Error('DNS compression pointer loop');
    visited.add(off);
    const len = view.getUint8(off);

    if (len === 0) {
      if (endOff < 0) endOff = off + 1;
      break;
    }

    if ((len & 0xc0) === 0xc0) {
      if (off + 1 >= view.byteLength) throw new Error('truncated DNS compression pointer');
      if (endOff < 0) endOff = off + 2; // record where wire parsing should resume
      off = ((len & 0x3f) << 8) | view.getUint8(off + 1);
      if (off >= view.byteLength) throw new Error('DNS compression pointer out of bounds');
      hops++;
      continue;
    }

    if ((len & 0xc0) !== 0 || len > 63) throw new Error('invalid DNS label');
    if (off + 1 + len > view.byteLength) throw new Error('truncated DNS label');
    off += 1;
    let label = '';
    for (let i = 0; i < len; i++) label += String.fromCharCode(view.getUint8(off + i));
    labels.push(label);
    off += len;
    wireLength += len + 1;
    if (wireLength > 255) throw new Error('DNS name exceeds 255 wire bytes');
  }

  if (hops >= 32 || off >= view.byteLength) throw new Error('unterminated DNS name');
  if (endOff < 0) endOff = off + 1; // no pointer encountered

  return { name: labels.join('.').toLowerCase(), endOff };
}

function nameFieldUsesCompression(view, off) {
  while (off < view.byteLength) {
    const len = view.getUint8(off);
    if ((len & 0xc0) === 0xc0) return true;
    if (len === 0) return false;
    off += 1 + len;
  }
  throw new Error('unterminated DNS name');
}

function skipQuestions(view, count) {
  let off = 12;
  for (let i = 0; i < count; i++) {
    off = skipName(view, off);
    if (off + 4 > view.byteLength) throw new Error('truncated DNS question');
    off += 4;
  }
  return off;
}

/**
 * Walk all resource records and expose the offsets needed for TTL handling.
 * Throws if any record is truncated or malformed.
 */
function walkResourceRecords(buf, visitor) {
  const view = new DataView(buf);
  if (buf.byteLength < 12) throw new Error('truncated DNS header');

  const counts = [view.getUint16(6), view.getUint16(8), view.getUint16(10)];
  let off = skipQuestions(view, view.getUint16(4));

  for (let section = 0; section < counts.length; section++) {
    for (let i = 0; i < counts[section]; i++) {
      const nameOff = off;
      off = skipName(view, off);
      if (off + 10 > view.byteLength) throw new Error('truncated DNS resource record');
      const type = view.getUint16(off);
      const ttlOff = off + 4;
      const ttl = view.getUint32(ttlOff);
      const rdlength = view.getUint16(off + 8);
      const rdataOff = off + 10;
      const endOff = rdataOff + rdlength;
      if (endOff > view.byteLength) throw new Error('truncated DNS RDATA');
      visitor({ view, section, nameOff, type, ttlOff, ttl, rdataOff, rdlength, endOff });
      off = endOff;
    }
  }

  if (off !== view.byteLength) throw new Error('unexpected trailing DNS bytes');
}

/**
 * RFC 2308 negative cache TTL is min(SOA RR TTL, SOA.MINIMUM).
 */
function readSoaNegativeTTL(record) {
  const { view, rdataOff, endOff, ttl } = record;
  let off = skipName(view, rdataOff);
  off = skipName(view, off);
  if (off + 20 !== endOff) throw new Error('malformed SOA RDATA');
  const minimum = view.getUint32(off + 16);
  return Math.min(ttl, minimum);
}

function analyzeResponseTtls(buf) {
  const view = new DataView(buf);
  if (buf.byteLength < 12 || view.getUint16(4) !== 1) {
    throw new Error('response must contain exactly one question');
  }
  const questionEnd = skipName(view, 12);
  if (questionEnd + 4 > buf.byteLength) throw new Error('truncated response question');

  const requestedType = view.getUint16(questionEnd);
  const rcode = view.getUint16(2) & 0x000f;
  const answerCount = view.getUint16(6);
  let minTtl = Infinity;
  let negativeTtl = null;
  let hasRequestedAnswer = false;

  walkResourceRecords(buf, record => {
    if (record.type === 41) return; // OPT TTL field contains EDNS metadata
    minTtl = Math.min(minTtl, record.ttl);
    if (record.section === 0 &&
        (record.type === requestedType || requestedType === 255)) {
      hasRequestedAnswer = true;
    }
    if (record.section === 1 && record.type === 6) {
      negativeTtl = Math.min(negativeTtl ?? Infinity, readSoaNegativeTTL(record));
    }
  });

  const isNegative = rcode === 3 ||
    (rcode === 0 &&
      (answerCount === 0 || (!hasRequestedAnswer && negativeTtl !== null)));
  return { isNegative, minTtl, negativeTtl };
}

/**
 * Determine how long the Worker may cache a validated DNS response.
 * Positive answers use the lowest RR TTL. NXDOMAIN and NODATA use the
 * Authority SOA according to RFC 2308.
 */
function extractCacheTTL(buf, policy) {
  const { minTtl, maxTtl, defaultTtl } = policy;
  try {
    const analysis = analyzeResponseTtls(buf);
    // RFC 2308 provides no negative lifetime without an Authority SOA.
    // Fail closed instead of inventing a five-minute negative cache entry.
    const raw = analysis.isNegative
      ? (analysis.negativeTtl ?? 0)
      : (analysis.minTtl === Infinity ? defaultTtl : analysis.minTtl);
    if (raw <= 0) return 0;
    return Math.max(minTtl, Math.min(raw, maxTtl));
  } catch {
    return 0; // validation/parsing failures must never enter cache
  }
}

/**
 * Copy a cached DNS response, restore the current transaction ID, and update
 * every ordinary RR TTL. OPT's TTL field is EDNS metadata and is untouched.
 */
function prepareCachedDnsResponse(
  buf,
  transactionId,
  ageSeconds,
  stale = false,
  cacheTtl = Infinity,
  queryBuf = null,
  copy = true,
) {
  const out = copy ? buf.slice(0) : buf;
  const view = new DataView(out);
  if (out.byteLength < 12) throw new Error('truncated cached DNS response');
  view.setUint16(0, transactionId);

  if (queryBuf) {
    const queryView = new DataView(queryBuf);
    if (nameFieldUsesCompression(view, 12) || nameFieldUsesCompression(queryView, 12)) {
      throw new Error('compressed DNS question is not safe to rewrite');
    }
    const cachedQuestionEnd = skipName(view, 12) + 4;
    const currentQuestionEnd = skipName(queryView, 12) + 4;
    if (cachedQuestionEnd !== currentQuestionEnd ||
        cachedQuestionEnd > out.byteLength ||
        currentQuestionEnd > queryBuf.byteLength) {
      throw new Error('cached DNS question layout mismatch');
    }
    new Uint8Array(out).set(
      new Uint8Array(queryBuf, 12, currentQuestionEnd - 12),
      12,
    );
  }

  const negative = analyzeResponseTtls(out).isNegative;

  walkResourceRecords(out, record => {
    if (record.type === 41) return;
    let ttl = stale
      ? Math.min(record.ttl, STALE_CLIENT_TTL)
      : Math.max(0, record.ttl - ageSeconds);
    // A negative answer's effective lifetime is min(SOA TTL, SOA.MINIMUM).
    // Cap the cached Authority SOA at the Worker's remaining RFC 2308 TTL so
    // an unchanged MINIMUM field cannot extend negative caching on every hit.
    if (!stale && negative && record.section === 1 && record.type === 6) {
      ttl = Math.min(ttl, Math.max(0, cacheTtl - ageSeconds));
    }
    record.view.setUint32(record.ttlOff, ttl);
  });
  return out;
}

/**
 * Parse the question section of a DNS message and return the fields needed
 * for rule matching, cache key construction, and response synthesis.
 *
 * Accepts the raw ArrayBuffer from either a GET (after base64url decoding)
 * or a POST body.  Returns null if the message is too short or malformed.
 *
 * @param {ArrayBuffer} buf   raw DNS message bytes
 * @returns {{ id: number, flags: number, qname: string, qtype: number, qclass: number, hasECS: boolean, dnssecOk: boolean, recursionDesired: boolean, authenticData: boolean, checkingDisabled: boolean, hasUnknownEdnsOption: boolean } | null}
 */
function parseQuestion(buf) {
  try {
    const v = new DataView(buf);
    if (buf.byteLength < 12 || buf.byteLength > MAX_DNS_MESSAGE_BYTES) return null;

    const id    = v.getUint16(0);
    const flags = v.getUint16(2);
    if ((flags & FLAG_QR) !== 0 || (flags & 0x7800) !== 0) return null;

    const qdcount = v.getUint16(4);
    if (qdcount !== 1) return null; // reject empty or multi-question queries
    if (v.getUint16(6) !== 0 || v.getUint16(8) !== 0) return null;

    // Single-pass: readName returns both the string and the end offset,
    // eliminating the redundant skipName traversal.
    const { name: qname, endOff } = readName(v, 12);
    if (endOff + 4 > buf.byteLength) return null;

    const qtype  = v.getUint16(endOff);
    const qclass = v.getUint16(endOff + 2);

    // Detect ECS in-line instead of re-scanning via hasECS()
    let ecs = false;
    let dnssecOk = false;
    let unknownEdnsOption = false;
    let optCount = 0;
    const arcount = v.getUint16(10);
    if (arcount > MAX_ADDITIONAL_RECORDS) return null;
    let scanOff = endOff + 4; // past question section
    // Scan additional section for OPT with ECS
    for (let i = 0; i < arcount; i++) {
      const nameStart = scanOff;
      scanOff = skipName(v, scanOff);
      if (scanOff + 10 > buf.byteLength) return null;
      const rtype = v.getUint16(scanOff);
      const ttl = v.getUint32(scanOff + 4);
      const rdlen = v.getUint16(scanOff + 8);
      scanOff += 10;
      const rend = scanOff + rdlen;
      if (rend > buf.byteLength) return null;
      if (rtype === 41) {
        optCount++;
        if (optCount > 1 || v.getUint8(nameStart) !== 0 || (ttl >>> 16) !== 0) return null;
        dnssecOk ||= (ttl & EDNS_FLAG_DO) !== 0;
        if ((ttl & 0x7fff) !== 0) unknownEdnsOption = true;
        while (scanOff + 4 <= rend) {
          const optionCode = v.getUint16(scanOff);
          const optionLength = v.getUint16(scanOff + 2);
          scanOff += 4;
          if (scanOff + optionLength > rend) return null;
          if (optionCode === 8) ecs = true;
          // Padding does not change DNS semantics; all other options are
          // conservatively uncacheable until represented in the cache key.
          else if (optionCode !== 12) unknownEdnsOption = true;
          scanOff += optionLength;
        }
        if (scanOff !== rend) return null;
      } else unknownEdnsOption = true; // additional data is not represented in the cache key
      scanOff = rend;
    }
    if (scanOff !== buf.byteLength) return null;

    return {
      id,
      flags,
      qname,
      qtype,
      qclass,
      compressedQuestion: nameFieldUsesCompression(v, 12),
      hasECS: ecs,
      dnssecOk,
      recursionDesired: (flags & FLAG_RD) !== 0,
      authenticData: (flags & FLAG_AD) !== 0,
      checkingDisabled: (flags & FLAG_CD) !== 0,
      hasUnknownEdnsOption: unknownEdnsOption,
    };
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

function boundedNumber(value, fallback, min, max) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function normalizeCachePolicy(policy) {
  const source = policy && typeof policy === 'object' ? policy : {};
  const maxTtl = Math.floor(
    boundedNumber(source.maxTtl, DEFAULT_PROFILE.cachePolicy.maxTtl, 0, 604800),
  );
  return {
    minTtl: Math.floor(
      boundedNumber(source.minTtl, DEFAULT_PROFILE.cachePolicy.minTtl, 0, maxTtl),
    ),
    maxTtl,
    defaultTtl: Math.floor(
      boundedNumber(source.defaultTtl, DEFAULT_PROFILE.cachePolicy.defaultTtl, 0, maxTtl),
    ),
    prefetchRatio: boundedNumber(
      source.prefetchRatio,
      DEFAULT_PROFILE.cachePolicy.prefetchRatio,
      0,
      1,
    ),
    staleIfErrorWindow: Math.floor(
      boundedNumber(
        source.staleIfErrorWindow,
        DEFAULT_PROFILE.cachePolicy.staleIfErrorWindow,
        0,
        3600,
      ),
    ),
  };
}

function normalizeHedgeDelays(delays, count) {
  const source = Array.isArray(delays) ? delays : DEFAULT_HEDGE_DELAYS_MS;
  const normalized = [];
  let previous = 0;
  for (let i = 0; i < count; i++) {
    const fallback = DEFAULT_HEDGE_DELAYS_MS[i] ??
      DEFAULT_HEDGE_DELAYS_MS[DEFAULT_HEDGE_DELAYS_MS.length - 1];
    const delay = i === 0
      ? 0
      : Math.floor(boundedNumber(source[i], fallback, previous, UPSTREAM_TIMEOUT_MS - 1));
    normalized.push(delay);
    previous = delay;
  }
  return normalized;
}

/**
 * Load the profile and private rules for a given token from Cloudflare KV.
 * Returns null if the token does not exist in KV (caller should respond 403).
 *
 * KV key schema:
 *   "profile:<token>"  →  { name, revision, upstreams, hedgeDelays, cachePolicy }
 *   "rules:<token>"    →  { privateRules: [...] }
 *
 * @param {KVNamespace} kv
 * @param {string}      token
 * @returns {Promise<object | null>}
 */
async function fetchProfileFromKv(kv, token) {
  // cacheTtl: edge-cache KV results for 300s to avoid repeated origin reads.
  // After updating rules via wrangler, changes propagate within this window.
  const kvOpts = { type: 'json', cacheTtl: 300 };

  const [profile, rules] = await Promise.all([
    kv.get(`profile:${token}`, kvOpts),
    kv.get(`rules:${token}`, kvOpts),
  ]);

  if (profile === null) return null; // unknown token

  const configuredUpstreams = Array.isArray(profile.upstreams)
    ? profile.upstreams.filter(key => Object.hasOwn(UPSTREAM_URLS, key))
    : [];
  const upstreams = configuredUpstreams.length > 0
    ? configuredUpstreams
    : DEFAULT_PROFILE.upstreams;

  // Normalize profile: ensure required fields exist with safe defaults
  return {
    name: profile.name || token,
    revision: Number.isSafeInteger(profile.revision) && profile.revision >= 0
      ? profile.revision
      : DEFAULT_PROFILE.revision,
    upstreams,
    hedgeDelays: normalizeHedgeDelays(profile.hedgeDelays, upstreams.length),
    cachePolicy: normalizeCachePolicy(profile.cachePolicy),
    privateRules: Array.isArray(rules?.privateRules) ? rules.privateRules : [],
  };
}

async function loadProfile(kv, token) {
  const now = Date.now();
  const cached = profileMemoryCache.get(token);
  if (cached && cached.expiresAt > now) {
    profileMemoryCache.delete(token);
    profileMemoryCache.set(token, cached);
    return cached.profile;
  }
  if (cached) profileMemoryCache.delete(token);

  const existing = inflightProfileLoads.get(token);
  if (existing) return existing;

  const load = fetchProfileFromKv(kv, token)
    .then(profile => {
      // Do not cache unknown tokens: random scans must not fill isolate memory.
      if (profile) {
        profileMemoryCache.set(token, {
          profile,
          expiresAt: Date.now() + PROFILE_MEMORY_TTL_MS,
        });
        if (profileMemoryCache.size > MAX_PROFILE_MEMORY_ENTRIES) {
          profileMemoryCache.delete(profileMemoryCache.keys().next().value);
        }
      }
      return profile;
    })
    .finally(() => {
      if (inflightProfileLoads.get(token) === load) inflightProfileLoads.delete(token);
    });

  inflightProfileLoads.set(token, load);
  return load;
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
 *   /ck/v3/<token>/<revision>/<qname>/<qtype>/<qclass>/<do>/<rd>/<ad>/<cd>
 *
 * Using a GET Request object satisfies the Cache API, which requires a Request
 * or URL as the key argument.
 *
 * @param {string}       origin    request origin (e.g. "https://worker.example.com")
 * @param {string|null}  token     private token, or null for the public path
 * @param {object}       profile   active profile
 * @param {object}       question  result of parseQuestion()
 * @returns {Request}
 */
function buildCacheKey(origin, token, profile, question) {
  const components = [
    CACHE_KEY_VERSION,
    token ?? '__public__',
    profile.revision,
    question.qname,
    question.qtype,
    question.qclass,
    question.dnssecOk ? '1' : '0',
    question.recursionDesired ? '1' : '0',
    question.authenticData ? '1' : '0',
    question.checkingDisabled ? '1' : '0',
  ];
  const path = components
    .map(component => encodeURIComponent(String(component)))
    .join('/');
  return new Request(`${origin}/ck/${path}`, { method: 'GET' });
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
 * @param {number}   transactionId current query ID
 * @param {ArrayBuffer} queryBuf current raw DNS query
 * @returns {Promise<Response>}
 */
async function buildCacheHitResponse(cached, cacheStatus, transactionId, queryBuf) {
  const ts        = parseInt(cached.headers.get('x-cache-ts')  || '0', 10);
  const origTtl   = parseInt(cached.headers.get('x-cache-ttl') || '300', 10);
  const ageSeconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  const remaining  = Math.max(0, origTtl - ageSeconds);
  const stale = cacheStatus === 'STALE';
  const buf = await cached.arrayBuffer();
  const dnsResponse = prepareCachedDnsResponse(
    buf,
    transactionId,
    ageSeconds,
    stale,
    origTtl,
    queryBuf,
    false,
  );
  const clientTtl = stale ? STALE_CLIENT_TTL : remaining;

  return new Response(dnsResponse, {
    status: 200,
    headers: {
      'content-type':   DNS_CONTENT_TYPE,
      'cache-control':  `public, max-age=${clientTtl}`,
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

function validateDnsResponse(buf, question) {
  const view = new DataView(buf);
  if (buf.byteLength < 12 || buf.byteLength > 65535) throw new Error('invalid DNS response size');

  const flags = view.getUint16(2);
  const rcode = flags & 0x000f;
  if ((flags & FLAG_QR) === 0) throw new Error('upstream returned a DNS query');
  if ((flags & 0x0200) !== 0) throw new Error('truncated DNS response');
  if (view.getUint16(0) !== question.id) throw new Error('DNS transaction ID mismatch');
  if (view.getUint16(4) !== 1) throw new Error('unexpected DNS question count');
  if (rcode !== 0 && rcode !== 3) throw new Error(`unacceptable DNS RCODE ${rcode}`);

  const { name, endOff } = readName(view, 12);
  if (nameFieldUsesCompression(view, 12)) {
    throw new Error('compressed upstream response question');
  }
  if (endOff + 4 > buf.byteLength) throw new Error('truncated response question');
  if (name !== question.qname ||
      view.getUint16(endOff) !== question.qtype ||
      view.getUint16(endOff + 2) !== question.qclass) {
    throw new Error('DNS response question mismatch');
  }

  let extendedRcode = 0;
  let optCount = 0;
  walkResourceRecords(buf, record => {
    if (record.type === 41) {
      optCount++;
      if (optCount > 1 ||
          record.section !== 2 ||
          record.view.getUint8(record.nameOff) !== 0 ||
          record.view.getUint8(record.ttlOff + 1) !== 0) {
        throw new Error('malformed upstream OPT record');
      }
      extendedRcode = record.view.getUint8(record.ttlOff);
    }
  });
  if (extendedRcode !== 0) throw new Error(`unacceptable extended DNS RCODE ${extendedRcode}`);
  return buf;
}

/**
 * Dispatch a DoH request to multiple upstreams simultaneously.
 * The first fully read and validated response cancels all remaining requests.
 * A shared timeout aborts everything if no upstream replies in time.
 *
 * @param {string[]}     upstreamKeys   ordered list of keys into UPSTREAM_URLS
 * @param {string}       method         "GET" or "POST"
 * @param {ArrayBuffer|null} body       POST body (null for GET)
 * @param {string}       search         raw query string including "?"
 * @param {object}       question       parsed request question
 * @param {number[]}     hedgeDelays    absolute start delay per upstream
 * @returns {Promise<ArrayBuffer | null>}
 */
async function raceFetch(
  upstreamKeys,
  method,
  body,
  search,
  question,
  hedgeDelays = DEFAULT_HEDGE_DELAYS_MS,
) {
  const controllers = upstreamKeys.map(() => new AbortController());
  const timer = setTimeout(
    () => controllers.forEach(c => c.abort()),
    UPSTREAM_TIMEOUT_MS,
  );

  const promises = upstreamKeys.map(async (key, idx) => {
    const hedgeDelay = hedgeDelays[idx] ?? DEFAULT_HEDGE_DELAYS_MS[idx] ?? 80;
    if (hedgeDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, hedgeDelay));
    }
    if (controllers[idx].signal.aborted) {
      throw new Error(`upstream ${key} hedge was cancelled before dispatch`);
    }
    const url     = UPSTREAM_URLS[key];
    const target  = method === 'GET' ? url + search : url;
    const headers = { accept: DNS_CONTENT_TYPE };
    if (method === 'POST') headers['content-type'] = DNS_CONTENT_TYPE;

    return fetch(target, {
      method,
      headers,
      body:   method === 'POST' ? body : null,
      signal: controllers[idx].signal,
    }).then(async res => {
      if (!res.ok) throw new Error(`upstream ${key} returned ${res.status}`);
      const contentType = (res.headers.get('content-type') || '').split(';', 1)[0].trim().toLowerCase();
      if (contentType !== DNS_CONTENT_TYPE) throw new Error(`upstream ${key} returned invalid content type`);
      const buf = validateDnsResponse(await res.arrayBuffer(), question);
      controllers.forEach((c, i) => { if (i !== idx) c.abort(); }); // cancel losers
      return buf;
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

// ─── Singleflight refresh + hot-entry tracking ───────────────────────────────

function releaseInflight(key, entry) {
  if (inflightQueries.get(key) === entry) inflightQueries.delete(key);
}

/**
 * Fetch and optionally populate one semantic cache entry. Concurrent foreground
 * misses and prefetches in the same isolate share the same result promise.
 */
function refreshDns({
  cache,
  cacheKey,
  profile,
  method,
  body,
  search,
  question,
  ctx,
}) {
  if (!cacheKey) {
    return raceFetch(
      profile.upstreams,
      method,
      body,
      search,
      question,
      profile.hedgeDelays,
    ).then(buf => ({
      buf,
      ttl: buf ? extractCacheTTL(buf, profile.cachePolicy) : 0,
    }));
  }

  const inflightKey = cacheKey.url;
  const existing = inflightQueries.get(inflightKey);
  if (existing) return existing.result;

  const entry = {};
  entry.result = (async () => {
    try {
      const buf = await raceFetch(
        profile.upstreams,
        method,
        body,
        search,
        question,
        profile.hedgeDelays,
      );
      if (!buf) {
        releaseInflight(inflightKey, entry);
        return { buf: null, ttl: 0 };
      }

      const ttl = extractCacheTTL(buf, profile.cachePolicy);
      if (ttl <= 0) {
        releaseInflight(inflightKey, entry);
        return { buf, ttl };
      }

      let cacheWrite;
      try {
        cacheWrite = cache.put(
          cacheKey,
          makeCacheableResponse(buf, ttl, profile.cachePolicy.staleIfErrorWindow),
        );
      } catch {
        releaseInflight(inflightKey, entry);
        return { buf, ttl };
      }

      const completion = Promise.resolve(cacheWrite)
        .catch(() => {})
        .finally(() => releaseInflight(inflightKey, entry));
      ctx.waitUntil(completion);
      return { buf, ttl };
    } catch {
      releaseInflight(inflightKey, entry);
      return { buf: null, ttl: 0 };
    }
  })();

  inflightQueries.set(inflightKey, entry);
  return entry.result;
}

function recordCacheHit(cacheKey) {
  const key = cacheKey.url;
  const now = Date.now();
  const previous = hotCacheEntries.get(key);
  const count = previous && now - previous.lastHit <= HOT_ENTRY_WINDOW_MS
    ? previous.count + 1
    : 1;

  // Refresh insertion order so the first key remains the least recently used.
  hotCacheEntries.delete(key);
  hotCacheEntries.set(key, { count, lastHit: now });
  if (hotCacheEntries.size > MAX_HOT_ENTRY_TRACKING) {
    hotCacheEntries.delete(hotCacheEntries.keys().next().value);
  }
  return count >= HOT_ENTRY_MIN_HITS;
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
    if (request.url.length > MAX_REQUEST_URL_CHARS) {
      return errorResponse(414, 'Request URL is too long');
    }

    // ── Path routing — extract optional token ────────────────────────────────
    // Preferred: Authorization: Bearer <token>. The path form remains for DoH
    // clients that cannot set custom headers.
    const pathMatch = url.pathname.match(/^\/dns-query(?:\/([A-Za-z0-9._~-]+))?$/);
    if (!pathMatch) return errorResponse(404, 'Not found');

    const pathToken = pathMatch[1] ?? null;
    const authorization = request.headers.get('authorization') || '';
    const bearerMatch = authorization.match(/^Bearer ([A-Za-z0-9._~-]+)$/i);
    if (authorization && !bearerMatch) return errorResponse(400, 'Invalid Authorization header');
    const headerToken = bearerMatch?.[1] ?? null;
    if (pathToken && headerToken && pathToken !== headerToken) {
      return errorResponse(400, 'Conflicting authentication tokens');
    }
    const token = headerToken ?? pathToken;

    if (token === null &&
        String(env.ALLOW_PUBLIC_DOH || '').toLowerCase() !== 'true') {
      return errorResponse(403, 'Public DoH is disabled');
    }

    // ── Read DNS payload ─────────────────────────────────────────────────────
    let dnsBuf; // ArrayBuffer containing the raw DNS query message
    let search = '';

    if (method === 'GET') {
      const dnsParam = url.searchParams.get('dns');
      if (!dnsParam) return errorResponse(400, 'Missing "dns" query parameter');
      if (dnsParam.length > MAX_GET_DNS_PARAM_CHARS) {
        return errorResponse(413, 'DNS query is too large');
      }
      dnsBuf = decodeGetPayload(dnsParam);
      if (!dnsBuf) return errorResponse(400, 'Invalid base64url in "dns" parameter');
      search = `?dns=${encodeURIComponent(dnsParam)}`;
    } else {
      const contentType = (request.headers.get('content-type') || '').split(';', 1)[0].trim().toLowerCase();
      if (contentType !== DNS_CONTENT_TYPE) {
        return errorResponse(415, `POST requires ${DNS_CONTENT_TYPE}`);
      }
      const contentLength = Number(request.headers.get('content-length'));
      if (Number.isFinite(contentLength) && contentLength > MAX_DNS_MESSAGE_BYTES) {
        return errorResponse(413, 'DNS query is too large');
      }
      dnsBuf = await request.arrayBuffer();
    }
    if (dnsBuf.byteLength > MAX_DNS_MESSAGE_BYTES) return errorResponse(413, 'DNS query is too large');

    // ── Parse DNS question ───────────────────────────────────────────────────
    const question = parseQuestion(dnsBuf);
    if (!question) return errorResponse(400, 'Malformed DNS query');

    // Load private KV only after cheap request validation, so oversized or
    // malformed traffic cannot amplify into KV reads.
    let profile = token === null ? PUBLIC_PROFILE : DEFAULT_PROFILE;
    if (token !== null) {
      if (!env.DOH_KV) return errorResponse(500, 'DOH_KV binding is not configured');
      const loaded = await loadProfile(env.DOH_KV, token);
      if (loaded === null) return errorResponse(403, 'Unknown token');
      profile = loaded;
    }

    const { cachePolicy } = profile;

    // ── Private rule matching ────────────────────────────────────────────────
    // Rules precede ordinary cache lookup so a newly published rule cannot be
    // shadowed by an older upstream cache entry.
    const rule = question.compressedQuestion
      ? null
      : matchRule(profile.privateRules, question.qname, question.qtype);

    if (rule) {
      const synthBuf = synthesizeDNSResponse(dnsBuf, question, rule);
      if (synthBuf) return buildUpstreamResponse(synthBuf, rule.ttl);
      // Synthesis failed — fall through to upstream.
    }

    // ── Cache lookup ─────────────────────────────────────────────────────────
    // ECS and unrepresented EDNS semantics bypass cache completely. This is
    // safer than allowing distinct client subnets/options to share an answer.
    const cacheableQuery = !question.compressedQuestion &&
      !question.hasECS &&
      !question.hasUnknownEdnsOption;
    const cache = caches.default;
    const cacheKey = cacheableQuery ? buildCacheKey(url.origin, token, profile, question) : null;
    const cached = cacheKey ? await cache.match(cacheKey) : null;

    // Evaluate freshness manually so we can distinguish HIT vs STALE.
    // The stored max-age is ttl + staleWindow, so cache.match() returns the
    // entry during both the fresh window and the stale window.
    let staleCandidate = null;

    if (cached) {
      const ts      = parseInt(cached.headers.get('x-cache-ts')  || '0', 10);
      const origTtl = parseInt(cached.headers.get('x-cache-ttl') || String(cachePolicy.defaultTtl), 10);
      const age     = (Date.now() - ts) / 1000;

      if (age <= origTtl) {
        const hotEntry = recordCacheHit(cacheKey);
        const shouldPrefetch = origTtl >= MIN_PREFETCH_TTL &&
          age / origTtl >= cachePolicy.prefetchRatio &&
          hotEntry &&
          !inflightQueries.has(cacheKey.url);
        if (shouldPrefetch) {
          ctx.waitUntil(
            refreshDns({
              cache,
              cacheKey,
              profile,
              method,
              body: dnsBuf,
              search,
              question,
              ctx,
            }).then(() => {}),
          );
        }
        try {
          return await buildCacheHitResponse(cached, 'HIT', question.id, dnsBuf);
        } catch {
          ctx.waitUntil(cache.delete(cacheKey));
        }
      }

      // Entry is stale — keep it as a fallback for upstream failure
      if (age > origTtl) staleCandidate = cached;
    }

    // ── Upstream fetch ────────────────────────────────────────────────────────
    const { buf: respBuf, ttl } = await refreshDns({
      cache,
      cacheKey,
      profile,
      method,
      body: dnsBuf,
      search,
      question,
      ctx,
    });

    if (!respBuf) {
      // All upstreams failed — serve stale cache if available within the error window
      if (staleCandidate) {
        try {
          return await buildCacheHitResponse(staleCandidate, 'STALE', question.id, dnsBuf);
        } catch {
          if (cacheKey) ctx.waitUntil(cache.delete(cacheKey));
        }
      }
      return errorResponse(502, 'All upstreams failed and no cached response is available');
    }

    let clientBuf = respBuf;
    if (cacheKey) {
      try {
        // A shared singleflight result carries the leader's DNS identity.
        // Restore the current request's ID and Question before returning it.
        clientBuf = prepareCachedDnsResponse(
          respBuf,
          question.id,
          0,
          false,
          Infinity,
          dnsBuf,
        );
      } catch {
        return errorResponse(502, 'Upstream response could not be safely rewritten');
      }
    }

    return buildUpstreamResponse(clientBuf, ttl);
  },
};
