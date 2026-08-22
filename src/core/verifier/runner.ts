/**
 * Test runner — executes the configured test command and parses results.
 *
 * @module core/verifier/runner
 */

import { execFileSync } from 'node:child_process';
import type { VerifyReport, FeatureResult, ReportSummary, FailedDetail, FeatureFile, ContextFile, SpecLoreConfig, ScenarioResult } from '../../types/index.js';
import { resolveMappings } from './mapping-resolver.js';
import { getRegistry } from '../../plugins/registry.js';
import { logger } from '../../infra/logger.js';

/**
 * Run verification: execute tests, map results to features, produce report.
 */
export async function runVerification(
  projectRoot: string,
  features: FeatureFile[],
  config: SpecLoreConfig,
  _context?: ContextFile,
): Promise<VerifyReport> {
  logger.info('Running verification...');

  // Invoke beforeVerify lifecycle hook
  const registry = getRegistry();
  await registry.invokeLifecycle('beforeVerify', features);

  // Execute test command
  const testOutput = executeTestCommand(projectRoot, config);

  // Resolve scenario → test mappings
  // Try PluginRegistry parsers first, then fall back to mapping resolver
  let scenarioResults: ScenarioResult[];
  const parser = registry.findParser(testOutput);

  if (parser) {
    logger.info(`Using parser plugin: ${parser.framework}`);
    scenarioResults = parser.parse(testOutput, features);
  } else {
    scenarioResults = resolveMappings(projectRoot, features, testOutput);
  }

  // Build feature results
  const featureResults: FeatureResult[] = features.map(feature => ({
    feature: feature.featureName,
    file: feature.path,
    scenarios: feature.scenarios.map(s => {
      const result = scenarioResults.find(r => r.name === s.name);
      return result ?? {
        name: s.name,
        status: 'unmapped' as const,
        mappingSource: 'none' as const,
      };
    }),
  }));

  // Collect failed details
  const failedDetails: FailedDetail[] = [];
  for (const fr of featureResults) {
    for (const sr of fr.scenarios) {
      if (sr.status === 'failed' && sr.error) {
        failedDetails.push({
          feature: fr.feature,
          scenario: sr.name,
          error: sr.error,
        });
      }
    }
  }

  // Build summary
  const allScenarios = featureResults.flatMap(fr => fr.scenarios);
  const summary: ReportSummary = {
    totalFeatures: features.length,
    totalScenarios: allScenarios.length,
    passed: allScenarios.filter(s => s.status === 'passed').length,
    failed: allScenarios.filter(s => s.status === 'failed').length,
    skipped: allScenarios.filter(s => s.status === 'skipped').length,
    unmapped: allScenarios.filter(s => s.status === 'unmapped').length,
    passRate: allScenarios.length > 0
      ? `${((allScenarios.filter(s => s.status === 'passed').length / allScenarios.length) * 100).toFixed(1)}%`
      : '0%',
  };

  const report: VerifyReport = {
    timestamp: new Date().toISOString(),
    project: config.project.name,
    summary,
    features: featureResults,
    failedDetails,
  };

  // Invoke afterVerify lifecycle hook
  await registry.invokeLifecycle('afterVerify', report);

  return report;
}

/**
 * Execute the configured test command.
 */
function executeTestCommand(projectRoot: string, config: SpecLoreConfig): string {
  const command = config.verify.command;
  if (!command) {
    logger.warn('No test command configured. Set verify.command in .speclore/config.yaml');
    return '';
  }

  const timeoutMs = config.verify.timeout * 1000;
  logger.info(`Executing: ${command}`);

  try {
    // Parse command into executable + args
    const parts = command.split(/\s+/);
    const cmd = parts[0]!;
    const args = parts.slice(1);

    const output = execFileSync(cmd, args, {
      cwd: projectRoot,
      encoding: 'utf-8',
      timeout: timeoutMs,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return output;
  } catch (error) {
    // Test failures often exit non-zero but still produce output
    if (error && typeof error === 'object' && 'stdout' in error) {
      const execError = error as { stdout?: string; stderr?: string };
      return (execError.stdout ?? '') + '\n' + (execError.stderr ?? '');
    }
    logger.error(`Test command failed: ${error instanceof Error ? error.message : String(error)}`);
    return '';
  }
}
