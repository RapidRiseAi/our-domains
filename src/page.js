import { DEFAULT_CONFIG } from './config.js';

const MAX_DISPLAY_LENGTH = 80;

const FAVICON_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>" +
  "<rect width='32' height='32' rx='7' fill='#0f1420'/>" +
  "<path d='M7 22l6-6 4 4 8-9' fill='none' stroke='#6c8cff' stroke-width='3' " +
  "stroke-linecap='round' stroke-linejoin='round'/></svg>";

const FAVICON_HREF = `data:image/svg+xml,${encodeURIComponent(FAVICON_SVG)}`;

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

const STYLES = `
*, *::before, *::after { box-sizing: border-box; }

:root {
  color-scheme: light dark;
  --bg: #f4f6fa;
  --glow: rgba(47, 91, 255, 0.14);
  --surface: #ffffff;
  --text: #0d1424;
  --muted: #5b6577;
  --border: #e3e7ef;
  --accent: #2f5bff;
  --accent-hover: #2449da;
  --accent-text: #ffffff;
  --pill-bg: rgba(47, 91, 255, 0.08);
  --pill-text: #2449da;
  --shadow: 0 24px 60px -28px rgba(13, 20, 36, 0.35);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #06090f;
    --glow: rgba(108, 140, 255, 0.18);
    --surface: #10151f;
    --text: #eef2f9;
    --muted: #96a1b5;
    --border: #1e2634;
    --accent: #6c8cff;
    --accent-hover: #8aa3ff;
    --accent-text: #07101f;
    --pill-bg: rgba(108, 140, 255, 0.12);
    --pill-text: #a9beff;
    --shadow: 0 30px 70px -34px rgba(0, 0, 0, 0.85);
  }
}

html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 32px 20px;
  background-color: var(--bg);
  background-image: radial-gradient(60rem 32rem at 50% -12rem, var(--glow), transparent 70%);
  color: var(--text);
  font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

.card {
  position: relative;
  width: 100%;
  max-width: 620px;
  padding: clamp(28px, 6vw, 48px);
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: linear-gradient(90deg, var(--accent), transparent);
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 22px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--pill-bg);
  color: var(--pill-text);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  flex: none;
}

h1 {
  margin: 0;
  font-size: clamp(28px, 6vw, 42px);
  line-height: 1.15;
  letter-spacing: -0.025em;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.status {
  margin: 14px 0 0;
  font-size: clamp(17px, 2.6vw, 20px);
  font-weight: 600;
}

.lead, .note {
  margin: 14px 0 0;
  color: var(--muted);
  overflow-wrap: anywhere;
}

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
  gap: 8px;
  padding: 13px 22px;
  border: 1px solid transparent;
  border-radius: 11px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.btn-primary {
  background: var(--accent);
  color: var(--accent-text);
}

.btn-primary:hover { background: var(--accent-hover); }

.btn-secondary {
  border-color: var(--border);
  color: var(--text);
}

.btn-secondary:hover { border-color: var(--accent); color: var(--accent); }

.btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.arrow { font-size: 17px; line-height: 1; }

.divider {
  margin: 30px 0 0;
  border: 0;
  border-top: 1px solid var(--border);
}

.fine {
  margin: 18px 0 0;
  color: var(--muted);
  font-size: 14px;
}

.fine a { color: inherit; }

footer {
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

@media (max-width: 460px) {
  .actions { flex-direction: column; align-items: stretch; }
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
 *   year?: number,
 * }} params
 * @returns {string}
 */
export function renderDomainPage({ hostname, config = DEFAULT_CONFIG, entry = null, year = new Date().getUTCFullYear() }) {
  const domain = truncate(hostname || 'This domain');
  const headline = truncate(entry?.headline || domain);
  const forSale = entry?.forSale !== false;

  const title = `${domain} — out of service`;
  const description =
    `${domain} is owned by ${config.brandName} and is not currently in service. ` +
    (forSale ? `Contact ${config.brandName} to enquire about the domain.` : `Contact ${config.brandName} for details.`);

  const mailto = buildMailto({ email: config.contactEmail, domain, brandName: config.brandName });

  const availability = forSale
    ? `It is not in use right now, and we are open to offers from anyone who wants to put it to work.`
    : `It is not in use right now, and it is reserved for an upcoming ${config.brandName} project.`;

  const noteMarkup = entry?.note
    ? `\n      <p class="note">${escapeHtml(entry.note)}</p>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="author" content="${escapeHtml(config.brandName)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:site_name" content="${escapeHtml(config.brandName)}">
  <meta name="twitter:card" content="summary">
  <meta name="theme-color" content="#0f1420">
  <link rel="icon" href="${escapeHtml(FAVICON_HREF)}">
  <link rel="canonical" href="https://${escapeHtml(domain)}/">
  <style>${STYLES}</style>
</head>
<body>
  <main class="card">
    <p class="eyebrow"><span class="dot" aria-hidden="true"></span>Owned by ${escapeHtml(config.brandName)}</p>
    <h1>${escapeHtml(headline)}</h1>
    <p class="status">This website is out of service.</p>
    <p class="lead">
      <strong>${escapeHtml(domain)}</strong> is a domain owned by ${escapeHtml(config.brandName)}.
      ${escapeHtml(availability)}
    </p>${noteMarkup}
    <div class="actions">
      <a class="btn btn-primary" href="${escapeHtml(config.brandUrl)}">
        Visit ${escapeHtml(config.brandName)} <span class="arrow" aria-hidden="true">&rarr;</span>
      </a>
      <a class="btn btn-secondary" href="${escapeHtml(mailto)}">Enquire about this domain</a>
    </div>
    <hr class="divider">
    <p class="fine">
      Want this domain? Email us at
      <a href="${escapeHtml(mailto)}">${escapeHtml(config.contactEmail)}</a>
      and mention <strong>${escapeHtml(domain)}</strong>.
    </p>
  </main>
  <footer>&copy; ${escapeHtml(year)} ${escapeHtml(config.brandName)}. All rights reserved.</footer>
</body>
</html>
`;
}
