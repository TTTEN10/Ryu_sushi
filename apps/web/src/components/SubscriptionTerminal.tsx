import { useState, useEffect, useCallback } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { ethers } from 'ethers';
import { useWallet } from '../contexts/WalletContext';
import { useSubscription, type PlanId, type BillingPeriod, type PaymentIntent } from '../hooks/useSubscription';
import PaymentHistory from './PaymentHistory';

// ─── Props ──────────────────────────────────────────────────────────────────

interface SubscriptionTerminalProps {
  /** Whether the terminal blocks interaction (forced when quota exceeded). */
  forced?: boolean;
  /** Callback after a successful subscription activation. */
  onActivate?: () => void;
  /** Callback when the user closes the terminal (only when not forced). */
  onClose?: () => void;
}

type PaymentStep = 'select' | 'paying' | 'verify' | 'success' | 'error';

// ─── Component ──────────────────────────────────────────────────────────────

const USDT_CONTRACT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

export default function SubscriptionTerminal({
  forced = false,
  onActivate,
  onClose,
}: SubscriptionTerminalProps) {
  const { wallet, signer, connectWallet } = useWallet();
  const {
    plans,
    subscription,
    usage,
    error,
    isLoadingPlans,
    createPaymentIntent,
    verifyPayment,
    startPaymentPolling,
    stopPaymentPolling,
    refreshAll,
    getPrice,
  } = useSubscription();

  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<Exclude<PlanId, 'free'> | null>(null);
  const [step, setStep] = useState<PaymentStep>('select');
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [txHash, setTxHash] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(error);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currency, setCurrency] = useState<'ETH' | 'USDT'>('ETH');

  // Reset state on wallet change
  useEffect(() => {
    if (!wallet) {
      setStep('select');
      setSelectedPlan(null);
      setPaymentIntent(null);
      setTxHash('');
      setErrorMessage(null);
    }
  }, [wallet]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPaymentPolling();
    };
  }, [stopPaymentPolling]);

  // Elapsed-time counter during verification step
  useEffect(() => {
    if (step !== 'verify') {
      setElapsedSeconds(0);
      return;
    }
    setElapsedSeconds(0);
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  // Propagate top-level hook error
  useEffect(() => {
    if (error) setErrorMessage(error);
  }, [error]);

  const handleSelectPlan = useCallback(
    (planId: Exclude<PlanId, 'free'>) => {
      if (subscription?.status === 'active' && subscription.plan === planId) {
        return;
      }
      setSelectedPlan(planId);
      setStep('select');
      // Reset payment state when switching plans
      setPaymentIntent(null);
      setTxHash('');
      setErrorMessage(null);
    },
    [subscription],
  );

  const handleCreatePaymentIntent = async () => {
    if (!selectedPlan || !wallet) return;

    setStep('paying');
    setErrorMessage(null);

    try {
      const intent = await createPaymentIntent(selectedPlan, billingPeriod, currency);
      if (!intent) {
        setStep('error');
        return;
      }
      setPaymentIntent(intent);

      // Initiate wallet transaction with selected currency
      await executeWalletTransaction(intent);
    } catch {
      setStep('error');
    }
  };

  const executeWalletTransaction = async (intent: PaymentIntent) => {
    if (!signer) {
      setErrorMessage('Wallet signer not available');
      setStep('error');
      return;
    }

    try {
      const selectedCurrency = intent.selectedCurrency || currency;

      if (selectedCurrency === 'USDT') {
        // USDT ERC-20 transfer
        const usdtAbi = [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function transfer(address to, uint256 amount) returns (bool)',
        ];
        const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, usdtAbi, signer);

        // Calculate USDT amount (6 decimals)
        const usdtAmount = Math.ceil((intent.amountCents / 100) * Math.pow(10, USDT_DECIMALS));

        // First approve the treasury to spend USDT
        const approveTx = await usdtContract.approve(intent.treasuryAddress, usdtAmount);
        await approveTx.wait();

        // Then transfer USDT to treasury
        const transferTx = await usdtContract.transfer(intent.treasuryAddress, usdtAmount);
        setTxHash(transferTx.hash);
        setPaymentIntent(intent);
        setStep('verify');

        startPaymentPolling(
          intent.paymentId,
          () => {
            setStep('success');
            refreshAll();
            if (onActivate) onActivate();
          },
          120_000,
        );
      } else {
        // Native ETH transfer
        const amountWei = ethers.parseUnits(intent.usdDisplay, 18);
        const tx = await signer.sendTransaction({
          to: intent.treasuryAddress,
          value: amountWei,
        });

        setTxHash(tx.hash);
        setPaymentIntent(intent);
        setStep('verify');

        startPaymentPolling(
          intent.paymentId,
          () => {
            setStep('success');
            refreshAll();
            if (onActivate) onActivate();
          },
          120_000,
        );
      }
    } catch (err: any) {
      if (err.code === 'ACTION_REJECTED') {
        setErrorMessage('Transaction rejected by user');
      } else if (err.code === 'UNPREDICTABLE_GAS_LIMIT') {
        setErrorMessage('Transaction may fail — check gas settings');
      } else {
        setErrorMessage(err.reason || err.message || 'Transaction failed');
      }
      setStep('error');
    }
  };

  const handleManualVerification = async () => {
    if (!paymentIntent || !txHash) return;
    setErrorMessage(null);

    // Stop the auto-poller so we don't race with the manual verify
    stopPaymentPolling();

    const verified = await verifyPayment(paymentIntent.paymentId, txHash);
    if (verified) {
      setStep('success');
      refreshAll();
      if (onActivate) onActivate();
    } else {
      setErrorMessage('Verification failed — the transaction may not be confirmed yet. Try again in a moment.');
    }
  };

  const handleClose = useCallback(() => {
    stopPaymentPolling();
    if (!forced && onClose) onClose();
  }, [forced, onClose, stopPaymentPolling]);

  // ─── Derived data ────────────────────────────────────────────────────────

  const currentSubscription = subscription;
  const isCurrentPlan = (planId: PlanId): boolean => {
    return (
      currentSubscription?.status === 'active' &&
      currentSubscription.plan === planId
    );
  };

  const expirationDate = currentSubscription?.expiresAt
    ? new Date(currentSubscription.expiresAt)
    : null;

  const getDiscountBadge = (planId: Exclude<PlanId, 'free'>) => {
    if (billingPeriod !== 'yearly') return null;
    return planId === 'pro' ? '10%' : '25%';
  };

  const getHighlightPlan = (): Exclude<PlanId, 'free'> | null => null;

  const highlightPlan = getHighlightPlan();

  // ─── Plan rendering ──────────────────────────────────────────────────────

  const renderFreePlan = () => {
    const isActive = isCurrentPlan('free');
    const planDef = plans?.plans.find((p) => p.id === 'free');

    return (
      <div
        className={`relative rounded-xl border-2 p-4 h-full transition-all ${
          isActive
            ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/10'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-heading">Free</h3>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-heading">$0</span>
          </div>
        </div>

        {isActive && (
          <div className="mb-3 flex items-center gap-1.5 text-primary-600 dark:text-primary-400 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Current plan
          </div>
        )}

        {expirationDate && (
          <p className="text-xs text-body mb-3">
            Current plan active until{' '}
            {expirationDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        )}

        {planDef && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
            <p className="text-xs font-semibold text-body uppercase tracking-wide">Quotas</p>
            <ul className="space-y-1.5 text-sm text-body">
              <li className="flex items-center justify-between">
                <span>Daily</span>
                <span className="font-medium text-heading">{planDef.quotas.daily} prompts</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Weekly</span>
                <span className="font-medium text-heading">{planDef.quotas.weekly} prompts</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Monthly</span>
                <span className="font-medium text-heading">{planDef.quotas.monthly} prompts</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderPaidPlan = (planId: Exclude<PlanId, 'free'>) => {
    const planDef = plans?.plans.find((p) => p.id === planId);
    const price = planDef && plans
      ? getPrice(plans, planId, billingPeriod)
      : null;
    const isActive = isCurrentPlan(planId);
    const isHighlighted = planId === highlightPlan;
    const discount = getDiscountBadge(planId);
    const isSelected = selectedPlan === planId;

    // For yearly billing, display the monthly equivalent for easy comparison
    const displayPrice = billingPeriod === 'yearly' && price?.monthlyEquivalentCents
      ? `$${Math.round(price.monthlyEquivalentCents / 100)}`
      : price?.usdDisplay;
    const displaySuffix = billingPeriod === 'yearly' ? 'billed yearly' : (billingPeriod === 'monthly' ? '/mo' : '');

    const cardBase = isHighlighted
      ? 'border-primary-600 dark:border-primary-400 ring-1 ring-primary-600/20'
      : 'border-gray-200 dark:border-gray-700';

    return (
      <div
        onClick={() => handleSelectPlan(planId)}
        className={`relative rounded-xl border-2 p-4 h-full cursor-pointer transition-all ${cardBase} ${
          isActive
            ? 'bg-primary-50 dark:bg-primary-900/10'
            : isSelected
              ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-400'
              : 'bg-white dark:bg-gray-800 hover:border-primary-300 dark:hover:border-primary-600'
        }`}
      >
        {/* Discount badge */}
        {discount && (
          <div className="absolute -top-3 left-4">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-primary-600 to-secondary-600 text-white">
              Save {discount}
            </span>
          </div>
        )}

        {/* Highlight label */}
        {isHighlighted && !isActive && (
          <div className="mb-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
              <Zap className="w-3 h-3" />
              Popular
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-heading">{planDef?.name}</h3>
          <div className="text-right flex flex-col items-end">
            <span className="text-2xl font-bold text-heading">
              {displayPrice}
            </span>
            <span className="text-sm text-body opacity-75 leading-tight mt-0.5">
              {displaySuffix || '/mo'}
            </span>
          </div>
        </div>

        {isActive && (
          <div className="mb-3 flex items-center gap-1.5 text-primary-600 dark:text-primary-400 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Current plan
          </div>
        )}

        {expirationDate && !isActive && (
          <p className="text-xs text-body mb-3">
            Current plan active until{' '}
            {expirationDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        )}

        {/* Quotas */}
        {planDef && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
            <p className="text-xs font-semibold text-body uppercase tracking-wide">Quotas</p>
            <ul className="space-y-1.5 text-sm text-body">
              <li className="flex items-center justify-between">
                <span>Daily</span>
                <span className="font-medium text-heading">
                  {planDef.id === 'unlimited' ? 'Unlimited' : `${planDef.quotas.daily} prompts`}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Weekly</span>
                <span className="font-medium text-heading">
                  {planDef.id === 'unlimited' ? 'Unlimited' : `${planDef.quotas.weekly} prompts`}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Monthly</span>
                <span className="font-medium text-heading">
                  {planDef.id === 'unlimited' ? 'Unlimited' : `${planDef.quotas.monthly} prompts`}
                </span>
              </li>
            </ul>
          </div>
        )}

        {isSelected && !isActive && (
          <div className="mt-3 flex items-center gap-1.5 text-primary-600 dark:text-primary-400 text-sm font-medium">
            <ArrowRight className="w-3.5 h-3.5" />
            Selected — configure below
          </div>
        )}
      </div>
    );
  };

  // ─── Payment states ──────────────────────────────────────────────────────

  const renderPaymentPaying = () => (
    <div className="text-center py-8">
      <Loader2 className="w-14 h-14 animate-spin text-primary-600 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-heading mb-2">Confirm in Your Wallet</h3>
      <p className="text-sm text-body max-w-sm mx-auto">
        Please approve the transaction in your wallet popup. Do not close this page.
      </p>
    </div>
  );

  const renderPaymentVerify = () => {
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    return (
      <div className="text-center py-8">
        <div className="relative w-20 h-20 mx-auto mb-4">
          <Loader2 className="w-20 h-20 animate-spin text-primary-600" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold text-heading">{timeStr}</span>
          </div>
        </div>
        <h3 className="text-lg font-semibold text-heading mb-2">Confirming Payment</h3>
        <p className="text-sm text-body mb-4 max-w-sm mx-auto">
          Waiting for blockchain confirmation… this usually takes a few seconds.
          <br />
          Please keep this page open.
        </p>
        {txHash && (
          <>
            <a
              href={`https://etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-xs font-mono break-all mb-3"
            >
              {txHash.slice(0, 10)}…{txHash.slice(-8)}
              <ArrowRight className="w-3 h-3" />
            </a>
            <div className="mt-2">
              <button
                onClick={handleManualVerification}
                className="text-xs text-body underline hover:text-heading transition-colors"
              >
                I already confirmed — verify manually
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderPaymentSuccess = () => (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
      </div>
      <h3 className="text-xl font-semibold text-heading mb-2">Payment Confirmed!</h3>
      <p className="text-sm text-body mb-4">
        Your subscription is now active. Enjoy!
      </p>
      {paymentIntent && (
        <a
          href={`https://etherscan.io/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-xs font-mono mb-4"
        >
          View on Sepolia Etherscan
          <ArrowRight className="w-3 h-3" />
        </a>
      )}
    </div>
  );

  const renderPaymentError = () => (
    <div className="space-y-4 py-4">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">Payment Failed</h3>
            <p className="text-sm text-red-700 dark:text-red-400">
              {errorMessage || 'Something went wrong with your payment.'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => {
            setStep('select');
            setErrorMessage(null);
            if (!paymentIntent) return;
          }}
          className="flex-1 py-2.5 text-sm font-medium text-body bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Try Again
        </button>
        {paymentIntent && (
          <button
            onClick={handleManualVerification}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg hover:from-primary-700 hover:to-secondary-700 transition-all"
          >
            Verify {txHash?.slice(0, 6)}…
          </button>
        )}
      </div>
    </div>
  );

  // ─── Main render ─────────────────────────────────────────────────────────

  if (!wallet) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Lock className="w-5 h-5 text-body" />
            </div>
            <h2 className="text-lg font-semibold text-heading">Wallet Required</h2>
          </div>
          <p className="text-sm text-body mb-6">
            Connect your wallet to view and get a premium plan.
          </p>
          <button
            onClick={async () => {
              try {
                await connectWallet();
              } catch {
                setErrorMessage('Wallet connection failed. Please try again.');
              }
            }}
            className="w-full py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            Connect Wallet
          </button>
          {!forced && (
            <button
              onClick={handleClose}
              className="mt-2 w-full py-2.5 text-sm font-medium text-body bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Maybe Later
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isLoadingPlans) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full p-8">
          <Loader2 className="w-10 h-10 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-center text-sm text-body">Loading plans...</p>
        </div>
      </div>
    );
  }

  // ─── Active subscription info overlay ────────────────────────────────────

  if (currentSubscription?.status === 'active' && !step.startsWith('pay')) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-heading">Your Subscription</h2>
            <button
              onClick={handleClose}
              className="text-body hover:text-heading transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6 p-4 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-xl text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium opacity-90">Current Plan</span>
              <span className="text-2xl font-bold capitalize">{currentSubscription.plan}</span>
            </div>
            <div className="text-sm opacity-90">
              {billingPeriod === 'monthly'
                ? 'Monthly'
                : billingPeriod === 'yearly'
                  ? 'Yearly'
                  : 'Single payment'}
            </div>
          </div>

          {expirationDate && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-body mb-1">Expires</p>
              <p className="text-sm font-medium text-heading">
                {expirationDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}

          {usage && (
            <div className="space-y-3 mb-6">
              <p className="text-sm font-medium text-heading">Usage This Period</p>
              {([
                { key: 'daily', label: 'Today' },
                { key: 'weekly', label: 'This Week' },
                { key: 'monthly', label: 'This Month' },
              ] as const).map(({ key, label }) => {
                const window = usage.usage[key];
                const pct =
                  window.limit > 0 ? Math.min(100, (window.used / window.limit) * 100) : 0;
                const barColor =
                  pct >= 100
                    ? 'bg-red-500'
                    : pct >= 80
                      ? 'bg-yellow-500'
                      : 'bg-primary-500';
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-body">{label}</span>
                      <span className="text-heading font-medium">
                        {window.used} / {window.limit}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className={`${barColor} h-1.5 rounded-full transition-all duration-300`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Payment History */}
          <div className="mb-6">
            <PaymentHistory limit={5} />
          </div>

          <button
            onClick={handleClose}
            className="w-full py-2.5 text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg hover:from-primary-700 hover:to-secondary-700 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // ─── Payment step views ──────────────────────────────────────────────────

  if (step === 'paying') return renderPaymentPaying();
  if (step === 'verify') return renderPaymentVerify();
  if (step === 'success') return renderPaymentSuccess();
  if (step === 'error') return renderPaymentError();

  // ─── Select view ─────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 pt-6 pb-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-heading">Get a premium plan</h2>
            <p className="text-sm text-body opacity-75 mt-0.5">
              Upgrade to unlock more prompts
            </p>
          </div>
          {!forced && (
            <button
              onClick={handleClose}
              className="text-body hover:text-heading transition-colors p-1"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Billing toggle */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  billingPeriod === 'monthly'
                    ? 'bg-white dark:bg-gray-700 text-heading shadow-sm'
                    : 'text-body hover:text-heading'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  billingPeriod === 'yearly'
                    ? 'bg-white dark:bg-gray-700 text-heading shadow-sm'
                    : 'text-body hover:text-heading'
                }`}
              >
                Yearly
                <span className="ml-1.5 text-xs text-primary-600 dark:text-primary-400 font-semibold">
                  Save
                </span>
              </button>
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Free plan */}
            <div className="h-full">
              {renderFreePlan()}
            </div>

            {/* Pro */}
            {plans && (
              <div className="h-full">
                {renderPaidPlan('pro')}
              </div>
            )}

            {/* Unlimited */}
            {plans && (
              <div className="h-full">
                {renderPaidPlan('unlimited')}
              </div>
            )}
          </div>

          {/* Payment CTA for selected plan */}
          {selectedPlan && step === 'select' && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                {wallet && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-body">Wallet</span>
                    <span className="text-heading font-mono text-xs">
                      {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-body">Plan</span>
                  <span className="text-heading font-medium capitalize">{selectedPlan}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-body">Billing</span>
                  <span className="text-heading font-medium capitalize">{billingPeriod}</span>
                </div>

                {/* Currency selector — shown before intent is created */}
                {!paymentIntent && wallet && (
                  <div className="space-y-2">
                    <span className="text-sm text-body">Pay with</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrency('ETH')}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                          currency === 'ETH'
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'bg-white dark:bg-gray-700 text-body border border-gray-200 dark:border-gray-600 hover:border-primary-400'
                        }`}
                      >
                        <span className="text-lg">⟠</span> ETH
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrency('USDT')}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                          currency === 'USDT'
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'bg-white dark:bg-gray-700 text-body border border-gray-200 dark:border-gray-600 hover:border-primary-400'
                        }`}
                      >
                        <span className="text-lg font-bold">₮</span> USDT
                      </button>
                    </div>
                  </div>
                )}

                {paymentIntent && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-body">Amount</span>
                      <span className="text-heading font-semibold">{paymentIntent.usdDisplay}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-body">Currency</span>
                      <span className="text-heading font-medium">{paymentIntent.selectedCurrency || currency}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-body">
                      <span>Network</span>
                      <span>Ethereum Mainnet</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-body">
                      <span>Recipient</span>
                      <span className="font-mono">
                        {paymentIntent.treasuryAddress.slice(0, 6)}…{paymentIntent.treasuryAddress.slice(-4)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {!wallet ? (
                <button
                  onClick={async () => {
                    try { await connectWallet(); } catch { setErrorMessage('Wallet connection failed.'); }
                  }}
                  className="w-full py-3 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Connect Wallet to Continue
                </button>
              ) : (
                <button
                  onClick={handleCreatePaymentIntent}
                  disabled={!paymentIntent}
                  className="w-full py-3 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  {!paymentIntent
                    ? `Continue with ${currency}`
                    : `Pay ${paymentIntent.usdDisplay} with ${paymentIntent.selectedCurrency || currency}`}
                </button>
              )}

              {!wallet && (
                <p className="text-xs text-center text-body opacity-55">
                  Wallet connection required to subscribe.
                </p>
              )}
              {wallet && !paymentIntent && (
                <p className="text-xs text-center text-body opacity-55">
                  Select ETH or USDT above, then click continue to create your payment.
                </p>
              )}
              {wallet && paymentIntent && (
                <p className="text-xs text-center text-body opacity-55">
                  You will be asked to approve and confirm the transaction in your wallet.
                </p>
              )}
            </div>
          )}

          {/* Manual verification if txHash already submitted */}
          {txHash && step === 'select' && paymentIntent && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
              <p className="text-sm text-body">Already sent?</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={txHash}
                  readOnly
                  className="flex-1 px-3 py-2 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-heading"
                />
                <button
                  onClick={handleManualVerification}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-700 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-lg transition-colors"
                >
                  Verify
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}