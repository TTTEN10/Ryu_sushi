import React, { useState, useEffect } from 'react';

interface CrisisHotline {
  name: string;
  phone: string;
  website: string;
  availability: string;
}

interface SafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOptIn: (data: SafetyNetData) => Promise<void>;
  detectedLanguage: string;
  hotline?: CrisisHotline | null;
}

interface SafetyNetData {
  email: string;
  fullName: string;
  emergencyContact: string;
  language: string;
  country: string;
}

/**
 * Safety Net Modal
 *
 * Non-blocking crisis support modal that appears when crisis keywords are detected.
 * Provides immediate hotline resources and optional opt-in for follow-up support.
 *
 * Design principles:
 * - Empathetic, non-judgmental language
 * - User autonomy (easy to dismiss)
 * - Immediate help visible
 * - Low friction opt-in
 */
export const SafetyModal: React.FC<SafetyModalProps> = ({
  isOpen,
  onClose,
  onOptIn,
  detectedLanguage,
  hotline,
}) => {
  const [step, setStep] = useState<'resources' | 'opt-in' | 'confirm'>('resources');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<SafetyNetData>({
    email: '',
    fullName: '',
    emergencyContact: '',
    language: detectedLanguage,
    country: '',
  });
  const [error, setError] = useState<string | null>(null);

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('resources');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOptInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await onOptIn(formData);
      setStep('confirm');
    } catch (err: any) {
      setError(err.message || 'Failed to register. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    // Log dismissal (anonymized)
    if ((window as any).analytics) {
      (window as any).analytics.track('crisis_modal_dismissed', {
        language: detectedLanguage,
        timestamp: new Date().toISOString(),
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        role="dialog"
        aria-labelledby="safety-modal-title"
        aria-describedby="safety-modal-description"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-4">
          <h2 id="safety-modal-title" className="text-xl font-bold text-white">
            You're not alone
          </h2>
          <p className="text-teal-100 text-sm mt-1">
            We're here to help you find support
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'resources' && (
            <div id="safety-modal-description">
              <p className="text-gray-700 mb-4">
                It sounds like you're going through something difficult.
                Free, confidential support is available right now.
              </p>

              {/* Hotline Card */}
              {hotline && (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-teal-900 mb-2">
                    {hotline.name}
                  </h3>
                  <div className="space-y-2 text-sm text-teal-800">
                    <p className="flex items-center gap-2">
                      <span className="text-lg">📞</span>
                      <a
                        href={`tel:${hotline.phone}`}
                        className="hover:text-teal-600 underline font-medium"
                      >
                        {hotline.phone}
                      </a>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="text-lg">🌐</span>
                      <a
                        href={hotline.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-teal-600 underline"
                      >
                        {hotline.website.replace('https://', '')}
                      </a>
                    </p>
                    {hotline.availability && (
                      <p className="flex items-center gap-2">
                        <span className="text-lg">🕐</span>
                        {hotline.availability}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => setStep('opt-in')}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Set Up Safety Net (Optional)
                </button>
                <button
                  onClick={handleDismiss}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  I'm okay, dismiss this
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-4 text-center">
                This won't appear again during this session.
              </p>
            </div>
          )}

          {step === 'opt-in' && (
            <div>
              <p className="text-gray-700 mb-4">
                <strong>Safety Net</strong> is optional. If you choose to share your contact info,
                we can connect you with support resources if needed. Your information is:
              </p>

              <ul className="text-sm text-gray-600 mb-4 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-teal-500">✓</span>
                  Encrypted and stored securely
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-500">✓</span>
                  Automatically deleted after 30 days
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-500">✓</span>
                  Never shared with third parties
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-500">✓</span>
                  You can remove it anytime
                </li>
              </ul>

              <form onSubmit={handleOptInSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email {formData.fullName ? '' : '(required)'}
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="you@example.com"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name {formData.email ? '' : '(required)'}
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Your name"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact (optional)
                  </label>
                  <input
                    type="text"
                    id="emergencyContact"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Trusted friend, family, or counselor"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    We'll only contact them if you explicitly request it.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <button
                    type="submit"
                    disabled={isLoading || (!formData.email && !formData.fullName)}
                    className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Register Safety Net'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('resources')}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                    disabled={isLoading}
                  >
                    Back
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 'confirm' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Safety Net Registered
              </h3>

              <p className="text-gray-600 mb-6">
                Thank you for trusting us. Your information will be kept secure and
                automatically deleted after 30 days. You can remove it anytime from
                your profile settings.
              </p>

              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-teal-800 mb-2">
                  <strong>Remember:</strong> Professional support is always available:
                </p>
                {hotline && (
                  <p className="text-teal-700 font-medium">
                    {hotline.name}: {hotline.phone}
                  </p>
                )}
              </div>

              <button
                onClick={handleDismiss}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Continue Chat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SafetyModal;
