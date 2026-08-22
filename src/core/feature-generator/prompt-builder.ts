/**
 * Prompt builder — constructs AI prompts for feature generation.
 *
 * Uses the template system from ai/prompt-templates for maintainability.
 * Injects project context (module boundaries, existing entities, naming conventions)
 * and BDD format constraints.
 *
 * @module core/feature-generator/prompt-builder
 */

import type { StructuredRequirement, ContextFile, SpecLoreConfig } from '../../types/index.js';
import { FEATURE_GENERATION_TEMPLATE, renderTemplate, combinePrompt } from '../../ai/prompt-templates.js';

/**
 * Build the AI prompt for feature generation.
 * Uses the feature-generation template with context-aware variable substitution.
 */
export function buildPrompt(
  requirement: StructuredRequirement,
  context: ContextFile,
  config: SpecLoreConfig,
): string {
  // Build module boundaries text
  const moduleBoundaries = context.moduleBoundaries.length > 0
    ? context.moduleBoundaries
      .map(mod => {
        let line = `- **${mod.name}**: ${mod.responsibility}`;
        if (mod.publicApis.length > 0) {
          line += `\n  - Public APIs: ${mod.publicApis.join(', ')}`;
        }
        return line;
      })
      .join('\n')
    : '(none)';

  // Build existing entities text
  const existingEntities = context.existingCode.entities.length > 0
    ? context.existingCode.entities.slice(0, 20).map(e => `- ${e.name} (${e.module})`).join('\n')
    : '(none)';

  // Build acceptance criteria text
  const acceptanceCriteria = requirement.acceptanceCriteria && requirement.acceptanceCriteria.length > 0
    ? requirement.acceptanceCriteria.map(ac => `- ${ac}`).join('\n')
    : '(none)';

  // Render the template
  const { system, user } = renderTemplate(FEATURE_GENERATION_TEMPLATE, {
    language: context.projectSummary.language,
    framework: context.projectSummary.framework,
    moduleBoundaries,
    existingEntities,
    requirement: requirement.description,
    acceptanceCriteria,
  });

  // Append profile-specific instructions
  const parts: string[] = [];
  if (config.project.profile === 'strict') {
    parts.push('');
    parts.push('## Strict Mode');
    parts.push('- Include edge cases and error scenarios');
    parts.push('- Add boundary condition scenarios');
    parts.push('- Cover all acceptance criteria explicitly');
  } else if (config.project.profile === 'minimal') {
    parts.push('');
    parts.push('## Minimal Mode');
    parts.push('- Only include the happy path and 1-2 critical error scenarios');
    parts.push('- Keep scenarios concise');
  }

  const basePrompt = combinePrompt(system, user);
  return parts.length > 0 ? basePrompt + '\n' + parts.join('\n') : basePrompt;
}
