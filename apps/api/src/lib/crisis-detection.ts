/**
 * Crisis signal detection for multilingual content (10 languages).
 * Ported from the former FastAPI chatbot service.
 */

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
  "I'm really glad you shared this… you don't have to go through this alone…\n\n";

export interface CrisisDetectionResult {
  isCrisis: boolean;
  prependText: string;
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
 * Check all user messages for crisis signals.
 */
export function detectCrisisInMessages(
  messages: Array<{ role: string; content: string }>
): CrisisDetectionResult {
  const userText = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join('\n');

  const isCrisis = detectCrisisSignals(userText);

  return {
    isCrisis,
    prependText: isCrisis ? CRISIS_PREPEND : '',
  };
}

export const CRISIS_PREPEND_TEXT = CRISIS_PREPEND;
