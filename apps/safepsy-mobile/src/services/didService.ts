import { ethers, type JsonRpcSigner } from 'ethers';
import { API_BASE_URL } from '../config/env';
import { addMonitoringBreadcrumb, captureException, captureMonitoringEvent } from '../instrumentation/sentry';
import { getWalletSessionToken } from './secureToken';

const WRITE_TX_MAX_ATTEMPTS = 4;
const WRITE_TX_BASE_DELAY_MS = 900;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableWriteError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /nonce|timeout|NETWORK_ERROR|rate limit|too many|ECONNRESET|ETIMEDOUT|replacement|underpriced|ECONNREFUSED|503|502/i.test(msg);
}

export type DidTxPhase = 'signing' | 'pending' | 'confirmed' | 'failed';

export type DidUpdatePrepareResponse = {
  success: boolean;
  message?: string;
  data?: {
    to: string;
    data: string;
    chainId: number;
    value?: string;
  };
};

export type SaveChatApiData = {
  requiresDidUpdate?: boolean;
  chatReference?: string;
  preserveEncryptedKeyMetadata?: string | null;
};

/**
 * Backend prepares calldata; wallet signs and broadcasts (parity with web updateChatReference).
 */
export async function prepareDidChatReferenceUpdate(
  chatReference: string,
  encryptedKeyMetadataHex = '0x',
): Promise<DidUpdatePrepareResponse> {
  const token = await getWalletSessionToken();
  if (!token) {
    return { success: false, message: 'Not authenticated' };
  }

  const res = await fetch(`${API_BASE_URL}/api/did/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ chatReference, encryptedKeyMetadataHex }),
  });

  const json = (await res.json()) as DidUpdatePrepareResponse;
  if (!res.ok) {
    return {
      success: false,
      message: json.message || `DID prepare failed (${res.status})`,
    };
  }
  return json;
}

export type TriggerDidOptions = {
  onPhase?: (phase: DidTxPhase, detail?: string) => void;
};

/**
 * Send a contract transaction with exponential backoff retry on transient errors.
 */
async function sendTransactionWithRetry(
  signer: JsonRpcSigner,
  txConfig: { to: string; data: string; chainId: number },
  onPhase?: (phase: DidTxPhase, detail?: string) => void,
): Promise<ethers.TransactionReceipt> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= WRITE_TX_MAX_ATTEMPTS; attempt++) {
    try {
      onPhase?.('signing');
      const tx = await signer.sendTransaction({
        to: txConfig.to,
        data: txConfig.data,
        chainId: txConfig.chainId,
      });

      onPhase?.('pending', tx.hash);
      addMonitoringBreadcrumb('did', 'tx_submitted', { hash: tx.hash, attempt });

      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction receipt not available');
      }

      return receipt;
    } catch (err) {
      lastError = err;
      if (attempt >= WRITE_TX_MAX_ATTEMPTS || !isRetryableWriteError(err)) {
        throw err;
      }
      // Exponential backoff: 900ms, 1.8s, 3.6s
      const delay = WRITE_TX_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      addMonitoringBreadcrumb('did', 'tx_retry', { attempt, delay });
      await sleep(delay);
    }
  }

  throw lastError;
}

export async function triggerDidUpdateAfterSave(
  signer: JsonRpcSigner,
  saveData: SaveChatApiData,
  options?: TriggerDidOptions,
): Promise<void> {
  if (!saveData.requiresDidUpdate || !saveData.chatReference) {
    return;
  }

  const onPhase = options?.onPhase;
  let metaHex = '0x';
  const rawMeta = saveData.preserveEncryptedKeyMetadata;
  if (typeof rawMeta === 'string' && rawMeta.startsWith('0x') && rawMeta.length > 2) {
    try {
      ethers.getBytes(rawMeta);
      metaHex = rawMeta;
    } catch {
      metaHex = '0x';
    }
  }

  try {
    addMonitoringBreadcrumb('did', 'prepare_did_update', { chatRef: saveData.chatReference });
    const prepared = await prepareDidChatReferenceUpdate(saveData.chatReference, metaHex);
    if (!prepared.success || !prepared.data?.to || !prepared.data?.data) {
      throw new Error(prepared.message || 'DID update prepare failed');
    }

    await sendTransactionWithRetry(signer, prepared.data, onPhase);

    onPhase?.('confirmed');
    captureMonitoringEvent('did_chat_reference_confirmed', { area: 'did_tx' }, 'info');
  } catch (e) {
    onPhase?.('failed');
    captureException(e, { area: 'did_tx', phase: 'submit_or_confirm' });
    captureMonitoringEvent('did_chat_reference_failed', { area: 'did_tx' }, 'error');
    throw e;
  }
}
