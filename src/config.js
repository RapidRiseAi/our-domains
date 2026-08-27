/**
 * Branding shown on every parked-domain page.
 *
 * Every value can be overridden per environment with a Worker variable
 * (see the `[vars]` block in wrangler.toml) without touching this file.
 */
export const DEFAULT_CONFIG = {
  brandName: 'RapidRise AI',
  brandUrl: 'https://rapidriseai.com',
  contactEmail: 'domains@rapidriseai.com',
};

const OVERRIDES = {
  brandName: 'BRAND_NAME',
  brandUrl: 'BRAND_URL',
  contactEmail: 'CONTACT_EMAIL',
};

/**
 * Merge the Worker environment over the defaults.
 *
 * @param {Record<string, unknown>} [env]
 * @returns {typeof DEFAULT_CONFIG}
 */
export function resolveConfig(env = {}) {
  const config = { ...DEFAULT_CONFIG };

  for (const [key, variable] of Object.entries(OVERRIDES)) {
    const value = env?.[variable];
    if (typeof value === 'string' && value.trim() !== '') {
      config[key] = value.trim();
    }
  }

  return config;
}
