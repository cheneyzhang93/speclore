/**
 * Feature generator — uses AI to produce BDD .feature files from requirements.
 *
 * Parses AI output with the official @cucumber/gherkin parser for robust,
 * spec-compliant Gherkin handling. Falls back gracefully on parse errors.
 *
 * @module core/feature-generator/generator
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { Parser, GherkinClassicTokenMatcher, AstBuilder } from '@cucumber/gherkin';
import { IdGenerator } from '@cucumber/messages';
import type { StructuredRequirement, FeatureFile, Scenario, ContextFile, SpecLoreConfig } from '../../types/index.js';
import { createProvider, createProviderChain } from '../../ai/provider.js';
import { validateFeatureOutput } from '../../ai/output-validator.js';
import { getCostTracker } from '../../ai/cost-tracker.js';
import { estimateTokens } from '../../ai/token-counter.js';
import { buildPrompt } from './prompt-builder.js';
import { getRegistry } from '../../plugins/registry.js';
import { logger } from '../../infra/logger.js';
import { toPosixPath } from '../../infra/path-utils.js';

const MAX_VALIDATION_RETRIES = 2;

/**
 * Generate a BDD .feature file from a structured requirement.
 * Includes output validation with retry-on-error feedback.
 */
export async function generateFeature(
  requirement: StructuredRequirement,
  context: ContextFile,
  config: SpecLoreConfig,
  projectRoot: string,
): Promise<FeatureFile> {
  logger.info(`Generating feature for: ${requirement.title}`);

  // Invoke beforeSpec lifecycle hook
  const registry = getRegistry();
  await registry.invokeLifecycle('beforeSpec', requirement);

  // Build AI prompt
  let prompt = buildPrompt(requirement, context, config);

  // Call AI provider (with fallback chain support)
  const aiConfig = config.ai;
  const fallbackConfigs = aiConfig?.fallbackProviders ?? [];
  const providerConfigs = aiConfig ? [aiConfig, ...fallbackConfigs] : [];
  const provider = providerConfigs.length > 1
    ? await createProviderChain(providerConfigs)
    : await createProvider(aiConfig);

  if (!provider.isAvailable()) {
    throw new Error('AI provider not available. Set API key in environment or config.yaml.');
  }

  // Budget pre-check: warn when approaching limit
  const costTracker = getCostTracker();
  const budgetLimit = costTracker.getBudgetLimit();
  if (budgetLimit < Infinity) {
    const summary = costTracker.getUsageSummary();
    const usageRatio = summary.totalCostUsd / budgetLimit;
    if (usageRatio >= 0.9) {
      logger.warn(`Budget warning: $${summary.totalCostUsd.toFixed(4)} of $${budgetLimit.toFixed(2)} used (${(usageRatio * 100).toFixed(0)}%). Calls may be rejected.`);
    }
  }

  // Token estimation: warn if prompt exceeds model context window
  if (aiConfig?.model) {
    const tokenEstimate = estimateTokens(prompt, aiConfig.model);
    if (tokenEstimate.exceedsLimit) {
      logger.warn(`Prompt estimated at ${tokenEstimate.tokenCount} tokens, exceeds ${aiConfig.model} context window of ${tokenEstimate.modelContextWindow} tokens.`);
    }
  }

  // Generate with validation + retry
  let featureContent = '';
  let forceNeedsReview = false;

  for (let attempt = 0; attempt <= MAX_VALIDATION_RETRIES; attempt++) {
    const result = await provider.generate(prompt);
    const validation = validateFeatureOutput(result.content);

    if (validation.valid) {
      featureContent = result.content;
      // Cost is already recorded by the adapter's recordCost() — no need to double-count
      break;
    }

    if (attempt < MAX_VALIDATION_RETRIES) {
      logger.warn(
        `AI output validation failed (attempt ${attempt + 1}/${MAX_VALIDATION_RETRIES + 1}): ${validation.errors.join('; ')}. Retrying with error feedback.`,
      );
      // Append error feedback to prompt for correction
      prompt = `${prompt}\n\n## Previous Output Had Errors\n${validation.errors.map(e => `- ${e}`).join('\n')}\n\nPlease fix these issues and regenerate the complete Feature file.`;
    } else {
      logger.error(
        `AI output validation failed after ${MAX_VALIDATION_RETRIES + 1} attempts. Writing raw content with needsReview flag.`,
      );
      featureContent = result.content;
      forceNeedsReview = true;
    }
  }

  // Parse and validate the generated content using official Gherkin parser
  const featureFile = parseFeatureContent(featureContent, requirement, config);

  // Force needsReview if validation retries were exhausted
  if (forceNeedsReview && featureFile.needsReview.length === 0) {
    featureFile.needsReview = featureFile.scenarios.map(s => s.name);
    if (featureFile.needsReview.length === 0) {
      featureFile.needsReview = [requirement.title];
    }
  }

  // Write to disk
  const outputDir = join(projectRoot, config.spec.outputDir);
  const moduleDir = inferModule(requirement, context);
  const filePath = join(outputDir, moduleDir, `${requirement.id}.feature`);

  if (!existsSync(dirname(filePath))) {
    mkdirSync(dirname(filePath), { recursive: true });
  }

  writeFileSync(filePath, featureContent, 'utf-8');
  logger.info(`Feature written: ${toPosixPath(filePath)}`);

  featureFile.path = toPosixPath(filePath);

  // Invoke afterSpec lifecycle hook
  await registry.invokeLifecycle('afterSpec', featureFile);

  return featureFile;
}

/**
 * Parse AI-generated Gherkin content using the official @cucumber/gherkin parser.
 *
 * This replaces the previous regex-based parsing which was fragile:
 * - The `s` flag caused `.+?` to match across newlines, merging scenarios
 * - Missing Feature:/Scenario: keywords were not detected
 * - Tag extraction was unreliable
 *
 * The official parser handles all edge cases per the Gherkin specification.
 */
function parseFeatureContent(
  content: string,
  requirement: StructuredRequirement,
  config: SpecLoreConfig,
): FeatureFile {
  // If content is empty or trivially short, return early
  if (!content || content.trim().length === 0) {
    logger.warn('AI returned empty content');
    return {
      path: '',
      featureName: requirement.title,
      scenarios: [],
      tags: [],
      confidence: 0,
      needsReview: [requirement.title],
    };
  }

  // Parse with official Gherkin parser
  const idGen = IdGenerator.incrementing();
  const builder = new AstBuilder(idGen);
  const matcher = new GherkinClassicTokenMatcher();
  const parser = new Parser(builder, matcher);

  let gherkinDoc;
  try {
    gherkinDoc = parser.parse(content);
  } catch (err) {
    logger.warn(`Gherkin parse failed: ${err instanceof Error ? err.message : String(err)}`);
    // Return a low-confidence result flagged for review
    return {
      path: '',
      featureName: requirement.title,
      scenarios: [],
      tags: [],
      confidence: 0,
      needsReview: [requirement.title],
    };
  }

  const feature = gherkinDoc.feature;
  if (!feature) {
    return {
      path: '',
      featureName: requirement.title,
      scenarios: [],
      tags: [],
      confidence: 0,
      needsReview: [requirement.title],
    };
  }

  // Extract feature-level tags (without @ prefix, matching existing convention)
  const tags = (feature.tags ?? []).map(t => t.name.replace(/^@/, ''));

  // Extract scenarios from feature children
  const scenarios: Scenario[] = [];
  for (const child of feature.children ?? []) {
    if (!child.scenario) continue;
    const sc = child.scenario;

    const givens = extractStepsByType(sc.steps, 'Context');
    const whens = extractStepsByType(sc.steps, 'Action');
    const thens = extractStepsByType(sc.steps, 'Outcome');

    scenarios.push({
      name: sc.name,
      givens,
      whens,
      thens,
      tags: (sc.tags ?? []).map(t => t.name.replace(/^@/, '')),
    });
  }

  // Low confidence scenarios flagging
  const needsReview: string[] = [];
  if (requirement.confidence < config.spec.confidenceThreshold) {
    for (const s of scenarios) {
      needsReview.push(s.name);
    }
  }

  return {
    path: '', // Will be set by caller
    featureName: feature.name ?? requirement.title,
    scenarios,
    tags,
    confidence: requirement.confidence,
    needsReview,
  };
}

/**
 * Extract steps by their keyword type (Context/Given, Action/When, Outcome/Then).
 * Also includes Conjunction steps (And/But) that follow the target keyword type.
 */
function extractStepsByType(
  steps: readonly { keyword: string; text: string; keywordType?: string }[],
  targetType: string,
): Array<{ keyword: 'Given' | 'When' | 'Then' | 'And' | 'But'; text: string }> {
  const result: Array<{ keyword: 'Given' | 'When' | 'Then' | 'And' | 'But'; text: string }> = [];
  let inTargetBlock = false;

  for (const step of steps) {
    const kwType = step.keywordType ?? '';

    if (kwType === targetType) {
      inTargetBlock = true;
      result.push({
        keyword: mapKeyword(step.keyword.trim()),
        text: step.text,
      });
    } else if (kwType === 'Conjunction' && inTargetBlock) {
      // And/But continues the current block
      result.push({
        keyword: mapKeyword(step.keyword.trim()),
        text: step.text,
      });
    } else {
      inTargetBlock = false;
    }
  }

  return result;
}

/**
 * Map a Gherkin keyword string to our Step keyword type.
 */
function mapKeyword(keyword: string): 'Given' | 'When' | 'Then' | 'And' | 'But' {
  switch (keyword) {
    case 'Given': return 'Given';
    case 'When': return 'When';
    case 'Then': return 'Then';
    case 'And': return 'And';
    case 'But': return 'But';
    default: return 'Given'; // fallback
  }
}

/**
 * Infer the target module from the requirement and context.
 */
function inferModule(requirement: StructuredRequirement, context: ContextFile): string {
  // If the requirement ID contains a path separator, use the first segment as module
  const parts = requirement.id.split('/');
  if (parts.length > 1) return parts[0]!;

  // Otherwise use the first module in context
  if (context.moduleBoundaries.length > 0) {
    return context.moduleBoundaries[0]!.name;
  }

  return 'general';
}
