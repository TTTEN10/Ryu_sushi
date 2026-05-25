import { describe, it, expect } from 'vitest';
import { detectCrisisSignals, detectCrisisInMessages } from '../crisis-detection';

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
  it('detects crisis in user messages', () => {
    const result = detectCrisisInMessages([
      { role: 'user', content: 'I want to hurt myself' },
    ]);
    expect(result.isCrisis).toBe(true);
    expect(result.prependText).toContain('glad you shared this');
  });

  it('ignores assistant messages', () => {
    const result = detectCrisisInMessages([
      { role: 'assistant', content: 'Have you thought about suicide?' },
    ]);
    expect(result.isCrisis).toBe(false);
  });
});
