/**
 * Shared Zod parameter schemas for MCP tool registration and JSON Schema generation.
 *
 * Single source of truth for tool input parameter definitions.
 * - server.ts uses these directly for MCP registerTool (Zod shape)
 * - tools.ts uses toJSONSchema() to derive JSON Schema automatically
 *
 * @module mcp/schemas
 */

import { z } from 'zod';

/** Input schema for speclore.spec tool */
export const specInputSchema = z.object({
  source: z.string().max(50000).describe('Requirement source: file path, URL, or direct text content. Max 50000 characters.'),
  module: z.string().optional().describe('Target module name (optional, auto-detected from context).'),
});

/** Input schema for speclore.code tool */
export const codeInputSchema = z.object({
  features: z.array(z.string()).max(50).optional().describe('Feature file paths or glob patterns. Max 50 items.'),
  tools: z.array(z.enum(['cursor', 'claude', 'qoder'])).optional().describe('AI tools to generate constraints for (optional, auto-detected).'),
});

/** Input schema for speclore.verify tool */
export const verifyInputSchema = z.object({
  features: z.array(z.string()).optional().describe('Feature file paths or glob patterns to verify (optional, all if omitted).'),
  impact: z.boolean().optional().default(false).describe('Enable change impact analysis (compares git diff to find affected features).'),
});

/** Input schema for speclore.status tool */
export const statusInputSchema = z.object({
  feature: z.string().optional().describe('Specific feature file to check (optional, all if omitted).'),
});
