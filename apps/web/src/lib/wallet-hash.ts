/**
 * Hashes a wallet address using SHA-256 for privacy-preserving analytics tracking.
 * Works in browser environment using Web Crypto API.
 *
 * @param walletAddress - The wallet address to hash
 * @returns SHA-256 hash of the lowercase wallet address as a hex string
 *
 * IMPORTANT: Never store raw wallet addresses in analytics.
 * Always hash before sending to analytics backend.
 */
export async function hashWalletAddress(walletAddress: string): Promise<string> {
  if (!walletAddress || typeof walletAddress !== 'string') {
    throw new Error('Wallet address is required for hashing');
  }

  // Lowercase the address before hashing for consistency
  const normalized = walletAddress.toLowerCase().trim();

  // Encode the address as bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);

  // Hash using SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Validates if a string is a valid Ethereum wallet address format.
 * Does not verify checksum, only format (0x + 40 hex chars).
 *
 * @param address - The address to validate
 * @returns true if valid format
 */
export function isValidWalletAddressFormat(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  // Ethereum address: 0x followed by 40 hex characters
  const regex = /^0x[a-fA-F0-9]{40}$/;
  return regex.test(address);
}
