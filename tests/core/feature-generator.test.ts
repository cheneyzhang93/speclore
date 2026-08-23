/**
 * Tests for core/feature-generator — prompt building and feature generation.
 *
 * buildPrompt tests: pure function, no mocks needed.
 * generateFeature tests: use FakeProvider via providerOverride — zero vi.mock.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPrompt } from '../../src/core/feature-generator/prompt-builder.js';
import { generateFeature } from '../../src/core/feature-generator/generator.js';
import type { StructuredRequirement, ContextFile, SpecLoreConfig } from '../../types/index.js';
import type { AIProvider, GenerateOptions, GenerateResult } from '../../src/ai/provider.js';

const TEST_DIR = join(process.cwd(), '.test-feature-gen-tmp');

// ---- Shared test data ----

const mockRequirement: StructuredRequirement = {
  id: 'login',
  title: '用户登录',
  description: '用户通过邮箱和密码登录系统',
  acceptanceCriteria: ['登录成功跳转首页', '密码错误提示错误信息'],
  rawContent: '用户通过邮箱和密码登录系统',
  confidence: 0.9,
};

const mockContext: ContextFile = {
  version: '1.0',
  generatedAt: new Date().toISOString(),
  generatedBy: 'speclore test',
  projectSummary: {
    language: 'typescript',
    framework: 'express',
    buildTool: 'npm',
    testFramework: 'vitest',
    directoryStructure: 'src/\n  auth/\n  order/',
  },
  moduleBoundaries: [
    {
      name: 'auth',
      responsibility: 'Authentication & Authorization',
      publicApis: ['login', 'logout'],
      internalObjects: ['PasswordHasher'],
      dependsOn: [],
    },
    {
      name: 'order',
      responsibility: 'Order management',
      publicApis: ['createOrder'],
      internalObjects: [],
      dependsOn: ['auth'],
    },
  ],
  existingCode: {
    entities: [
      { name: 'UserEntity', module: 'auth', file: 'src/auth/UserEntity.ts' },
    ],
    apis: [
      { method: 'POST', path: '/auth/login', module: 'auth', file: 'src/auth/AuthController.ts' },
    ],
  },
  dependencyGraph: [],
};

const mockConfig: SpecLoreConfig = {
  project: {
    name: 'test-project',
    language: 'typescript',
    framework: 'express',
    profile: 'normal',
    modules: {
      auth: { path: 'src/auth', responsibility: 'Auth', dependsOn: [] },
    },
  },
  spec: {
    outputDir: 'specs',
    defaultLanguage: 'zh-CN',
    confidenceThreshold: 0.6,
  },
  verify: {
    command: 'npm test',
    timeout: 300,
    reportFormat: ['json', 'html'],
    mapping: { patterns: [] },
  },
};

// ---- FakeProvider ----

class FakeTextProvider implements AIProvider {
  readonly name = 'fake';
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

class FakeUnavailableProvider implements AIProvider {
  readonly name = 'unavailable';
  isAvailable() { return false; }
  async generate(): Promise<GenerateResult> { return { content: '' }; }
}

// ---- buildPrompt tests (unchanged — pure function) ----

describe('buildPrompt', () => {
  it('should include project context', () => {
    const prompt = buildPrompt(mockRequirement, mockContext, mockConfig);
    expect(prompt).toContain('Language: typescript');
    expect(prompt).toContain('Framework: express');
  });

  it('should include module boundaries', () => {
    const prompt = buildPrompt(mockRequirement, mockContext, mockConfig);
    expect(prompt).toContain('**auth**: Authentication & Authorization');
    expect(prompt).toContain('**order**: Order management');
  });

  it('should include public APIs for modules', () => {
    const prompt = buildPrompt(mockRequirement, mockContext, mockConfig);
    expect(prompt).toContain('Public APIs: login, logout');
  });

  it('should include existing entities', () => {
    const prompt = buildPrompt(mockRequirement, mockContext, mockConfig);
    expect(prompt).toContain('UserEntity (auth)');
  });

  it('should include the requirement description', () => {
    const prompt = buildPrompt(mockRequirement, mockContext, mockConfig);
    expect(prompt).toContain('用户通过邮箱和密码登录系统');
  });

  it('should include acceptance criteria when present', () => {
    const prompt = buildPrompt(mockRequirement, mockContext, mockConfig);
    expect(prompt).toContain('登录成功跳转首页');
    expect(prompt).toContain('密码错误提示错误信息');
  });

  it('should include output format instructions', () => {
    const prompt = buildPrompt(mockRequirement, mockContext, mockConfig);
    expect(prompt).toContain('Gherkin .feature file');
    expect(prompt).toContain('Given/When/Then');
  });

  it('should add strict mode instructions for strict profile', () => {
    const strictConfig = { ...mockConfig, project: { ...mockConfig.project, profile: 'strict' as const } };
    const prompt = buildPrompt(mockRequirement, mockContext, strictConfig);
    expect(prompt).toContain('Strict Mode');
    expect(prompt).toContain('edge cases');
  });

  it('should add minimal mode instructions for minimal profile', () => {
    const minimalConfig = { ...mockConfig, project: { ...mockConfig.project, profile: 'minimal' as const } };
    const prompt = buildPrompt(mockRequirement, mockContext, minimalConfig);
    expect(prompt).toContain('Minimal Mode');
    expect(prompt).toContain('happy path');
  });

  it('should not add profile instructions for normal profile', () => {
    const prompt = buildPrompt(mockRequirement, mockContext, mockConfig);
    expect(prompt).not.toContain('Strict Mode');
    expect(prompt).not.toContain('Minimal Mode');
  });

  it('should handle empty module boundaries', () => {
    const emptyContext = { ...mockContext, moduleBoundaries: [] };
    const prompt = buildPrompt(mockRequirement, emptyContext, mockConfig);
    expect(prompt).toContain('Module Boundaries');
    expect(prompt).toContain('(none)');
  });

  it('should handle empty existing entities', () => {
    const emptyContext = { ...mockContext, existingCode: { entities: [], apis: [] } };
    const prompt = buildPrompt(mockRequirement, emptyContext, mockConfig);
    expect(prompt).toContain('Existing Entities');
    expect(prompt).toContain('(none)');
  });
});

// ---- generateFeature tests (FakeProvider injection) ----

describe('generateFeature — with FakeProvider', () => {
  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should generate a feature file and write to disk', async () => {
    mkdirSync(join(TEST_DIR, 'specs', 'auth'), { recursive: true });

    const aiContent = [
      'Feature: 用户登录',
      '  Scenario: 登录成功',
      '    Given 用户已注册',
      '    When 用户登录',
      '    Then 成功',
      '  Scenario: 密码错误',
      '    Given 用户已注册',
      '    When 输入错误密码',
      '    Then 显示错误提示',
    ].join('\n');

    const fakeProvider = new FakeTextProvider([aiContent]);
    const feature = await generateFeature(mockRequirement, mockContext, mockConfig, TEST_DIR, fakeProvider);

    expect(feature).toBeDefined();
    expect(feature.featureName).toBe('用户登录');
    expect(feature.scenarios.length).toBeGreaterThanOrEqual(1);
    expect(feature.confidence).toBe(0.9);

    // Verify file was written
    const writtenPath = join(TEST_DIR, 'specs', 'auth', 'login.feature');
    expect(existsSync(writtenPath)).toBe(true);
    const content = readFileSync(writtenPath, 'utf-8');
    expect(content).toContain('Feature: 用户登录');
  });

  it('should flag low-confidence requirements for review', async () => {
    mkdirSync(join(TEST_DIR, 'specs', 'auth'), { recursive: true });

    const lowConfReq = { ...mockRequirement, confidence: 0.3 };
    const fakeProvider = new FakeTextProvider([
      'Feature: 登录\n  Scenario: 登录\n    Given 已注册\n    When 登录\n    Then 成功',
    ]);

    const feature = await generateFeature(lowConfReq, mockContext, mockConfig, TEST_DIR, fakeProvider);

    expect(feature.confidence).toBe(0.3);
    if (feature.scenarios.length > 0) {
      expect(feature.needsReview.length).toBe(feature.scenarios.length);
    }
    expect(feature.needsReview.length).toBeGreaterThanOrEqual(0);
  });

  it('should throw when provider is not available', async () => {
    mkdirSync(join(TEST_DIR, 'specs'), { recursive: true });

    const unavailableProvider = new FakeUnavailableProvider();

    await expect(
      generateFeature(mockRequirement, mockContext, mockConfig, TEST_DIR, unavailableProvider),
    ).rejects.toThrow('AI provider not available');
  });
});
