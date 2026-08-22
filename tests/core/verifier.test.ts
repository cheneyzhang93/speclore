/**
 * Tests for core/verifier — mapping resolver.
 */

import { describe, it, expect } from 'vitest';
import { resolveMappings } from '../../src/core/verifier/mapping-resolver.js';
import type { FeatureFile } from '../../src/types/index.js';

describe('resolveMappings', () => {
  it('should be a function', () => {
    expect(typeof resolveMappings).toBe('function');
  });

  it('should return unmapped for scenarios with no mapping', () => {
    const features: FeatureFile[] = [{
      path: 'specs/test.feature',
      featureName: 'Test',
      scenarios: [{
        name: 'Unknown scenario',
        givens: [], whens: [], thens: [], tags: [],
      }],
      tags: [],
      confidence: 1.0,
      needsReview: [],
    }];

    const results = resolveMappings(process.cwd(), features, '');
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(1);
    expect(results[0].status).toBe('unmapped');
  });

  it('should return empty array for empty features list', () => {
    const results = resolveMappings(process.cwd(), [], '');
    expect(results).toEqual([]);
  });

  it('should handle multiple scenarios in one feature', () => {
    const features: FeatureFile[] = [{
      path: 'specs/multi.feature',
      featureName: 'Multi Scenario',
      scenarios: [
        { name: 'Scenario A', givens: [], whens: [], thens: [], tags: [] },
        { name: 'Scenario B', givens: [], whens: [], thens: [], tags: [] },
        { name: 'Scenario C', givens: [], whens: [], thens: [], tags: [] },
      ],
      tags: [],
      confidence: 1.0,
      needsReview: [],
    }];

    const results = resolveMappings(process.cwd(), features, '');
    expect(results).toHaveLength(3);
    expect(results.every(r => r.status === 'unmapped')).toBe(true);
  });

  it('should handle multiple features', () => {
    const features: FeatureFile[] = [
      {
        path: 'specs/a.feature', featureName: 'A',
        scenarios: [{ name: 'A1', givens: [], whens: [], thens: [], tags: [] }],
        tags: [], confidence: 1.0, needsReview: [],
      },
      {
        path: 'specs/b.feature', featureName: 'B',
        scenarios: [{ name: 'B1', givens: [], whens: [], thens: [], tags: [] }],
        tags: [], confidence: 1.0, needsReview: [],
      },
    ];

    const results = resolveMappings(process.cwd(), features, '');
    expect(results).toHaveLength(2);
  });

  it('should include scenario name in result', () => {
    const features: FeatureFile[] = [{
      path: 'specs/test.feature',
      featureName: 'Test',
      scenarios: [{ name: 'My specific scenario', givens: [], whens: [], thens: [], tags: [] }],
      tags: [],
      confidence: 1.0,
      needsReview: [],
    }];

    const results = resolveMappings(process.cwd(), features, '');
    expect(results[0].name).toBe('My specific scenario');
    expect(results[0].mappingSource).toBe('none');
  });

  it('should handle feature with zero scenarios', () => {
    const features: FeatureFile[] = [{
      path: 'specs/empty.feature',
      featureName: 'Empty',
      scenarios: [],
      tags: [],
      confidence: 1.0,
      needsReview: [],
    }];

    const results = resolveMappings(process.cwd(), features, '');
    expect(results).toHaveLength(0);
  });
});
