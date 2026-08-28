#!/usr/bin/env node
/**
 * Regenerate the `routes` block in wrangler.toml from src/domains.js.
 *
 *   node scripts/sync-routes.mjs           rewrite wrangler.toml
 *   node scripts/sync-routes.mjs --check   exit 1 if it is out of date
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

import { DOMAINS, normalizeHostname } from '../src/domains.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

export const CONFIG_PATH = join(ROOT, 'wrangler.toml');
export const BEGIN = '# BEGIN GENERATED ROUTES - do not edit by hand, run `npm run routes:sync`';
export const END = '# END GENERATED ROUTES';

/**
 * Attach each hostname as a Cloudflare *custom domain* rather than a route.
 *
 * The difference matters. A route only matches traffic that already reaches
 * Cloudflare, so it needs a proxied DNS record you create and maintain by hand
 * — and a record that is merely "DNS only" leaves the domain unreachable while
 * the dashboard still lists the route. A custom domain creates and proxies that
 * record itself, and manages the certificate, which is one fewer thing to get
 * wrong on every new domain.
 *
 * @param {import('../src/domains.js').DomainEntry[]} [domains]
 * @returns {string}
 */
export function buildRoutesBlock(domains = DOMAINS) {
  const lines = [];
  const seen = new Set();

  for (const entry of domains) {
    const apex = normalizeHostname(entry?.domain);

    if (!apex) {
      throw new Error(`Registry entry is missing a usable domain: ${JSON.stringify(entry)}`);
    }
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(apex)) {
      throw new Error(`"${entry.domain}" is not a bare apex domain (no protocol, path, or port)`);
    }
    if (seen.has(apex)) {
      throw new Error(`"${apex}" is listed more than once in src/domains.js`);
    }
    seen.add(apex);

    lines.push(`  { pattern = "${apex}", custom_domain = true }`);
    if (entry.www !== false) {
      lines.push(`  { pattern = "www.${apex}", custom_domain = true }`);
    }
  }

  if (lines.length === 0) {
    return `${BEGIN}\n# No domains registered yet - add them to src/domains.js.\nroutes = []\n${END}`;
  }

  return `${BEGIN}\nroutes = [\n${lines.join(',\n')}\n]\n${END}`;
}

/**
 * Splice a freshly generated routes block into the config file's contents.
 *
 * @param {string} current
 * @param {string} block
 * @returns {string}
 */
export function applyRoutesBlock(current, block) {
  const beginIndex = current.indexOf(BEGIN);
  const endIndex = current.indexOf(END);

  if (beginIndex === -1 || endIndex === -1 || endIndex < beginIndex) {
    throw new Error('Could not find the generated routes markers in wrangler.toml.');
  }

  return current.slice(0, beginIndex) + block + current.slice(endIndex + END.length);
}

function main() {
  const block = buildRoutesBlock();
  const current = readFileSync(CONFIG_PATH, 'utf8');
  const updated = applyRoutesBlock(current, block);
  const routeCount = (block.match(/pattern = /g) ?? []).length;

  if (process.argv.includes('--check')) {
    if (updated !== current) {
      console.error('wrangler.toml routes are out of date. Run `npm run routes:sync`.');
      process.exit(1);
    }
    console.log(`wrangler.toml routes are up to date (${routeCount} route(s)).`);
    return;
  }

  if (updated === current) {
    console.log(`wrangler.toml already up to date (${routeCount} route(s)).`);
    return;
  }

  writeFileSync(CONFIG_PATH, updated);
  console.log(`Updated wrangler.toml with ${routeCount} route(s) from src/domains.js.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
