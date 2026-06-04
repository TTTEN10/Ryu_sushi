import crypto from "crypto";

/**
 * Hashes a wallet address using SHA-256 for privacy-preserving analytics tracking.
 * Never store raw wallet addresses in analytics tables.
 *
 * @param walletAddress - The wallet address to hash
 * @returns SHA-256 hash of the lowercase wallet address as a hex string
 *
 * Example:
 * hashWalletAddress("0x1234...abcd") => "a1b2c3d4..."
 */
export function hashWalletAddress(walletAddress: string): string {
  if (!walletAddress || typeof walletAddress !== 'string') {
    throw new Error('Wallet address is required for hashing');
  }

  // Lowercase the address before hashing for consistency
  const normalized = walletAddress.toLowerCase().trim();

  return crypto
    .createHash("sha256")
    .update(normalized)
    .digest("hex");
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
