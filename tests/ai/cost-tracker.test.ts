/**
 * Cost tracker unit tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CostTracker } from '../../src/ai/cost-tracker.js';

describe('CostTracker', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker();
  });

  it('should record usage and return cost for known model', () => {
    const cost = tracker.recordUsage('gpt-4o', 1000, 500);
    // gpt-4o: input $0.005/1K, output $0.015/1K
    // cost = (1000/1000)*0.005 + (500/1000)*0.015 = 0.005 + 0.0075 = 0.0125
    expect(cost).toBeCloseTo(0.0125, 4);
    expect(tracker.getRecords()).toHaveLength(1);
  });

  it('should return 0 cost for unknown model', () => {
    const cost = tracker.estimateCost('unknown-model-v99', 1000, 500);
    expect(cost).toBe(0);
  });

  it('should throw when budget is exceeded', () => {
    const budgetTracker = new CostTracker(0.01);
    // First call within budget
    budgetTracker.recordUsage('gpt-4o', 500, 200);
    // Second call should exceed budget
    expect(() => budgetTracker.recordUsage('gpt-4o', 5000, 3000)).toThrow(/Budget exceeded/);
  });

  it('should aggregate usage summary across models', () => {
    tracker.recordUsage('gpt-4o', 1000, 500);
    tracker.recordUsage('gpt-4o', 2000, 1000);
    tracker.recordUsage('claude-3-5-sonnet-20241022', 500, 250);

    const summary = tracker.getUsageSummary();
    expect(summary.totalCalls).toBe(3);
    expect(summary.totalPromptTokens).toBe(3500);
    expect(summary.totalCompletionTokens).toBe(1750);
    expect(summary.totalTokens).toBe(5250);
    expect(summary.totalCostUsd).toBeGreaterThan(0);
    expect(Object.keys(summary.byModel)).toHaveLength(2);
    expect(summary.byModel['gpt-4o']!.calls).toBe(2);
    expect(summary.byModel['claude-3-5-sonnet-20241022']!.calls).toBe(1);
  });

  it('should reset all tracking data', () => {
    tracker.recordUsage('gpt-4o', 1000, 500);
    expect(tracker.getRecords()).toHaveLength(1);

    tracker.reset();
    expect(tracker.getRecords()).toHaveLength(0);
    expect(tracker.getUsageSummary().totalCalls).toBe(0);
  });

  it('should return budget limit', () => {
    const budgetTracker = new CostTracker(10);
    expect(budgetTracker.getBudgetLimit()).toBe(10);

    const unlimitedTracker = new CostTracker();
    expect(unlimitedTracker.getBudgetLimit()).toBe(Infinity);
  });
});
