/**
 * The domains we own but are not currently using.
 *
 * This list is the single source of truth. It drives:
 *   1. the Cloudflare routes in wrangler.toml (`npm run routes:sync`)
 *   2. the optional per-domain copy on the parked page
 *
 * Only `domain` is required. Everything else is optional:
 *
 *   {
 *     domain: 'example.com',   // apex domain, no protocol, no trailing slash
 *     www: true,               // also route www.example.com (default: true)
 *     headline: 'Example',     // replaces the domain name as the page headline
 *     note: 'Reserved for a future product launch.',  // extra line of copy
 *     forSale: true,           // default: true — set false for "not available"
 *   }
 *
 * After editing this list, run `npm run routes:sync` and redeploy.
 */

/** @typedef {{ domain: string, www?: boolean, headline?: string, note?: string, forSale?: boolean }} DomainEntry */

/** @type {DomainEntry[]} */
export const DOMAINS = [
  // Add owned-but-inactive domains here, for example:
  // { domain: 'example.com' },
  // { domain: 'another-example.com', note: 'Reserved for a future product launch.', forSale: false },
];

/**
 * Strip the parts of a hostname that should not affect matching: case,
 * a trailing dot, a port, and a leading `www.`.
 *
 * @param {string} hostname
 * @returns {string}
 */
export function normalizeHostname(hostname) {
  return String(hostname ?? '')
    .trim()
    .toLowerCase()
    .replace(/\.$/, '')
    .replace(/:\d+$/, '')
    .replace(/^www\./, '');
}

/**
 * Find the registry entry for a hostname, if we have one.
 *
 * Unknown hostnames are expected — the Worker still serves the page, it just
 * has no extra copy to show. That keeps a newly pointed domain working before
 * anyone remembers to add it here.
 *
 * @param {string} hostname
 * @returns {DomainEntry | null}
 */
export function lookupDomain(hostname) {
  const needle = normalizeHostname(hostname);
  if (!needle) return null;

  return DOMAINS.find((entry) => normalizeHostname(entry.domain) === needle) ?? null;
}

/**
 * Every hostname the Worker should answer on, apex and www, deduplicated.
 *
 * @returns {string[]}
 */
export function listHostnames() {
  const hostnames = new Set();

  for (const entry of DOMAINS) {
    const apex = normalizeHostname(entry.domain);
    if (!apex) continue;

    hostnames.add(apex);
    if (entry.www !== false) hostnames.add(`www.${apex}`);
  }

  return [...hostnames].sort();
}
