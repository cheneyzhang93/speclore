/**
 * Test scaffolder — generates test skeleton files from feature scenarios.
 *
 * For each .feature file, produces a test file with `it.skip` stubs
 * matching each scenario's Given/When/Then structure.
 *
 * @module core/test-scaffolder
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative, dirname, basename } from 'node:path';
import type { FeatureFile, ScaffoldResult, MappingPattern } from '../../types/index.js';
import type { SpecLoreConfig } from '../../types/config.js';
import { detectTestFramework, type TestFramework } from './framework-detector.js';
import { logger } from '../../infra/logger.js';

/**
 * Generate test scaffolding for the given feature files.
 * Returns info about each generated test file.
 */
export function generateTestScaffolding(
  projectRoot: string,
  features: FeatureFile[],
  config: SpecLoreConfig,
): ScaffoldResult[] {
  const framework = detectTestFramework(projectRoot);
  const results: ScaffoldResult[] = [];

  for (const feature of features) {
    const testFilePath = resolveTestFilePath(projectRoot, feature.path, config);
    if (!testFilePath) {
      logger.warn(`Could not resolve test file path for feature: ${feature.path}`);
      continue;
    }

    const absTestPath = join(projectRoot, testFilePath);
    const scenarios = feature.scenarios;

    if (existsSync(absTestPath)) {
      // Append missing scenarios only
      const appended = appendMissingScenarios(absTestPath, scenarios, framework);
      if (appended > 0) {
        results.push({ testFile: testFilePath, framework, scenarios: appended });
        logger.info(`Appended ${appended} scenario(s) to ${testFilePath}`);
      }
    } else {
      // Create new test file
      const content = generateTestFileContent(feature.featureName, scenarios, framework);
      const dir = dirname(absTestPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(absTestPath, content, 'utf-8');
      results.push({ testFile: testFilePath, framework, scenarios: scenarios.length });
      logger.info(`Generated test scaffold: ${testFilePath} (${scenarios.length} scenarios)`);
    }
  }

  return results;
}

/**
 * Resolve the test file path for a feature using config mapping patterns.
 */
function resolveTestFilePath(
  projectRoot: string,
  featurePath: string,
  config: SpecLoreConfig,
): string | null {
  const relFeature = relative(projectRoot, featurePath).replace(/\\/g, '/');
  const patterns = config.verify.mapping.patterns;

  for (const pattern of patterns) {
    const match = matchFeaturePattern(relFeature, pattern);
    if (match) {
      return resolveTestFromPattern(match, pattern);
    }
  }

  // Fallback: derive from feature path
  const featureBase = basename(featurePath, '.feature');
  const featureDir = dirname(relative(projectRoot, featurePath));
  return join(featureDir, `${featureBase}.test.ts`).replace(/\\/g, '/');
}

/**
 * Match a relative feature path against a feature pattern.
 * Returns captured {module, name} or null.
 */
function matchFeaturePattern(
  relFeaturePath: string,
  pattern: MappingPattern,
): { module: string; name: string } | null {
  // Convert pattern like "specs/{module}/{name}.feature" to regex
  const featurePattern = pattern.feature;
  const regexStr = featurePattern
    .replace(/\{module\}/g, '([^/]+)')
    .replace(/\{name\}/g, '([^/]+)')
    .replace(/\./g, '\\.');

  const regex = new RegExp(`^${regexStr}$`);
  const match = relFeaturePath.match(regex);
  if (!match) return null;

  return { module: match[1]!, name: match[2]! };
}

/**
 * Resolve test file path from a matched pattern.
 */
function resolveTestFromPattern(
  captured: { module: string; name: string },
  pattern: MappingPattern,
): string {
  let testPath = pattern.test;
  testPath = testPath.replace('{module}', captured.module);
  testPath = testPath.replace('{name}', captured.name);
  // Replace wildcard extension with .ts
  testPath = testPath.replace(/\.\*$/, '.ts');
  return testPath;
}

/**
 * Generate test file content for a feature.
 */
function generateTestFileContent(
  featureName: string,
  scenarios: Array<{ name: string; givens: Array<{ text: string }>; whens: Array<{ text: string }>; thens: Array<{ text: string }> }>,
  framework: TestFramework,
): string {
  const lines: string[] = [];

  // Import statement
  switch (framework) {
    case 'vitest':
      lines.push("import { describe, it, expect } from 'vitest';");
      break;
    case 'jest':
      lines.push("// Jest — describe/it/expect are globally available");
      break;
    case 'mocha':
      lines.push("import { expect } from 'chai';");
      lines.push("// mocha — describe/it are globally available");
      break;
  }

  lines.push('');
  lines.push(`describe('Feature: ${featureName}', () => {`);

  for (const scenario of scenarios) {
    lines.push(`  it.skip('Scenario: ${scenario.name}', () => {`);

    // Add Given/When/Then as comments
    for (const g of scenario.givens) {
      lines.push(`    // Given: ${g.text}`);
    }
    for (const w of scenario.whens) {
      lines.push(`    // When: ${w.text}`);
    }
    for (const t of scenario.thens) {
      lines.push(`    // Then: ${t.text}`);
    }

    lines.push("    throw new Error('Not implemented');");
    lines.push('  });');
    lines.push('');
  }

  lines.push('});');
  lines.push('');

  return lines.join('\n');
}

/**
 * Append missing scenarios to an existing test file.
 * Returns the number of scenarios appended.
 */
function appendMissingScenarios(
  testFilePath: string,
  scenarios: Array<{ name: string; givens: Array<{ text: string }>; whens: Array<{ text: string }>; thens: Array<{ text: string }> }>,
  _framework: TestFramework,
): number {
  const content = readFileSync(testFilePath, 'utf-8');
  const missing: typeof scenarios = [];

  for (const scenario of scenarios) {
    if (!content.includes(`Scenario: ${scenario.name}`)) {
      missing.push(scenario);
    }
  }

  if (missing.length === 0) return 0;

  // Insert before the last `});`
  const lastClose = content.lastIndexOf('});');
  if (lastClose === -1) return 0;

  const newBlocks: string[] = [];
  for (const scenario of missing) {
    const block: string[] = [];
    block.push(`  it.skip('Scenario: ${scenario.name}', () => {`);
    for (const g of scenario.givens) {
      block.push(`    // Given: ${g.text}`);
    }
    for (const w of scenario.whens) {
      block.push(`    // When: ${w.text}`);
    }
    for (const t of scenario.thens) {
      block.push(`    // Then: ${t.text}`);
    }
    block.push("    throw new Error('Not implemented');");
    block.push('  });');
    newBlocks.push(block.join('\n'));
  }

  const insertion = '\n' + newBlocks.join('\n\n') + '\n';
  const updated = content.slice(0, lastClose) + insertion + content.slice(lastClose);
  writeFileSync(testFilePath, updated, 'utf-8');

  return missing.length;
}
