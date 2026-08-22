/**
 * M3: Constraint Coder — generates AI coding constraints from .feature files.
 *
 * @module core/constraint-coder
 */

import type { FeatureFile, ModuleRule, ConstraintContent, SpecLoreConfig, ContextFile, FeatureRule } from '../../types/index.js';
import { detectAITools } from './ai-tool-detector.js';
import { writeConstraints } from './constraint-writer.js';
import { readModuleConfig } from '../context-engine/config-reader.js';
import { getRegistry } from '../../plugins/registry.js';
import { logger } from '../../infra/logger.js';

const MAPPING_INSTRUCTIONS = `为每个测试文件生成对应的映射文件到 .speclore/mappings/{module}/{feature-name}.json。
格式：{ "feature": "specs/...", "scenarios": { "Scenario名称": { "testFile": "...", "testMethod": "..." } } }
每次修改测试时同步更新映射文件。`;

/**
 * Generate constraints from feature files and write them to AI tool config files.
 * Uses PluginRegistry for writer selection — supports third-party writer plugins.
 */
export async function generateConstraints(
  projectRoot: string,
  features: FeatureFile[],
  _context: ContextFile,
  config: SpecLoreConfig,
): Promise<string[]> {
  const tools = detectAITools(projectRoot);
  if (tools.length === 0) {
    logger.warn('No AI tools detected. Run `speclore setup` first.');
    return [];
  }

  // Build module rules from config
  const boundaries = readModuleConfig(config);
  const moduleRules: ModuleRule[] = boundaries.map(b => ({
    module: b.name,
    boundaries: b,
    namingConventions: [],
    forbiddenPatterns: [],
  }));

  // Extract feature business rules from scenarios
  const featureRules: FeatureRule[] = features.map(f => ({
    featureName: f.featureName,
    sourceFile: f.path.replace(/\\/g, '/'),
    scenarios: f.scenarios.map(sc => ({
      name: sc.name,
      summary: [
        ...sc.givens.map(g => `Given ${g.text}`),
        ...sc.whens.map(w => `When ${w.text}`),
        ...sc.thens.map(t => `Then ${t.text}`),
      ].join(' → '),
    })),
  }));

  const content: ConstraintContent = {
    projectName: config.project.name,
    projectRoot,
    modules: moduleRules,
    features,
    profile: config.project.profile,
    mappingInstructions: MAPPING_INSTRUCTIONS,
    featureRules,
  };

  // Try PluginRegistry first — supports third-party writer plugins
  const registry = getRegistry();
  const writtenFiles: string[] = [];
  let handledByRegistry = false;

  for (const tool of tools) {
    const writer = registry.findWriter(tool);
    if (writer) {
      handledByRegistry = true;
      try {
        await writer.write(content);
        writtenFiles.push(writer.configFile);
        logger.info(`Constraint written via plugin: ${writer.toolName} → ${writer.configFile}`);
      } catch (err) {
        logger.warn(`Writer plugin '${tool}' failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // Fallback to direct writer if registry didn't handle all tools
  if (!handledByRegistry) {
    return writeConstraints(projectRoot, tools, content);
  }

  return writtenFiles;
}

export { detectAITools } from './ai-tool-detector.js';
export { writeConstraints } from './constraint-writer.js';
