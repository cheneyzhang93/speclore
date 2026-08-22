/**
 * Test framework detector — inspects package.json devDependencies.
 *
 * @module core/test-scaffolder/framework-detector
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export type TestFramework = 'vitest' | 'jest' | 'mocha';

/**
 * Detect the test framework from package.json devDependencies.
 * Falls back to 'vitest' if none found (most common for TypeScript projects).
 */
export function detectTestFramework(projectRoot: string): TestFramework {
  const pkgPath = join(projectRoot, 'package.json');
  if (!existsSync(pkgPath)) {
    return 'vitest';
  }

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if ('vitest' in deps) return 'vitest';
    if ('jest' in deps || '@jest/core' in deps) return 'jest';
    if ('mocha' in deps) return 'mocha';
  } catch {
    // Ignore parse errors
  }

  return 'vitest';
}
