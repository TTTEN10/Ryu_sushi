import { describe, it, expect } from 'vitest';
import { calculateCost, createUsageRecord } from '../scaleway-metrics';

describe('scaleway-metrics', () => {
  it('calculates cost for known model', () => {
    const cost = calculateCost('mistral-small-3.2-24b-instruct-2506', 1000, 500);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(0.01);
  });

  it('uses default pricing for unknown model', () => {
    const cost = calculateCost('unknown-model', 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(0.8, 5);
  });

  it('creates usage record with totals', () => {
    const usage = createUsageRecord('llama-3-8b-instruct', 100, 50);
    expect(usage.totalTokens).toBe(150);
    expect(usage.estimatedCost).toBeGreaterThanOrEqual(0);
    expect(usage.timestamp).toBeInstanceOf(Date);
  });
});
