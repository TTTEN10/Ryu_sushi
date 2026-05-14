import { useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { requestWalletMessage, verifyWalletSignature } from '../services/auth.service';

/**
 * Wallet login orchestration: `wallet/connect` → `personal_sign` → **one** `wallet/verify`.
 * All HTTP uses `services/auth.service` with `credentials: 'include'`. `signMessage` from
 * `WalletContext` is cryptographic signing only; it never POSTs to verify.
 */
export function useWalletLogin() {
  const { connectWallet, signMessage } = useWallet();

  const executeLogin = useCallback(async () => {
    const { address, chainId } = await connectWallet();
    const message = await requestWalletMessage(address, chainId);
    const signature = await signMessage(message);
    await verifyWalletSignature({
      address,
      message,
      signature,
      chainId,
    });
  }, [connectWallet, signMessage]);

  return { executeLogin };
}
