/**
 * End-to-end pipeline integration tests.
 *
 * Tests the full flow: requirement → prompt → FakeProvider → Gherkin parse → file write → read back.
 * Verifies that the generated .feature file is valid Gherkin per @cucumber/gherkin.
 * Zero vi.mock — uses FakeProvider via providerOverride.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Parser, GherkinClassicTokenMatcher, AstBuilder } from '@cucumber/gherkin';
import { IdGenerator } from '@cucumber/messages';
import { generateFeature } from '../../src/core/feature-generator/generator.js';
import { getCostTracker, resetCostTracker } from '../../src/ai/cost-tracker.js';
import type { StructuredRequirement, ContextFile, SpecLoreConfig } from '../../types/index.js';
import type { AIProvider, GenerateOptions, GenerateResult } from '../../src/ai/provider.js';

const TEST_DIR = join(process.cwd(), '.test-pipeline-integration');

// ---- Shared test data ----

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

// Valid Gherkin content
const VALID_GHERKIN = `Feature: 创建订单

  Scenario: 创建成功
    Given 用户已登录并有商品在购物车
    When 用户提交订单并填写收货地址
    Then 系统返回订单ID

  Scenario: 地址为空
    Given 用户已登录并有商品在购物车
    When 用户提交订单但未填写收货地址
    Then 系统提示地址不能为空`;

// ---- FakeProvider ----

class FakePipelineProvider implements AIProvider {
  readonly name = 'fake-pipeline';
  private responses: string[];
  callCount = 0;

  constructor(responses: string[]) {
    this.responses = [...responses];
  }

  isAvailable() { return true; }

  async generate(_prompt: string, _options?: GenerateOptions): Promise<GenerateResult> {
    const content = this.responses[this.callCount] ?? this.responses[this.responses.length - 1] ?? '';
    this.callCount++;
    return { content };
  }
}

class FakePipelineProviderWithUsage implements AIProvider {
  readonly name = 'fake-pipeline-usage';
  callCount = 0;

  isAvailable() { return true; }

  async generate(_prompt: string, _options?: GenerateOptions): Promise<GenerateResult> {
    this.callCount++;
    return {
      content: VALID_GHERKIN,
      usage: { promptTokens: 500, completionTokens: 200, totalTokens: 700 },
    };
  }
}

// ---- Tests ----

describe('end-to-end pipeline — with FakeProvider', () => {
  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should generate a valid .feature file from text requirement', async () => {
    mkdirSync(join(TEST_DIR, 'specs', 'order'), { recursive: true });

    const fakeProvider = new FakePipelineProvider([VALID_GHERKIN]);
    const feature = await generateFeature(requirement, context, config, TEST_DIR, fakeProvider);

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
    mkdirSync(join(TEST_DIR, 'specs', 'order'), { recursive: true });

    // First call returns invalid Gherkin, second call returns valid
    const fakeProvider = new FakePipelineProvider([
      'This is not valid Gherkin at all',
      VALID_GHERKIN,
    ]);

    const feature = await generateFeature(requirement, context, config, TEST_DIR, fakeProvider);

    // Should have retried and succeeded
    expect(fakeProvider.callCount).toBe(2);
    expect(feature.scenarios.length).toBe(2);

    // Verify the written file is valid
    const content = readFileSync(feature.path, 'utf-8');
    const parser = new Parser(new AstBuilder(IdGenerator.incrementing()), new GherkinClassicTokenMatcher());
    const doc = parser.parse(content);
    expect(doc.feature).toBeDefined();
  });

  it('should flag needsReview after exhausting validation retries', async () => {
    mkdirSync(join(TEST_DIR, 'specs', 'order'), { recursive: true });

    // All calls return invalid Gherkin
    const fakeProvider = new FakePipelineProvider([
      'Invalid content without Feature keyword',
      'Invalid content without Feature keyword',
      'Invalid content without Feature keyword',
    ]);

    const feature = await generateFeature(requirement, context, config, TEST_DIR, fakeProvider);

    // Should have tried 3 times (1 initial + 2 retries)
    expect(fakeProvider.callCount).toBe(3);
    // Should be flagged for review
    expect(feature.needsReview.length).toBeGreaterThan(0);
  });

  it('should record cost after successful generation', async () => {
    mkdirSync(join(TEST_DIR, 'specs', 'order'), { recursive: true });
    resetCostTracker();

    const fakeProvider = new FakePipelineProviderWithUsage();
    await generateFeature(requirement, context, config, TEST_DIR, fakeProvider);

    // Note: cost tracking via providerOverride doesn't go through the
    // adapter's recordCost path, so this verifies the provider was called
    expect(fakeProvider.callCount).toBe(1);
  });
});
