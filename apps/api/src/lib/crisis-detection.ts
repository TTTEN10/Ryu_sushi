/**
 * Crisis signal detection for multilingual content (EN/FR/RU).
 * Ported from the former FastAPI chatbot service (removed May 2026).
 */

const CRISIS_KEYWORDS = [
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
  'me suicider',
  'me tuer',
  'finir ma vie',
  'envie de mourir',
  'auto-mutilation',
  'automutilation',
  'суицид',
  'самоубийств',
  'покончить с собой',
  'хочу умереть',
  'навредить себе',
] as const;

const CRISIS_PREPEND =
  "I'm really glad you shared this… you don't have to go through this alone…\n\n";

export interface CrisisDetectionResult {
  isCrisis: boolean;
  prependText: string;
}

/**
 * Detect crisis signals in text (EN/FR/RU keyword scan).
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
