/**
 * Path utilities unit tests.
 *
 * Tests cross-platform path normalization, pattern variable extraction,
 * and mapping pattern application.
 */

import { describe, it, expect } from 'vitest';
import {
  toPosixPath,
  toPlatformPath,
  relativePosix,
  joinPosix,
  applyMappingPattern,
} from '../../src/infra/path-utils.js';

describe('toPosixPath', () => {
  it('should convert backslashes to forward slashes', () => {
    expect(toPosixPath('foo\\bar\\baz')).toBe('foo/bar/baz');
  });

  it('should leave forward slashes unchanged', () => {
    expect(toPosixPath('foo/bar/baz')).toBe('foo/bar/baz');
  });

  it('should handle empty string', () => {
    expect(toPosixPath('')).toBe('');
  });
});

describe('toPlatformPath', () => {
  it('should handle forward slashes', () => {
    const result = toPlatformPath('foo/bar/baz');
    // On any platform, the result should be a valid path
    expect(result).toBeDefined();
    expect(result).toContain('foo');
    expect(result).toContain('bar');
    expect(result).toContain('baz');
  });
});

describe('relativePosix', () => {
  it('should compute relative path with POSIX separators', () => {
    const result = relativePosix('/project/src', '/project/src/core/file.ts');
    expect(result).toBe('core/file.ts');
  });

  it('should handle parent directory references', () => {
    const result = relativePosix('/project/src/core', '/project/tests');
    expect(result).toBe('../../tests');
  });
});

describe('joinPosix', () => {
  it('should join path segments with POSIX separator', () => {
    const result = joinPosix('foo', 'bar', 'baz');
    expect(result).toBe('foo/bar/baz');
  });
});

describe('applyMappingPattern', () => {
  it('should substitute {module} and {name} vars', () => {
    const result = applyMappingPattern(
      'specs/order/create.feature',
      'specs/{module}/{name}.feature',
      'tests/{module}/{name}.test.ts',
    );
    expect(result).toBe('tests/order/create.test.ts');
  });

  it('should handle {Name} var when present in feature pattern', () => {
    // {Name} must appear in the feature pattern to be extracted
    const result = applyMappingPattern(
      'specs/order/Create.feature',
      'specs/{module}/{Name}.feature',
      'tests/{module}/{Name}Test.*',
    );
    expect(result).toBe('tests/order/CreateTest.*');
  });

  it('should return null when path does not match pattern', () => {
    const result = applyMappingPattern(
      'other/path/file.txt',
      'specs/{module}/{name}.feature',
      'tests/{module}/{name}.test.ts',
    );
    expect(result).toBeNull();
  });

  it('should handle patterns without variables', () => {
    const result = applyMappingPattern(
      'specs/readme.md',
      'specs/readme.md',
      'tests/readme.test.ts',
    );
    expect(result).toBe('tests/readme.test.ts');
  });
});
