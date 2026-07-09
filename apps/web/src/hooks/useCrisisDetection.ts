import { useState, useCallback, useEffect } from 'react';

/**
 * Crisis keywords by language (mirrors server-side crisis-detection.ts)
 * Keep this synchronized with the server-side list.
 */
const CRISIS_KEYWORDS: Record<string, string[]> = {
  en: [
    'suicide', 'suicidal', 'self-harm', 'self harm', 'kill myself',
    'end my life', 'want to die', 'hurt myself', 'self-injur',
    'overdose', 'hang myself',
  ],
  zh: ['自杀', '自杀倾向', '自残', '我想死', '想自杀', '结束生命', '不想活了', '轻生', '寻死', '自尽'],
  hi: ['आत्महत्या', 'खुद को नुकसान', 'खुदको चोट', 'मरना चाहता', 'मरना चाहती', 'जीवन समाप्त', 'जीने का कोई कारण नहीं', 'खुद को मार'],
  es: [
    'suicidio', 'suicida', 'autolesion', 'auto lesión', 'matarme',
    'terminar con mi vida', 'quiero morir', 'herir myself', 'no quiero vivir',
  ],
  ar: ['انتحار', 'أنتحر', 'الانتحار', 'ايذاء النفس', 'إيذاء النفس', 'أريد أن أموت', 'اريد الموت', 'انهاء حياتي', 'إنهاء حياتي'],
  fr: [
    'suicide', 'suicidaire', 'automutilation', 'auto-mutilation', 'me tuer',
    'me suicider', 'finir ma vie', 'envie de mourir', 'me faire du mal', 'se donner la mort',
  ],
  bn: ['আত্মহত্যা', 'খুন করা', 'মরে যেতে চাই', 'জীবন শেষ', 'বাঁচতে চাই না', 'নিজে কে কাটা', 'আত্মহত্যা করা', 'মৃত্যু কামনা'],
  pt: [
    'suicídio', 'suicida', 'auto-mutilação', 'automutilação', 'me matar',
    'terminar minha vida', 'quero morrer', 'me machucar', 'não quero viver', 'tirar minha vida',
  ],
  ru: [
    'суицид', 'самоубийств', 'самоубийство', 'покончить с собой', 'хочу умереть',
    'хочу смерти', 'навредить себе', 'самоповреждение', 'жизнь не имеет смысла', 'не хочу жить', 'свести счеты с жизнью',
  ],
  ur: ['خودکشی', 'خود کشی', 'خود کو نقصان', 'مرنا چاہتا', 'مرنا چاہتی', 'زندگی ختم', 'نہیں جینا چاہتا', 'خود کو مار', 'جان دینا'],
};

/**
 * Negative context patterns that indicate false positives
 * These suggest the user is discussing crisis topics academically or hypothetically
 */
const NEGATIVE_CONTEXT_PATTERNS = [
  /\bsuicide prevention\b/i,
  /\bsuicide awareness\b/i,
  /\bstudying suicide\b/i,
  /\bresearch on suicide\b/i,
  /\bsuicide rate\b/i,
  /\bsuicide statistics\b/i,
  /\barticle about\b/i,
  /\bnews article\b/i,
  /\bmovie about\b/i,
  /\bbook about\b/i,
  /\bwriting a paper\b/i,
  /\bfor my class\b/i,
  /\bhomework about\b/i,
  /\bsuicide bomber\b/i, // Completely different context
];

/**
 * Crisis hotline resources by language (mirrors server-side)
 */
const CRISIS_HOTLINES: Record<string, { name: string; phone: string; website: string; availability: string }> = {
  en: {
    name: '988 Suicide & Crisis Lifeline',
    phone: '988 (call/text)',
    website: 'https://988lifeline.org',
    availability: '24/7, free, confidential',
  },
  zh: {
    name: 'Beijing Suicide Research and Prevention Center',
    phone: '800-810-1117',
    website: 'https://crisis.org.cn',
    availability: '24/7',
  },
  hi: {
    name: 'AASRA',
    phone: '+91-22-27546669',
    website: 'https://aasra.info',
    availability: '24x7, India',
  },
  es: {
    name: 'Teléfono de la Esperanza',
    phone: '+34 717 003 717',
    website: 'https://telefonodelaesperanza.org',
    availability: 'Spain',
  },
  ar: {
    name: 'National Mental Support Line',
    phone: '800 4673 (UAE) / 800 122 2777 (Saudi)',
    website: 'https://icarewellbeing.com',
    availability: '',
  },
  fr: {
    name: 'SOS Amitié',
    phone: '09 72 39 40 50',
    website: 'https://sosamitie.org',
    availability: '24/7, France',
  },
  bn: {
    name: 'Kaan Pete Roi',
    phone: '01779554391',
    website: 'https://kaanpeteroi.org',
    availability: '24/7, Bangladesh',
  },
  pt: {
    name: 'SOS Voz Amiga',
    phone: '+351 213 544 545',
    website: 'https://sosvozamiga.org',
    availability: 'Portugal',
  },
  ru: {
    name: 'EMERCOM of Russia',
    phone: '+7 495 400 99 99',
    website: 'https://emercor.gov.ru',
    availability: '24/7',
  },
  ur: {
    name: 'Umang Helpline',
    phone: '0311-7786264',
    website: 'https://umanghelpline.com',
    availability: '24/7, Pakistan',
  },
};

export interface CrisisDetectionResult {
  isCrisis: boolean;
  language: string | null;
  keywords: string[];
  isFalsePositive: boolean;
  hotline: typeof CRISIS_HOTLINES[string] | null;
}

export interface UseCrisisDetectionOptions {
  enabled?: boolean;
  onCrisisDetected?: (result: CrisisDetectionResult) => void;
  sessionId?: string;
}

/**
 * Detect language based on character sets and keywords
 */
function detectLanguage(text: string): string | null {
  const hasChineseChar = /[一-鿿]/.test(text);
  const hasArabicChar = /[؀-ۿ]/.test(text);
  const hasCyrillicChar = /[Ѐ-ӿ]/.test(text);
  const hasHindiChar = /[ऀ-ॿ]/.test(text);
  const hasBengaliChar = /[ঀ-৿]/.test(text);
  const hasUrduChar = /[؀-ۿݐ-ݿ]/.test(text);

  if (hasChineseChar) return 'zh';
  if (hasArabicChar) return 'ar';
  if (hasCyrillicChar) return 'ru';
  if (hasHindiChar) return 'hi';
  if (hasBengaliChar) return 'bn';
  if (hasUrduChar) return 'ur';

  // Spanish indicators
  if (/\b(suicidio|suicida|matarme|morir)\b/i.test(text)) return 'es';

  // Portuguese indicators
  if (/\b(suicídio|suicida|matar|morrer)\b/i.test(text)) return 'pt';

  // French indicators
  if (/\b(suicide|mourir|tuer)\b/i.test(text)) return 'fr';

  // Default to English for Latin script
  return 'en';
}

/**
 * Check if text matches false positive patterns
 */
function isFalsePositive(text: string): boolean {
  return NEGATIVE_CONTEXT_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Find matching crisis keywords in text
 */
function findKeywords(text: string, language: string): string[] {
  const keywords = CRISIS_KEYWORDS[language] || CRISIS_KEYWORDS.en;
  const textLower = text.toLowerCase();
  return keywords.filter(kw => textLower.includes(kw.toLowerCase()));
}

/**
 * Get hotline for language
 */
function getHotline(language: string): typeof CRISIS_HOTLINES[string] | null {
  return CRISIS_HOTLINES[language] || CRISIS_HOTLINES.en || null;
}

/**
 * useCrisisDetection Hook
 *
 * Client-side crisis keyword detection with:
 * - Multilingual support (10 languages)
 * - Contextual filtering to reduce false positives
 * - Language-specific hotline resources
 * - Privacy-first (detection happens in browser)
 *
 * @example
 * ```tsx
 * const { checkMessage, hasOptedIn, showSafetyModal } = useCrisisDetection({
 *   onCrisisDetected: (result) => {
 *     setShowSafetyModal(true);
 *     setHotline(result.hotline);
 *   }
 * });
 *
 * // In your send handler:
 * const handleSend = (message: string) => {
 *   checkMessage(message);
 *   // ... send to API
 * };
 * ```
 */
export function useCrisisDetection(options: UseCrisisDetectionOptions = {}) {
  const { enabled = true, onCrisisDetected } = options;

  const [hasOptedIn, setHasOptedIn] = useState(false);
  const [optInData, setOptInData] = useState<{
    language: string;
    expiresAt: string;
    hotline: any;
  } | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState(0);
  const [dismissedSession, setDismissedSession] = useState(false);

  // Check if user has opted into Safety Net on mount
  useEffect(() => {
    if (!enabled) return;

    const checkOptInStatus = async () => {
      try {
        const response = await fetch('/api/crisis/opt-in', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data?.isOptedIn) {
            setHasOptedIn(true);
            setOptInData(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to check crisis opt-in status:', error);
      }
    };

    checkOptInStatus();
  }, [enabled]);

  /**
   * Check a message for crisis keywords
   * Returns CrisisDetectionResult and triggers callback if crisis detected
   */
  const checkMessage = useCallback(
    (message: string): CrisisDetectionResult | null => {
      if (!enabled) return null;

      // Rate limit: max once per 30 seconds per session
      const now = Date.now();
      if (now - lastCheckTime < 30000) {
        return null;
      }

      // If user dismissed modal this session, don't show again
      if (dismissedSession) {
        return null;
      }

      // Detect language
      const language = detectLanguage(message);
      if (!language) {
        return null;
      }

      // Find keywords
      const keywords = findKeywords(message, language);
      if (keywords.length === 0) {
        return null;
      }

      // Check for false positives
      const isFP = isFalsePositive(message);
      if (isFP) {
        console.log('Crisis detection: false positive filtered', { language, keywords });
        return {
          isCrisis: false,
          language,
          keywords,
          isFalsePositive: true,
          hotline: getHotline(language),
        };
      }

      // Crisis detected!
      setLastCheckTime(now);

      const result: CrisisDetectionResult = {
        isCrisis: true,
        language,
        keywords,
        isFalsePositive: false,
        hotline: getHotline(language),
      };

      // Trigger callback
      onCrisisDetected?.(result);

      // Record trigger on server (if authenticated)
      fetch('/api/crisis/trigger', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language,
          detectedKeywords: keywords,
        }),
      }).catch(err => console.error('Failed to record crisis trigger:', err));

      return result;
    },
    [enabled, lastCheckTime, dismissedSession, onCrisisDetected]
  );

  /**
   * Register user for Safety Net
   */
  const registerSafetyNet = useCallback(
    async (data: {
      email: string;
      fullName: string;
      emergencyContact?: string;
      country?: string;
    }) => {
      const response = await fetch('/api/crisis/opt-in', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          language: optInData?.language || 'en',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to register Safety Net');
      }

      const result = await response.json();
      setHasOptedIn(true);
      setOptInData(result.data);

      // Track analytics
      if ((window as any).analytics) {
        (window as any).analytics.track('crisis_safety_net_registered', {
          language: result.data.language,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [optInData]
  );

  /**
   * Remove Safety Net registration
   */
  const removeSafetyNet = useCallback(async () => {
    const response = await fetch('/api/crisis/opt-in', {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to remove Safety Net');
    }

    setHasOptedIn(false);
    setOptInData(null);

    if ((window as any).analytics) {
      (window as any).analytics.track('crisis_safety_net_removed', {
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  /**
   * Mark modal as dismissed for this session
   */
  const dismissModal = useCallback(() => {
    setDismissedSession(true);
  }, []);

  /**
   * Reset dismissed state (call when session ends)
   */
  const resetDismissed = useCallback(() => {
    setDismissedSession(false);
  }, []);

  return {
    // Methods
    checkMessage,
    registerSafetyNet,
    removeSafetyNet,
    dismissModal,
    resetDismissed,

    // State
    hasOptedIn,
    optInData,
    dismissedSession,

    // Hotline for current language
    getHotline: (language: string) => getHotline(language),
  };
}

export default useCrisisDetection;
