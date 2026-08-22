/**
 * Mapping resolver — resolves Scenario → Test mappings.
 *
 * Priority chain: mapping file → explicit tag → unmapped
 *
 * @module core/verifier/mapping-resolver
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { FeatureFile, ScenarioResult, MappingFile } from '../../types/index.js';
import { logger } from '../../infra/logger.js';

/**
 * Resolve all scenario → test mappings for the given features.
 *
 * Priority chain for each scenario:
 *   1. **Mapping file** — `.speclore/mappings/*.json` with explicit scenario→test entries.
 *      Fastest and most reliable; AI generates these alongside test code.
 *   2. **Explicit tag** — `@speclore-scenario: <name>` annotation in test source files.
 *      Fallback when mapping files are not present.
 *   3. **Unmapped** — scenario has no corresponding test; reported for human review.
 */
export function resolveMappings(
  projectRoot: string,
  features: FeatureFile[],
  testOutput: string,
): ScenarioResult[] {
  const results: ScenarioResult[] = [];

  for (const feature of features) {
    for (const scenario of feature.scenarios) {
      const result = resolveMapping(projectRoot, feature, scenario, testOutput);
      results.push(result);
    }
  }

  return results;
}

/**
 * Resolve a single scenario → test mapping.
 */
function resolveMapping(
  projectRoot: string,
  feature: FeatureFile,
  scenario: { name: string },
  _testOutput: string,
): ScenarioResult {
  // Priority 1: Mapping file
  const mappingResult = resolveFromMappingFile(projectRoot, feature, scenario);
  if (mappingResult) return mappingResult;

  // Priority 2: Explicit tag (@speclore-scenario)
  const tagResult = resolveFromTag(projectRoot, feature, scenario);
  if (tagResult) return tagResult;

  // Priority 3: Unmapped
  return {
    name: scenario.name,
    status: 'unmapped',
    mappingSource: 'none',
  };
}

/**
 * Try to resolve from .speclore/mappings/ files.
 */
function resolveFromMappingFile(
  projectRoot: string,
  _feature: FeatureFile,
  scenario: { name: string },
): ScenarioResult | null {
  const mappingsDir = join(projectRoot, '.speclore', 'mappings');
  if (!existsSync(mappingsDir)) return null;

  // Search all mapping files for this scenario
  try {
    const files = findMappingFiles(mappingsDir);
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const mapping = JSON.parse(content) as MappingFile;

        if (mapping.scenarios && scenario.name in mapping.scenarios) {
          const entry = mapping.scenarios[scenario.name];
          if (entry) {
            logger.debug(`Mapping file hit: ${scenario.name} → ${entry.testMethod}`);
            return {
              name: scenario.name,
              status: 'passed', // Status will be updated by test output parsing
              testFile: entry.testFile,
              testMethod: entry.testMethod,
              mappingSource: 'mapping-file',
            };
          }
        }
      } catch {
        // Skip invalid mapping files
      }
    }
  } catch {
    // Directory read error
  }

  return null;
}

/**
 * Try to resolve from @speclore-scenario tags in test files.
 */
function resolveFromTag(
  projectRoot: string,
  _feature: FeatureFile,
  scenario: { name: string },
): ScenarioResult | null {
  const testsDir = join(projectRoot, 'tests');
  if (!existsSync(testsDir)) return null;

  // Search test files for @speclore-scenario tags
  try {
    const files = findTestFiles(testsDir);
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const tagRegex = /@speclore-scenario:\s*(.+)/g;
        let match;
        while ((match = tagRegex.exec(content)) !== null) {
          if (match[1]!.trim() === scenario.name) {
            // Find the test method name near the tag
            const methodMatch = findTestMethodNearby(content, match.index);
            logger.debug(`Tag hit: ${scenario.name} → ${methodMatch}`);
            return {
              name: scenario.name,
              status: 'passed',
              testFile: file,
              testMethod: methodMatch,
              mappingSource: 'tag',
            };
          }
        }
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // Directory read error
  }

  return null;
}

/**
 * Find all mapping JSON files recursively.
 */
function findMappingFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(d: string): void {
    try {
      const entries = readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(d, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.name.endsWith('.json')) {
          files.push(fullPath);
        }
      }
    } catch { /* ignore */ }
  }

  walk(dir);
  return files;
}

/**
 * Find test files recursively.
 */
function findTestFiles(dir: string): string[] {
  const files: string[] = [];
  const testExtensions = ['.test.ts', '.test.js', '.spec.ts', '.spec.js', 'Test.java', '_test.py', '.test.py'];

  function walk(d: string): void {
    try {
      const entries = readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(d, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules') {
          walk(fullPath);
        } else if (testExtensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch { /* ignore */ }
  }

  walk(dir);
  return files;
}

/**
 * Find the test method name near a @speclore-scenario tag.
 */
function findTestMethodNearby(content: string, tagIndex: number): string {
  // Look for the next test/function definition after the tag
  const afterTag = content.slice(tagIndex, tagIndex + 500);

  // TypeScript/JavaScript: test('name', ...) or it('name', ...)
  const jsMatch = afterTag.match(/(?:test|it)\s*\(\s*['"]([^'"]+)['"]/);
  if (jsMatch) return jsMatch[1]!;

  // Java: @Test void method_name()
  const javaMatch = afterTag.match(/@Test\s+(?:void\s+)?(\w+)\s*\(/);
  if (javaMatch) return javaMatch[1]!;

  // Python: def test_method(...)
  const pyMatch = afterTag.match(/def\s+(test_\w+)\s*\(/);
  if (pyMatch) return pyMatch[1]!;

  return 'unknown';
}
