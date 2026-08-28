import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { applyRoutesBlock, buildRoutesBlock, BEGIN, END, CONFIG_PATH } from '../scripts/sync-routes.mjs';

test('attaches an apex and a www custom domain for each entry', () => {
  const block = buildRoutesBlock([{ domain: 'example.com' }, { domain: 'another.co.uk' }]);

  assert.match(block, /\{ pattern = "example\.com", custom_domain = true \}/);
  assert.match(block, /\{ pattern = "www\.example\.com", custom_domain = true \}/);
  assert.match(block, /\{ pattern = "another\.co\.uk", custom_domain = true \}/);
  assert.equal((block.match(/pattern = /g) ?? []).length, 4);
});

test('uses custom domains, not routes, so Cloudflare owns the proxied DNS record', () => {
  const block = buildRoutesBlock([{ domain: 'example.com' }]);

  // A trailing /* would make these routes instead, which need a proxied DNS
  // record maintained by hand — the step that leaves a domain unreachable.
  assert.doesNotMatch(block, /\/\*/);
  assert.doesNotMatch(block, /zone_name/);
});

test('omits the www entry when a domain opts out', () => {
  const block = buildRoutesBlock([{ domain: 'example.com', www: false }]);

  assert.equal((block.match(/pattern = /g) ?? []).length, 1);
  assert.doesNotMatch(block, /www\./);
});

test('normalizes a domain that was entered with www or capitals', () => {
  const block = buildRoutesBlock([{ domain: 'WWW.Example.COM' }]);
  assert.match(block, /pattern = "example\.com"/);
  assert.doesNotMatch(block, /Example/);
});

test('emits an empty but valid routes array when nothing is registered', () => {
  const block = buildRoutesBlock([]);
  assert.match(block, /^routes = \[\]$/m);
});

test('rejects entries that would produce a broken route', () => {
  assert.throws(() => buildRoutesBlock([{ domain: '' }]), /missing a usable domain/);
  assert.throws(() => buildRoutesBlock([{ domain: 'https://example.com' }]), /bare apex domain/);
  assert.throws(() => buildRoutesBlock([{ domain: 'example.com/path' }]), /bare apex domain/);
  assert.throws(() => buildRoutesBlock([{ domain: 'localhost' }]), /bare apex domain/);
  assert.throws(
    () => buildRoutesBlock([{ domain: 'example.com' }, { domain: 'www.example.com' }]),
    /listed more than once/,
  );
});

test('replaces only the marked block in wrangler.toml', () => {
  const config = readFileSync(CONFIG_PATH, 'utf8');
  const updated = applyRoutesBlock(config, buildRoutesBlock([{ domain: 'example.com' }]));

  assert.match(updated, /^name = "our-domains"$/m);
  assert.match(updated, /^BRAND_URL = "https:\/\/www\.rapidriseai\.com"$/m);
  assert.match(updated, /pattern = "example\.com", custom_domain = true/);
  assert.equal(updated.indexOf(BEGIN), config.indexOf(BEGIN));
  assert.equal((updated.match(new RegExp(END, 'g')) ?? []).length, 1);
});

test('every registered domain is attached, apex and www', () => {
  const block = buildRoutesBlock();

  for (const domain of ['integriforensicservices.com', 'bushbabybnb.co.za']) {
    assert.match(block, new RegExp(`pattern = "${domain.replace(/\./g, '\\.')}", custom_domain = true`));
    assert.match(block, new RegExp(`pattern = "www\\.${domain.replace(/\./g, '\\.')}", custom_domain = true`));
  }
});

test('the routes block sits above the first TOML table so it stays top-level', () => {
  const config = readFileSync(CONFIG_PATH, 'utf8');
  const firstTable = config.search(/^\[/m);

  assert.ok(firstTable > -1, 'wrangler.toml should contain at least one table');
  assert.ok(config.indexOf(END) < firstTable, 'generated routes must precede [observability]/[vars]');
});

test('wrangler.toml is in sync with the domain registry', () => {
  const config = readFileSync(CONFIG_PATH, 'utf8');
  assert.equal(applyRoutesBlock(config, buildRoutesBlock()), config, 'run `npm run routes:sync`');
});
