/**
 * Cross-platform path utilities.
 *
 * Handles Windows / POSIX path normalization, relative path computation,
 * and glob pattern matching for SpecLore's file operations.
 *
 * @module infra/path-utils
 */

import { posix, sep, relative, resolve, isAbsolute, join } from 'node:path';
import { glob, globSync } from 'glob';

/**
 * Normalize a path to use forward slashes (POSIX-style).
 * SpecLore stores all paths internally as POSIX for consistency.
 */
export function toPosixPath(p: string): string {
  return p.split(sep).join(posix.sep);
}

/**
 * Normalize a path to the current platform's separator.
 */
export function toPlatformPath(p: string): string {
  if (sep === posix.sep) {
    return p;
  }
  return p.split(posix.sep).join(sep);
}

/**
 * Compute a relative path from `from` to `to`, returning POSIX-style result.
 */
export function relativePosix(from: string, to: string): string {
  return toPosixPath(relative(from, to));
}

/**
 * Resolve a path relative to a base directory, returning POSIX-style result.
 */
export function resolvePosix(base: string, ...segments: string[]): string {
  return toPosixPath(resolve(base, ...segments));
}

/**
 * Join path segments, returning POSIX-style result.
 */
export function joinPosix(...segments: string[]): string {
  return toPosixPath(join(...segments));
}

/**
 * Check if a path is absolute (platform-aware).
 */
export { isAbsolute };

/**
 * Expand a glob pattern and return matching file paths (POSIX-style).
 */
export async function expandGlob(pattern: string, cwd?: string): Promise<string[]> {
  const matches = await glob(pattern, {
    cwd: cwd ?? process.cwd(),
    absolute: true,
    nodir: true,
  });
  return matches.map(toPosixPath);
}

/**
 * Expand a glob pattern synchronously.
 */
export function expandGlobSync(pattern: string, cwd?: string): string[] {
  const matches = globSync(pattern, {
    cwd: cwd ?? process.cwd(),
    absolute: true,
    nodir: true,
  });
  return matches.map(toPosixPath);
}

/**
 * Apply a mapping pattern to derive a test path from a feature path.
 *
 * Pattern variables:
 *   {module} — module name (directory segment)
 *   {name}   — file name without extension
 *   {Name}   — file name without extension, first letter capitalized
 *
 * Example:
 *   feature: "specs/order/create.feature"
 *   pattern: "tests/{module}/{Name}Test.*"
 *   result:  "tests/order/CreateTest.*"  (glob-ready)
 */
export function applyMappingPattern(
  featurePath: string,
  featurePattern: string,
  testPattern: string,
): string | null {
  // Extract variables from the feature pattern
  const vars = extractPatternVars(featurePath, featurePattern);
  if (!vars) return null;

  // Apply variables to the test pattern
  let result = testPattern;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }

  return result;
}

/**
 * Extract pattern variables ({module}, {name}, {Name}) from a concrete path
 * by matching it against a pattern template.
 */
function extractPatternVars(
  concretePath: string,
  pattern: string,
): Record<string, string> | null {
  // Convert pattern to regex, capturing variable segments
  const vars: string[] = [];
  const regexStr = pattern
    .replace(/\{(\w+)}/g, (_, varName: string) => {
      vars.push(varName);
      return '([^/]+)';
    })
    // Escape dots for regex
    .replace(/\./g, '\\.')
    // Handle * wildcard in patterns like "Test.*"
    .replace(/\*/g, '.*');

  const regex = new RegExp(`^${regexStr}$`);
  const match = concretePath.match(regex);
  if (!match) return null;

  const result: Record<string, string> = {};
  for (let i = 0; i < vars.length; i++) {
    const varName = vars[i]!;
    const value = match[i + 1] ?? '';

    // Handle {Name} — capitalize first letter of {name}
    if (varName === 'Name' && result['name']) {
      result[varName] = result['name'].charAt(0).toUpperCase() + result['name'].slice(1);
    } else {
      result[varName] = value;
    }
  }

  return result;
}
