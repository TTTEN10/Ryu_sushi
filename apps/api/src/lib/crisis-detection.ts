/**
 * Crisis signal detection for multilingual content (10 languages).
 * Ported from the former FastAPI chatbot service.
 */

/**
 * Crisis helpline resources by language/region.
 * Display these resources when a crisis is detected.
 */
export const CRISIS_RESOURCES = {
  en: {
    name: '988 Suicide & Crisis Lifeline',
    phone: '988 (call/text)',
    website: '988lifeline.org',
    availability: '24/7, free, confidential',
  },
  zh: {
    name: 'Beijing Suicide Research and Prevention Center',
    phone: '800-810-1117',
    website: 'crisis.org.cn',
    availability: '24/7',
  },
  hi: {
    name: 'AASRA',
    phone: '+91-22-27546669',
    website: 'aasra.info',
    availability: '24x7, India',
  },
  es: {
    name: 'Teléfono de la Esperanza',
    phone: '+34 717 003 717',
    website: 'telefonodelaesperanza.org',
    availability: 'Spain',
  },
  ar: {
    name: 'National Mental Support Line',
    phone: '800 4673 (UAE) / 800 122 2777 (Saudi)',
    website: 'icarewellbeing.com',
    availability: '',
  },
  fr: {
    name: 'SOS Amitié',
    phone: '09 72 39 40 50',
    website: 'sosamitie.org',
    availability: '24/7, France',
  },
  bn: {
    name: 'Kaan Pete Roi',
    phone: '01779554391, 01779554392 (Grameenphone) / 01688709965, 01688709966 (Airtel)',
    website: 'kaanpeteroi.org',
    availability: '24/7, Bangladesh',
  },
  pt: {
    name: 'SOS Voz Amiga',
    phone: '+351 213 544 545 / 21 354 45 45',
    website: 'sosvozamiga.org',
    availability: 'Portugal',
  },
  ru: {
    name: 'EMERCOM of Russia',
    phone: '112 (emergency) / +7 495 400 99 99',
    website: 'emercor.gov.ru',
    availability: '24/7',
  },
  ur: {
    name: 'Umang Helpline',
    phone: '0311-7786264',
    website: 'umanghelpline.com',
    availability: '24/7, Pakistan',
  },
} as const;

const CRISIS_KEYWORDS = [
  // === ENGLISH (1.5B speakers) ===
  'suicide',
  'suicidal',
  'self-harm',
  'self harm',
  'kill myself',
  'end my life',
  'want to die',
  'hurt myself',
  'self-injur',
  'overdose',
  'hang myself',

  // === MANDARIN CHINESE (1.1B speakers) ===
  '自杀',
  '自杀倾向',
  '自残',
  '我想死',
  '想自杀',
  '结束生命',
  '不想活了',
  '轻生',
  '寻死',
  '自尽',

  // === HINDI (610M speakers) ===
  'आत्महत्या',
  'खुद को नुकसान',
  'खुदको चोट',
  'मरना चाहता',
  'मरना चाहती',
  'जीवन समाप्त',
  'जीने का कोई कारण नहीं',
  'खुद को मार',

  // === SPANISH (560M speakers) ===
  'suicidio',
  'suicida',
  'autolesion',
  'auto lesión',
  'matarme',
  'matar myself',
  'terminar con mi vida',
  'quiero morir',
  'herir myself',
  'no quiero vivir',

  // === ARABIC (335M speakers) ===
  'انتحار',
  'أنتحر',
  'الانتحار',
  'ايذاء النفس',
  'إيذاء النفس',
  'أريد أن أموت',
  'اريد الموت',
  'انهاء حياتي',
  'إنهاء حياتي',

  // === FRENCH (330M speakers) ===
  'suicide',
  'suicidaire',
  'automutilation',
  'auto-mutilation',
  'me tuer',
  'me suicider',
  'finir ma vie',
  'envie de mourir',
  'me faire du mal',
  'se donner la mort',

  // === BENGALI (275M speakers) ===
  'আত্মহত্যা',
  'খুন করা',
  'মরে যেতে চাই',
  'জীবন শেষ',
  'বাঁচতে চাই না',
  'নিজে কে কাটা',
  'আত্মহত্যা করা',
  'মৃত্যু কামনা',

  // === PORTUGUESE (265M speakers) ===
  'suicídio',
  'suicida',
  'auto-mutilação',
  'automutilação',
  'me matar',
  'terminar minha vida',
  'quero morrer',
  'me machucar',
  'não quero viver',
  'tirar minha vida',

  // === RUSSIAN (255M speakers) ===
  'суицид',
  'самоубийств',
  'самоубийство',
  'покончить с собой',
  'хочу умереть',
  'хочу смерти',
  'навредить себе',
  'самоповреждение',
  'жизнь не имеет смысла',
  'не хочу жить',
  'свести счеты с жизнью',

  // === URDU (230M speakers) - added for South Asian coverage ===
  'خودکشی',
  'خود کشی',
  'خود کو نقصان',
  'مرنا چاہتا',
  'مرنا چاہتی',
  'زندگی ختم',
  'نہیں جینا چاہتا',
  'خود کو مار',
  'جان دینا',
] as const;

const CRISIS_PREPEND =
  "Thank you for sharing… you don't have to go through this alone…\n\n";

export interface CrisisDetectionResult {
  isCrisis: boolean;
  prependText: string;
  resources?: typeof CRISIS_RESOURCES[keyof typeof CRISIS_RESOURCES];
}

/**
 * Detect crisis signals in text (multilingual keyword scan).
 * Not a substitute for professional triage.
 */
export function detectCrisisSignals(text: string): boolean {
  if (!text || !text.trim()) {
    return false;
  }
  const lowered = text.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => lowered.includes(kw));
}

/**
 * Detect the language of the text based on crisis keywords found.
 * Returns the language code for the matching crisis resources.
 */
function detectLanguage(text: string): keyof typeof CRISIS_RESOURCES {
  const lowered = text.toLowerCase();

  // Check each language's keywords to find the best match
  const languageKeywords: Record<string, string[]> = {
    en: ['suicide', 'suicidal', 'self-harm', 'self harm', 'kill myself', 'end my life', "want to die", 'hurt myself', 'self-injur', 'overdose', 'hang myself'],
    zh: ['自杀', '自杀倾向', '自残', '我想死', '想自杀', '结束生命', '不想活了', '轻生', '寻死', '自尽'],
    hi: ['आत्महत्या', 'खुद को नुकसान', 'खुदको चोट', 'मरना चाहता', 'मरना चाहती', 'जीवन समाप्त', 'जीने का कोई कारण नहीं', 'खुद को मार'],
    es: ['suicidio', 'suicida', 'autolesion', 'auto lesión', 'matarme', 'terminar con mi vida', 'quiero morir', 'herir myself', 'no quiero vivir'],
    ar: ['انتحار', 'أنتحر', 'الانتحار', 'ايذاء النفس', 'إيذاء النفس', 'أريد أن أموت', 'اريد الموت', 'انهاء حياتي', 'إنهاء حياتي'],
    fr: ['suicide', 'suicidaire', 'automutilation', 'auto-mutilation', 'me tuer', 'me suicider', 'finir ma vie', 'envie de mourir', 'me faire du mal', 'se donner la mort'],
    bn: ['আত্মহত্যা', 'খুন করা', 'মরে যেতে চাই', 'জীবন শেষ', "বাঁচতে চাই না", 'নিজে কে কাটা', 'আত্মহত্যা করা', 'মৃত্যু কামনা'],
    pt: ['suicídio', 'suicida', 'auto-mutilação', 'automutilação', 'me matar', 'terminar minha vida', 'quero morrer', 'me machucar', 'não quero viver', 'tirar minha vida'],
    ru: ['суицид', 'самоубийств', 'самоубийство', 'покончить с собой', 'хочу умереть', 'хочу смерти', 'навредить себе', 'самоповреждение', 'жизнь не имеет смысла', 'не хочу жить', 'свести счеты с жизнью'],
    ur: ['خودکشی', 'خود کشی', 'خود کو نقصان', 'مرنا چاہتا', 'مرنا چاہتی', 'زندگی ختم', 'نہیں جینا چاہتا', 'خود کو مار', 'جان دینا'],
  };

  for (const [lang, keywords] of Object.entries(languageKeywords)) {
    if (keywords.some(kw => lowered.includes(kw))) {
      return lang as keyof typeof CRISIS_RESOURCES;
    }
  }

  return 'en'; // Default to English
}

/**
 * Check the current user turn for crisis signals.
 *
 * Only the most recent user message is scanned. Scanning the full history
 * would re-trigger the crisis prepend on every subsequent turn once a crisis
 * keyword appeared anywhere in the thread, even for unrelated follow-ups
 * (e.g. an earlier "suicide" turn making a later "what should I do about my
 * depression" turn look like a crisis).
 */
export function detectCrisisInMessages(
  messages: Array<{ role: string; content: string }>
): CrisisDetectionResult {
  let latestUserContent = '';
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === 'user') {
      latestUserContent = m.content ?? '';
      break;
    }
  }

  const isCrisis = detectCrisisSignals(latestUserContent);
  const resources = isCrisis ? CRISIS_RESOURCES[detectLanguage(latestUserContent)] : undefined;

  return {
    isCrisis,
    prependText: isCrisis ? CRISIS_PREPEND : '',
    resources,
  };
}

export const CRISIS_PREPEND_TEXT = CRISIS_PREPEND;
