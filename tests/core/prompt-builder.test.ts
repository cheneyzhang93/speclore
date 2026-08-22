/**
 * Prompt builder unit tests.
 */

import { describe, it, expect } from 'vitest';
import { buildPrompt } from '../../src/core/feature-generator/prompt-builder.js';
import type { StructuredRequirement, ContextFile, SpecLoreConfig } from '../../src/types/index.js';

function makeRequirement(overrides?: Partial<StructuredRequirement>): StructuredRequirement {
  return {
    id: 'test-req',
    title: 'Test Requirement',
    description: '用户注册需要邮箱验证',
    rawContent: '用户注册需要邮箱验证',
    confidence: 1.0,
    ...overrides,
  };
}

function makeContext(overrides?: Partial<ContextFile>): ContextFile {
  return {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    generatedBy: 'test',
    projectSummary: {
      language: 'TypeScript',
      framework: 'Express',
      buildTool: 'pnpm',
      testFramework: 'vitest',
      directoryStructure: 'src/\ntests/',
    },
    moduleBoundaries: [],
    existingCode: { entities: [], apis: [] },
    dependencyGraph: [],
    ...overrides,
  };
}

function makeConfig(overrides?: Partial<SpecLoreConfig>): SpecLoreConfig {
  return {
    project: { name: 'test', language: 'typescript', framework: 'express', profile: 'normal', modules: {} },
    spec: { outputDir: 'specs', defaultLanguage: 'zh-CN', confidenceThreshold: 0.6 },
    verify: { command: 'pnpm test', timeout: 300, reportFormat: ['json'], mapping: { patterns: [] } },
    ...overrides,
  };
}

describe('buildPrompt', () => {
  it('should produce a non-empty prompt string', () => {
    const prompt = buildPrompt(makeRequirement(), makeContext(), makeConfig());
    expect(prompt.length).toBeGreaterThan(0);
    expect(typeof prompt).toBe('string');
  });

  it('should include the requirement description', () => {
    const prompt = buildPrompt(makeRequirement(), makeContext(), makeConfig());
    expect(prompt).toContain('邮箱验证');
  });

  it('should include project context (language, framework)', () => {
    const prompt = buildPrompt(makeRequirement(), makeContext(), makeConfig());
    expect(prompt).toContain('TypeScript');
    expect(prompt).toContain('Express');
  });

  it('should append strict mode instructions when profile is strict', () => {
    const config = makeConfig({ project: { name: 'test', language: 'typescript', framework: 'express', profile: 'strict', modules: {} } });
    const prompt = buildPrompt(makeRequirement(), makeContext(), config);
    expect(prompt).toContain('Strict Mode');
    expect(prompt).toContain('edge cases');
  });

  it('should append minimal mode instructions when profile is minimal', () => {
    const config = makeConfig({ project: { name: 'test', language: 'typescript', framework: 'express', profile: 'minimal', modules: {} } });
    const prompt = buildPrompt(makeRequirement(), makeContext(), config);
    expect(prompt).toContain('Minimal Mode');
    expect(prompt).toContain('happy path');
  });
});
