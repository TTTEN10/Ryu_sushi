import { useState } from 'react';
import { Wallet, ChevronDown, ChevronUp, X } from 'lucide-react';

type GuestModeLimitModalProps = {
  open: boolean;
  onClose: () => void;
  onScrollToWallet: () => void;
};

/**
 * Shown when a guest user reaches the per-session prompt limit (see ChatWidget).
 * Conversion funnel: explain guest limits, link to wallet setup / connect in header.
 */
export default function GuestModeLimitModal({
  open,
  onClose,
  onScrollToWallet,
}: GuestModeLimitModalProps) {
  const [whyWalletOpen, setWhyWalletOpen] = useState(false);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-limit-title"
      aria-describedby="guest-limit-desc"
    >
      <div className="relative max-w-lg w-full rounded-2xl border border-neutral-dark/20 dark:border-white/20 bg-white dark:bg-gray-900 shadow-xl p-6 sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-body hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 id="guest-limit-title" className="text-xl sm:text-2xl font-semibold text-heading pr-10">
          Guest limit reached
        </h2>
        <p id="guest-limit-desc" className="mt-4 text-body leading-relaxed">
          You&apos;re using SafePsy in guest mode. Your conversations are not saved and will disappear
          after this session or when you refresh the page.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-medium hover:opacity-95 transition-opacity min-h-[44px]"
          >
            <Wallet className="w-5 h-5 shrink-0" aria-hidden />
            Create a wallet
          </a>
          <button
            type="button"
            onClick={() => {
              onScrollToWallet();
              onClose();
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-primary-600 text-primary-700 dark:text-primary-300 font-medium hover:bg-primary-50 dark:hover:bg-primary-900/20 min-h-[44px]"
          >
            Connect existing wallet
          </button>
        </div>

        <div className="mt-6 border-t border-gray-200 dark:border-white/10 pt-4">
          <button
            type="button"
            onClick={() => setWhyWalletOpen((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 w-full text-left"
            aria-expanded={whyWalletOpen}
          >
            Why connect a wallet?
            {whyWalletOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {whyWalletOpen && (
            <ul className="mt-3 text-sm text-body space-y-2 list-disc pl-5">
              <li>
                <strong className="text-heading">Data ownership</strong> — Your encrypted history is
                tied to keys you control, not a central account we own.
              </li>
              <li>
                <strong className="text-heading">Encryption</strong> — Chat is encrypted for storage
                with wallet-derived keys; guest mode skips that path entirely.
              </li>
              <li>
                <strong className="text-heading">Persistence</strong> — Verified wallet sessions can
                load and save encrypted history across visits; guest data stays in this tab only.
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
