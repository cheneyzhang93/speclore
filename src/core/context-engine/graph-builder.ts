/**
 * Graph builder — scans project structure to build dependency graph and detect project info.
 *
 * @module core/context-engine/graph-builder
 */

import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join, basename, extname, relative } from 'node:path';
import type { GraphEdge, EntityInfo, ApiInfo } from '../../types/index.js';
import { logger } from '../../infra/logger.js';
import { toPosixPath } from '../../infra/path-utils.js';

/** Detected project information */
export interface ProjectInfo {
  language: string;
  framework: string;
  buildTool: string;
  testFramework: string;
  directoryStructure: string;
}

/**
 * Detect project language, framework, build tool, and test framework.
 */
export function detectProjectInfo(projectRoot: string): ProjectInfo {
  const info: ProjectInfo = {
    language: 'unknown',
    framework: 'unknown',
    buildTool: 'unknown',
    testFramework: 'unknown',
    directoryStructure: '',
  };

  // Language detection
  if (existsSync(join(projectRoot, 'package.json'))) {
    info.language = 'typescript';
    info.buildTool = 'npm';

    try {
      const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8')) as Record<string, Record<string, string> | undefined>;
      const deps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies };

      if ('next' in deps) info.framework = 'next.js';
      else if ('@nestjs/core' in deps) info.framework = 'nestjs';
      else if ('express' in deps) info.framework = 'express';
      else if ('react' in deps) info.framework = 'react';
      else if ('vue' in deps) info.framework = 'vue';
      else if ('nuxt' in deps) info.framework = 'nuxt';

      if ('vitest' in deps || 'jest' in deps) info.testFramework = 'vitest' in deps ? 'vitest' : 'jest';
    } catch {
      logger.debug('Failed to parse package.json, using default project info');
    }
  } else if (existsSync(join(projectRoot, 'pom.xml'))) {
    info.language = 'java';
    info.buildTool = 'maven';
    info.testFramework = 'junit';

    // Try to detect Spring Boot from pom.xml
    try {
      const pom = readFileSync(join(projectRoot, 'pom.xml'), 'utf-8');
      if (pom.includes('spring-boot')) info.framework = 'spring-boot';
    } catch { /* ignore */ }
  } else if (existsSync(join(projectRoot, 'build.gradle')) || existsSync(join(projectRoot, 'build.gradle.kts'))) {
    info.language = 'java';
    info.buildTool = 'gradle';
    info.testFramework = 'junit';
  } else if (existsSync(join(projectRoot, 'go.mod'))) {
    info.language = 'go';
    info.buildTool = 'go';
    info.testFramework = 'go-test';
  } else if (existsSync(join(projectRoot, 'Cargo.toml'))) {
    info.language = 'rust';
    info.buildTool = 'cargo';
    info.testFramework = 'cargo-test';
  } else if (existsSync(join(projectRoot, 'requirements.txt')) || existsSync(join(projectRoot, 'pyproject.toml'))) {
    info.language = 'python';
    info.buildTool = 'pip';
    info.testFramework = 'pytest';

    try {
      const reqs = existsSync(join(projectRoot, 'requirements.txt'))
        ? readFileSync(join(projectRoot, 'requirements.txt'), 'utf-8')
        : readFileSync(join(projectRoot, 'pyproject.toml'), 'utf-8');
      if (reqs.includes('django')) info.framework = 'django';
      else if (reqs.includes('flask')) info.framework = 'flask';
      else if (reqs.includes('fastapi')) info.framework = 'fastapi';
    } catch { /* ignore */ }
  }

  // Build directory structure summary (≤ 50 lines)
  info.directoryStructure = buildDirectorySummary(projectRoot, '', 2, 50);

  logger.debug(`Detected project: ${info.language} / ${info.framework} / ${info.buildTool}`);
  return info;
}

/**
 * Build a human-readable directory structure summary.
 */
function buildDirectorySummary(
  root: string,
  _prefix: string,
  maxDepth: number,
  maxLines: number,
): string {
  const lines: string[] = [];

  function walk(dir: string, indent: string, depth: number): void {
    if (depth > maxDepth || lines.length >= maxLines) return;

    let entries: string[];
    try {
      entries = readdirSync(dir)
        .filter(e => !e.startsWith('.') && e !== 'node_modules' && e !== '__pycache__')
        .sort();
    } catch {
      return;
    }

    for (const entry of entries) {
      if (lines.length >= maxLines) return;

      const fullPath = join(dir, entry);
      const isDir = statSync(fullPath).isDirectory();
      const display = isDir ? `${entry}/` : entry;
      lines.push(`${indent}${display}`);

      if (isDir) {
        walk(fullPath, indent + '  ', depth + 1);
      }
    }
  }

  walk(root, '', 0);
  return lines.slice(0, maxLines).join('\n');
}

/**
 * Build dependency graph by scanning imports in source files.
 */
export function buildDependencyGraph(
  projectRoot: string,
  modules: Array<{ name: string; path: string; dependsOn: string[] }>,
): GraphEdge[] {
  const edges: GraphEdge[] = [];

  // First, use declared dependencies from config
  for (const mod of modules) {
    for (const dep of mod.dependsOn) {
      edges.push({
        from: mod.name,
        to: dep,
        type: 'import',
      });
    }
  }

  // Then, try to detect additional dependencies from imports
  for (const mod of modules) {
    const modPath = join(projectRoot, mod.path);
    if (!existsSync(modPath)) continue;

    try {
      const imports = scanImports(modPath);
      for (const otherMod of modules) {
        if (otherMod.name === mod.name) continue;

        // Check if any import references the other module's path
        const otherPath = otherMod.path.replace(/\\/g, '/');
        const hasImport = imports.some(imp => imp.includes(otherPath) || imp.includes(otherMod.name));

        if (hasImport && !edges.some(e => e.from === mod.name && e.to === otherMod.name)) {
          edges.push({
            from: mod.name,
            to: otherMod.name,
            type: 'import',
          });
        }
      }
    } catch {
      // Skip module on scan error
    }
  }

  return edges;
}

/**
 * Scan a directory for import statements and return imported paths.
 */
function scanImports(dir: string): string[] {
  const imports: string[] = [];

  function walk(d: string): void {
    let entries: string[];
    try {
      entries = readdirSync(d);
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(d, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
        continue;
      }

      const ext = extname(entry);
      if (!['.ts', '.tsx', '.js', '.jsx', '.java', '.py'].includes(ext)) continue;

      try {
        const content = readFileSync(fullPath, 'utf-8');
        // Match import/require patterns
        const importRegex = /(?:import\s+.*?from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
          const imported = match[1] ?? match[2];
          if (imported) imports.push(imported);
        }
      } catch {
        // Skip unreadable files
      }
    }
  }

  walk(dir);
  return imports;
}

/**
 * Recursively read all files in a directory (Node 18 compatible).
 */
function readDirRecursive(dir: string): string[] {
  const files: string[] = [];
  function walk(d: string): void {
    try {
      const entries = readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(d, entry.name);
        if (entry.isDirectory()) walk(fullPath);
        else files.push(fullPath);
      }
    } catch { /* skip unreadable dirs */ }
  }
  walk(dir);
  return files;
}

/** Supported source file extensions for heuristic analysis */
const ANALYZABLE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.java', '.py']);

/**
 * Analyze a single file for entity declarations (content-level heuristic).
 * Supports TypeScript/JavaScript, Java, and Python.
 */
function analyzeFileForEntities(
  filePath: string,
  modName: string,
  modPath: string,
  modRelativePath: string,
): EntityInfo[] {
  const entities: EntityInfo[] = [];
  const ext = extname(filePath);
  const name = basename(filePath, ext);

  if (!ANALYZABLE_EXTENSIONS.has(ext)) return entities;

  try {
    const content = readFileSync(filePath, 'utf-8');
    const relFile = toPosixPath(join(modRelativePath, relative(modPath, filePath)));

    // Layer 1: File name suffix (fast path)
    if (/(?:Entity|Model|Domain|Schema)$/i.test(name)) {
      entities.push({ name, module: modName, file: relFile });
      return entities;
    }

    // Layer 2: Decorator/annotation-based detection
    if (ext === '.java') {
      // Java: @Entity annotation (JPA/Hibernate)
      const javaMatch = content.match(/@Entity(?:\([^)]*\))?\s*(?:public\s+)?(?:abstract\s+)?class\s+(\w+)/);
      if (javaMatch?.[1]) {
        entities.push({ name: javaMatch[1], module: modName, file: relFile });
        return entities;
      }
    } else if (ext === '.py') {
      // Python: Django models.Model or SQLAlchemy Base
      const pyMatch = content.match(/class\s+(\w+)\s*\(\s*(?:models\.Model|Base|declarative_base\(\))\s*\)/);
      if (pyMatch?.[1]) {
        entities.push({ name: pyMatch[1], module: modName, file: relFile });
        return entities;
      }
    } else {
      // TypeScript/JavaScript: @Entity() / @Schema() decorators (TypeORM / Mongoose)
      // /s flag allows . to match newlines for multiline decorator args
      if (/@Entity\(|@Schema\(/.test(content)) {
        const classMatch = content.match(/@(?:Entity|Schema)\([^)]*\)\s*(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/s);
        if (classMatch?.[1]) {
          entities.push({ name: classMatch[1], module: modName, file: relFile });
          return entities;
        }
      }
    }

    // Layer 3: Class inheritance heuristic
    if (ext === '.java') {
      const extendsMatch = content.match(/class\s+(\w+)\s+extends\s+\w*(?:Base)?(?:Entity|Model)\b/);
      if (extendsMatch?.[1]) {
        entities.push({ name: extendsMatch[1], module: modName, file: relFile });
      }
    } else if (ext === '.py') {
      const extendsMatch = content.match(/class\s+(\w+)\s*\(\s*\w*(?:Base|Model)\w*\s*\)/);
      if (extendsMatch?.[1] && !/Test|Mock|Fake/i.test(extendsMatch[1])) {
        entities.push({ name: extendsMatch[1], module: modName, file: relFile });
      }
    } else {
      const extendsMatch = content.match(/class\s+(\w+)\s+extends\s+\w*(?:Base)?(?:Entity|Model|Document)\b/);
      if (extendsMatch?.[1]) {
        entities.push({ name: extendsMatch[1], module: modName, file: relFile });
      }
    }
  } catch {
    // Skip unreadable files
  }

  return entities;
}

/**
 * Analyze a single file for API route declarations (content-level heuristic).
 * Supports Express, NestJS, Java Spring, and Python Flask/Django.
 */
function analyzeFileForApis(
  filePath: string,
  modName: string,
  modPath: string,
  modRelativePath: string,
): ApiInfo[] {
  const apis: ApiInfo[] = [];
  const ext = extname(filePath);
  const name = basename(filePath, ext);

  if (!ANALYZABLE_EXTENSIONS.has(ext)) return apis;

  try {
    const content = readFileSync(filePath, 'utf-8');
    const relFile = toPosixPath(join(modRelativePath, relative(modPath, filePath)));

    // Layer 1: File name suffix (fast path) — default to GET
    if (/Controller|Resource|Handler|Route$/i.test(name)) {
      apis.push({
        method: 'GET',
        path: `/${modName}/${name.toLowerCase()}`,
        module: modName,
        file: relFile,
      });
    }

    // Layer 2: Express-style route definitions
    // Handles: router.get('/path', middleware, handler) and router.get('/path', handler)
    const expressRegex = /(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]\s*[,)]/gi;
    let match;
    while ((match = expressRegex.exec(content)) !== null) {
      const method = (match[1] ?? 'get').toUpperCase();
      const routePath = match[2]!;
      apis.push({
        method,
        path: routePath,
        module: modName,
        file: relFile,
      });
    }

    // Layer 3: NestJS decorator-based routes
    const nestjsRegex = /@(Get|Post|Put|Patch|Delete)\s*\(\s*['"`]([^'"`]*)['"`]\s*\)/g;
    while ((match = nestjsRegex.exec(content)) !== null) {
      const method = (match[1] ?? 'Get').toUpperCase();
      const routePath = match[2] ?? '';
      apis.push({
        method,
        path: routePath || `/${modName}`,
        module: modName,
        file: relFile,
      });
    }

    // Layer 4: Java Spring MVC annotations
    if (ext === '.java') {
      const springRegex = /@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping)(?:\s*\(\s*(?:value\s*=\s*)?['"`]([^'"`]*)['""])?/g;
      while ((match = springRegex.exec(content)) !== null) {
        const annotation = match[1]!;
        const method = annotation.replace(/Mapping$/, '').toUpperCase() || 'GET';
        const routePath = match[2] ?? '';
        apis.push({
          method,
          path: routePath || `/${modName}`,
          module: modName,
          file: relFile,
        });
      }
    }

    // Layer 5: Python Flask/Django route decorators
    if (ext === '.py') {
      const flaskRegex = /@(\w+)\.route\s*\(\s*['"`]([^'"`]+)['"`]/g;
      while ((match = flaskRegex.exec(content)) !== null) {
        const routePath = match[2]!;
        // Flask defaults to GET unless methods= is specified
        const methodsMatch = content.slice(match.index).match(/methods\s*=\s*\[([^\]]+)\]/);
        let method = 'GET';
        if (methodsMatch?.[1]) {
          // Take the first method from the list
          const firstMethod = methodsMatch[1].match(/['"](\w+)['"]/)?.[1];
          if (firstMethod) method = firstMethod.toUpperCase();
        }
        apis.push({
          method,
          path: routePath,
          module: modName,
          file: relFile,
        });
      }
    }
  } catch {
    // Skip unreadable files
  }

  return apis;
}

/**
 * Extract entity info from source files.
 * Uses multi-layer heuristics: file name suffix, decorators, class inheritance.
 */
export function extractEntities(
  projectRoot: string,
  modules: Array<{ name: string; path: string }>,
): EntityInfo[] {
  const entities: EntityInfo[] = [];
  const seen = new Set<string>();

  for (const mod of modules) {
    const modPath = join(projectRoot, mod.path);
    if (!existsSync(modPath)) continue;

    try {
      const files = readDirRecursive(modPath);
      for (const file of files) {
        const found = analyzeFileForEntities(file, mod.name, modPath, mod.path);
        for (const entity of found) {
          const key = `${entity.module}:${entity.name}`;
          if (!seen.has(key)) {
            seen.add(key);
            entities.push(entity);
          }
        }
      }
    } catch {
      // Skip module on error
    }
  }

  return entities;
}

/**
 * Extract API info from source files.
 * Uses multi-layer heuristics: file name suffix, Express routes, NestJS decorators.
 */
export function extractApis(
  projectRoot: string,
  modules: Array<{ name: string; path: string }>,
): ApiInfo[] {
  const apis: ApiInfo[] = [];
  const seen = new Set<string>();

  for (const mod of modules) {
    const modPath = join(projectRoot, mod.path);
    if (!existsSync(modPath)) continue;

    try {
      const files = readDirRecursive(modPath);
      for (const file of files) {
        const found = analyzeFileForApis(file, mod.name, modPath, mod.path);
        for (const api of found) {
          const key = `${api.method}:${api.path}:${api.module}`;
          if (!seen.has(key)) {
            seen.add(key);
            apis.push(api);
          }
        }
      }
    } catch {
      // Skip module on error
    }
  }

  return apis;
}
