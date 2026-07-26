/**
 * CF Edge 204 Probe — edge204
 * Version: 1.1.0
 * Version created: April 6, 2026 11:10 PM PDT
 * Version updated: July 26, 2026 PDT
 *
 * Pure-edge HTTP 204 probe for Surge url-test / fallback health checks.
 * Bound to: probe.example.com (Custom Domain, HTTP only)
 * No upstream fetch, no stateful bindings, fully stateless.
 *
 * Optional env var TRACE_KEY gates the client IP field on /trace.
 */

const VERSION = '1.1.0';

const NO_CACHE = Object.freeze({ 'Cache-Control': 'no-store' });

export default {
  async fetch(request, env) {
    const { method } = request;
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';

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
        const body = JSON.stringify({ ok: true, version: VERSION, ts: Date.now() });
        return new Response(body, {
          status: 200,
          headers: { ...NO_CACHE, 'Content-Type': 'application/json' },
        });
      }

      case '/trace': {
        const key = env.TRACE_KEY;
        const authed = Boolean(key) && url.searchParams.get('k') === key;
        const cf = request.cf ?? {};
        const lines = [
          `colo=${cf.colo ?? 'unknown'}`,
          `country=${cf.country ?? 'unknown'}`,
          `city=${cf.city ?? 'unknown'}`,
          `asn=${cf.asn ?? 'unknown'}`,
          `ray=${request.headers.get('cf-ray') ?? 'unknown'}`,
        ];
        if (authed) {
          lines.push(`ip=${request.headers.get('cf-connecting-ip') ?? 'unknown'}`);
        }
        lines.push(`ts=${Date.now()}`);
        return new Response(lines.join('\n') + '\n', {
          status: 200,
          headers: { ...NO_CACHE, 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }

      default:
        return new Response(null, { status: 404, headers: NO_CACHE });
    }
  },
};
