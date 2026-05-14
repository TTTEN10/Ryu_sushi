/**
 * HTTPS origins for Universal Links / navigation prefixes.
 * Must stay aligned with `app.json` → `ios.associatedDomains` (`applinks:<host>` without scheme).
 */
export const UNIVERSAL_LINK_ORIGINS = ['https://polinapsycho.com', 'https://www.polinapsycho.com'] as const;
