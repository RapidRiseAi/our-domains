#!/usr/bin/env node
/**
 * Render the parked page to plain HTML files in dist/.
 *
 * Useful for previewing a change in a browser, and as a drop-in index.html for
 * any domain parked somewhere other than Cloudflare (S3, Netlify, nginx, ...).
 *
 *   node scripts/build-static.mjs                 preview page in dist/index.html
 *   node scripts/build-static.mjs example.com     preview that hostname instead
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { DEFAULT_CONFIG } from '../src/config.js';
import { DOMAINS, lookupDomain, normalizeHostname } from '../src/domains.js';
import { renderDomainPage } from '../src/page.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = join(ROOT, 'dist');

/**
 * @param {string} hostname
 * @param {string} outPath
 */
function write(hostname, outPath) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(
    outPath,
    renderDomainPage({ hostname, config: DEFAULT_CONFIG, entry: lookupDomain(hostname) }),
  );
  console.log(`  ${hostname} -> ${outPath.replace(`${ROOT}/`, '')}`);
}

const requested = normalizeHostname(process.argv[2] ?? '') || 'example.com';

console.log('Rendering parked pages:');
write(requested, join(OUT_DIR, 'index.html'));

for (const entry of DOMAINS) {
  const domain = normalizeHostname(entry.domain);
  if (domain && domain !== requested) {
    write(domain, join(OUT_DIR, domain, 'index.html'));
  }
}
