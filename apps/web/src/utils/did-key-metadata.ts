import { ethers } from 'ethers';

/** UTF-8 wire format for `DIDIdentityToken` `encryptedKeyMetadata` (matches `did-contract` write path). */
export function encryptedChatKeyToOnchainBytes(encryptedKeyString: string): Uint8Array {
  return new TextEncoder().encode(encryptedKeyString);
}

/**
 * Bytes to send with `updateChatReference`: prefer in-session wallet-wrapped key material;
 * otherwise reuse on-chain bytes returned by `/api/chat/save` as `preserveEncryptedKeyMetadata`.
 */
export function keyMetadataBytesForDidUpdate(
  encryptedKeyMaterial: string | null | undefined,
  preserveHexFromApi: string | null | undefined,
): Uint8Array {
  if (encryptedKeyMaterial) {
    return encryptedChatKeyToOnchainBytes(encryptedKeyMaterial);
  }
  if (preserveHexFromApi && preserveHexFromApi !== '0x') {
    try {
      return new Uint8Array(ethers.getBytes(preserveHexFromApi));
    } catch {
      return new Uint8Array(0);
    }
  }
  return new Uint8Array(0);
}

/**
 * Deserialize `bytes encryptedKeyMetadata` from the identity token into the
 * `signature:ivHex:ciphertextHex` string consumed by `decryptSymmetricKey`.
 */
export function onchainMetadataToEncryptedChatKey(metadataHex: string): string | null {
  if (!metadataHex || metadataHex === '0x') {
    return null;
  }
  try {
    const bytes = ethers.getBytes(metadataHex);
    if (bytes.length === 0) {
      return null;
    }
    const decoded = new TextDecoder().decode(bytes).replace(/\0/g, '').trim();
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}
