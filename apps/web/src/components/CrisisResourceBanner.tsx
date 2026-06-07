const HELPLINE_URL = 'https://findahelpline.com';

/**
 * Persistent crisis disclaimer on the chat surface (safety / compliance).
 * Shown for all users — guest and authenticated.
 */
export default function CrisisResourceBanner() {
  return (
    <div
      className="mb-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3"
      role="note"
      aria-label="Crisis support resources"
    >
      <p className="text-xs text-amber-800 dark:text-amber-300">
        <strong>Crisis support:</strong> Dr. Safe is not a crisis service. If you&apos;re in crisis,
        please contact your local emergency number or visit{' '}
        <a
          href={HELPLINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium hover:text-amber-900 dark:hover:text-amber-200"
        >
          findahelpline.com
        </a>
        .
      </p>
    </div>
  );
}
