import { describe, it, expect } from 'vitest';
import {
  detectCrisisSignals,
  detectCrisisInMessages,
  CRISIS_PREPEND_TEXT,
} from '../crisis-detection';

describe('detectCrisisSignals', () => {
  it('detects English crisis keywords', () => {
    expect(detectCrisisSignals('I want to kill myself')).toBe(true);
    expect(detectCrisisSignals("I'm suicidal")).toBe(true);
    expect(detectCrisisSignals('I want to end my life')).toBe(true);
  });

  it('detects French crisis keywords', () => {
    expect(detectCrisisSignals('Je veux me suicider')).toBe(true);
    expect(detectCrisisSignals('Envie de mourir')).toBe(true);
  });

  it('detects Russian crisis keywords', () => {
    expect(detectCrisisSignals('Я хочу покончить с собой')).toBe(true);
    expect(detectCrisisSignals('суицид')).toBe(true);
  });

  it('returns false for normal text', () => {
    expect(detectCrisisSignals("I'm feeling sad today")).toBe(false);
    expect(detectCrisisSignals('')).toBe(false);
    expect(detectCrisisSignals('   ')).toBe(false);
  });
});

describe('detectCrisisInMessages', () => {
  it('detects crisis in the current user turn', () => {
    const result = detectCrisisInMessages([
      { role: 'user', content: 'I want to hurt myself' },
    ]);
    expect(result.isCrisis).toBe(true);
    expect(result.prependText).toBe(CRISIS_PREPEND_TEXT);
  });

  it('ignores assistant messages', () => {
    const result = detectCrisisInMessages([
      { role: 'assistant', content: 'Have you thought about suicide?' },
    ]);
    expect(result.isCrisis).toBe(false);
    expect(result.prependText).toBe('');
  });

  it('does NOT re-trigger on a normal follow-up after a prior crisis turn', () => {
    // Regression: a prior turn containing a crisis keyword must not
    // make every subsequent unrelated message trigger the crisis prepend.
    const result = detectCrisisInMessages([
      { role: 'user', content: 'I keep thinking about suicide' },
      { role: 'assistant', content: 'I hear you. You are not alone…' },
      { role: 'user', content: 'what should I do with my depression' },
    ]);
    expect(result.isCrisis).toBe(false);
    expect(result.prependText).toBe('');
  });

  it('re-triggers when the latest user turn itself contains a crisis keyword', () => {
    const result = detectCrisisInMessages([
      { role: 'user', content: 'I feel low today' },
      { role: 'assistant', content: 'Tell me more.' },
      { role: 'user', content: 'sometimes I want to end my life' },
    ]);
    expect(result.isCrisis).toBe(true);
    expect(result.prependText).toBe(CRISIS_PREPEND_TEXT);
  });

  it('handles an empty message array without throwing', () => {
    const result = detectCrisisInMessages([]);
    expect(result.isCrisis).toBe(false);
    expect(result.prependText).toBe('');
  });
});
