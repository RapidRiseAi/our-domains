import { resolveConfig } from './config.js';
import { lookupDomain, normalizeHostname } from './domains.js';
import { LOGO_PATH, renderDomainPage } from './page.js';
import { LOGO_CONTENT_TYPE, logoBytes } from './logo.js';

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  // The page loads nothing off-origin: inline CSS, the logo from this same
  // host, and no scripts at all.
  'content-security-policy':
    "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

const ALLOWED_METHODS = 'GET, HEAD, OPTIONS';

export default {
  /**
   * @param {Request} request
   * @param {Record<string, unknown>} env
   * @returns {Response}
   */
  fetch(request, env) {
    return handleRequest(request, env);
  },
};

/**
 * @param {Request} request
 * @param {Record<string, unknown>} [env]
 * @returns {Response}
 */
export function handleRequest(request, env = {}) {
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { allow: ALLOWED_METHODS, ...SECURITY_HEADERS } });
  }

  if (method !== 'GET' && method !== 'HEAD') {
    return textResponse('Method not allowed\n', 405, { allow: ALLOWED_METHODS });
  }

  const url = new URL(request.url);
  const config = resolveConfig(env);
  const path = url.pathname;

  if (path === '/robots.txt') {
    // Parked domains stay crawlable: if someone searches for the domain name we
    // want them to find the page that tells them how to buy it.
    return textResponse(`User-agent: *\nAllow: /\n`, 200);
  }

  if (path === LOGO_PATH) {
    // Immutable: the bytes only change when the Worker is redeployed, and the
    // page is far smaller for referencing this instead of inlining it.
    return new Response(method === 'HEAD' ? null : logoBytes(), {
      status: 200,
      headers: {
        'content-type': LOGO_CONTENT_TYPE,
        'cache-control': 'public, max-age=31536000, immutable',
        ...SECURITY_HEADERS,
      },
    });
  }

  if (path === '/favicon.ico') {
    // Browsers ask for this unprompted; send them to the real mark.
    return Response.redirect(new URL(LOGO_PATH, url).toString(), 301);
  }

  if (path === '/health' || path === '/healthz') {
    const body = JSON.stringify({ status: 'parked', hostname: normalizeHostname(url.hostname) });
    return new Response(method === 'HEAD' ? null : `${body}\n`, {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        ...SECURITY_HEADERS,
      },
    });
  }

  const hostname = normalizeHostname(url.hostname);
  const html = renderDomainPage({
    hostname,
    config,
    entry: lookupDomain(hostname),
    logoHref: LOGO_PATH,
  });

  // Any path other than the root is a stale inbound link to a site that no
  // longer exists — show the same page, but say 404 rather than pretend the
  // old URL is still there.
  const status = path === '/' ? 200 : 404;

  return new Response(method === 'HEAD' ? null : html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300',
      ...SECURITY_HEADERS,
    },
  });
}

/**
 * @param {string} body
 * @param {number} status
 * @param {Record<string, string>} [extraHeaders]
 * @returns {Response}
 */
function textResponse(body, status, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=300',
      ...SECURITY_HEADERS,
      ...extraHeaders,
    },
  });
}
