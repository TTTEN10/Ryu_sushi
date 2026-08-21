import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import {
  SUPPORTED_CHAIN_ID,
  SUPPORTED_CHAIN_ID_HEX,
} from '../config/supportedChain';
import { recordWalletClick, recordWalletSuccess } from '../utils/conversionMetrics';
import { getWalletErrorMessage } from '../utils/errorMessages';
import { trackEvent } from '../lib/analytics';

type WalletConnectProvider = {
  accounts: string[];
  chainId: number;
  session?: unknown;
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  on: (event: string, cb: (...args: any[]) => void) => void;
};

interface WalletInfo {
  address: string;
  chainId: number;
  isConnected: boolean;
}

/** Return this from `connectWallet` so auth can run immediately without waiting on React state (avoids stale address/chainId). */
export type ConnectedWallet = { address: string; chainId: number };

interface WalletContextType {
  wallet: WalletInfo | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  connectWallet: () => Promise<ConnectedWallet>;
  disconnectWallet: () => void;
  signMessage: (message: string) => Promise<string>;
  isLoading: boolean;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: React.ReactNode;
}

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';
/** Sepolia chain params for wallet_addEthereumChain (when chain not in wallet) */
const SEPOLIA_CHAIN_PARAMS = {
  chainId: SUPPORTED_CHAIN_ID_HEX,
  chainName: 'Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com', 'https://rpc.sepolia.org'],
  blockExplorerUrls: ['https://sepolia.etherscan.io'],
};

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletConnectProvider, setWalletConnectProvider] = useState<WalletConnectProvider | null>(null);

  /** Updated synchronously in `connectWallet` / disconnect so `signMessage` works in the same tick as `await connectWallet()` (Auth login flow). */
  const walletSessionRef = useRef<{ address: string; chainId: number } | null>(null);
  const providerRef = useRef<ethers.BrowserProvider | null>(null);
  /** Raw WalletConnect EIP-1193 provider (ethers wraps it; `.provider.request` is not always available). */
  const walletConnectProviderRef = useRef<WalletConnectProvider | null>(null);

  const clearWalletState = useCallback(() => {
    walletSessionRef.current = null;
    providerRef.current = null;
    walletConnectProviderRef.current = null;
    setWallet(null);
    setProvider(null);
    setSigner(null);
  }, []);

  useEffect(() => {
    if (wallet?.address && provider) {
      walletSessionRef.current = { address: wallet.address, chainId: wallet.chainId };
      providerRef.current = provider;
    } else if (!wallet && !provider) {
      walletSessionRef.current = null;
      providerRef.current = null;
    }
  }, [wallet, provider]);

  // Restore WalletConnect sessions only when no injected extension (avoid WC modal competing with MetaMask/Rabby)
  useEffect(() => {
    const initWalletConnect = async () => {
      if (!WALLETCONNECT_PROJECT_ID) {
        console.warn(
          'WalletConnect disabled: set VITE_WALLETCONNECT_PROJECT_ID in apps/web/.env (see apps/web/env.example). Injected extension wallets still work.',
        );
        return;
      }
      if (typeof window.ethereum !== 'undefined') {
        return;
      }

      try {
        const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
        // Only initialize if we want to check for existing sessions
        // The provider will be created on-demand when user clicks connect
        const provider = await EthereumProvider.init({
          projectId: WALLETCONNECT_PROJECT_ID,
          chains: [SUPPORTED_CHAIN_ID], // Sepolia Testnet
          optionalChains: [],
          showQrModal: false,
          metadata: {
            name: 'SafePsy',
            description: 'Safe Online-Therapy Platform',
            url: window.location.origin,
            icons: [`${window.location.origin}/LogoTransparent1.png`],
          },
        });

        provider.on('display_uri', (_uri: string) => {
        });

        provider.on('connect', () => {
        });

        provider.on('disconnect', () => {
          setWallet(null);
          setProvider(null);
          setSigner(null);
        });

        provider.on('chainChanged', (chainId: number | string) => {
          const numericChainId = typeof chainId === 'string' ? parseInt(chainId, 16) : chainId;
          // Disconnect if user switches to a different chain
          if (numericChainId !== SUPPORTED_CHAIN_ID) {
            console.warn('Unsupported chain detected. Disconnecting wallet.');
            setError('Please switch to Sepolia Testnet to use SafePsy.');
            try {
              provider.disconnect();
            } finally {
              clearWalletState();
            }
          } else {
            setWallet((prev) => prev ? { ...prev, chainId: numericChainId } : null);
          }
        });

        provider.on('accountsChanged', (accounts: string[]) => {
          if (accounts.length > 0) {
            setWallet((prev) => prev ? { ...prev, address: accounts[0] } : null);
          } else {
            setWallet(null);
            setProvider(null);
            setSigner(null);
          }
        });

        const wc = provider as unknown as WalletConnectProvider;
        walletConnectProviderRef.current = wc;
        setWalletConnectProvider(wc);
      } catch (err) {
        console.error('WalletConnect initialization error:', err);
      }
    };

    initWalletConnect();
  }, []);

  // Check for existing connection on mount
  // Skip auto-reconnect if user manually logged out (sessionStorage flag)
  useEffect(() => {
    const MANUAL_LOGOUT_KEY = 'sp_manual_logout';

    // Check if user manually logged out - if so, don't auto-reconnect
    const isManualLogout = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(MANUAL_LOGOUT_KEY) === '1';
    if (isManualLogout) {
      return;
    }

    const checkExistingConnection = async () => {
      // Check MetaMask connection
      if (typeof window.ethereum !== 'undefined') {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            const network = await provider.getNetwork();
            const chainId = Number(network.chainId);

            // Only allow Sepolia Testnet
            if (chainId !== SUPPORTED_CHAIN_ID) {
              console.warn('Unsupported chain detected on existing connection. Chain ID:', chainId);
              return;
            }

            const signer = await provider.getSigner();
            const addr = ethers.getAddress(accounts[0].address);
            setProvider(provider);
            setSigner(signer);
            setWallet({
              address: addr,
              chainId,
              isConnected: true,
            });
          }
        } catch (err) {
          console.error('Error checking existing connection:', err);
        }
      }

      // Check WalletConnect connection
      if (walletConnectProvider && walletConnectProvider.session) {
        try {
          const accounts = walletConnectProvider.accounts;
          const chainId = walletConnectProvider.chainId;

          // Only allow Sepolia Testnet
          if (chainId !== SUPPORTED_CHAIN_ID) {
            console.warn('Unsupported chain detected on WalletConnect connection. Chain ID:', chainId);
            return;
          }

          if (accounts.length > 0) {
            // Create ethers provider from WalletConnect
          const ethersProvider = new ethers.BrowserProvider(walletConnectProvider);
            const signer = await ethersProvider.getSigner();
            const addr = ethers.getAddress(accounts[0]);
            setProvider(ethersProvider);
            setSigner(signer);
            setWallet({
              address: addr,
              chainId,
              isConnected: true,
            });
          }
        } catch (err) {
          console.error('Error checking WalletConnect connection:', err);
        }
      }
    };

    checkExistingConnection();
  }, [walletConnectProvider]);

  useEffect(() => {
    if (wallet?.address) {
      recordWalletSuccess();

      // Track wallet success in analytics
      trackEvent('wallet_success', {
        wallet_provider: getWalletProvider(),
        chain_id: wallet.chainId,
      }).catch(console.error);
    }
  }, [wallet?.address, wallet?.chainId]);

  // Listen for MetaMask chain changes
  useEffect(() => {
    if (typeof window.ethereum === 'undefined') {
      return;
    }

    const handleChainChanged = (chainId: string) => {
      const numericChainId = parseInt(chainId, 16);
      
      // Disconnect if user switches to a different chain
      if (numericChainId !== SUPPORTED_CHAIN_ID) {
        console.warn('Unsupported chain detected. Disconnecting wallet.');
        setError('Please switch to Sepolia Testnet to use SafePsy.');
        // Disconnect wallet
        if (walletConnectProvider && walletConnectProvider.session) {
          walletConnectProvider.disconnect();
        }
        walletSessionRef.current = null;
        providerRef.current = null;
        setWallet(null);
        setProvider(null);
        setSigner(null);
      } else {
        // Update chain ID if still connected
        setWallet((prev) => prev ? { ...prev, chainId: numericChainId } : null);
        setError(null);
      }
    };

    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [walletConnectProvider]);

  /**
   * Detect wallet provider from user agent or wallet object.
   */
  const getWalletProvider = (): string => {
    if (typeof window === 'undefined') {
      return 'unknown';
    }

    const ua = navigator.userAgent;

    // Detect MetaMask
    if (ua.includes('MetaMask')) {
      return 'metamask';
    }

    // Detect WalletConnect
    if (ua.includes('WalletConnect')) {
      return 'walletconnect';
    }

    // Detect Rabby
    if (ua.includes('Rabby')) {
      return 'rabby';
    }

    // Detect Coinbase Wallet
    if (ua.includes('Coinbase')) {
      return 'coinbase';
    }

    // Default
    return 'injected';
  };

  const connectWallet = useCallback(async () => {
    try {
      recordWalletClick();

      // Track wallet click in analytics (before popup opens)
      trackEvent('wallet_click', {
        wallet_provider: getWalletProvider(),
      }).catch(console.error);

      // Clear manual logout flag when user reconnects
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('sp_manual_logout');
      }

      setIsLoading(true);
      setError(null);

      // Already on Sepolia with an active signing provider — return immediately (safe for Auth login after await).
      if (
        wallet?.address &&
        wallet.chainId === SUPPORTED_CHAIN_ID &&
        providerRef.current
      ) {
        return { address: wallet.address, chainId: wallet.chainId };
      }

      const connectInjectedWallet = async (): Promise<ConnectedWallet | null> => {
        if (typeof window.ethereum === 'undefined') {
          return null;
        }
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        const network = await provider.getNetwork();
        let chainId = Number(network.chainId);

        if (chainId !== SUPPORTED_CHAIN_ID) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: SUPPORTED_CHAIN_ID_HEX }],
            });
            const updatedNetwork = await provider.getNetwork();
            chainId = Number(updatedNetwork.chainId);
            if (chainId !== SUPPORTED_CHAIN_ID) {
              throw new Error('Please switch to Sepolia Testnet to use SafePsy.');
            }
          } catch (switchError: any) {
            if (switchError.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [SEPOLIA_CHAIN_PARAMS],
              });
              const updatedNetwork = await provider.getNetwork();
              chainId = Number(updatedNetwork.chainId);
              if (chainId !== SUPPORTED_CHAIN_ID) {
                throw new Error('Please switch to Sepolia Testnet to use SafePsy.');
              }
            } else {
              throw new Error('Please switch to Sepolia Testnet to use SafePsy.');
            }
          }
        }

        const signer = await provider.getSigner();
        const addr = ethers.getAddress(accounts[0]);
        const net = await provider.getNetwork();
        const resolvedChainId = Number(net.chainId);

        walletSessionRef.current = { address: addr, chainId: resolvedChainId };
        providerRef.current = provider;

        setProvider(provider);
        setSigner(signer);
        setWallet({
          address: addr,
          chainId: resolvedChainId,
          isConnected: true,
        });

        return { address: addr, chainId: resolvedChainId };
      };

      // Browser extension first (MetaMask, Rabby, etc.) — avoids WalletConnect modal when an injector is present
      try {
        const injected = await connectInjectedWallet();
        if (injected) {
          return injected;
        }
      } catch (injectedError) {
        console.error('Injected wallet connection error:', injectedError);
        throw injectedError;
      }

      // WalletConnect for mobile / QR when no injected wallet or extension connect failed
      if (WALLETCONNECT_PROJECT_ID) {
        const ensureWalletConnectProvider = async (): Promise<WalletConnectProvider | null> => {
          if (walletConnectProvider) return walletConnectProvider;
          try {
            const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
            const wc = (await EthereumProvider.init({
              projectId: WALLETCONNECT_PROJECT_ID,
              chains: [SUPPORTED_CHAIN_ID],
              optionalChains: [],
              showQrModal: true,
              metadata: {
                name: 'SafePsy',
                description: 'Safe Online-Therapy Platform',
                url: window.location.origin,
                icons: [`${window.location.origin}/LogoTransparent1.png`],
              },
            })) as unknown as WalletConnectProvider;

            wc.on('disconnect', () => {
              setWallet(null);
              setProvider(null);
              setSigner(null);
            });

            wc.on('chainChanged', (chainId: number | string) => {
              const numericChainId = typeof chainId === 'string' ? parseInt(chainId, 16) : chainId;
              if (numericChainId !== SUPPORTED_CHAIN_ID) {
                console.warn('Unsupported chain detected. Disconnecting wallet.');
                setError('Please switch to Sepolia Testnet to use SafePsy.');
                try {
                  wc.disconnect();
                } finally {
                  clearWalletState();
                }
              } else {
                setWallet((prev) => (prev ? { ...prev, chainId: numericChainId } : null));
              }
            });

            wc.on('accountsChanged', (accounts: string[]) => {
              if (accounts.length > 0) {
                setWallet((prev) => (prev ? { ...prev, address: accounts[0] } : null));
              } else {
                setWallet(null);
                setProvider(null);
                setSigner(null);
              }
            });

            walletConnectProviderRef.current = wc;
            setWalletConnectProvider(wc);
            return wc;
          } catch (e) {
            console.error('WalletConnect initialization error:', e);
            return null;
          }
        };

        // Use existing provider or wait for it to be initialized
        const providerToUse = await ensureWalletConnectProvider();
        
        if (!providerToUse) {
          // Fall through to MetaMask
        } else {
          walletConnectProviderRef.current = providerToUse;
          // Provider already initialized, try to connect
          try {
            await providerToUse.connect();
            const accounts = providerToUse.accounts;
            const chainId = providerToUse.chainId;

            // Validate chain ID
            if (chainId !== SUPPORTED_CHAIN_ID) {
              throw new Error('Please switch to Sepolia Testnet to use SafePsy. Unsupported network detected.');
            }

            if (accounts.length > 0) {
              const ethersProvider = new ethers.BrowserProvider(providerToUse);
              const signer = await ethersProvider.getSigner();
              const addr = ethers.getAddress(accounts[0]);
              walletSessionRef.current = { address: addr, chainId };
              providerRef.current = ethersProvider;

              setProvider(ethersProvider);
              setSigner(signer);
              setWallet({
                address: addr,
                chainId,
                isConnected: true,
              });

              return { address: addr, chainId };
            }
          } catch (wcError: any) {
            if (!(wcError.message?.includes('User rejected') || wcError.code === 5001 || wcError.code === 'USER_REJECTED')) {
              console.error('WalletConnect error:', wcError);
            }
          }
        }
      }

      if (!WALLETCONNECT_PROJECT_ID) {
        throw new Error('No Ethereum wallet found. Please install MetaMask or configure WalletConnect Project ID.');
      } else {
        throw new Error('No Ethereum wallet found. Please install MetaMask or use WalletConnect.');
      }
    } catch (err: any) {
      const errorMessage = getWalletErrorMessage(err);
      setError(errorMessage);
      console.error('Wallet connection error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [walletConnectProvider, clearWalletState, wallet?.address, wallet?.chainId]);

  const disconnectWallet = useCallback(() => {
    if (walletConnectProvider && walletConnectProvider.session) {
      walletConnectProvider.disconnect();
    }
    clearWalletState();
    setError(null);
  }, [walletConnectProvider, clearWalletState]);

  /**
   * Sign SIWE via ethers (`signMessage`) — MetaMask, WalletConnect, and injected wallets.
   * Same message bytes must be sent to `/api/auth/wallet/verify` via `useWalletLogin` / `auth.service` only.
   */
  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      const prov = providerRef.current ?? provider;
      const addr = walletSessionRef.current?.address ?? wallet?.address;
      if (!addr || !prov) {
        throw new Error('Wallet not connected');
      }

      try {
        const signer = await prov.getSigner();
        return await signer.signMessage(message);
      } catch (primaryErr: unknown) {
        const wc = walletConnectProviderRef.current;
        if (wc?.request) {
          try {
            return (await wc.request({
              method: 'personal_sign',
              params: [message, addr],
            })) as string;
          } catch (wcErr: unknown) {
            const errorMessage = getWalletErrorMessage(wcErr);
            setError(errorMessage);
            throw wcErr;
          }
        }
        const errorMessage = getWalletErrorMessage(primaryErr);
        setError(errorMessage);
        throw primaryErr;
      }
    },
    [provider, wallet?.address],
  );

  return (
    <WalletContext.Provider
      value={{
        wallet,
        provider,
        signer,
        connectWallet,
        disconnectWallet,
        signMessage,
        isLoading,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

