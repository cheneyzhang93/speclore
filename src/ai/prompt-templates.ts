/**
 * Prompt template management — reusable, parameterized prompts for AI generation.
 *
 * Provides a structured way to define, render, and manage prompts
 * used across spec generation, constraint coding, and verification.
 *
 * @module ai/prompt-templates
 */

/** A parameterized prompt template with named variables. */
export interface PromptTemplate {
  /** Unique template identifier */
  name: string;
  /** System-level instruction (prepended to user prompt) */
  system: string;
  /** User prompt with {{variable}} placeholders */
  user: string;
  /** List of variable names used in the template (for documentation) */
  variables: string[];
}

/**
 * Render a template by replacing {{variable}} placeholders with values.
 */
export function renderTemplate(
  template: PromptTemplate,
  variables: Record<string, string>,
): { system: string; user: string } {
  let system = template.system;
  let user = template.user;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    system = system.replace(placeholder, value);
    user = user.replace(placeholder, value);
  }

  return { system, user };
}

/**
 * Combine system and user parts into a single prompt string.
 */
export function combinePrompt(system: string, user: string): string {
  return `${system}\n\n${user}`;
}

// ============================================================================
// Built-in Templates
// ============================================================================

/** Template for BDD feature generation from requirements */
export const FEATURE_GENERATION_TEMPLATE: PromptTemplate = {
  name: 'feature-generation',
  system: `You are a BDD expert. Convert requirements into valid Gherkin .feature files.
Follow industry best practices for BDD scenario design:
- Each scenario should be independent and testable
- Use concrete examples, not abstract descriptions
- Cover happy path, error cases, and edge cases as appropriate
- Use the same language as the requirement input`,
  user: `## Project Context
- Language: {{language}}
- Framework: {{framework}}

## Module Boundaries
{{moduleBoundaries}}

## Existing Entities
{{existingEntities}}

## Requirement
{{requirement}}

## Acceptance Criteria
{{acceptanceCriteria}}

## Output Format
Generate a valid Gherkin .feature file with:
- Feature: line with a descriptive name
- Scenario: blocks with Given/When/Then steps
- Each scenario should be testable and independent`,
  variables: ['language', 'framework', 'moduleBoundaries', 'existingEntities', 'requirement', 'acceptanceCriteria'],
};

/** Template for AI constraint file generation */
export const CONSTRAINT_GENERATION_TEMPLATE: PromptTemplate = {
  name: 'constraint-generation',
  system: `You are a software architecture expert. Generate coding constraints for AI assistants.
Constraints should be actionable, specific, and help AI write code that:
- Respects module boundaries
- Follows project naming conventions
- Avoids cross-module references
- Maintains consistency with existing code patterns`,
  user: `## Project: {{projectName}}
## Framework: {{framework}}
## Profile: {{profile}}

## Module Rules
{{moduleRules}}

## Feature Scenarios
{{features}}

## Active Constraints
{{activeConstraints}}

Generate constraint files that AI coding assistants can use as guidance.`,
  variables: ['projectName', 'framework', 'profile', 'moduleRules', 'features', 'activeConstraints'],
};

/** Template for verification analysis */
export const VERIFICATION_ANALYSIS_TEMPLATE: PromptTemplate = {
  name: 'verification-analysis',
  system: `You are a test analysis expert. Analyze test results and provide actionable insights.
Focus on:
- Root cause analysis for failures
- Specific fix suggestions with code examples
- Identification of flaky or unreliable tests`,
  user: `## Project: {{projectName}}
## Test Command: {{testCommand}}

## Test Results
{{testResults}}

## Feature Scenarios
{{features}}

Analyze the test results and provide:
1. Summary of pass/fail status
2. Root cause for each failure
3. Specific fix suggestions`,
  variables: ['projectName', 'testCommand', 'testResults', 'features'],
};
