/**
 * Startup secret validation — blocks production boot with insecure or known-compromised values.
 */

const DEFAULT_JWT_SECRET = 'change-me-in-production-use-strong-random-secret';

const PLACEHOLDER_PATTERNS = [
  /^REPLACE_WITH_/i,
  /^CHANGE_THIS_/i,
  /^YOUR_/i,
  /^<generate/i,
];

const COMPROMISED_DID_PRIVATE_KEYS = new Set([
  '0x48d3642d9eb0552f3331dcc213b324a22e724adc6d5d87dec38c018816711261',
  '48d3642d9eb0552f3331dcc213b324a22e724adc6d5d87dec38c018816711261',
]);

const COMPROMISED_SCALEWAY_API_KEYS = new Set([
  '97b47ef8-e459-45d7-ad53-d7e9b5acb97b',
]);

function isPlaceholder(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function assertStrongSecret(name: string, value: string | undefined, minLength = 32): void {
  if (!value || value.trim().length < minLength) {
    throw new Error(`${name} must be at least ${minLength} characters`);
  }
  if (isPlaceholder(value)) {
    throw new Error(`${name} is still a placeholder value`);
  }
  if (name === 'JWT_SECRET' && value === DEFAULT_JWT_SECRET) {
    throw new Error(`${name} is using the insecure default`);
  }
}

function assertDatabaseUrl(databaseUrl: string | undefined): void {
  if (!databaseUrl || !databaseUrl.trim()) {
    throw new Error('DATABASE_URL is required in production');
  }
  if (/CHANGE_THIS_PASSWORD/i.test(databaseUrl)) {
    throw new Error('DATABASE_URL still contains the default password placeholder');
  }
}

function assertDidSignerKey(privateKey: string | undefined): void {
  if (!privateKey || !privateKey.trim()) {
    throw new Error('DID_BACKEND_SIGNER_PRIVATE_KEY is required in production');
  }
  const normalized = privateKey.trim().toLowerCase();
  if (COMPROMISED_DID_PRIVATE_KEYS.has(normalized) || COMPROMISED_DID_PRIVATE_KEYS.has(`0x${normalized.replace(/^0x/, '')}`)) {
    throw new Error('DID_BACKEND_SIGNER_PRIVATE_KEY matches a known compromised wallet');
  }
  if (isPlaceholder(privateKey)) {
    throw new Error('DID_BACKEND_SIGNER_PRIVATE_KEY is still a placeholder value');
  }
}

function assertScalewayApiKey(apiKey: string | undefined): void {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('SCALEWAY_API_KEY is required in production');
  }
  if (COMPROMISED_SCALEWAY_API_KEYS.has(apiKey.trim())) {
    throw new Error('SCALEWAY_API_KEY matches a known revoked/exposed key id');
  }
  if (isPlaceholder(apiKey)) {
    throw new Error('SCALEWAY_API_KEY is still a placeholder value');
  }
}

export function validateSecretsOrThrow(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  assertStrongSecret('JWT_SECRET', process.env.JWT_SECRET);
  assertStrongSecret('ADMIN_SECRET', process.env.ADMIN_SECRET);
  if (process.env.IP_HASHING_ENABLED === 'true') {
    assertStrongSecret('IP_SALT', process.env.IP_SALT);
  }
  assertDatabaseUrl(process.env.DATABASE_URL);
  assertDidSignerKey(process.env.DID_BACKEND_SIGNER_PRIVATE_KEY);
  assertScalewayApiKey(process.env.SCALEWAY_API_KEY);
}
