import { DEFAULT_CONFIG } from './config.js';

const MAX_DISPLAY_LENGTH = 80;

/** Where the Worker serves the logo. Also the absolute path used for og:image. */
export const LOGO_PATH = '/logo.png';

/**
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

/**
 * A hostname arrives from the Host header, so it is attacker-controlled: cap
 * how much of it we are willing to render.
 *
 * @param {string} value
 * @returns {string}
 */
function truncate(value) {
  const text = String(value ?? '');
  return text.length > MAX_DISPLAY_LENGTH ? `${text.slice(0, MAX_DISPLAY_LENGTH - 1)}…` : text;
}

/**
 * Pre-fill the enquiry email with the domain the visitor is actually looking at,
 * so we know which one they mean without asking.
 *
 * @param {{ email: string, domain: string, brandName: string }} params
 * @returns {string}
 */
export function buildMailto({ email, domain, brandName }) {
  const subject = `Enquiry about ${domain}`;
  const body = [
    `Hi ${brandName},`,
    '',
    `I would like to talk about the domain ${domain}.`,
    '',
    'Thanks,',
  ].join('\n');

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Pre-fill the WhatsApp message the same way.
 *
 * @param {{ url: string, domain: string }} params
 * @returns {string}
 */
export function buildWhatsapp({ url, domain }) {
  const text = encodeURIComponent(`Hi, I would like to talk about the domain ${domain}.`);
  return `${url}${url.includes('?') ? '&' : '?'}text=${text}`;
}

/*
 * Colours, type and button shapes below are lifted from www.rapidriseai.com so
 * a parked domain reads as the same company. The site is dark-only, so this
 * page is too.
 *
 * The brand fonts (Plus Jakarta Sans, Inter) are named first and fall back to
 * system fonts. The main site self-hosts them specifically to avoid calling the
 * Google Fonts CDN, and this page keeps that promise by not fetching webfonts
 * at all — no third-party requests, no bytes beyond the page itself.
 */
const STYLES = `
*, *::before, *::after { box-sizing: border-box; }

:root {
  color-scheme: dark;
  --bg: #000;
  --text: #e6f0ff;
  --heading: #f4f9fe;
  --muted: #a9c2de;
  --accent: #22a6f4;
  --card-border: rgba(96, 150, 220, 0.16);
  --sans: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --display: "Plus Jakarta Sans", Inter, system-ui, -apple-system, sans-serif;
}

html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 26px;
  padding: 40px 20px;
  background-color: var(--bg);
  background-image:
    radial-gradient(46rem 26rem at 50% -6rem, rgba(30, 88, 245, 0.16), transparent 68%),
    radial-gradient(30rem 22rem at 88% 104%, rgba(34, 166, 244, 0.09), transparent 70%);
  color: var(--text);
  font-family: var(--sans);
  font-feature-settings: "ss01", "cv11";
  font-size: 16px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.card {
  width: 100%;
  max-width: 640px;
  padding: clamp(30px, 6vw, 46px);
  border: 1px solid var(--card-border);
  border-radius: 18px;
  background: linear-gradient(170deg, rgba(10, 18, 34, 0.85), rgba(5, 9, 18, 0.8));
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.45), inset 0 1px rgba(255, 255, 255, 0.04);
}

.logo {
  display: block;
  width: 56px;
  height: 56px;
  margin-bottom: 22px;
}

.eyebrow {
  margin: 0 0 12px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--accent);
}

h1 {
  margin: 0;
  font-family: var(--display);
  font-size: clamp(1.75rem, 5.6vw, 2.6rem);
  font-weight: 780;
  letter-spacing: -0.03em;
  line-height: 1.12;
  color: var(--heading);
  overflow-wrap: anywhere;
}

.status {
  margin: 14px 0 0;
  font-family: var(--display);
  font-size: clamp(1.05rem, 2.6vw, 1.25rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--heading);
}

.lead, .note {
  margin: 14px 0 0;
  color: var(--muted);
  overflow-wrap: anywhere;
}

.lead strong { color: var(--text); font-weight: 600; }

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 30px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 15px 30px;
  border: 1px solid transparent;
  border-radius: 14px;
  font-family: inherit;
  font-size: 0.95rem;
  text-decoration: none;
  transition: background 0.25s ease, border-color 0.2s ease, color 0.2s ease;
}

.btn-primary {
  background: linear-gradient(180deg, #3b96ff, #1a77f2);
  border-color: rgba(140, 196, 255, 0.45);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.2), 0 0 26px rgba(26, 119, 242, 0.4);
  color: #fff;
  font-weight: 700;
}

.btn-primary:hover { background: linear-gradient(180deg, #4da3ff, #2483ff); }

.btn-ghost {
  background: rgba(12, 24, 44, 0.35);
  border-color: rgba(82, 132, 200, 0.32);
  color: rgba(196, 220, 248, 0.88);
  font-weight: 600;
}

.btn-ghost:hover { border-color: rgba(140, 196, 255, 0.55); color: var(--heading); }

.btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

.arrow { font-size: 1.05rem; line-height: 1; }

.divider {
  margin: 30px 0 0;
  border: 0;
  border-top: 1px solid var(--card-border);
}

.fine {
  margin: 18px 0 0;
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1.6;
}

.fine a { color: rgba(196, 220, 248, 0.95); }

footer {
  max-width: 640px;
  color: rgba(169, 194, 222, 0.72);
  font-size: 0.8rem;
  line-height: 1.6;
  text-align: center;
}

@media (max-width: 470px) {
  .actions { flex-direction: column; align-items: stretch; }
  /* The brand letter-spacing costs a third line at this width. */
  .eyebrow { font-size: 0.66rem; letter-spacing: 0.14em; }
}

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; }
}
`.trim();

/**
 * Render the parked-domain page for a single hostname.
 *
 * @param {{
 *   hostname: string,
 *   config?: typeof DEFAULT_CONFIG,
 *   entry?: import('./domains.js').DomainEntry | null,
 *   logoHref?: string,
 *   year?: number,
 * }} params
 * @returns {string}
 */
export function renderDomainPage({
  hostname,
  config = DEFAULT_CONFIG,
  entry = null,
  logoHref = LOGO_PATH,
  year = new Date().getUTCFullYear(),
}) {
  const domain = truncate(hostname || 'This domain');
  const headline = truncate(entry?.headline || domain);
  const forSale = entry?.forSale !== false;
  const owner = config.legalName || config.brandName;

  const title = `${domain} — out of service | ${config.brandName}`;
  const description =
    `${domain} is owned by ${owner} and is not currently in service. ` +
    (forSale ? `Get in touch with ${config.brandName} to enquire about the domain.` : `Contact ${config.brandName} for details.`);

  const mailto = buildMailto({ email: config.contactEmail, domain, brandName: config.brandName });

  const availability = forSale
    ? 'It is not in use right now, and we are open to offers from anyone who wants to put it to work.'
    : `It is not in use right now — it is reserved for an upcoming ${config.brandName} project.`;

  const taglineMarkup = config.tagline
    ? `\n    <p class="eyebrow">${escapeHtml(config.tagline)}</p>`
    : `\n    <p class="eyebrow">Owned by ${escapeHtml(config.brandName)}</p>`;

  const noteMarkup = entry?.note ? `\n    <p class="note">${escapeHtml(entry.note)}</p>` : '';

  // WhatsApp sits in the contact line rather than as a third button: two CTAs
  // keep the hierarchy clear, and it is still one tap away.
  const whatsappMarkup = config.whatsappUrl
    ? ` or <a href="${escapeHtml(buildWhatsapp({ url: config.whatsappUrl, domain }))}" target="_blank" rel="noopener noreferrer">message us on WhatsApp</a>`
    : '';

  const registration = config.registrationNumber
    ? ` &middot; Reg. No. ${escapeHtml(config.registrationNumber)}`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="author" content="${escapeHtml(owner)}">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta name="theme-color" content="#000000">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:site_name" content="${escapeHtml(config.brandName)}">
  <meta property="og:image" content="https://${escapeHtml(domain)}${escapeHtml(LOGO_PATH)}">
  <meta name="twitter:card" content="summary">
  <link rel="icon" type="image/png" href="${escapeHtml(logoHref)}">
  <link rel="canonical" href="https://${escapeHtml(domain)}/">
  <style>${STYLES}</style>
</head>
<body>
  <main class="card">
    <img class="logo" src="${escapeHtml(logoHref)}" alt="${escapeHtml(config.brandName)}" width="56" height="56">${taglineMarkup}
    <h1>${escapeHtml(headline)}</h1>
    <p class="status">This website is out of service.</p>
    <p class="lead">
      <strong>${escapeHtml(domain)}</strong> is a domain owned by ${escapeHtml(owner)}.
      ${escapeHtml(availability)}
    </p>${noteMarkup}
    <div class="actions">
      <a class="btn btn-primary" href="${escapeHtml(config.brandUrl)}">
        Visit ${escapeHtml(config.brandName)} <span class="arrow" aria-hidden="true">&rarr;</span>
      </a>
      <a class="btn btn-ghost" href="${escapeHtml(mailto)}">Enquire about this domain</a>
    </div>
    <hr class="divider">
    <p class="fine">
      Want this domain? Email
      <a href="${escapeHtml(mailto)}">${escapeHtml(config.contactEmail)}</a>${whatsappMarkup},
      and mention <strong>${escapeHtml(domain)}</strong>.
    </p>
  </main>
  <footer>&copy; ${escapeHtml(year)} ${escapeHtml(config.brandName)}${registration}. All rights reserved.</footer>
</body>
</html>
`;
}
