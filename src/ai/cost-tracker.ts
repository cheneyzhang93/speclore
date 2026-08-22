/**
 * Cost tracker — tracks token usage and estimated costs across AI provider calls.
 *
 * Supports budget limits and per-model pricing for OpenAI and Anthropic.
 *
 * @module ai/cost-tracker
 */

import { logger } from '../infra/logger.js';

/** Per-model pricing in USD per 1K tokens (input/output) */
const MODEL_PRICING: Record<string, { inputPer1K: number; outputPer1K: number }> = {
  // OpenAI models
  'gpt-4': { inputPer1K: 0.03, outputPer1K: 0.06 },
  'gpt-4-turbo': { inputPer1K: 0.01, outputPer1K: 0.03 },
  'gpt-4o': { inputPer1K: 0.005, outputPer1K: 0.015 },
  'gpt-4o-mini': { inputPer1K: 0.00015, outputPer1K: 0.0006 },
  'gpt-3.5-turbo': { inputPer1K: 0.0005, outputPer1K: 0.0015 },
  // Anthropic models
  'claude-3-5-sonnet-20241022': { inputPer1K: 0.003, outputPer1K: 0.015 },
  'claude-3-5-haiku-20241022': { inputPer1K: 0.001, outputPer1K: 0.005 },
  'claude-3-opus-20240229': { inputPer1K: 0.015, outputPer1K: 0.075 },
};

/** Single usage record */
export interface UsageRecord {
  timestamp: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

/** Aggregated usage summary */
export interface UsageSummary {
  totalCalls: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  byModel: Record<string, { calls: number; tokens: number; costUsd: number }>;
}

/**
 * Tracks AI API usage and costs.
 */
export class CostTracker {
  private records: UsageRecord[] = [];
  private maxBudgetUsd: number;

  constructor(maxBudgetUsd?: number) {
    this.maxBudgetUsd = maxBudgetUsd ?? Infinity;
  }

  /**
   * Record a single API call's token usage.
   * Returns the estimated cost in USD.
   */
  recordUsage(model: string, promptTokens: number, completionTokens: number): number {
    const cost = this.estimateCost(model, promptTokens, completionTokens);

    const currentTotal = this.records.reduce((sum, r) => sum + r.estimatedCostUsd, 0);
    if (currentTotal + cost > this.maxBudgetUsd) {
      throw new Error(
        `Budget exceeded: $${(currentTotal + cost).toFixed(4)} would exceed limit of $${this.maxBudgetUsd.toFixed(2)}. ` +
        `Current spend: $${currentTotal.toFixed(4)}.`,
      );
    }

    this.records.push({
      timestamp: new Date().toISOString(),
      model,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      estimatedCostUsd: cost,
    });

    logger.debug(`AI usage: ${model} — ${promptTokens}+${completionTokens} tokens, ~$${cost.toFixed(4)}`);
    return cost;
  }

  /**
   * Estimate cost for a given model and token counts.
   */
  estimateCost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = MODEL_PRICING[model];
    if (!pricing) {
      // Unknown model — return 0 (can't estimate)
      logger.debug(`No pricing data for model: ${model}`);
      return 0;
    }

    const inputCost = (promptTokens / 1000) * pricing.inputPer1K;
    const outputCost = (completionTokens / 1000) * pricing.outputPer1K;
    return inputCost + outputCost;
  }

  /**
   * Get aggregated usage summary.
   */
  getUsageSummary(): UsageSummary {
    const summary: UsageSummary = {
      totalCalls: this.records.length,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      totalCostUsd: 0,
      byModel: {},
    };

    for (const record of this.records) {
      summary.totalPromptTokens += record.promptTokens;
      summary.totalCompletionTokens += record.completionTokens;
      summary.totalTokens += record.totalTokens;
      summary.totalCostUsd += record.estimatedCostUsd;

      if (!summary.byModel[record.model]) {
        summary.byModel[record.model] = { calls: 0, tokens: 0, costUsd: 0 };
      }
      const modelStats = summary.byModel[record.model]!;
      modelStats.calls++;
      modelStats.tokens += record.totalTokens;
      modelStats.costUsd += record.estimatedCostUsd;
    }

    return summary;
  }

  /**
   * Get all usage records.
   */
  getRecords(): UsageRecord[] {
    return [...this.records];
  }

  /**
   * Reset all tracking data.
   */
  reset(): void {
    this.records = [];
  }

  /**
   * Get the configured budget limit.
   */
  getBudgetLimit(): number {
    return this.maxBudgetUsd;
  }
}

/** Global cost tracker singleton */
let _tracker: CostTracker | null = null;

/** Get or create the global cost tracker */
export function getCostTracker(maxBudgetUsd?: number): CostTracker {
  if (!_tracker) {
    _tracker = new CostTracker(maxBudgetUsd);
  }
  return _tracker;
}

/** Reset the global tracker (for testing) */
export function resetCostTracker(): void {
  _tracker = null;
}
