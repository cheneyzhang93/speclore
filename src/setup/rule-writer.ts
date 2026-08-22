/**
 * Rule file writer — generates constraint rule files for AI clients.
 *
 * @module setup/rule-writer
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { AIToolInfo } from '../types/index.js';
import { logger } from '../infra/logger.js';

/**
 * Write rule files for detected AI tools.
 */
export function writeRuleFiles(projectRoot: string, tools: AIToolInfo[]): void {
  for (const tool of tools) {
    switch (tool.tool) {
      case 'cursor':
        writeCursorRule(projectRoot);
        break;
      case 'claude':
        writeClaudeRule(projectRoot);
        break;
      case 'qoder':
        writeQoderRule(projectRoot);
        break;
    }
  }
}

function writeCursorRule(projectRoot: string): void {
  const rulesDir = join(projectRoot, '.cursor', 'rules');
  mkdirSync(rulesDir, { recursive: true });

  const content = `---
description: SpecLore — AI coding constraints (setup placeholder)
globs:
alwaysApply: true
---

# SpecLore

SpecLore is configured for this project. When the \`speclore.spec\` MCP tool is available:

1. Use it to convert requirements into BDD .feature files
2. Use \`speclore.code\` to generate coding constraints
3. Use \`speclore.verify\` to run acceptance tests

> This is a placeholder. Run \`speclore code\` to generate full constraints with module boundaries.
`;

  writeFileSync(join(rulesDir, 'speclore.mdc'), content, 'utf-8');
  logger.info(`  Cursor rule: .cursor/rules/speclore.mdc`);
}

function writeClaudeRule(projectRoot: string): void {
  const rulesDir = join(projectRoot, '.claude', 'rules');
  mkdirSync(rulesDir, { recursive: true });

  const content = `# SpecLore

SpecLore is configured for this project. When the \`speclore.spec\` MCP tool is available:

1. Use it to convert requirements into BDD .feature files
2. Use \`speclore.code\` to generate coding constraints
3. Use \`speclore.verify\` to run acceptance tests

> This is a placeholder. Run \`speclore code\` to generate full constraints with module boundaries.
`;

  writeFileSync(join(rulesDir, 'speclore.md'), content, 'utf-8');
  logger.info(`  Claude Code rule: .claude/rules/speclore.md`);
}

function writeQoderRule(projectRoot: string): void {
  const rulesDir = join(projectRoot, '.qoder', 'rules');
  mkdirSync(rulesDir, { recursive: true });

  const content = `# SpecLore

SpecLore is configured for this project. When the \`speclore.spec\` MCP tool is available:

1. Use it to convert requirements into BDD .feature files
2. Use \`speclore.code\` to generate coding constraints
3. Use \`speclore.verify\` to run acceptance tests

> This is a placeholder. Run \`speclore code\` to generate full constraints with module boundaries.
`;

  writeFileSync(join(rulesDir, 'speclore.md'), content, 'utf-8');
  logger.info(`  Qoder rule: .qoder/rules/speclore.md`);
}
