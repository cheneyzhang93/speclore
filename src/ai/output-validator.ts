/**
 * Output validator — validates AI-generated Gherkin content before writing to disk.
 *
 * Uses the official @cucumber/gherkin parser for spec-compliant validation.
 * Provides structured error feedback for retry-with-correction loops.
 *
 * @module ai/output-validator
 */

import { Parser, GherkinClassicTokenMatcher, AstBuilder } from '@cucumber/gherkin';
import { IdGenerator } from '@cucumber/messages';
import { logger } from '../infra/logger.js';

/** Result of validating AI-generated output */
export interface ValidationResult {
  /** Whether the output is valid Gherkin */
  valid: boolean;
  /** List of errors found (empty if valid) */
  errors: string[];
  /** Number of scenarios found (0 if parse failed) */
  scenarioCount: number;
}

/**
 * Validate AI-generated Gherkin content.
 *
 * Checks:
 * 1. Content is non-empty
 * 2. Contains Feature: keyword
 * 3. Contains at least one Scenario: keyword
 * 4. Passes official @cucumber/gherkin parser without errors
 */
export function validateFeatureOutput(content: string): ValidationResult {
  const errors: string[] = [];
  let scenarioCount = 0;

  // Check 1: Non-empty
  if (!content || content.trim().length === 0) {
    return { valid: false, errors: ['Empty response from AI provider'], scenarioCount: 0 };
  }

  // Check 2: Feature keyword
  if (!/Feature:/.test(content)) {
    errors.push('Missing "Feature:" keyword — AI must generate a Gherkin Feature block');
  }

  // Check 3: Scenario keyword
  if (!/Scenario:/.test(content)) {
    errors.push('Missing "Scenario:" keyword — AI must generate at least one Scenario');
  }

  // Check 4: Official Gherkin parser validation
  try {
    const idGen = IdGenerator.incrementing();
    const builder = new AstBuilder(idGen);
    const matcher = new GherkinClassicTokenMatcher();
    const parser = new Parser(builder, matcher);
    const doc = parser.parse(content);

    // Count scenarios
    if (doc.feature?.children) {
      scenarioCount = doc.feature.children.filter(c => c.scenario !== undefined).length;
    }

    if (scenarioCount === 0) {
      errors.push('Parsed successfully but contains no scenarios');
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`Gherkin syntax error: ${message}`);
    logger.debug(`Gherkin validation error: ${message}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    scenarioCount,
  };
}
