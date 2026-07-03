/**
 * Unrestricted Wallets
 *
 * Wallets in this list bypass all quota and paywall restrictions.
 * Intended for testing and development purposes.
 *
 * Configure via environment variable UNRESTRICTED_WALLETS (comma-separated list)
 * or add directly to the DEFAULT_UNRESTRICTED_WALLETS array below.
 */

/**
 * Default unrestricted wallets for testing
 * Add wallet addresses here to bypass quota and paywall restrictions
 */
export const DEFAULT_UNRESTRICTED_WALLETS = [
  '0x1F4739e229AdCb1c986C8A8b66f686ddEc29694c',
];

/**
 * Get the list of unrestricted wallet addresses from environment variable and defaults
 */
export function getUnrestrictedWallets(): string[] {
  const envWallets = process.env.UNRESTRICTED_WALLETS;

  if (!envWallets || envWallets.trim() === '') {
    return DEFAULT_UNRESTRICTED_WALLETS;
  }

  const parsedWallets = envWallets
    .split(',')
    .map((addr) => addr.trim())
    .filter((addr) => addr.length > 0);

  // Combine with defaults and deduplicate
  const allWallets = [...new Set([...DEFAULT_UNRESTRICTED_WALLETS, ...parsedWallets])];

  return allWallets;
}

/**
 * Check if a wallet address is unrestricted (bypasses quotas and paywall)
 * @param walletAddress - The wallet address to check (case-insensitive)
 * @returns true if the wallet is unrestricted, false otherwise
 */
export function isUnrestrictedWallet(walletAddress: string): boolean {
  if (!walletAddress) {
    return false;
  }

  const unrestrictedWallets = getUnrestrictedWallets();
  const normalizedWallet = walletAddress.toLowerCase();

  return unrestrictedWallets.some((addr) => addr.toLowerCase() === normalizedWallet);
}
