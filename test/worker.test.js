import assert from 'node:assert/strict';
import test from 'node:test';

import worker, { handleRequest } from '../src/index.js';
import { resolveConfig, DEFAULT_CONFIG } from '../src/config.js';
import { listHostnames, lookupDomain, normalizeHostname } from '../src/domains.js';
import { escapeHtml, renderDomainPage } from '../src/page.js';
import { LOGO_CONTENT_TYPE, logoBytes } from '../src/logo.js';

/**
 * @param {string} url
 * @param {RequestInit} [init]
 * @param {Record<string, unknown>} [env]
 */
function get(url, init = {}, env = {}) {
  return handleRequest(new Request(url, init), env);
}

test('serves the parked page on the root of any hostname', async () => {
  const response = get('https://some-domain-we-own.com/');

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');

  const html = await response.text();
  assert.match(html, /This website is out of service\./);
  assert.match(html, /some-domain-we-own\.com/);
  assert.match(html, /Rapid Rise AI \(Pty\) Ltd/);
});

test('links to the Rapid Rise AI site, an enquiry email and WhatsApp', async () => {
  const html = await get('https://parked.example/').text();

  assert.match(html, /href="https:\/\/www\.rapidriseai\.com"/);
  assert.match(html, /Visit Rapid Rise AI/);
  assert.match(html, /href="mailto:team@rapidriseai\.com\?subject=Enquiry%20about%20parked\.example/);
  assert.match(html, /href="https:\/\/wa\.me\/27649031234\?text=[^"]*parked\.example/);
});

test('carries the company registration in the footer, as the main site does', async () => {
  const html = await get('https://parked.example/').text();
  assert.match(html, /Rapid Rise AI &middot; Reg\. No\. K2024727338\. All rights reserved\./);
});

test('an empty WHATSAPP_URL drops the WhatsApp button', async () => {
  const html = await get('https://parked.example/', {}, { WHATSAPP_URL: '' }).text();
  assert.doesNotMatch(html, /wa\.me/);
  assert.match(html, /Enquire about this domain/);
});

test('sets security headers and a short cache lifetime', () => {
  const response = get('https://parked.example/');

  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('cache-control'), 'public, max-age=300');
  assert.match(response.headers.get('content-security-policy'), /default-src 'none'/);
});

test('answers stale deep links with the same page but a 404 status', async () => {
  const response = get('https://parked.example/blog/old-post?utm_source=x');

  assert.equal(response.status, 404);
  assert.match(await response.text(), /This website is out of service\./);
});

test('drops www and the port when naming the domain', async () => {
  const html = await get('https://www.parked.example:8443/').text();

  assert.match(html, /<h1>parked\.example<\/h1>/);
  assert.doesNotMatch(html, /www\.parked\.example/);
});

test('HEAD returns headers without a body', async () => {
  const response = get('https://parked.example/', { method: 'HEAD' });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
});

test('rejects write methods', async () => {
  const response = get('https://parked.example/', { method: 'POST' });

  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, HEAD, OPTIONS');
});

test('answers OPTIONS preflight', () => {
  const response = get('https://parked.example/', { method: 'OPTIONS' });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('allow'), 'GET, HEAD, OPTIONS');
});

test('serves a crawlable robots.txt', async () => {
  const response = get('https://parked.example/robots.txt');

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(await response.text(), 'User-agent: *\nAllow: /\n');
});

test('serves the logo with an immutable cache and points favicon.ico at it', async () => {
  const response = get('https://parked.example/logo.png');

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), LOGO_CONTENT_TYPE);
  assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable');

  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 4)], [0x89, 0x50, 0x4e, 0x47], 'should be a PNG');
  assert.equal(bytes.length, logoBytes().length);

  const favicon = get('https://parked.example/favicon.ico');
  assert.equal(favicon.status, 301);
  assert.equal(favicon.headers.get('location'), 'https://parked.example/logo.png');
});

test('the page references the logo rather than inlining it', async () => {
  const html = await get('https://parked.example/').text();

  assert.match(html, /<img class="logo" src="\/logo\.png"/);
  assert.doesNotMatch(html, /data:image\/png/);
  assert.ok(html.length < 12000, `page should stay small, got ${html.length} bytes`);
});

test('exposes a health endpoint for uptime monitoring', async () => {
  const response = get('https://www.parked.example/health');

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(JSON.parse(await response.text()), {
    status: 'parked',
    hostname: 'parked.example',
  });
});

test('escapes a hostile Host header instead of rendering it', async () => {
  const html = await get('https://parked.example/', {}, {}).text();
  assert.doesNotMatch(html, /<script/i);

  const injected = renderDomainPage({ hostname: '"><script>alert(1)</script>' });
  assert.doesNotMatch(injected, /<script>alert/);
  assert.match(injected, /&lt;script&gt;/);
});

test('truncates an absurdly long hostname', () => {
  const html = renderDomainPage({ hostname: `${'a'.repeat(500)}.example` });
  assert.doesNotMatch(html, new RegExp('a{200}'));
  assert.match(html, /…/);
});

test('the default worker export delegates to the handler', async () => {
  const response = await worker.fetch(new Request('https://parked.example/'), {});
  assert.equal(response.status, 200);
});

test('environment variables override the branding', async () => {
  const env = {
    BRAND_NAME: 'Acme Holdings',
    LEGAL_NAME: 'Acme Holdings Ltd',
    BRAND_URL: 'https://acme.example',
    CONTACT_EMAIL: 'hello@acme.example',
  };

  const html = await get('https://parked.example/', {}, env).text();

  assert.match(html, /Visit Acme Holdings/);
  assert.match(html, /Acme Holdings Ltd/);
  assert.match(html, /href="https:\/\/acme\.example"/);
  assert.match(html, /mailto:hello@acme\.example/);
});

test('a blank required variable falls back rather than leaving a hole', () => {
  assert.deepEqual(resolveConfig({ BRAND_NAME: '   ', BRAND_URL: undefined }), DEFAULT_CONFIG);
  assert.deepEqual(resolveConfig(), DEFAULT_CONFIG);
  assert.equal(resolveConfig({ CONTACT_EMAIL: '' }).contactEmail, DEFAULT_CONFIG.contactEmail);
});

test('a blank optional variable clears it', () => {
  assert.equal(resolveConfig({ WHATSAPP_URL: '' }).whatsappUrl, '');
  assert.equal(resolveConfig({ TAGLINE: '' }).tagline, '');
  assert.equal(resolveConfig({ REGISTRATION_NUMBER: '' }).registrationNumber, '');
});

test('registry copy replaces the headline and adds a note', () => {
  const html = renderDomainPage({
    hostname: 'reserved.example',
    entry: { domain: 'reserved.example', headline: 'Reserved', note: 'Launching in 2027.', forSale: false },
  });

  assert.match(html, /<h1>Reserved<\/h1>/);
  assert.match(html, /Launching in 2027\./);
  assert.match(html, /reserved for an upcoming Rapid Rise AI project/);
  assert.doesNotMatch(html, /open to offers/);
});

test('domains default to being open to offers', () => {
  const html = renderDomainPage({ hostname: 'forsale.example', entry: { domain: 'forsale.example' } });
  assert.match(html, /open to offers/);
});

test('normalizeHostname strips case, www, trailing dots and ports', () => {
  assert.equal(normalizeHostname('WWW.Example.COM.'), 'example.com');
  assert.equal(normalizeHostname('example.com:8787'), 'example.com');
  assert.equal(normalizeHostname('  example.com  '), 'example.com');
  assert.equal(normalizeHostname(undefined), '');
});

test('lookupDomain tolerates hostnames that are not in the registry', () => {
  assert.equal(lookupDomain('not-registered.example'), null);
  assert.equal(lookupDomain(''), null);
});

test('listHostnames returns sorted, deduplicated apex and www hostnames', () => {
  for (const hostname of listHostnames()) {
    assert.match(hostname, /^[a-z0-9.-]+$/);
  }
  assert.deepEqual([...listHostnames()].sort(), listHostnames());
});

test('escapeHtml covers every dangerous character', () => {
  assert.equal(escapeHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
  assert.equal(escapeHtml(null), '');
});
