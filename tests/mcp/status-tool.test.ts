/**
 * Tests for speclore.status MCP tool — recommended actions per state.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { executeStatusTool } from '../../src/mcp/status.js';
import { StateManager } from '../../src/core/state-manager/index.js';

const TEST_DIR = join(process.cwd(), '.test-status-tool-tmp');

describe('speclore.status tool', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    // Write minimal package.json
    writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({
      name: 'test-project',
      devDependencies: { vitest: '^1.0.0' },
    }), 'utf-8');
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should recommend speclore.spec when no features exist', () => {
    const result = executeStatusTool({}, TEST_DIR);

    expect(result.project.initialized).toBe(true);
    expect(result.features).toHaveLength(0);
    expect(result.summary.total).toBe(0);
    expect(result.recommendedActions).toContain(
      'Call speclore.spec with your requirement to create feature files.',
    );
  });

  it('should recommend speclore.code when features are specified', () => {
    // Create a feature file
    mkdirSync(join(TEST_DIR, 'specs', 'test'), { recursive: true });
    const featurePath = join(TEST_DIR, 'specs', 'test', 'demo.feature');
    writeFileSync(featurePath, [
      'Feature: Demo',
      '  Scenario: test scenario',
      '    Given something',
      '    When action',
      '    Then result',
    ].join('\n'), 'utf-8');

    const sm = new StateManager(TEST_DIR);
    sm.ensureInitialized();
    sm.transitionFeature(featurePath, 'specified');

    const result = executeStatusTool({}, TEST_DIR);

    expect(result.summary.total).toBe(1);
    expect(result.summary.specified).toBe(1);
    expect(result.recommendedActions.some(a => a.includes('speclore.code'))).toBe(true);
  });

  it('should recommend speclore.verify when features are in coding state', () => {
    mkdirSync(join(TEST_DIR, 'specs', 'test'), { recursive: true });
    const featurePath = join(TEST_DIR, 'specs', 'test', 'demo.feature');
    writeFileSync(featurePath, 'Feature: Demo\n  Scenario: test\n', 'utf-8');

    // Write config with test command
    mkdirSync(join(TEST_DIR, '.speclore'), { recursive: true });
    writeFileSync(join(TEST_DIR, '.speclore', 'config.yaml'), [
      'project:',
      '  name: test',
      '  language: typescript',
      '  framework: ""',
      '  profile: normal',
      '  modules: {}',
      'ai:',
      '  provider: openai-compatible',
      'spec:',
      '  outputDir: specs',
      '  defaultLanguage: zh-CN',
      '  confidenceThreshold: 0.6',
      'verify:',
      '  command: "pnpm test"',
      '  timeout: 300',
      '  reportFormat: [json]',
      '  mapping:',
      '    patterns: []',
      'plugins: {}',
    ].join('\n'), 'utf-8');

    const sm = new StateManager(TEST_DIR);
    sm.ensureInitialized();
    sm.transitionFeature(featurePath, 'specified');
    sm.transitionFeature(featurePath, 'constrained');
    sm.transitionFeature(featurePath, 'coding');

    const result = executeStatusTool({}, TEST_DIR);

    expect(result.summary.coding).toBe(1);
    expect(result.recommendedActions.some(a => a.includes('speclore.verify'))).toBe(true);
  });

  it('should detect configCreated when auto-initializing', () => {
    // No .speclore directory
    expect(existsSync(join(TEST_DIR, '.speclore'))).toBe(false);

    const result = executeStatusTool({}, TEST_DIR);

    expect(result.project.configCreated).toBe(true);
    expect(existsSync(join(TEST_DIR, '.speclore', 'config.yaml'))).toBe(true);
  });

  it('should scan untracked .feature files', () => {
    mkdirSync(join(TEST_DIR, 'specs', 'test'), { recursive: true });
    writeFileSync(join(TEST_DIR, 'specs', 'test', 'untracked.feature'), [
      'Feature: Untracked',
      '  Scenario: one',
      '  Scenario: two',
    ].join('\n'), 'utf-8');

    const result = executeStatusTool({}, TEST_DIR);

    // Should find the untracked feature file
    const untracked = result.features.find(f => f.file.includes('untracked.feature'));
    expect(untracked).toBeDefined();
    expect(untracked!.scenarios).toBe(2);
    expect(untracked!.state).toBe('specified');
  });

  it('should filter by feature parameter', () => {
    mkdirSync(join(TEST_DIR, 'specs', 'test'), { recursive: true });
    writeFileSync(join(TEST_DIR, 'specs', 'test', 'a.feature'), 'Feature: A\n', 'utf-8');
    writeFileSync(join(TEST_DIR, 'specs', 'test', 'b.feature'), 'Feature: B\n', 'utf-8');

    const result = executeStatusTool({ feature: 'a.feature' }, TEST_DIR);

    expect(result.features).toHaveLength(1);
    expect(result.features[0].file).toContain('a.feature');
  });
});
