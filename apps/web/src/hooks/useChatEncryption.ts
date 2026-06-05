import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import {
  generateSymmetricKey,
  encryptSymmetricKey,
  decryptSymmetricKey,
  encryptChatHistory,
  decryptChatHistory,
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
      return;
    }

    const didContractConfigured = Boolean(
      (import.meta.env.VITE_DID_IDENTITY_TOKEN_ADDRESS || '').trim(),
    );

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
          const fromChain = onchainMetadataToEncryptedChatKey(metadataHex);
          if (fromChain && fromChain.includes(':')) {
            const decryptedKey = await decryptSymmetricKey(fromChain, wallet.address, signer);
            setSymmetricKey(decryptedKey);
            setEncryptedKey(fromChain);
            return;
          }
        } catch (err) {
          console.warn('Could not read encrypted key metadata from DID contract:', err);
        }
      }

      if (authState.didStatus === 'exists' && authState.didInfo?.hasDid) {
        const storedEncryptedKey = localStorage.getItem(legacyLocalStorageKey(wallet.address));
        if (storedEncryptedKey) {
          const decryptedKey = await decryptSymmetricKey(
            storedEncryptedKey,
            wallet.address,
            signer,
          );
          setSymmetricKey(decryptedKey);
          setEncryptedKey(storedEncryptedKey);
          if (provider && didContractConfigured) {
            try {
              await persistEncryptedKeyToChain(signer, storedEncryptedKey);
              localStorage.removeItem(legacyLocalStorageKey(wallet.address));
            } catch (err) {
              console.warn('Could not migrate encrypted key to DID contract:', err);
            }
          }
          return;
        }
      }

      // No existing key found - generate new one
      const newKey = generateSymmetricKey();
      const encrypted = await encryptSymmetricKey(newKey, wallet.address, signer);

      setSymmetricKey(newKey);
      setEncryptedKey(encrypted);

      if (authState.didInfo?.hasDid && provider && didContractConfigured) {
        try {
          await persistEncryptedKeyToChain(signer, encrypted);
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
      if (!data.success || !data.data.hasChat) {
        return [];
      }

      const decryptedHistory = await decryptChatHistory(data.data.encryptedChatBlob, symmetricKey);

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
      });

      return {
        blobHash: payload.blobHash ?? null,
        chatReference: payload.chatReference ?? payload.blobHash ?? null,
        requiresDidUpdate: Boolean(payload.requiresDidUpdate),
        preserveEncryptedKeyMetadata: payload.preserveEncryptedKeyMetadata ?? null,
      };
    },
    [symmetricKey, authState.isVerified, authState.didInfo],
  );

  useEffect(() => {
    if (authState.isVerified && wallet && signer) {
      initializeKey();
    } else {
      setSymmetricKey(null);
      setEncryptedKey(null);
    }
  }, [authState.isVerified, wallet, signer, initializeKey]);

  return {
    symmetricKey,
    encryptedKey,
    isLoading,
    error,
    loadChat,
    saveChat,
    saveKeyToDID,
    initializeKey,
  };
}
