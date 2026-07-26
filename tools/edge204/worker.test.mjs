import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import worker from './worker.js';

const workerSource = await readFile(new URL('./worker.js', import.meta.url), 'utf8');

const PROBE_PATHS = ['/generate_204', '/204'];

function call(path, { method = 'GET', env = {} } = {}) {
  return worker.fetch(new Request(`http://probe.test${path}`, { method }), env);
}

async function traceFields(path, env) {
  const res = await call(path, { env });
  const text = await res.text();
  return text.trimEnd().split('\n').map((line) => line.split('=')[0]);
}

test('probe paths return an empty 204', async () => {
  for (const path of PROBE_PATHS) {
    const res = await call(path);
    assert.equal(res.status, 204, path);
    assert.equal(await res.text(), '', path);
  }
});

test('trailing slashes are normalized', async () => {
  for (const path of ['/generate_204/', '/generate_204///', '/204/']) {
    assert.equal((await call(path)).status, 204, path);
  }
});

test('query strings do not affect probe routing', async () => {
  assert.equal((await call('/generate_204?x=1')).status, 204);
});

test('HEAD is accepted on probe paths', async () => {
  assert.equal((await call('/generate_204', { method: 'HEAD' })).status, 204);
});

test('non-GET/HEAD methods are rejected with Allow', async () => {
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
    const res = await call('/generate_204', { method });
    assert.equal(res.status, 405, method);
    assert.equal(res.headers.get('allow'), 'GET, HEAD', method);
  }
});

test('unknown paths return 404', async () => {
  for (const path of ['/nope', '/', '/generate_205']) {
    assert.equal((await call(path)).status, 404, path);
  }
});

test('every response carries Cache-Control: no-store and nothing legacy', async () => {
  const paths = ['/generate_204', '/204', '/ping', '/trace', '/nope'];
  for (const path of paths) {
    const res = await call(path);
    assert.equal(res.headers.get('cache-control'), 'no-store', path);
    assert.equal(res.headers.get('pragma'), null, path);
    assert.equal(res.headers.get('access-control-allow-origin'), null, path);
  }
  const rejected = await call('/generate_204', { method: 'POST' });
  assert.equal(rejected.headers.get('cache-control'), 'no-store');
});

test('/ping reports the version constant declared in worker.js', async () => {
  const declared = workerSource.match(/const VERSION = '([^']+)'/);
  assert.ok(declared, 'worker.js must declare a VERSION constant');

  const res = await call('/ping');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/json');

  const payload = await res.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.version, declared[1]);
  assert.equal(typeof payload.ts, 'number');
});

test('/trace omits the client IP when TRACE_KEY is unset', async () => {
  const base = ['colo', 'country', 'city', 'asn', 'ray', 'ts'];
  assert.deepEqual(await traceFields('/trace', {}), base);
  assert.deepEqual(await traceFields('/trace?k=anything', {}), base);
});

test('/trace omits the client IP when the key is missing or wrong', async () => {
  const env = { TRACE_KEY: 'devkey' };
  const base = ['colo', 'country', 'city', 'asn', 'ray', 'ts'];
  assert.deepEqual(await traceFields('/trace', env), base);
  assert.deepEqual(await traceFields('/trace?k=wrong', env), base);
  assert.deepEqual(await traceFields('/trace?k=', env), base);
});

test('/trace includes the client IP only for a matching key', async () => {
  const env = { TRACE_KEY: 'devkey' };
  const withIp = ['colo', 'country', 'city', 'asn', 'ray', 'ip', 'ts'];
  assert.deepEqual(await traceFields('/trace?k=devkey', env), withIp);
  assert.deepEqual(await traceFields('/trace/?k=devkey', env), withIp);
});

test('a wrong key is indistinguishable from an unset key', async () => {
  const unset = await call('/trace', { env: {} });
  const wrong = await call('/trace?k=wrong', { env: { TRACE_KEY: 'devkey' } });

  assert.equal(unset.status, wrong.status);
  assert.equal(unset.headers.get('content-type'), wrong.headers.get('content-type'));

  const strip = (text) => text.replace(/^ts=.*$/m, 'ts=<redacted>');
  assert.equal(strip(await unset.text()), strip(await wrong.text()));
});
