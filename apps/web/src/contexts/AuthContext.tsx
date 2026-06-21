import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { useWallet } from './WalletContext';
import { useWalletLogin } from '../hooks/useWalletLogin';
import { recordDidSuccess, recordSessionSuccess } from '../utils/conversionMetrics';
import { fetchWalletSession, logoutWalletSession, postDidCheck } from '../services/auth.service';
import { fetchOnChainDidStatus } from '../utils/did-contract';
import { useWalletInactivityTimeout } from '../hooks/useWalletInactivityTimeout';
import {
  WALLET_IDLE_LOGOUT_FLAG,
  clearWalletActivityTracking,
  touchWalletActivity,
} from '../lib/wallet-inactivity';

export type UserMode = 'guest' | 'authenticated';

export type DIDStatus = 'none' | 'exists' | 'error' | 'checking';

export interface DIDInfo {
  hasDid: boolean;
  did: string | null;
  didHash: string | null;
  isValid: boolean;
  contractAddress?: string;
  tokenId?: string | null;
}

export interface AuthState {
  walletAddress: string | null;
  network: number | null;
  isVerified: boolean;
  didStatus: DIDStatus;
  didInfo: DIDInfo | null;
  isLoading: boolean;
  error: string | null;
}

export type AuthUser = {
  walletAddress: string;
  chainId: number;
};

interface AuthContextType {
  authState: AuthState;
  userMode: UserMode;
  /** Always `null` — JWT lives in httpOnly cookie only; kept for API compatibility. */
  token: null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  loginWithWallet: () => Promise<void>;
  checkDID: (options?: { skipVerifiedCheck?: boolean }) => Promise<void>;
  logout: (options?: { skipIdleFlag?: boolean }) => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

/** Remove legacy client JWT if present (migration). */
function clearLegacyWalletToken(): void {
  localStorage.removeItem('walletSessionToken');
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { wallet, disconnectWallet, provider } = useWallet();
  const { executeLogin } = useWalletLogin();

  const [authState, setAuthState] = useState<AuthState>({
    walletAddress: null,
    network: null,
    isVerified: false,
    didStatus: 'none',
    didInfo: null,
    isLoading: false,
    error: null,
  });

  const applyDidCheckResult = useCallback(
    (hasDid: boolean, tokenId: string | null) => {
      const didInfo: DIDInfo = {
        hasDid,
        did: tokenId,
        didHash: tokenId,
        isValid: hasDid,
        tokenId,
      };
      setAuthState((prev) => ({
        ...prev,
        didStatus: hasDid ? 'exists' : 'none',
        didInfo,
      }));
    },
    [],
  );

  const checkDID = useCallback(
    async (options?: { skipVerifiedCheck?: boolean }) => {
      if (!wallet) {
        return;
      }
      if (!options?.skipVerifiedCheck && !authState.isVerified) {
        return;
      }

      try {
        setAuthState((prev) => ({ ...prev, didStatus: 'checking' }));

        const result = await postDidCheck();

        if (result === 'unauthorized') {
          clearLegacyWalletToken();
          setAuthState((prev) => ({
            ...prev,
            isVerified: false,
            didStatus: 'none',
            didInfo: null,
          }));
          return;
        }

        if (!result.success) {
          throw new Error(result.message || 'Failed to check DID status');
        }

        let hasDid = result.data.hasDid;
        let tokenId =
          result.data.tokenId !== undefined && result.data.tokenId !== null
            ? String(result.data.tokenId)
            : null;

        // Backend may check registry V2 while token lives on legacy identity contract — confirm on-chain.
        if (!hasDid && provider) {
          try {
            const onChain = await fetchOnChainDidStatus(provider, wallet.address);
            if (onChain.hasDid) {
              hasDid = true;
              tokenId = onChain.tokenId;
            }
          } catch (onChainErr) {
            console.warn('On-chain DID fallback check failed:', onChainErr);
          }
        }

        applyDidCheckResult(hasDid, tokenId);
      } catch (err: unknown) {
        const isBackendConfigError = err instanceof Error && (err as any).isBackendConfigError;

        // When backend is unavailable, still try on-chain so returning users are not prompted to re-mint.
        if (provider) {
          try {
            const onChain = await fetchOnChainDidStatus(provider, wallet.address);
            if (onChain.hasDid) {
              applyDidCheckResult(true, onChain.tokenId);
              return;
            }
          } catch (onChainErr) {
            console.warn('On-chain DID fallback after backend error failed:', onChainErr);
          }
        }

        if (isBackendConfigError) {
          console.error('DID check failed: backend configuration missing');
        } else {
          console.error('DID check error:', err);
        }
        setAuthState((prev) => ({
          ...prev,
          didStatus: 'error',
          didInfo: null,
        }));
      }
    },
    [wallet, provider, authState.isVerified, applyDidCheckResult],
  );

  const loginWithWallet = useCallback(async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
      clearLegacyWalletToken();

      // One POST /wallet/verify in executeLogin; GET /auth/me confirms cookie (not a second verify).
      await executeLogin();

      const session = await fetchWalletSession();
      if (!session?.isVerified) {
        throw new Error('Session not established — check cookies / Same-Origin policy');
      }

      setAuthState((prev) => ({
        ...prev,
        walletAddress: session.walletAddress,
        network: session.chainId,
        isVerified: true,
        isLoading: false,
        error: null,
      }));

      touchWalletActivity();
      await checkDID({ skipVerifiedCheck: true });
    } catch (err: unknown) {
      const messageText = err instanceof Error ? err.message : 'Login failed';
      setAuthState((prev) => ({
        ...prev,
        isVerified: false,
        isLoading: false,
        error: messageText,
      }));
      throw err;
    }
  }, [executeLogin, checkDID]);

  const logout = useCallback(async (options?: { skipIdleFlag?: boolean }) => {
    const skipIdleFlag = options?.skipIdleFlag ?? false;
    console.log('[AuthContext] logout() called, skipIdleFlag:', skipIdleFlag);
    try {
      console.log('[AuthContext] Calling logoutWalletSession()...');
      await logoutWalletSession();
      console.log('[AuthContext] logoutWalletSession() completed');
    } catch (err: any) {
      // 401 is expected when user is already logged out - don't treat as error
      if (err?.status !== 401) {
        console.error('[AuthContext] Logout error:', err);
      } else {
        console.log('[AuthContext] Logout returned 401 (expected if already logged out)');
      }
    } finally {
      // Set manual logout flag to prevent wallet auto-reconnect on reload
      // (Only for manual logouts, not inactivity timeouts)
      if (skipIdleFlag && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('sp_manual_logout', '1');
        console.log('[AuthContext] Set manual logout flag to prevent auto-reconnect');
      }
      // Only set idle flag for inactivity timeout logouts, NOT manual logouts
      if (!skipIdleFlag && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(WALLET_IDLE_LOGOUT_FLAG, '1');
        console.log('[AuthContext] Set idle logout flag in sessionStorage');
      }
      console.log('[AuthContext] Clearing legacy wallet token and activity tracking');
      clearLegacyWalletToken();
      clearWalletActivityTracking();
      console.log('[AuthContext] Resetting auth state');
      setAuthState({
        walletAddress: null,
        network: null,
        isVerified: false,
        didStatus: 'none',
        didInfo: null,
        isLoading: false,
        error: null,
      });
      console.log('[AuthContext] Calling disconnectWallet()');
      disconnectWallet();
      console.log('[AuthContext] logout() completed');
    }
  }, [disconnectWallet]);

  const handleInactivityTimeout = useCallback(async () => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(WALLET_IDLE_LOGOUT_FLAG, '1');
    }
    await logout();
  }, [logout]);

  useWalletInactivityTimeout(authState.isVerified, handleInactivityTimeout);

  const clearAuthError = useCallback(() => {
    setAuthState((prev) => ({ ...prev, error: null }));
  }, []);

  const refreshAuth = useCallback(async () => {
    if (!wallet) {
      setAuthState({
        walletAddress: null,
        network: null,
        isVerified: false,
        didStatus: 'none',
        didInfo: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      const session = await fetchWalletSession();
      if (!session?.isVerified) {
        setAuthState({
          walletAddress: wallet.address,
          network: wallet.chainId,
          isVerified: false,
          didStatus: 'none',
          didInfo: null,
          isLoading: false,
          error: null,
        });
        return;
      }
      await checkDID({ skipVerifiedCheck: true });
      touchWalletActivity();
      setAuthState((prev) => ({
        ...prev,
        walletAddress: session.walletAddress,
        network: session.chainId,
        isVerified: true,
      }));
    } catch {
      clearLegacyWalletToken();
      setAuthState({
        walletAddress: wallet.address,
        network: wallet.chainId,
        isVerified: false,
        didStatus: 'none',
        didInfo: null,
        isLoading: false,
        error: null,
      });
    }
  }, [wallet, checkDID]);

  useEffect(() => {
    if (wallet) {
      setAuthState((prev) => ({
        ...prev,
        walletAddress: wallet.address,
        network: wallet.chainId,
      }));
      void refreshAuth();
    } else {
      setAuthState({
        walletAddress: null,
        network: null,
        isVerified: false,
        didStatus: 'none',
        didInfo: null,
        isLoading: false,
        error: null,
      });
    }
  }, [wallet, refreshAuth]);

  const userMode: UserMode = useMemo(
    () => (authState.isVerified ? 'authenticated' : 'guest'),
    [authState.isVerified],
  );

  const user = useMemo((): AuthUser | null => {
    if (!authState.isVerified || !authState.walletAddress || authState.network == null) {
      return null;
    }
    return {
      walletAddress: authState.walletAddress,
      chainId: authState.network,
    };
  }, [authState.isVerified, authState.walletAddress, authState.network]);

  const isAuthenticated = authState.isVerified;

  useEffect(() => {
    if (authState.isVerified) {
      recordSessionSuccess();
    }
  }, [authState.isVerified]);

  useEffect(() => {
    if (authState.didStatus === 'exists') {
      recordDidSuccess();
    }
  }, [authState.didStatus]);

  return (
    <AuthContext.Provider
      value={{
        authState,
        userMode,
        token: null,
        user,
        isAuthenticated,
        loginWithWallet,
        checkDID,
        logout,
        refreshAuth,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
