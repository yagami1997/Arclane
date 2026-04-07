/**
 * CF Edge 204 Probe — edge204
 * Version: 1.0.0
 * Version created: April 6, 2026 11:10 PM PDT
 *
 * Pure-edge HTTP 204 probe for Surge url-test / fallback health checks.
 * Bound to: probe.example.com (Custom Domain, HTTP only)
 * No upstream fetch, no bindings, fully stateless.
 */

const NO_CACHE = Object.freeze({
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
  'Access-Control-Allow-Origin': '*',
});

export default {
  async fetch(request) {
    const { method } = request;
    const { pathname } = new URL(request.url);

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
