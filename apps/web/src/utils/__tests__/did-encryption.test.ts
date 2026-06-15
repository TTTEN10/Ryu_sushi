/**
 * DID Encryption Utilities Tests
 *
 * Tests for encryption/decryption functions in did-encryption.ts
 *
 * Note: For tests that require wallet signature verification, we use
 * ethers.Wallet to create real test wallets that can sign messages.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ethers } from 'ethers';
import {
  generateSymmetricKey,
  generateNewSymmetricKey,
  encryptSymmetricKey,
  decryptSymmetricKey,
  encryptChatMessage,
  decryptChatMessage,
  encryptChatHistory,
  decryptChatHistory,
  hashEncryptedChat,
  rotateEncryptionKey,
} from '../did-encryption';

// Create a deterministic test wallet for signing (using a fixed private key for tests only)
const TEST_PRIVATE_KEY = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const testWallet = new ethers.Wallet(TEST_PRIVATE_KEY);
const testWalletAddress = testWallet.address;

// Mock ethers signer using real wallet
const createMockSigner = (wallet: ethers.Wallet) => ({
  getAddress: vi.fn().mockResolvedValue(wallet.address),
  signMessage: vi.fn().mockImplementation((msg: string) => wallet.signMessage(msg)),
});

describe('DID Encryption Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSymmetricKey', () => {
    it('generates a 32-byte key', () => {
      const key = generateSymmetricKey();
      expect(key.length).toBe(32);
      expect(key).toBeInstanceOf(Uint8Array);
    });

    it('generates different keys on each call', () => {
      const key1 = generateSymmetricKey();
      const key2 = generateSymmetricKey();

      expect(key1).not.toEqual(key2);
    });

    it('generates cryptographically random bytes', () => {
      const key = generateSymmetricKey();

      // Should not be all zeros
      const allZeros = key.every(byte => byte === 0);
      expect(allZeros).toBe(false);
    });
  });

  describe('generateNewSymmetricKey', () => {
    it('generates a new 32-byte key for rotation', () => {
      const key = generateNewSymmetricKey();
      expect(key.length).toBe(32);
    });

    it('is an alias for generateSymmetricKey', () => {
      const key1 = generateNewSymmetricKey();
      const key2 = generateSymmetricKey();

      expect(key1.length).toBe(key2.length);
    });
  });

  describe('encryptSymmetricKey and decryptSymmetricKey', () => {
    it('encrypts and decrypts a symmetric key', async () => {
      const signer = createMockSigner(testWallet) as any;
      const symmetricKey = generateSymmetricKey();

      // Encrypt
      const encryptedKey = await encryptSymmetricKey(symmetricKey, testWalletAddress, signer);
      expect(encryptedKey).toBeDefined();
      expect(encryptedKey.includes(':')).toBe(true); // Format: signature:iv:encrypted

      // Decrypt
      const decryptedKey = await decryptSymmetricKey(encryptedKey, testWalletAddress, signer);
      expect(decryptedKey).toEqual(symmetricKey);
    });

    it('uses wallet signature for key derivation', async () => {
      const signer = createMockSigner(testWallet) as any;
      const symmetricKey = generateSymmetricKey();

      await encryptSymmetricKey(symmetricKey, testWalletAddress, signer);

      // Verify signMessage was called
      expect(signer.signMessage).toHaveBeenCalled();
    });

    it('fails to decrypt with wrong wallet address', async () => {
      const signer = createMockSigner(testWallet) as any;
      const wrongWalletAddress = '0x9999999999999999999999999999999999999999';
      const symmetricKey = generateSymmetricKey();

      const encryptedKey = await encryptSymmetricKey(symmetricKey, testWalletAddress, signer);

      // Try to decrypt with wrong wallet
      await expect(decryptSymmetricKey(encryptedKey, wrongWalletAddress, signer))
        .rejects
        .toThrow('Failed to decrypt');
    });

    it('handles invalid encrypted key format', async () => {
      const signer = createMockSigner(testWallet) as any;

      await expect(decryptSymmetricKey('invalid-format', testWalletAddress, signer))
        .rejects
        .toThrow('Failed to decrypt');
    });
  });

  describe('encryptChatMessage and decryptChatMessage', () => {
    it('encrypts and decrypts a chat message', async () => {
      const symmetricKey = generateSymmetricKey();
      const message = 'Hello, this is a test message!';

      const encrypted = await encryptChatMessage(message, symmetricKey);
      expect(encrypted).toBeDefined();
      expect(encrypted.includes(':')).toBe(true);

      const decrypted = await decryptChatMessage(encrypted, symmetricKey);
      expect(decrypted).toBe(message);
    });

    it('handles unicode characters', async () => {
      const symmetricKey = generateSymmetricKey();
      const message = 'Hello 你好 Привет 🎉';

      const encrypted = await encryptChatMessage(message, symmetricKey);
      const decrypted = await decryptChatMessage(encrypted, symmetricKey);

      expect(decrypted).toBe(message);
    });

    it('handles empty messages', async () => {
      const symmetricKey = generateSymmetricKey();
      const message = '';

      const encrypted = await encryptChatMessage(message, symmetricKey);
      const decrypted = await decryptChatMessage(encrypted, symmetricKey);

      expect(decrypted).toBe('');
    });

    it('produces different ciphertext for same plaintext (due to random IV)', async () => {
      const symmetricKey = generateSymmetricKey();
      const message = 'Same message twice';

      const encrypted1 = await encryptChatMessage(message, symmetricKey);
      const encrypted2 = await encryptChatMessage(message, symmetricKey);

      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('encryptChatHistory and decryptChatHistory', () => {
    it('encrypts and decrypts chat history', async () => {
      const symmetricKey = generateSymmetricKey();
      const messages = [
        { id: '1', role: 'user' as const, content: 'Hello', timestamp: new Date('2026-01-01') },
        { id: '2', role: 'assistant' as const, content: 'Hi there!', timestamp: new Date('2026-01-01') },
      ];
      const historyJson = JSON.stringify(messages);

      const encrypted = await encryptChatHistory(historyJson, symmetricKey);
      const decrypted = await decryptChatHistory(encrypted, symmetricKey);

      const parsed = JSON.parse(decrypted);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].content).toBe('Hello');
      expect(parsed[0].role).toBe('user');
      expect(parsed[1].content).toBe('Hi there!');
      expect(parsed[1].role).toBe('assistant');
    });

    it('handles large chat histories', async () => {
      const symmetricKey = generateSymmetricKey();
      const messages = Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        role: i % 2 === 0 ? 'user' : 'assistant' as const,
        content: `Message ${i} with some content to make it longer`,
        timestamp: new Date('2026-01-01'),
      }));
      const historyJson = JSON.stringify(messages);

      const encrypted = await encryptChatHistory(historyJson, symmetricKey);
      const decrypted = await decryptChatHistory(encrypted, symmetricKey);

      const parsed = JSON.parse(decrypted);
      expect(parsed).toHaveLength(100);
      expect(parsed[0].content).toContain('Message 0');
      expect(parsed[99].content).toContain('Message 99');
    });
  });

  describe('hashEncryptedChat', () => {
    it('generates a SHA-256 hash of encrypted chat', async () => {
      const encryptedChat = '0xencrypted-chat-data';
      const hash = await hashEncryptedChat(encryptedChat);

      expect(hash).toBeDefined();
      expect(hash.startsWith('0x')).toBe(true);
      expect(hash.length).toBe(66); // 0x + 64 hex chars for SHA-256
    });

    it('produces consistent hashes for same input', async () => {
      const encryptedChat = '0xsame-data';

      const hash1 = await hashEncryptedChat(encryptedChat);
      const hash2 = await hashEncryptedChat(encryptedChat);

      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different input', async () => {
      const hash1 = await hashEncryptedChat('0xdata1');
      const hash2 = await hashEncryptedChat('0xdata2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('rotateEncryptionKey', () => {
    it('rotates encryption key successfully', async () => {
      const oldKey = generateSymmetricKey();
      const signer = createMockSigner(testWallet) as any;
      const messages = [
        { id: '1', role: 'user' as const, content: 'Test message', timestamp: new Date('2026-01-01T00:00:00Z') },
      ];
      const encryptedHistory = await encryptChatHistory(JSON.stringify(messages), oldKey);

      const result = await rotateEncryptionKey(
        oldKey,
        encryptedHistory,
        testWalletAddress,
        signer,
        messages
      );

      expect(result.newSymmetricKey).toBeDefined();
      expect(result.newSymmetricKey.length).toBe(32);
      expect(result.newEncryptedKey).toBeDefined();
      expect(result.newEncryptedChat).toBeDefined();
      expect(result.newBlobHash).toBeDefined();

      // Verify new key can decrypt the re-encrypted chat
      const decrypted = await decryptChatHistory(result.newEncryptedChat, result.newSymmetricKey);
      const parsed = JSON.parse(decrypted);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].content).toBe('Test message');
      expect(parsed[0].role).toBe('user');
    });

    it('generates a different key on each rotation', async () => {
      const oldKey = generateSymmetricKey();
      const signer = createMockSigner(testWallet) as any;
      const messages = [{ id: '1', role: 'user' as const, content: 'Test', timestamp: new Date('2026-01-01') }];
      const encryptedHistory = await encryptChatHistory(JSON.stringify(messages), oldKey);

      const result1 = await rotateEncryptionKey(oldKey, encryptedHistory, testWalletAddress, signer, messages);
      const result2 = await rotateEncryptionKey(oldKey, encryptedHistory, testWalletAddress, signer, messages);

      expect(result1.newSymmetricKey).not.toEqual(result2.newSymmetricKey);
    });

    it('decrypts with old key and re-encrypts with new key', async () => {
      const oldKey = generateSymmetricKey();
      const signer = createMockSigner(testWallet) as any;
      const originalMessages = [
        { id: '1', role: 'user' as const, content: 'Original message', timestamp: new Date('2026-01-01') },
      ];
      const encryptedHistory = await encryptChatHistory(JSON.stringify(originalMessages), oldKey);

      const result = await rotateEncryptionKey(oldKey, encryptedHistory, testWalletAddress, signer);

      // Old key should not decrypt the new encrypted chat
      await expect(decryptChatHistory(result.newEncryptedChat, oldKey))
        .rejects
        .toThrow();

      // New key should decrypt successfully
      const decrypted = await decryptChatHistory(result.newEncryptedChat, result.newSymmetricKey);
      const parsed = JSON.parse(decrypted);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].content).toBe('Original message');
      expect(parsed[0].role).toBe('user');
    });
  });
});
