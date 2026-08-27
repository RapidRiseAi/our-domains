# our-domains

A single Cloudflare Worker that answers for every domain RapidRise AI owns but
is not currently using.

Anyone who searches for or types one of these domains gets a page that says the
site is out of service, that we own the domain, how to get in touch about it,
and a button through to [rapidriseai.com](https://rapidriseai.com).

One Worker serves all of them — the page names whichever domain the visitor
actually landed on, so adding a domain is a config change, not a new deploy
target.

## Quick start

```bash
npm install
npm run dev            # http://localhost:8787
npm test               # 30 tests, no network needed
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

2. Regenerate the Cloudflare routes and deploy:

   ```bash
   npm run routes:sync
   npm run deploy
   ```

3. In the Cloudflare dashboard, make sure the zone has a **proxied** DNS record
   for the apex and for `www`. A Worker route only fires if DNS resolves, and a
   parked domain has no origin to point at, so use the documentation address:

   | Type | Name  | Content     | Proxy      |
   | ---- | ----- | ----------- | ---------- |
   | A    | `@`   | `192.0.2.1` | Proxied 🟠 |
   | A    | `www` | `192.0.2.1` | Proxied 🟠 |

   The Worker intercepts the request before anything tries to reach that
   address, so it is never actually contacted.

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
so it can be changed without touching code:

```toml
[vars]
BRAND_NAME = "RapidRise AI"
BRAND_URL = "https://rapidriseai.com"
CONTACT_EMAIL = "domains@rapidriseai.com"
```

`CONTACT_EMAIL` is the address on the page and in the pre-filled enquiry mail —
point it at a mailbox someone actually reads. The defaults also live in
`src/config.js` for the static build.

## What the Worker returns

| Request            | Response                                                     |
| ------------------ | ------------------------------------------------------------ |
| `/`                | `200` — the parked page for that hostname                    |
| any other path     | `404` — the same page (stale inbound links land here)         |
| `/robots.txt`      | `200` — crawlable, so searching the domain name finds the page |
| `/favicon.ico`     | `204` — the real icon is inlined in the page                  |
| `/health`          | `200` — `{"status":"parked","hostname":"..."}` for monitoring |
| `POST`, `PUT`, ... | `405`                                                        |

Every response carries `nosniff`, `X-Frame-Options: DENY`, and a CSP that allows
nothing but the page's own inline styles — there is no JavaScript on the page at
all. HTML is cached for 5 minutes so a domain coming back into service does not
stay stale for long.

## Parking a domain that is not on Cloudflare

`npm run build:static` writes a standalone `dist/index.html` (plus one per
registered domain) with no dependencies, ready to drop on S3, Netlify, nginx, or
anything else that serves a file.

## Layout

```
src/index.js      Worker entry point: routing, headers, status codes
src/page.js       the HTML and CSS for the page
src/domains.js    the registry of owned-but-inactive domains
src/config.js     branding defaults and env overrides
scripts/          route sync + static build
test/             node:test suite, run with `npm test`
```
