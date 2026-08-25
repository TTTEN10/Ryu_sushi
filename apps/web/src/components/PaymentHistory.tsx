import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useSubscription, type PaymentRecord, type PaymentStatus } from '../hooks/useSubscription';

// ─── Props ──────────────────────────────────────────────────────────────────

interface PaymentHistoryProps {
  /** Max number of payments to display. */
  limit?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function centsToUSD(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusBadge(status: PaymentStatus): { label: string; cls: string } {
  switch (status) {
    case 'CONFIRMED':
      return { label: 'Confirmed', cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' };
    case 'PENDING':
      return { label: 'Pending', cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' };
    case 'FAILED':
      return { label: 'Failed', cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' };
    case 'REJECTED':
      return { label: 'Rejected', cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' };
    default:
      return { label: status, cls: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' };
  }
}

function planLabel(plan: string): string {
  const labels: Record<string, string> = {
    pro: 'Pro',
    unlimited: 'Unlimited',
  };
  return labels[plan] ?? plan;
}

function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function chainName(chainId: number): string {
  return chainId === 11155111 ? 'Sepolia' : `Chain ${chainId}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function PaymentHistory({ limit = 10 }: PaymentHistoryProps) {
  const { paymentHistory, isLoadingPaymentHistory } = useSubscription();

  if (isLoadingPaymentHistory) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
        <span className="ml-2 text-sm text-body opacity-60">Loading history…</span>
      </div>
    );
  }

  if (!paymentHistory || paymentHistory.length === 0) {
    return (
      <div className="text-center py-6">
        <Clock className="w-8 h-8 text-body opacity-30 mx-auto mb-2" />
        <p className="text-sm text-body opacity-60">No payments yet</p>
        <p className="text-xs text-body opacity-40 mt-1">Your transaction history will appear here</p>
      </div>
    );
  }

  const displayed = paymentHistory.slice(0, limit);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-heading mb-2">Payment History</p>
      {displayed.map((payment) => (
        <PaymentRow key={payment.id} payment={payment} />
      ))}
      {paymentHistory.length > limit && (
        <p className="text-xs text-body opacity-50 text-center pt-1">
          Showing {limit} of {paymentHistory.length} payments
        </p>
      )}
    </div>
  );
}

// ─── Single Row ─────────────────────────────────────────────────────────────

function PaymentRow({ payment }: { payment: PaymentRecord }) {
  const { label, cls } = statusBadge(payment.status);
  const isConfirmed = payment.status === 'CONFIRMED';

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
      {/* Status icon */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${cls}`}>
        {isConfirmed ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : payment.status === 'PENDING' ? (
          <Clock className="w-4 h-4" />
        ) : (
          <AlertCircle className="w-4 h-4" />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-heading">{planLabel(payment.plan)}</span>
          <span className="text-xs text-body opacity-50 capitalize">
            {payment.billingPeriod}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-body opacity-60">
          <span>{centsToUSD(payment.amountCents)}</span>
          <span>·</span>
          <span>{chainName(payment.chainId)}</span>
          <span>·</span>
          <span>{formatRelativeDate(payment.createdAt)}</span>
        </div>
      </div>

      {/* Status badge */}
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${cls}`}>
        {label}
      </span>

      {/* Etherscan link */}
      {payment.txHash && isConfirmed && (
        <a
          href={`https://etherscan.io/tx/${payment.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-primary-600 hover:text-primary-700 transition-colors"
          aria-label="View on blockchain explorer"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}