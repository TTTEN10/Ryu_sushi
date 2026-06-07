/**
 * Wallet connect + signature verification. Optional for browsing; required for encrypted persistence,
 * DID flows, and unlimited chat. Guests use ChatWidget without verifying (session-only, capped prompts).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { Wallet, LogOut, CheckCircle, AlertCircle, AlertTriangle, Loader2, ChevronDown, ChevronUp, X, Copy, ExternalLink } from 'lucide-react';
import { SUPPORTED_CHAIN_ID, SUPPORTED_NETWORK_NAME } from '../config/supportedChain';
import { useToast } from '../hooks/useToast';
import { getActionableErrorMessage, getWalletErrorMessage } from '../utils/errorMessages';
import { WALLET_IDLE_LOGOUT_FLAG, clearWalletActivityTracking } from '../lib/wallet-inactivity';

type ConnectWalletVariant = 'default' | 'header';

export default function ConnectWallet({ variant = 'default' }: { variant?: ConnectWalletVariant }) {
  const { wallet, connectWallet, isLoading: walletLoading, error: walletError } = useWallet();
  const { authState, loginWithWallet, logout, checkDID, clearAuthError } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [showNetworkGuide, setShowNetworkGuide] = useState(false);
  const [verificationStep, setVerificationStep] = useState<'idle' | 'requesting' | 'signing' | 'verifying' | 'complete'>('idle');
  const [autoVerifyRequested, setAutoVerifyRequested] = useState(false);
  const [showWalletDetails, setShowWalletDetails] = useState(false);
  const verifyInFlightRef = useRef(false);

  // Show idle-timeout message only after wallet disconnects with the idle flag set.
  // Manual disconnect clears the flag first, so this toast does not fire on user-initiated logout.
  useEffect(() => {
    if (wallet) return;
    if (typeof sessionStorage === 'undefined') return;
    if (sessionStorage.getItem(WALLET_IDLE_LOGOUT_FLAG) !== '1') return;
    sessionStorage.removeItem(WALLET_IDLE_LOGOUT_FLAG);
    showToast(
      'info',
      'Your session ended after 1 hour of inactivity. Reconnect and verify your wallet to resume chat.',
      8000,
    );
  }, [wallet, showToast]);

  // Check DID when wallet is verified
  useEffect(() => {
    if (authState.isVerified) {
      // Always check DID status after verification
      if (authState.didStatus === 'none' || authState.didStatus === 'checking') {
        checkDID();
      }
    }
  }, [authState.isVerified, checkDID]);

  const handleConnect = async () => {
    try {
      setVerificationError(null);
      await connectWallet();
      // After connection, automatically verify wallet (once wallet state is present).
      setAutoVerifyRequested(true);
    } catch (err: unknown) {
      setVerificationError(getWalletErrorMessage(err));
    }
  };

  const handleVerify = useCallback(async () => {
    if (verifyInFlightRef.current || authState.isVerified) {
      return;
    }
    verifyInFlightRef.current = true;
    try {
      setIsVerifying(true);
      setVerificationStep('requesting');
      setVerificationError(null);
      clearAuthError();

      await new Promise((resolve) => setTimeout(resolve, 200));
      setVerificationStep('signing');

      await loginWithWallet();

      setVerificationStep('verifying');
      await new Promise((resolve) => setTimeout(resolve, 300));
      setVerificationStep('complete');

      showToast('success', 'This space now belongs to you — wallet verified.', 3000);

      setTimeout(() => {
        setVerificationStep('idle');
      }, 2000);
    } catch (err: unknown) {
      const errorMsg = getActionableErrorMessage(err, {
        originalMessage: err instanceof Error ? err.message : undefined,
      });
      setVerificationError(errorMsg);
      showToast('error', errorMsg);
      setVerificationStep('idle');
    } finally {
      setIsVerifying(false);
      verifyInFlightRef.current = false;
    }
  }, [loginWithWallet, showToast, authState.isVerified, clearAuthError]);

  // If user just connected, trigger verification once wallet state is available.
  // (connectWallet updates context state asynchronously; relying on wallet immediately after await can fail.)
  useEffect(() => {
    if (!autoVerifyRequested) return;
    if (!wallet) return;
    if (authState.isVerified) {
      setAutoVerifyRequested(false);
      return;
    }
    if (wallet.chainId !== SUPPORTED_CHAIN_ID) {
      // Wrong network: user needs to switch first; keep the flag off to avoid surprise prompts.
      setAutoVerifyRequested(false);
      return;
    }
    void handleVerify();
    setAutoVerifyRequested(false);
  }, [autoVerifyRequested, wallet, authState.isVerified, handleVerify]);

  const handleDisconnect = async () => {
    try {
      console.log('[ConnectWallet] handleDisconnect called');
      // Clear idle logout flag first (prevent "inactive" message on next login)
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(WALLET_IDLE_LOGOUT_FLAG);
        console.log('[ConnectWallet] Cleared idle logout flag from sessionStorage');
      }
      // Clear activity tracking
      clearWalletActivityTracking();
      console.log('[ConnectWallet] Cleared wallet activity tracking');
      // Logout (skipIdleFlag: true means don't SET the idle flag, but we already cleared it)
      console.log('[ConnectWallet] Calling logout from AuthContext...');
      await logout({ skipIdleFlag: true });
      console.log('[ConnectWallet] logout() completed, reloading page...');
      // Force reload to ensure all state is cleared
      window.location.reload();
    } catch (err) {
      console.error('[ConnectWallet] Logout error:', err);
    }
  };

  const formatAddress = (address: string) => {
    return `0x...${address.slice(-4)}`;
  };

  const dismissVerificationError = () => {
    setVerificationError(null);
    clearAuthError();
  };

  // Show network error if on wrong network
  const isWrongNetwork = wallet && wallet.chainId !== SUPPORTED_CHAIN_ID;

  const getVerificationStatusBanner = () => {
    if (!isVerifying || verificationStep === 'idle' || verificationStep === 'complete') {
      return null;
    }
    const title =
      verificationStep === 'signing'
        ? 'Sign in your wallet'
        : verificationStep === 'verifying'
          ? 'Verifying signature'
          : 'Preparing sign-in';
    const detail =
      verificationStep === 'signing'
        ? 'Confirms identity'
        : verificationStep === 'verifying'
          ? 'Checking your signature with SafePsy'
          : 'Requesting a sign-in message';
    return { title, detail };
  };

  const verificationStatusBanner = getVerificationStatusBanner();

  const isHeader = variant === 'header';

  if (wallet) {
    return (
      <div
        className={
          isHeader
            ? 'flex flex-col items-end gap-1 w-full min-w-0 sm:max-w-[min(100vw-10rem,28rem)]'
            : 'flex flex-col items-end gap-2'
        }
      >
        {/* Network Error Banner with Guide */}
        {isWrongNetwork && (
          <div className="max-w-xs">
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">Please switch to Sepolia Testnet</span>
              <button
                onClick={() => setShowNetworkGuide(!showNetworkGuide)}
                className="ml-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                aria-label={showNetworkGuide ? "Hide network guide" : "Show network guide"}
              >
                {showNetworkGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            {showNetworkGuide && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-300 space-y-2">
                <p className="font-semibold">How to switch networks:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Open your wallet extension</li>
                  <li>Click the network dropdown (top of wallet)</li>
                  <li>Select "Sepolia"</li>
                  <li>Return here and refresh</li>
                </ol>
                <p className="text-xs opacity-75 mt-2">Network: {SUPPORTED_NETWORK_NAME} (chain ID {SUPPORTED_CHAIN_ID})</p>
              </div>
            )}
          </div>
        )}

        <div
          className={
            isHeader
              ? 'relative flex flex-wrap items-center justify-end gap-1.5 sm:gap-2'
              : 'relative flex items-center gap-2'
          }
        >
          {/* Wallet Address - Clickable to show details */}
          <div className="relative">
            <button
              onClick={() => setShowWalletDetails(!showWalletDetails)}
              className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              title="Click to view wallet details"
              aria-label="View wallet details"
            >
              {authState.isVerified ? (
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <Wallet className="w-4 h-4 text-green-600 dark:text-green-400" />
              )}
              <span className="text-sm font-mono text-green-700 dark:text-green-300">
                {formatAddress(wallet.address)}
              </span>
            </button>

            {/* Wallet Details Popup */}
            {showWalletDetails && (
              <div className="absolute top-full right-0 mt-2 z-50 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[280px]">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Wallet Address</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded break-all">
                        {wallet.address}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(wallet.address);
                          showToast('success', 'Address copied!');
                        }}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        title="Copy address"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <a
                        href={`https://sepolia.etherscan.io/address/${wallet.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        title="View on Etherscan"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Network</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {SUPPORTED_NETWORK_NAME}
                      </span>
                      <span className="text-xs bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                        Chain ID: {wallet.chainId}
                      </span>
                    </div>
                  </div>
                  {authState.isVerified && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span>Wallet verified</span>
                      </div>
                    </div>
                  )}
                </div>
                {/* Close on outside click */}
                <div
                  className="fixed inset-0 -z-10"
                  onClick={() => setShowWalletDetails(false)}
                />
              </div>
            )}
          </div>

          {/* DID status — icon-only, same Wallet / CheckCircle pattern as address pill */}
          {authState.isVerified && (
            <div
              className="flex items-center gap-1.5 px-2 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
              title={
                authState.didStatus === 'exists'
                  ? 'Chat history can be saved to your wallet'
                  : authState.didStatus === 'checking'
                    ? 'Checking chat save status'
                    : authState.didStatus === 'error'
                      ? 'Backend configuration missing — check RPC_URL, DID_REGISTRY_ADDRESS, DATABASE_URL'
                      : 'Wallet verified — create your Safe ID Token (gas sponsored) to save chat history'
              }
            >
              {authState.didStatus === 'checking' ? (
                <Loader2 className="w-4 h-4 animate-spin text-green-600 dark:text-green-400" />
              ) : authState.didStatus === 'error' ? (
                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              ) : authState.didStatus === 'exists' ? (
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <>
                  <Wallet className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                </>
              )}
            </div>
          )}

          {/* Verify Button */}
          {!authState.isVerified && !isVerifying && !isWrongNetwork && (
            <button
              onClick={handleVerify}
              className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-semibold text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-4 focus:ring-primary-200 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary-500/25 transform hover:-translate-y-0.5 active:scale-95 min-h-[44px] flex items-center justify-center gap-2"
              title="Sign in your wallet — confirms identity"
              aria-label={isHeader ? 'Authorize in your wallet' : 'Verify wallet'}
            >
              <CheckCircle className="w-4 h-4 text-white" />
              <span className="hidden sm:inline text-white">
                {isHeader ? 'Authorize' : 'Verify'}
              </span>
            </button>
          )}

          {isVerifying && !verificationStatusBanner && (
            <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 min-h-[44px]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying...</span>
            </div>
          )}

          {/* Disconnect Button */}
          <button
            onClick={handleDisconnect}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Disconnect wallet"
            aria-label="Disconnect wallet"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {verificationStatusBanner && (
            <div
              className="absolute top-full right-0 mt-2 z-50 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-xs text-green-800 dark:text-green-300 max-w-xs space-y-1 shadow-lg"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-2">
                <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-green-600 dark:text-green-400 mt-0.5" />
                <div className="min-w-0 space-y-0.5">
                  <p className="font-semibold">{verificationStatusBanner.title}</p>
                  <p>{verificationStatusBanner.detail}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Messages - dropdown overlay, does not affect header size */}
          {(verificationError || authState.error) && (
            <div className="absolute top-full right-0 mt-2 z-50 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 max-w-xs space-y-1 shadow-lg">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">Verification Failed</p>
                <button
                  type="button"
                  onClick={dismissVerificationError}
                  className="shrink-0 p-0.5 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                  aria-label="Dismiss verification error"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p>{verificationError || authState.error}</p>
              {!isWrongNetwork && (
                <button
                  type="button"
                  onClick={() => {
                    dismissVerificationError();
                    void handleVerify();
                  }}
                  className="mt-2 text-xs underline hover:no-underline"
                >
                  Try again
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleConnect}
        disabled={walletLoading}
        className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-semibold text-sm sm:text-base px-4 sm:px-8 py-2 sm:py-3 rounded-xl hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-4 focus:ring-primary-200 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary-500/25 transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-h-[44px] flex items-center justify-center gap-2"
        title="Secure this space — wallet is for identity and encryption, not payments"
        aria-label={isHeader ? 'Connect wallet with WalletConnect or browser extension' : 'Connect wallet'}
      >
        <Wallet className="w-4 h-4 text-white" />
        <span className="hidden sm:inline text-white">
          {walletLoading
            ? 'Connecting...'
            : isHeader
              ? 'Connect wallet'
              : 'Connect'}
        </span>
        <span className="sm:hidden text-white">
          {walletLoading ? '…' : isHeader ? 'Wallet' : 'Connect'}
        </span>
      </button>
      {walletError && (
        <div className="absolute top-full mt-2 right-0 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 max-w-xs z-50">
          <p className="font-semibold mb-1">Connection error</p>
          <p>{getWalletErrorMessage(walletError)}</p>
          <button
            onClick={handleConnect}
            className="mt-2 text-xs underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}
