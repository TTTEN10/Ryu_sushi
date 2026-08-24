/**
 * Cookie Consent Banner Component
 *
 * GDPR-compliant consent banner for analytics opt-in.
 * Shows on first visit until user makes a choice.
 */

import React, { useState, useEffect } from 'react';
import {
  shouldShowConsentBanner,
  optInAnalytics,
  optOutAnalytics,
  useCookieConsent,
} from '../lib/analytics-consent';

interface CookieConsentBannerProps {
  onAccept?: () => void;
  onDecline?: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  onAccept,
  onDecline,
}) => {
  const [show, setShow] = useState(false);
  const { loaded } = useCookieConsent();

  useEffect(() => {
    // Only show banner after consent is loaded and if no prior choice
    if (loaded && shouldShowConsentBanner()) {
      setShow(true);
    }
  }, [loaded]);

  const handleAccept = () => {
    optInAnalytics();
    setShow(false);
    onAccept?.();
  };

  const handleDecline = () => {
    optOutAnalytics();
    setShow(false);
    onDecline?.();
  };

  if (!show) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-2 z-50"
      role="alertdialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex-1">
          <h2
            id="cookie-consent-title"
            className="text-sm font-semibold mb-1"
          >
            We value your privacy
          </h2>
          <p
            id="cookie-consent-description"
            className="text-xs text-gray-300"
          >
            We use anonymous analytics to understand how our platform is used
            and improve your experience. No personal data is stored. Your wallet
            address is never tracked.{' '}
            <a
              href="/privacy"
              className="underline hover:text-white"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn more
            </a>
            .
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDecline}
            className="px-3 py-1 text-xs font-medium text-gray-300 hover:text-white border border-gray-600 rounded hover:border-gray-500 transition-colors"
            aria-label="Decline analytics cookies"
          >
            Decline
          </button>

          <button
            onClick={handleAccept}
            className="px-3 py-1 text-xs font-medium text-gray-900 bg-white rounded hover:bg-gray-100 transition-colors"
            aria-label="Accept analytics cookies"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
