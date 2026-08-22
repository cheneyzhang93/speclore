/**
 * Tests for core/test-scaffolder — framework detection and scaffold generation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { detectTestFramework } from '../../src/core/test-scaffolder/framework-detector.js';
import { generateTestScaffolding } from '../../src/core/test-scaffolder/index.js';
import type { FeatureFile, SpecLoreConfig } from '../../src/types/index.js';
import { DEFAULT_CONFIG } from '../../src/types/config.js';

const TEST_DIR = join(process.cwd(), '.test-scaffolder-tmp');

function makeFeatureFile(overrides?: Partial<FeatureFile>): FeatureFile {
  return {
    path: join(TEST_DIR, 'specs', 'patient', 'register.feature'),
    featureName: '患者注册',
    scenarios: [
      {
        name: '手机号注册成功',
        givens: [{ text: '用户填写有效手机号和验证码' }],
        whens: [{ text: '用户提交注册' }],
        thens: [{ text: '系统创建患者账户并返回成功' }],
        tags: [],
      },
      {
        name: '手机号格式错误',
        givens: [{ text: '用户填写无效手机号' }],
        whens: [{ text: '用户提交注册' }],
        thens: [{ text: '系统提示手机号格式错误' }],
        tags: [],
      },
    ],
    confidence: 1.0,
    needsReview: [],
    ...overrides,
  };
}

describe('detectTestFramework', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should detect vitest', () => {
    writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({
      devDependencies: { vitest: '^1.0.0' },
    }), 'utf-8');
    expect(detectTestFramework(TEST_DIR)).toBe('vitest');
  });

  it('should detect jest', () => {
    writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({
      devDependencies: { jest: '^29.0.0' },
    }), 'utf-8');
    expect(detectTestFramework(TEST_DIR)).toBe('jest');
  });

  it('should detect mocha', () => {
    writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({
      devDependencies: { mocha: '^10.0.0' },
    }), 'utf-8');
    expect(detectTestFramework(TEST_DIR)).toBe('mocha');
  });

  it('should default to vitest when no package.json', () => {
    expect(detectTestFramework(TEST_DIR)).toBe('vitest');
  });

  it('should default to vitest when no test framework in deps', () => {
    writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({
      devDependencies: { typescript: '^5.0.0' },
    }), 'utf-8');
    expect(detectTestFramework(TEST_DIR)).toBe('vitest');
  });
});

describe('generateTestScaffolding', () => {
  const config: SpecLoreConfig = {
    ...DEFAULT_CONFIG,
    verify: {
      ...DEFAULT_CONFIG.verify,
      mapping: {
        patterns: [
          { feature: 'specs/{module}/{name}.feature', test: 'tests/{module}/{name}.test.*' },
        ],
      },
    },
  };

  beforeEach(() => {
    mkdirSync(join(TEST_DIR, 'specs', 'patient'), { recursive: true });
    // Write a dummy feature file
    writeFileSync(join(TEST_DIR, 'specs', 'patient', 'register.feature'), [
      'Feature: 患者注册',
      '  Scenario: 手机号注册成功',
      '    Given 用户填写有效手机号和验证码',
      '    When 用户提交注册',
      '    Then 系统创建患者账户并返回成功',
      '  Scenario: 手机号格式错误',
      '    Given 用户填写无效手机号',
      '    When 用户提交注册',
      '    Then 系统提示手机号格式错误',
    ].join('\n'), 'utf-8');

    // Write package.json with vitest
    writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({
      devDependencies: { vitest: '^1.0.0' },
    }), 'utf-8');
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should generate a test file with it.skip stubs', () => {
    const features = [makeFeatureFile()];
    const results = generateTestScaffolding(TEST_DIR, features, config);

    expect(results).toHaveLength(1);
    expect(results[0].framework).toBe('vitest');
    expect(results[0].scenarios).toBe(2);

    const testContent = readFileSync(join(TEST_DIR, results[0].testFile), 'utf-8');
    expect(testContent).toContain("import { describe, it, expect } from 'vitest'");
    expect(testContent).toContain("describe('Feature: 患者注册'");
    expect(testContent).toContain("it.skip('Scenario: 手机号注册成功'");
    expect(testContent).toContain("it.skip('Scenario: 手机号格式错误'");
    expect(testContent).toContain('// Given: 用户填写有效手机号和验证码');
  });

  it('should not overwrite existing test file, only append missing', () => {
    // Pre-create a test file with one scenario
    const testDir = join(TEST_DIR, 'tests', 'patient');
    mkdirSync(testDir, { recursive: true });
    const testPath = join(testDir, 'register.test.ts');
    writeFileSync(testPath, [
      "import { describe, it, expect } from 'vitest';",
      "describe('Feature: 患者注册', () => {",
      "  it.skip('Scenario: 手机号注册成功', () => {",
      "    // already implemented",
      "    expect(true).toBe(true);",
      '  });',
      '});',
    ].join('\n'), 'utf-8');

    const features = [makeFeatureFile()];
    const results = generateTestScaffolding(TEST_DIR, features, config);

    expect(results).toHaveLength(1);
    expect(results[0].scenarios).toBe(1); // Only appended the missing one

    const content = readFileSync(testPath, 'utf-8');
    expect(content).toContain('// already implemented'); // Original preserved
    expect(content).toContain("Scenario: 手机号格式错误"); // New scenario added
  });

  it('should return empty if all scenarios already exist', () => {
    // Pre-create test file with all scenarios
    const testDir = join(TEST_DIR, 'tests', 'patient');
    mkdirSync(testDir, { recursive: true });
    const testPath = join(testDir, 'register.test.ts');
    writeFileSync(testPath, [
      "describe('Feature: 患者注册', () => {",
      "  it.skip('Scenario: 手机号注册成功', () => {});",
      "  it.skip('Scenario: 手机号格式错误', () => {});",
      '});',
    ].join('\n'), 'utf-8');

    const features = [makeFeatureFile()];
    const results = generateTestScaffolding(TEST_DIR, features, config);

    expect(results).toHaveLength(0);
  });
});
