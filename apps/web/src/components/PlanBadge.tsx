/**
 * Compact plan status badge shown in the header next to the wallet address.
 * - No active subscription: gold "Subscribe" button with shimmer → opens SubscriptionTerminal.
 * - Active subscription: shows plan type + expiration date, click opens SubscriptionTerminal.
 */
import { Calendar, Loader2 } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';

export default function PlanBadge({
  onOpenTerminal,
}: {
  onOpenTerminal: () => void;
}) {
  const { subscription, isLoadingSubscription } = useSubscription();
  const isActive = subscription?.status === 'active';
  const expirationDate = isActive && subscription?.expiresAt
    ? new Date(subscription.expiresAt)
    : null;

  const baseClasses = 'inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-3 text-sm font-semibold rounded-xl min-h-[44px] transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-amber-400/30 whitespace-nowrap cursor-pointer select-none hover:-translate-y-0.5 active:scale-95';

  if (isLoadingSubscription) {
    return (
      <div className={`${baseClasses} bg-neutral-100 dark:bg-neutral-800 text-body opacity-60`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Plan</span>
      </div>
    );
  }

  // ─── Active subscription ────────────────────────────────────────────────

  if (isActive) {
    return (
      <button
        type="button"
        onClick={onOpenTerminal}
        className={`${baseClasses} bg-gradient-to-r from-primary-600 to-secondary-600 text-white hover:from-primary-700 hover:to-secondary-700`}
        title="View subscription details"
      >
        <span className="capitalize">{subscription.plan}</span>
        {expirationDate && (
          <>
            <span className="opacity-70">·</span>
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">
              {expirationDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </>
        )}
      </button>
    );
  }

  // ─── No active subscription ─────────────────────────────────────────────

  return (
    <div className="relative">
      <style>{`
        @keyframes goldShimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes goldGlow {
          0%, 100% { box-shadow: 0 0 6px rgba(234,179,8,0.3), 0 2px 8px rgba(217,119,6,0.25); }
          50%      { box-shadow: 0 0 18px rgba(234,179,8,0.55), 0 2px 12px rgba(217,119,6,0.4); }
        }
        .btn-gold-shimmer {
          background-image: linear-gradient(
            110deg,
            #fde68a 22%,
            #fbbf24 38%,
            #f59e0b 50%,
            #fbbf24 62%,
            #fde68a 78%
          );
          background-size: 200% 100%;
          animation: goldShimmer 3s ease-in-out infinite, goldGlow 3s ease-in-out infinite;
          color: #1c1917;
        }
        .btn-gold-shimmer:hover {
          background-image: linear-gradient(
            110deg,
            #fef3c7 22%,
            #f59e0b 38%,
            #d97706 50%,
            #f59e0b 62%,
            #fef3c7 78%
          );
          background-size: 200% 100%;
          animation: goldShimmer 2s ease-in-out infinite, goldGlow 2s ease-in-out infinite;
        }
      `}</style>
      <button
        type="button"
        onClick={onOpenTerminal}
        className={`${baseClasses} btn-gold-shimmer`}
      >
        <span>Subscribe</span>
      </button>
    </div>
  );
}
