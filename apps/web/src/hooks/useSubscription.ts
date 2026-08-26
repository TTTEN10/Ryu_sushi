import { useState, useCallback, useEffect, useRef } from 'react';
import { apiFetch } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

// ─── Types (mirror backend response shapes) ─────────────────────────────────

export type PlanId = 'free' | 'pro' | 'unlimited';
export type BillingPeriod = 'monthly' | 'yearly';
export type PlanStatus = 'pending' | 'active' | 'expired' | 'cancelled';
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REJECTED' | 'REFUNDED' | 'CANCELLED';

export interface UsageWindow {
  used: number;
  limit: number;
  remaining: number;
}

export interface UsageResponse {
  plan: PlanId;
  usage: {
    daily: UsageWindow;
    weekly: UsageWindow;
    monthly: UsageWindow;
  };
}

export interface QuotaStatus {
  canUse: boolean;
  plan: PlanId;
  dailyUsed: number;
  dailyLimit: number;
  weeklyUsed: number;
  weeklyLimit: number;
  monthlyUsed: number;
  monthlyLimit: number;
}

export interface Subscription {
  id: string;
  plan: PlanId;
  billingPeriod: BillingPeriod | null;
  status: PlanStatus;
  startedAt: string | null;
  expiresAt: string | null;
  cryptoPaymentTxHash: string | null;
}

export interface SubscriptionStatusResponse {
  subscription: Subscription;
  effectivePlan: PlanId;
  usage: {
    daily: UsageWindow;
    weekly: UsageWindow;
    monthly: UsageWindow;
  };
  quotaStatus: QuotaStatus;
}

export interface PlanPrice {
  planId: Exclude<PlanId, 'free'>;
  billingPeriod: BillingPeriod;
  amountCents: number;
  annualDiscountPercent: number;
  usdDisplay: string;
  monthlyEquivalentCents?: number;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  marketingName: string;
  isFree: boolean;
  quotas: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export interface PlansResponse {
  plans: PlanDefinition[];
  prices: PlanPrice[];
  paywallPromptThreshold: number;
}

export interface PaymentIntent {
  paymentId: string;
  plan: Exclude<PlanId, 'free'>;
  billingPeriod: BillingPeriod;
  amountCents: number;
  usdDisplay: string;
  chainId: number;
  treasuryAddress: string;
  expiresAt: string;
  createdAt: string;
  selectedCurrency: 'USDC' | 'USDT';
  tokenAddress: string | null;
}

export interface PaymentRecord {
  id: string;
  plan: Exclude<PlanId, 'free'>;
  billingPeriod: BillingPeriod;
  amountCents: number;
  currency: string;
  chainId: number;
  status: PaymentStatus;
  txHash: string | null;
  createdAt: string;
  confirmedAt: string | null;
  paymentIntentId: string | null;
}

// ─── Shared state ────────────────────────────────────────────────────────────

interface SubscriptionState {
  plans: PlansResponse | null;
  subscription: Subscription | null;
  usage: UsageResponse | null;
  quotaStatus: QuotaStatus | null;
  paymentHistory: PaymentRecord[];
  isLoadingPlans: boolean;
  isLoadingSubscription: boolean;
  isLoadingUsage: boolean;
  isLoadingPaymentHistory: boolean;
  error: string | null;
}

const initialState: SubscriptionState = {
  plans: null,
  subscription: null,
  usage: null,
  quotaStatus: null,
  paymentHistory: [],
  isLoadingPlans: false,
  isLoadingSubscription: false,
  isLoadingUsage: false,
  isLoadingPaymentHistory: false,
  error: null,
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSubscription() {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<SubscriptionState>(initialState);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activePaymentIdRef = useRef<string | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  // Clear state when wallet disconnects
  useEffect(() => {
    if (!isAuthenticated) {
      setState(initialState);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        activePaymentIdRef.current = null;
      }
    }
  }, [isAuthenticated]);

  // ─── Fetch Plans ─────────────────────────────────────────────────────────

  const fetchPlans = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoadingPlans: true, error: null }));
    try {
      const response = await apiFetch('/subscription/plans');
      const data = await response.json();
      if (response.ok && data.success) {
        setState((prev) => ({ ...prev, plans: data.data }));
        return data.data;
      }
      setState((prev) => ({
        ...prev,
        error: data.message || 'Failed to fetch plans',
      }));
      return null;
    } catch {
      setState((prev) => ({
        ...prev,
        error: 'Network error while fetching plans',
      }));
      return null;
    } finally {
      setState((prev) => ({ ...prev, isLoadingPlans: false }));
    }
  }, []);

  // ─── Auto-fetch plans on mount ───────────────────────────────────────────

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // ─── Fetch Subscription Status ───────────────────────────────────────────

  const fetchSubscription = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoadingSubscription: true, error: null }));
    try {
      const response = await apiFetch('/subscription/me');
      const data = await response.json();
      if (response.ok && data.success) {
        const d = data.data;
        setState((prev) => ({
          ...prev,
          subscription: d.subscription,
          quotaStatus: d.quotaStatus,
          usage: {
            plan: d.effectivePlan,
            usage: d.usage,
          },
        }));
        return d;
      }
      setState((prev) => ({
        ...prev,
        error: data.message || 'Failed to fetch subscription',
      }));
      return null;
    } catch {
      setState((prev) => ({
        ...prev,
        error: 'Network error while fetching subscription',
      }));
      return null;
    } finally {
      setState((prev) => ({ ...prev, isLoadingSubscription: false }));
    }
  }, []);

  // ─── Fetch Usage ─────────────────────────────────────────────────────────

  const fetchUsage = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoadingUsage: true, error: null }));
    try {
      const response = await apiFetch('/subscription/usage');
      const data = await response.json();
      if (response.ok && data.success) {
        setState((prev) => ({ ...prev, usage: data.data }));
        return data.data;
      }
      setState((prev) => ({
        ...prev,
        error: data.message || 'Failed to fetch usage',
      }));
      return null;
    } catch {
      setState((prev) => ({
        ...prev,
        error: 'Network error while fetching usage',
      }));
      return null;
    } finally {
      setState((prev) => ({ ...prev, isLoadingUsage: false }));
    }
  }, []);

  // ─── Fetch Payment History ───────────────────────────────────────────────

  const fetchPaymentHistory = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoadingPaymentHistory: true, error: null }));
    try {
      const response = await apiFetch('/subscription/payments');
      const data = await response.json();
      if (response.ok && data.success) {
        setState((prev) => ({ ...prev, paymentHistory: data.data }));
        return data.data;
      }
      setState((prev) => ({
        ...prev,
        error: data.message || 'Failed to fetch payment history',
      }));
      return null;
    } catch {
      setState((prev) => ({
        ...prev,
        error: 'Network error while fetching payment history',
      }));
      return null;
    } finally {
      setState((prev) => ({ ...prev, isLoadingPaymentHistory: false }));
    }
  }, []);

  // ─── Create Payment Intent ───────────────────────────────────────────────

  const createPaymentIntent = useCallback(
    async (plan: Exclude<PlanId, 'free'>, billingPeriod: BillingPeriod, currency: 'USDC' | 'USDT' = 'USDC') => {
      setState((prev) => ({ ...prev, error: null }));
      try {
        const response = await apiFetch('/subscription/payment/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan, billingPeriod, currency }),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          activePaymentIdRef.current = data.data.paymentId;
          const intent = data.data as PaymentIntent;
          return {
            ...intent,
            usdDisplay: `$${Math.round(intent.amountCents / 100)}`,
          } as PaymentIntent;
        }
        const errMsg = data.error
          ? `${data.message} (${data.error})`
          : data.message || 'Failed to create payment intent';
        setState((prev) => ({ ...prev, error: errMsg }));
        return null;
      } catch {
        setState((prev) => ({
          ...prev,
          error: 'Network error while creating payment intent',
        }));
        return null;
      }
    },
    [],
  );

  // ─── Verify Payment ──────────────────────────────────────────────────────

  const verifyPayment = useCallback(
    async (paymentId: string, txHash: string) => {
      setState((prev) => ({ ...prev, error: null }));
      try {
        const response = await apiFetch('/subscription/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId, txHash }),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          // Refresh subscription and usage after verification
          await fetchSubscription();
          await fetchUsage();
          activePaymentIdRef.current = null;
          return data.data;
        }
        const errMsg = data.error
          ? `${data.message} (${data.error})`
          : data.message || 'Payment verification failed';
        setState((prev) => ({ ...prev, error: errMsg }));
        return null;
      } catch {
        setState((prev) => ({
          ...prev,
          error: 'Network error while verifying payment',
        }));
        return null;
      }
    },
    [fetchSubscription, fetchUsage],
  );

  // ─── Polling for Pending Payments ────────────────────────────────────────

  const startPaymentPolling = useCallback(
    (paymentId: string, onConfirmed: () => void, timeoutMs: number = 120_000) => {
      stopPaymentPolling();
      activePaymentIdRef.current = paymentId;

      const startTime = Date.now();

      pollRef.current = setInterval(async () => {
        // Timeout check
        if (Date.now() - startTime > timeoutMs) {
          stopPaymentPolling();
          setState((prev) => ({
            ...prev,
            error:
              'Payment confirmation took too long. Your subscription may still activate — check later.',
          }));
          return;
        }

        try {
          const response = await apiFetch(`/subscription/payment/${paymentId}`);
          const data = await response.json();
          if (response.ok && data.success && data.data.status === 'CONFIRMED') {
            stopPaymentPolling();
            await fetchSubscription();
            await fetchUsage();
            activePaymentIdRef.current = null;
            onConfirmed();
          }
        } catch {
          // Silently fail polling — may be network blip
        }
      }, 3000); // Poll every 3 seconds
    },
    [fetchSubscription, fetchUsage],
  );

  const stopPaymentPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // ─── Get Price for Plan ──────────────────────────────────────────────────

  const getPrice = useCallback(
    (plans: PlansResponse, planId: Exclude<PlanId, 'free'>, billingPeriod: BillingPeriod) => {
      return (
        plans.prices.find(
          (p) => p.planId === planId && p.billingPeriod === billingPeriod,
        ) ?? null
      );
    },
    [],
  );

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const getUsagePercentage = (window: UsageWindow): number => {
    if (window.limit === 0) return 0;
    return Math.min(100, (window.used / window.limit) * 100);
  };

  const isQuotaExceeded = (quotaStatus: QuotaStatus | null): boolean => {
    return quotaStatus !== null && !quotaStatus.canUse;
  };

  const isApproachingLimit = (usage: UsageResponse | null, threshold: number = 80): boolean => {
    if (!usage) return false;
    return (
      getUsagePercentage(usage.usage.daily) >= threshold ||
      getUsagePercentage(usage.usage.weekly) >= threshold ||
      getUsagePercentage(usage.usage.monthly) >= threshold
    );
  };

  // ─── Refresh All ─────────────────────────────────────────────────────────

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchSubscription(), fetchUsage()]);
  }, [fetchSubscription, fetchUsage]);

  // ─── Return ──────────────────────────────────────────────────────────────

  return {
    // State
    plans: state.plans,
    subscription: state.subscription,
    usage: state.usage,
    quotaStatus: state.quotaStatus,
    paymentHistory: state.paymentHistory,
    isLoadingPlans: state.isLoadingPlans,
    isLoadingSubscription: state.isLoadingSubscription,
    isLoadingUsage: state.isLoadingUsage,
    isLoadingPaymentHistory: state.isLoadingPaymentHistory,
    error: state.error,

    // Actions
    fetchPlans,
    fetchSubscription,
    fetchUsage,
    fetchPaymentHistory,
    createPaymentIntent,
    verifyPayment,
    startPaymentPolling,
    stopPaymentPolling,
    refreshAll,
    getPrice,

    // Derived
    getUsagePercentage,
    isQuotaExceeded,
    isApproachingLimit,
    isPendingPayment: activePaymentIdRef.current !== null,
  };
}