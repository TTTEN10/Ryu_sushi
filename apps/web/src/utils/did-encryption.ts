import { ethers } from 'ethers';

/**
 * DID-Based Encryption Utilities
 * 
 * Encryption Scheme:
 * 1. Generate AES-256-GCM symmetric key (client-side)
 * 2. Encrypt symmetric key using ECIES (wallet's public key)
 * 3. Store encrypted symmetric key in DID's encryptedData field
 * 4. Use symmetric key to encrypt/decrypt chat messages
 * 
 * Key Material Flow:
 * - Plaintext: Raw chat messages
 * - Ciphertext: AES-GCM encrypted messages
 * - Encrypted Key: ECIES encrypted symmetric key (stored in DID)
 */

/**
 * Generate a random AES-256-GCM key (32 bytes)
 */
export function generateSymmetricKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Encrypt symmetric key using wallet-based encryption
 * 
 * Scheme:
 * 1. Create a deterministic message that proves wallet ownership
 * 2. Sign the message to get a signature (proves private key ownership)
 * 3. Derive encryption key from signature + wallet address
 * 4. Encrypt symmetric key with derived key
 * 
 * @param symmetricKey The AES key to encrypt
 * @param walletAddress The wallet address
 * @param signer The ethers signer for signing
 * @returns Encrypted key as string (format: signature:encryptedKey)
 */
export async function encryptSymmetricKey(
  symmetricKey: Uint8Array,
  walletAddress: string,
  signer: ethers.JsonRpcSigner
): Promise<string> {
  try {
    // Use a fixed message format for key encryption
    // This allows us to verify the signature later without storing the message
    const keyMessage = `SafePsy Chat Encryption Key\nWallet: ${walletAddress.toLowerCase()}\nPurpose: Encrypt symmetric key for chat history`;
    
    // Sign the message - this proves wallet ownership
    // The signature is deterministic and can be verified
    const signature = await signer.signMessage(keyMessage);
    
    // Derive encryption key from signature + wallet address
    // Only someone with the private key can produce this signature
    const encoder = new TextEncoder();
    const signatureBytes = encoder.encode(signature);
    const walletBytes = encoder.encode(walletAddress.toLowerCase());
    
    // Combine signature + wallet for key derivation
    const combined = new Uint8Array(signatureBytes.length + walletBytes.length);
    combined.set(signatureBytes, 0);
    combined.set(walletBytes, signatureBytes.length);
    
    // Derive 32-byte key using SHA-256
    const hash = await crypto.subtle.digest('SHA-256', combined);
    const derivedKey = new Uint8Array(hash);
    
    // Encrypt symmetric key with derived key
    const encrypted = await encryptWithAES(symmetricKey, derivedKey);
    
    // Return: signature + encrypted key
    // The signature proves ownership and is needed for decryption
    return `${signature}:${encrypted}`;
  } catch (error) {
    console.error('Error encrypting symmetric key:', error);
    throw new Error('Failed to encrypt symmetric key');
  }
}

/**
 * Decrypt symmetric key using wallet
 * 
 * The encrypted key was encrypted with a key derived from a signature.
 * To decrypt, we need to:
 * 1. Extract the signature from encrypted key
 * 2. Verify the signature matches the wallet
 * 3. Re-derive the decryption key from signature + wallet address
 * 4. Decrypt the symmetric key
 * 
 * @param encryptedKey The encrypted key string (format: signature:encryptedKey)
 * @param walletAddress The wallet address
 * @param signer The ethers signer (for verification)
 * @returns Decrypted symmetric key
 */
export async function decryptSymmetricKey(
  encryptedKey: string,
  walletAddress: string,
  signer: ethers.JsonRpcSigner
): Promise<Uint8Array> {
  try {
    const [signature, encrypted] = encryptedKey.split(':');
    if (!signature || !encrypted) {
      throw new Error('Invalid encrypted key format');
    }
    
    // Reconstruct the original message (fixed format)
    const keyMessage = `SafePsy Chat Encryption Key\nWallet: ${walletAddress.toLowerCase()}\nPurpose: Encrypt symmetric key for chat history`;
    
    // Verify signature matches wallet
    try {
      const recoveredAddress = ethers.verifyMessage(keyMessage, signature);
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error('Encrypted key signature does not match wallet address');
      }
    } catch (verifyError) {
      throw new Error('Failed to verify encrypted key signature. The key may not belong to this wallet.');
    }
    
    // Derive decryption key from signature + wallet address
    const encoder = new TextEncoder();
    const signatureBytes = encoder.encode(signature);
    const walletBytes = encoder.encode(walletAddress.toLowerCase());
    
    const combined = new Uint8Array(signatureBytes.length + walletBytes.length);
    combined.set(signatureBytes, 0);
    combined.set(walletBytes, signatureBytes.length);
    
    const hash = await crypto.subtle.digest('SHA-256', combined);
    const derivedKey = new Uint8Array(hash);
    
    // Decrypt symmetric key
    const decrypted = await decryptWithAES(encrypted, derivedKey);
    return decrypted;
  } catch (error) {
    console.error('Error decrypting symmetric key:', error);
    throw new Error('Failed to decrypt symmetric key. Make sure you are using the correct wallet.');
  }
}

/**
 * Encrypt data with AES-256-GCM
 */
async function encryptWithAES(
  data: Uint8Array,
  key: Uint8Array
): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  
  // Return: IV (hex) + encrypted data (hex)
  const ivHex = ethers.hexlify(iv);
  const encryptedHex = ethers.hexlify(new Uint8Array(encrypted));
  return `${ivHex}:${encryptedHex}`;
}

/**
 * Decrypt data with AES-256-GCM
 */
async function decryptWithAES(
  encryptedData: string,
  key: Uint8Array
): Promise<Uint8Array> {
  const [ivHex, encryptedHex] = encryptedData.split(':');
  if (!ivHex || !encryptedHex) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = ethers.getBytes(ivHex);
  const encrypted = ethers.getBytes(encryptedHex);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  );
  
  return new Uint8Array(decrypted);
}

/**
 * Encrypt chat message with symmetric key
 */
export async function encryptChatMessage(
  message: string,
  symmetricKey: Uint8Array
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  return await encryptWithAES(data, symmetricKey);
}

/**
 * Decrypt chat message with symmetric key
 */
export async function decryptChatMessage(
  encryptedMessage: string,
  symmetricKey: Uint8Array
): Promise<string> {
  const decrypted = await decryptWithAES(encryptedMessage, symmetricKey);
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypt entire chat history (JSON string)
 */
export async function encryptChatHistory(
  chatHistory: string,
  symmetricKey: Uint8Array
): Promise<string> {
  return await encryptChatMessage(chatHistory, symmetricKey);
}

/**
 * Decrypt entire chat history
 */
export async function decryptChatHistory(
  encryptedHistory: string,
  symmetricKey: Uint8Array
): Promise<string> {
  return await decryptChatMessage(encryptedHistory, symmetricKey);
}

/**
 * Generate a hash of encrypted chat data (for on-chain storage)
 */
export async function hashEncryptedChat(encryptedChat: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(encryptedChat);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return ethers.hexlify(new Uint8Array(hash));
}

