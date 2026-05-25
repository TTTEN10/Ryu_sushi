import { useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { requestWalletMessage, verifyWalletSignature } from '../services/auth.service';
import { ethers } from 'ethers';

/**
 * Wallet login orchestration: `wallet/connect` → `personal_sign` → **one** `wallet/verify`.
 * All HTTP uses `services/auth.service` (cookie session via `API_SESSION_CREDENTIALS`). `signMessage` from
 * `WalletContext` is cryptographic signing only; it never POSTs to verify.
 */
export function useWalletLogin() {
  const { connectWallet, signMessage, wallet } = useWallet();

  const executeLogin = useCallback(async () => {
    const { address, chainId } =
      wallet?.address != null
        ? { address: wallet.address, chainId: wallet.chainId }
        : await connectWallet();
    // Checksum the address (EIP-55) - API validation requires checksummed addresses
    const checksummedAddress = ethers.getAddress(address);
    const message = await requestWalletMessage(checksummedAddress, chainId);
    const signature = await signMessage(message);
    await verifyWalletSignature({
      address: checksummedAddress,
      message,
      signature,
      chainId,
    });
  }, [connectWallet, signMessage, wallet?.address, wallet?.chainId]);

  return { executeLogin };
}
