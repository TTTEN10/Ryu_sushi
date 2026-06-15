import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import {
  generateSymmetricKey,
  encryptSymmetricKey,
  decryptSymmetricKey,
  encryptChatHistory,
  decryptChatHistory,
  rotateEncryptionKey as rotateEncryptionKeyUtil,
} from '../utils/did-encryption';
import type { JsonRpcSigner } from 'ethers';
import { getEncryptedKeyMetadata, updateEncryptedKeyMetadata } from '../utils/did-contract';
import { onchainMetadataToEncryptedChatKey, encryptedChatKeyToOnchainBytes } from '../utils/did-key-metadata';
import { apiFetch } from '../config/api';

/** Legacy cache key; read only for migration when on-chain metadata is still empty. */
function legacyLocalStorageKey(walletAddress: string): string {
  return `encryptedKey_${walletAddress.toLowerCase()}`;
}

async function persistEncryptedKeyToChain(
  signer: JsonRpcSigner,
  encryptedKeyString: string,
): Promise<void> {
  const bytes = encryptedChatKeyToOnchainBytes(encryptedKeyString);
  if (bytes.length > 10_000) {
    throw new Error('Encrypted key metadata exceeds on-chain size limit');
  }
  await updateEncryptedKeyMetadata(signer, bytes);
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface SaveChatResult {
  blobHash: string | null;
  chatReference: string | null;
  requiresDidUpdate: boolean;
  preserveEncryptedKeyMetadata: string | null;
}

/**
 * Hook for managing encrypted chat storage (verified wallet sessions only).
 *
 * Guest mode does not use this path: ChatWidget keeps messages in React state and calls
 * POST /api/chat/completions with { mode: 'guest' } — no ciphertext is saved to the API.
 *
 * Flow (authenticated):
 * 1. Load wallet-wrapped symmetric key from DID `encryptedKeyMetadata` (on-chain), not localStorage.
 * 2. Optional: migrate from legacy `localStorage` once if chain metadata is empty, then write
 *    `encryptedKeyMetadata` on-chain and remove the legacy key.
 * 3. New keys with an existing DID: persist via `updateEncryptedKeyMetadata` immediately.
 * 4. On save: encrypt chat, POST /api/chat/save; caller updates chat reference on-chain with key bytes
 *    (`updateChatReference` via `ChatWidget` / `keyMetadataBytesForDidUpdate`).
 */
export function useChatEncryption() {
  const { wallet, signer, provider } = useWallet();
  const { authState } = useAuth();
  const [symmetricKey, setSymmetricKey] = useState<Uint8Array | null>(null);
  const [encryptedKey, setEncryptedKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeKey = useCallback(async () => {
    if (!wallet || !signer || !authState.isVerified) {
      console.log('Skipping key initialization: wallet/signer/not verified', {
        hasWallet: !!wallet,
        hasSigner: !!signer,
        isVerified: authState.isVerified,
      });
      return;
    }

    const didContractConfigured = Boolean(
      (import.meta.env.VITE_DID_IDENTITY_TOKEN_ADDRESS || '').trim(),
    );

    console.log('Initializing encryption key...', {
      walletAddress: wallet.address,
      hasDid: authState.didInfo?.hasDid,
      didStatus: authState.didStatus,
      didContractConfigured,
    });

    try {
      setIsLoading(true);
      setError(null);

      // If we already have a symmetric key, don't re-initialize (prevents key rotation on didStatus changes)
      // The key is wallet-derived and deterministic, so it's safe to keep across re-renders
      if (symmetricKey) {
        console.log('Encryption key already initialized, skipping re-initialization');
        setIsLoading(false);
        return;
      }

      if (authState.didInfo?.hasDid && provider && didContractConfigured) {
        try {
          const metadataHex = await getEncryptedKeyMetadata(provider, wallet.address);
          console.log('DID encrypted key metadata:', {
            metadataHex: metadataHex?.substring(0, 50) + '...',
            metadataLength: metadataHex?.length,
          });
          const fromChain = onchainMetadataToEncryptedChatKey(metadataHex);
          console.log('Parsed from chain:', {
            fromChain: fromChain ? fromChain.substring(0, 50) + '...' : null,
            hasColon: fromChain?.includes(':'),
          });
          if (fromChain && fromChain.includes(':')) {
            const decryptedKey = await decryptSymmetricKey(fromChain, wallet.address, signer);
            console.log('Successfully loaded key from DID contract');
            setSymmetricKey(decryptedKey);
            setEncryptedKey(fromChain);
            return;
          } else {
            console.log('No valid key found in DID contract (empty or invalid format)');
          }
        } catch (err) {
          console.warn('Could not read encrypted key metadata from DID contract:', err);
        }
      }

      // Check localStorage for encrypted key (fallback when no DID or empty on-chain metadata)
      // This is critical for users without DID - the key MUST be recovered from localStorage
      const localStorageKey = legacyLocalStorageKey(wallet.address);
      const storedEncryptedKey = localStorage.getItem(localStorageKey);
      console.log('Checking localStorage for encrypted key:', {
        localStorageKey,
        walletAddress: wallet.address,
        hasStoredKey: !!storedEncryptedKey,
        storedKeyPreview: storedEncryptedKey ? storedEncryptedKey.substring(0, 80) + '...' : null,
        allKeys: Object.keys(localStorage).filter(k => k.includes('encryptedKey')),
      });
      if (storedEncryptedKey) {
        // Validate format: should be "signature:ivHex:ciphertextHex" (at least 2 colons)
        const colonCount = (storedEncryptedKey.match(/:/g) || []).length;
        if (colonCount < 2) {
          console.warn('Stored key has invalid format (missing colons), clearing and regenerating');
          localStorage.removeItem(localStorageKey);
        } else {
          console.log('Found encrypted key in localStorage, attempting to decrypt...');
          try {
            const decryptedKey = await decryptSymmetricKey(
              storedEncryptedKey,
              wallet.address,
              signer,
            );
            console.log('Successfully loaded key from localStorage');
            setSymmetricKey(decryptedKey);
            setEncryptedKey(storedEncryptedKey);

            // If user now has a DID, migrate to chain
            if (authState.didInfo?.hasDid && provider && didContractConfigured) {
              try {
                await persistEncryptedKeyToChain(signer, storedEncryptedKey);
                localStorage.removeItem(legacyLocalStorageKey(wallet.address));
                console.log('Migrated key from localStorage to DID contract');
              } catch (err) {
                console.warn('Could not migrate encrypted key to DID contract:', err);
              }
            }
            return;
          } catch (decryptErr: any) {
            console.warn('Failed to decrypt localStorage key (wrong wallet?):', decryptErr?.message);
            // Continue to generate new key
          }
        }
      }

      // No existing key found - generate new one
      console.log('Generating new encryption key (no existing key found)');
      const newKey = generateSymmetricKey();
      const encrypted = await encryptSymmetricKey(newKey, wallet.address, signer);

      setSymmetricKey(newKey);
      setEncryptedKey(encrypted);
      console.log('New key generated and encrypted');

      // Persist to localStorage immediately (critical for users without DID)
      const saveKey = legacyLocalStorageKey(wallet.address);
      localStorage.setItem(saveKey, encrypted);
      console.log('Encrypted key stored in localStorage:', {
        localStorageKey: saveKey,
        walletAddress: wallet.address,
        encryptedKeyPreview: encrypted.substring(0, 50) + '...',
      });

      if (authState.didInfo?.hasDid && provider && didContractConfigured) {
        try {
          await persistEncryptedKeyToChain(signer, encrypted);
          console.log('New key persisted to DID contract');
        } catch (err) {
          console.warn('Could not persist new encrypted key to DID contract:', err);
        }
      }
    } catch (err: any) {
      console.error('Error initializing encryption key:', err);
      setError(err.message || 'Failed to initialize encryption');
    } finally {
      setIsLoading(false);
    }
  }, [
    wallet,
    signer,
    provider,
    authState.isVerified,
    authState.didStatus,
    authState.didInfo,
    symmetricKey,
  ]);

  /**
   * Persist wallet-wrapped symmetric key to DID `encryptedKeyMetadata` (on-chain).
   * Call after minting a DID or when chain metadata was empty after migration.
   */
  const saveKeyToDID = useCallback(async () => {
    if (!wallet || !signer || !encryptedKey || !authState.didInfo?.hasDid) {
      return undefined;
    }

    return persistEncryptedKeyToChain(signer, encryptedKey);
  }, [wallet, signer, encryptedKey, authState.didInfo]);

  const loadChat = useCallback(async (): Promise<ChatMessage[]> => {
    if (!symmetricKey || !authState.isVerified) {
      return [];
    }

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      const response = await apiFetch('/chat/load', {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to load chat');
      }

      const data = await response.json();

      // Debug: log the response to see what we're getting
      console.log('Chat load response:', {
        success: data.success,
        hasChat: data.data?.hasChat,
        hasBlob: !!data.data?.encryptedChatBlob,
        blobLength: data.data?.encryptedChatBlob?.length,
        didTokenId: data.data?.didTokenId,
      });

      if (!data.success || !data.data.hasChat || !data.data.encryptedChatBlob) {
        return [];
      }

      let decryptedHistory: string;
      try {
        decryptedHistory = await decryptChatHistory(data.data.encryptedChatBlob, symmetricKey);
      } catch (decryptError: any) {
        console.error('Failed to decrypt chat history:', {
          error: decryptError?.message || String(decryptError),
          hasBlob: !!data.data.encryptedChatBlob,
          blobLength: data.data.encryptedChatBlob?.length,
          symmetricKeyReady: !!symmetricKey,
          blobPreview: data.data.encryptedChatBlob?.substring(0, 50) + '...',
        });

        // Decryption failure means the chat was encrypted with a different key
        // This happens when:
        // 1. User had a previous session with a different key (before localStorage fix)
        // 2. User is using a different wallet
        // 3. Corrupted data

        // Clear the corrupted chat from backend to avoid repeated failures (best effort).
        const deleteResp = await apiFetch('/chat', { method: 'DELETE' }).catch(() => null);
        if (deleteResp && !deleteResp.ok && deleteResp.status !== 404) {
          console.warn('Failed to delete corrupted chat:', deleteResp.status);
        }

        // Return empty array - user will start with fresh chat
        return [];
      }

      const messages: ChatMessage[] = JSON.parse(decryptedHistory);
      return messages.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
    } catch (err: any) {
      console.error('Error loading chat:', err);
      return [];
    }
  }, [symmetricKey, authState.isVerified]);

  const saveChat = useCallback(
    async (messages: ChatMessage[]): Promise<SaveChatResult> => {
      if (!symmetricKey || !authState.isVerified) {
        console.error('saveChat failed: encryption not initialized', {
          hasSymmetricKey: !!symmetricKey,
          isVerified: authState.isVerified,
          didStatus: authState.didStatus,
          hasDidInfo: !!authState.didInfo,
        });
        throw new Error('Encryption not initialized');
      }

      console.log('Saving chat:', {
        messageCount: messages.length,
        didTokenId: authState.didInfo?.tokenId,
        hasDid: authState.didInfo?.hasDid,
      });

      const chatJson = JSON.stringify(messages);
      const encryptedBlob = await encryptChatHistory(chatJson, symmetricKey);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      const didTokenId = authState.didInfo?.tokenId ?? authState.didInfo?.did ?? null;

      const response = await apiFetch('/chat/save', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          encryptedChatBlob: encryptedBlob,
          didTokenId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('saveChat API error:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        throw new Error((errorData as { message?: string }).message || 'Failed to save chat');
      }

      const data = await response.json();
      const payload = data?.data ?? {};

      console.log('Chat saved successfully:', {
        blobHash: payload.blobHash?.substring(0, 16) + '...',
        requiresDidUpdate: payload.requiresDidUpdate,
        hasEncryptedKey: !!encryptedKey,
      });

      // Ensure encrypted key is persisted to localStorage (critical for users without DID)
      if (encryptedKey && wallet) {
        try {
          localStorage.setItem(legacyLocalStorageKey(wallet.address), encryptedKey);
        } catch (lsErr: any) {
          console.warn('Failed to persist encrypted key to localStorage:', lsErr?.message);
        }
      }

      return {
        blobHash: payload.blobHash ?? null,
        chatReference: payload.chatReference ?? payload.blobHash ?? null,
        requiresDidUpdate: Boolean(payload.requiresDidUpdate),
        preserveEncryptedKeyMetadata: payload.preserveEncryptedKeyMetadata ?? null,
      };
    },
    [symmetricKey, authState.isVerified, authState.didInfo],
  );

  /**
   * Rotate encryption key
   *
   * Key Rotation Flow:
   * 1. Load current encrypted chat
   * 2. Generate new DEK and wrap with wallet
   * 3. Decrypt chat with old key
   * 4. Re-encrypt chat with new key
   * 5. Save new encrypted chat to API
   * 6. Update DID contract with new wrapped key
   * 7. Update local state with new key
   *
   * @returns Object with success status and new key metadata
   */
  const rotateKey = useCallback(async (): Promise<{
    success: boolean;
    newBlobHash: string | null;
    error?: string;
  }> => {
    if (!symmetricKey || !encryptedKey || !authState.isVerified || !wallet || !signer) {
      const error = 'Encryption not initialized or wallet not verified';
      console.error('rotateKey failed:', error, {
        hasSymmetricKey: !!symmetricKey,
        hasEncryptedKey: !!encryptedKey,
        isVerified: authState.isVerified,
        hasWallet: !!wallet,
        hasSigner: !!signer,
      });
      return { success: false, newBlobHash: null, error };
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('Starting key rotation...');

      // Step 1: Load current encrypted chat
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      const loadResponse = await apiFetch('/chat/load', {
        method: 'GET',
        headers,
      });

      if (!loadResponse.ok) {
        throw new Error('Failed to load current chat for key rotation');
      }

      const loadData = await loadResponse.json();
      if (!loadData.success || !loadData.data?.encryptedChatBlob) {
        throw new Error('No chat history found to rotate');
      }

      const currentEncryptedBlob = loadData.data.encryptedChatBlob;

      // Step 2-4: Generate new key and re-encrypt chat
      const rotationResult = await rotateEncryptionKeyUtil(
        symmetricKey,
        currentEncryptedBlob,
        wallet.address,
        signer
      );

      console.log('Key rotation completed locally:', {
        newBlobHash: rotationResult.newBlobHash.substring(0, 16) + '...',
      });

      // Step 5: Save new encrypted chat to API
      const saveResponse = await apiFetch('/chat/rotate-key', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          newEncryptedBlob: rotationResult.newEncryptedChat,
          newBlobHash: rotationResult.newBlobHash,
          newEncryptedKeyMetadata: rotationResult.newEncryptedKey,
        }),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({}));
        throw new Error((errorData as { message?: string }).message || 'Failed to save rotated key');
      }

      const saveData = await saveResponse.json();
      console.log('Key rotation saved to API successfully');

      // Step 6: Update DID contract with new wrapped key (if DID exists)
      if (authState.didInfo?.hasDid && provider) {
        try {
          const bytes = encryptedChatKeyToOnchainBytes(rotationResult.newEncryptedKey);
          await updateEncryptedKeyMetadata(signer, bytes);
          console.log('New key metadata updated in DID contract');
        } catch (didError: any) {
          console.error('Failed to update DID contract with new key:', didError);
          // Don't fail the whole rotation - API save succeeded
          // User can retry DID update manually
        }
      }

      // Step 7: Update local state with new key
      setSymmetricKey(rotationResult.newSymmetricKey);
      setEncryptedKey(rotationResult.newEncryptedKey);

      // Persist to localStorage (critical for users without DID)
      localStorage.setItem(legacyLocalStorageKey(wallet.address), rotationResult.newEncryptedKey);

      console.log('Key rotation complete - new key active');

      return {
        success: true,
        newBlobHash: rotationResult.newBlobHash,
      };
    } catch (err: any) {
      console.error('Key rotation error:', err);
      setError(err.message || 'Failed to rotate encryption key');
      return {
        success: false,
        newBlobHash: null,
        error: err.message || 'Failed to rotate encryption key',
      };
    } finally {
      setIsLoading(false);
    }
  }, [symmetricKey, encryptedKey, authState.isVerified, wallet, signer, provider, authState.didInfo]);

  useEffect(() => {
    if (authState.isVerified && wallet && signer) {
      initializeKey();
    } else {
      setSymmetricKey(null);
      setEncryptedKey(null);
    }
  }, [authState.isVerified, wallet, signer]);

  return {
    symmetricKey,
    encryptedKey,
    isLoading,
    error,
    loadChat,
    saveChat,
    saveKeyToDID,
    initializeKey,
    rotateKey,
  };
}
