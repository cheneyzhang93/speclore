/**
 * Tests for core/context-engine/graph-builder — project detection, entity/API extraction.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  detectProjectInfo,
  buildDependencyGraph,
  extractEntities,
  extractApis,
} from '../../src/core/context-engine/graph-builder.js';

const TEST_DIR = join(process.cwd(), '.test-graph-tmp');

describe('detectProjectInfo', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should detect TypeScript + Express + Vitest project', () => {
    writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({
      name: 'test-project',
      dependencies: { express: '^4.0.0' },
      devDependencies: { vitest: '^1.0.0' },
    }), 'utf-8');

    const info = detectProjectInfo(TEST_DIR);
    expect(info.language).toBe('typescript');
    expect(info.framework).toBe('express');
    expect(info.testFramework).toBe('vitest');
  });

  it('should detect NestJS framework', () => {
    writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({
      name: 'test-project',
      dependencies: { '@nestjs/core': '^10.0.0' },
    }), 'utf-8');

    const info = detectProjectInfo(TEST_DIR);
    expect(info.framework).toBe('nestjs');
  });

  it('should detect Next.js framework', () => {
    writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({
      name: 'test-project',
      dependencies: { next: '^14.0.0' },
    }), 'utf-8');

    const info = detectProjectInfo(TEST_DIR);
    expect(info.framework).toBe('next.js');
  });

  it('should detect React framework', () => {
    writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({
      name: 'test-project',
      dependencies: { react: '^18.0.0' },
    }), 'utf-8');

    const info = detectProjectInfo(TEST_DIR);
    expect(info.framework).toBe('react');
  });

  it('should detect Vue framework', () => {
    writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({
      name: 'test-project',
      dependencies: { vue: '^3.0.0' },
    }), 'utf-8');

    const info = detectProjectInfo(TEST_DIR);
    expect(info.framework).toBe('vue');
  });

  it('should detect jest test framework', () => {
    writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({
      name: 'test-project',
      devDependencies: { jest: '^29.0.0' },
    }), 'utf-8');

    const info = detectProjectInfo(TEST_DIR);
    expect(info.testFramework).toBe('jest');
  });

  it('should return unknowns when no package.json exists', () => {
    const info = detectProjectInfo(TEST_DIR);
    expect(info.language).toBe('unknown');
    expect(info.framework).toBe('unknown');
  });

  it('should include directory structure', () => {
    writeFileSync(join(TEST_DIR, 'package.json'), '{}', 'utf-8');
    mkdirSync(join(TEST_DIR, 'src'), { recursive: true });

    const info = detectProjectInfo(TEST_DIR);
    expect(info.directoryStructure).toBeTruthy();
    expect(info.directoryStructure).toContain('src');
  });
});

describe('extractEntities', () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, 'src', 'auth', 'models'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'src', 'order'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should find files with Entity suffix', () => {
    writeFileSync(join(TEST_DIR, 'src', 'auth', 'UserEntity.ts'), 'export class UserEntity {}', 'utf-8');
    writeFileSync(join(TEST_DIR, 'src', 'auth', 'OrderEntity.ts'), 'export class OrderEntity {}', 'utf-8');

    const entities = extractEntities(TEST_DIR, [{ name: 'auth', path: 'src/auth' }]);
    expect(entities.length).toBe(2);
    expect(entities.map(e => e.name)).toContain('UserEntity');
    expect(entities.map(e => e.name)).toContain('OrderEntity');
  });

  it('should find files with Model suffix', () => {
    writeFileSync(join(TEST_DIR, 'src', 'auth', 'UserModel.ts'), 'export class UserModel {}', 'utf-8');

    const entities = extractEntities(TEST_DIR, [{ name: 'auth', path: 'src/auth' }]);
    expect(entities.length).toBe(1);
    expect(entities[0].name).toBe('UserModel');
  });

  it('should find files in subdirectories (recursive)', () => {
    writeFileSync(join(TEST_DIR, 'src', 'auth', 'models', 'UserEntity.ts'), 'export class UserEntity {}', 'utf-8');

    const entities = extractEntities(TEST_DIR, [{ name: 'auth', path: 'src/auth' }]);
    expect(entities.length).toBe(1);
    expect(entities[0].name).toBe('UserEntity');
  });

  it('should return project-relative paths, not absolute paths', () => {
    writeFileSync(join(TEST_DIR, 'src', 'auth', 'UserEntity.ts'), 'export class UserEntity {}', 'utf-8');

    const entities = extractEntities(TEST_DIR, [{ name: 'auth', path: 'src/auth' }]);
    expect(entities.length).toBe(1);
    // Path should be relative like "src/auth/UserEntity.ts", not absolute
    expect(entities[0].file).not.toContain(TEST_DIR);
    expect(entities[0].file).toContain('src/auth');
    expect(entities[0].file).toMatch(/src\/auth\/.*UserEntity\.ts/);
  });

  it('should set correct module name', () => {
    writeFileSync(join(TEST_DIR, 'src', 'auth', 'UserEntity.ts'), '', 'utf-8');

    const entities = extractEntities(TEST_DIR, [{ name: 'auth', path: 'src/auth' }]);
    expect(entities[0].module).toBe('auth');
  });

  it('should skip non-existent module paths', () => {
    const entities = extractEntities(TEST_DIR, [{ name: 'nonexistent', path: 'src/nonexistent' }]);
    expect(entities).toEqual([]);
  });

  it('should handle multiple modules', () => {
    writeFileSync(join(TEST_DIR, 'src', 'auth', 'UserEntity.ts'), '', 'utf-8');
    writeFileSync(join(TEST_DIR, 'src', 'order', 'OrderSchema.ts'), '', 'utf-8');

    const entities = extractEntities(TEST_DIR, [
      { name: 'auth', path: 'src/auth' },
      { name: 'order', path: 'src/order' },
    ]);
    expect(entities.length).toBe(2);
  });
});

describe('extractApis', () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, 'src', 'auth'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should find files with Controller suffix', () => {
    writeFileSync(join(TEST_DIR, 'src', 'auth', 'AuthController.ts'), '', 'utf-8');

    const apis = extractApis(TEST_DIR, [{ name: 'auth', path: 'src/auth' }]);
    expect(apis.length).toBe(1);
    expect(apis[0].name).toBeUndefined(); // ApiInfo doesn't have name, it has method/path
    expect(apis[0].module).toBe('auth');
  });

  it('should find files with Handler suffix', () => {
    writeFileSync(join(TEST_DIR, 'src', 'auth', 'LoginHandler.ts'), '', 'utf-8');

    const apis = extractApis(TEST_DIR, [{ name: 'auth', path: 'src/auth' }]);
    expect(apis.length).toBe(1);
  });

  it('should find files with Route suffix', () => {
    writeFileSync(join(TEST_DIR, 'src', 'auth', 'UserRoute.ts'), '', 'utf-8');

    const apis = extractApis(TEST_DIR, [{ name: 'auth', path: 'src/auth' }]);
    expect(apis.length).toBe(1);
  });

  it('should return project-relative paths', () => {
    writeFileSync(join(TEST_DIR, 'src', 'auth', 'AuthController.ts'), '', 'utf-8');

    const apis = extractApis(TEST_DIR, [{ name: 'auth', path: 'src/auth' }]);
    expect(apis[0].file).not.toContain(TEST_DIR);
    expect(apis[0].file).toMatch(/src\/auth\/.*AuthController\.ts/);
  });

  it('should set default GET method', () => {
    writeFileSync(join(TEST_DIR, 'src', 'auth', 'AuthController.ts'), '', 'utf-8');

    const apis = extractApis(TEST_DIR, [{ name: 'auth', path: 'src/auth' }]);
    expect(apis[0].method).toBe('GET');
  });
});

describe('buildDependencyGraph', () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, 'src', 'auth'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'src', 'order'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should create edges from declared dependencies', () => {
    const modules = [
      { name: 'auth', path: 'src/auth', dependsOn: [] },
      { name: 'order', path: 'src/order', dependsOn: ['auth'] },
    ];

    const edges = buildDependencyGraph(TEST_DIR, modules);
    expect(edges.length).toBeGreaterThanOrEqual(1);
    expect(edges).toContainEqual({
      from: 'order',
      to: 'auth',
      type: 'import',
    });
  });

  it('should detect import-based dependencies', () => {
    // Write a file in order that imports from auth
    writeFileSync(
      join(TEST_DIR, 'src', 'order', 'service.ts'),
      "import { AuthService } from '../auth/service';\n",
      'utf-8',
    );

    const modules = [
      { name: 'auth', path: 'src/auth', dependsOn: [] },
      { name: 'order', path: 'src/order', dependsOn: [] }, // No declared dep
    ];

    const edges = buildDependencyGraph(TEST_DIR, modules);
    // Should detect the import-based dependency
    const importEdge = edges.find(e => e.from === 'order' && e.to === 'auth');
    expect(importEdge).toBeDefined();
  });

  it('should not create duplicate edges', () => {
    writeFileSync(
      join(TEST_DIR, 'src', 'order', 'service.ts'),
      "import { AuthService } from '../auth/service';\nimport { UserRepo } from '../auth/repo';\n",
      'utf-8',
    );

    const modules = [
      { name: 'auth', path: 'src/auth', dependsOn: [] },
      { name: 'order', path: 'src/order', dependsOn: ['auth'] }, // Already declared
    ];

    const edges = buildDependencyGraph(TEST_DIR, modules);
    const orderToAuth = edges.filter(e => e.from === 'order' && e.to === 'auth');
    expect(orderToAuth.length).toBe(1);
  });

  it('should return empty array for non-existent module paths', () => {
    const modules = [
      { name: 'nonexistent', path: 'src/nonexistent', dependsOn: [] },
    ];

    const edges = buildDependencyGraph(TEST_DIR, modules);
    expect(edges).toEqual([]);
  });
});
