/**
 * speclore.status MCP tool — returns project workflow status and recommended actions.
 *
 * @module mcp/status
 */

import type { StatusResult, FeatureState } from '../types/index.js';
import { StateManager } from '../core/state-manager/index.js';
import { loadConfig, generateDefaultConfigYaml } from '../infra/config.js';
import { detectAITools } from '../setup/detector.js';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'glob';
import { logger } from '../infra/logger.js';

/**
 * Execute speclore.status tool.
 */
export function executeStatusTool(
  args: { feature?: string },
  projectRoot: string,
): StatusResult {
  // Auto-initialize project
  const { configCreated } = ensureProjectReadyForStatus(projectRoot);
  const config = loadConfig(projectRoot);

  const stateManager = new StateManager(projectRoot);
  const summary = stateManager.getProjectSummary();

  // Detect AI tools
  const aiTools = detectAITools(projectRoot);
  const aiToolsDetected = aiTools.map(t => t.tool);

  // Build feature list
  const featureEntries = stateManager.listFeatures();
  const features: StatusResult['features'] = [];

  for (const { path, state: entry } of featureEntries) {
    // If a specific feature was requested, filter
    if (args.feature && !path.includes(args.feature)) {
      continue;
    }

    // Count scenarios from the .feature file
    let scenarioCount = 0;
    if (existsSync(path)) {
      try {
        const content = readFileSync(path, 'utf-8');
        const matches = content.match(/Scenario(?: Outline)?:/g);
        scenarioCount = matches?.length ?? 0;
      } catch {
        // Ignore read errors
      }
    }

    features.push({
      file: path,
      state: entry.state,
      scenarios: scenarioCount,
      constraintFiles: entry.constraintFiles,
      testFiles: entry.testFiles,
      lastVerify: entry.lastVerify
        ? { passed: entry.lastVerify.passed, failed: entry.lastVerify.failed, timestamp: entry.lastVerify.timestamp }
        : undefined,
    });
  }

  // Also scan for .feature files not yet tracked in state
  const specsDir = join(projectRoot, config.spec.outputDir);
  const allFeatureFiles = globSync(`${specsDir}/**/*.feature`, { cwd: projectRoot, absolute: true });
  const trackedPaths = new Set(featureEntries.map(f => f.path));

  for (const filePath of allFeatureFiles) {
    if (trackedPaths.has(filePath)) continue;
    if (args.feature && !filePath.includes(args.feature)) continue;

    let scenarioCount = 0;
    try {
      const content = readFileSync(filePath, 'utf-8');
      const matches = content.match(/Scenario(?: Outline)?:/g);
      scenarioCount = matches?.length ?? 0;
    } catch {
      // Ignore
    }

    features.push({
      file: filePath,
      state: 'specified',
      scenarios: scenarioCount,
      constraintFiles: [],
      testFiles: [],
    });
  }

  // Build recommended actions
  const recommendedActions = buildRecommendedActions(features, summary, config.verify.command);

  return {
    project: {
      initialized: true,
      configCreated,
      testCommand: config.verify.command,
      aiToolsDetected,
    },
    features,
    summary: {
      total: features.length,
      specified: features.filter(f => f.state === 'specified').length,
      constrained: features.filter(f => f.state === 'constrained').length,
      coding: features.filter(f => f.state === 'coding').length,
      verified: features.filter(f => f.state === 'verified').length,
    },
    recommendedActions,
  };
}

function buildRecommendedActions(
  features: StatusResult['features'],
  summary: { initialized: boolean; featureCount: number; states: Record<FeatureState, number> },
  testCommand: string,
): string[] {
  const actions: string[] = [];

  if (features.length === 0) {
    actions.push('Call speclore.spec with your requirement to create feature files.');
    return actions;
  }

  if (summary.states.specified > 0) {
    actions.push('Call speclore.code to generate constraints and test scaffolding for specified features.');
  }

  if (summary.states.constrained > 0) {
    actions.push('Fill in test scaffolding implementations, then start coding.');
  }

  if (summary.states.coding > 0) {
    if (!testCommand) {
      actions.push('Configure verify.command in .speclore/config.yaml, then call speclore.verify.');
    } else {
      actions.push('Call speclore.verify to check acceptance status.');
    }
  }

  if (summary.states.verified === features.length && features.length > 0) {
    actions.push('All features verified. Add new requirements with speclore.spec.');
  }

  return actions;
}

function ensureProjectReadyForStatus(projectRoot: string): { initialized: boolean; configCreated: boolean; migrated: number } {
  const specLoreDir = join(projectRoot, '.speclore');
  const configPath = join(specLoreDir, 'config.yaml');
  let configCreated = false;

  if (!existsSync(specLoreDir)) {
    mkdirSync(specLoreDir, { recursive: true });
  }

  if (!existsSync(configPath)) {
    const projectName = projectRoot.split(/[/\\]/).pop() ?? 'my-project';
    writeFileSync(configPath, generateDefaultConfigYaml(projectName), 'utf-8');
    configCreated = true;
    logger.info(`Auto-created default config: ${configPath}`);
  }

  const stateManager = new StateManager(projectRoot);
  stateManager.ensureInitialized();

  // Migrate existing .feature files into state tracking
  const config = loadConfig(projectRoot);
  const specsDir = join(projectRoot, config.spec.outputDir);
  const migrated = stateManager.migrateFeatures(specsDir);
  if (migrated > 0) {
    logger.info(`Migrated ${migrated} existing .feature file(s) into state tracking.`);
  }

  return { initialized: true, configCreated, migrated };
}
