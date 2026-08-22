/**
 * Tests for core/context-engine — project scanning and context generation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync, utimesSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { buildContext, loadContext, writeContextFile, refreshContext } from '../../src/core/context-engine/index.js';
import type { ContextFile } from '../../src/types/index.js';
import type { SpecLoreConfig } from '../../src/types/config.js';

const TEST_DIR = join(process.cwd(), '.test-context-tmp');

const mockConfig: SpecLoreConfig = {
  project: {
    name: 'test-project',
    language: 'typescript',
    framework: 'express',
    profile: 'normal',
    modules: {
      auth: {
        path: 'src/auth',
        responsibility: 'Authentication',
        dependsOn: [],
      },
    },
  },
  spec: {
    outputDir: 'specs',
    defaultLanguage: 'zh-CN',
    confidenceThreshold: 0.6,
  },
  verify: {
    command: 'npm test',
    timeout: 300,
    reportFormat: ['json', 'html'],
    mapping: { patterns: [] },
  },
};

const noModulesConfig: SpecLoreConfig = {
  ...mockConfig,
  project: { ...mockConfig.project, modules: {} },
};

function setupProjectDir(): void {
  mkdirSync(join(TEST_DIR, 'src', 'auth'), { recursive: true });
  writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({
    name: 'test-project',
    dependencies: { express: '^4.0.0' },
  }), 'utf-8');
}

function makeContext(overrides?: Partial<ContextFile>): ContextFile {
  return {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    generatedBy: 'speclore v0.1.0',
    projectSummary: {
      language: 'typescript',
      framework: 'express',
      buildTool: 'npm',
      testFramework: 'vitest',
      directoryStructure: 'src/\n  auth/',
    },
    moduleBoundaries: [{ name: 'auth', responsibility: 'Auth', dependsOn: [] }],
    existingCode: { entities: [], apis: [] },
    dependencyGraph: [],
    ...overrides,
  };
}

// ============================================================================
// buildContext
// ============================================================================

describe('buildContext', () => {
  beforeEach(() => {
    setupProjectDir();
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should build a context file', () => {
    const context = buildContext(TEST_DIR, mockConfig);
    expect(context).toBeDefined();
    expect(context.version).toBe('1.0');
    expect(context.generatedAt).toBeTruthy();
    expect(context.projectSummary).toBeDefined();
    expect(context.projectSummary.language).toBeTruthy();
  });

  it('should include module boundaries from config', () => {
    const context = buildContext(TEST_DIR, mockConfig);
    expect(context.moduleBoundaries.length).toBeGreaterThan(0);
    expect(context.moduleBoundaries[0].name).toBe('auth');
  });

  it('should handle project with no modules', () => {
    const context = buildContext(TEST_DIR, noModulesConfig);
    expect(context).toBeDefined();
    expect(context.moduleBoundaries).toEqual([]);
    expect(context.dependencyGraph).toEqual([]);
  });
});

// ============================================================================
// loadContext
// ============================================================================

describe('loadContext', () => {
  const specLoreDir = join(TEST_DIR, '.speclore');

  beforeEach(() => {
    mkdirSync(specLoreDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should return null when context.json does not exist', () => {
    const result = loadContext(specLoreDir);
    expect(result).toBeNull();
  });

  it('should return cached context when file exists and not expired', () => {
    const ctx = makeContext();
    writeFileSync(join(specLoreDir, 'context.json'), JSON.stringify(ctx), 'utf-8');

    // Write .git-head to prevent git-based expiry (loadContext checks hasGitHeadChanged)
    try {
      const head = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: TEST_DIR, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      writeFileSync(join(specLoreDir, '.git-head'), head, 'utf-8');
    } catch {
      // Not in a git repo — skip .git-head writing
    }

    const result = loadContext(specLoreDir);
    expect(result).not.toBeNull();
    expect(result!.version).toBe('1.0');
    expect(result!.projectSummary.language).toBe('typescript');
  });

  it('should return null when cache is expired', () => {
    const ctx = makeContext();
    const contextPath = join(specLoreDir, 'context.json');
    writeFileSync(contextPath, JSON.stringify(ctx), 'utf-8');

    // Set mtime to 2 hours ago (expiry is 1 hour)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    utimesSync(contextPath, twoHoursAgo, twoHoursAgo);

    const result = loadContext(specLoreDir);
    expect(result).toBeNull();
  });

  it('should return null for invalid JSON', () => {
    writeFileSync(join(specLoreDir, 'context.json'), 'not valid json{{{', 'utf-8');

    const result = loadContext(specLoreDir);
    expect(result).toBeNull();
  });
});

// ============================================================================
// writeContextFile
// ============================================================================

describe('writeContextFile', () => {
  const specLoreDir = join(TEST_DIR, '.speclore');

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should write context.json to disk', () => {
    mkdirSync(specLoreDir, { recursive: true });
    const ctx = makeContext();

    writeContextFile(specLoreDir, ctx);

    const contextPath = join(specLoreDir, 'context.json');
    expect(existsSync(contextPath)).toBe(true);

    const written = JSON.parse(readFileSync(contextPath, 'utf-8')) as ContextFile;
    expect(written.version).toBe('1.0');
    expect(written.projectSummary.language).toBe('typescript');
  });

  it('should create .speclore directory if not exists', () => {
    expect(existsSync(specLoreDir)).toBe(false);

    const ctx = makeContext();
    writeContextFile(specLoreDir, ctx);

    expect(existsSync(specLoreDir)).toBe(true);
    expect(existsSync(join(specLoreDir, 'context.json'))).toBe(true);
  });
});

// ============================================================================
// refreshContext
// ============================================================================

describe('refreshContext', () => {
  const specLoreDir = join(TEST_DIR, '.speclore');

  beforeEach(() => {
    setupProjectDir();
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should return cached context when available', () => {
    mkdirSync(specLoreDir, { recursive: true });
    const ctx = makeContext();
    writeFileSync(join(specLoreDir, 'context.json'), JSON.stringify(ctx), 'utf-8');

    // Write .git-head to prevent git-based expiry
    try {
      const head = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: TEST_DIR, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      writeFileSync(join(specLoreDir, '.git-head'), head, 'utf-8');
    } catch {
      // Not in a git repo
    }

    const result = refreshContext(TEST_DIR, specLoreDir, mockConfig);
    expect(result.version).toBe('1.0');
    expect(result.projectSummary.language).toBe('typescript');
  });

  it('should rebuild and write when cache miss', () => {
    // No cache exists
    expect(existsSync(join(specLoreDir, 'context.json'))).toBe(false);

    const result = refreshContext(TEST_DIR, specLoreDir, mockConfig);
    expect(result).toBeDefined();
    expect(result.version).toBe('1.0');
    expect(result.projectSummary.language).toBeTruthy();

    // Should have written the cache file
    expect(existsSync(join(specLoreDir, 'context.json'))).toBe(true);
  });
});
