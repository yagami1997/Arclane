import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workerSource = await readFile(new URL('./worker.js', import.meta.url), 'utf8');
const testableWorkerSource = `${workerSource}
export {
  buildCacheKey,
  extractCacheTTL,
  parseQuestion,
  prepareCachedDnsResponse,
  raceFetch,
  validateDnsResponse,
};`;
const workerModule = await import(
  `data:text/javascript;base64,${Buffer.from(testableWorkerSource).toString('base64')}`
);

const {
  buildCacheKey,
  extractCacheTTL,
  parseQuestion,
  prepareCachedDnsResponse,
  raceFetch,
  validateDnsResponse,
  default: worker,
} = workerModule;

function nameBytes(name) {
  const out = [];
  for (const label of name.split('.')) {
    out.push(label.length, ...Buffer.from(label, 'ascii'));
  }
  out.push(0);
  return out;
}

function questionBytes(name = 'example.com', type = 1, qclass = 1) {
  const out = Buffer.alloc(nameBytes(name).length + 4);
  Buffer.from(nameBytes(name)).copy(out);
  out.writeUInt16BE(type, out.length - 4);
  out.writeUInt16BE(qclass, out.length - 2);
  return out;
}

function makeQuery({
  id = 0x1234,
  flags = 0x0100,
  name = 'example.com',
  type = 1,
  options = [],
  dnssecOk = false,
} = {}) {
  const question = questionBytes(name, type);
  const optionLength = options.reduce((sum, option) => sum + 4 + option.data.length, 0);
  const opt = options.length || dnssecOk
    ? Buffer.alloc(11 + optionLength)
    : Buffer.alloc(0);
  if (opt.length) {
    opt[0] = 0;
    opt.writeUInt16BE(41, 1);
    opt.writeUInt16BE(1232, 3);
    opt.writeUInt32BE(dnssecOk ? 0x8000 : 0, 5);
    opt.writeUInt16BE(optionLength, 9);
    let off = 11;
    for (const option of options) {
      opt.writeUInt16BE(option.code, off);
      opt.writeUInt16BE(option.data.length, off + 2);
      Buffer.from(option.data).copy(opt, off + 4);
      off += 4 + option.data.length;
    }
  }

  const out = Buffer.alloc(12 + question.length + opt.length);
  out.writeUInt16BE(id, 0);
  out.writeUInt16BE(flags, 2);
  out.writeUInt16BE(1, 4);
  out.writeUInt16BE(opt.length ? 1 : 0, 10);
  question.copy(out, 12);
  opt.copy(out, 12 + question.length);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
}

function rr(type, ttl, rdata, owner = [0xc0, 0x0c]) {
  const out = Buffer.alloc(owner.length + 10 + rdata.length);
  Buffer.from(owner).copy(out);
  let off = owner.length;
  out.writeUInt16BE(type, off);
  out.writeUInt16BE(type === 41 ? 1232 : 1, off + 2);
  out.writeUInt32BE(ttl, off + 4);
  out.writeUInt16BE(rdata.length, off + 8);
  Buffer.from(rdata).copy(out, off + 10);
  return out;
}

function makeResponse({
  id = 0x1234,
  flags = 0x8180,
  name = 'example.com',
  type = 1,
  answers = [rr(1, 300, [192, 0, 2, 1])],
  authorities = [],
  additionals = [],
} = {}) {
  const question = questionBytes(name, type);
  const records = Buffer.concat([...answers, ...authorities, ...additionals]);
  const out = Buffer.alloc(12 + question.length + records.length);
  out.writeUInt16BE(id, 0);
  out.writeUInt16BE(flags, 2);
  out.writeUInt16BE(1, 4);
  out.writeUInt16BE(answers.length, 6);
  out.writeUInt16BE(authorities.length, 8);
  out.writeUInt16BE(additionals.length, 10);
  question.copy(out, 12);
  records.copy(out, 12 + question.length);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
}

function soaRdata(minimum) {
  const fixed = Buffer.alloc(20);
  fixed.writeUInt32BE(1, 0);
  fixed.writeUInt32BE(3600, 4);
  fixed.writeUInt32BE(600, 8);
  fixed.writeUInt32BE(86400, 12);
  fixed.writeUInt32BE(minimum, 16);
  return Buffer.concat([
    Buffer.from(nameBytes('ns.example.com')),
    Buffer.from(nameBytes('hostmaster.example.com')),
    fixed,
  ]);
}

const POLICY = {
  minTtl: 0,
  maxTtl: 86400,
  defaultTtl: 300,
};

test('parseQuestion extracts DO/CD and marks ECS and unknown EDNS options uncacheable', () => {
  const query = makeQuery({
    flags: 0x0110,
    dnssecOk: true,
    options: [
      { code: 8, data: [0, 1, 24, 0, 192, 0, 2] },
      { code: 65001, data: [1] },
    ],
  });
  const parsed = parseQuestion(query);
  assert.equal(parsed.dnssecOk, true);
  assert.equal(parsed.checkingDisabled, true);
  assert.equal(parsed.hasECS, true);
  assert.equal(parsed.hasUnknownEdnsOption, true);
});

test('parseQuestion rejects truncated, out-of-bounds, and looping compression pointers', () => {
  const makePointerQuery = pointerBytes => {
    const out = Buffer.alloc(12 + pointerBytes.length + 4);
    out.writeUInt16BE(0x1234, 0);
    out.writeUInt16BE(0x0100, 2);
    out.writeUInt16BE(1, 4);
    Buffer.from(pointerBytes).copy(out, 12);
    if (pointerBytes.length === 2) {
      out.writeUInt16BE(1, 14);
      out.writeUInt16BE(1, 16);
    }
    return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
  };

  const truncated = Buffer.alloc(13);
  truncated.writeUInt16BE(1, 4);
  truncated[12] = 0xc0;
  assert.equal(
    parseQuestion(truncated.buffer.slice(truncated.byteOffset, truncated.byteOffset + truncated.byteLength)),
    null,
  );
  assert.equal(parseQuestion(makePointerQuery([0xc0, 0xff])), null);
  assert.equal(parseQuestion(makePointerQuery([0xc0, 0x0c])), null);
});

test('parseQuestion rejects reserved labels and names over 255 wire bytes', () => {
  const reserved = Buffer.alloc(17);
  reserved.writeUInt16BE(1, 4);
  reserved[12] = 0x40;
  assert.equal(
    parseQuestion(reserved.buffer.slice(reserved.byteOffset, reserved.byteOffset + reserved.byteLength)),
    null,
  );

  const labels = [];
  for (let i = 0; i < 4; i++) labels.push(63, ...new Array(63).fill(0x61));
  labels.push(0);
  const question = Buffer.alloc(12 + labels.length + 4);
  question.writeUInt16BE(1, 4);
  Buffer.from(labels).copy(question, 12);
  question.writeUInt16BE(1, question.length - 4);
  question.writeUInt16BE(1, question.length - 2);
  assert.equal(
    parseQuestion(question.buffer.slice(question.byteOffset, question.byteOffset + question.byteLength)),
    null,
  );
});

test('parseQuestion rejects excessive Additional records and trailing bytes', () => {
  const excessive = makeQuery();
  new DataView(excessive).setUint16(10, 17);
  assert.equal(parseQuestion(excessive), null);

  const valid = Buffer.from(makeQuery());
  const trailing = Buffer.concat([valid, Buffer.from([0])]);
  assert.equal(
    parseQuestion(trailing.buffer.slice(trailing.byteOffset, trailing.byteOffset + trailing.byteLength)),
    null,
  );
});

test('parseQuestion rejects non-zero EDNS versions', () => {
  const query = makeQuery({ dnssecOk: true });
  const optOffset = 12 + questionBytes().length;
  new DataView(query).setUint8(optOffset + 6, 1);
  assert.equal(parseQuestion(query), null);
});

test('cache key isolates revision, DO/RD/AD/CD semantics, and uses v3', () => {
  const plain = parseQuestion(makeQuery());
  const secure = parseQuestion(makeQuery({ flags: 0x0110, dnssecOk: true }));
  const noRecursion = parseQuestion(makeQuery({ flags: 0 }));
  const authenticData = parseQuestion(makeQuery({ flags: 0x0120 }));
  const a = buildCacheKey('https://worker.example', 'token', { revision: 4 }, plain).url;
  const b = buildCacheKey('https://worker.example', 'token', { revision: 5 }, plain).url;
  const c = buildCacheKey('https://worker.example', 'token', { revision: 4 }, secure).url;
  const d = buildCacheKey('https://worker.example', 'token', { revision: 4 }, noRecursion).url;
  const e = buildCacheKey('https://worker.example', 'token', { revision: 4 }, authenticData).url;
  assert.notEqual(a, b);
  assert.notEqual(a, c);
  assert.notEqual(a, d);
  assert.notEqual(a, e);
  assert.match(a, /\/v3\//);
});

test('cache-key component encoding prevents token/qname delimiter collisions', () => {
  const first = parseQuestion(makeQuery({ name: 'c' }));
  const second = parseQuestion(makeQuery({ name: 'b|c' }));
  const profile = { revision: 1 };
  const a = buildCacheKey('https://worker.example', 'a|b', profile, first).url;
  const b = buildCacheKey('https://worker.example', 'a', profile, second).url;
  assert.notEqual(a, b);
});

test('cached response gets current transaction ID and decremented RR TTL, not OPT metadata', () => {
  const optTtl = 0x00008000;
  const response = makeResponse({
    additionals: [rr(41, optTtl, [], [0])],
  });
  const adjusted = prepareCachedDnsResponse(response, 0xbeef, 125, false);
  const view = new DataView(adjusted);
  assert.equal(view.getUint16(0), 0xbeef);
  const answerTtlOff = 12 + questionBytes().length + 2 + 4;
  assert.equal(view.getUint32(answerTtlOff), 175);
  const optTtlOff = 12 + questionBytes().length + rr(1, 300, [192, 0, 2, 1]).length + 1 + 4;
  assert.equal(view.getUint32(optTtlOff), optTtl);
});

test('cached response restores the current question casing for DNS 0x20 validation', () => {
  const query = makeQuery({ id: 0xabcd, name: 'ExAmPlE.CoM' });
  const adjusted = prepareCachedDnsResponse(
    makeResponse({ name: 'example.com' }),
    0xabcd,
    0,
    false,
    300,
    query,
  );
  const questionLength = questionBytes('ExAmPlE.CoM').length;
  assert.deepEqual(
    Buffer.from(adjusted).subarray(12, 12 + questionLength),
    Buffer.from(query).subarray(12, 12 + questionLength),
  );
});

test('stale response caps ordinary DNS TTL at 15 seconds', () => {
  const adjusted = prepareCachedDnsResponse(makeResponse(), 1, 999, true);
  const ttlOff = 12 + questionBytes().length + 2 + 4;
  assert.equal(new DataView(adjusted).getUint32(ttlOff), 15);
});

test('negative cache TTL follows RFC 2308 SOA minimum', () => {
  const response = makeResponse({
    flags: 0x8183,
    answers: [],
    authorities: [rr(6, 600, soaRdata(120))],
  });
  assert.equal(extractCacheTTL(response, POLICY), 120);
});

test('negative response without an Authority SOA is not cached', () => {
  const response = makeResponse({
    flags: 0x8183,
    answers: [],
    authorities: [],
  });
  assert.equal(extractCacheTTL(response, { ...POLICY, minTtl: 60 }), 0);
});

test('CNAME chain terminating in NODATA uses the Authority SOA TTL', () => {
  const response = makeResponse({
    answers: [rr(5, 300, nameBytes('target.example.com'))],
    authorities: [rr(6, 600, soaRdata(120))],
  });
  assert.equal(extractCacheTTL(response, POLICY), 120);
});

test('cached negative response SOA TTL cannot extend beyond remaining negative lifetime', () => {
  const response = makeResponse({
    flags: 0x8183,
    answers: [],
    authorities: [rr(6, 600, soaRdata(120))],
  });
  const adjusted = prepareCachedDnsResponse(response, 1, 45, false, 120);
  const ttlOff = 12 + questionBytes().length + 2 + 4;
  assert.equal(new DataView(adjusted).getUint32(ttlOff), 75);
});

test('zero TTL positive answers are not cacheable', () => {
  const response = makeResponse({ answers: [rr(1, 0, [192, 0, 2, 1])] });
  assert.equal(extractCacheTTL(response, POLICY), 0);
});

test('upstream validation rejects wrong transaction ID and SERVFAIL', () => {
  const question = parseQuestion(makeQuery());
  assert.throws(() => validateDnsResponse(makeResponse({ id: 7 }), question), /transaction ID/);
  assert.throws(() => validateDnsResponse(makeResponse({ flags: 0x8182 }), question), /RCODE/);
  assert.doesNotThrow(() => validateDnsResponse(makeResponse(), question));
});

test('upstream validation rejects malformed OPT placement, version, and extended RCODE', () => {
  const question = parseQuestion(makeQuery());
  assert.throws(
    () => validateDnsResponse(makeResponse({ answers: [rr(41, 0, [], [0])] }), question),
    /OPT/,
  );
  assert.throws(
    () => validateDnsResponse(
      makeResponse({ additionals: [rr(41, 0x00010000, [], [0])] }),
      question,
    ),
    /OPT/,
  );
  assert.throws(
    () => validateDnsResponse(
      makeResponse({ additionals: [rr(41, 0x01000000, [], [0])] }),
      question,
    ),
    /extended DNS RCODE/,
  );
});

test('upstream validation rejects compressed Questions, truncated RDATA, and trailing bytes', () => {
  const question = parseQuestion(makeQuery());
  const target = Buffer.from(nameBytes('example.com'));
  const compressed = Buffer.alloc(18 + target.length);
  compressed.writeUInt16BE(0x1234, 0);
  compressed.writeUInt16BE(0x8180, 2);
  compressed.writeUInt16BE(1, 4);
  compressed[12] = 0xc0;
  compressed[13] = 18;
  compressed.writeUInt16BE(1, 14);
  compressed.writeUInt16BE(1, 16);
  target.copy(compressed, 18);
  const compressedBuf = compressed.buffer.slice(
    compressed.byteOffset,
    compressed.byteOffset + compressed.byteLength,
  );
  assert.throws(() => validateDnsResponse(compressedBuf, question), /compressed/);

  const complete = Buffer.from(makeResponse());
  const truncated = complete.subarray(0, complete.length - 1);
  assert.throws(
    () => validateDnsResponse(
      truncated.buffer.slice(truncated.byteOffset, truncated.byteOffset + truncated.byteLength),
      question,
    ),
    /truncated DNS RDATA/,
  );

  const trailing = Buffer.concat([complete, Buffer.from([0])]);
  assert.throws(
    () => validateDnsResponse(
      trailing.buffer.slice(trailing.byteOffset, trailing.byteOffset + trailing.byteLength),
      question,
    ),
    /trailing DNS bytes/,
  );
});

test('raceFetch ignores an invalid first response and accepts a later valid response', async t => {
  const originalFetch = globalThis.fetch;
  const query = makeQuery();
  const question = parseQuestion(query);
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    const body = calls === 1 ? makeResponse({ flags: 0x8182 }) : makeResponse();
    if (calls === 2) await new Promise(resolve => setTimeout(resolve, 5));
    return new Response(body, { headers: { 'content-type': 'application/dns-message' } });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const result = await raceFetch(['cf', 'google'], 'POST', query, '', question);
  assert.ok(result);
  assert.equal(calls, 2);
});

test('successful first hedge prevents delayed backup fetch dispatches', async t => {
  const originalFetch = globalThis.fetch;
  const query = makeQuery();
  const question = parseQuestion(query);
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response(makeResponse(), {
      headers: { 'content-type': 'application/dns-message' },
    });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const result = await raceFetch(
    ['cf', 'google', 'quad9'],
    'POST',
    query,
    '',
    question,
    [0, 10, 20],
  );
  assert.ok(result);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(calls, 1);
});

test('private rules are evaluated before ordinary cache lookup', async t => {
  const originalCaches = globalThis.caches;
  globalThis.caches = {
    default: {
      match() {
        throw new Error('cache lookup must not occur for a private rule');
      },
    },
  };
  t.after(() => { globalThis.caches = originalCaches; });

  const query = makeQuery({ name: 'internal.example' });
  const dns = Buffer.from(query).toString('base64url');
  const env = {
    DOH_KV: {
      async get(key) {
        if (key.startsWith('profile:')) {
          return { name: 'test', revision: 2, upstreams: ['cf'] };
        }
        return {
          privateRules: [{
            match: 'exact',
            domain: 'internal.example',
            type: 'A',
            answers: ['192.0.2.9'],
            ttl: 60,
          }],
        };
      },
    },
  };
  const response = await worker.fetch(
    new Request(`https://worker.example/dns-query/private-rule-token?dns=${dns}`),
    env,
    { waitUntil() {} },
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-cache'), 'MISS');
});

test('public DoH is disabled by default and requires explicit opt-in', async () => {
  const query = Buffer.from(makeQuery()).toString('base64url');
  const response = await worker.fetch(
    new Request(`https://worker.example/dns-query?dns=${query}`),
    {},
    { waitUntil() {} },
  );
  assert.equal(response.status, 403);
});

test('path tokens use the same restricted charset as bearer tokens', async () => {
  let kvReads = 0;
  const response = await worker.fetch(
    new Request('https://worker.example/dns-query/bad%7Ctoken'),
    { DOH_KV: { async get() { kvReads++; return null; } } },
    { waitUntil() {} },
  );
  assert.equal(response.status, 404);
  assert.equal(kvReads, 0);
});

test('ECS queries bypass cache lookup and cache writes', async t => {
  const originalCaches = globalThis.caches;
  const originalFetch = globalThis.fetch;
  const query = makeQuery({
    options: [{ code: 8, data: [0, 1, 24, 0, 192, 0, 2] }],
  });
  let waitUntilCalls = 0;
  globalThis.caches = {
    default: {
      match() {
        throw new Error('ECS cache lookup must not occur');
      },
      put() {
        throw new Error('ECS cache write must not occur');
      },
    },
  };
  globalThis.fetch = async () => new Response(makeResponse(), {
    headers: { 'content-type': 'application/dns-message' },
  });
  t.after(() => {
    globalThis.caches = originalCaches;
    globalThis.fetch = originalFetch;
  });

  const env = {
    DOH_KV: {
      async get(key) {
        return key.startsWith('profile:')
          ? { name: 'test', revision: 1, upstreams: ['cf'] }
          : { privateRules: [] };
      },
    },
  };
  const response = await worker.fetch(
    new Request('https://worker.example/dns-query/ecs-token', {
      method: 'POST',
      headers: { 'content-type': 'application/dns-message' },
      body: query,
    }),
    env,
    { waitUntil() { waitUntilCalls++; } },
  );
  assert.equal(response.status, 200);
  assert.equal(waitUntilCalls, 0);
});

test('POST DNS payloads larger than 4 KiB are rejected', async () => {
  let kvReads = 0;
  const env = {
    DOH_KV: {
      async get(key) {
        kvReads++;
        return key.startsWith('profile:')
          ? { name: 'test', upstreams: ['cf'] }
          : { privateRules: [] };
      },
    },
  };
  const response = await worker.fetch(
    new Request('https://worker.example/dns-query/token', {
      method: 'POST',
      headers: { 'content-type': 'application/dns-message' },
      body: new Uint8Array(4097),
    }),
    env,
    { waitUntil() {} },
  );
  assert.equal(response.status, 413);
  assert.equal(kvReads, 0);
});

test('concurrent cache misses share one upstream request and restore each client ID', async t => {
  const originalCaches = globalThis.caches;
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;
  let cacheWrites = 0;
  let kvReads = 0;
  const background = [];

  globalThis.caches = {
    default: {
      async match() { return null; },
      async put() {
        cacheWrites++;
        await new Promise(resolve => setTimeout(resolve, 5));
      },
    },
  };
  globalThis.fetch = async (_target, init) => {
    upstreamCalls++;
    const id = new DataView(init.body).getUint16(0);
    await new Promise(resolve => setTimeout(resolve, 20));
    return new Response(makeResponse({ id }), {
      headers: { 'content-type': 'application/dns-message' },
    });
  };
  t.after(() => {
    globalThis.caches = originalCaches;
    globalThis.fetch = originalFetch;
  });

  const env = {
    DOH_KV: {
      async get(key) {
        kvReads++;
        return key.startsWith('profile:')
          ? {
              name: 'singleflight',
              revision: 1,
              upstreams: ['cf'],
              hedgeDelays: [0],
            }
          : { privateRules: [] };
      },
    },
  };
  const makeRequest = id => new Request(
    'https://worker.example/dns-query/singleflight-token',
    {
      method: 'POST',
      headers: { 'content-type': 'application/dns-message' },
      body: makeQuery({ id }),
    },
  );
  const ctx = { waitUntil(promise) { background.push(promise); } };

  const [first, second] = await Promise.all([
    worker.fetch(makeRequest(0x1111), env, ctx),
    worker.fetch(makeRequest(0x2222), env, ctx),
  ]);
  const firstBody = await first.arrayBuffer();
  const secondBody = await second.arrayBuffer();
  await Promise.all(background);

  assert.equal(new DataView(firstBody).getUint16(0), 0x1111);
  assert.equal(new DataView(secondBody).getUint16(0), 0x2222);
  assert.equal(upstreamCalls, 1);
  assert.equal(cacheWrites, 1);
  assert.equal(kvReads, 2, 'profile and rules should each load once');
});

test('explicitly enabled public profile uses Cloudflare only', async t => {
  const originalCaches = globalThis.caches;
  const originalFetch = globalThis.fetch;
  const targets = [];
  const background = [];
  globalThis.caches = {
    default: {
      async match() { return null; },
      async put() {},
    },
  };
  globalThis.fetch = async (target, init) => {
    targets.push(String(target));
    const id = new DataView(init.body).getUint16(0);
    return new Response(makeResponse({ id }), {
      headers: { 'content-type': 'application/dns-message' },
    });
  };
  t.after(() => {
    globalThis.caches = originalCaches;
    globalThis.fetch = originalFetch;
  });

  const response = await worker.fetch(
    new Request('https://worker.example/dns-query', {
      method: 'POST',
      headers: { 'content-type': 'application/dns-message' },
      body: makeQuery(),
    }),
    { ALLOW_PUBLIC_DOH: 'true' },
    { waitUntil(promise) { background.push(promise); } },
  );
  await Promise.all(background);
  assert.equal(response.status, 200);
  assert.deepEqual(targets, ['https://cloudflare-dns.com/dns-query']);
});

test('hot prefetch starts after two hits and a foreground miss joins it', async t => {
  const originalCaches = globalThis.caches;
  const originalFetch = globalThis.fetch;
  const cachedBody = makeResponse();
  const cacheTimestamp = Date.now() - 260_000; // 86.7% of a 300-second TTL
  let serveCached = true;
  let upstreamCalls = 0;
  let releaseUpstream;
  let leaderId;
  const background = [];

  globalThis.caches = {
    default: {
      async match() {
        if (!serveCached) return null;
        return new Response(cachedBody.slice(0), {
          headers: {
            'content-type': 'application/dns-message',
            'x-cache-ts': String(cacheTimestamp),
            'x-cache-ttl': '300',
          },
        });
      },
      async put() {},
    },
  };
  globalThis.fetch = async (_target, init) => {
    upstreamCalls++;
    leaderId = new DataView(init.body).getUint16(0);
    await new Promise(resolve => { releaseUpstream = resolve; });
    return new Response(makeResponse({ id: leaderId }), {
      headers: { 'content-type': 'application/dns-message' },
    });
  };
  t.after(() => {
    globalThis.caches = originalCaches;
    globalThis.fetch = originalFetch;
  });

  const env = {
    DOH_KV: {
      async get(key) {
        return key.startsWith('profile:')
          ? {
              name: 'prefetch',
              revision: 1,
              upstreams: ['cf'],
              hedgeDelays: [0],
            }
          : { privateRules: [] };
      },
    },
  };
  const ctx = { waitUntil(promise) { background.push(promise); } };
  const request = id => new Request(
    'https://worker.example/dns-query/prefetch-token',
    {
      method: 'POST',
      headers: { 'content-type': 'application/dns-message' },
      body: makeQuery({ id }),
    },
  );

  const firstHit = await worker.fetch(request(0x1001), env, ctx);
  await firstHit.arrayBuffer();
  assert.equal(upstreamCalls, 0, 'one isolated hit is not hot');

  const secondHit = await worker.fetch(request(0x1002), env, ctx);
  await secondHit.arrayBuffer();
  assert.equal(upstreamCalls, 1, 'second recent hit starts prefetch');

  serveCached = false;
  const joinedMiss = worker.fetch(request(0x3333), env, ctx);
  releaseUpstream();
  const joinedResponse = await joinedMiss;
  const joinedBody = await joinedResponse.arrayBuffer();
  await Promise.all(background);

  assert.equal(upstreamCalls, 1, 'foreground miss reuses prefetch singleflight');
  assert.equal(new DataView(joinedBody).getUint16(0), 0x3333);
});

test('short-TTL cache entries do not prefetch and private profile loads are memory-cached', async t => {
  const originalCaches = globalThis.caches;
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;
  let kvReads = 0;
  globalThis.caches = {
    default: {
      async match() {
        return new Response(makeResponse().slice(0), {
          headers: {
            'content-type': 'application/dns-message',
            'x-cache-ts': String(Date.now() - 29_000),
            'x-cache-ttl': '30',
          },
        });
      },
    },
  };
  globalThis.fetch = async () => {
    upstreamCalls++;
    throw new Error('short TTL must not prefetch');
  };
  t.after(() => {
    globalThis.caches = originalCaches;
    globalThis.fetch = originalFetch;
  });

  const env = {
    DOH_KV: {
      async get(key) {
        kvReads++;
        return key.startsWith('profile:')
          ? { name: 'short-ttl', upstreams: ['cf'] }
          : { privateRules: [] };
      },
    },
  };
  const request = id => new Request(
    'https://worker.example/dns-query/short-ttl-token',
    {
      method: 'POST',
      headers: { 'content-type': 'application/dns-message' },
      body: makeQuery({ id }),
    },
  );

  await (await worker.fetch(request(1), env, { waitUntil() {} })).arrayBuffer();
  await (await worker.fetch(request(2), env, { waitUntil() {} })).arrayBuffer();
  assert.equal(upstreamCalls, 0);
  assert.equal(kvReads, 2, 'second request should reuse the in-isolate profile');
});
