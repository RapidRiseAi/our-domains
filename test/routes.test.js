import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { applyRoutesBlock, buildRoutesBlock, BEGIN, END, CONFIG_PATH } from '../scripts/sync-routes.mjs';

test('generates an apex and a www route for each domain', () => {
  const block = buildRoutesBlock([{ domain: 'example.com' }, { domain: 'another.co.uk' }]);

  assert.match(block, /\{ pattern = "example\.com\/\*", zone_name = "example\.com" \}/);
  assert.match(block, /\{ pattern = "www\.example\.com\/\*", zone_name = "example\.com" \}/);
  assert.match(block, /\{ pattern = "another\.co\.uk\/\*", zone_name = "another\.co\.uk" \}/);
  assert.equal((block.match(/pattern = /g) ?? []).length, 4);
});

test('omits the www route when a domain opts out', () => {
  const block = buildRoutesBlock([{ domain: 'example.com', www: false }]);

  assert.equal((block.match(/pattern = /g) ?? []).length, 1);
  assert.doesNotMatch(block, /www\./);
});

test('normalizes a domain that was entered with www or capitals', () => {
  const block = buildRoutesBlock([{ domain: 'WWW.Example.COM' }]);
  assert.match(block, /zone_name = "example\.com"/);
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
  assert.match(updated, /^BRAND_URL = "https:\/\/rapidriseai\.com"$/m);
  assert.match(updated, /zone_name = "example\.com"/);
  assert.equal(updated.indexOf(BEGIN), config.indexOf(BEGIN));
  assert.equal((updated.match(new RegExp(END, 'g')) ?? []).length, 1);
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
