/**
 * Tests for core/analyzer — impact analysis.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ContextFile, SpecLoreConfig } from '../../src/types/index.js';

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

// Mock child_process to control git diff output
const mockExecFileSync = vi.fn();
vi.mock('node:child_process', () => ({
  execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
}));

describe('analyzeImpact', () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, 'specs', 'auth'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'specs', 'order'), { recursive: true });
    writeFileSync(join(TEST_DIR, 'specs', 'auth', 'login.feature'), 'Feature: Login', 'utf-8');
    writeFileSync(join(TEST_DIR, 'specs', 'order', 'create.feature'), 'Feature: Create Order', 'utf-8');
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('should return empty results when git diff returns no changes', async () => {
    mockExecFileSync.mockImplementation(() => { throw new Error('not a git repo'); });

    const { analyzeImpact } = await import('../../src/core/analyzer/impact-analyzer.js');
    const result = analyzeImpact(TEST_DIR, mockContext, mockConfig);
    expect(result.changedFiles).toEqual([]);
    expect(result.affectedModules).toEqual([]);
    expect(result.affectedFeatures).toEqual([]);
  });

  it('should use config.spec.outputDir for feature search path', async () => {
    // Custom outputDir
    const customConfig = {
      ...mockConfig,
      spec: { ...mockConfig.spec, outputDir: 'custom-specs' },
    };

    // Create features in custom dir
    mkdirSync(join(TEST_DIR, 'custom-specs', 'auth'), { recursive: true });
    writeFileSync(join(TEST_DIR, 'custom-specs', 'auth', 'login.feature'), 'Feature: Login', 'utf-8');

    // Mock git diff to return a changed file in auth module
    mockExecFileSync.mockReturnValue('src/auth/service.ts\n');

    const { analyzeImpact } = await import('../../src/core/analyzer/impact-analyzer.js');
    const result = analyzeImpact(TEST_DIR, mockContext, customConfig);

    // Should find features in custom-specs/, not specs/
    expect(result.affectedFeatures.length).toBeGreaterThan(0);
    expect(result.affectedFeatures.some((f: string) => f.includes('custom-specs'))).toBe(true);
  });

  it('should detect transitive module dependencies', async () => {
    // Mock git diff to return a changed file in auth module
    mockExecFileSync.mockReturnValue('src/auth/user.ts\n');

    const { analyzeImpact } = await import('../../src/core/analyzer/impact-analyzer.js');
    const result = analyzeImpact(TEST_DIR, mockContext, mockConfig);

    // auth is directly affected, order depends on auth → both affected
    expect(result.affectedModules).toContain('auth');
    expect(result.affectedModules).toContain('order');
  });

  it('should return correct structure', async () => {
    mockExecFileSync.mockImplementation(() => { throw new Error('not a git repo'); });

    const { analyzeImpact } = await import('../../src/core/analyzer/impact-analyzer.js');
    const result = analyzeImpact(TEST_DIR, mockContext, mockConfig);
    expect(result).toHaveProperty('changedFiles');
    expect(result).toHaveProperty('affectedModules');
    expect(result).toHaveProperty('affectedFeatures');
    expect(Array.isArray(result.changedFiles)).toBe(true);
    expect(Array.isArray(result.affectedModules)).toBe(true);
    expect(Array.isArray(result.affectedFeatures)).toBe(true);
  });

  it('should map changed files to correct modules', async () => {
    mockExecFileSync.mockReturnValue('src/order/service.ts\nsrc/order/handler.ts\n');

    const { analyzeImpact } = await import('../../src/core/analyzer/impact-analyzer.js');
    const result = analyzeImpact(TEST_DIR, mockContext, mockConfig);

    expect(result.changedFiles).toContain('src/order/service.ts');
    expect(result.changedFiles).toContain('src/order/handler.ts');
    expect(result.affectedModules).toContain('order');
  });
});
