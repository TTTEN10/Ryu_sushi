import { ArrowRight, Calendar, Clock, AlertCircle, CheckCircle2, CreditCard } from 'lucide-react';
import { useEffect } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import PaymentHistory from './PaymentHistory';

interface SubscriptionStatusProps {
  compact?: boolean;
}

type UsageKey = 'daily' | 'weekly' | 'monthly';

export default function SubscriptionStatus({ compact = false }: SubscriptionStatusProps) {
  const { subscription, usage, quotaStatus, isLoadingSubscription, error, fetchPaymentHistory } = useSubscription();

  useEffect(() => {
    if (subscription) fetchPaymentHistory();
  }, [subscription, fetchPaymentHistory]);

  const expirationDate = subscription?.expiresAt
    ? new Date(subscription.expiresAt)
    : null;

  const isExpired = expirationDate ? expirationDate < new Date() : false;
  const isExpiredButActive = subscription?.status === 'active' && isExpired;

  const statusBadge = () => {
    if (subscription?.status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
          Pending
        </span>
      );
    }
    if (subscription?.status === 'active') {
      if (isExpiredButActive) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
            Expired
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
          <CheckCircle2 className="w-3 h-3" />
          Active
        </span>
      );
    }
    if (subscription?.status === 'expired') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
          Expired
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-body">
        Free
      </span>
    );
  };

  const renderUsageBar = (key: UsageKey, label: string) => {
    const window = usage?.usage[key] || quotaStatus
      ? {
          used:
            key === 'daily' ? quotaStatus!.dailyUsed : key === 'weekly' ? quotaStatus!.weeklyUsed : quotaStatus!.monthlyUsed,
          limit:
            key === 'daily' ? quotaStatus!.dailyLimit : key === 'weekly' ? quotaStatus!.weeklyLimit : quotaStatus!.monthlyLimit,
        }
      : { used: 0, limit: 0 };

    if (!window) return null;

    const pct = window.limit > 0 ? Math.min(100, (window.used / window.limit) * 100) : 0;
    const barColor =
      pct >= 100
        ? 'bg-red-500'
        : pct >= 80
          ? 'bg-yellow-500'
          : 'bg-primary-500';

    if (compact) {
      return (
        <div className="flex items-center justify-between text-xs py-1">
          <span className="text-body">{label}</span>
          <span className="text-heading font-medium tabular-nums">
            {window.used}/{window.limit}
          </span>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-body">{label}</span>
          <span className="text-heading font-medium tabular-nums">
            {window.used} / {window.limit}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className={`${barColor} h-1.5 rounded-full transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  };

  if (isLoadingSubscription) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && !subscription) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        {error}
      </div>
    );
  }

  // ─── Active subscription ────────────────────────────────────────────────

  if (subscription?.status === 'active' || subscription?.status === 'expired') {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">Current Plan</h3>
              <p className="text-xl font-bold capitalize">{subscription.plan}</p>
            </div>
            {statusBadge()}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Expiration */}
          {expirationDate && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-body opacity-60 flex-shrink-0" />
              <span className="text-body">
                {isExpiredButActive || subscription.status === 'expired'
                  ? 'Expired on '
                  : 'Expires on '}
                <span className="font-medium text-heading">
                  {expirationDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </span>
            </div>
          )}

          {/* Usage bars */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-heading">Usage</p>
            {renderUsageBar('daily', 'Today')}
            {renderUsageBar('weekly', 'This Week')}
            {renderUsageBar('monthly', 'This Month')}
          </div>

          {/* Payment History */}
          <PaymentHistory limit={5} />

          {/* Transaction hash */}
          {subscription.cryptoPaymentTxHash && (
            <div className="flex items-center gap-2 text-xs pt-2 border-t border-gray-100 dark:border-gray-800">
              <CreditCard className="w-3.5 h-3.5 text-body opacity-50" />
              <a
                href={`https://etherscan.io/tx/${subscription.cryptoPaymentTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 font-mono flex items-center gap-1"
              >
                {subscription.cryptoPaymentTxHash.slice(0, 10)}…{subscription.cryptoPaymentTxHash.slice(-8)}
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* CTA for expired */}
          {(isExpiredButActive || subscription.status === 'expired') && (
            <p className="text-sm text-body pt-2 border-t border-gray-100 dark:border-gray-800">
              Your subscription has expired.{' '}
              <span className="text-primary-600 dark:text-primary-400 font-medium cursor-pointer">
                Renew now
              </span>
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── No active subscription (free or pending) ───────────────────────────

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-body opacity-60" />
            <h3 className="text-sm font-medium text-heading">Subscription</h3>
          </div>
          {statusBadge()}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {subscription?.status === 'pending' && (
          <div className="flex items-start gap-2 text-sm bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-700 dark:text-yellow-300 font-medium">Payment pending</p>
              <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-0.5">
                Your payment is being confirmed. This may take a few minutes.
              </p>
            </div>
          </div>
        )}

        {/* Free plan usage */}
        {(subscription?.plan === 'free' || !subscription?.plan) && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-heading">Free Plan Usage</p>
            {renderUsageBar('daily', 'Today')}
            {renderUsageBar('weekly', 'This Week')}
            {renderUsageBar('monthly', 'This Month')}

            {usage?.usage && Object.values(usage.usage).some((w) => w.remaining <= 5) && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 pt-1">
                Approaching your free limit.{' '}
                <span className="font-medium cursor-pointer text-primary-600 dark:text-primary-400">
                  Upgrade for more
                </span>
              </p>
            )}
          </div>
        )}

        {subscription?.plan !== 'free' && !subscription?.plan && (
          <p className="text-sm text-body">
            Connect your wallet to view your subscription.
          </p>
        )}
      </div>
    </div>
  );
}