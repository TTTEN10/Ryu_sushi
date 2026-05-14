import { useAuth } from '../contexts/AuthContext';

/**
 * Narrow facade for screens that only need login/logout/session flags.
 * All HTTP for wallet auth lives in `services/auth.service.ts`; state in `AuthContext`.
 */
export function useWalletAuth() {
  const auth = useAuth();

  return {
    login: auth.loginWithWallet,
    logout: auth.logout,
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    /** Always `null` — session is httpOnly cookie only. */
    token: auth.token,
    isLoading: auth.authState.isLoading,
    error: auth.authState.error,
  };
}
