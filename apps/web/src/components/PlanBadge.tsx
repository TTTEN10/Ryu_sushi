/**
 * Compact plan status badge shown in the header next to the wallet address.
 * - No active subscription: green-purple "Subscribe" button → opens SubscriptionTerminal.
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

  if (isLoadingSubscription) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-body opacity-60">
        <Loader2 className="w-3 h-3 animate-spin" />
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
        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-full text-xs font-medium hover:from-primary-700 hover:to-secondary-700 transition-all shadow-md hover:shadow-lg whitespace-nowrap"
        title="View subscription details"
      >
        <span className="capitalize">{subscription.plan}</span>
        {expirationDate && (
          <>
            <span className="opacity-70">·</span>
            <Calendar className="w-3 h-3" />
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
    <button
      type="button"
      onClick={onOpenTerminal}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-500 to-purple-600 text-white rounded-full text-xs font-semibold hover:from-green-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg whitespace-nowrap"
    >
      <span>Subscribe</span>
    </button>
  );
}