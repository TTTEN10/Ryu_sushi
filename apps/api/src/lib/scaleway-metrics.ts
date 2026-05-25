/**
 * Scaleway Generative API usage metrics and cost estimates.
 */

import logger from './logger';

const PRICING = {
  'mistral-small-3.2-24b-instruct-2506': {
    inputPerMillion: 0.2,
    outputPerMillion: 0.6,
  },
  'mistral-8x7b-instruct': {
    inputPerMillion: 0.5,
    outputPerMillion: 1.5,
  },
  'llama-3-70b-instruct': {
    inputPerMillion: 1.0,
    outputPerMillion: 3.0,
  },
  'llama-3-8b-instruct': {
    inputPerMillion: 0.1,
    outputPerMillion: 0.3,
  },
} as const;

export interface ScalewayUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  timestamp: Date;
}

export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = PRICING[model as keyof typeof PRICING];
  if (!pricing) {
    logger.warn('Unknown model for pricing', { model });
    return (promptTokens / 1_000_000) * 0.2 + (completionTokens / 1_000_000) * 0.6;
  }

  const inputCost = (promptTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (completionTokens / 1_000_000) * pricing.outputPerMillion;
  return inputCost + outputCost;
}

export function logScalewayUsage(usage: ScalewayUsage): void {
  logger.info('Scaleway API usage', {
    model: usage.model,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    estimatedCost: usage.estimatedCost.toFixed(6),
    timestamp: usage.timestamp.toISOString(),
  });
}

export function createUsageRecord(
  model: string,
  promptTokens: number,
  completionTokens: number
): ScalewayUsage {
  return {
    model,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    estimatedCost: calculateCost(model, promptTokens, completionTokens),
    timestamp: new Date(),
  };
}
