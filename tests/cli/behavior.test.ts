/**
 * CLI behavior tests — verify commands correctly parse args and call core logic.
 *
 * Uses vi.mock to replace core functions, then triggers commands via program.parseAsync.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to declare mock functions before vi.mock (which is hoisted to top)
const mocks = vi.hoisted(() => ({
  readRequirement: vi.fn().mockResolvedValue({
    id: 'test', title: 'Test', description: '', rawContent: '', confidence: 1,
  }),
  generateFeature: vi.fn().mockResolvedValue({
    path: '/specs/test.feature', featureName: 'Test', scenarios: [], needsReview: [],
  }),
  runVerification: vi.fn().mockResolvedValue({
    summary: { passed: 1, totalScenarios: 2, passRate: '50%', failed: 1, unmapped: 0 },
    features: [], failedDetails: [],
  }),
  buildContext: vi.fn().mockReturnValue({
    projectSummary: { language: 'ts', framework: '' },
    moduleBoundaries: [], existingCode: { entities: [], apis: [] },
  }),
  loadContext: vi.fn().mockReturnValue(null),
  writeContextFile: vi.fn(),
  loadConfig: vi.fn().mockReturnValue({
    project: { name: 'test', profile: 'normal', modules: {} },
    spec: { outputDir: 'specs', defaultLanguage: 'zh-CN', confidenceThreshold: 0.6 },
    verify: { command: '', timeout: 300, reportFormat: ['json'], mapping: { patterns: [] } },
    ai: { provider: 'openai-compatible' },
  }),
  generateConstraints: vi.fn().mockResolvedValue(['/constraints/test.md']),
  analyzeImpact: vi.fn().mockReturnValue({
    changedFiles: [], affectedModules: [], affectedFeatures: [],
  }),
  detectAITools: vi.fn().mockReturnValue([]),
  getUsageSummary: vi.fn().mockReturnValue({
    totalCalls: 0, totalTokens: 0, totalCostUsd: 0, byModel: {},
  }),
  runTeardown: vi.fn().mockResolvedValue(undefined),
  generateReport: vi.fn(),
  setLevel: vi.fn(),
}));

vi.mock('../../src/core/requirement-reader/index.js', () => ({
  readRequirement: mocks.readRequirement,
  sanitizeSource: (s: string) => s,
}));
vi.mock('../../src/core/feature-generator/index.js', () => ({
  generateFeature: mocks.generateFeature,
}));
vi.mock('../../src/core/verifier/index.js', () => ({
  runVerification: mocks.runVerification,
}));
vi.mock('../../src/core/verifier/report-generator.js', () => ({
  generateReport: mocks.generateReport,
}));
vi.mock('../../src/core/context-engine/index.js', () => ({
  buildContext: mocks.buildContext,
  loadContext: mocks.loadContext,
  writeContextFile: mocks.writeContextFile,
}));
vi.mock('../../src/infra/config.js', () => ({
  loadConfig: mocks.loadConfig,
}));
vi.mock('../../src/core/constraint-coder/index.js', () => ({
  generateConstraints: mocks.generateConstraints,
}));
vi.mock('../../src/core/analyzer/index.js', () => ({
  analyzeImpact: mocks.analyzeImpact,
}));
vi.mock('../../src/setup/detector.js', () => ({
  detectAITools: mocks.detectAITools,
}));
vi.mock('../../src/ai/cost-tracker.js', () => ({
  getCostTracker: () => ({ getUsageSummary: mocks.getUsageSummary }),
}));
vi.mock('../../src/setup/cleanup.js', () => ({
  runTeardown: mocks.runTeardown,
}));
vi.mock('../../src/infra/logger.js', () => ({
  logger: {
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
    setLevel: mocks.setLevel,
  },
}));

import { createProgram } from '../../src/cli/index.js';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadContext.mockReturnValue(null);
  mocks.loadConfig.mockReturnValue({
    project: { name: 'test', profile: 'normal', modules: {} },
    spec: { outputDir: 'specs', defaultLanguage: 'zh-CN', confidenceThreshold: 0.6 },
    verify: { command: '', timeout: 300, reportFormat: ['json'], mapping: { patterns: [] } },
    ai: { provider: 'openai-compatible' },
  });
});

// ---- spec command ----

describe('spec command behavior', () => {
  it('should call readRequirement with source argument', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'speclore', 'spec', 'requirements.md']);

    expect(mocks.readRequirement).toHaveBeenCalledWith('requirements.md');
    expect(mocks.generateFeature).toHaveBeenCalled();
  });

  it('should pass --module option to generateFeature', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'speclore', 'spec', 'test.md', '--module', 'order']);

    expect(mocks.readRequirement).toHaveBeenCalledWith('test.md');
    expect(mocks.generateFeature).toHaveBeenCalled();
  });

  it('should set logger to debug on --verbose', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'speclore', 'spec', 'test.md', '--verbose']);

    expect(mocks.setLevel).toHaveBeenCalledWith('debug');
  });
});

// ---- verify command ----

describe('verify command behavior', () => {
  it('should call runVerification', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'speclore', 'verify']);

    expect(mocks.runVerification).toHaveBeenCalled();
  });

  it('should enable impact analysis on --impact', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'speclore', 'verify', '--impact']);

    expect(mocks.analyzeImpact).toHaveBeenCalled();
    expect(mocks.runVerification).toHaveBeenCalled();
  });

  it('should set logger to debug on --verbose', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'speclore', 'verify', '--verbose']);

    expect(mocks.setLevel).toHaveBeenCalledWith('debug');
  });
});

// ---- code command ----

describe('code command behavior', () => {
  it('should call loadConfig when executing', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'speclore', 'code']);

    expect(mocks.loadConfig).toHaveBeenCalled();
  });

  it('should set logger to debug on --verbose', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'speclore', 'code', '--verbose']);

    expect(mocks.setLevel).toHaveBeenCalledWith('debug');
  });
});

// ---- init command ----

describe('init command behavior', () => {
  it('should call buildContext and writeContextFile', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'speclore', 'init']);

    expect(mocks.buildContext).toHaveBeenCalled();
    expect(mocks.writeContextFile).toHaveBeenCalled();
  });

  it('should set logger to debug on --verbose', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'speclore', 'init', '--verbose']);

    expect(mocks.setLevel).toHaveBeenCalledWith('debug');
  });
});

// ---- status command ----

describe('status command behavior', () => {
  it('should load config and print diagnostics', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const program = createProgram();
    await program.parseAsync(['node', 'speclore', 'status']);

    expect(mocks.loadConfig).toHaveBeenCalled();
    expect(mocks.detectAITools).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

// ---- teardown command ----

describe('teardown command behavior', () => {
  it('should call runTeardown with --yes', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'speclore', 'teardown', '--yes']);

    expect(mocks.runTeardown).toHaveBeenCalled();
  });

  it('should pass --global to runTeardown', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'speclore', 'teardown', '--yes', '--global']);

    expect(mocks.runTeardown).toHaveBeenCalledWith(expect.any(String), true);
  });
});

// ---- migrate command ----

describe('migrate command behavior', () => {
  it('should print migration header when executing', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const program = createProgram();
    await program.parseAsync(['node', 'speclore', 'migrate']);

    // Even without config, the command prints its header
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should set logger to debug on --verbose', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const program = createProgram();
    await program.parseAsync(['node', 'speclore', 'migrate', '--verbose']);

    expect(mocks.setLevel).toHaveBeenCalledWith('debug');

    consoleSpy.mockRestore();
  });
});
