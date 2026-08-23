/**
 * Tests for core/analyzer — impact analysis.
 *
 * Uses analyzeImpactWithChanges to pass known changed files directly,
 * eliminating the need to mock git/child_process — zero vi.mock.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { analyzeImpactWithChanges } from '../../src/core/analyzer/impact-analyzer.js';
import type { ContextFile, SpecLoreConfig } from '../../types/index.js';

const TEST_DIR = join(process.cwd(), '.test-analyzer-tmp');

const mockContext: ContextFile = {
  version: '1.0',
  generatedAt: new Date().toISOString(),
  generatedBy: 'speclore test',
  projectSummary: {
    language: 'typescript',
    framework: 'express',
    buildTool: 'npm',
    testFramework: 'vitest',
    directoryStructure: '',
  },
  moduleBoundaries: [
    {
      name: 'auth',
      responsibility: 'Authentication',
      publicApis: [],
      internalObjects: [],
      dependsOn: [],
    },
    {
      name: 'order',
      responsibility: 'Order management',
      publicApis: [],
      internalObjects: [],
      dependsOn: ['auth'],
    },
  ],
  existingCode: { entities: [], apis: [] },
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
      order: { path: 'src/order', responsibility: 'Order', dependsOn: ['auth'] },
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

describe('analyzeImpactWithChanges', () => {
  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should return empty results when no files changed', () => {
    mkdirSync(join(TEST_DIR, 'specs', 'auth'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'specs', 'order'), { recursive: true });
    writeFileSync(join(TEST_DIR, 'specs', 'auth', 'login.feature'), 'Feature:Login', 'utf-8');
    writeFileSync(join(TEST_DIR, 'specs', 'order', 'create.feature'), 'Feature:Create Order', 'utf-8');

    const result = analyzeImpactWithChanges([], mockContext, mockConfig, TEST_DIR);

    expect(result.changedFiles).toEqual([]);
    expect(result.affectedModules).toEqual([]);
    expect(result.affectedFeatures).toEqual([]);
  });

  it('should use config.spec.outputDir for feature search path', () => {
    const customConfig = {
      ...mockConfig,
      spec: { ...mockConfig.spec, outputDir: 'custom-specs' },
    };

    // Create feature in custom dir
    mkdirSync(join(TEST_DIR, 'custom-specs', 'auth'), { recursive: true });
    writeFileSync(join(TEST_DIR, 'custom-specs', 'auth', 'login.feature'), 'Feature: Login', 'utf-8');

    const result = analyzeImpactWithChanges(
      ['src/auth/service.ts'],
      mockContext,
      customConfig,
      TEST_DIR,
    );

    // Should find features in custom-specs/, not specs/
    expect(result.affectedFeatures.length).toBeGreaterThan(0);
    expect(result.affectedFeatures.some((f: string) => f.includes('custom-specs'))).toBe(true);
  });

  it('should detect transitive module dependencies', () => {
    mkdirSync(join(TEST_DIR, 'specs', 'auth'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'specs', 'order'), { recursive: true });
    writeFileSync(join(TEST_DIR, 'specs', 'auth', 'login.feature'), 'Feature:Login', 'utf-8');
    writeFileSync(join(TEST_DIR, 'specs', 'order', 'create.feature'), 'Feature:Create Order', 'utf-8');

    const result = analyzeImpactWithChanges(
      ['src/auth/user.ts'],
      mockContext,
      mockConfig,
      TEST_DIR,
    );

    // auth is directly affected, order depends on auth → both affected
    expect(result.affectedModules).toContain('auth');
    expect(result.affectedModules).toContain('order');
  });

  it('should return correct structure', () => {
    mkdirSync(join(TEST_DIR, 'specs'), { recursive: true });

    const result = analyzeImpactWithChanges([], mockContext, mockConfig, TEST_DIR);

    expect(result).toHaveProperty('changedFiles');
    expect(result).toHaveProperty('affectedModules');
    expect(result).toHaveProperty('affectedFeatures');
    expect(Array.isArray(result.changedFiles)).toBe(true);
    expect(Array.isArray(result.affectedModules)).toBe(true);
    expect(Array.isArray(result.affectedFeatures)).toBe(true);
  });

  it('should map changed files to correct modules', () => {
    mkdirSync(join(TEST_DIR, 'specs', 'order'), { recursive: true });
    writeFileSync(join(TEST_DIR, 'specs', 'order', 'create.feature'), 'Feature:Create Order', 'utf-8');

    const result = analyzeImpactWithChanges(
      ['src/order/service.ts', 'src/order/handler.ts'],
      mockContext,
      mockConfig,
      TEST_DIR,
    );

    expect(result.changedFiles).toContain('src/order/service.ts');
    expect(result.changedFiles).toContain('src/order/handler.ts');
    expect(result.affectedModules).toContain('order');
  });
});
