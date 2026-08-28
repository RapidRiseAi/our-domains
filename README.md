# our-domains

A single Cloudflare Worker that answers for every domain Rapid Rise AI owns but
is not currently using.

Anyone who searches for or types one of these domains gets a page that says the
site is out of service, that we own the domain, how to get in touch about it,
and a button through to [www.rapidriseai.com](https://www.rapidriseai.com).

The page borrows its colours, type and button shapes from the main site, and
carries the same logo and `© Rapid Rise AI · Reg. No. K2024727338` footer, so a
parked domain reads as the same company rather than as a generic holding page.

One Worker serves all of them — the page names whichever domain the visitor
actually landed on, so adding a domain is a config change, not a new deploy
target.

## Quick start

```bash
npm install
npm run dev            # http://localhost:8787
npm test               # 34 tests, no network needed
npm run build:static -- coolstartup.io   # render dist/index.html to eyeball it
```

## Adding a domain

1. Add it to `src/domains.js`:

   ```js
   export const DOMAINS = [
     { domain: 'coolstartup.io' },
     { domain: 'reserved-thing.com', note: 'Reserved for a 2027 launch.', forSale: false },
   ];
   ```

2. Regenerate the Cloudflare attachments and deploy:

   ```bash
   npm run routes:sync
   npm run deploy
   ```

That is the whole process — the zone needs to be in the same Cloudflare account,
and nothing else needs setting up by hand.

`npm run routes:sync` writes **custom domains**, not routes:

```toml
routes = [
  { pattern = "example.com", custom_domain = true },
  { pattern = "www.example.com", custom_domain = true }
]
```

The distinction is the one thing worth understanding here. A *route* only matches
traffic that already reaches Cloudflare, so it needs a proxied DNS record that
you create and keep correct yourself. A *custom domain* creates that record,
proxies it, and manages the certificate for you. Both show up in the same
dashboard list, which makes a half-configured route easy to miss — see
[Troubleshooting](#troubleshooting).

`npm run routes:check` fails if `wrangler.toml` has drifted from the registry —
it runs as part of `npm run check` and in CI.

### Per-domain options

Only `domain` is required.

| Field      | Default | Effect                                                   |
| ---------- | ------- | -------------------------------------------------------- |
| `domain`   | —       | Apex domain, no protocol or path                          |
| `www`      | `true`  | Also route `www.<domain>`                                 |
| `headline` | domain  | Replaces the domain name as the page headline             |
| `note`     | —       | An extra line of copy on the page                         |
| `forSale`  | `true`  | `false` swaps "open to offers" for "reserved for a project" |

A domain pointed at the Worker before anyone adds it to the registry still gets
the standard page — the registry only supplies the optional extras.

## Changing the branding

Wording that is shared across every domain lives in `[vars]` in `wrangler.toml`,
so it can be changed without touching code. The values match what the main site
publishes:

```toml
[vars]
BRAND_NAME = "Rapid Rise AI"
BRAND_URL = "https://www.rapidriseai.com"
CONTACT_EMAIL = "team@rapidriseai.com"
LEGAL_NAME = "Rapid Rise AI (Pty) Ltd"
REGISTRATION_NUMBER = "K2024727338"
TAGLINE = "Custom Software, AI Systems & Business Automation"
WHATSAPP_URL = "https://wa.me/27649031234"
WHATSAPP_LABEL = "064 903 1234"
```

`BRAND_NAME`, `BRAND_URL` and `CONTACT_EMAIL` are load-bearing — setting one to
an empty string falls back to the default rather than rendering a page with a
hole in it. The rest are optional, and blanking one drops it: set
`WHATSAPP_URL = ""` to remove the WhatsApp link, `TAGLINE = ""` to fall back to
a plain "Owned by Rapid Rise AI" line.

The same defaults live in `src/config.js`, which is what the static build uses.

### Fonts and the logo

The page names Plus Jakarta Sans and Inter first and falls back to system fonts.
It deliberately does **not** fetch webfonts — the main site self-hosts them
specifically to keep visitor data away from the Google Fonts CDN, and a parked
page makes no third-party requests at all.

The logo is inlined in the Worker bundle (`src/logo.js`, taken from
`/brand/favicon-128.png` on the main site) and served from `/logo.png` with a
one-year immutable cache, so the HTML stays around 6.5 KB and a parked domain
never depends on the main site being up. To refresh it after a rebrand,
re-encode the new PNG into `src/logo.js`.

## What the Worker returns

| Request            | Response                                                     |
| ------------------ | ------------------------------------------------------------ |
| `/`                | `200` — the parked page for that hostname                    |
| any other path     | `404` — the same page (stale inbound links land here)         |
| `/robots.txt`      | `200` — crawlable, so searching the domain name finds the page |
| `/logo.png`        | `200` — the brand mark, cached immutably for a year           |
| `/favicon.ico`     | `301` — redirects to `/logo.png`                              |
| `/health`          | `200` — `{"status":"parked","hostname":"..."}` for monitoring |
| `POST`, `PUT`, ... | `405`                                                        |

Every response carries `nosniff`, `X-Frame-Options: DENY`, and a CSP that allows
nothing but the page's own inline styles — there is no JavaScript on the page at
all. HTML is cached for 5 minutes so a domain coming back into service does not
stay stale for long.

## Troubleshooting

### The domain shows "This site can't be reached" / `DNS_PROBE_FINISHED_NXDOMAIN`

The request never got to Cloudflare, so the Worker was never involved. Check
what the domain actually resolves to:

```bash
dig +short bushbabybnb.co.za A
dig +short bushbabybnb.co.za AAAA
```

| What you see | What it means |
| ------------ | ------------- |
| `104.21.x.x` / `172.67.x.x` | Proxied correctly — the Worker will run |
| `100::` and no A record | **Not proxied.** The record is "DNS only" |
| nothing at all | No DNS record, or the zone's nameservers are not Cloudflare's |

`100::` is the IPv6 discard address. Cloudflare uses it as the placeholder
target for a Worker custom domain, and it is only ever meant to sit *behind* the
proxy — the outside world should see Cloudflare's anycast IPs instead. If `100::`
is visible publicly, the record is not being proxied, and every visitor is sent
to an address that goes nowhere. Because there is no A record either, IPv4-only
clients get nothing back at all, which is what the browser reports as NXDOMAIN.

Two things turn the proxy off, so check both:

1. **Grey cloud.** In DNS → Records, the apex and `www` records must be
   **Proxied** 🟠, not DNS only ☁️.
2. **A paused zone.** Overview → "Pause Cloudflare on Site" bypasses the proxy
   for every record in the zone at once. If it is paused, resume it.

Confirm the fix from outside your own network, since a local resolver will have
cached the old answer:

```bash
curl -sS 'https://dns.google/resolve?name=bushbabybnb.co.za&type=A' | jq '.Answer'
```

### The domain resolves but serves the wrong thing

Check the Worker itself on its own URL first — `our-domains.<subdomain>.workers.dev`.
If that serves the parked page, the Worker is fine and the problem is in how the
domain is attached.

## Parking a domain that is not on Cloudflare

`npm run build:static` writes `dist/index.html` and `dist/logo.png` (plus a pair
per registered domain) with no dependencies, ready to drop on S3, Netlify,
nginx, or anything else that serves files. The page references the logo
relatively, so the pair also works opened straight off disk.

## Layout

```
src/index.js      Worker entry point: routing, headers, status codes
src/page.js       the HTML and CSS for the page
src/domains.js    the registry of owned-but-inactive domains
src/config.js     branding defaults and env overrides
src/logo.js       the brand mark, base64-encoded
scripts/          route sync + static build
test/             node:test suite, run with `npm test`
```
