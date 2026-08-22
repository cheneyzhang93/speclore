/**
 * M5: Project Context Engine.
 *
 * Scans the target project to build a comprehensive context:
 * - Language / framework detection
 * - Module structure from config.yaml + directory scanning
 * - Dependency graph inference
 * - Entity and API extraction
 * - context.json generation and caching
 *
 * @module core/context-engine
 */

export { buildContext, loadContext, refreshContext } from './context-writer.js';
export { readModuleConfig } from './config-reader.js';
export { buildDependencyGraph, detectProjectInfo } from './graph-builder.js';
export { writeContextFile } from './context-writer.js';
