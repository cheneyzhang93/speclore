/**
 * Tests for infra/config.ts — configuration loading and merging.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../../src/infra/config.js';
import type { SpecLoreConfig } from '../../src/types/config.js';

const TEST_DIR = join(process.cwd(), '.test-config-tmp');

describe('loadConfig', () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, '.speclore'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should return default config when no config.yaml exists', () => {
    const config = loadConfig(TEST_DIR);
    expect(config.project.profile).toBe('normal');
    expect(config.spec.outputDir).toBe('specs');
    expect(config.spec.confidenceThreshold).toBe(0.6);
    expect(config.verify.timeout).toBe(300);
  });

  it('should load config from .speclore/config.yaml', () => {
    const yaml = `
project:
  name: my-test-project
  language: typescript
  framework: express
  profile: strict
  modules:
    auth:
      path: src/auth
      responsibility: Authentication
`;
    writeFileSync(join(TEST_DIR, '.speclore', 'config.yaml'), yaml, 'utf-8');
    const config = loadConfig(TEST_DIR);
    expect(config.project.name).toBe('my-test-project');
    expect(config.project.language).toBe('typescript');
    expect(config.project.profile).toBe('strict');
    expect(config.project.modules['auth']).toBeDefined();
    expect(config.project.modules['auth'].path).toBe('src/auth');
  });

  it('should reject invalid profile values', () => {
    const yaml = `
project:
  name: test
  profile: invalid_profile
`;
    writeFileSync(join(TEST_DIR, '.speclore', 'config.yaml'), yaml, 'utf-8');
    expect(() => loadConfig(TEST_DIR)).toThrow();
  });

  it('should reject invalid confidenceThreshold', () => {
    const yaml = `
project:
  name: test
spec:
  confidenceThreshold: 1.5
`;
    writeFileSync(join(TEST_DIR, '.speclore', 'config.yaml'), yaml, 'utf-8');
    expect(() => loadConfig(TEST_DIR)).toThrow();
  });

  it('should merge nested module config correctly', () => {
    const yaml = `
project:
  name: merged-test
  modules:
    auth:
      path: src/auth
      responsibility: Authentication
      dependsOn:
        - core
    core:
      path: src/core
      responsibility: Core logic
`;
    writeFileSync(join(TEST_DIR, '.speclore', 'config.yaml'), yaml, 'utf-8');
    const config = loadConfig(TEST_DIR);
    expect(config.project.modules['auth'].dependsOn).toEqual(['core']);
    expect(config.project.modules['core'].responsibility).toBe('Core logic');
  });

  it('should preserve default spec values when not overridden', () => {
    const yaml = `
project:
  name: defaults-test
`;
    writeFileSync(join(TEST_DIR, '.speclore', 'config.yaml'), yaml, 'utf-8');
    const config = loadConfig(TEST_DIR);
    expect(config.spec.outputDir).toBe('specs');
    expect(config.spec.defaultLanguage).toBe('zh-CN');
    expect(config.spec.confidenceThreshold).toBe(0.6);
  });

  it('should preserve default verify values when not overridden', () => {
    const yaml = `
project:
  name: verify-defaults
`;
    writeFileSync(join(TEST_DIR, '.speclore', 'config.yaml'), yaml, 'utf-8');
    const config = loadConfig(TEST_DIR);
    expect(config.verify.timeout).toBe(300);
    expect(config.verify.reportFormat).toEqual(['json', 'html']);
  });

  it('should reject empty spec.outputDir', () => {
    const yaml = `
project:
  name: test
spec:
  outputDir: ""
`;
    writeFileSync(join(TEST_DIR, '.speclore', 'config.yaml'), yaml, 'utf-8');
    expect(() => loadConfig(TEST_DIR)).toThrow(/outputDir/);
  });

  it('should reject negative verify.timeout', () => {
    const yaml = `
project:
  name: test
verify:
  timeout: -5
`;
    writeFileSync(join(TEST_DIR, '.speclore', 'config.yaml'), yaml, 'utf-8');
    expect(() => loadConfig(TEST_DIR)).toThrow(/timeout/);
  });
});
