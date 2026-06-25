import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { ArrowUp, WifiOff, MessageSquare, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { useChatEncryption } from '../hooks/useChatEncryption';
import { updateChatReference, fetchOnChainDidStatus } from '../utils/did-contract';
import { keyMetadataBytesForDidUpdate } from '../utils/did-key-metadata';
import { useOffline } from '../hooks/useOffline';
import { useToast } from '../hooks/useToast';
import { getActionableErrorMessage } from '../utils/errorMessages';
import { recordFirstMessageSent, recordFirstReplyReceived } from '../utils/conversionMetrics';
import { apiFetch, apiUrl } from '../config/api';
import Paywall from './Paywall';
import EmptyState from './EmptyState';
import GuestModeLimitModal from './GuestModeLimitModal';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  encrypted?: boolean;
}

interface PaywallData {
  quota: {
    dailyUsed: number;
    dailyLimit: number;
    monthlyUsed: number;
    monthlyLimit: number;
    resetDailyAt: string;
    resetMonthlyAt: string;
  };
  pricing: {
    PREMIUM: {
      crypto: {
        ETH: string;
        USDT: string;
        USDC: string;
      };
    };
  };
  paymentRecipient: string | null;
}

const MAX_MESSAGE_LENGTH = 2000;
/** Guest mode: max user messages per browser session (in-memory only; resets on refresh). */
const GUEST_PROMPT_LIMIT = 5;

const FIRST_MESSAGE_SUGGESTIONS = [
  "Hello Dr. Safe, I'd like to talk through something I'm experiencing and get your guidance.",
  "Hi, I'm reaching out because I need a calm, structured perspective on something personal.",
];

function TypingDots({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1 px-2 py-1 ${className}`} aria-hidden="true">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

export default function ChatWidget() {
  const [searchParams] = useSearchParams();
  const { authState, userMode, checkDID } = useAuth();
  const { wallet, signer, provider } = useWallet();
  const { symmetricKey, encryptedKey, loadChat, saveChat, isLoading: encryptionLoading, error: encryptionError } = useChatEncryption();
  const { isOffline } = useOffline();
  const { showToast, ToastContainer } = useToast();

  // Check if withContext query parameter is set
  const withContext = searchParams.get('withContext') === 'true';
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendPhase, setSendPhase] = useState<
    'idle' | 'checking' | 'encrypting' | 'sending' | 'streaming' | 'saving' | 'error'
  >('idle');
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallData, setPaywallData] = useState<PaywallData | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [requestInProgress, setRequestInProgress] = useState(false);
  const [guestPromptCount, setGuestPromptCount] = useState(0);
  const [showGuestLimitModal, setShowGuestLimitModal] = useState(false);
  const [isMockMode, setIsMockMode] = useState(false);
  const [widgetVisible, setWidgetVisible] = useState(true);
  // Manual save state: track pending save after AI response
  const [pendingDidSave, setPendingDidSave] = useState<{
    visible: boolean;
    saveResult: 'success' | 'cancelled' | 'error' | null;
  }>({ visible: false, saveResult: null });
  const [isSavingToDid, setIsSavingToDid] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const concurrencyCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  const isGuest = userMode === 'guest';

  // Track if user has sent at least one message (for concurrency polling optimization)
  const hasSentMessage = guestPromptCount > 0 || (messages.length > 0 && !isGuest);

  // Track if we should show DID creation prompt
  const [showDidCreatePrompt, setShowDidCreatePrompt] = useState(false);

  // Wallet verified mid-session: reset guest limit and allow persistence path (load replaces thread).
  useEffect(() => {
    if (authState.isVerified) {
      setGuestPromptCount(0);
      setShowGuestLimitModal(false);
    }
  }, [authState.isVerified]);

  // Show DID creation prompt only after check completes and no token exists for this wallet.
  useEffect(() => {
    if (authState.didStatus === 'exists') {
      setShowDidCreatePrompt(false);
      return;
    }
    if (!authState.isVerified || authState.didStatus === 'checking') {
      return;
    }
    if (authState.didStatus === 'none') {
      setShowDidCreatePrompt(true);
    }
  }, [authState.isVerified, authState.didStatus]);

  // Warn guest users about data loss on refresh/close if they have an active conversation
  useEffect(() => {
    if (!isGuest || messages.length === 0) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have an active conversation in guest mode. Refreshing or closing this tab will lose your chat history. Connect a wallet to save it securely.';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isGuest, messages.length]);

  // IntersectionObserver: only poll concurrency when widget is visible AND user has sent at least one message
  useEffect(() => {
    if (!widgetRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setWidgetVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(widgetRef.current);
    return () => observer.disconnect();
  }, []);

  const scrollToWalletConnect = useCallback(() => {
    document.getElementById('wallet-connect-region')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    });
  }, []);

  const showAssistantTyping = useMemo(() => {
    if (!isSending && !isStreaming) return false;
    const last = messages[messages.length - 1];
    return !last || last.role !== 'assistant' || last.content.length === 0;
  }, [isSending, isStreaming, messages]);

  const handleCreateDID = useCallback(async () => {
    if (!wallet) {
      showToast('error', 'Wallet not connected');
      return;
    }

    try {
      // Re-check on-chain before minting — user may already have a token from a prior session.
      if (provider) {
        const onChain = await fetchOnChainDidStatus(provider, wallet.address);
        if (onChain.hasDid) {
          showToast('success', `Safe ID Token found (ID: ${onChain.tokenId})`);
          await checkDID({ skipVerifiedCheck: true });
          setShowDidCreatePrompt(false);
          return;
        }
      }

      showToast('info', 'Creating Safe ID Token (gas sponsored)...');

      const response = await apiFetch('/did/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create Safe ID Token');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to create Safe ID Token');
      }

      const tokenId = data.data?.tokenId ? String(data.data.tokenId) : null;
      const isSponsored = data.data?.isSponsored ?? false;
      const successMessage = isSponsored
        ? `Safe ID Token created! Gas was sponsored — no ETH needed.`
        : tokenId
          ? `Safe ID Token created! Token ID: ${tokenId}`
          : 'Safe ID Token created!';
      showToast('success', successMessage);

      await checkDID({ skipVerifiedCheck: true });
      setShowDidCreatePrompt(false);
    } catch (err: any) {
      console.error('Error creating DID:', err);
      if (err.code === 'ACTION_REJECTED') {
        showToast('error', 'Transaction cancelled. Please create your Safe ID Token to save chats securely.');
      } else if (err.code === 'INSUFFICIENT_FUNDS') {
        showToast('error', 'Insufficient Sepolia ETH for gas. Get free Sepolia ETH from a faucet.');
      } else {
        showToast('error', err.message || 'Failed to create Safe ID Token');
      }
    }
  }, [wallet, provider, checkDID, showToast]);

  // Show manual save button after AI response (user must click to save to DID)
  const showManualSaveButton = useCallback(() => {
    if (isGuest || !signer || !wallet) {
      return;
    }
    // Show save button after 3 seconds
    setTimeout(() => {
      setPendingDidSave({ visible: true, saveResult: null });
    }, 3000);
  }, [isGuest, signer, wallet]);

  // Handle manual save to DID - user clicks "Save history chat on DID" button
  const handleSaveToDid = useCallback(async () => {
    if (!signer || !wallet || !encryptedKey) {
      setPendingDidSave({ visible: true, saveResult: 'error' });
      return;
    }

    setIsSavingToDid(true);

    try {
      // Step 1: Save encrypted chat to backend first
      const updatedMessages = [...messages];
      const saveResult = await saveChat(
        updatedMessages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        }))
      );

      const chatRef = saveResult.chatReference ?? saveResult.blobHash;

      if (!chatRef) {
        throw new Error('No chat reference received from backend');
      }

      const metaBytes = keyMetadataBytesForDidUpdate(
        encryptedKey,
        saveResult.preserveEncryptedKeyMetadata,
      );

      // Validate metaBytes is not empty before sending transaction
      if (metaBytes.length === 0) {
        throw new Error('Encrypted key metadata is empty - cannot save to DID');
      }

      showToast('info', 'Saving to DID contract...');
      const receipt = await updateChatReference(signer, chatRef, metaBytes);

      console.log(
        'DID updated successfully:',
        (receipt as { hash?: string }).hash ||
          (receipt as { transactionHash?: string }).transactionHash,
      );

      // Show success state - replaces button with green message
      setPendingDidSave({ visible: true, saveResult: 'success' });
    } catch (err: any) {
      console.error('Error saving to DID:', err);
      if (err.code === 'ACTION_REJECTED') {
        setPendingDidSave({ visible: true, saveResult: 'cancelled' });
      } else {
        setPendingDidSave({ visible: true, saveResult: 'error' });
      }
    } finally {
      setIsSavingToDid(false);
    }
  }, [messages, signer, wallet, encryptedKey, saveChat, showToast]);

  // After the 5th guest message is sent, show conversion modal once streaming finishes.
  useEffect(() => {
    if (!isGuest || isStreaming) return;
    if (guestPromptCount >= GUEST_PROMPT_LIMIT) {
      setShowGuestLimitModal(true);
    }
  }, [isGuest, guestPromptCount, isStreaming]);

  // Check concurrency status
  const checkConcurrencyStatus = useCallback(async (): Promise<boolean> => {
    if (!wallet?.address) return false;

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      headers['x-wallet-address'] = wallet.address;
      headers['x-chain-id'] = wallet.chainId.toString();

      const response = await apiFetch('/chat/concurrency', {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const inProgress = data.data.requestInProgress || false;
          setRequestInProgress((prev) => (prev === inProgress ? prev : inProgress));
          return inProgress;
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking concurrency status:', error);
      // Don't show error to user, just log it
      return false;
    }
  }, [wallet?.address, wallet?.chainId]);

  // Poll concurrency status periodically when wallet is connected
  // Only poll when: widget is visible, user has sent at least one message, and symmetric key is ready
  useEffect(() => {
    if (wallet?.address && symmetricKey && !encryptionLoading && widgetVisible && hasSentMessage) {
      // Check immediately
      checkConcurrencyStatus();

      // Then poll every 5 seconds (avoid unnecessary re-renders)
      concurrencyCheckIntervalRef.current = setInterval(() => {
        checkConcurrencyStatus();
      }, 5000);

      return () => {
        if (concurrencyCheckIntervalRef.current) {
          clearInterval(concurrencyCheckIntervalRef.current);
        }
      };
    } else {
      // Reset requestInProgress when wallet disconnects or widget not visible
      setRequestInProgress(false);
      if (concurrencyCheckIntervalRef.current) {
        clearInterval(concurrencyCheckIntervalRef.current);
        concurrencyCheckIntervalRef.current = null;
      }
    }
  }, [wallet?.address, symmetricKey, encryptionLoading, checkConcurrencyStatus, widgetVisible, hasSentMessage]);

  // Load encrypted chat history when wallet session is verified and the symmetric key is ready.
  // Always replaces in-memory messages so a prior guest thread does not leak after verification.
  useEffect(() => {
    if (symmetricKey && !encryptionLoading && authState.isVerified) {
      setIsLoadingHistory(true);
      loadChat()
        .then((loadedMessages) => {
          const raw = loadedMessages ?? [];
          setMessages(
            raw.map((msg: any) => ({
              id: msg.id || `msg-${Date.now()}-${Math.random()}`,
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
              encrypted: false,
            }))
          );
          setIsLoadingHistory(false);
        })
        .catch((err) => {
          console.error('Error loading chat:', err);
          showToast('error', 'Failed to load chat history');
          setIsLoadingHistory(false);
        });
    } else if (!symmetricKey && !encryptionLoading) {
      setIsLoadingHistory(false);
    }
  }, [symmetricKey, encryptionLoading, loadChat, showToast, authState.isVerified]);

  // Scroll chat to latest message when history changes or while waiting for a reply
  useEffect(() => {
    const behavior: ScrollBehavior = isStreaming ? 'auto' : 'smooth';
    scrollToBottom(behavior);
  }, [messages, isStreaming, isSending, showAssistantTyping, scrollToBottom]);

  // Handle sending a message.
  // Guest mode: messages stay in React state only; API requests include mode: 'guest' (no server persistence).
  // Authenticated: wallet-derived encryption + saveChat + quota path.
  const handleSend = async (contentOverride?: string) => {
    const trimmed = (typeof contentOverride === 'string' ? contentOverride : input).trim();
    if (!trimmed || isStreaming || isSending || trimmed.length > MAX_MESSAGE_LENGTH || requestInProgress) return;

    // Authenticated users: require encryption to be ready
    if (!isGuest) {
      if (encryptionError) {
        showToast('error', 'Encryption error. Please refresh the page.');
        return;
      }
      if (!symmetricKey || encryptionLoading) {
        console.log('Blocking send: encryption not ready', { hasSymmetricKey: !!symmetricKey, encryptionLoading });
        return;
      }
    }

    if (isGuest && guestPromptCount >= GUEST_PROMPT_LIMIT) {
      setShowGuestLimitModal(true);
      return;
    }

    if (isOffline) {
      showToast('error', 'Cannot send messages while offline. Please check your connection.');
      return;
    }

    setIsSending(true);
    setSendPhase('checking');

    let streamFinalized = false;
    try {
      // Check concurrency status one more time before sending (wallet / DID path only)
      const isInProgress = await checkConcurrencyStatus();
      if (isInProgress) {
        showToast('error', 'Please wait for the chatbot to respond before sending another message.');
        return;
      }

      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
        encrypted: false,
      };

      if (isGuest) {
        setGuestPromptCount((c) => c + 1);
      }

      setMessages((prev) => [...prev, userMessage]);
      recordFirstMessageSent();

      // Don't save intermediate messages - only save when user clicks "Save history chat on DID"

      setInput('');
      setIsStreaming(true);
      setSendPhase('sending');

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      // Messages are already decrypted in state, just format for API
      const decryptedMessages = [...messages, userMessage].map((msg) => ({
        role: msg.role,
        content: msg.content, // Already decrypted
        timestamp: msg.timestamp,
      }));

      // Prepare headers with wallet authentication if available
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Also add wallet headers for quota checking
      if (wallet) {
        headers['x-wallet-address'] = wallet.address;
        headers['x-chain-id'] = wallet.chainId.toString();
      }

      // Build URL with withContext query parameter if needed
      const chatUrl = new URL(apiUrl('/chat/completions'), window.location.origin);
      if (withContext) {
        chatUrl.searchParams.set('withContext', 'true');
      }

      // Stream response from API
      const response = await apiFetch(chatUrl.toString(), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: decryptedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
          mode: isGuest ? 'guest' : 'authenticated',
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        // Check if it's a quota exceeded error
        if (response.status === 429 && errorData.error === 'QUOTA_EXCEEDED' && errorData.paywall) {
          setPaywallData({
            quota: errorData.quota,
            pricing: errorData.paywall.pricing,
            paymentRecipient: errorData.paywall.paymentRecipient,
          });
          setShowPaywall(true);
          setIsStreaming(false);
          return;
        }

        const errorMsg = getActionableErrorMessage(null, {
          status: response.status,
          code: errorData.error || errorData.code,
          originalMessage: errorData.message,
        });
        throw new Error(errorMsg);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let currentEvent = '';
      let assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      // Reset the ref for this message
      assistantMessageAddedRef.current = false;

      const persistAfterStream = async () => {
        // Synchronous guard to prevent race condition when both [DONE] and event:done arrive
        if (streamFinalized) return;
        streamFinalized = true;

        setIsStreaming(false);
        setSendPhase('idle');
        if (assistantMessage.content.trim().length > 0) {
          recordFirstReplyReceived();
        }
        // CRITICAL FIX: Message is ALREADY in state from streaming updates.
        // Do NOT add/update here - the streaming path already handles it.
        // Just show the save button.

        // Show manual save button after 3 seconds (for authenticated users with DID)
        if (!isGuest && signer && wallet && encryptedKey) {
          showManualSaveButton();
        }
      };

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;
        if (sendPhase !== 'streaming') setSendPhase('streaming');

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.substring(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const raw = line.substring(6).trim();
              if (raw === '[DONE]') {
                await persistAfterStream();
                continue;
              }
              const data = JSON.parse(raw);

              // OpenAI-compatible SSE (chat.completion.chunk): no "event:" lines
              // Check for delta.content ONLY when there's no explicit event type (default OpenAI format)
              const delta = data?.choices?.[0]?.delta as { content?: string } | undefined;
              if (delta?.content && !currentEvent) {
                assistantMessage.content += delta.content;
                setMessages((prev) => {
                  const lastMsg = prev[prev.length - 1];
                  if (lastMsg?.role === 'assistant' && lastMsg.id === assistantMessage.id) {
                    // Update existing streaming message in place - this is the normal path
                    return [...prev.slice(0, -1), { ...lastMsg, content: assistantMessage.content }];
                  }
                  // First chunk - add the message
                  return [...prev, { ...assistantMessage, encrypted: false }];
                });
              }
              // Don't call persistAfterStream on finish_reason - it will be called on [DONE] or event:done

              if (currentEvent === 'token') {
                // Legacy event format: event: token with data.token
                // Note: This is mutually exclusive with the delta.content path above
                assistantMessage.content += data.token;
                setMessages((prev) => {
                  const lastMsg = prev[prev.length - 1];
                  if (lastMsg?.role === 'assistant' && lastMsg.id === assistantMessage.id) {
                    // Update existing streaming message in place - this is the normal path
                    return [...prev.slice(0, -1), { ...lastMsg, content: assistantMessage.content }];
                  }
                  // First chunk - add the message
                  return [...prev, { ...assistantMessage, encrypted: false }];
                });
              } else if (currentEvent === 'metadata') {
                // Local mock stream advertises itself via metadata.
                const model = String(data?.model || '');
                if (model === 'local-mock') {
                  setIsMockMode(true);
                }
              } else if (currentEvent === 'done') {
                await persistAfterStream();
              } else if (currentEvent === 'error') {
                // Check if it's a quota exceeded error
                if (data.error === 'QUOTA_EXCEEDED' && data.paywall) {
                  setPaywallData({
                    quota: data.quota,
                    pricing: data.paywall.pricing,
                    paymentRecipient: data.paywall.paymentRecipient,
                  });
                  setShowPaywall(true);
                  setIsStreaming(false);
                  return;
                }
                throw new Error(data.message || 'Streaming error');
              }
            } catch (error) {
              console.error('Error parsing SSE data:', error);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        const errorMsg = error instanceof Error 
          ? error.message 
          : getActionableErrorMessage(error);
        
        setSendPhase('error');
        showToast('error', errorMsg);
        
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-error`,
            role: 'assistant',
            content: `I encountered an error: ${errorMsg}. Please try again.`,
            timestamp: new Date(),
            encrypted: false,
          },
        ]);
      }
    } finally {
      if (!streamFinalized) {
        setIsStreaming(false);
      }
      setIsSending(false);
      setSendPhase('idle');
    }
  };

  // Handle cancel streaming
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const guestAtLimit = isGuest && guestPromptCount >= GUEST_PROMPT_LIMIT;
  const guestOneLeft = isGuest && guestPromptCount === GUEST_PROMPT_LIMIT - 1;

  return (
    <>
      <GuestModeLimitModal
        open={showGuestLimitModal}
        onClose={() => setShowGuestLimitModal(false)}
        onScrollToWallet={scrollToWalletConnect}
      />
      {showPaywall && paywallData && (
        <Paywall
          quota={paywallData.quota}
          pricing={paywallData.pricing}
          paymentRecipient={paywallData.paymentRecipient}
          onClose={() => {
            setShowPaywall(false);
            setPaywallData(null);
          }}
          onUpgradeSuccess={() => {
            setShowPaywall(false);
            setPaywallData(null);
            // Optionally refresh quota or retry the request
          }}
        />
      )}
      {/* DID Creation Prompt Modal - No dismiss, must create or refresh */}
      {showDidCreatePrompt && authState.isVerified && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-neutral-200 dark:border-white/10">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-heading">Create Your Safe ID Token</h3>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-body">
                Your wallet is verified! Now create your <strong>Safe ID Token (DID)</strong> to:
              </p>
              <ul className="space-y-2 text-sm text-body">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Save chat history permanently to your wallet</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Access your chats from any device</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Keep your data secure and private</span>
                </li>
              </ul>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Token creation is handled securely on Sepolia. No wallet transaction or gas is required from you.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={handleCreateDID}
                  className="w-full px-4 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-semibold rounded-lg hover:from-primary-700 hover:to-secondary-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Create Safe ID Token
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={widgetRef} className="flex flex-col h-[600px] bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-white/10 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-white/20 rounded-t-lg space-y-2">
        {isMockMode && (
          <p
            className="text-xs font-medium text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 text-center"
            role="status"
          >
            Chat is running in local mock mode (LLM upstream not configured). To enable real responses, set
            {' '}<code className="font-mono">SCALEWAY_API_KEY</code> (set <code className="font-mono">USE_SCALEWAY_DIRECT=1</code> on the API).
          </p>
        )}
        {isGuest ? (
          <p
            className="text-xs font-medium text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-center"
            role="status"
          >
            Guest mode: this chat lives in this tab only — refresh clears it. When you&apos;re ready, save it securely
            by connecting a wallet.
          </p>
        ) : (
          <p className="text-xs text-body opacity-60 text-center">
            All the exchanged data will be encrypted and stored in your personal wallet. Nobody except you
            will have access to it
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50 dark:bg-neutral-950">
        {isLoadingHistory ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="py-6 px-3">
            <EmptyState
              icon={MessageSquare}
              title="Start in one tap"
              description={
                isGuest
                  ? 'No login. Pick a first line or write your own — Dr.Safe meets you where you are.'
                  : 'Send a message to begin. All messages are encrypted with AES-256-GCM and stored securely in your wallet.'
              }
            />
            {FIRST_MESSAGE_SUGGESTIONS.length > 0 ? (
              <div className="max-w-md mx-auto mt-6 space-y-3">
                {FIRST_MESSAGE_SUGGESTIONS.map((line) => (
                  <button
                    key={line}
                    type="button"
                    disabled={guestAtLimit || isOffline || isStreaming}
                    onClick={() => void handleSend(line)}
                    className="w-full text-left text-sm px-4 py-3 rounded-xl border border-primary-200 dark:border-primary-800 bg-white/80 dark:bg-neutral-900/60 text-heading hover:bg-primary-50 dark:hover:bg-primary-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {line}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
            />
          ))
        )}

        {showAssistantTyping && (
          <div className="flex justify-start" role="status" aria-live="polite" aria-label="Assistant is responding">
            <TypingDots className="py-2" />
          </div>
        )}

        {/* Manual Save to DID Button - appears 3 seconds after AI response */}
        {pendingDidSave.visible && !isSavingToDid && pendingDidSave.saveResult === null && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleSaveToDid}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              title="Save this conversation to your Safe ID Token on-chain"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Save session in ID token</span>
            </button>
          </div>
        )}

        {/* Save Success Message - replaces button after successful save */}
        {pendingDidSave.visible && !isSavingToDid && pendingDidSave.saveResult === 'success' && (
          <div className="mt-4 flex justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300 font-medium">
              <CheckCircle className="w-4 h-4" />
              <span>Chat saved successfully</span>
            </div>
          </div>
        )}

        {/* Save Cancelled Message */}
        {pendingDidSave.visible && !isSavingToDid && pendingDidSave.saveResult === 'cancelled' && (
          <div className="mt-4 flex justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
              <AlertCircle className="w-4 h-4" />
              <span>Save cancelled - you can save later from DID settings</span>
            </div>
          </div>
        )}

        {/* Save Error Message */}
        {pendingDidSave.visible && !isSavingToDid && pendingDidSave.saveResult === 'error' && (
          <div className="mt-4 flex justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4" />
              <span>Failed to save - please try again</span>
            </div>
          </div>
        )}

        {/* Saving State */}
        {isSavingToDid && (
          <div className="mt-4 flex justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving to DID...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-white/20 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
        {/* Offline Indicator */}
        {isOffline && (
          <div className="mb-2 flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
            <WifiOff className="w-4 h-4" />
            <span>Offline - Messages cannot be sent</span>
          </div>
        )}
        {guestOneLeft && !guestAtLimit && (
          <p className="mb-2 text-xs text-amber-700 dark:text-amber-300" role="status">
            One try left in guest mode. Save this conversation securely to keep going with unlimited chat.
          </p>
        )}
        {guestAtLimit && (
          <p className="mb-2 text-xs text-amber-800 dark:text-amber-200 font-medium" role="alert">
            Guest limit reached — keep this space yours with Connect.
            <button
              type="button"
              onClick={() => setShowGuestLimitModal(true)}
              className="ml-2 underline text-primary-600 dark:text-primary-400"
            >
              Why?
            </button>
          </p>
        )}

        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => {
                if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
                  setInput(e.target.value);
                }
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                isGuest
                  ? 'Say it in your own words...'
                  : 'Type your message...'
              }
              disabled={
                isStreaming ||
                isSending ||
                (!isGuest && (!symmetricKey || encryptionLoading)) ||
                isOffline ||
                requestInProgress ||
                guestAtLimit
              }
              maxLength={MAX_MESSAGE_LENGTH}
              className="w-full px-4 py-2 border border-gray-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-neutral-950 text-heading placeholder:text-body placeholder:opacity-50"
            />
          </div>
          {isStreaming ? (
            <button
              onClick={handleCancel}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              aria-label="Cancel streaming"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={() => void handleSend()}
              disabled={
                !input.trim() ||
                isSending ||
                (!isGuest && (!symmetricKey || encryptionLoading)) ||
                isOffline ||
                input.length > MAX_MESSAGE_LENGTH ||
                requestInProgress ||
                isStreaming ||
                guestAtLimit
              }
              className="px-4 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary-500/25 transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center min-h-[44px] min-w-[44px]"
              aria-label="Send message"
              title={requestInProgress ? "Please wait for the chatbot to respond before sending another message" : ""}
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          )}
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {!isGuest && encryptionLoading
            ? 'Preparing secure encryption'
            : showAssistantTyping
              ? 'Assistant is responding'
              : sendPhase === 'saving'
                ? 'Saving securely'
                : ''}
        </p>
        {!isGuest && encryptionLoading && (
          <p className="text-xs text-body opacity-75 mt-2 flex items-center gap-1">
            <span className="animate-spin">⟳</span>
            Initializing encryption...
          </p>
        )}
        {!isGuest && encryptionError && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">{encryptionError}</p>
        )}
      </div>
      </div>
      <ToastContainer />
    </>
  );
}

// Message Bubble Component - no edit/delete functionality
const MessageBubble = memo(function MessageBubble({
  message,
}: {
  message: Message;
}) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-50 dark:bg-gray-800/50 text-heading border border-gray-200 dark:border-white/20'
        }`}
      >
        <p className={`text-sm whitespace-pre-wrap ${isUser ? 'text-white' : 'text-heading'}`}>{message.content}</p>
        {message.encrypted ? (
          <p className={`text-xs mt-2 ${isUser ? 'text-indigo-100' : 'text-body opacity-75'}`}>
            <span aria-label="Encrypted">🔒</span>
          </p>
        ) : null}
      </div>
    </div>
  );
});

