/**
 * End-to-end pipeline integration tests.
 *
 * Tests the full flow: requirement → prompt → AI (mocked) → Gherkin parse → file write → read back.
 * Verifies that the generated .feature file is valid Gherkin per @cucumber/gherkin.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Parser, GherkinClassicTokenMatcher, AstBuilder } from '@cucumber/gherkin';
import { IdGenerator } from '@cucumber/messages';
import type { StructuredRequirement, ContextFile, SpecLoreConfig } from '../../src/types/index.js';

const TEST_DIR = join(process.cwd(), '.test-pipeline-integration');

// Shared mock data
const requirement: StructuredRequirement = {
  id: 'order/create',
  title: '创建订单',
  description: '用户可以创建新订单，包含商品信息和收货地址',
  acceptanceCriteria: ['创建成功返回订单ID', '地址为空时提示错误'],
  rawContent: '用户可以创建新订单',
  confidence: 0.9,
};

const context: ContextFile = {
  version: '1.0',
  generatedAt: new Date().toISOString(),
  generatedBy: 'speclore test',
  projectSummary: {
    language: 'typescript',
    framework: 'express',
    buildTool: 'npm',
    testFramework: 'vitest',
    directoryStructure: 'src/\n  order/',
  },
  moduleBoundaries: [
    {
      name: 'order',
      responsibility: 'Order management',
      publicApis: ['createOrder'],
      internalObjects: [],
      dependsOn: [],
    },
  ],
  existingCode: { entities: [], apis: [] },
  dependencyGraph: [],
};

const config: SpecLoreConfig = {
  project: {
    name: 'test-project',
    language: 'typescript',
    framework: 'express',
    profile: 'normal',
    modules: { order: { path: 'src/order', responsibility: 'Orders', dependsOn: [] } },
  },
  spec: { outputDir: 'specs', defaultLanguage: 'zh-CN', confidenceThreshold: 0.6 },
  verify: { command: 'npm test', timeout: 300, reportFormat: ['json', 'html'], mapping: { patterns: [] } },
};

// Valid Gherkin content that the mock AI will return
const VALID_GHERKIN = `Feature: 创建订单

  Scenario: 创建成功
    Given 用户已登录并有商品在购物车
    When 用户提交订单并填写收货地址
    Then 系统返回订单ID

  Scenario: 地址为空
    Given 用户已登录并有商品在购物车
    When 用户提交订单但未填写收货地址
    Then 系统提示地址不能为空`;

// Hoisted mocks for vi.mock
const { mockGenerate, mockIsAvailable } = vi.hoisted(() => ({
  mockGenerate: vi.fn(),
  mockIsAvailable: vi.fn(() => true),
}));

vi.mock('../../src/ai/provider.js', () => ({
  createProvider: vi.fn().mockImplementation(() =>
    Promise.resolve({
      name: 'test',
      isAvailable: mockIsAvailable,
      // Simulate real adapter behavior: record cost after generation
      generate: async (...args: unknown[]) => {
        const result = await mockGenerate(...args);
        if (result.usage) {
          const { getCostTracker } = await import('../../src/ai/cost-tracker.js');
          getCostTracker().recordUsage('test', result.usage.promptTokens, result.usage.completionTokens);
        }
        return result;
      },
    }),
  ),
}));

describe('end-to-end pipeline', () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, 'specs', 'order'), { recursive: true });
    mockGenerate.mockReset();
    mockIsAvailable.mockReset();
    mockIsAvailable.mockReturnValue(true);
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should generate a valid .feature file from text requirement', async () => {
    mockGenerate.mockResolvedValue({ content: VALID_GHERKIN });

    const { generateFeature } = await import('../../src/core/feature-generator/generator.js');
    const feature = await generateFeature(requirement, context, config, TEST_DIR);

    // 1. Feature file was created
    expect(feature.path).toBeTruthy();
    expect(existsSync(feature.path)).toBe(true);

    // 2. Read back and validate with official Gherkin parser
    const content = readFileSync(feature.path, 'utf-8');
    const parser = new Parser(new AstBuilder(IdGenerator.incrementing()), new GherkinClassicTokenMatcher());
    const doc = parser.parse(content);

    // 3. Verify structure
    expect(doc.feature).toBeDefined();
    expect(doc.feature!.name).toBe('创建订单');

    const scenarios = doc.feature!.children.filter(c => c.scenario);
    expect(scenarios.length).toBe(2);
    expect(scenarios[0].scenario!.name).toBe('创建成功');
    expect(scenarios[1].scenario!.name).toBe('地址为空');

    // 4. Verify steps
    const firstScenario = scenarios[0].scenario!;
    expect(firstScenario.steps.length).toBe(3);
    expect(firstScenario.steps[0].keyword.trim()).toBe('Given');
    expect(firstScenario.steps[1].keyword.trim()).toBe('When');
    expect(firstScenario.steps[2].keyword.trim()).toBe('Then');

    // 5. Verify our parsed result matches
    expect(feature.scenarios.length).toBe(2);
    expect(feature.featureName).toBe('创建订单');
  });

  it('should handle AI output with syntax errors via validation retry', async () => {
    // First call returns invalid Gherkin, second call returns valid
    mockGenerate
      .mockResolvedValueOnce({ content: 'This is not valid Gherkin at all' })
      .mockResolvedValueOnce({ content: VALID_GHERKIN });

    const { generateFeature } = await import('../../src/core/feature-generator/generator.js');
    const feature = await generateFeature(requirement, context, config, TEST_DIR);

    // Should have retried and succeeded
    expect(mockGenerate).toHaveBeenCalledTimes(2);
    expect(feature.scenarios.length).toBe(2);

    // Verify the written file is valid
    const content = readFileSync(feature.path, 'utf-8');
    const parser = new Parser(new AstBuilder(IdGenerator.incrementing()), new GherkinClassicTokenMatcher());
    const doc = parser.parse(content);
    expect(doc.feature).toBeDefined();
  });

  it('should flag needsReview after exhausting validation retries', async () => {
    // All calls return invalid Gherkin
    mockGenerate.mockResolvedValue({ content: 'Invalid content without Feature keyword' });

    const { generateFeature } = await import('../../src/core/feature-generator/generator.js');
    const feature = await generateFeature(requirement, context, config, TEST_DIR);

    // Should have tried 3 times (1 initial + 2 retries)
    expect(mockGenerate).toHaveBeenCalledTimes(3);
    // Should be flagged for review
    expect(feature.needsReview.length).toBeGreaterThan(0);
  });

  it('should record cost after successful generation', async () => {
    mockGenerate.mockResolvedValue({
      content: VALID_GHERKIN,
      usage: { promptTokens: 500, completionTokens: 200, totalTokens: 700 },
    });

    const { getCostTracker, resetCostTracker } = await import('../../src/ai/cost-tracker.js');
    resetCostTracker();

    const { generateFeature } = await import('../../src/core/feature-generator/generator.js');
    await generateFeature(requirement, context, config, TEST_DIR);

    const summary = getCostTracker().getUsageSummary();
    expect(summary.totalCalls).toBe(1);
    expect(summary.totalTokens).toBe(700);
  });
});
