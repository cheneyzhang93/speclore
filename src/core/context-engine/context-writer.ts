/**
 * Context writer — generates and caches context.json.
 *
 * @module core/context-engine/context-writer
 */

import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import type { ContextFile, SpecLoreConfig } from '../../types/index.js';
import { logger } from '../../infra/logger.js';
import { readModuleConfig } from './config-reader.js';
import { detectProjectInfo, buildDependencyGraph, extractEntities, extractApis } from './graph-builder.js';
import { VERSION } from '../../version.js';

const CONTEXT_FILENAME = 'context.json';
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const MAX_CONTEXT_SIZE = 50 * 1024; // 50KB

/**
 * Build a complete project context from scratch.
 */
export function buildContext(projectRoot: string, config: SpecLoreConfig): ContextFile {
  logger.info('Building project context...');

  // Detect project info
  const projectInfo = detectProjectInfo(projectRoot);

  // Read module config
  const moduleBoundaries = readModuleConfig(config);

  // Build module list for scanning
  const moduleList = Object.entries(config.project.modules).map(([name, mod]) => ({
    name,
    path: mod.path,
    dependsOn: mod.dependsOn ?? [],
  }));

  // Build dependency graph
  const dependencyGraph = buildDependencyGraph(projectRoot, moduleList);

  // Extract entities and APIs
  const entities = extractEntities(projectRoot, moduleList);
  const apis = extractApis(projectRoot, moduleList);

  const contextFile: ContextFile = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    generatedBy: `speclore v${VERSION}`,
    projectSummary: {
      language: projectInfo.language,
      framework: projectInfo.framework,
      buildTool: projectInfo.buildTool,
      testFramework: projectInfo.testFramework,
      directoryStructure: projectInfo.directoryStructure,
    },
    moduleBoundaries,
    existingCode: {
      entities: entities.map(e => ({ name: e.name, module: e.module, file: e.file })),
      apis: apis.map(a => ({ method: a.method, path: a.path, module: a.module, file: a.file })),
    },
    dependencyGraph,
  };

  // Enforce size limit
  const json = JSON.stringify(contextFile, null, 2);
  if (json.length > MAX_CONTEXT_SIZE) {
    logger.warn(`Context file exceeds ${MAX_CONTEXT_SIZE} bytes, truncating...`);
    contextFile.projectSummary.directoryStructure = truncateTo(
      contextFile.projectSummary.directoryStructure,
      20,
    );
  }

  return contextFile;
}

/**
 * Load context from cache (context.json).
 * Returns null if cache doesn't exist or is expired.
 */
export function loadContext(specLoreDir: string): ContextFile | null {
  const contextPath = join(specLoreDir, CONTEXT_FILENAME);

  if (!existsSync(contextPath)) {
    logger.debug('No cached context.json found');
    return null;
  }

  // Check expiry
  const stat = statSync(contextPath);
  const age = Date.now() - stat.mtimeMs;
  if (age > CACHE_EXPIRY_MS) {
    logger.debug(`Context cache expired (age: ${Math.round(age / 60000)}min)`);
    return null;
  }

  // Check git HEAD change
  if (hasGitHeadChanged(specLoreDir)) {
    logger.debug('Git HEAD changed since last context build');
    return null;
  }

  try {
    const content = readFileSync(contextPath, 'utf-8');
    const context = JSON.parse(content) as ContextFile;
    logger.debug('Loaded cached context.json');
    return context;
  } catch {
    logger.warn('Failed to parse cached context.json, will rebuild');
    return null;
  }
}

/**
 * Write context.json to disk.
 */
export function writeContextFile(specLoreDir: string, context: ContextFile): void {
  if (!existsSync(specLoreDir)) {
    mkdirSync(specLoreDir, { recursive: true });
  }

  const contextPath = join(specLoreDir, CONTEXT_FILENAME);
  writeFileSync(contextPath, JSON.stringify(context, null, 2), 'utf-8');
  logger.info(`Context written to ${contextPath}`);
}

/**
 * Refresh context: load from cache or rebuild.
 */
export function refreshContext(
  projectRoot: string,
  specLoreDir: string,
  config: SpecLoreConfig,
): ContextFile {
  const cached = loadContext(specLoreDir);
  if (cached) return cached;

  const context = buildContext(projectRoot, config);
  writeContextFile(specLoreDir, context);
  return context;
}

/**
 * Check if git HEAD has changed since context was last built.
 */
function hasGitHeadChanged(specLoreDir: string): boolean {
  try {
    const projectRoot = join(specLoreDir, '..');
    const head = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    const headFile = join(specLoreDir, '.git-head');
    if (!existsSync(headFile)) return true;

    const savedHead = readFileSync(headFile, 'utf-8').trim();
    if (savedHead !== head) {
      // Update saved HEAD
      writeFileSync(headFile, head, 'utf-8');
      return true;
    }

    return false;
  } catch {
    // Not a git repo or git not available — don't use git-based expiry
    return false;
  }
}

/**
 * Truncate a string to a maximum number of lines.
 */
function truncateTo(text: string, maxLines: number): string {
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;
  return lines.slice(0, maxLines).join('\n') + `\n... (${lines.length - maxLines} more lines)`;
}
