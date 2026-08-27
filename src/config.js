/**
 * Branding shown on every parked-domain page.
 *
 * These defaults mirror www.rapidriseai.com so a parked domain looks like it
 * belongs to the same company. Every value can be overridden per environment
 * with a Worker variable (see the `[vars]` block in wrangler.toml).
 */
export const DEFAULT_CONFIG = {
  brandName: 'Rapid Rise AI',
  legalName: 'Rapid Rise AI (Pty) Ltd',
  registrationNumber: 'K2024727338',
  tagline: 'Custom Software, AI Systems & Business Automation',
  brandUrl: 'https://www.rapidriseai.com',
  contactEmail: 'team@rapidriseai.com',
  whatsappUrl: 'https://wa.me/27649031234',
  whatsappLabel: '064 903 1234',
};

/** Blank these out to drop them from the page. */
const OPTIONAL = new Set(['legalName', 'registrationNumber', 'tagline', 'whatsappUrl', 'whatsappLabel']);

const OVERRIDES = {
  brandName: 'BRAND_NAME',
  legalName: 'LEGAL_NAME',
  registrationNumber: 'REGISTRATION_NUMBER',
  tagline: 'TAGLINE',
  brandUrl: 'BRAND_URL',
  contactEmail: 'CONTACT_EMAIL',
  whatsappUrl: 'WHATSAPP_URL',
  whatsappLabel: 'WHATSAPP_LABEL',
};

/**
 * Merge the Worker environment over the defaults.
 *
 * An empty value clears an optional field — that is how the WhatsApp button is
 * turned off. For the fields the page cannot do without (the brand name, the
 * site URL, the contact address) an empty value falls back to the default
 * rather than rendering a page with a hole in it.
 *
 * @param {Record<string, unknown>} [env]
 * @returns {typeof DEFAULT_CONFIG}
 */
export function resolveConfig(env = {}) {
  const config = { ...DEFAULT_CONFIG };

  for (const [key, variable] of Object.entries(OVERRIDES)) {
    const value = env?.[variable];
    if (typeof value !== 'string') continue;

    const trimmed = value.trim();
    if (trimmed !== '' || OPTIONAL.has(key)) {
      config[key] = trimmed;
    }
  }

  return config;
}
