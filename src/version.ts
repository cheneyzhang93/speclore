/**
 * Single source of truth for SpecLore version.
 *
 * Reads version from package.json at runtime, working both in
 * source (src/version.ts) and built (dist/version.js) contexts.
 *
 * @module version
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

function readVersion(): string {
  let currentDir = dirname(fileURLToPath(import.meta.url));

  // Walk up to find package.json (handles dist/, dist/cli/, dist/mcp/, src/)
  for (let depth = 0; depth < 4; depth++) {
    try {
      const pkgPath = join(currentDir, 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
      if (typeof pkg.version === 'string') return pkg.version;
    } catch {
      // try parent
    }
    currentDir = join(currentDir, '..');
  }
  return '0.0.0';
}

export const VERSION: string = readVersion();
