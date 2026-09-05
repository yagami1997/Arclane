#!/usr/bin/env node
// Opt-in, unauthenticated public-endpoint diagnostics only.
import { readFile } from 'node:fs/promises';
import { lookup } from 'node:dns/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isIP } from 'node:net';

const root = process.argv[2];
if (!root || process.argv.length !== 3) {
  console.error('Usage: node check-openclaw.mjs /path/to/node_modules/openclaw');
  process.exit(2);
}
// Keep this short-lived diagnostic on the strict local DNS-pinning path.
for (const key of ['OPENCLAW_PROXY_ACTIVE', 'OPENCLAW_PROXY_URL',
  'OPENCLAW_DEBUG_PROXY_ENABLED', 'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY',
  'http_proxy', 'https_proxy', 'all_proxy']) delete process.env[key];

try {
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  if (pkg.name !== 'openclaw') throw new Error('Expected an OpenClaw package');
  const { resolvePinnedHostnameWithPolicy, fetchWithSsrFGuard } = await import(
    pathToFileURL(resolve(root, 'dist/plugin-sdk/ssrf-runtime.js')).href
  );
  if (!resolvePinnedHostnameWithPolicy || !fetchWithSsrFGuard) {
    throw new Error('Installed SSRF runtime does not expose the required API');
  }
  console.log(JSON.stringify({ openclawVersion: pkg.version }));
  let failures = 0;
  const report = (check, ok, detail) => {
    console.log(JSON.stringify({ check, ok, detail }));
    if (!ok) failures++;
  };
  const deadline = () => AbortSignal.timeout(15000);
  // Injected resolver: no packets are sent to negative-control addresses.
  for (const address of ['198.18.0.1', '198.19.255.254', '127.0.0.1',
    '10.0.0.1', '169.254.169.254', '192.0.2.1', '224.0.0.1', '::1', 'fd00::1']) {
    try {
      await resolvePinnedHostnameWithPolicy('ssrf-control.invalid', {
        lookupFn: async () => [{ address, family: isIP(address) }],
        signal: deadline(),
      });
      report(`reject ${address}`, false, 'Unexpectedly accepted');
    } catch (error) {
      report(`reject ${address}`, error.name === 'SsrFBlockedError', error.name);
    }
  }
  try {
    await resolvePinnedHostnameWithPolicy('ssrf-control.invalid', {
      lookupFn: async () => [{ address: '1.1.1.1', family: 4 }], signal: deadline(),
    });
    report('public resolver control', true, 'Accepted without a network request');
  } catch (error) { report('public resolver control', false, error.name); }

  for (const host of ['auth.openai.com', 'catalog.openclaw.ai', 'clawhub.ai']) {
    try {
      const pinned = await resolvePinnedHostnameWithPolicy(host, {
        lookupFn: lookup, signal: deadline(),
      });
      report(`system DNS ${host}`, true, pinned.addresses);
    } catch (error) { report(`system DNS ${host}`, false, error.message); }
  }
  for (const url of ['https://catalog.openclaw.ai/models/v1/catalog.json',
    'https://clawhub.ai/v1/feeds/plugins']) {
    let result;
    try {
      result = await fetchWithSsrFGuard({ url, mode: 'strict',
        requireHttps: true, timeoutMs: 15000, maxRedirects: 2,
        auditContext: 'realip-compat-check', capture: false });
      report(`guarded GET ${new URL(url).hostname}`, result.response.ok,
        { status: result.response.status, finalUrl: result.finalUrl });
    } catch (error) { report(`guarded GET ${new URL(url).hostname}`, false, error.message); }
    finally { await result?.release(); }
  }
  process.exitCode = failures ? 1 : 0;
} catch (error) {
  console.error(`Compatibility probe failed: ${error.message}`);
  process.exitCode = 1;
}
